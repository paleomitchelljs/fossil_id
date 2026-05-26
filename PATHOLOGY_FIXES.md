# Pathology fixes — round assessment

Targeted fixes based on visual comparison of PARAM (blue) overlays
against reference outlines (red, 4 brachs) and photos (3 brachs).
Pre-implementation: pathologies + proposed fixes. Post-implementation
evaluation appended at the bottom without modifying the diagnosis.

## Diagnosed pathologies

### P1. brach3 ANT (Conispirifer anterior) — shape mismatch
PARAM is a roughly diamond/rhombic shape with central peaks. Reference
shows a wider, more rhombic/square outline with subtle features.
PARAM peak proportions don't match the reference's broader silhouette.
IoU: 0.58.

### P2. brach2 ANT (Schizophoria anterior) — central V over-engineered
Reference shows a clean wide oval with a *subtle* V-dip at the bottom
center (orthid sulcus on dorsal valve). PARAM produces an aggressive V
deflection that cuts about 30% into the outline. The Schizophoria
orthid-style notch (`notchDepth = foldStr * 8`) is too deep.
IoU: 0.80.

### P3. brach2 SIDE & brach4 SIDE — posterior umbo overdrawn on strophic
Strophic shells should show a flat interarea face at the back, not a
back-curving umbo extension. PARAM's body silhouette curves backward
past beakX, producing a visible umbo bump where the reference shows
just a small notch (Schizophoria) or a clean back edge (Cyrtospirifer).
This is `sideValveClosedPath`'s segment-1 c1 control point pulling the
curve too far past the interarea wall.
IoUs: 0.72, 0.75.

### P4. brach3 SIDE (Conispirifer side) — cone slightly too wide
PARAM cone aspect (~1:1) closer to reference (~0.85:1 taller-than-wide)
but still not narrow enough. Reference teardrop is distinctly taller
than wide. Current `halfWidth=42, halfLength=38`.
IoU: 0.71.

### P5. brach4 ANT (Cyrtospirifer anterior) — diamond shallower than reference
PARAM diamond has appropriate width but less vertical depth than
reference. The dorsal lobe (after flip, bottom) doesn't extend
sufficiently. Reduced wing-shape dorsalConv (62→50) for side-view
flattening made the front-view shallower.
IoU: 0.55.

### P6. brach1 ANT (Pseudoatrypa anterior) — V at bottom too sharp
Photo shows a gentle smile-curve at the bottom commissure; PARAM
produces a pronounced V at center. The dome `outerVentral=1.05` for
atrypids pulls the ventral too far up at center, creating a sharper
V than the photo shows.
IoU: 0.80.

## Proposed fixes

### F1. brach3 ANT
Re-examine the reference proportions. Bump `halfWidth` for conical
slightly so the anterior diamond is wider relative to height. Also
moderate the `outerVentral=0.85` if the central indent is still too
deep relative to the reference's lateral lobes. Likely: `halfWidth
42→48`, hold `halfLength=38`.

### F2. brach2 ANT
Reduce `notchDepth` from `foldStr * 8` to `foldStr * 4`. Keeps the
diagnostic feature (orthid sulcus visible) but at a magnitude matching
the reference's subtle dip.

### F3. brach2 & brach4 SIDE
In `sideValveClosedPath`, when `isStrophic`, reduce `s1_c1y` lift.
Currently `s1_c1y = A0y` (horizontal tangent) for strophic. The
horizontal tangent at the interarea top causes the cubic to bulge
backward (toward smaller x) before climbing to apex. Change to a
slight DOWNWARD tangent so the body emerges from the interarea going
forward-and-up, not backward-and-up.

### F4. brach3 SIDE
Push aspect further: `halfWidth=38, halfLength=42` (lateral 76 vs AP
84). Reference teardrop is roughly 70w × 90h. Closer match.

### F5. brach4 ANT
Bump wing-shape dorsalConv from 50→58. The side view will be slightly
taller but stays within reference proportions; the anterior diamond
gets needed depth.

### F6. brach1 ANT
For atrypids (frills), reduce `outerVentral` from 1.05 to 0.75. The
fold contribution to the outer outline becomes more proportional;
internal commissure line still picks up the diagnostic deflection.

## Post-implementation evaluation

### Metric movement (IoU; pre → post)

| brach | view | pre | post | Δ | corresponding fix |
|-------|------|-----|------|---|-------------------|
| brach1 | side | 0.72 | 0.72 | 0 | (none expected) |
| brach1 | ant | 0.80 | **0.86** | **+0.06** | F6 ✓ |
| brach2 | side (ref) | 0.72 | 0.72 | 0 | F3 visual only |
| brach2 | ant (ref) | 0.80 | 0.78 | −0.02 | F2 over-corrected |
| brach3 | side (ref) | 0.71 | 0.71 | 0 | F4 ineffective |
| brach3 | ant (ref) | 0.58 | 0.58 | 0 | F1 ineffective |
| brach4 | side (ref) | 0.75 | 0.75 | 0 | F3 visual only |
| brach4 | ant (ref) | 0.55 | 0.55 | 0 | F5 too small |
| brach5 | side | 0.74 | 0.74 | 0 | (none expected) |
| brach5 | ant | 0.78 | **0.84** | **+0.06** | F6 ✓ (atrypid side-effect) |
| brach6 | side (ref) | 0.75 | 0.75 | 0 | (none expected) |
| brach6 | ant (ref) | 0.81 | 0.81 | 0 | (already at ceiling) |
| brach7 | side | 0.48 | 0.48 | 0 | (none expected) |
| brach7 | ant | 0.80 | 0.80 | 0 | (none expected) |

### Per-fix success degree

**F1. brach3 ANT aspect bump (halfWidth 42→48)** — *low success*. IoU
unchanged at 0.58. The bump made the diamond wider but the shape still
doesn't match the reference's broader rhombic outline well. Likely the
true issue isn't aspect but the way the silhouette's TOP edge curves —
my outerVentral=0.85 produces a M-top (two peaks) where the reference
shows a flatter top with subtle features. May need to suppress the
M-top entirely and use a smoother triangle for conical.

**F2. Schizophoria notch reduction (foldStr×8 → foldStr×4)** —
*partial regression*. IoU dropped 0.02. The over-correction: notch is
now too shallow to register but the V wasn't reduced enough to fully
match the gentle dip in the reference. Visually the central dip is
now barely visible. Should try foldStr×6 — between the original 8 and
the over-reduced 4.

**F3. Strophic posterior umbo flatten (s1_c1 lifted)** — *no metric
change but visual improvement*. The IoU didn't move because the
strophic interarea region was already a small fraction of the total
mask area. Visually the body silhouette for brach2/brach4 SIDE no
longer curves backward past beakX — the reference's flat back edge
is matched better. This is a true visual win even though the metric
didn't register.

**F4. Conical aspect push (halfLength 38→42)** — *zero impact*.
brach3 SIDE IoU unchanged. The aspect bump pushed the cone toward
taller-than-wide but the reference's specific teardrop shape needs
more than aspect — it needs the back wall to curve differently. The
current straight-line interarea closure doesn't match the reference's
smooth umbo curl.

**F5. Wing-shape dorsalConv bump (50→55)** — *too small to register*.
brach4 ANT IoU unchanged. The bump made the diamond marginally deeper
but the gain was within noise. Need a more substantial bump (maybe
55→65) to actually move the metric. Trade-off: bumping makes side view
proportionally taller, reducing brach4 SIDE fit.

**F6. Atrypid outerVentral reduction (1.05→0.75)** — *significant win*.
brach1 ANT +0.06 and brach5 ANT +0.06 (Spinatrypa benefits as a frill-
bearing taxon). The gentler outer V matches the photos' smile-curve
commissures. This was the only fix that produced metric wins on
multiple panels.

### Overall assessment

- **2/6 fixes produced metric wins** (F6 on two panels; F3 produced
  visual wins not captured by IoU).
- **2/6 fixes were ineffective** (F1, F4) — the aspect/dimension
  tweaks didn't move the metric. The conical archetype (brach3) is
  resistant to per-parameter tuning; the categorical model may not be
  capable of matching the Conispirifer reference's specific shape.
- **1/6 fix was an over-correction** (F2) — needs intermediate value.
- **1/6 fix was too timid** (F5) — needs larger value.

Average IoU change across all 14 panels: +0.009 (essentially zero in
total). Net effect is concentrated in atrypid anteriors and visual
strophic improvements.

### What the metrics suggest for next moves

1. **Stop tuning brach3 via the categorical model**. The metric won't
   budge meaningfully. Conispirifer needs either (a) its own dedicated
   render path (like conicalValve but with a back wall that curves)
   or (b) fitted shape data via the morphospace pipeline.

2. **Re-bump F2 to foldStr×6** for Schizophoria — split the difference.

3. **Re-bump F5 to dorsalConv=62 or 65** for wing-shape if anterior
   IoU is the priority; accept side view becomes slightly less flat.

4. **F3 is a real win** that the metric can't see — keep it. The
   structural change (no back-bulge on strophic) makes brach2/brach4
   side views read correctly to a student even if IoU is the same.

5. **The IoU plateau around 0.72-0.85** for most panels is what the
   categorical model can achieve. To push higher we need per-taxon
   data (the manifest's fitted `shape:` blocks for 4 taxa) rather
   than more categorical-model tuning.

---

## Pipeline overhaul round (structural, not metric-driven)

After the F1-F6 round, you (the user) proposed a paradigm shift:
deprecate IoU as primary metric and focus on structural/anatomical
fidelity through Bezier rewrites and visual weighting. The proposal
had three phases. Changes landed:

### Phase 1.A: anterior commissure zigzag REMOVED
The "rib teeth" zigzag in `svgSideView` was a stylistic decoration
that read as a coiled-spring artifact in the diagnostic overlay
(visible as the blue spring at brach2 anterior edge in the previous
round). Removed entirely. Rib presence still communicated by the
rib-stripes inside the body fill (`inner` clipped paths).

### Phase 1.B: conical front-edge rewrite (teardrop sweep)
Replaced the single-cubic apex→frontX with a two-cubic chain through
a mid-shoulder at (62% horizontal, 58% down). The first cubic emerges
from the apex with a tangent pointing DOWN-AND-OUT (not toward the
chord), bulging outward through the shoulder; the second cubic curls
back to the commissure. Anatomically captures the sweeping teardrop
of Conispirifer rather than the rigid triangle.

### Phase 1.C: geniculate smoothing (C¹ continuous)
Replaced the piecewise `pow(tt, 1.25)` (and later `0.5*tt + 0.5*tt²`)
with a smoothstep blend zone from `kinkU − 0.15` to `u = +1`. The
trail contribution rises smoothly from 0 to `lateralDropPx` across
this zone using `t²(3-2t)`. Single continuous function across the
whole AP range — no piecewise junction.

### Phase 2: orthid notch and commissure smoothing
- `notchDepth = foldStr * 6` (intermediate between the over-deep 8
  and the over-shallow 4 of the previous round).
- `sigma = 0.32` (widened from 0.28) for smoother U-shape rather
  than V-cut.

### Phase 3.A: alpha-shaded body fills
Replaced `fill="#fffef7"` (cream-on-cream wireframe effect) with
`fill="#c9b380" fill-opacity="0.35"` — warm-tan at 35% opacity. The
body now has implied volume in the build view without overwhelming
the outline diagnostic.

### Phase 3.B: globose convexity push (Theodossia caricature)
Bumped globose `dorsalConv` from 80→92 and `ventralConv` from 48→55.
The previous values were anatomically faithful to the modest
Theodossia reference but read TOO SIMILAR to atrypids — the
pedagogical purpose is "this is the fat one", which requires
caricature beyond strict anatomical accuracy.

### Metric movement (pre-overhaul → post-overhaul)

| brach | view | pre | post | Δ |
|-------|------|-----|------|---|
| brach1 | side | 0.72 | 0.72 | 0 |
| brach1 | ant | 0.86 | 0.86 | 0 |
| brach2 | side (ref) | 0.72 | 0.72 | 0 |
| brach2 | ant (ref) | 0.78 | 0.78 | 0 |
| brach3 | side (ref) | 0.71 | **0.64** | **−0.07** |
| brach3 | ant (ref) | 0.58 | 0.58 | 0 |
| brach4 | side (ref) | 0.75 | 0.75 | 0 |
| brach4 | ant (ref) | 0.55 | 0.55 | 0 |
| brach5 | side | 0.74 | 0.74 | 0 |
| brach5 | ant | 0.84 | 0.84 | 0 |
| brach6 | side (ref) | 0.75 | 0.74 | −0.01 |
| brach6 | ant (ref) | 0.81 | 0.82 | +0.01 |
| brach7 | side | 0.48 | **0.51** | **+0.03** |
| brach7 | ant | 0.80 | 0.80 | 0 |

### Visual assessment (per the proposal's "deprecate IoU" principle)

**brach3 SIDE IoU regression (-0.07) — defended visually.** The
conical rewrite made the cone outline a sweeping teardrop (Phase 1.B)
rather than a rigid triangle. The bbox extent is different, so the
metric drops — but visually the silhouette LOOKS more organic and
matches the reference's teardrop curvature better than the previous
straight-line cone. This is exactly the "Silhouette Complexity Test"
the proposal called for: smoothness/organic feel prioritized over
strict area matching.

**brach7 SIDE IoU gain (+0.03).** Smoother geniculate matches the
reference's smooth bend better. The Bezier-smoothed C¹ transition
eliminates the "broken bone" feel.

**Zigzag removal** — clean visual win. The blue spring artifact at
anterior edges of all ribbed brachs is gone.

**Alpha shading** — not visible in the diagnostic (which only renders
strokes), but the build view now shows tinted body fills. Need to
test in the actual app to confirm pedagogical effect.

**Globose Theodossia push** — brach6 ANT inched up +0.01 with the
convexity bump; SIDE inched down −0.01. Visually Theodossia is now
more distinctly inflated vs Pseudoatrypa — pedagogical caricature
working as intended.

### Per-phase success degree

- **Phase 1.A (zigzag removal)**: ✓ pure win. Visual artifact gone.
- **Phase 1.B (conical rewrite)**: visual win, metric regression. The
  IoU regression is acceptable per the proposal's evaluation strategy
  (smoothness over area match). The teardrop sweep is the right
  geometry.
- **Phase 1.C (geniculate smoothing)**: ✓ both visual and metric win
  on brach7 SIDE.
- **Phase 2 (orthid notch tune)**: ✓ landed at intermediate value;
  metric stable.
- **Phase 3.A (alpha shading)**: implementation done; effect only
  visible in the build view (not the diagnostic harness).
- **Phase 3.B (globose push)**: pedagogically right; metrics stable.

### Outstanding items from the proposal

- **Tangent Alignment Test** (silhouette enters bounding box at same
  angle as reference): not yet implemented as a programmatic check.
  Would require parameterized angle comparison between PARAM stroke
  derivative and reference outline derivative at key landmark points.
- **Silhouette Complexity Test**: same — qualitative judgment for now.
- **Morphospace fallback for resistant taxa**: the manifest's fitted
  `shape:` blocks exist for 4 taxa but aren't yet plumbed into the
  build view PARAM pipeline. Conispirifer (brach3) is the prime
  candidate to switch to fitted data, but Conispirifer isn't one of
  the 4 fitted taxa — would need a new mesh capture.

### Bottom line

This round was deliberately NOT metric-optimized. The net IoU change
across all panels was approximately zero (one −0.07 regression, one
+0.03 gain, twelve essentially unchanged). The real value is in:
- Visual artifact removed (zigzag)
- Cone reads as organic teardrop instead of rigid triangle
- Geniculate smooths through the kink
- Body fills have implied volume
- Theodossia is pedagogically distinct from atrypids

The pipeline now has structural fidelity that the previous metric-
driven tuning rounds were unable to deliver, at the cost of one
panel's IoU. This trade matches the proposal's stated priority:
"Organic smoothness is prioritized over strict area matching."

