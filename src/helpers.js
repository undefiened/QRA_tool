/**
Copyright (C) 2023 hahas94

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/**
* File contains helper functions that can be used by different classes.
*/


/**
* styling method:
*   A function that styles tiles for choropleth map.
*/
function groundStyling(feature) {
    let value = feature.properties.B;
    if (value === 0 || value === null || value === undefined) {
        return { fillOpacity: 0, weight: 0, opacity: 0 };
    }
    return {
        fillColor: getGroundColor(value),
        weight: 0,
        opacity: 1,
        color: 'CadetBlue',
        dashArray: '10',
        fillOpacity: 0.5
    };
}

/**
* styling method:
*   A function that styles tiles for choropleth map.
*/
function airStyling(feature) {
    let value = feature.properties.T;
    if (value === 0 || value === null || value === undefined) {
        return { fillOpacity: 0, weight: 0, opacity: 0 };
    }
    return {
        fillColor: getAirColor(value),
        weight: 0,
        opacity: 1,
        color: 'CadetBlue',
        dashArray: '10',
        fillOpacity: 0.5
    };
}

/**
* getGroundColor method:
*   A function that returns map tiles color based on population number.
*/
function getGroundColor(d) {
    return d > 500 ? '#800026' :
       d > 300  ? '#BD0026' :
       d > 200  ? '#E31A1C' :
       d > 100  ? '#FC4E2A' :
       d > 50   ? '#FD8D3C' :
       d > 20   ? '#FEB24C' :
       d > 10   ? '#FED976' :
       d > -10   ? '#FED976' :
                  '#FFEDA0';
}

/**
* getAirColor method:
*   A function that returns map tiles color based on flights times.
*/
function getAirColor(d) {
    return d > 1e-2 ? '#000033' :
       d > 5e-3  ? '#000066' :
       d > 1e-3  ? '#000099' :
       d > 5e-4  ? '#0000CC' :
       d > 1e-4   ? '#0033FF' :
       d > 5e-5   ? '#0099FF' :
       d > 1e-5   ? '#00CCFF' :
       d > -10   ? '#00FFCC' :
                  '#FFEDA0';
}

/**
* firstPartyStyling method:
*   A function that styles tiles for choropleth map based on Dn values (1st-party risk).
*/
function firstPartyStyling(feature) {
    let value = feature.properties.Dn;
    if (value === 0 || value === null || value === undefined) {
        return { fillOpacity: 0, weight: 0, opacity: 0 };
    }
    return {
        fillColor: getFirstPartyColor(value),
        weight: 0,
        opacity: 1,
        color: 'CadetBlue',
        dashArray: '10',
        fillOpacity: 0.5
    };
}

/**
* getFirstPartyColor method:
*   A function that returns map tiles color based on Dn values (1st-party risk).
*/
function getFirstPartyColor(d) {
    return d > 5e-2 ? '#004d00' :
       d > 1e-2  ? '#006600' :
       d > 5e-3  ? '#008000' :
       d > 1e-3  ? '#00b300' :
       d > 5e-4   ? '#00cc00' :
       d > 1e-4   ? '#00e600' :
       d > 1e-5   ? '#33ff33' :
       d > 0   ? '#99ff99' :
                  '#FFEDA0';
}

function groundBuffersStyle() {
    return {
        "color": "black",
        "weight": 1,
        "opacity": 0.95
    };
}

function airBuffersStyle() {
    return {
        "color": "black",
        "weight": 1,
        "opacity": 0.95
    };
}

/**
* convertSpeed method:
*   Converts speed from m/s to km/h.
*/
function convertSpeed(v) {
    return (v * 60 * 60) / 1000;
}


/**
* createRTree method:
*   Given a list of features representing the blocks (pixels) of a grid,
#   this method creates a R-Tree structure of this data and saves it to the
#   data folder with the provided name.
*/
function createRTree(features) {
    let tree = new RBush();

    let items = features.map((block, index) => {
        let coords = block['geometry']['coordinates'][0][0];
        return {minX: coords[0][0], minY: coords[3][1], maxX: coords[2][0], maxY: coords[1][1], id: index};
    }
    );

    tree.load(items)

    return tree

}

/**
* treeBboxIntersect method:
*   Given a list of buffers and a R-Tree data structure, this method
#   finds the potential blocks in the tree intersecting with these
#   buffers and returns the id's of these blocks.
*/
function treeBboxIntersect(buffers, tree) {
    let Ids = [];

    for (let buffer of buffers) {
        let bbox = turf.bbox(buffer);
        let bounds = {minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]};
        let intersectingBlocks = tree.search(bounds);
        let intersectingBlocksIds = intersectingBlocks.map((arr) => arr.id)
        Ids = Ids.concat(intersectingBlocksIds);
    }

    return Ids
}

export { groundStyling, airStyling, firstPartyStyling, groundBuffersStyle, airBuffersStyle, convertSpeed, createRTree, treeBboxIntersect };
// ======================================= END OF FILE =======================================
