# Visualizer comparison — three species, three refinement cycles

The brachiopod tri-view visualizer was rewritten by generating parametric
outlines for three well-imaged Rockford brachiopods, comparing each
view against real specimen photographs, critiquing the mismatch, and
applying targeted fixes — three full cycles. The intermediate composites
live next to this file (`cycle1.png`, `cycle2.png`, `cycle3.png`,
`cycle3b.png`); the tooling that produces them is `gen.cjs` (loads the
real `render.js` in a Node sandbox and dumps SVGs) plus `render.py`
(rasterizes those SVGs alongside the real photos).

## Reference photos used

| Species | TOP / DORSAL | FRONT / ANTERIOR | SIDE / LATERAL |
| --- | --- | --- | --- |
| *Pseudoatrypa devoniana* | Nathan #1, Dave plate | Day & Copper plate B4/B5 | Day & Copper A3, A5 |
| *Cyrtospirifer whitneyi* | Nathan, jsm | Nathan front pair | Dave (lateral), jsm |
| *Schizophoria iowensis* | Nathan, Dave | Stigall & Rode panel 7 | Stigall & Rode 2b/4 |

## What the pre-rewrite visualizer got wrong (cycle 0)

The starting point matched the user's screenshot. Three categories of error:

1. **Top view.**
   - A sharp triangular spike for the beak, instead of the small umbonal
     bulge real shells show.
   - A thick black bar drawn straight down the dorsal midline as a "sulcus."
     Real sulci are subtle depressions; the bar dominated the figure.
   - "Growth lines" drawn as a fan of radii from the beak — geometrically
     these are *ribs*, not growth lines. Real growth lines are concentric
     arcs centered on the beak.
   - The fan of ribs split into mirrored halves with a visible empty
     midline strip — no rib trace runs across the central axis.
   - No concentric frills despite `surface_frills: yes`.
2. **Front view.**
   - Top–bottom symmetric "diamond." Real anterior views are strongly
     asymmetric: dorsibiconvex shells have a much taller dorsal valve
     than ventral; the sulcus cuts a deep notch into one outline.
   - No visible fold-driven rise of the commissure. Even at
     `fold_pick: strong` the commissure was a faint dashed line.
3. **Side view.**
   - Lemon shape pointed at both ends, treating the anterior commissure as
     a single sharp point. Real anterior commissures are vertical edges or
     gently curved faces, not pinpoints.
   - For strophic shells, no interarea wall at the back; only a thin
     vertical line that read as a hinge bar, not a wall.
   - Internal "ribs" rendered as horizontal lines that floated through the
     silhouette rather than tracing the dorsal/ventral valve curvature.

## Cycle 1 — first pass

**Code changes**
- New `answersToShape` with named anatomical fields; default biconvex is
  dorsibiconvex (52 vs 30 px convexity) rather than equal.
- Top view: dropped the midline bar; replaced "growth lines" (radii) with
  `topGrowthArcs`, which are scaled-down copies of the outline centered on
  the beak. Ribs now sweep across the full perimeter (one loop, not two).
  Umbo became a 3-point nudge instead of a single-point spike.
- Front view: dorsal and ventral curves built separately; default values
  produce a clearly asymmetric (dorsibiconvex) silhouette.
- Side view: added `interareaH` parameter for strophic shells; small
  back wall + delthyrium triangle.

**Render → compare → critique**
- Top views immediately read as "a dorsal valve" rather than as an
  abstract circle. Concentric frills now actually crossed the ribs.
- Front views were asymmetric but the commissure peak ("strong fold")
  was a soft Gaussian — way short of the deep half-rectangle commissure
  visible in Cyrtospirifer.
- Wing-shape top view had pointy wingtips but the whole upper band was
  perfectly flat — the body should curve up *into* the hinge, not abut
  it at right angles.
- Side view interarea was a thin line; visually it didn't read as a
  *wall*. Anterior commissure was still a sharp point in all three
  species.

## Cycle 2 — fold geometry + dorsibiconvex emphasis

**Code changes**
- New `FOLD_SETTINGS` with three presets; `foldRiseAt(u, s)` returns a
  near-rectangular profile (flat top + smooth shoulders) so a "strong"
  fold produces the half-rectangle commissure visible in Cyrtospirifer.
- Dorsal vs ventral convexity gap widened (38 / 20 px), then again
  (52 / 30 px) in cycle 3.
- Wing-shape outline rewritten piecewise: upper half is a superellipse
  giving smooth shoulders into the wingtips; lower half is a sharper
  taper to a rounded anterior point.
- Umbo dot replaced by a small triangle so it reads as a beak.

**Render → compare → critique**
- Cyrtospirifer front view: the half-rectangle fold now reads correctly
  — vertical shoulders + flat top + deep V-notch in the bottom outline.
  Very close to the Nathan front-view pair.
- Pseudoatrypa front view: the dorsibiconvex asymmetry is finally
  visible — top arches high, bottom is a clear V from the sulcus.
- Cyrtospirifer top view still showed an artifact: the explicit hinge
  bar at `cy - halfLength * 0.92` did not coincide with the
  `applyHingeStraightening` line at `ny = -0.92`. Outline edge floated
  below the hinge bar.
- Side view interarea was visible but visually subtle — a thin vertical
  line, not a wall. Anterior commissure still a point.

## Cycle 3 — alignment + interarea wall + broader anterior

**Code changes**
- Hinge constants aligned: outline straightening, `topHingeLine`, and
  umbo triangle all use `ny = -0.95`. Hinge bar now coincides exactly
  with the upper outline edge.
- Interarea rendered as a small trapezoidal wall (with a posterior tilt
  and a delthyrium triangle) instead of a plain vertical line.
- Side-view anterior: the dorsal/ventral curves are pulled toward
  fixed offsets above/below `cy` over the last 12% of the length, so
  the silhouette flares to a vertical commissure edge instead of
  tapering to a sharp point.
- Convexity values increased so the front-view body fills more of the
  200×200 box (it was visually cramped at the previous scale).

**Render → compare**
- *Cyrtospirifer whitneyi*: top view reads as alate with a clean hinge
  line and tapered anterior. Front view shows the classic
  vertical-walled, flat-topped fold cutting deep into the ventral
  valve. Side view has a clearly visible trapezoidal interarea at the
  back and a wedge body — matches the Dave/Nathan/jsm side photos.
- *Pseudoatrypa devoniana*: top view is subcircular with a small umbo
  bulge, ribs running across the full surface, and concentric frills
  reading as growth lamellae. Front view shows the dorsibiconvex
  asymmetry plus a moderate sulcus notch in the lower outline. Side
  view shows the lemon profile with the broader anterior commissure
  expected of fold-bearing atrypids.
- *Schizophoria iowensis*: top view is subcircular with a short
  strophic hinge line and very fine ribs. Front view is a smooth dome
  with a subtle fold. Side view is a lemon with a tiny interarea hint.

A final tuning pass softened the strong-fold flat-top slightly (it had
been *too* flat — closer to a real shell's commissure shape now) and
relaxed the wing-shape superellipse from n=4 to n=3 so the wingtip
shoulders curve rather than corner.

## What the model still simplifies

- Real atrypids have ribs that *bifurcate* (split as they extend
  anteriorly). The renderer draws straight non-branching ribs. Mostly
  an aesthetic issue at student-diagram scale.
- The dorsal/ventral convention (fold vs sulcus on which valve) varies
  by clade. The renderer renders a generic "uniplicate" commissure
  pattern and labels the indented outline as "ventral sulcus" — this
  matches Cyrtospirifer and most spiriferids but is inverted from the
  atrypid convention. For pedagogy the takeaway ("fold creates a peak
  in the commissure") is the same either way.
- Side-view ribs are stacked as parallel arcs on the dorsal valve. At
  `rib_density: dense` (count=34) this can read as crosshatching rather
  than discrete ribs. Capping the visible-rib count at 14 mitigates
  this but doesn't eliminate it.
- The "strong" fold preset is calibrated for the *spiriferid* extreme.
  Atrypids tagged `fold_sulcus: strong` get the same dramatic shape.
  Adding a `moderate` fold value to the manifest would be the right way
  to separate atrypid-strength from spiriferid-strength folds.

## Tooling

```
data/visualizer_test/
  ├── COMPARISONS.md      ← this file
  ├── gen.cjs             ← Node: load render.js in a sandbox, dump SVGs
  ├── render.py           ← Python: rasterize SVGs + photos via matplotlib
  ├── compare.html        ← browser harness (used by Chrome headless if available)
  ├── cycle{1,2,3,3b}.png ← intermediate comparison composites
  └── svgs/               ← parametric SVGs for the three test species
```

Run: `node data/visualizer_test/gen.cjs && python3 data/visualizer_test/render.py <cycle_tag>`.
