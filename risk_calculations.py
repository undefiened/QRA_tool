"""
risk_calculations.py
----------------
Implementation of the risk computations using the MAC model presented in
`Probability of low altitude midair collision between general aviation and unmanned aircraft.
/ La Cour-Harbo, Anders; Schiøler, Henrik.
In: Risk Analysis, Vol. 39, No. 11, 11.2019, p. 2499-2513.`

The data collected is for the duration of the first week of May 23. The radius of the UA 
and GA is considered as one constant value R_MAC. Likewise, the height of a UA and GA
is also considered as predefined constant values.
"""

import math

from traffic.core import Traffic
import shapely
import scipy

TRAFFIC_DATA = Traffic.from_file('./data/flights_data.parquet')
TRAFFIC_DATA = TRAFFIC_DATA.resample(rule='1s')
TRAFFIC_DATA = TRAFFIC_DATA.query('altitude < 3000').eval()

Z_MAX = 100  # Upper altitude bound for a UA.
P_BELOW = 0.05  # Probability of entering UA airspace, for all GA.
LAMBDA_SMT = 1  # Strategic and tactical mitigation, for all UA and GA.

# -- UA --
h_UA = 31  # height, meters
v_UA = 15  # speed, m/s

# -- GA --
h_GA = 31  # height, meters

# -- Time --
T_TOTAL = 7*24*60*60  # 7 days, seconds


def get_f_UA(loc=50, scale=5):
    """Returns altitude distribution for UA, which is normally distributed."""
    f_UA = scipy.stats.norm(loc=loc, scale=scale)
    return f_UA


def get_f_GA(loc=100, scale=50):
    """Returns altitude distributions for GA, which is a truncated normal distribution."""
    myclip_a = 0
    myclip_b = Z_MAX
    a, b = (myclip_a - loc) / scale, (myclip_b - loc) / scale
    f_GA = scipy.stats.truncnorm(a, b, loc=loc, scale=scale)
    return f_GA


def get_block_data(polygon_coords):
    """
    Given the latlng coordinates of a block (pixel) polygon, this function returns 
    the total time spent by all GA in the block as well as their average speed.
    """
    polygon = shapely.Polygon(polygon_coords)
    intersected_segment = TRAFFIC_DATA.inside_bbox(polygon)

    if intersected_segment:
        v_GA_mean = intersected_segment.data.groundspeed.mean() * 0.5144444  # knots/s to m/s
        T_airborne_GA = intersected_segment.data.timestamp.size
    else:
        v_GA_mean = 0
        T_airborne_GA = 0

    T = T_airborne_GA / T_TOTAL

    return T, v_GA_mean


def compute_prob_HC(R_MAC, T, v_GA_mean, G):
    """
    Computing the horizontal conflict rate.

    Parameters
    ----------
        R_MAC: float
            Radius of buffer around UA, which is used for computing NMAC instead of MAC.
        T: float
            Sum of total time spent by all GA in UA buffer area.
        v_GA_mean: float
            Average speed of all GA in the block.
        G: float
            Size of UA buffer area.
    
    Returns
    -------
        p_HC: float
            Horizontal conflict rate.
    """
    p_HC = (2*(R_MAC**2) * T * math.sqrt(v_UA**2 + v_GA_mean**2)) / (R_MAC * G)
    return p_HC


def compute_prob_VC(f_UA, F_GA):
    """
    Computing the vertical conditional probability.

    Parameters
    ----------
        f_UA: scipy.stats.distribution
            A distribution with pdf and cdf properties.
        F_GA: scipy.stats.distribution
            The CDF of a distribution.

    Returns
    -------
        p_VC: float
            Vertical conditional probability.
    
    """
    h = (h_UA + h_GA) / 2
    p_VC = scipy.integrate.quad(lambda x: f_UA.pdf(x) * (F_GA(x + h) - F_GA(x - h)), 0, Z_MAX)
    return p_VC[0]


def compute_risk_prob():
    """Risk computation. Horizontal conflict rate is omitted, as it will be computed later."""

    f_UA = get_f_UA()
    F_GA = get_f_GA().cdf
    
    # p_HC = compute_prob_HC()
    p_VC = compute_prob_VC(f_UA, F_GA)
    prob = p_VC * P_BELOW * LAMBDA_SMT

    return prob

# --------------------- END OF FILE ---------------------
