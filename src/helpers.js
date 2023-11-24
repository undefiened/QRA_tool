/**
* File contains helper functions that can be used by different classes.
*/


/**
* styling method:
*   A function that styles tiles for choropleth map.
*/
function groundStyling(feature) {
    return {
        fillColor: getGroundColor(feature.properties.B),
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
    return {
        fillColor: getAirColor(feature.properties.T),
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

export { groundStyling, airStyling, groundBuffersStyle, airBuffersStyle, convertSpeed, createRTree, treeBboxIntersect };
// ======================================= END OF FILE =======================================
