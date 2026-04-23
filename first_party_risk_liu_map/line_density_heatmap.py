#!/usr/bin/env python3
"""
Compute a heatmap of conservative (supercover) Bresenham line density between
a top 100x100 square and a bottom 100x100 square in a 600x100 grid.

For every pair of pixels (one from each square), a supercover Bresenham line
is drawn, incrementing each pixel it touches. The supercover variant includes
both intermediate cells at diagonal steps, so even barely-touched pixels count.

Requires: numpy, matplotlib, numba
"""

import sys
import time

import numpy as np

try:
    from numba import njit, prange
except ImportError:
    print("numba is required for this computation (100M line pairs).")
    print("Install with: pip install numba")
    sys.exit(1)

import matplotlib.colors as mcolors
import matplotlib.patches as patches
import matplotlib.pyplot as plt

ROWS = 600
COLS = 100
TOP_SIZE = 100
BOT_START = 500
BOT_SIZE = 100


@njit(cache=True)
def supercover_line_add(matrix, r0, c0, r1, c1):
    """Increment every pixel along the conservative (supercover) Bresenham line.

    At each diagonal step, both intermediate cells are added to ensure all
    pixels that the continuous line segment even barely touches are counted.
    """
    dr = np.int64(r1 - r0)
    dc = np.int64(c1 - c0)
    sr = np.int64(1) if dr > 0 else (np.int64(-1) if dr < 0 else np.int64(0))
    sc = np.int64(1) if dc > 0 else (np.int64(-1) if dc < 0 else np.int64(0))
    adr = np.int64(abs(dr))
    adc = np.int64(abs(dc))

    r = np.int64(r0)
    c = np.int64(c0)
    matrix[r, c] += 1

    if adr >= adc:
        eps = np.int64(0)
        for _ in range(adr):
            eps += adc
            if 2 * eps >= adr:
                # Diagonal step: add both intermediate cells (conservative)
                nr = r + sr
                nc = c + sc
                if 0 <= nr < ROWS:
                    matrix[nr, c] += 1
                if 0 <= nc < COLS:
                    matrix[r, nc] += 1
                r = nr
                c = nc
                eps -= adr
            else:
                r += sr
            matrix[r, c] += 1
    else:
        eps = np.int64(0)
        for _ in range(adc):
            eps += adr
            if 2 * eps >= adc:
                nr = r + sr
                nc = c + sc
                if 0 <= nr < ROWS:
                    matrix[nr, c] += 1
                if 0 <= nc < COLS:
                    matrix[r, nc] += 1
                r = nr
                c = nc
                eps -= adc
            else:
                c += sc
            matrix[r, c] += 1


@njit(parallel=True, cache=True)
def compute_heatmap():
    """Compute line density heatmap using parallel supercover lines.

    Allocates one local matrix per top row (100 matrices) so that each
    parallel worker writes to its own matrix, avoiding race conditions.
    """
    local_matrices = np.zeros((TOP_SIZE, ROWS, COLS), dtype=np.int64)

    for top_row in prange(TOP_SIZE):
        for c0 in range(COLS):
            for bot_row_off in range(BOT_SIZE):
                r1 = np.int64(BOT_START + bot_row_off)
                for c1 in range(COLS):
                    supercover_line_add(local_matrices[top_row], np.int64(top_row), np.int64(c0), r1, np.int64(c1))

    # Sum all local matrices
    result = np.zeros((ROWS, COLS), dtype=np.int64)
    for i in range(TOP_SIZE):
        for r in range(ROWS):
            for c in range(COLS):
                result[r, c] += local_matrices[i, r, c]
    return result


def plot_heatmap(heatmap):
    """Plot the heatmap with colored outlines around the two squares."""
    plt.rcParams.update({"font.size": plt.rcParams["font.size"] * 2})
    fig, ax = plt.subplots(figsize=(16, 5))

    # Normalize by total number of pairs
    hm = heatmap.astype(np.float64)
    n_pairs = TOP_SIZE * COLS * BOT_SIZE * COLS
    hm /= n_pairs

    # Transpose so rows become columns (vertical -> horizontal)
    hm_t = hm.T

    im = ax.imshow(
        hm_t,
        aspect="equal",
        cmap="hot",
        interpolation="nearest",
    )

    # Blue outline around left square (was top)
    ax.add_patch(
        patches.Rectangle(
            (-0.5, -0.5),
            TOP_SIZE,
            COLS,
            linewidth=2,
            edgecolor="blue",
            facecolor="none",
        )
    )

    # Green outline around right square (was bottom)
    ax.add_patch(
        patches.Rectangle(
            (BOT_START - 0.5, -0.5),
            BOT_SIZE,
            COLS,
            linewidth=2,
            edgecolor="green",
            facecolor="none",
        )
    )

    plt.colorbar(im, ax=ax, shrink=0.8)
    ax.set_axis_off()

    plt.tight_layout()
    plt.savefig("line_density_heatmap.png", dpi=150, bbox_inches="tight")
    plt.savefig("line_density_heatmap.pdf", bbox_inches="tight")
    print("Saved to line_density_heatmap.png and line_density_heatmap.pdf")
    plt.show()


def main():
    n_pairs = TOP_SIZE * COLS * BOT_SIZE * COLS
    print(f"Grid: {ROWS} x {COLS}")
    print(f"Top square: rows 0-{TOP_SIZE - 1}")
    print(f"Bottom square: rows {BOT_START}-{BOT_START + BOT_SIZE - 1}")
    print(f"Pairs: {n_pairs:,}")
    print("Computing (first run includes numba compilation)...")

    t0 = time.time()
    heatmap = compute_heatmap()
    elapsed = time.time() - t0
    print(f"Done in {elapsed:.1f}s")
    print(f"Max: {np.max(heatmap):,}  Min>0: {np.min(heatmap[heatmap > 0]):,}")

    plot_heatmap(heatmap)


if __name__ == "__main__":
    main()
