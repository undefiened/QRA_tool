"""
data_processing.py
----------------
A json file with blocks (pixels) data is given to be processed, where for each block
the amount of total time spent by all GA there is found, as well as their mean speed
and the collision probability, which is p = p_VC * p_below * λ_stm. The horizontal
conflict rate p_HC is omitted. These data are stored for each block, and the new blocks
data is saved to disc.
"""

import json
from tqdm import tqdm
import risk_calculations


def read_file(path):
    """Reads a json file and returns the content, provided the path of the file."""
    with open(path, 'r') as file:
        f = file.read()
        blocks = json.loads(f)
    return blocks


def write_file(data, path):
    """Writes a dict to a .json file, provided a path."""
    with open(path, 'w') as file:
        json.dump(data, file)


def reduce_data(block):
    """Given a block, unnecessary information is removed."""
    block["properties"].pop("Rutstorl")
    block["properties"].pop("Ruta")
    block["properties"]["B"] = block["properties"].pop("TotBef")


def block_processing(block):
    """Returns total time, average speed by all GA and probability of collision for the given block."""
    polygon_coords = block['geometry']['coordinates'][0][0]
    T, v_GA_mean = risk_calculations.get_block_data(polygon_coords)
    prob = risk_calculations.compute_risk_prob()
    return T, v_GA_mean, prob


def main(path, new_file_path):
    """main function, that does the processing and saves the data as a json file to disc."""
    blocks_data = read_file(path)
    
    for block in tqdm(blocks_data['features']):
        total_time, v, p = block_processing(block)
        block['properties']['T'], block['properties']['v'], block['properties']['p'] = total_time, v, round(p, 3)
        reduce_data(block)
    write_file(blocks_data, new_file_path)

    return 0


if __name__ == "__main__":
    path, path_new = '', ''
    main(path, path_new)

# --------------------- END OF FILE ---------------------
