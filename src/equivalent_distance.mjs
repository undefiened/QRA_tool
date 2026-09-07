function equivalentDistance(probabilities, segmentDistances) {
    if (probabilities.length !== segmentDistances.length + 1) {
        throw new Error('equivalentDistance needs one more probability than segment distances.');
    }

    let exposure = 0;
    for (let index = 0; index < segmentDistances.length; index++) {
        let meanProbability = (readProbability(probabilities[index])
            + readProbability(probabilities[index + 1])) / 2;
        exposure += meanProbability * readDistance(segmentDistances[index]);
    }

    return exposure;
}

/**
* readProbability method:
*   Reads one route point's probability into [0, 1], missing readings as zero.
*/
function readProbability(value) {
    let probability = Number(value);
    if (!Number.isFinite(probability)) {
        return 0;
    }
    return Math.max(0, Math.min(1, probability));
}

/**
* readDistance method:
*   Reads one segment length, discarding negative and unusable values.
*/
function readDistance(value) {
    let distance = Number(value);
    if (!Number.isFinite(distance) || distance < 0) {
        return 0;
    }
    return distance;
}

export {equivalentDistance};
