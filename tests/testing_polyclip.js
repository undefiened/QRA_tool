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
* This file is used to test the correctness of `polyclip-ts` against `turfjs`
* on examples where `turfjs` fails. Replace the script source to this file
* in `index.html` to run the examples. To run an example, the other examples must
* be commented out. Also, the method `onMapDoubleClick` and parts of `#unionOfBuffers`
* need to be uncommented in Visualization class.
*/

import * as visualize from '../src/visualize.js';

console.log('in testing')

// Example1:
let points = [[59.32270309933541, 18.066802024841312], [59.326009159279295, 18.07581424713135],
                [59.32719138079497, 18.061995506286625], [59.32171778748144, 18.075428009033207]];
let vis = new visualize.Visualization();
points.map((point) => vis.onMapDoubleClick({'latlng': point}));

// Example2:
//let points2 = [[59.32581211836155, 18.053455352783207], [59.327322736202504, 18.076930046081547], [59.329117875886105,
//                18.06881904602051], [59.31961569339502, 18.07182312011719]];
//let vis2 = new visualize.Visualization();
//points2.map((point) => vis2.onMapDoubleClick({'latlng': point}));

// Example3
//let points3 = [[59.354896124925105, 17.90428161621094], [59.379387015928536, 18.006591796875004],
//                [59.39652012307085, 17.893981933593754], [59.341243530298314, 17.93174743652344]];
//let vis3 = new visualize.Visualization();
//points3.map((point) => vis3.onMapDoubleClick({'latlng': point}));


//// Example4:
//let points4 = [[59.35594609714902, 17.84317016601563], [59.388828778701935, 18.14323425292969],
//                [59.39652012307085, 17.893981933593754], [59.341243530298314, 17.93174743652344]];
//let vis4 = new visualize.Visualization();
//points4.map((point) => vis4.onMapDoubleClick({'latlng': point}));