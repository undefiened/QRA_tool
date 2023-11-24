/**
* This file is used to test the correctness of the R-Tree data structure
* on a large example. Replace the script source to this file
* in `index.html` to run the examples.
* Make sure that the results are identical with the case when not using R-Tree.
* To run without R-Tree, set `this.#useRTree` to false.
* Uncomment the `onMapDoubleClick` method.
*/

import * as visualize from '../src/visualize.js';

console.log('Testing R-Tree')


// Example1:
let points = [
  [
    59.349295724534485,
    17.97843933105469
  ],
  [
    59.35314609904534,
    18.11851501464844
  ],
  [
    59.29289025573866,
    18.11851501464844
  ],
  [
    59.29779879535161,
    17.98393249511719
  ],
  [
    59.360207273417195,
    17.97843933105469
  ],
  [
    59.229014776819184,
    18.259277343750004
  ],
  [
    59.25008585920042,
    18.10958862304688
  ],
  [
    59.215663022907556,
    18.080749511718754
  ],
  [
    59.246926026807664,
    18.03886413574219
  ],
  [
    59.22339362241813,
    17.90084838867188
  ],
  [
    59.29534461405734,
    17.97225952148438
  ],
  [
    59.31181929289073,
    17.87338256835938
  ],
  [
    59.32968704671645,
    17.957153320312504
  ],
  [
    59.40945163031043,
    17.856216430664066
  ],
  [
    59.3632949933935,
    18.039550781250004
  ],
  [
    59.41434334604421,
    18.06838989257813
  ],
  [
    59.366793908532124,
    18.10478210449219
  ],
  [
    59.410849335471774,
    18.289489746093754
  ],
  [
    59.32828599367687,
    18.21670532226563
  ],
  [
    59.319878462265024,
    18.297729492187504
  ],
  [
    59.29885053314575,
    18.242797851562504
  ],
  [
    59.23955194546676,
    18.262710571289066
  ]
];
let vis = new visualize.Visualization();
points.map((point) => vis.onMapDoubleClick({'latlng': point}));