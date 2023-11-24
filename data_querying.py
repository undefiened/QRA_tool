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