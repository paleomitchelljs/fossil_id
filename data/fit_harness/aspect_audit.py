#!/usr/bin/env python3
"""Report PARAM bbox aspect vs REF bbox aspect for each brach+view.

Helps identify whether the PARAM model is too tall/short/wide/narrow
RELATIVE TO THE REFERENCE at native scale — independent of any
fitting/stretching artifacts in diagnostic_grid.
"""
import os, sys, glob
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from diagnostic_grid import (
    nonwhite_mask, red_outline_mask, bbox_of_mask,
    param_silhouette_polygons, silhouette_bbox,
)
from diagnostic_overlay import SPECIMENS, gen_svgs

HERE = os.path.dirname(os.path.abspath(__file__))
REF_DIR = os.path.join(HERE, "reference_outlines")


def reference_outline_path(brach_name, view):
    hits = glob.glob(os.path.join(REF_DIR, f"{brach_name}_*_{view}.png"))
    return hits[0] if hits else None


def main():
    svg_dir = os.path.join(HERE, "_diagnostic_svgs")
    gen_svgs([dict(id=sp["name"], answers=sp["answers"],
                    taxon_key=sp.get("taxon_key")) for sp in SPECIMENS], svg_dir)

    print(f"{'brach':<8} {'view':<10} {'REF (W:H)':<14} {'PARAM (W:H)':<14} "
          f"{'verdict':<30}")
    print("-" * 80)

    for sp in SPECIMENS:
        for view, svg_key in [("side", "side"), ("anterior", "front")]:
            ref_path = reference_outline_path(sp["name"], view)
            if not ref_path:
                continue
            ref_pil = Image.open(ref_path)
            ref_mask = red_outline_mask(ref_pil)
            ref_bbox = bbox_of_mask(ref_mask)
            if ref_bbox is None:
                continue
            rx0, ry0, rx1, ry1 = ref_bbox
            ref_w, ref_h = rx1 - rx0, ry1 - ry0
            ref_aspect = ref_w / ref_h

            svg_path = os.path.join(svg_dir, f"{sp['name']}_{svg_key}.svg")
            polys = param_silhouette_polygons(svg_path)
            param_bbox = silhouette_bbox(polys)
            if param_bbox is None:
                continue
            px0, py0, px1, py1 = param_bbox
            param_w, param_h = px1 - px0, py1 - py0
            param_aspect = param_w / param_h

            # Verdict: how does PARAM aspect compare to REF?
            ratio = param_aspect / ref_aspect
            if 0.92 <= ratio <= 1.08:
                verdict = "✓ aspect matches"
            elif ratio < 0.92:
                verdict = f"PARAM too TALL ({(1-ratio)*100:.0f}%)"
            else:
                verdict = f"PARAM too WIDE ({(ratio-1)*100:.0f}%)"

            print(f"{sp['name']:<8} {view:<10} "
                  f"{ref_w:.0f}:{ref_h:.0f} ({ref_aspect:.2f})  "
                  f"{param_w:.0f}:{param_h:.0f} ({param_aspect:.2f})  "
                  f"{verdict}")


if __name__ == "__main__":
    main()
