"""Analytical brachiopod model — Round 2 rewrite.

The model represents the shell in NORMALISED canonical coords
matching silhouette.canonicalise():

  X = lateral, range [-lat_half, +lat_half]
  Y = AP, range [-0.5, +0.5]; umbo at Y=-0.5, anterior margin at Y=+0.5
  Z = DV; dorsal (+) and ventral (-)

OUTLINE (the mantle margin in the commissure plane) is a piecewise
super-ellipse:
    For Y >= 0 (anterior):  (|x|/lat_half)^p_ant + (y/0.5)^p_ant = 1
    For Y <= 0 (posterior): (|x|/lat_half)^p_post + (|y|/0.5)^p_post = 1
p_post controls hinge straightness: 2 = ellipse (round back), high = flat
hinge (strophic). p_ant controls anterior commissure curvature.

SURFACE (each valve) is parameterised by (s, t) where:
    s ∈ [0, 1] is the normalised "age" (0 at umbo, 1 at mantle margin)
    t ∈ [0, 2π] is the polar angle from the dome apex
The apex sits at (X=0, Y=apex_y). Surface point at (s, t) is the
linear interpolation from the apex to the outline at the corresponding
t, with dome height z = z_max * (1 - s^k)^(1/k).

This guarantees:
  - z = z_max at apex (s=0)
  - z = 0 at the mantle margin (s=1, for any t)
  - The surface aligns with the outline by construction.

Sulcus/fold: applied as Gaussian perturbations on top of the dome
height, controlled by sulcus_depth and sulcus_sigma.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
import numpy as np


@dataclass
class Params:
    lat_half: float = 0.50
    p_ant: float = 2.0         # anterior outline exponent
    p_post: float = 2.0        # posterior outline exponent (higher → flatter hinge)
    apex_y: float = 0.0        # AP coord of dome apex (between -0.5 and +0.5)
    dorsal_z: float = 0.20     # dorsal apex height
    ventral_z: float = 0.13    # ventral apex depth
    dome_k: float = 2.5        # super-Gaussian exponent for radial dome
    sulcus_depth: float = 0.0  # fraction of z (0–1)
    sulcus_sigma: float = 0.35 # angular width of sulcus Gaussian (radians)

    def to_array(self):
        return np.array([self.lat_half, self.p_ant, self.p_post, self.apex_y,
                          self.dorsal_z, self.ventral_z, self.dome_k,
                          self.sulcus_depth, self.sulcus_sigma])

    @classmethod
    def from_array(cls, a):
        return cls(lat_half=float(a[0]), p_ant=float(a[1]), p_post=float(a[2]),
                    apex_y=float(a[3]), dorsal_z=float(a[4]),
                    ventral_z=float(a[5]), dome_k=float(a[6]),
                    sulcus_depth=float(a[7]), sulcus_sigma=float(a[8]))


# ---------------------------------------------------------------
# Closed outline (X, Y) via piecewise super-ellipse
# ---------------------------------------------------------------

def top_outline(p: Params, n_phi: int = 360):
    """Closed mantle margin in the commissure plane.

    Parameterised by a single angle t ∈ [0, 2π] around the centroid
    (0, 0). At each t, compute (x, y) on the super-ellipse — using
    p_ant when y >= 0, p_post when y < 0.
    """
    t = np.linspace(0, 2 * np.pi, n_phi, endpoint=False)
    cos_t = np.cos(t)
    sin_t = np.sin(t)
    # Pick exponent depending on hemisphere
    p_per = np.where(sin_t >= 0, p.p_ant, p.p_post)
    # Standard super-ellipse parametric form
    x = p.lat_half * np.sign(cos_t) * np.power(np.abs(cos_t), 2.0 / p_per)
    y = 0.5 * np.sign(sin_t) * np.power(np.abs(sin_t), 2.0 / p_per)

    # Sulcus indent on the anterior margin (pull midline inward toward umbo)
    if p.sulcus_depth > 0:
        # Distance-from-anterior-midline factor (1 at y=+0.5, x=0; fades elsewhere)
        anterior_factor = np.maximum(sin_t, 0) ** 2
        midline_factor = np.exp(-(np.arctan2(x, np.maximum(y, 1e-6)) ** 2)
                                 / (2 * p.sulcus_sigma ** 2))
        pull = p.sulcus_depth * 0.15 * anterior_factor * midline_factor
        # Pull radially toward the centroid
        r = np.hypot(x, y)
        nx = x / np.maximum(r, 1e-6)
        ny = y / np.maximum(r, 1e-6)
        x = x - pull * nx
        y = y - pull * ny
    return x, y


def outline_radius_polar(p: Params, theta_arr: np.ndarray):
    """Given polar angles `theta_arr` measured from the dome apex
    (X=0, Y=apex_y), return the radius from apex to the outline at
    each angle."""
    # Sample the outline densely, convert to polar from apex, interpolate.
    n_sample = 600
    t_sample = np.linspace(0, 2 * np.pi, n_sample, endpoint=False)
    cos_t = np.cos(t_sample)
    sin_t = np.sin(t_sample)
    p_per = np.where(sin_t >= 0, p.p_ant, p.p_post)
    x = p.lat_half * np.sign(cos_t) * np.power(np.abs(cos_t), 2.0 / p_per)
    y = 0.5 * np.sign(sin_t) * np.power(np.abs(sin_t), 2.0 / p_per)
    # Polar from apex
    dx = x - 0.0
    dy = y - p.apex_y
    r = np.hypot(dx, dy)
    theta = np.arctan2(dy, dx)
    # Sort by theta to make np.interp happy (it requires increasing xp)
    order = np.argsort(theta)
    theta_sorted = theta[order]
    r_sorted = r[order]
    # Wrap so we can interpolate across the -π/+π discontinuity
    theta_ext = np.concatenate([theta_sorted - 2 * np.pi,
                                  theta_sorted,
                                  theta_sorted + 2 * np.pi])
    r_ext = np.concatenate([r_sorted, r_sorted, r_sorted])
    # Normalise the query theta to [-π, π]
    tq = np.mod(theta_arr + np.pi, 2 * np.pi) - np.pi
    return np.interp(tq, theta_ext, r_ext)


# ---------------------------------------------------------------
# Surface: parameterised by (s, t) where s is normalised age (0 at
# apex, 1 at margin) and t is polar angle from the apex.
# ---------------------------------------------------------------

def surface(p: Params, n_s: int = 40, n_t: int = 120):
    s = np.linspace(0.0, 1.0, n_s)
    t = np.linspace(0, 2 * np.pi, n_t, endpoint=False)
    S, T = np.meshgrid(s, t, indexing="ij")
    R_margin = outline_radius_polar(p, T)
    R = S * R_margin
    X = R * np.cos(T)
    Y = p.apex_y + R * np.sin(T)
    # Dome height (super-Gaussian on s)
    k = max(p.dome_k, 1.01)
    h = np.power(np.maximum(1 - np.power(S, k), 0.0), 1.0 / k)
    # Sulcus / fold perturbation. Active near the anterior margin (high y,
    # near midline). Strength tapers to zero at apex.
    if p.sulcus_depth > 0:
        # Strongest near the anterior margin and along the midline.
        ant_factor = np.maximum(np.sin(T), 0) ** 1.5
        # Midline factor: distance from (X=0) at constant Y → small at midline
        mid_factor = np.exp(-(np.arctan2(X, np.maximum(Y - p.apex_y, 1e-6)) ** 2)
                              / (2 * p.sulcus_sigma ** 2))
        # Boost strength so it shows visibly in the front silhouette.
        sulcus_perturb = p.sulcus_depth * S ** 1.5 * ant_factor * mid_factor
    else:
        sulcus_perturb = 0
    # Dorsal FOLD adds a small ridge; ventral SULCUS pulls up (subtracts a lot).
    z_dorsal = p.dorsal_z * (h + 0.5 * sulcus_perturb)
    z_ventral = -p.ventral_z * (h - 1.2 * sulcus_perturb)
    z_ventral = np.minimum(z_ventral, 0.0)   # don't let ventral cross the commissure
    return X, Y, z_dorsal, z_ventral


# ---------------------------------------------------------------
# Model silhouettes
# ---------------------------------------------------------------

def model_silhouettes(p: Params, n_s: int = 80, n_t: int = 240, n_bins: int = 200):
    """Generate TOP/FRONT/SIDE silhouettes.

    TOP = explicit closed `top_outline` curve (clean, no envelope artifacts).
    FRONT = CROSS-SECTION near the anterior margin (y in [0.25, 0.5]).
            This is what a real anterior-view photo shows: the shell shape
            at the front, where sulcus / fold are visible. A full envelope
            would be dominated by the dome apex (which sits midway) and
            wash out the anterior detail.
    SIDE = lateral envelope: max/min z at each y across the full surface.
    """
    X, Y, Zd, Zv = surface(p, n_s=n_s, n_t=n_t)
    Xs = np.concatenate([X.flatten(), X.flatten()])
    Ys = np.concatenate([Y.flatten(), Y.flatten()])
    Zs = np.concatenate([Zd.flatten(), Zv.flatten()])

    # TOP: explicit outline
    ox, oy = top_outline(p)
    top = (ox, oy)

    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from silhouette import silhouette_envelope

    # FRONT: cross-section near the anterior margin.
    # Take surface points with y > 0.25 (anterior third) and project to (X, Z).
    # Also include the outline points at z=0 so the front view extends to the
    # full lateral extent at the commissure.
    anterior_mask = Ys > 0.25
    ox_arr = np.asarray(ox); oy_arr = np.asarray(oy)
    outline_anterior = oy_arr > 0.0  # anterior half of the outline
    front_x = np.concatenate([Xs[anterior_mask], ox_arr[outline_anterior]])
    front_z = np.concatenate([Zs[anterior_mask], np.zeros(outline_anterior.sum())])
    front_pts = np.stack([front_x, np.zeros_like(front_x), front_z], axis=1)
    front = silhouette_envelope(front_pts, 0, 2, n_bins)

    # SIDE: lateral envelope across full surface.
    ox_z_pts = np.stack([ox_arr, oy_arr, np.zeros_like(ox_arr)], axis=1)
    surface_pts = np.stack([Xs, Ys, Zs], axis=1)
    pts = np.concatenate([surface_pts, ox_z_pts], axis=0)
    side = silhouette_envelope(pts, 1, 2, n_bins)
    return top, front, side


if __name__ == "__main__":
    p = Params(lat_half=0.55, p_ant=2.2, p_post=4.0, apex_y=0.05,
                dorsal_z=0.22, ventral_z=0.14, dome_k=3.0,
                sulcus_depth=0.25, sulcus_sigma=0.35)
    top, front, side = model_silhouettes(p)
    print(f"top:   {len(top[0])} pts, x∈[{top[0].min():.3f},{top[0].max():.3f}], y∈[{top[1].min():.3f},{top[1].max():.3f}]")
    print(f"front: {len(front[0])} pts")
    print(f"side:  {len(side[0])} pts")
