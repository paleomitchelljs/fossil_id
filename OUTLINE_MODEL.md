# Parametric brachiopod outline generation

This document explains the model the visualizer uses to turn a small set
of categorical slider choices into the three canonical brachiopod views
(top, front, side). The goal is **"close enough that a student can
recognize their specimen from the candidate list"** — not photoreal
reconstruction. The model is biased toward expressive diagnostic features
(fold, beak coiling, interarea, geniculate trail) over geometric realism.

All rendering lives in `render.js`. Every view is an SVG path drawn at
viewBox `0 0 200 200` with `cy = 100` as the commissure plane in the
side view.

## 1. Inputs → trait object

The wizard / sliders produce an `answers` object with categorical values:

```js
{
  outline_pick:  "subcircular" | "wing-shaped" | "conical" | "pentagonal" | "elongate-oval",
  profile_pick:  "biconvex" | "plano-convex" | "concavo-convex",
  hinge_pick:    "wide-strophic" | "narrow-strophic" | "astrophic",
  fold_pick:     "none" | "weak" | "strong",
  beak_pick:     "subdued" | "moderate" | "prominent" | "pyramidal",
  lateral_pick:  "smooth" | "geniculate" | "resupinate",
  surface_ribs:  "yes" | undefined,
  surface_frills:"yes" | undefined,
  surface_spines:"yes" | undefined,
  rib_density:   "sparse" | "medium" | "dense"
}
```

`answersToShape(answers)` then derives a flat `s` object with px-scale
geometry: `halfWidth`, `halfLength`, `dorsalConv`, `ventralConv`,
`hingeFrac`, `interareaH`, `apexShift`, `foldRise`, `foldShoulderU`,
`foldHalfU`, `ribCount`, `ribAmp`, plus the original picks. This is the
single source of truth — every view function reads from `s`.

## 2. Per-outline archetype dimensions

The five outline archetypes set base `halfWidth × halfLength` and how
the top-view silhouette tapers:

| outline | halfW × halfL | character |
|---|---|---|
| wing-shaped   | 90 × 60 | alate spiriferid (wings, wide strophic hinge) |
| conical       | 40 × 50 | narrow body with tall pyramidal interarea |
| subcircular   | 70 × 70 | teardrop, narrower at the beak |
| pentagonal    | 70 × 70 | shifted super-ellipse (rhynchonellid) |
| elongate-oval | 46 × 86 | tall narrow oval (terebratulid) |

For `subcircular` the dimensions vary further by surface features so
atrypids don't collapse onto the same shape as orthids:
- **frills + spines** (Spinatrypa): `80 × 60` — transverse, wider than long
- **frills only** (Pseudoatrypa, Iowatrypa): `66 × 72` — taller teardrop
- **default** (Theodossia, Schizophoria, etc.): `70 × 70`

`unitOutline(theta, s)` returns `[nx, ny] ∈ [-1,1]²` for the top-view
silhouette at angle theta (0 = beak, π = anterior). Each archetype has
its own branch:
- `wing-shaped` and `conical` use vertical sides above the equator
  (hinge IS the cardinal axis) with anterior taper below.
- `subcircular` is a teardrop: r shrinks 20% toward the beak, slight
  anterior bulge.
- `pentagonal` is a super-ellipse with exponent 1.4, shifted so the
  widest point sits anterior of center.
- `elongate-oval` is a plain ellipse.

`applyHingeStraightening` then pulls the very top of the outline onto
a flat hinge line at `ny = -0.95` for strophic shells (the hinge
truncates the otherwise rounded posterior).

## 3. Valve convexity (per outline)

Side view depth comes from `dorsalConv` and `ventralConv`. Real Iowa
Devonian specimens are strongly inequivalve, so defaults are biased
toward dorsibiconvex by outline:

| profile / outline | dorsalConv | ventralConv | character |
|---|---|---|---|
| concavo-convex (strophomenids) | 6  | 22 (or 38 w/ spines) | flat shell |
| plano-convex                   | 70 | 6  | nearly flat ventral |
| conical (cone spirifer)        | 24 | 78 | ventro-biconvex (cone IS ventral) |
| wing-shaped (alate spirifer)   | 56 | 40 | near-equivalve |
| subcircular + frills (atrypid) | 80 | 22 | dramatic dorsibiconvex |
| subcircular default            | 72 | 25 | strong dorsibiconvex |

This single table is what makes Pseudoatrypa look different from
Cyrtospirifer in side view — same outline picker, different DV split.

## 4. Front view — body shape + fold split

`frontBodyShape(u, s)` returns a unit shape factor at lateral position
`u ∈ [-1,1]`:
- **wing-shaped**: `(1 - |u|^0.95)` — linear/triangular descent
- **conical**: `(1 - |u|^1.3)` — narrower triangle
- **dome outlines** (subcircular / pentagonal / elongate-oval):
  `(1 - u²)` — parabolic dome

`frontFoldSplit(s)` distributes the fold's rise between three places
the fold can manifest in the front view:
- `outerDorsal`  — how much the fold lifts the upper outline
- `outerVentral` — how much the sulcus pulls UP the lower outline
- `commissure`   — how much the internal commissure line peaks

| outline | outerDorsal | outerVentral | commissure |
|---|---|---|---|
| wing-shaped | 0.30 | 0.25 | 0.30 |
| conical     | 0.30 | 0.50 | 0.15 |
| dome        | 0.45 | 0.40 | 1.40 |

For triangular outlines the fold IS the silhouette (single triangle
peak); for dome outlines the outer mostly deforms a little while the
fold lives in an INTERNAL V-peak commissure line drawn inside the dome.

`foldRiseAt(u, s)` is a Gaussian (flat plateau across `|u| < halfU`
then `exp(-((|u|-halfU)/shoulderU)²)`). Gaussian decay avoids the
"bifurcating divot" an abrupt shoulder cutoff would produce.

`resolveFoldParams(f, outline)` is the second table that makes the
same nominal "strong fold" look different on different body plans:
sharp narrow plateau on wing-shaped/conical, broad gentle hump on
dome outlines.

The dorsal and ventral silhouettes are computed differently for
triangular vs dome:
- **Triangular** dorsal: single descent — `peak * frontBodyShape(u)`
  where `peak = dorsalConv + foldRiseAt(0) * outerDorsal`. The body and
  fold combine into ONE triangle, not "fold spike on top of body wings."
- **Triangular** ventral and **all dome** valves use additive
  `body * frontBodyShape(u) + fold * coef` (or `-fold` for ventral).
  This produces the W-shape with central V-indent on conical ventrals.

`frontValveScale(s)` foreshortens the front-view valve convexity so
the projection isn't simply the side view's full DV span — looking at
a cone end-on, you see the base width and a modest base height, not
the full cone depth. wing-shaped uses `(0.60, 0.55)`, conical uses
`(1.0, 0.35)`, dome uses `(1.0, 1.0)`.

## 5. Side view — two-valve model

Each valve is drawn as its OWN closed shape. `sideValveClosedPath(s, isDorsal)`
returns `{ fill, stroke, coil }`:

- `fill` — closed path including the cy commissure closure. Used for
  body color, NOT stroked (would draw a visible line across the middle).
- `stroke` — open path: anterior tip → outer silhouette → back anchor →
  optional interarea face down to the hinge. NO commissure segment.
- `coil` — closed Bezier comma overlapping the body at the posterior.

Per-valve geometry:
1. Sample outer silhouette via `smoothParabola` (two half-parabolas
   joined at `peakU = -apexShift`). Lateral kinks (`geniculate`,
   `resupinate`) modify the post-kink trajectory.
2. Posterior anchor = `cy + sign * interareaH/2` for strophic shells,
   or `cy` for astrophic (both valves meet at the hinge point).
3. Anterior tip = `cy + sign * foldStr * 11`. No-fold shells taper to
   a sharp point at `(frontX, cy)`; strong-fold shells show a visible
   vertical step at the anterior commissure (the fold's lift).
4. Beak coil (described in §6) is its own path overlapping the body.

### Render order (svgSideView)
1. Body fills (no stroke)
2. Decoration (ribs, growth lines, spines) clipped to body union
3. Interarea overlay — hatched trapezoid + delthyrium + posterior tick
4. Beak coils (fill + stroke) — drawn ON TOP of body
5. Body silhouette strokes — open paths, no commissure
6. Anterior commissure zigzag (if ribs)

This order is what removes the previous "T-bar through the middle"
artifact: the commissure plane stroke is never drawn because the
visible-outline stroke path is open and never crosses cy.

## 6. Beak coil (the umbo curl)

For each valve with `beak ≠ subdued`, a comma-shaped curl is built as
a closed cubic-Bezier loop anchored at the posterior corner:

```
anchor = (beakX, backAnchorY)
tip    = (anchor.x - hookExt, anchor.y + sign * hookExt * 0.55)
            // tip extends BACK and AWAY from cy (this is the H3 fix —
            // earlier code tucked tip toward cy, which crossed into
            // the opposite valve's hemisphere on astrophic shells)
outer Bezier:
  control1 = (anchor.x + hookExt*0.10, anchor.y + sign*hookExt*1.25)
  control2 = (anchor.x - hookExt*1.15, anchor.y + sign*hookExt*0.85)
inner return Bezier (the "tuck"):
  control1 = (anchor.x - hookExt*0.55, anchor.y - sign*hookExt*0.05)
  control2 = (anchor.x + hookExt*0.20, anchor.y - sign*hookExt*0.15)
            // forward of anchor (positive x), toward cy — this is
            // what makes the inner return sweep INTO the body interior,
            // producing visible overlap (the "tucking into the body"
            // geometry of a real coiled hook)
```

`hookExt = halfL * baseFrac * astroBoost`:
- `baseFrac` is per-outline + per-valve (dorsal coils are larger):
  wing-shaped dorsal 0.42, conical dorsal 0.30, subcircular dorsal 0.28
- `astroBoost = 1.7` if no interarea (both beaks need to be visible)

The coil is rendered with body-color fill + black stroke, AFTER the
interarea overlay so the curl shows on top of the hatched gray. The
body's own stroke terminates at the anchor and doesn't trace the coil,
so the hook reads as a discrete coiled umbo overlapping the body.

## 7. Top view — outline + decoration

`svgTopView` traces `unitOutline(theta, s)` modified by:
- `applyHingeStraightening`: flat hinge line for strophic shells
- `applySulcusIndent`: subtle inward notch at the anterior midline for
  fold-bearing shells
- `applyRibScallop`: outward bumps where each rib crosses the perimeter
  (peaks at the anterior commissure, fades toward the beak)

The hinge bar is drawn as an explicit line at the appropriate y.
`topUmboDot` adds a small triangle ABOVE the hinge for narrow-strophic
shells (Schizophoria umbo), suppressed for conical (the umbo is at the
top of the tall interarea wall, visible in SIDE view).

### Surface decoration
- **Ribs**: radial paths from the umbo to the perimeter, count from
  `rib_density` (sparse/medium/dense).
- **Growth lines / frills**: concentric scaled copies of the outline,
  contracted toward the umbo.
- **Spines** (`topSpines`): coherent rib × lamella grid — three
  concentric lamella rings at `r = 0.55, 0.74, 0.90`, with
  `spinesPerRing = ribCount / 3` spines spaced around an arc that skips
  the back 80° of perimeter. Perimeter spine stubs project outward at
  the shell edge. This replaced an earlier random Vogel-spiral
  placement that didn't follow shell topology.

## 8. Lateral profile cases

`lateral_pick` modifies the side-view valve silhouette:
- **smooth**: pure parabola
- **geniculate** (Douvillina): post-kink ventral is a super-linear ramp
  (`y = baseAtKink + dropPx * t^1.25`) anchored at the natural parabola
  value at `kinkU`, so the bend reads as a continuous angular deflection
- **resupinate** (Strophonelloides): post-kink dorsal flips its sign
  across cy in a smooth blend

## 9. What the model deliberately doesn't try to do

- **Photoreal texture**: ribs are uniformly spaced parametric paths,
  not real costae traces.
- **3D occlusion**: top view shows ONE valve (typically dorsal). No
  attempt to render the ventral beak peeking through behind it.
- **Per-specimen variation**: every Pseudoatrypa renders identically.
  The model is a category renderer, not a fit-to-photograph.
- **Inequivalve beyond outline+frills**: any per-taxon tuning beyond
  the existing tables (e.g., "this Schizophoria is unusually inflated")
  would need an additional manifest trait.

## 10. Architectural seams worth knowing

Adding a new outline archetype (e.g., productid with strong spines) is
mostly filling in four tables:
1. `halfWidth × halfLength` and `hingeFrac` in `answersToShape`
2. `unitOutline` branch with the per-archetype shape function
3. `frontBodyShape` branch
4. `frontFoldSplit` and `resolveFoldParams` entries

Adding a new manifest trait (e.g., `interarea_form`) is similarly
small: add it to the `TRAITS` registry, route it through
`answersFor(taxon)` to map onto a slider value, and use it in
`answersToShape` to derive the geometry it should affect.

The repeated lesson from this build: **the user-facing vocabulary stays
simple (a small number of categorical sliders), and the renderer
composes context-appropriate parameters from per-outline tables.**
Each new biological insight tends to land as a new column in one of the
tables, not a new slider.
