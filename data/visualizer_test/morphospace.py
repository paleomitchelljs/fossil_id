#!/usr/bin/env python3
"""Analytical brachiopod morphospace prototype.

Implements the McGhee/Ubukata framework as a side-by-side prototype
(does NOT replace the current piecewise visualizer in render.js).

Components:
  1. McGhee (1980) allometric radial growth per valve:
        r(θ) = r0 · exp(C1·θ + C2·θ²)
  2. Ubukata (2003) hinge-anchored coordinate system with strophic
     width scaling S_x.
  3. Ubukata & Nakagawa (2000) wave-superposition sculpturing for
     ribs and sulcus/fold.

Each species is a parameter tuple. The same tuples can later be
serialised into the manifest for any taxon. Output: a Matplotlib
composite with three columns (analytical / parametric / real photos)
× three rows (Pseudoatrypa, Cyrtospirifer, Schizophoria).

Usage:
  MPLCONFIGDIR=$TMPDIR/mpl python3 morphospace.py
"""
from __future__ import annotations
import os
import json
import math
import subprocess
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render import draw_svg

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))


# --------------------------------------------------------------------
# McGhee/Ubukata analytical shell
# --------------------------------------------------------------------

class AnalyticShell:
    """One brachiopod shell described by the analytical framework.

    Parameters
    ----------
    dorsal, ventral : dict
        Per-valve McGhee growth coefficients (r0, C1, C2) plus the
        per-valve maximum inflation z_max (px). The valve surface in 3D
        is parameterized by (theta, phi) where theta is the ontogenetic
        age in [0, theta_max] and phi is the angular position around the
        mantle perimeter in [-pi/2, pi/2].
    S_x : float
        Lateral hinge scaling (Ubukata 2003). 1.0 = circular outline;
        >1 stretches the cardinal extremities into wings.
    dome_p : float
        Exponent on the z-profile along ontogeny. p=2 is a parabolic
        dome (apex at umbo, drops to 0 at margin).
    rib_count, rib_amp : float
        Harmonic wave parameters for ribs (Ubukata & Nakagawa 2000).
    sulcus_depth, sulcus_sigma : float
        Gaussian sulcus parameters along the midline (phi=0).
    """

    def __init__(self, **kw):
        self.theta_max = kw.get("theta_max", 1.0)
        # Defaults sized so r(theta_max) ≈ 80 px (half a 200×200 canvas).
        self.dorsal = dict(r0=1.8, C1=4.0, C2=-0.30, z_max=46)
        self.ventral = dict(r0=1.8, C1=4.0, C2=-0.30, z_max=26)
        if "dorsal" in kw:
            self.dorsal.update(kw["dorsal"])
        if "ventral" in kw:
            self.ventral.update(kw["ventral"])
        self.S_x = kw.get("S_x", 1.0)
        self.dome_p = kw.get("dome_p", 2.0)
        self.rib_count = kw.get("rib_count", 0)
        self.rib_amp = kw.get("rib_amp", 0.0)
        self.sulcus_depth = kw.get("sulcus_depth", 0.0)
        self.sulcus_sigma = kw.get("sulcus_sigma", 0.30)
        self.apex_shift = kw.get("apex_shift", 0.0)  # 0..0.6, posterior shift

    # McGhee radial growth ---------------------------------------------------

    def r_at(self, theta: np.ndarray, valve: str) -> np.ndarray:
        v = self.dorsal if valve == "dorsal" else self.ventral
        return v["r0"] * np.exp(v["C1"] * theta + v["C2"] * theta**2)

    # Surface sampling -------------------------------------------------------

    def surface(self, valve: str, n_theta: int = 60, n_phi: int = 140):
        """Sample one valve surface on a (theta, phi) grid. Returns
        meshed arrays X, Y, Z (each n_theta × n_phi).

        The surface is a TRUE DOME: the umbo is a single point at z = z_max
        (where R(0) is small), and the margin lies in the commissure plane
        z = 0. The dome height depends only on R(theta) — older shell has
        higher z because more material accumulated."""
        v = self.dorsal if valve == "dorsal" else self.ventral
        thetas = np.linspace(0.0, self.theta_max, n_theta)
        phis = np.linspace(-np.pi / 2, np.pi / 2, n_phi)
        TH, PH = np.meshgrid(thetas, phis, indexing="ij")

        R = v["r0"] * np.exp(v["C1"] * TH + v["C2"] * TH**2)
        R_max = v["r0"] * np.exp(v["C1"] * self.theta_max + v["C2"] * self.theta_max**2)

        # Lateral hinge scaling (Ubukata): stretch toward cardinals only.
        S_x_factor = 1.0 + (self.S_x - 1.0) * np.abs(np.sin(PH))
        X = R * np.sin(PH) * S_x_factor
        # Y in [0, R_max] — anterior at +y, cardinals (PH=±π/2) at y = 0.
        Y = R * np.cos(PH)

        # Dome height: bell-curve in R/R_max so the peak sits midway
        # between the umbo and the anterior margin (typical of biconvex
        # brachiopods). z is zero at R=0 (umbo) and R=R_max (margin) and
        # peaks at R = R_max·apex_pos. apex_pos=0.4 puts the dome peak
        # slightly posterior of mid-shell; 0.6 puts it slightly anterior.
        R_frac = R / max(R_max, 1e-6)
        apex_pos = 0.5 - 0.3 * self.apex_shift  # 0.5 default, smaller for pyramidal
        # Use a Gaussian centred at apex_pos with width adjusted by dome_p:
        sigma = 0.35 / max(self.dome_p, 0.5)
        Z = v["z_max"] * np.exp(-((R_frac - apex_pos) ** 2) / (2 * sigma ** 2))
        # Ensure the margin is at z=0 (small offset cleanup)
        Z = Z - v["z_max"] * np.exp(-((1.0 - apex_pos) ** 2) / (2 * sigma ** 2))
        Z = np.maximum(Z, 0)

        # Sulcus on the dorsal valve (Gaussian along midline). Strength
        # ramps up with theta — sulcus is most pronounced near the margin.
        # The sulcus DEPRESSES z toward the commissure on the dorsal valve.
        sulcus_strength = R_frac ** 2
        sulcus_pattern = np.exp(-PH ** 2 / (2 * self.sulcus_sigma ** 2))
        if valve == "dorsal":
            Z = Z - self.sulcus_depth * sulcus_strength * sulcus_pattern
        else:
            Z = Z + self.sulcus_depth * sulcus_strength * sulcus_pattern

        # Ribs (periodic in phi, amplitude grows with theta).
        if self.rib_count > 0 and self.rib_amp > 0:
            rib_strength = R_frac ** 1.5
            rib_pattern = np.cos(self.rib_count * PH)
            sign = 1 if valve == "dorsal" else -1
            Z = Z + sign * self.rib_amp * rib_strength * rib_pattern * 0.5

        # Ventral valve sits on the -z side of the commissure plane.
        if valve == "ventral":
            Z = -Z

        return X, Y, Z

    # Margin curve (theta=theta_max) — useful for the TOP outline -----------

    def margin(self, valve: str, n_phi: int = 240):
        v = self.dorsal if valve == "dorsal" else self.ventral
        phi = np.linspace(-np.pi / 2, np.pi / 2, n_phi)
        r = v["r0"] * np.exp(v["C1"] * self.theta_max + v["C2"] * self.theta_max ** 2)
        S_x_factor = 1.0 + (self.S_x - 1.0) * np.abs(np.sin(phi))
        x = r * np.sin(phi) * S_x_factor
        y = r * np.cos(phi)
        # z at the margin = 0 baseline + sculpting
        z = np.zeros_like(phi)
        # Sulcus pulls z DOWN at midline on dorsal (it's a depression in
        # the dorsal exterior, visible as a notch in the anterior commissure)
        sulcus_strength = 1.0  # we're at theta_max
        sulcus_pattern = np.exp(-phi ** 2 / (2 * self.sulcus_sigma ** 2))
        if valve == "dorsal":
            z = z - self.sulcus_depth * sulcus_strength * sulcus_pattern
        # Ribs perturb the margin in z (creating the commissure zigzag)
        if self.rib_count > 0 and self.rib_amp > 0:
            sign = 1 if valve == "dorsal" else -1
            z = z + sign * self.rib_amp * np.cos(self.rib_count * phi) * 0.5
        return x, y, z


# --------------------------------------------------------------------
# Silhouette extraction
# --------------------------------------------------------------------

def silhouette_xy(shell: AnalyticShell):
    """Top-view silhouette: union of both mantle margins at theta_max.
    For most brachiopods both valves share the same margin (commissure),
    so we return the dorsal margin."""
    x, y, _ = shell.margin("dorsal")
    # Close the curve back to itself across the hinge line
    return np.concatenate([x, x[::-1] * 0]), np.concatenate([y, y[::-1] * 0])


def silhouette_envelope(shell: AnalyticShell, project: str):
    """Project the shell surface to a 2-D plane and compute the silhouette
    envelope by binning.

    project: 'xz' (front view) or 'yz' (side view).
    """
    xd, yd, zd = shell.surface("dorsal")
    xv, yv, zv = shell.surface("ventral")
    if project == "xz":
        a = np.concatenate([xd.flatten(), xv.flatten()])
        b = np.concatenate([zd.flatten(), zv.flatten()])
    elif project == "yz":
        a = np.concatenate([yd.flatten(), yv.flatten()])
        b = np.concatenate([zd.flatten(), zv.flatten()])
    else:
        raise ValueError(project)

    # Bin by 'a' and find min/max 'b' per bin — the envelope.
    n_bins = 90
    a_min, a_max = a.min(), a.max()
    edges = np.linspace(a_min, a_max, n_bins + 1)
    centers = 0.5 * (edges[:-1] + edges[1:])
    upper = np.full(n_bins, -np.inf)
    lower = np.full(n_bins, np.inf)
    idx = np.searchsorted(edges[1:-1], a)
    for i, j in enumerate(idx):
        if b[i] > upper[j]:
            upper[j] = b[i]
        if b[i] < lower[j]:
            lower[j] = b[i]
    valid = np.isfinite(upper) & np.isfinite(lower)
    centers = centers[valid]
    upper = upper[valid]
    lower = lower[valid]
    # Close the polygon: forward along upper, back along lower
    poly_a = np.concatenate([centers, centers[::-1]])
    poly_b = np.concatenate([upper, lower[::-1]])
    return poly_a, poly_b


# --------------------------------------------------------------------
# Species parameter sets — tuned by hand against real photographs.
# Future work: fit (r0, C1, C2, S_x, dome_p, sulcus_depth) to digitised
# specimen outlines instead of hand-tuning.
# --------------------------------------------------------------------

# r0 is chosen so that r(theta_max=1) = r0 · exp(C1+C2) ≈ 80 px (half the
# nominal 200×200 canvas).  C1 / C2 control growth rate vs. age; setting
# C2 < 0 makes the late-stage shell expansion slow (a more rounded outline).
SPECIES = {
    "pseudoatrypa": dict(
        name="Pseudoatrypa devoniana",
        shell=AnalyticShell(
            # r(1) = 1.8 · exp(4.2 - 0.4) = 1.8 · 44.7 ≈ 80
            dorsal={"r0": 1.8, "C1": 4.2, "C2": -0.40, "z_max": 50},
            ventral={"r0": 1.8, "C1": 4.2, "C2": -0.40, "z_max": 28},
            S_x=1.05,            # nearly circular, no hinge stretch
            dome_p=2.0,
            rib_count=22,
            rib_amp=2.4,
            sulcus_depth=10.0,
            sulcus_sigma=0.35,
            apex_shift=0.05,
        ),
        photos=[
            "images/pseudoatrypa/rockford/devoniana_nathan_01.jpg",
            "images/pseudoatrypa/rockford/devoniana_dave_01.jpg",
            "images/pseudoatrypa/rockford/devoniana_daycopper_01.png",
        ],
    ),
    "cyrtospirifer": dict(
        name="Cyrtospirifer whitneyi",
        shell=AnalyticShell(
            # r(1) = 1.7 · exp(4.3 - 0.45) ≈ 80
            dorsal={"r0": 1.7, "C1": 4.30, "C2": -0.45, "z_max": 52},
            ventral={"r0": 1.7, "C1": 4.30, "C2": -0.45, "z_max": 28},
            S_x=1.85,            # wide alate hinge
            dome_p=1.8,
            rib_count=28,
            rib_amp=1.8,
            sulcus_depth=22.0,
            sulcus_sigma=0.28,
            apex_shift=0.18,
        ),
        photos=[
            "images/cyrtospirifer/rockford/whitneyi_nathan_01.jpg",
            "images/cyrtospirifer/rockford/whitneyi_dave_01.jpg",
            "images/cyrtospirifer/rockford/whitneyi_jsm_01.png",
        ],
    ),
    "schizophoria": dict(
        name="Schizophoria iowensis",
        shell=AnalyticShell(
            # r(1) = 2.0 · exp(4.0 - 0.35) ≈ 78
            dorsal={"r0": 2.0, "C1": 4.00, "C2": -0.35, "z_max": 44},
            ventral={"r0": 2.0, "C1": 4.00, "C2": -0.35, "z_max": 24},
            S_x=1.15,            # very mild hinge widening
            dome_p=2.0,
            rib_count=32,
            rib_amp=1.0,
            sulcus_depth=6.0,
            sulcus_sigma=0.40,
            apex_shift=0.10,
        ),
        photos=[
            "images/schizophoria/rockford/iowensis_nathan_01.jpg",
            "images/schizophoria/rockford/iowensis_dave_01.jpg",
            "images/schizophoria/rockford/iowensis_stigallrode_01.png",
        ],
    ),
}


# --------------------------------------------------------------------
# Rendering — each species gets three rows (its 3 analytical views,
# its 3 parametric views, its 3 photos). Three species total → 9 rows.
# Actually 3 columns × 3 row blocks per species, plus 3 photo columns.
# We lay it out as: rows = species (3), cols = 9 (3 views × 3 sources).
# --------------------------------------------------------------------

def regen_parametric_svgs():
    """Run gen.cjs so the parametric svgs/ directory is fresh."""
    subprocess.run(
        ["node", os.path.join(HERE, "gen.cjs")],
        check=True, capture_output=True,
    )


def plot_analytic_top(ax, shell: AnalyticShell):
    # Mantle margin curve at theta_max (front arc from cardinal to cardinal)
    x, y, _ = shell.margin("dorsal")
    # Close with the hinge segment (straight line connecting the two cardinals)
    x_close = np.concatenate([x, [x[0]]])
    y_close = np.concatenate([y, [y[0]]])
    ax.fill(x_close, y_close, facecolor="#fffef7", edgecolor="black", linewidth=2.0)
    # Concentric growth lines = mantle margin at earlier ages (smaller theta).
    # In the McGhee model, earlier margin curves are r(theta_old) at the same
    # phi sweep. We sample a few ages and plot each as a concentric arc.
    for theta in [0.25, 0.45, 0.65, 0.85]:
        phi = np.linspace(-np.pi / 2, np.pi / 2, 200)
        r = shell.r_at(theta, "dorsal")
        S_x_factor = 1.0 + (shell.S_x - 1.0) * np.abs(np.sin(phi))
        xs = r * np.sin(phi) * S_x_factor
        ys = r * np.cos(phi)
        ax.plot(xs, ys, color="#888", linewidth=0.7)
    ax.set_aspect("equal")
    ax.invert_yaxis()  # so the anterior (high +y in data) ends up at the bottom
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)


def plot_analytic_front(ax, shell: AnalyticShell):
    # Project the surface to (x, z). Dorsal (positive z) is naturally at the
    # top of the plot — no axis inversion. The sulcus notch on the ventral
    # valve appears as an upward indent of the lower outline at midline.
    a, b = silhouette_envelope(shell, "xz")
    ax.fill(a, b, facecolor="#fffef7", edgecolor="black", linewidth=2.0)
    # Draw the commissure line for reference
    a_range = (a.min(), a.max())
    ax.plot(list(a_range), [0, 0], color="#666", linewidth=0.8, linestyle="--")
    ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)


def plot_analytic_side(ax, shell: AnalyticShell):
    # Project the surface to (y, z). Anterior (positive y) at the right;
    # dorsal (positive z) at the top — no inversion.
    a, b = silhouette_envelope(shell, "yz")
    ax.fill(a, b, facecolor="#fffef7", edgecolor="black", linewidth=2.0)
    ax.set_aspect("equal")
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)


def plot_photo(ax, photo_relpath):
    full = os.path.join(ROOT, photo_relpath)
    if os.path.exists(full):
        ax.imshow(Image.open(full))
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)


def plot_parametric(ax, svg_path):
    ax.set_facecolor("#fffef7")
    draw_svg(ax, svg_path)


def main():
    regen_parametric_svgs()
    svg_dir = os.path.join(HERE, "svgs")
    n_rows = len(SPECIES)
    # 9 columns: analytic-top, analytic-front, analytic-side,
    #            param-top,   param-front,   param-side,
    #            photo1, photo2, photo3.
    n_cols = 9
    fig, axes = plt.subplots(n_rows, n_cols,
                             figsize=(2.2 * n_cols, 2.6 * n_rows),
                             gridspec_kw=dict(wspace=0.10, hspace=0.30))
    col_titles = ["ANALYTIC top", "ANALYTIC front", "ANALYTIC side",
                  "PARAM top",    "PARAM front",    "PARAM side",
                  "PHOTO 1",      "PHOTO 2",        "PHOTO 3"]
    for j, t in enumerate(col_titles):
        axes[0][j].set_title(t, fontsize=9, color="#6b3410")

    for r, (key, spec) in enumerate(SPECIES.items()):
        shell = spec["shell"]
        plot_analytic_top(axes[r][0], shell)
        plot_analytic_front(axes[r][1], shell)
        plot_analytic_side(axes[r][2], shell)
        # Parametric SVGs (from gen.cjs)
        species_id = ("pseudoatrypa_devoniana" if key == "pseudoatrypa"
                      else "cyrtospirifer_whitneyi" if key == "cyrtospirifer"
                      else "schizophoria_iowensis")
        for j, view in enumerate(["top", "front", "side"]):
            svg_path = os.path.join(svg_dir, f"{species_id}_{view}.svg")
            plot_parametric(axes[r][3 + j], svg_path)
        for j, photo in enumerate(spec["photos"][:3]):
            plot_photo(axes[r][6 + j], photo)
        axes[r][0].set_ylabel(spec["name"], fontsize=11, fontweight="bold",
                              color="#6b3410", rotation=0, labelpad=90,
                              ha="right", va="center")

    out = os.path.join(HERE, "morphospace_compare.png")
    fig.savefig(out, dpi=110, bbox_inches="tight", facecolor="#f5f1e8")
    print("Wrote", out)


if __name__ == "__main__":
    main()
