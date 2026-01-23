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
* File contains classes related to visualizations on the screen.
*/

let polyclip = window['polyclip-ts'];

import * as Objects from './objects.js';
import * as Helpers from './helpers.js';

let dataUrls = {
    "nk_area": "./data/population_nk_processed_06w2_with_D.geojson",
    "stockholm_area": "./data/population_stockholm.geojson",
    "ockero_area": "./data/population_ockero.geojson",
    "vastervik_area": "./data/population_vastervik.geojson"
}

let dataViews = {
    "nk_area": [58.5877, 16.1924],
    "stockholm_area": [59.3118, 18.0663],
    "ockero_area": [57.71, 11.65],
    "vastervik_area": [57.75, 16.63],
}

let dataZoomLevels = {
    "nk_area": 12,
    "stockholm_area": 11,
    "ockero_area": 12,
    "vastervik_area": 12,
}

let workersUrl = './src/workers.js';

// Names of the map layers
const Layers = {
    Ground: "Ground risk",
    Air: "Air risk",
    FirstParty: "1st-party risk <span style=\"color: red; font-weight: bold;\">(experimental)</span>"
}

/**
* Class Visualization
*   It is responsible for creating and updating a map,
*   implements methods for interacting with the map, adding
*   objects to it and updates statistics shown on the webpage.
*/

class Visualization {
     /*-------Instance variables-------*/

    #rectangleWidth;
    #nodesList;
    #edgesList;
    #nodesGeoJsonLayersList;
    #edgesGeoJsonLayersList;
    #map;
    #groundBuffersUnion;
    #groundBuffersUnionGeoJSON;
    #groundBuffersUnionGeoJsonLayers;
    #airBuffersUnion;
    #airBuffersUnionGeoJSON;
    #airBuffersUnionGeoJsonLayers;
    #totalNMAC_rate;
    #totalExpectedNMAC;
    #totalMissionDuration;
    #NMAC_radius;
    #segmentExtensionLength;
    #v_UA;

    #populationElement;
    #lengthElement;
    #areaElement;
    #exposedDensityElement;
    #exposedLengthWeight;
    #NMAC_rateElement;
    #totalsTableElement;
    #segmentsTableElement;
    #segmentsExtensionCheckbox;
    #spinnerContainer;
    #NMAC_Slider;
    #speedSlider;
    #extensionSlider;
    #globalAltitudeSlider;
    #droneDensitySlider;
    #droneTrafficDensity;
    #totalFirstPartyNMAC_rate;
    #totalExpectedFirstPartyNMAC;
    #totalDnSum;

    #population;
    #timeoutId;
    #ongoingComputation;
    #useRTree;
    #rtreeData;

    #selectedArea;
    #dataUrl;

    constructor(selected_area) {
        this.#selectedArea = selected_area;
        this.#dataUrl = dataUrls[selected_area] ?? dataUrls["nk_area"];
        console.log(this.#dataUrl);

        this.#rectangleWidth = 200;
        this.#nodesList = [];
        this.#edgesList = [];
        this.#nodesGeoJsonLayersList = L.layerGroup([]);
        this.#edgesGeoJsonLayersList = L.layerGroup([]);
        this.#groundBuffersUnion = null;
        this.#groundBuffersUnionGeoJSON = null;
        this.#groundBuffersUnionGeoJsonLayers = L.layerGroup([]);
        this.#airBuffersUnion = null;
        this.#airBuffersUnionGeoJSON = null;
        this.#airBuffersUnionGeoJsonLayers = L.layerGroup([]);
        this.#totalNMAC_rate = 0;
        this.#totalExpectedNMAC = 0;
        this.#totalMissionDuration = 0;
        this.#NMAC_radius = 50;
        this.#segmentExtensionLength = 100;
        this.#v_UA = 8.34;  // m/s
        this.#droneTrafficDensity = 1;  // average number of drones in the air
        this.#totalFirstPartyNMAC_rate = 0;
        this.#totalExpectedFirstPartyNMAC = 0;
        this.#totalDnSum = 0;

        this.#populationElement = document.getElementById("population");
        this.#lengthElement = document.getElementById("length");
        this.#areaElement = document.getElementById("area");
        this.#exposedDensityElement = document.getElementById("exposed-density");
        this.#exposedLengthWeight = document.getElementById("exposed-length-weight");
        this.#NMAC_rateElement = document.getElementById("nmac-rate");
        this.#totalsTableElement = document.getElementById("totals-table");
        this.#segmentsTableElement = document.getElementById("segments-table");
        this.#segmentsExtensionCheckbox = document.getElementById("segment-extension");
        this.#spinnerContainer = document.getElementById('spinner-container');


        this.#population = null;  // population data in geojson format.
        this.#timeoutId = null;  // used for debouncing method call
        this.#ongoingComputation = 0;
        this.#useRTree = true;
        this.#rtreeData = null;

        // setting current year at footer
        document.getElementById("currentYear").textContent = new Date().getFullYear();;

        // running initialization methods
        this.#initializeData();
        this.#initializeMap();
        this.#initTooltips();
        this.#initializeNMAC_slider();
        this.#initializeEdgeExtensionSlider();
        this.#initializeUavSpeedSlider();
        this.#initializeGlobalAltitudeSlider();
        this.#initializeDroneDensitySlider();
        this.#initializeSegmentExtensionCheckbox();
        this.#computeTotalStatistics();
    }

    /* ---------- Methods - private ---------- */

    /**
    * getDataUrlByAreaName method:
    *   Returns an appropriate link to the data 
    */

    #getDataUrlByAreaName(area_name) {

    }

    async #initializeData() {
        let promise = new Promise((resolve, reject) => {
           $.getJSON(this.#dataUrl, function(data, status, xhr) {
                if (status === 'success') {
                    resolve(data);
                } else {
                    reject(error);
                }
           })
        });

        try {
          this.#population = await promise; 
        } catch (error) {
          console.error('Error fetching data:', error);
        }

        if (this.#useRTree) {
            try {
              this.#rtreeData = Helpers.createRTree(this.#population['features']);
            } catch (error) {
              console.error('Error creating R-Tree of the data:', error);
            }
        }

        // Calculate total Dn sum for normalizing 1st-party risk
        this.#totalDnSum = this.#population['features'].reduce((sum, feature) => {
            return sum + (feature.properties.Dn || 0);
        }, 0);
        console.log('Total Dn sum:', this.#totalDnSum);
    }

    /**
    * initializeMap method:
    *   Creates a Leaflet map with data from OpenStreetMap.
    *   Requires an html element with id `map` to exist.
    */
    async #initializeMap() {
        await this.#initializeData();

        let groundLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '&copy <a href="http://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://www.lantmateriet.se/en/">Lantmäteriet</a>'
        });

        let airLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '&copy <a href="http://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://www.lantmateriet.se/en/">Lantmäteriet</a>'
        });

        let firstPartyLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '&copy <a href="http://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://www.lantmateriet.se/en/">Lantmäteriet</a>'
        });

        this.#map = L.map('map', {
            doubleClickZoom: false,
            preferCanvas: true,
            layers: [groundLayer]
        }).setView(dataViews[this.#selectedArea], dataZoomLevels[this.#selectedArea]);

        let layerControl = L.control.layers({[Layers.Ground]: groundLayer, [Layers.Air]: airLayer, [Layers.FirstParty]: firstPartyLayer}, null, {collapsed: false}).addTo(this.#map);

        let groundGeoJSONLayer = L.geoJSON(this.#population, {style: Helpers.groundStyling}).addTo(this.#map);
        let airGeoJSONLayer = L.geoJSON(this.#population, {style: Helpers.airStyling});
        let firstPartyGeoJSONLayer = L.geoJSON(this.#population, {style: Helpers.firstPartyStyling});

        this.#groundBuffersUnionGeoJsonLayers.addTo(this.#map);
        this.#nodesGeoJsonLayersList.addTo(this.#map);
        this.#edgesGeoJsonLayersList.addTo(this.#map);

        // Add a listener to the 'baselayerchange' event
        this.#map.on('baselayerchange', function (e) {
            // Remove all risk layers first
            groundGeoJSONLayer.remove();
            airGeoJSONLayer.remove();
            firstPartyGeoJSONLayer.remove();
            this.#groundBuffersUnionGeoJsonLayers.remove();
            this.#airBuffersUnionGeoJsonLayers.remove();
            this.#edgesGeoJsonLayersList.remove();

            // Check which base layer was selected and add corresponding layers
            if (e.name === Layers.Ground) {
                groundGeoJSONLayer.addTo(this.#map);
                this.#groundBuffersUnionGeoJsonLayers.addTo(this.#map);
            } else if (e.name === Layers.Air) {
                airGeoJSONLayer.addTo(this.#map);
                this.#airBuffersUnionGeoJsonLayers.addTo(this.#map);
            } else if (e.name === Layers.FirstParty) {
                firstPartyGeoJSONLayer.addTo(this.#map);
                this.#groundBuffersUnionGeoJsonLayers.addTo(this.#map);
            }
            this.#edgesGeoJsonLayersList.addTo(this.#map);
        }.bind(this));

        this.#map.on('dblclick', this.#onMapDoubleClick.bind(this));
    }

    /**
    * deinitializeMap public method:
    *   Destroys the map so that the widget can be reinitialized.
    */
    deinitializeMap() {
        // this.#map.off();
        if(this.#map != undefined) {
            this.#map.remove();
        }
    }

    /**
    * initTooltips method:
    *   Initialize all tooltips so that they can be rendered on hover.
    */
    #initTooltips() {
        let tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
          return new bootstrap.Tooltip(tooltipTriggerEl)
        })
    }

    /**
    * onMapDoubleClick method:
    *   A double click on the map calls this function, which creates
    *   a node on the clicked location, and an edge between the last
    *   two nodes if at least two nodes exist.
    */
    #onMapDoubleClick(event) {
        let altitude = this.#nodesList.length > 0 ? this.#nodesList[this.#nodesList.length-1].altitude : this.#rectangleWidth;
        let latlng = Object.values(event.latlng);

        const node = new Objects.Node(latlng, altitude, this.#nodesList.length);
        this.#nodesGeoJsonLayersList.addLayer(node.marker);
        this.#nodeOnEvent(node);

        if (this.#nodesList.length > 0) {
            this.#nodesList[this.#nodesList.length-1].nextCicle = node;
        }

        this.#nodesList.push(node);

        // if there are two or more nodes, add an edge between last two nodes
        if (this.#nodesList.length > 1) {
            let [source, destination] = this.#nodesList.slice(this.#nodesList.length-2, this.#nodesList.length);
            let edge = new Objects.Edge(source, destination, source.altitude, this.#NMAC_radius, this.#edgesList.length);
            if (this.#segmentsExtensionCheckbox.checked) {
                edge.extraLength = this.#segmentExtensionLength;
                edge.update();
            }
            this.#edgesGeoJsonLayersList.addLayer(edge.polyline);
            this.#edgesList.push(edge);
            this.#updateBuffersUnion("ground");
            this.#updateBuffersUnion("air");
            this.#computeRisks([edge]);
        }
    }
    // onMapDoubleClick(event) {this.#onMapDoubleClick(event)}

    /**
    * nodeOnEvent method:
    *   Events related to a node are registered in this method.
    */
    #nodeOnEvent(node) {
        node.smoothCheckboxElement.addEventListener('change', (event) => {
            if (node.hasEdge()) {
                this.#updateBuffersUnion("ground");
                this.#computeRisks([node.edge]);
            }
        })

        node.sliderElement.noUiSlider.on('change', (handles, value) => {
            this.#updateBuffersUnion("ground");

            // if the node has an incoming edge that is smooth, and an outgoing edge, update population of both
            if (node.hasEdge() && node.edgesList.length === 2 && node.edgesList[0].nodesList[0].isSmooth) {
                this.#computeRisks(node.edgesList);
            // last node without own edge, but incoming edge is smooth
            } else if (!node.hasEdge() && node.edgesList.length === 1 && node.edgesList[0].nodesList[0].isSmooth) {
                this.#computeRisks(node.edgesList);
            } else if (node.hasEdge()) {
                this.#computeRisks([node.edge]);
            }
        })

        node.splitButtonElement.addEventListener('click', () => {this.#splitEdge(node)});

        node.removeButtonElement.addEventListener('click', () => {this.#removeNode(node)});

        node.marker.on('moveend', (event) => {
                this.#updateBuffersUnion("ground");
                this.#updateBuffersUnion("air");
                this.#computeRisks(node.edgesList);
                })
    }

    /**
    * splitEdge method:
    *   When a node's edge is split into two edges, a new node is added in the middle
    *   of that edge, making the original edge an edge between original source node and
    *   and the new node, and it creates a new edge between the new node and the original
    *   destination node of the original edge.
    */
    #splitEdge(node) {
        if (node.hasEdge()) {
            let latlng = Object.values(node.edge.polyline.getCenter());
            let newNode = new Objects.Node(latlng, node.altitude, node.positionInList+1)
            let newEdge = null;
            let orgDestination = node.edge.nodesList[1];

            this.#nodesGeoJsonLayersList.addLayer(newNode.marker);
            this.#nodeOnEvent(newNode);

            node.nextCicle = newNode;
            newNode.nextCicle = orgDestination;
            this.#nodesList.splice(node.positionInList+1 ,0, newNode);

            node.edge.nodesList[1] = newNode;
            newNode.edgesList[0] = node.edge;
            node.edge.update();

            if (orgDestination.edgesList.length === 1) {
                orgDestination.edgesList.pop()
                newEdge = new Objects.Edge(newNode, orgDestination, newNode.altitude, this.#NMAC_radius, node.edge.positionInList+1)
            } else if (orgDestination.edgesList.length === 2) {
                newEdge = new Objects.Edge(newNode, orgDestination, newNode.altitude, this.#NMAC_radius, node.edge.positionInList+1)
                orgDestination.edgesList.reverse();
                orgDestination.edgesList.pop();
            }

            this.#edgesGeoJsonLayersList.addLayer(newEdge.polyline);

            this.#edgesList.splice(node.edge.positionInList+1, 0, newEdge);
            this.#updateBuffersUnion("ground");
            this.#updateBuffersUnion("air");
            this.#computeRisks([node.edge, newEdge]);

            this.#nodesList.slice(node.positionInList+2, this.#nodesList.length).map((node) => {node.positionInList += 1});
            this.#edgesList.slice(node.edge.positionInList+2, this.#edgesList.length).map((edge) => {edge.positionInList += 1})
            this.#edgesList.slice(node.edge.positionInList, this.#edgesList.length).map((edge) => {this.#addSegmentRow(edge)})

        }
    }

    /**
    * removeNode method:
    *   When a user clicks the remove button of a node's popup, the node itself
    *   and its outgoing edge (if it has one) are removed. In the case of the last
    *   node, its incoming edge is removed. In the case of a node with both incoming
    *   and outgoing edge, the incoming edge is updated.
    */
    #removeNode(node) {
        if (node.hasEdge() && node.edgesList.length === 1) {
            this.#nodesList.splice(0, 1);
            this.#nodesGeoJsonLayersList.removeLayer(node.marker);
            this.#edgesList.splice(0, 1);
            this.#edgesGeoJsonLayersList.removeLayer(node.edge.polyline);
            this.#nodesList[0].edgesList.splice(0, 1);

            this.#nodesList.map((node) => {node.positionInList -= 1});
            this.#edgesList.map((edge) => {edge.positionInList -= 1})

            this.#segmentsTableElement.querySelector('tbody').deleteRow(0);
            this.#updateBuffersUnion("ground");
            this.#updateBuffersUnion("air");
            this.#computeRisksDebounced([]);
            this.#edgesList.map((edge) => {this.#addSegmentRow(edge)});

        } else if (!node.hasEdge() && node.edgesList.length === 1) {
            this.#nodesList.splice(this.#nodesList.length-1, 1);
            this.#nodesGeoJsonLayersList.removeLayer(node.marker);
            this.#edgesList.splice(this.#edgesList.length-1, 1);
            let source = node.edgesList[0].nodesList[0];
            source.edge.polyline.remove();
            source.edgesList.pop();
            source.edge = null;
            source.nextCycle = null;

            this.#segmentsTableElement.querySelector('tbody').deleteRow(this.#edgesList.length);
            this.#updateBuffersUnion("ground");
            this.#updateBuffersUnion("air");
            this.#computeRisksDebounced([]);

        } else if (node.edgesList.length === 2){
            this.#nodesList.splice(node.positionInList, 1);
            this.#nodesGeoJsonLayersList.removeLayer(node.marker);
            this.#edgesList.splice(node.edge.positionInList, 1);
            this.#edgesGeoJsonLayersList.removeLayer(node.edge.polyline);
            this.#segmentsTableElement.querySelector('tbody').deleteRow(node.edge.positionInList);

            let source = node.edgesList[0].nodesList[0];
            let destination = node.edge.nodesList[1];
            source.nextCycle = destination;
            source.edge.nodesList[1] = destination;
            destination.edgesList[0] = source.edge;
            source.edge.update();

            this.#nodesList.slice(node.positionInList, this.#nodesList.length).map((node) => {node.positionInList -= 1});
            this.#edgesList.slice(node.edge.positionInList, this.#edgesList.length).map((edge) => {edge.positionInList -= 1})

            this.#updateBuffersUnion("ground");
            this.#updateBuffersUnion("air");
            this.#computeRisks([source.edge]);
            this.#edgesList.slice(node.edge.positionInList, this.#edgesList.length).map((edge) => {this.#addSegmentRow(edge)});
        }
    }

    /**
    * updateBuffersUnion method:
    *   Method that receives a location, either `ground` or `air`,
    *   removes the old overlay layer (if exists), recomputes the union of
    *   the buffers for that location and adds a new layer to the map.
    */
    #updateBuffersUnion(location) {
        if (location === "ground" && this.#groundBuffersUnionGeoJSON != null) {
            this.#groundBuffersUnionGeoJsonLayers.removeLayer(this.#groundBuffersUnionGeoJSON);
        } else if (location === "air" && this.#airBuffersUnionGeoJSON != null) {
            this.#airBuffersUnionGeoJsonLayers.removeLayer(this.#airBuffersUnionGeoJSON);
        }

        let buffersList = this.#edgesList.map((edge) => {return location === "ground" ? edge.groundBuffer : edge.airBuffer})
        let buffersUnion = this.#unionOfBuffers(buffersList);

        if (location === "ground") {
            this.#groundBuffersUnion = buffersUnion;
            this.#groundBuffersUnionGeoJSON = L.geoJSON(buffersUnion, {style: Helpers.groundBuffersStyle});
            this.#groundBuffersUnionGeoJsonLayers.addLayer(this.#groundBuffersUnionGeoJSON);
        } else if (location === "air") {
            this.#airBuffersUnion = buffersUnion;
            this.#airBuffersUnionGeoJSON = L.geoJSON(buffersUnion, {style: Helpers.airBuffersStyle});
            this.#airBuffersUnionGeoJsonLayers.addLayer(this.#airBuffersUnionGeoJSON);
        }
    }

    /**
    * unionOfBuffers method:
    *   Method for computing the union of all edge's buffers
    */
    #unionOfBuffers(buffersList) {
        let coords = this.#nodesList.map((node) => {return Object.values(node.point.geometry.coordinates.toReversed())});
        console.log('nodesCoordinates: ', JSON.stringify(coords, null, 2));
        // console.log('nodesCoordinates: ', this.#nodesList.map((node) => {return node.point.geometry.coordinates.reverse()}));
        if (this.#edgesList.length > 0) {
        // Uncomment this section to test bugs
//            try {
//                let union = buffersList[0];
//
//                for (let buffer of buffersList) {
//                    union = turf.union(union, buffer);
//                }
//            } catch (error){
//                console.log(error)
//            }

            let union = polyclip.union(...buffersList.map((buffer) => buffer.geometry.coordinates));
            return turf.buffer(turf.multiPolygon(union), 0.0001, {units: 'meters'});
        }
        return null;
    }

    /**
    * computeRisksDebounced method:
    *   Method for debouncing the call to `#computeRisks` by one sec.
    *   That is the last call only to this method within a second is considered.
    */
    #computeRisksDebounced(edges) {
        // Clear the previous timer (if any)
        clearTimeout(this.#timeoutId);

        // Set a new timer to call computeRisks after a delay
        this.#timeoutId = setTimeout(() => { this.#computeRisks(edges); }, 1000);
    }

    /**
    * computeRisks method:
    *   Method that computes the population number intersected by the full route
    *   as well as the population number intersected by an edge among the given edges list `edges`,
    *   which can contain zero, one or two edges. The method also finds the terms needed for computing the
    *   NMAC prob for each edge.
    */
    async #computeRisks(edges) {
        await this.#initializeData();

        if (this.#groundBuffersUnion) {
            if (this.#ongoingComputation < 1) {
                this.#showSpinner();
            }
            this.#ongoingComputation++;

            this.#totalNMAC_rate = 0;
            edges.map((edge) => {edge.population = 0;})

            let blocks = null;

            if (this.#useRTree) {
                let groundIDs = Helpers.treeBboxIntersect(edges.map(edge => edge.groundBuffer), this.#rtreeData);
                let airIDs = Helpers.treeBboxIntersect(edges.map(edge => edge.airBuffer), this.#rtreeData);
                let ids = Array.from(new Set(groundIDs.concat(airIDs)));
                blocks = ids.map(id => this.#population.features[id])
            } else {
                blocks = this.#population.features
            }

            // performing multithreading to handle the large population dataset
            let numWorkers = blocks.length > 1000 ? 4 : 1;
            let chunkSize = Math.ceil(blocks.length / numWorkers);
            let workers = [];
            let edgesSubsetPopulations = [];
            let edgesCirclePopulations = [];
            let edgesSubsetTimes = []
            let edgesSubsetAverageSpeeds = []
            let maxPopulations = [];
            let edgesSubsetDroneDensities = [];
            let tileArea = 10_000; // 100x100

            for (let i = 0; i < numWorkers; i++) {
                let start = i*chunkSize;
                let end = start + chunkSize;
                let subset = blocks.slice(start, end);

                let worker = new Worker(workersUrl);
                let groundBuffers = edges.map((edge) => {return edge.groundBuffer});
                let airBuffers = edges.map((edge) => {return edge.airBuffer});
                let circles = edges.map((edge) => {
                    let [src, dest] = edge.nodesList;
                    [src.circleCoveredPopulation, dest.circleCoveredPopulation] = [0, 0];
                    return [src.circle, dest.circle];
                });
                worker.postMessage([subset, groundBuffers, airBuffers, circles, tileArea]);

                worker.onmessage = function(event) {
                    let [edgesIntersectedPopulation, circlesPopulations, edgesTimes,
                         edgesAverageSpeeds, edgesMaxPopulations, edgesDroneDensities] = event.data;

                    edgesSubsetPopulations.push(edgesIntersectedPopulation);
                    edgesCirclePopulations.push(circlesPopulations);
                    edgesSubsetTimes.push(edgesTimes);
                    edgesSubsetAverageSpeeds.push(edgesAverageSpeeds);
                    maxPopulations.push(edgesMaxPopulations);
                    edgesSubsetDroneDensities.push(edgesDroneDensities);

                    if (edgesSubsetPopulations.length === numWorkers) {
                        for (let j = 0; j < edges.length; j++) {
                            let edge = edges[j];

                            edge.population = (edgesSubsetPopulations.map((lst) => {return lst[j]})).reduce((a, c) => a + c, 0);
                            edge.maxSquarePopulationDensity = Math.max(...(maxPopulations.map((lst) => {return lst[j]}))) / tileArea;
                            let edgeCirclesPopulations = edgesCirclePopulations.map((worker) => worker[j]);
                            let circlesPopulation = edgeCirclesPopulations.reduce((a, c) => a.map((el, index) => el + c[index]));
                            let [src, dest] = edge.nodesList;
                            src.circleCoveredPopulation = circlesPopulation[0];
                            dest.circleCoveredPopulation = circlesPopulation[1];

                            let T_sum = (edgesSubsetTimes.map((lst) => {return lst[j]})).reduce((a, c) => a + c, 0);
                            edge.NMAC_time = T_sum;
                            let edgeAverageSpeeds = edgesSubsetAverageSpeeds.map((lst) => {return lst[j]});
                            edgeAverageSpeeds = edgeAverageSpeeds.flat().filter(v => v > 0);
                            edge.NMAC_avg_speeds = edgeAverageSpeeds;
                            let v_GA_mean = edgeAverageSpeeds.reduce((a, c) => a + c, 0) / edgeAverageSpeeds.length || 0;
                            let prob = this.#population.features[0].properties.p;
                            edge.computeNMAC_rate(T_sum, v_GA_mean, prob);

                            // Compute 1st-party risk (drone-to-drone), normalized by total Dn sum
                            let Dn_sum = (edgesSubsetDroneDensities.map((lst) => {return lst[j]})).reduce((a, c) => a + c, 0);
                            let Dn_normalized = this.#totalDnSum > 0 ? Dn_sum / this.#totalDnSum : 0;
                            edge.firstPartyDn = Dn_normalized;
                            edge.computeFirstPartyNMAC_rate(Dn_normalized * this.#droneTrafficDensity, this.#v_UA, prob);
                        }

                        let totalAverageGASpeeds = this.#edgesList.reduce(function (flattenedArray, element) {
                            return flattenedArray.concat(element.NMAC_avg_speeds);
                          }, []);
                        let v = totalAverageGASpeeds.flat();
                        let v_mean = v.length > 0 ? v.reduce((a, c) => a + c, 0) / v.length : 0;
                        let airG = this.#edgesList.reduce((a, c) => a + c.airBufferArea, 0);
                        let totalTime = this.#edgesList.reduce((a, c) => a + c.NMAC_time, 0);
                        let total_p_HC = (2 * this.#NMAC_radius**2 * totalTime * Math.sqrt(this.#v_UA**2 + v_mean**2)) /
                                         (this.#NMAC_radius * airG);
                        let rate = total_p_HC * this.#population.features[0].properties.p;
                        let totalLength = this.#edgesList.reduce((a, edge) => a + edge.length, 0);
                        this.#totalExpectedNMAC = (totalLength / this.#v_UA) * rate;
                        this.#totalMissionDuration = totalLength / this.#v_UA;
                        this.#totalNMAC_rate = Math.ceil(rate * 3600 * 1e6)

                        // Compute total 1st-party risk
                        let totalDn = this.#edgesList.reduce((a, c) => a + (c.firstPartyDn || 0), 0);
                        let totalFirstParty_p_HC = (2 * this.#NMAC_radius**2 * totalDn * this.#droneTrafficDensity * Math.sqrt(2 * this.#v_UA**2)) /
                                                   (this.#NMAC_radius * airG);
                        let firstPartyRate = totalFirstParty_p_HC * this.#population.features[0].properties.p;
                        this.#totalExpectedFirstPartyNMAC = (totalLength / this.#v_UA) * firstPartyRate;
                        this.#totalFirstPartyNMAC_rate = Math.ceil(firstPartyRate * 3600 * 1e6)

                        this.#ongoingComputation--;
                        this.#computeTotalStatistics()
                        edges.map((edge) => {this.#addSegmentRow(edge)});

                        workers.forEach(function(worker) {
                            worker.terminate();
                        });
                    }
                }.bind(this);

                workers.push(worker);
            }
        }
    }

    /**
    * showSpinner method:
    *   Method that displays a spinner in all the value cells of the totals table,
    *   when the statistics are being computed, i.e. when `#computeRisks` is running.
    */
    #showSpinner() {
        this.#spinnerContainer.style.display = 'block';
        let cells = this.#totalsTableElement.querySelector('tbody').querySelector('tr').querySelectorAll('td');

        for (let cell of cells) {
            cell.innerHTML = '<div class="spinner-grow spinner-grow-sm text-primary" role="status"></div>';
        }

    }

    /**
    * hideSpinner method:
    *   Method that hides the `Computing...` text when `#computeRisks` has finished running.
    */
    #hideSpinner() {
      this.#spinnerContainer.style.display = 'none';
    }

    /**
    * doubleComputations method:
    *   Method that finds and returns the twice computed population and ground area.
    */
    #doubleComputations() {
        let doubleComputedPopulation = 0;
        let doubleComputedArea = 0;

        for (let x = 0; x < this.#edgesList.length-1; x++) {
            let e1 = this.#edgesList[x];
            let e2 = this.#edgesList[x+1];
            doubleComputedPopulation += Math.min(e1.nodesList[1].circleCoveredPopulation, e2.nodesList[0].circleCoveredPopulation);
            doubleComputedArea += Math.min(e1.nodesList[1].circleArea, e2.nodesList[0].circleArea);
        }

        return [doubleComputedPopulation, doubleComputedArea];
    }

    /**
    * computeTotalStatistics method:
    *   Computes the totals section statistics and updates the totals table.
    */
    #computeTotalStatistics() {
        let totalPopulationAtRisk = this.#edgesList.reduce((a, edge) => a + edge.population, 0);
        let totalLength = this.#edgesList.reduce((a, edge) => a + edge.length, 0);
        let totalArea = this.#edgesList.reduce((a, edge) => a + edge.groundArea, 0);
        let [doubleComputedPopulation, doubleComputedArea] = this.#doubleComputations();
        totalPopulationAtRisk -= doubleComputedPopulation;
        totalArea -= doubleComputedArea;

        let linearDensity = totalLength ? (totalPopulationAtRisk / totalLength).toExponential(2) : 0;
        let exposedDensity = totalArea ? (totalPopulationAtRisk / totalArea).toExponential(2) : 0;
        let maxExposedDensity = this.#edgesList.reduce((a, edge) => Math.max(a, edge.maxSquarePopulationDensity), 0);
        let expectedNMAC = totalArea ? (this.#totalExpectedNMAC).toExponential(2) : 0;
        let expectedFirstPartyNMAC = totalArea ? (this.#totalExpectedFirstPartyNMAC).toExponential(2) : 0;
        let totalTime = this.#totalMissionDuration;

        let cells = this.#totalsTableElement.querySelector('tbody').querySelector('tr').querySelectorAll('td');

        let data = [Math.ceil(totalLength), Math.ceil(totalTime/60), Math.ceil(totalPopulationAtRisk),
                    Math.ceil(totalArea), linearDensity, exposedDensity, maxExposedDensity, this.#totalNMAC_rate,
                    expectedNMAC, this.#totalFirstPartyNMAC_rate, expectedFirstPartyNMAC];

        if (this.#ongoingComputation < 1) {
            for (let i = 0; i < cells.length; i++) {
                 cells[i].textContent = data[i];
            }
            this.#hideSpinner();
        }
    }

    /**
    * addSegmentRow method:
    *   Adds a new row for the last created edge into the segments table,
    *   or modifies the row content of an edge.
    */
    #addSegmentRow(edge) {
        let tableBody = this.#segmentsTableElement.querySelector('tbody')
        let rows = tableBody.querySelectorAll('tr');
        
        let generalData = [edge.positionInList+1, edge.altitude, Math.ceil(edge.length),
                           Math.ceil((edge.length/this.#v_UA)/60)];
        let groundRiskData = [Math.ceil(edge.population), Math.ceil(edge.groundArea),
                              (edge.population/edge.length).toExponential(2),
                              (edge.population/edge.groundArea).toExponential(2),
                              (edge.maxSquarePopulationDensity).toExponential(2)];
        let airRiskData = [Math.ceil(edge.NMAC_rate), (edge.expectedNMAC).toExponential(2)];
        let firstPartyRiskData = [Math.ceil(edge.firstPartyNMAC_rate || 0), (edge.expectedFirstPartyNMAC || 0).toExponential(2)];

        let data = generalData.concat(groundRiskData, airRiskData, firstPartyRiskData);

        if (this.#edgesList.length === rows.length) {
            // edge already exist
            let row = rows[edge.positionInList]
            let cells = row.querySelectorAll('td');

            for (let i = 0; i < data.length; i++) {
                cells[i+1].textContent = data[i];
            }
            cells[0].style.background = edge.polylineColor;
        } else {
            let newRow = document.createElement('tr');

            let colorColumn = document.createElement('td');
            colorColumn.classList.add('color-column');
            colorColumn.style.background = edge.polylineColor;
            newRow.appendChild(colorColumn);

            this.#addDataBlockToRow(newRow, generalData, 'table-light');
            this.#addDataBlockToRow(newRow, groundRiskData, 'table-warning');
            this.#addDataBlockToRow(newRow, airRiskData, 'table-primary');
            this.#addDataBlockToRow(newRow, firstPartyRiskData, 'table-success');
            
            tableBody.appendChild(newRow);
        }
    }

    #addDataBlockToRow(row, data, tableClass) {
        for (let i = 0; i < data.length; i++) {
            const cell = document.createElement('td');
            cell.classList.add(tableClass)
            cell.textContent = data[i];
            row.appendChild(cell);
        }
    }

    /**
    * initializeNMAC_slider method:
    *   Creates one slider for modifying air buffer radius of all edges simultaneously.
    */
    #initializeNMAC_slider() {
        this.#NMAC_Slider = document.getElementById('nmac-slider');
        
        if (!this.#NMAC_Slider.noUiSlider) {
            noUiSlider.create(this.#NMAC_Slider, {
                start: [this.#NMAC_radius],
                step: 1,
                connect: 'lower',
                tooltips: {
                    to: (value) => Math.round(value),
                },
                range: {
                'min': [10],
                'max': [1200]
                },
            });
        }
        this.#NMAC_Slider.noUiSlider.on('change', this.#onNMAC_sliderChange.bind(this));
    }

    /**
    * onNMAC_sliderChange method:
    *   Upon sliding nmac-slider, each edge's air buffer radius is changed
    *   as well as the air buffer recomputed, the buffer union recomputed
    *   and the stats updated.
    */
    #onNMAC_sliderChange(values, handle) {
        this.#NMAC_radius = Math.floor(values[handle]);

        for (let edge of this.#edgesList) {
            edge.NMAC_radius = this.#NMAC_radius;
            edge.update()
        }

        this.#updateBuffersUnion("air");
        this.#computeRisksDebounced(this.#edgesList);
    }

    /**
    * initializeEdgeExtensionSlider method:
    *   Creates one slider for modifying the edge extension length.
    */
    #initializeEdgeExtensionSlider() {
        this.#extensionSlider = document.getElementById('extension-slider');
        if (!this.#extensionSlider.noUiSlider) {
            noUiSlider.create(this.#extensionSlider, {
                start: [this.#segmentExtensionLength],
                step: 1,
                tooltips: {
                    to: (value) => Math.round(value),
                },
                connect: 'lower',
                range: {
                'min': [0],
                'max': [1200]
                },
            });
        }
        this.#extensionSlider.noUiSlider.on('change', this.#onEdgeExtensionSliderChange.bind(this));
        this.#extensionSlider.noUiSlider.disable();
    }

    /**
    * onEdgeExtensionSliderChange method:
    *   Upon slider move, update `segmentExtensionLength` and if
    *   checkbox is marked then update the edges.
    */
    #onEdgeExtensionSliderChange(values, handle) {
        this.#segmentExtensionLength = Math.floor(values[handle]);
        this.#segmentsExtensionCheckbox.checked ? this.#onSegmentExtensionCheckboxChange() : {};
    }

    /**
    * initializeUavSpeedSlider method:
    *   Creates one slider for modifying the UAV speed, in km/h.
    */
    #initializeUavSpeedSlider() {
        this.#speedSlider = document.getElementById('uav-speed-slider');
        if (!this.#speedSlider.noUiSlider) {
            noUiSlider.create(this.#speedSlider, {
                start: [this.#v_UA],
                step: 0.1,
                tooltips: {
                    to: (value) => Math.round(Helpers.convertSpeed(value)),
                },
                connect: 'lower',
                range: {
                'min': [1],
                'max': [50]
                },
            });
        }
        this.#speedSlider.noUiSlider.on('change', this.#onUavSpeedSliderChange.bind(this));
    }

    /**
    * onUavSpeedSliderChange method:
    *   Upon slider move, update drone speed for each edge and recompute nmac rates.
    */
    #onUavSpeedSliderChange(values, handle) {
        this.#v_UA = values[handle];
        this.#edgesList.map((edge) => {edge.v_UA = this.#v_UA})
        this.#computeRisksDebounced(this.#edgesList);
    }

        /**
    * initializeGlobalAltitudeSlider method:
    *   Creates one slider for modifying the edge's altitudes globally.
    *   Edges whose altitude is changed manually won't be affected.
    */
    #initializeGlobalAltitudeSlider() {
        this.#globalAltitudeSlider = document.getElementById('global-altitude-slider');

        if (!this.#globalAltitudeSlider.noUiSlider) {
            noUiSlider.create(this.#globalAltitudeSlider, {
                start: [this.#rectangleWidth],
                step: 1,
                tooltips: {
                    to: (value) => Math.round(value),
                },
                connect: 'lower',
                range: {
                'min': [10],
                'max': [1200]
                },
            });
        }
        this.#globalAltitudeSlider.noUiSlider.on('change', this.#onGlobalAltitudeSliderChange.bind(this));
    }

    /**
    * initializeDroneDensitySlider method:
    *   Creates one slider for modifying the drone traffic density
    *   (average number of drones in the air at any given moment).
    */
    #initializeDroneDensitySlider() {
        this.#droneDensitySlider = document.getElementById('drone-density-slider');

        if (!this.#droneDensitySlider.noUiSlider) {
            noUiSlider.create(this.#droneDensitySlider, {
                start: [this.#droneTrafficDensity],
                step: 1,
                tooltips: {
                    to: (value) => Math.round(value),
                },
                connect: 'lower',
                range: {
                'min': [1],
                'max': [100]
                },
            });
        }
        this.#droneDensitySlider.noUiSlider.on('change', this.#onDroneDensitySliderChange.bind(this));
    }

    /**
    * onDroneDensitySliderChange method:
    *   Upon slider move, updates drone traffic density and recomputes 1st-party risk.
    */
    #onDroneDensitySliderChange(values, handle) {
        this.#droneTrafficDensity = Math.floor(values[handle]);
        this.#computeRisksDebounced(this.#edgesList);
    }

    /**
    * onGlobalAltitudeSliderChange method:
    *   Upon slider move, updates altitude for each edge whose altitude not manually changed.
    */
    #onGlobalAltitudeSliderChange(values, handle) {
        let newAltitude = values[handle];
        let affectedEdges = [];

        for (let edge of this.#edgesList) {
            if (!edge.altitudeManuallyChanged) {
                edge.altitude = Math.floor(newAltitude);
                edge.nodesList[0].altitudeUpdatedGlobally(newAltitude);
                affectedEdges.push(edge);
            }
        }
        affectedEdges.map((edge) => edge.update())

        let lastSegment = this.#edgesList[this.#edgesList.length-1];
        if (!lastSegment.altitudeManuallyChanged) {
            lastSegment.nodesList[1].altitudeUpdatedGlobally(newAltitude);
            lastSegment.update()
        }

        this.#updateBuffersUnion("ground");
        this.#computeRisksDebounced(affectedEdges);
    }

    #initializeSegmentExtensionCheckbox() {
        this.#segmentsExtensionCheckbox.addEventListener('change', this.#onSegmentExtensionCheckboxChange.bind(this));
    }

    /**
    * onSegmentExtensionCheckboxChange method:
    *   When the segment extension checkbox is marked, each edge is
    *   updated so that it is extended by a distance and its statistics
    *   are updated as well.
    */
    #onSegmentExtensionCheckboxChange(event) {
        let extraLength = 0;
        if (this.#segmentsExtensionCheckbox.checked) {
            extraLength = this.#segmentExtensionLength;
            this.#extensionSlider.noUiSlider.enable();
        } else {
            this.#extensionSlider.noUiSlider.disable();
        }

        this.#edgesList.map((edge) => {edge.extraLength = extraLength});
        this.#edgesList.map((edge) => edge.update());

        this.#updateBuffersUnion("ground");
        this.#updateBuffersUnion("air");
        this.#computeRisksDebounced(this.#edgesList);
    }
}

export { Visualization };

// ======================================= END OF FILE =======================================
