#!/usr/bin/env python3
"""
Compute field D for each square in a GeoJSON grid.

Coordinates are transformed to SWEREF99 TM (EPSG:3006) for accurate
spatial computations, but output retains original coordinates.

For each pair of squares (s1, s2), we:
1. Build the convex hull of their union
2. Find all squares intersected by this convex hull
3. Add s1["B"] * s2["B"] to field "D" of each intersected square
4. Compute Dn = D / (sum of all B values)^2 as normalized field
"""

import json
import sys
import time
import numpy as np
from multiprocessing import Pool, cpu_count
from shapely.geometry import shape
from shapely.ops import unary_union, transform
from shapely.strtree import STRtree
from pyproj import CRS, Transformer

# SWEREF99 TM (Swedish reference frame)
SWEREF99_TM = CRS.from_epsg(3006)
WGS84 = CRS.from_epsg(4326)


def get_transformer_to_sweref(source_crs=None):
    """Create a transformer from source CRS to SWEREF99 TM."""
    if source_crs is None:
        source_crs = WGS84
    transformer = Transformer.from_crs(source_crs, SWEREF99_TM, always_xy=True)
    return transformer


def transform_geometry(geom, transformer):
    """Transform a geometry using the given transformer."""
    return transform(transformer.transform, geom)


def format_time(seconds):
    """Format seconds into human-readable string."""
    if seconds < 60:
        return f"{seconds:.0f}s"
    elif seconds < 3600:
        return f"{seconds // 60:.0f}m {seconds % 60:.0f}s"
    else:
        return f"{seconds // 3600:.0f}h {(seconds % 3600) // 60:.0f}m"


def load_geojson(filepath: str) -> dict:
    with open(filepath, 'r') as f:
        return json.load(f)


def save_geojson(data: dict, filepath: str) -> None:
    with open(filepath, 'w') as f:
        json.dump(data, f)


# Global variables for worker processes (initialized once per worker)
_worker_geometries = None
_worker_tree = None
_worker_b_values = None
_worker_n = None
_worker_include_self = None


def init_worker(geometries_wkb, b_values, n, include_self):
    """Initialize worker process - called once per worker, not per batch."""
    global _worker_geometries, _worker_tree, _worker_b_values, _worker_n, _worker_include_self

    from shapely import wkb
    _worker_geometries = [wkb.loads(g) for g in geometries_wkb]
    _worker_tree = STRtree(_worker_geometries)
    _worker_b_values = b_values
    _worker_n = n
    _worker_include_self = include_self


def process_row(i):
    """Process a single row and return contributions to D values."""
    global _worker_geometries, _worker_tree, _worker_b_values, _worker_n, _worker_include_self

    geometries = _worker_geometries
    tree = _worker_tree
    b_values = _worker_b_values
    n = _worker_n
    include_self = _worker_include_self

    local_d = np.zeros(n, dtype=np.float64)
    hulls_computed = 0

    b_i = b_values[i]
    if b_i == 0:
        return local_d, hulls_computed

    geom_i = geometries[i]

    start_j = i if include_self else i + 1
    for j in range(start_j, n):
        b_j = b_values[j]
        if b_j == 0:
            continue

        hulls_computed += 1

        # Build convex hull
        if i == j:
            hull = geom_i.convex_hull
            b_product = b_i * b_j
        else:
            hull = unary_union([geom_i, geometries[j]]).convex_hull
            b_product = 2 * b_i * b_j

        # Query spatial index and check actual intersections
        for k in tree.query(hull):
            if hull.intersects(geometries[k]):
                local_d[k] += b_product

    return local_d, hulls_computed


def compute_d_field_parallel(geojson_data: dict, num_workers: int = None, include_self: bool = True) -> dict:
    """Compute field D using multiple processes."""
    features = geojson_data['features']
    n = len(features)

    if num_workers is None:
        num_workers = max(1, cpu_count() - 1)

    print("Preparing geometries...")
    original_geometries = [shape(f['geometry']) for f in features]

    # Transform to SWEREF99 TM for accurate spatial computations
    print("Transforming to SWEREF99 TM...")
    transformer = get_transformer_to_sweref()
    geometries = [transform_geometry(g, transformer) for g in original_geometries]

    # Shrink squares by 10cm on each side to avoid edge-touch intersections
    print("Shrinking squares by 10cm...")
    geometries = [g.buffer(-0.1, join_style='mitre') for g in geometries]

    # Serialize to WKB for multiprocessing
    from shapely import wkb
    geometries_wkb = [wkb.dumps(g) for g in geometries]

    b_values = np.array([f['properties']['B'] for f in features], dtype=np.float64)

    # Find rows with non-zero B (these are the only ones that do real work)
    nonzero_rows = [i for i in range(n) if b_values[i] != 0]
    nonzero_count = len(nonzero_rows)

    print(f"  {nonzero_count:,} features have B≠0")
    print(f"  Including self-pairs (i==j): {include_self}")

    if include_self:
        real_work = nonzero_count * (nonzero_count + 1) // 2
    else:
        real_work = nonzero_count * (nonzero_count - 1) // 2
    print(f"  Estimated hull computations: {real_work:,}")

    if nonzero_count == 0:
        print("No work to do (all B values are 0)")
        d_values = np.zeros(n, dtype=np.float64)
    else:
        print(f"Using {num_workers} workers for {len(nonzero_rows)} rows...")
        print("Initializing workers (one-time geometry setup)...")

        # Process with progress tracking
        start_time = time.time()
        d_values = np.zeros(n, dtype=np.float64)
        total_hulls = 0

        # Use initializer to set up geometries once per worker, not per row
        with Pool(num_workers, initializer=init_worker, initargs=(geometries_wkb, b_values, n, include_self)) as pool:
            for i, (local_d, hulls) in enumerate(pool.imap_unordered(process_row, nonzero_rows)):
                d_values += local_d
                total_hulls += hulls
                elapsed = time.time() - start_time
                pct = 100 * (i + 1) / len(nonzero_rows)
                if total_hulls > 0:
                    eta = elapsed * (real_work - total_hulls) / total_hulls
                    eta_str = format_time(eta)
                else:
                    eta_str = "?"
                print(f"\rRows: {i + 1}/{len(nonzero_rows)} ({pct:.1f}%) - "
                      f"Hulls: {total_hulls:,}/{real_work:,} - "
                      f"Elapsed: {format_time(elapsed)} - ETA: {eta_str}    ", end="", flush=True)

        print(f"\rCompleted {total_hulls:,} hull computations in {format_time(time.time() - start_time)}                    ")

    # Compute normalized D (Dn = D / (sum of B)^2)
    b_sum = np.sum(b_values)
    if b_sum != 0:
        dn_values = d_values / (b_sum ** 2)
        print(f"Normalizing D by (sum(B))^2 = {b_sum:.2f}^2 = {b_sum**2:.2f}")
    else:
        dn_values = np.zeros(n, dtype=np.float64)

    # Build result GeoJSON
    print("Building output...")
    result = {
        'type': geojson_data.get('type', 'FeatureCollection'),
        'features': []
    }

    if 'crs' in geojson_data:
        result['crs'] = geojson_data['crs']

    for i, feature in enumerate(features):
        new_feature = {
            'type': feature['type'],
            'properties': {**feature['properties'], 'D': float(d_values[i]), 'Dn': float(dn_values[i])},
            'geometry': feature['geometry']
        }
        result['features'].append(new_feature)

    return result


def compute_d_field_single(geojson_data: dict, include_self: bool = True) -> dict:
    """Compute field D for each feature (single-threaded version)."""
    features = geojson_data['features']
    n = len(features)

    print("Preparing geometries...")
    original_geometries = [shape(f['geometry']) for f in features]

    # Transform to SWEREF99 TM for accurate spatial computations
    print("Transforming to SWEREF99 TM...")
    transformer = get_transformer_to_sweref()
    geometries = [transform_geometry(g, transformer) for g in original_geometries]

    # Shrink squares by 10cm on each side to avoid edge-touch intersections
    print("Shrinking squares by 10cm...")
    geometries = [g.buffer(-0.1, join_style='mitre') for g in geometries]

    print("Building spatial index...")
    tree = STRtree(geometries)

    d_values = np.zeros(n, dtype=np.float64)
    b_values = np.array([f['properties']['B'] for f in features], dtype=np.float64)

    start_time = time.time()
    last_print_time = start_time

    # Count non-zero B values
    nonzero_mask = b_values != 0
    nonzero_count = np.sum(nonzero_mask)
    first_nonzero = np.argmax(nonzero_mask) if nonzero_count > 0 else n

    print(f"  {nonzero_count:,} features have B≠0 (first at index {first_nonzero})")
    print(f"  Including self-pairs (i==j): {include_self}")

    if include_self:
        real_work = nonzero_count * (nonzero_count + 1) // 2
    else:
        real_work = nonzero_count * (nonzero_count - 1) // 2
    print(f"  Estimated hull computations: {real_work:,}")

    hulls_computed = 0

    # Process unordered pairs (i <= j)
    for i in range(n):
        b_i = b_values[i]
        if b_i == 0:
            continue

        geom_i = geometries[i]

        start_j = i if include_self else i + 1
        for j in range(start_j, n):
            b_j = b_values[j]
            if b_j == 0:
                continue

            hulls_computed += 1

            # Build convex hull
            if i == j:
                hull = geom_i.convex_hull
                b_product = b_i * b_j
            else:
                hull = unary_union([geom_i, geometries[j]]).convex_hull
                b_product = 2 * b_i * b_j

            # Query spatial index and check actual intersections
            for k in tree.query(hull):
                if hull.intersects(geometries[k]):
                    d_values[k] += b_product

            # Print progress every 2 seconds
            now = time.time()
            if now - last_print_time >= 2.0:
                elapsed = now - start_time
                pct = 100 * hulls_computed / real_work if real_work > 0 else 100
                if hulls_computed > 0:
                    eta = elapsed * (real_work - hulls_computed) / hulls_computed
                    eta_str = format_time(eta)
                else:
                    eta_str = "?"
                print(f"\rRow {i}/{n}, hulls: {hulls_computed:,}/{real_work:,} ({pct:.1f}%) - "
                      f"Elapsed: {format_time(elapsed)} - ETA: {eta_str}    ", end="", flush=True)
                last_print_time = now

    # Final progress
    elapsed = time.time() - start_time
    print(f"\rCompleted {hulls_computed:,} hull computations in {format_time(elapsed)}                    ")

    # Compute normalized D (Dn = D / (sum of B)^2)
    b_sum = np.sum(b_values)
    if b_sum != 0:
        dn_values = d_values / (b_sum ** 2)
        print(f"Normalizing D by (sum(B))^2 = {b_sum:.2f}^2 = {b_sum**2:.2f}")
    else:
        dn_values = np.zeros(n, dtype=np.float64)

    # Build result GeoJSON
    print("Building output...")
    result = {
        'type': geojson_data.get('type', 'FeatureCollection'),
        'features': []
    }

    if 'crs' in geojson_data:
        result['crs'] = geojson_data['crs']

    for i, feature in enumerate(features):
        new_feature = {
            'type': feature['type'],
            'properties': {**feature['properties'], 'D': float(d_values[i]), 'Dn': float(dn_values[i])},
            'geometry': feature['geometry']
        }
        result['features'].append(new_feature)

    return result


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Compute D field for GeoJSON squares')
    parser.add_argument('input', nargs='?',
                        default='/home/undefiened/Code/qra_liu_map/liu_window_3x3 from population_nk.geojson',
                        help='Input GeoJSON file')
    parser.add_argument('-o', '--output', help='Output GeoJSON file')
    parser.add_argument('-j', '--jobs', type=int, default=None,
                        help='Number of parallel workers (default: auto)')
    parser.add_argument('--single', action='store_true',
                        help='Use single-threaded mode')
    parser.add_argument('--no-self', action='store_true',
                        help='Exclude self-pairs (i==j) from computation')
    args = parser.parse_args()

    input_file = args.input
    output_file = args.output or input_file.replace('.geojson', '_with_D.geojson')

    print(f"Loading {input_file}...")
    geojson_data = load_geojson(input_file)

    n = len(geojson_data['features'])
    print(f"Loaded {n:,} features")

    include_self = not args.no_self
    if args.single:
        result = compute_d_field_single(geojson_data, include_self=include_self)
    else:
        result = compute_d_field_parallel(geojson_data, args.jobs, include_self=include_self)

    print(f"Saving to {output_file}...")
    save_geojson(result, output_file)

    print("\nResults (first 20 features):")
    for i, f in enumerate(result['features'][:20]):
        print(f"  Feature {i}: B={f['properties']['B']}, D={f['properties']['D']:.2f}, Dn={f['properties']['Dn']:.6f}")
    if n > 20:
        print(f"  ... and {n - 20} more features")

    print("\nDone!")


if __name__ == '__main__':
    main()
