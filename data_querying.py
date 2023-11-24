"""
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
"""

"""
data_querying.py
----------------
Query flights data from the Opensky Network Database for 
selected airports during a period of time.
The querying for each airport is performed concurrently, effectively
reducing the processing time. The data for each airport is merged into
one object and saved into a file.
"""

import concurrent

from traffic.data import opensky

# ICAO names of the airports.
AIRPORTS = ["ESSB"]

def get_data(airport):
    """Queries flights data for one month for given airport, both departures and arrivals."""
    try:
        traffic_data = opensky.history(start="2023-05-01 00:00", stop="2023-05-08 00:00", airport=airport,)
    except:
        print("Error occurred! No data queried.")
    
    return traffic_data or 0


if __name__ == "__main__":
    traffics = []
    
    with concurrent.futures.ProcessPoolExecutor() as executor:
        results = executor.map(get_data, AIRPORTS)
        for res in results:
            traffics.append(res)
    
    all_traffic = sum(traffics)
    all_traffic = all_traffic.clean_invalid().assign_id().eval()
    try:
        all_traffic.to_parquet('flights_data.parquet')
    except:
        print('Error occurred! No data is saved to disc.')

# --------------------- END OF FILE ---------------------