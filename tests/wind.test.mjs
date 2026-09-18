import assert from 'node:assert/strict';
import test from 'node:test';
import {equivalentDistance, nearestWindHeightIndex, windCollisionValue} from '../src/helpers.js';

const heights = [5, 15, 25, 35];
const feature = {properties: {p_r5: [0.1, 0.4, 0, null], min_r5: [4, 12, null, null]}};

test('nearest height includes exact values, ties and out-of-range altitudes', () => {
    for (const [altitude, height] of [[5, 5], [10, 5], [11, 15], [24, 25], [30, 25], [31, 35], [200, 35], [0, 5]]) {
        assert.equal(heights[nearestWindHeightIndex(heights, altitude)], height);
    }
    assert.equal(nearestWindHeightIndex([15, 5], 10), 1);
    assert.equal(nearestWindHeightIndex([], 20), -1);
    assert.equal(nearestWindHeightIndex(heights, NaN), -1);
});

test('the same route reads the selected height in both wind modes', () => {
    for (const [mode, expected] of [['empirical', [0.1, 0.4]], ['scenario', [1, 0]]]) {
        const settings = {mode, resistance: 5, speedMps: 8, heightIndex: 0};
        const low = windCollisionValue(feature, settings);
        const high = windCollisionValue(feature, settings, 1);
        assert.deepEqual([low, high], expected);
        assert.equal(equivalentDistance([low, low], [100]), 100 * expected[0]);
        assert.equal(equivalentDistance([high, high], [100]), 100 * expected[1]);
        assert.equal(settings.heightIndex, 0, 'a segment override must not change the map height');
    }
});

test('missing data at a height differs from a valid cell with no wall intersection', () => {
    for (const mode of ['empirical', 'scenario']) {
        const settings = {mode, resistance: 5, speedMps: 20};
        assert.equal(windCollisionValue(feature, settings, 2), 0);
        assert.equal(windCollisionValue(feature, settings, 3), null);
        assert.equal(windCollisionValue(feature, settings, -1), null);
    }
});

test('fixed-speed thresholds include equality and preserve resistance selection', () => {
    const cell = {properties: {...feature.properties, p_r3: [0.8], min_r3: [2]}};
    const settings = {mode: 'scenario', resistance: 5, heightIndex: 1, speedMps: 12};
    assert.equal(windCollisionValue(cell, settings), 1);
    assert.equal(windCollisionValue(cell, {...settings, speedMps: 11.9}), 0);
    assert.equal(windCollisionValue(cell, {...settings, resistance: 3, heightIndex: 0, speedMps: 2}), 1);
});
