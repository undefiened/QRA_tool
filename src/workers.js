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
* File implements Web Workers for multithreading.
*/

importScripts('https://unpkg.com/@turf/turf@6/turf.min.js');

/**
* calculateIntersectedPopulation method:
*   It finds the intersection between two polygons, finds the area
*   of the intersected part, and finds the population in that part.
*   The polygons are a tile `feature` and a list of edges buffers `groundBuffers`.
*   It also finds the covered population by each node's circle of an edge in the list.
*/
function calculateIntersectedPopulation(feature, groundBuffers, circles, area, maxPopulations) {
    let squarePopulation = feature.properties.B;
    let groundBuffersIntersections = groundBuffers.map((buffer) => {return turf.intersect(buffer, feature)});

    let edgesPopulation = groundBuffersIntersections.map((intersection, index) => {
        maxPopulations[index] = intersection && squarePopulation > maxPopulations[index] ? squarePopulation : maxPopulations[index];
        return intersection ? (turf.area(intersection) / area) * squarePopulation : 0;
    });

//    maxPopulations = groundBuffersIntersections.map((intersection, index) => {
//        return intersection && squarePopulation > maxPopulations[index] ? squarePopulation : maxPopulations[index];
//    });

    let circlesPopulation = [];

    circles.map((pair) => {
        let [sp, dp] = pair.map((p) => {
            let intersection = turf.intersect(feature, p);
            return intersection ? (turf.area(intersection) / area) * squarePopulation : 0;
        });
        circlesPopulation.push([sp, dp]);
    })

    return [edgesPopulation, circlesPopulation, maxPopulations];
}

/**
* computeTimes method:
*   Given a feature and some buffers, it finds the amount of time spend by GAs in
*   the intersected region by the drone path, for each such path `airBuffers`.
*/
function computeTimes(feature, airBuffers, area) {
    let edgesAirBufferIntersections = airBuffers.map((buffer) => {return turf.intersect(buffer, feature)});
    let timesSpentInEdges = edgesAirBufferIntersections.map((intersection) => {
        return intersection ? feature.properties.T * (turf.area(intersection) / area) : 0;
    });
    return timesSpentInEdges;
}

/**
* Listens for messages from the Visualization.js script
*   Given a subset of population blocks data, the ground and air buffers,
*   node circles of each edge and the area of the block, this function
*   finds the population intersected each edge and the population
*   covered by the circles. Moreover, it finds the time spent by GA
*   in each air buffer and the average speed of GA in that buffer.
*/
self.onmessage = function(event) {
    let [subset, groundBuffers, airBuffers, circles, area] = event.data;

    let edgesIntersectedPopulations = new Array(groundBuffers.length).fill(0);
    let circlesIntersectedPopulations = new Array(groundBuffers.length).fill([0, 0]);
    let edgesTimes = new Array(groundBuffers.length).fill(0);
    let edgesAverageSpeeds = new Array(groundBuffers.length).fill([]);
    let edgesMaxPopulations = new Array(groundBuffers.length).fill(0);

    let edgesPopulation = null;
    let circlesPopulation = null;

    for (let feature of subset) {
        [edgesPopulation, circlesPopulation, edgesMaxPopulations] = calculateIntersectedPopulation(feature, groundBuffers, circles, area, edgesMaxPopulations);

        edgesIntersectedPopulations = edgesIntersectedPopulations.map((value, index) => {
            return value + edgesPopulation[index]
        });

        circlesIntersectedPopulations = circlesIntersectedPopulations.map((pair, index) =>
            [pair[0] + circlesPopulation[index][0], pair[1] + circlesPopulation[index][1]]
        );

        let timesSpentInEdges = computeTimes(feature, airBuffers, area);
        edgesTimes = edgesTimes.map((value, index) => {
            return value + timesSpentInEdges[index]
        });

        let v = feature.properties.v;
        timesSpentInEdges.map((time, index) => {
            if (time > 0) {
                edgesAverageSpeeds[index].push(v);
            }
        })
    }
    // Send the result back to the main script
    self.postMessage([edgesIntersectedPopulations, circlesIntersectedPopulations, edgesTimes,
                      edgesAverageSpeeds, edgesMaxPopulations]);
};

// ======================================= END OF FILE =======================================
