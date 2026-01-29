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
* This file contains class definitions of objects that will be rendered on canvas.
* Objects such as `Node` and `Edge` are defined, that will be used to make a graph.
*/

import * as Constants from './constants.js';
import * as Helpers from './helpers.js';

const SEGMENT_COLOR = '#0d6efd';


/**
* Node class
*   An object that is added to a map with a double-click. It has
*   possibly an edge and a next cicle, along other properties.
*   A number of getters and setters are implemented, as well as the
*   ability to update its edge.
*/
class Node {
    /* Instance variables */
    #altitude;
    #hasEdge;
    #edge;
    #hasNextCicle;
    #nextCicle;
    #isSmooth;
    #marker;
    #positionInList;
    #edgesList;
    #circle;
    #circleArea;
    #circleCoveredPopulation;
    #point;
    #popupContent;
    #smoothCheckboxElement;
    #sliderElement;
    #splitButtonElement;
    #removeButtonElement;

    constructor(latlng, altitude, positionInList) {
        this.#altitude = altitude;
        this.#hasEdge = false;
        this.#edge = null;
        this.#hasNextCicle = false;
        this.#nextCicle = null;
        this.#isSmooth = true;
        this.#marker = L.marker(latlng, {draggable: true, autoPan: true});
        this.#positionInList = positionInList;
        this.#edgesList = [];
        this.#circleCoveredPopulation = 0;
        this.#marker.on('moveend', this.#markerMovedEvent.bind(this));
        this.#popupContent = this.#createPopupContent();
        this.#marker.bindPopup(this.#popupContent);

        this.#updatePoint();
        this.#updateCircle();

        return this;
    }

    /* ---------- Methods - private ---------- */

    /**
    * updateCircle method:
    *   Creates or updates a (the) circle and its area.
    */
    #updateCircle() {
        this.#circle = turf.circle(Object.values(this.#marker.getLatLng()).toReversed(), this.#altitude/2, {units: 'meters'});
        this.#circleArea = Math.PI * (this.#altitude / 2)**2;
    }

    /**
    * updateCircle method:
    *   Creates or updates a (the) point.
    */
    #updatePoint() {
        this.#point = turf.point(Object.values(this.#marker.getLatLng()).toReversed());
    }

    /**
    * createPopupContent method:
    *   Each created node has a popup window that can be accessed with a click.
    *   With it one can change the altitude, smooth the edge, ..etc.
    */
    #createPopupContent() {
        let popupDiv = document.createElement('popup-div');
        let title = document.createElement("p");
        title.innerHTML = "Altitude";
        this.#sliderElement = document.createElement('slider-div');
        this.#removeButtonElement = document.createElement('button');
        this.#splitButtonElement = document.createElement('button')
        this.#smoothCheckboxElement = document.createElement('input');
        let smoothLabel = document.createElement('label');
        let smoothDiv = document.createElement('div');

        popupDiv.style.display = 'flex';
        popupDiv.style.flexDirection = 'column';

        // slider element for altitude change
        this.#sliderElement.id = 'slider';
        this.#sliderElement.style.width = '200px';
        noUiSlider.create(this.#sliderElement, {
            start: [this.#altitude],
            step: 1,
            tooltips: {
                to: (value) => Math.round(value),
            },
            connect: 'lower',
            range: {
              'min': 10,
              'max': 1200
            },
        });
        popupDiv.appendChild(this.#sliderElement);
        this.#sliderElement.noUiSlider.on('change', this.#onSliderChange.bind(this));
        popupDiv.appendChild(title);

        this.#splitButtonElement.innerHTML = 'Split segment'
        this.#splitButtonElement.style.color = 'BlueViolet';
        this.#splitButtonElement.style.background = 'white';
        this.#splitButtonElement.style.borderRadius = '6px';
        popupDiv.appendChild(this.#splitButtonElement);
        popupDiv.appendChild(document.createElement('br'))

        this.#removeButtonElement.innerHTML = 'Remove waypoint';
        this.#removeButtonElement.style.color = 'Tomato';
        this.#removeButtonElement.style.background = 'white';
        this.#removeButtonElement.style.borderRadius = '6px';
        popupDiv.appendChild(this.#removeButtonElement);
        popupDiv.appendChild(document.createElement('br'))

        this.#smoothCheckboxElement.type = 'checkbox';
        this.#smoothCheckboxElement.name = 'smooth';
        this.#smoothCheckboxElement.checked = true;
        smoothLabel.innerHTML = 'Smooth altitude change';

        let tooltipIcon = document.createElement('i')
        tooltipIcon.className = 'fa-regular fa-circle-question';
        tooltipIcon.setAttribute('data-bs-toggle', 'tooltip');
        tooltipIcon.setAttribute('title', "Emulate how drone smoothly changes the altitude between two waypoints with the rate of 90 m altitude change per 1km of horizontal distance. When disabled, a sharp transition occurs.");
        let tooltip = new bootstrap.Tooltip(tooltipIcon);

        let supElement = document.createElement('sup');
        supElement.appendChild(tooltipIcon);
        smoothLabel.appendChild(supElement);

        smoothLabel.for = 'smooth';
        smoothLabel.style.paddingRight = '10px';
        this.#smoothCheckboxElement.addEventListener('change', this.#onSmoothCheckboxChange.bind(this));
        smoothDiv.style.color = 'blue'
        smoothLabel.style.color = 'black'
        smoothDiv.appendChild(smoothLabel);
        smoothDiv.appendChild(this.#smoothCheckboxElement);
        popupDiv.appendChild(smoothDiv)

        return popupDiv;
    }

    /**
    * markerMovedEvent method:
    *   Each time a node is moved, the incoming and outgoing edges are updated.
    */
    #markerMovedEvent(event) {
        this.#marker = event.target;
        this.#updateCircle();
        this.#updatePoint();
        for (let edge of this.#edgesList) {
            edge.update();
        }
    }

    /**
    * onSliderChange method:
    *   Everytime a node's altitude is changed, its edge is updated.
    *   If the incoming edge is smooth, then it is updated too.
    */
    #onSliderChange(values, handle) {
        this.#altitude = Math.floor(values[handle]);
        this.#updateCircle();

        // if the node has an edge going out of it, update it
        if (this.#hasEdge) {
            this.#edge.altitude = this.#altitude;
            this.#edge.altitudeManuallyChanged = true;
            this.#edge.update()
        }

        // if the node has an incoming edge that is smooth, update it as well
        if (this.#edgesList.length > 0 && this.#edgesList[0].nodesList[0].isSmooth) {
            this.#edgesList[0].update();
        }
    }

    /**
    * onSmoothCheckboxChange method:
    *   Updates a node's edge when its smooth checkbox is ticked.
    */
    #onSmoothCheckboxChange(event) {
        if (this.#hasEdge) {
            this.#isSmooth = this.#isSmooth == false ? true : false;
            this.#edge.update();
        }
    }

    /* ---------- Methods - public ---------- */

    hasEdge() {
        return this.#hasEdge;
    }

    hasNextCicle() {
        return this.#hasNextCicle;
    }

    /**
    * altitudeUpdatedGlobally method:
    *   When an edge's altitude is changed through the global altitude slider,
    *   then before updating the edge itself its source node has to be updated,
    *   that's its altitude, slider and circle.
    */
    altitudeUpdatedGlobally(altitude) {
        this.#altitude = altitude;
        this.#sliderElement.noUiSlider.set(altitude);
        this.#updateCircle();
    }

    /* ---------- Getters ---------- */

    get altitude() {
        return this.#altitude;
    }

    get nextCicle() {
        return this.#nextCicle;
    }

    get isSmooth() {
        return this.#isSmooth;
    }

    get marker() {
        return this.#marker;
    }

    get splitButtonElement() {
        return this.#splitButtonElement;
    }

    get removeButtonElement() {
        return this.#removeButtonElement;
    }

    get smoothCheckboxElement() {
        return this.#smoothCheckboxElement;
    }

    get sliderElement() {
        return this.#sliderElement;
    }

    get circle() {
        return this.#circle;
    }

    get circleArea() {
        return this.#circleArea;
    }

    get circleCoveredPopulation() {
        return this.#circleCoveredPopulation;
    }

    get point() {
        return this.#point;
    }

    get edge() {
        return this.#edge;
    }

    get edgesList() {
        return this.#edgesList;
    }

    get positionInList() {
        return this.#positionInList;
    }

    /* ---------- Setters ---------- */

    set edge(edge) {
        this.#edge = edge;
        this.#hasEdge = edge ? true : false;
    }

    set nextCicle(nextCicle) {
        this.#nextCicle = nextCicle;
        this.#hasNextCicle = nextCicle ? true : false;
    }

    set positionInList(positionInList) {
        this.#positionInList = positionInList;
    }

    set circleCoveredPopulation(population) {
        this.#circleCoveredPopulation = population;
    }

}

/**
* Edge class
*   An object that is added to a canvas when two or more Node's exist.
*   Its shape is a rectangle between two circles with a certain width.
*   Each time this rectangle is updated, statistics are recomputed for
*   affected population, length and area.
*/
class Edge {
    /* Instance variables */
    #altitude;
    #NMAC_radius;
    #NMAC_rate;
    #expectedNMAC;
    #NMAC_time;
    #NMAC_avg_speeds;
    #maxSquarePopulationDensity;
    #firstPartyDn;
    #firstPartyNMAC_rate;
    #expectedFirstPartyNMAC;
    #positionInList;
    #polyline;
    #polylineColor;
    #trapezoid;
    #groundBuffer;
    #airBuffer;
    #airBufferArea;
    #v_UA;
    #population;
    #groundArea;
    #length;
    #populationMultiplier;
    #nodesList;
    #extraLength;
    #altitudeManuallyChanged;

    constructor(source, destination, altitude, NMAC_radius, positionInList) {
        this.#altitude = altitude;
        this.#NMAC_radius = NMAC_radius;
        this.#NMAC_time = 0;
        this.#expectedNMAC = 0;
        this.#NMAC_avg_speeds = [];
        this.#maxSquarePopulationDensity = 0;
        this.#firstPartyDn = 0;
        this.#firstPartyNMAC_rate = 0;
        this.#expectedFirstPartyNMAC = 0;
        this.#v_UA = 8.34;
        this.#positionInList = positionInList;
        this.#population = 0;
        this.#groundArea = 0;
        this.#length = 0;
        this.#nodesList = [source, destination];
        this.#extraLength = 0;
        this.#altitudeManuallyChanged = false;

        // Running initialization methods
        this.#createPolyline();
    }

    /* ---------- Methods - private ---------- */

    #createPolyline() {
        let [source, destination] = this.#nodesList;
        let [sourceLatlng, destinationLatlng] = [Object.values(source.marker.getLatLng()),
                                                 Object.values(destination.marker.getLatLng())]
        this.#polylineColor = SEGMENT_COLOR;
        this.#polyline = new L.Polyline([sourceLatlng, destinationLatlng], {
            color: this.#polylineColor,
            weight: 20,
            opacity: 0.9,
            smoothFactor: 1,
        });
        source.edge = this;
        source.edgesList.push(this);
        destination.edgesList.push(this);
        this.#update();
    }

    /**
    * createExtendedDestination method:
    *   Given current edge destination, this method creates and returns a
    *   new destination node that is extended by `extraLength`.
    */
    #createExtendedDestination(source, destination) {
        let bearing = turf.bearing(source.point, destination.point);
        let extendedEndpoint = turf.destination(destination.point, this.#extraLength, bearing, {units: "meters"});
        return new Node(extendedEndpoint.geometry.coordinates.toReversed(), destination.altitude, -1);
    }

    #update() {
        let [source, destination] = this.#nodesList;
        this.#length = turf.distance(source.point, destination.point, {units: 'meters'});
        let newDestination = null;

        if (this.#extraLength > 0) {
            newDestination = this.#createExtendedDestination(source, destination);
        }

        let latlngList = [Object.values(source.marker.getLatLng()), Object.values(destination.marker.getLatLng())]
        this.#extraLength > 0 ? latlngList[1] = Object.values(newDestination.marker.getLatLng()) : {};

        this.#polyline.setLatLngs(latlngList);

        this.#airBuffer = turf.buffer(this.#polyline.toGeoJSON(), this.#NMAC_radius, {units: 'meters'});
        this.#airBufferArea = turf.area(this.#airBuffer, {units: "meters"});

        let altitudeChangeDistance = (Math.abs(destination.altitude - source.altitude) /
                                     Constants.altitudeChangeRationMToKm)*1000;

        let longEdge = this.#length >= altitudeChangeDistance && destination.altitude != source.altitude;

        if (source.isSmooth && longEdge) {
            let offset = (this.#length - altitudeChangeDistance) / this.#length;
            let trapezoidPoints = this.#findTrapezoidPoints(offset);
            let trapezoid = L.polygon(trapezoidPoints.map(function(point) {return point.geometry.coordinates.toReversed()}),
                {
                color: 'purple',
                weight: 6,
                opacity: 0.5,
                smoothFactor: 1
                });

                let union1 = turf.union(source.circle, trapezoid.toGeoJSON());
                let tempDestination = this.#extraLength > 0 ? newDestination : destination;
                let union2 = turf.union(union1, tempDestination.circle);
                let trapezoidBufferRadius = 0.001;  // because the trapezoid edge has full shape already
                this.#groundBuffer = turf.buffer(union2, trapezoidBufferRadius, {units: 'meters'});

        } else {
            this.#groundBuffer = turf.buffer(this.#polyline.toGeoJSON(), this.#altitude/2, {units: 'meters'});
        }

        this.#groundArea = turf.area(this.#groundBuffer, {units: 'meters'});
        this.#length += this.#extraLength;
    }

    #findTrapezoidPoints(offset) {
        let [source, destination] = this.#nodesList;
        let newDestination = null;

        let [sourcePoint, destinationPoint] = [source.point, destination.point]
        let bearing = turf.bearing(sourcePoint, destinationPoint);

        let sourcePoint1 = turf.destination(sourcePoint, source.altitude/2, (bearing+90)%180, {units: 'meters'});
        let sourcePoint2 = turf.destination(sourcePoint, -source.altitude/2, (bearing+90)%180, {units: 'meters'});

        let destinationPoint1 = turf.destination(destinationPoint, destination.altitude/2, (bearing+90)%180, {units: 'meters'});
        let destinationPoint2 = turf.destination(destinationPoint, -destination.altitude/2, (bearing+90)%180, {units: 'meters'});

        let offsetPoint1 = turf.destination(sourcePoint1, this.#length*offset, bearing, {units: 'meters'});
        let offsetPoint2 = turf.destination(sourcePoint2, this.#length*offset, bearing, {units: 'meters'});

        if (this.#extraLength > 0) {
            newDestination = this.#createExtendedDestination(source, destination);
            let newDestinationPoint1 = turf.destination(destinationPoint1, this.#extraLength, bearing, {units: 'meters'});
            let newDestinationPoint2 = turf.destination(destinationPoint2, this.#extraLength, bearing, {units: 'meters'});
            return [sourcePoint1, offsetPoint1, destinationPoint1, newDestinationPoint1, newDestinationPoint2,
                    destinationPoint2, offsetPoint2, sourcePoint2];
        }

        return [sourcePoint1, offsetPoint1, destinationPoint1, destinationPoint2, offsetPoint2, sourcePoint2];
    }

    #computeNMAC_rate(T_sum, v_GA_mean, partialProb) {
        let p_HC = (2 * (this.#NMAC_radius**2) * T_sum * Math.sqrt(this.#v_UA**2 + v_GA_mean**2)) /
                   (this.#NMAC_radius * this.#airBufferArea)

       let rate = p_HC * partialProb; // nmac/second
       this.#expectedNMAC = (this.#length / this.#v_UA) * rate;
       this.#NMAC_rate = rate * 60 * 60 * 1e6;
    }

    /* ---------- Methods - public ---------- */

    update() {
        this.#update();
    }

    /**
    * computeNMAC_rate method:
    *   Method that computes the NMAC rate per million hour given the total time spent by all GA
    *   in the intersected regions by the edge, the average GA speed in these regions
    *   as well as the partial probability of these regions, where the partial
    *   probability is p = p_VC * p_below * lambda_smt
    */
    computeNMAC_rate(T_sum, v_GA_mean, partialProb) {
        this.#computeNMAC_rate(T_sum, v_GA_mean, partialProb);
    }

    /**
    * computeFirstPartyNMAC_rate method:
    *   Method that computes the 1st-party NMAC rate (drone-to-drone collision)
    *   per million hour given the Dn sum (drone density multiplied by traffic density),
    *   the UAV speed, and the partial probability.
    */
    computeFirstPartyNMAC_rate(Dn_times_density, v_UA, partialProb) {
        // For drone-to-drone collision, both aircraft are moving at v_UA
        // so the relative speed is sqrt(2 * v_UA^2)
        let relativeSpeed = Math.sqrt(2 * v_UA**2);
        let p_HC = (2 * (this.#NMAC_radius**2) * Dn_times_density * relativeSpeed) /
                   (this.#NMAC_radius * this.#airBufferArea)

        let rate = p_HC * partialProb; // nmac/second
        this.#expectedFirstPartyNMAC = (this.#length / v_UA) * rate;
        this.#firstPartyNMAC_rate = rate * 60 * 60 * 1e6;
    }

    /* ---------- Getters ---------- */

    get population() {
        return this.#population;
    }

    get length() {
        return this.#length;
    }

    get groundArea() {
        return this.#groundArea;
    }

    get airBufferArea() {
        return this.#airBufferArea;
    }

    get polyline() {
        return this.#polyline;
    }

    get polylineColor() {
        return this.#polylineColor;
    }

    set polylineColor(color) {
        this.#polylineColor = color;
        this.#polyline.setStyle({ color: color });
    }

    get groundBuffer() {
        return this.#groundBuffer;
    }

    get airBuffer() {
        return this.#airBuffer;
    }

    get nodesList() {
        return this.#nodesList; // adding test comment
    }

    get altitude() {
        return this.#altitude;
    }

    get NMAC_radius() {
        return this.#NMAC_radius;
    }

    get NMAC_rate() {
        return this.#NMAC_rate;
    }

    get expectedNMAC() {
        return this.#expectedNMAC;
    }

    get NMAC_time() {
        return this.#NMAC_time;
    }

    get NMAC_avg_speeds() {
        return this.#NMAC_avg_speeds;
    }

    get maxSquarePopulationDensity() {
        return this.#maxSquarePopulationDensity;
    }

    get firstPartyDn() {
        return this.#firstPartyDn;
    }

    get firstPartyNMAC_rate() {
        return this.#firstPartyNMAC_rate;
    }

    get expectedFirstPartyNMAC() {
        return this.#expectedFirstPartyNMAC;
    }

    get positionInList() {
        return this.#positionInList;
    }

    get extraLength() {
        return this.#extraLength;
    }

    get altitudeManuallyChanged() {
        return this.#altitudeManuallyChanged;
    }

    /* ---------- Setters ---------- */

    set population(population) {
        this.#population = population;
    }

    set altitude(altitude) {
        this.#altitude = altitude;
    }

    set positionInList(positionInList) {
        this.#positionInList = positionInList;
    }

    set NMAC_radius(radius) {
        this.#NMAC_radius = radius;
    }

     set NMAC_time(time) {
        this.#NMAC_time = time;
    }

    set NMAC_avg_speeds(avg_speeds) {
        this.#NMAC_avg_speeds = avg_speeds;
    }

    set maxSquarePopulationDensity(population) {
        this.#maxSquarePopulationDensity = population;
    }

    set extraLength(length) {
        this.#extraLength = length;
    }

    set v_UA(v) {
        this.#v_UA = v;
    }

    set altitudeManuallyChanged(bool) {
        this.#altitudeManuallyChanged = bool;
    }

    set firstPartyDn(dn) {
        this.#firstPartyDn = dn;
    }

}

export { Node, Edge };

// ======================================= END OF FILE =======================================
