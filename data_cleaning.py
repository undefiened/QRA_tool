import json

def main(path, path_new):
    with open(path, 'r') as file:
        data = json.load(file)

        for x in data['features']:
            if x['properties']['B'] == None:
                x['properties']['B'] = 0

        data['features'] = [x for x in data['features'] if x['properties']['B'] > 0 or x['properties']['T'] > 0]

        # print(data)

        with open(path_new, 'w') as file_new:
            json.dump(data, file_new)

if __name__ == "__main__":
    path, path_new = './data/population_vastervik.geojson', './data/population_vastervik_cleaned.geojson'
    main(path, path_new)
