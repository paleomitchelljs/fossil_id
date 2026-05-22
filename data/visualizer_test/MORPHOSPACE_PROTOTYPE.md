# McGhee/Ubukata morphospace — side-by-side prototype

This is a **prototype**, not a replacement for the current piecewise visualizer
in `render.js`. It implements the analytical brachiopod-shell framework
sketched in the user message and renders the same three calibration species
side-by-side with the current parametric output and real photos.

Files:
- `morphospace.py` — the analytical shell class + species presets + renderer
- `morphospace_compare.png` — the side-by-side composite

Run:
```bash
MPLCONFIGDIR=$TMPDIR/mpl python3 data/visualizer_test/morphospace.py
```

## The model

Each shell is described by ~10 numbers per valve. The valve surface is a 2D
manifold in 3D parameterised by `(θ, φ)`:

- `θ ∈ [0, θ_max]` — ontogenetic age. `θ=0` is the umbo (innermost), `θ=θ_max`
  is the current mantle margin.
- `φ ∈ [-π/2, +π/2]` — angular position around the perimeter. `φ=0` is the
  anterior midline; `φ=±π/2` are the cardinal extremities at the hinge.

**McGhee (1980) allometric radial growth** — each valve has its own:
```
r(θ) = r0 · exp(C1·θ + C2·θ²)
```
`r0` is the initial radius (small, so the umbo is essentially a point);
`C1` is the specific growth rate; `C2` makes growth slow down (negative) or
accelerate (positive) with age. `r0` is chosen so that `r(θ_max) ≈ 80 px`
(half the 200×200 canvas).

**Ubukata (2003) hinge-anchored coordinate system** — position on the
mantle margin at age `θ`:
```
x = r(θ) · sin(φ) · S_x_factor(φ)
y = r(θ) · cos(φ)
S_x_factor = 1 + (S_x − 1) · |sin(φ)|
```
`S_x` is the strophic widening (1.0 = circular, >1 stretches the cardinals
into wings). It only stretches near `φ=±π/2`, so anterior midline geometry
is unaffected.

**Dome height** — bell-curve in `R/R_max` so the peak sits midway between the
umbo and the anterior margin (rather than at the umbo itself, which would
yield a triangular side silhouette):
```
Z = z_max · exp(-((R/R_max − apex_pos)² / (2·σ²)))
```
`apex_pos` defaults to 0.5; for pyramidal shells (`apex_shift` > 0) the apex
pulls posteriorly.

**Ubukata & Nakagawa (2000) sculpting** — wave-superposition perturbations
of Z:
- **Sulcus**: Gaussian along the midline, depressing the dorsal valve (and
  lifting the ventral valve toward the commissure) by a depth that ramps
  up with `(R/R_max)²`.
- **Ribs**: `cos(N·φ)` harmonic with amplitude that grows as `(R/R_max)^1.5`.

The full surface is sampled on a `θ × φ = 60 × 140` grid; the silhouette in
each view is extracted by binning the projected points and taking the upper/
lower envelope per bin.

## What the comparison shows

`morphospace_compare.png` lays out three rows (Pseudoatrypa devoniana,
Cyrtospirifer whitneyi, Schizophoria iowensis) and nine columns:

| Cols 1–3 | Cols 4–6 | Cols 7–9 |
| --- | --- | --- |
| Analytical top / front / side | Current parametric top / front / side | Real photos |

**Pseudoatrypa devoniana** — analytical: subcircular top outline closed
by the hinge segment; front shows the dorsibiconvex body with a clear
sulcus notch on the lower outline; side is a teardrop bulging midway.
The current piecewise output adds explicit features (umbo triangle,
hinge bar, half-rectangle fold commissure) that the analytical model
captures geometrically but without those distinct markers.

**Cyrtospirifer whitneyi** — analytical: the alate outline emerges
naturally from `S_x = 1.85`; the deep sulcus shows up as a tall V-notch
on the front lower outline; the side view's interarea isn't an explicit
trapezoid in the analytical model (it's implicit in the back portion of
the dome).

**Schizophoria iowensis** — analytical: gentle subcircular outline,
shallower dome, subtle sulcus. Matches the orthid form factor at the
gross geometric level.

## What's already cleaner about the analytical model

- A single small parameter tuple (per-valve `r0/C1/C2/z_max`, shared
  `S_x/apex_shift/rib_count/rib_amp/sulcus_depth/sulcus_sigma/dome_p`)
  determines the whole shell — easy to store per-taxon, easy to fit
  from digitised specimen outlines.
- The three views are *projections of one 3D model*, so they're
  guaranteed consistent. The current piecewise visualizer has three
  separate code paths and must keep them in sync by hand.
- Growth lines, ribs, sulcus all emerge from the same surface — no
  need to recompute them per view.

## What the analytical model is missing relative to the current visualizer

- Explicit structural markers (umbo triangle, strophic hinge bar,
  delthyrium triangle, half-rectangle commissure column). These are
  pedagogically valuable for a teaching tool and the analytical model
  captures the *geometry* but not the *labels*.
- The half-rectangle commissure profile that "strong" folds produce
  is a SHAPE choice. The Gaussian sulcus here produces a smoother
  V-notch — closer to atrypids than to spiriferids.
- Lateral profile kinks (geniculate / resupinate) aren't yet modelled.
- Rib zigzag at the commissure (a diagnostic feature) isn't yet
  rendered as a separate edge feature — it's part of the surface
  sculpting but doesn't deflect the silhouette by enough to read at
  student-diagram scale.

## Suggested next steps

1. **Tag taxa with parameter tuples**: digitise a few specimen photos
   and fit `(r0, C1, C2, S_x, apex_pos, sulcus_depth, sulcus_sigma)`.
   Once tagged, the visualizer can render any taxon with the same code.
2. **Add the explicit teaching markers** on top of the analytical
   silhouette — umbo triangle, hinge bar, delthyrium — drawn after the
   shell is laid down. These are visualization decorations, not part of
   the model.
3. **Decide on commissure rendering**: for pedagogy, the half-rectangle
   "strong fold" commissure is more legible than a smooth Gaussian
   sulcus. A hybrid is possible — use the analytical surface for the
   silhouette but overlay the half-rectangle commissure as a separate
   ornament line.
4. **Decide whether to swap renderers**: if the analytical model gets
   close enough, the piecewise `svgTopView`/`svgFrontView`/`svgSideView`
   in `render.js` can be replaced by a thin JS port of `morphospace.py`
   that reads each taxon's parameter tuple from the manifest.

The prototype shows the model can produce silhouettes close enough to
real shells that the path forward is worth pursuing — but it's a
real refactor, not a drop-in replacement.
