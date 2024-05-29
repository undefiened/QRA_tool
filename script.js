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
* `script.js` file that can be loaded in a HTML file.
*/

import { Visualization } from './src/visualize.js';

/**
 * main function
 *  Starts the application.
 */
function main() {
    let default_area = "stockholm_area";
    let visualization = new Visualization(default_area);

    $(document).ready(function() {
        $('input[name="area_switcher"]').on('change', function() {
            visualization.deinitializeMap();
            visualization = new Visualization(this.id);
        });
    });
}

main();





// ======================================= END OF FILE =======================================
