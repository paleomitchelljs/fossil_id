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

    # Arc-length parameterization --------------------------------------------
    # The mantle margin in (X, Y) doesn't have uniform arc-length per unit
    # of phi when S_x > 1 — wingtips traverse more arc length per dphi than
    # the anterior midline. To keep ribs evenly spaced around the perimeter
    # (instead of stretched at the wings), we parameterize ribs by normalized
    # arc length s(phi) ∈ [0, 1] rather than by phi directly.

    def _arc_length_lookup(self, n_phi=400):
        """Compute (phi, s_norm) lookup table for the anterior arc."""
        phi = np.linspace(-np.pi / 2, np.pi / 2, n_phi)
        # Use theta_max — shape is identical at all theta, just scaled.
        r = 1.0  # normalized; only the SHAPE matters for arc-length ratios
        S_x_factor = 1.0 + (self.S_x - 1.0) * np.abs(np.sin(phi))
        x = r * np.sin(phi) * S_x_factor
        y = r * np.cos(phi)
        ds = np.hypot(np.diff(x), np.diff(y))
        s = np.concatenate([[0], np.cumsum(ds)])
        s_norm = s / s[-1]   # [0, 1]
        return phi, s_norm

    def arc_length_at(self, phi):
        """Map phi → normalized arc length s_norm ∈ [0, 1] along the
        anterior margin. s_norm = 0 at φ=-π/2 (left cardinal), 0.5 at φ=0
        (anterior midline), 1 at φ=+π/2 (right cardinal)."""
        phi_lut, s_lut = self._arc_length_lookup()
        return np.interp(phi, phi_lut, s_lut)

    # Surface sampling -------------------------------------------------------

    def surface(self, valve: str, n_theta: int = 60, n_phi: int = 140):
        """Sample one valve surface on a (theta, phi) grid. Returns
        meshed arrays X, Y, Z (each n_theta × n_phi).

        Dome model:
            z(θ, φ) = z_max · sin(π · θ/θ_max) · cos(φ)^p · taper_correction

        Key properties:
          * z = 0 at θ = 0 (umbo) — so older shell sits ON the commissure
            plane near the umbo, not raised. (A small umbo bulge can be
            added separately if needed for prominent-beak forms.)
          * z = 0 at θ = θ_max (margin) — silhouette tapers cleanly to the
            mantle edge, no flat-top/vertical-wall artifact.
          * z = 0 at φ = ±π/2 (cardinals) — the lateral extremities lie
            on the commissure, so growth lines on the surface taper to
            zero height as they approach the hinge.
          * z = z_max at (θ_apex, φ = 0) — a SINGLE point apex, midway
            between umbo and anterior margin (or shifted posteriorly for
            pyramidal forms via apex_shift).

        This replaces the previous z = f(R/R_max) model, which made the
        apex a ridge along a contour of constant age — yielding the
        boxy "telescoping cup" silhouette artifacts.
        """
        v = self.dorsal if valve == "dorsal" else self.ventral
        thetas = np.linspace(0.0, self.theta_max, n_theta)
        phis = np.linspace(-np.pi / 2, np.pi / 2, n_phi)
        TH, PH = np.meshgrid(thetas, phis, indexing="ij")

        R = v["r0"] * np.exp(v["C1"] * TH + v["C2"] * TH**2)
        R_max = v["r0"] * np.exp(v["C1"] * self.theta_max + v["C2"] * self.theta_max**2)

        # Lateral hinge scaling (Ubukata): stretch toward cardinals only.
        S_x_factor = 1.0 + (self.S_x - 1.0) * np.abs(np.sin(PH))
        X = R * np.sin(PH) * S_x_factor
        Y = R * np.cos(PH)

        # Single-point apex dome.
        # apex_shift in [0, 1) moves the apex posteriorly (toward the
        # umbo) so pyramidal forms get a higher back and an extended
        # anterior taper.
        apex_pos = 0.5 - 0.3 * self.apex_shift   # 0.5 default → midway
        # AP profile: zero at theta=0 and theta=theta_max; peak at apex_pos
        # Use a power of sin so we can shift the peak: sin(π·(θ/θ_max)) with
        # exponentiation skewed toward apex_pos via remapping.
        t = TH / self.theta_max
        # Skew t so the peak of sin(π·t_skewed) lies at t = apex_pos
        t_skewed = np.where(
            t < apex_pos,
            0.5 * t / apex_pos,
            0.5 + 0.5 * (t - apex_pos) / (1.0 - apex_pos)
        )
        ap_profile = np.sin(np.pi * t_skewed)
        # Lateral profile: peak at phi=0, zero at phi=±π/2.
        # The exponent p controls how concentrated the dome is along the
        # midline (larger p → narrower ridge along anterior axis).
        p = self.dome_p
        lateral_profile = np.maximum(np.cos(PH), 0) ** p
        Z = v["z_max"] * ap_profile * lateral_profile

        # Commissure undulation (atrypid / spiriferid convention: dorsal
        # FOLD + ventral SULCUS, both raising the commissure at midline):
        #   - Dorsal valve: small ridge added at midline (z increases)
        #   - Ventral valve: depression in the EXTERIOR (z decreases pre-
        #     negation, so the post-negation ventral z is LESS negative
        #     at midline — the ventral exterior pulls UP toward the
        #     commissure).
        # Strength tapers to zero at the umbo (R/R_max → 0).
        R_frac = R / max(R_max, 1e-6)
        sulcus_strength = R_frac ** 2
        sulcus_pattern = np.exp(-PH ** 2 / (2 * self.sulcus_sigma ** 2))
        if valve == "dorsal":
            # Dorsal fold raises z by ~40% of the sulcus amplitude
            Z = Z + self.sulcus_depth * 0.40 * sulcus_strength * sulcus_pattern
        else:
            # Ventral sulcus pulls the exterior up (pre-negation z decreases)
            Z = Z - self.sulcus_depth * sulcus_strength * sulcus_pattern

        # Ribs (periodic in ARC LENGTH along the perimeter, NOT in phi).
        # cos(N · φ) would crowd ribs near the anterior midline (where dphi
        # carries little arc length) and stretch them at the wings (where
        # dphi carries a lot). Using arc length keeps spacing uniform.
        if self.rib_count > 0 and self.rib_amp > 0:
            rib_strength = R_frac ** 1.5
            phi_lut, s_lut = self._arc_length_lookup()
            S = np.interp(PH, phi_lut, s_lut)         # arc length along anterior margin [0, 1]
            rib_pattern = np.cos(2 * np.pi * self.rib_count * S)
            sign = 1 if valve == "dorsal" else -1
            Z = Z + sign * self.rib_amp * rib_strength * rib_pattern * 0.5

        # Clamp dorsal to non-negative, ventral after sign flip.
        if valve == "ventral":
            Z = -np.maximum(Z, 0)
        else:
            Z = np.maximum(Z, 0)

        return X, Y, Z

    # Margin curve (theta=theta_max) — useful for the TOP outline -----------

    def margin(self, valve: str, n_phi: int = 240):
        """Return the FRONT arc of the mantle margin: phi in [-pi/2, pi/2]."""
        v = self.dorsal if valve == "dorsal" else self.ventral
        phi = np.linspace(-np.pi / 2, np.pi / 2, n_phi)
        r = v["r0"] * np.exp(v["C1"] * self.theta_max + v["C2"] * self.theta_max ** 2)
        S_x_factor = 1.0 + (self.S_x - 1.0) * np.abs(np.sin(phi))
        x = r * np.sin(phi) * S_x_factor
        y = r * np.cos(phi)
        z = np.zeros_like(phi)
        sulcus_pattern = np.exp(-phi ** 2 / (2 * self.sulcus_sigma ** 2))
        if valve == "dorsal":
            z = z - self.sulcus_depth * sulcus_pattern
        if self.rib_count > 0 and self.rib_amp > 0:
            sign = 1 if valve == "dorsal" else -1
            z = z + sign * self.rib_amp * np.cos(self.rib_count * phi) * 0.5
        return x, y, z

    def is_strophic(self) -> bool:
        return self.S_x > 1.20

    def closed_outline(self, valve: str = "dorsal", n_phi: int = 240,
                       include_features: bool = True):
        """Return the full closed mantle outline (x, y) in the commissure plane.

        Anterior arc spans phi in [-pi/2, pi/2]; the posterior is closed
        through the umbo. For strophic shells the back is a near-straight
        hinge line with a small umbonal bump; for astrophic shells the back
        curves smoothly to a deeper umbo extension.

        If include_features is True, the anterior arc is perturbed by:
          - Rib scallops: a high-frequency radial bump indexed by NORMALIZED
            ARC LENGTH along the margin (uniform spacing across wide hinges
            instead of stretched at the wings).
          - Sulcus indent: a localized inward pull at the midline of the
            anterior arc (the sulcus on the dorsal valve pulls the margin
            toward the umbo).
        """
        v = self.dorsal if valve == "dorsal" else self.ventral
        r = v["r0"] * np.exp(v["C1"] * self.theta_max + v["C2"] * self.theta_max ** 2)

        # --- Anterior arc ---
        n_front = (n_phi * 2) // 3
        phi_f = np.linspace(-np.pi / 2, np.pi / 2, n_front)
        S_x_f = 1.0 + (self.S_x - 1.0) * np.abs(np.sin(phi_f))
        x_f = r * np.sin(phi_f) * S_x_f
        y_f = r * np.cos(phi_f)

        if include_features:
            # Outward normal at each anterior-arc point (approx. radial from origin).
            norm = np.hypot(x_f, y_f)
            nx = x_f / np.maximum(norm, 1e-6)
            ny = y_f / np.maximum(norm, 1e-6)

            # Rib scallops: indexed by normalized arc length along the anterior
            # margin so spacing stays uniform from cardinal to cardinal.
            if self.rib_count > 0 and self.rib_amp > 0:
                phi_lut, s_lut = self._arc_length_lookup()
                S = np.interp(phi_f, phi_lut, s_lut)
                # Amplitude tapers to zero at the cardinals so ribs don't
                # spill into the hinge area.
                lateral_taper = np.cos(phi_f) ** 0.5
                rib_bump = self.rib_amp * np.cos(2 * np.pi * self.rib_count * S) * lateral_taper
                x_f = x_f + rib_bump * nx
                y_f = y_f + rib_bump * ny

            # Sulcus indent on the dorsal valve — pulls the anterior margin
            # inward at the midline (toward the umbo).
            if valve == "dorsal" and self.sulcus_depth > 0:
                sulcus_pull = self.sulcus_depth * 0.35 * np.exp(
                    -phi_f ** 2 / (2 * self.sulcus_sigma ** 2)
                )
                x_f = x_f - sulcus_pull * nx
                y_f = y_f - sulcus_pull * ny

        # --- Posterior arc ---
        n_back = n_phi - n_front
        phi_b = np.linspace(0, np.pi, n_back)
        if self.is_strophic():
            back_extent = 0.06 * r
        else:
            back_extent = 0.30 * r
        S_x_b = 1.0 + (self.S_x - 1.0) * np.abs(np.cos(phi_b))
        x_b = r * np.cos(phi_b) * S_x_b
        y_b = -back_extent * np.sin(phi_b)

        x = np.concatenate([x_f, x_b])
        y = np.concatenate([y_f, y_b])
        return x, y


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
            dome_p=1.8,          # mid-range bell, mild lateral taper
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
            dome_p=0.7,          # broad plateau — wings stay inflated until tips
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
            dome_p=1.6,
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


# Fixed canvas limits so all analytical subplots use the same scale —
# matches the 200 px viewBox used by the parametric SVGs.
CANVAS = 110  # px half-extent; total view spans 220 px


def _frame(ax, xlim=None, ylim=None):
    ax.set_aspect("equal")
    ax.set_xlim(xlim if xlim else (-CANVAS, CANVAS))
    ax.set_ylim(ylim if ylim else (-CANVAS, CANVAS))
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)


def plot_analytic_top(ax, shell: AnalyticShell):
    """Top view: closed mantle margin + concentric growth lines around the
    umbo. Anterior at bottom, umbo at top (matches the parametric view)."""
    x, y = shell.closed_outline("dorsal")
    # Closing the path back to the first point
    x_close = np.concatenate([x, [x[0]]])
    y_close = np.concatenate([y, [y[0]]])
    ax.fill(x_close, y_close, facecolor="#fffef7", edgecolor="black", linewidth=2.0)
    # Concentric growth lines = mantle margins at earlier ages — scaled-down
    # copies of the closed outline.
    for f in (0.25, 0.45, 0.65, 0.85):
        ax.plot(x * (1 - f), y * (1 - f), color="#888", linewidth=0.7)
    # Tiny umbo marker at the back-most point of the outline
    umbo_y = np.min(y)
    ax.plot([0], [umbo_y], marker="v", markersize=6, color="black")
    _frame(ax)
    ax.invert_yaxis()  # anterior at bottom of plot


def plot_analytic_front(ax, shell: AnalyticShell):
    """Front view: (x, z) silhouette. Dorsal up, ventral down.

    Growth lines = silhouette scaled isotropically toward the umbo point,
    which in front view is at (x=0, z=z_dorsal_max) — the top of the dorsal
    apex. This is the "radial expansion from the beak" model the prototype
    documents.
    """
    a, b = silhouette_envelope(shell, "xz")
    ax.fill(a, b, facecolor="#fffef7", edgecolor="black", linewidth=2.0)
    # Commissure line for reference
    ax.plot([-CANVAS, CANVAS], [0, 0], color="#666", linewidth=0.8, linestyle="--")
    # Growth lines: scale the silhouette toward the umbo position. In the
    # xz projection the umbo sits at (0, z_max_dorsal) — the top of the dome.
    umbo = (0.0, shell.dorsal["z_max"])
    for f in (0.25, 0.45, 0.65, 0.85):
        gx = umbo[0] + (1 - f) * (a - umbo[0])
        gz = umbo[1] + (1 - f) * (b - umbo[1])
        ax.plot(gx, gz, color="#888", linewidth=0.7)
    _frame(ax)


def plot_analytic_side(ax, shell: AnalyticShell):
    """Side view: (y, z) silhouette. Beak at left, anterior at right.

    Growth lines = silhouette scaled isotropically toward the umbo point,
    which in side view is at (y=0, z=z_dorsal_max) — the top-back corner
    of the dome. Each growth line is a 3D radial-expansion isoline projected
    into the (y, z) plane; no flat vertical slices.
    """
    a, b = silhouette_envelope(shell, "yz")
    ax.fill(a, b, facecolor="#fffef7", edgecolor="black", linewidth=2.0)
    umbo = (0.0, shell.dorsal["z_max"])
    for f in (0.25, 0.45, 0.65, 0.85):
        gy = umbo[0] + (1 - f) * (a - umbo[0])
        gz = umbo[1] + (1 - f) * (b - umbo[1])
        ax.plot(gy, gz, color="#888", linewidth=0.7)
    _frame(ax)


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
                             figsize=(3.0 * n_cols, 3.4 * n_rows),
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
