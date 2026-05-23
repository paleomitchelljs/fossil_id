# Outline-generation review (honest version)

Replaces the previous overgenerous self-review. Written after the user
pointed out that my "good enough for student ID" claim was wrong: a
student looking at the brach4 photo and the brach4 PARAM side view
would NOT say "this matches my specimen."

## 1. Honest assessment of where the model is

**The model is currently a categorical-icon system.** It can produce
distinct renders for each outline archetype (winged vs conical vs
round vs flat), but within each archetype it cannot reliably
represent the diagnostic features that a student uses to confirm an
ID. The seven Rockford diagnostic PARAM renders are recognizable
*as the right shape category* but not as specimen-credible
representations.

The target the user articulated is exactly right: **the outline
should be a close enough general form that a student says "I am
close enough to dig in deep" — i.e., good enough to take the
candidate seriously and compare details.** That's a lower bar than
photo-real but a higher bar than what we're currently producing.

## 2. Why the current renders don't reach that bar

### 2.1 The umbo is the most diagnostic feature and we're rendering it microscopically

Looking at brach4 (Cyrtospirifer): the first thing a student notices
in the photo is the dramatically hooked umbo curling back over the
body. It's roughly 30-40% of the body's lateral extent and dominates
the visual signature. In my PARAM the umbo is a ~21 px comma on a
~100 px body — 21%. It reads as a decorative tick, not as the
defining feature.

Same problem for Theodossia (brach6), Pseudoatrypa (brach1), and
Schizophoria (brach2). For every astrophic-style shell in the set,
the photo's defining visual is the umbo, and my umbos are too small
to anchor the eye.

### 2.2 The body silhouettes are forced symmetric about their apex

I built the side-view Bezier with `apexBackH ≈ apexFrontH` (matching
handle lengths on both sides of the apex). C¹-continuous, smooth,
geometrically tidy — and wrong. Real brachiopod valves are
directionally asymmetric: the back of the body bulges high to host
the umbo, the front tapers gradually. A symmetric lens about the
apex is not what any of these specimens look like.

Looking at brach4 PARAM vs photo: the PARAM's top and bottom are
mirror images about cy AND its front and back are mirror images
about the apex. The photo is asymmetric in BOTH axes. Two of the
four "matching" features are structurally absent from the model.

### 2.3 The umbo is treated as a separate overlay path, not as part of the valve

In current code:
- The body silhouette ends at `backAnchor = (beakX, cy ± interareaH/2)`
- A separate filled Bezier "coil" path is drawn on top, overlapping
  the body posteriorly

This separation works mechanically — the coil renders, the body
renders, they overlap — but **visually** the coil looks "stuck on"
because there's no smooth geometric continuity between body and umbo.
The body ends abruptly at the back, then a comma appears behind it.

In real specimens the body and the umbo are one continuous curve.
The valve silhouette traces back along the body, curves UP at the
posterior to form the umbo, the umbo arcs back and around, and
returns to the hinge line. It's one path, not body + overlay.

### 2.4 The interarea is a hatched rectangle, not anatomical

The current interarea overlay is a hatched gray trapezoid behind the
body. It looks like construction-paper applique. In real specimens
the interarea is integral to the geometry — it's the flat triangular
face from hinge line to umbo apex, partially HIDDEN by the umbo
curling over it, visible only as a recessed face in the gap between
the two valves' coils.

Drawing it as a static decorative rectangle disconnected from the
umbo geometry breaks the visual coherence. A student doesn't see "a
hatched rectangle"; they see "the back face of the shell where the
umbo curves up from."

### 2.5 Front views attenuate the diagnostic fold deflection

For brach6 (Theodossia, strong fold), the photo's anterior shows a
clearly bell-shaped silhouette with deep central depression. The
PARAM shows a smooth dome with a small inner V-line. The deflection
is captured "as a feature" but with attenuated amplitude.

`frontFoldSplit` for dome outlines is `outerDorsal: 0.45,
outerVentral: 0.40, commissure: 1.40`. For real bell-shaped
specimens these should probably be `0.75 / 0.70 / 1.10` — the outer
margin carries MORE of the deflection, the inner commissure less.

## 3. What needs to change at the core of valve-shape generation

Five interlocking changes. None work in isolation.

### 3.1 The umbo IS the back of the valve — single integrated outline

Restructure each valve as a single continuous Bezier chain that goes:
1. **Anterior tip** → 2. **Anterior body** → 3. **Body apex** →
4. **Posterior body** → 5. **Umbo outer arc** (curves UP and BACK
from the body's posterior) → 6. **Umbo tip** → 7. **Umbo inner arc**
(curves FORWARD and DOWN back to the hinge line)

No separate "coil overlay." The valve outline is one path. The
interior of the coil (where the inner arc passes through where the
body would be) is just part of the closed shape.

### 3.2 Asymmetric body handles — posterior bulk, anterior taper

Side-view body Bezier handles need to be DIRECTIONALLY ASYMMETRIC:
- `apexBackH` (handle on the BODY APEX → BACK side) should be SHORT
  — the curve drops quickly from the apex toward the umbo base
- `apexFrontH` (handle on the BODY APEX → ANTERIOR side) should be
  LONG — the curve glides gradually toward the anterior taper
- `backH` (handle at the back-of-body / start of umbo) should be
  TANGENT TO THE UMBO TRAJECTORY, not horizontal — the body
  silhouette flows smoothly into the umbo's outer arc

This is the geometric difference between a "lens" and a real shell.

### 3.3 The umbo dominates — sized as a major body region

For shells where the umbo is the diagnostic feature, the umbo's
back-extent and height should be sized as a MAJOR FRACTION of the
body, not a small overlay:
- Wing-shaped (Cyrtospirifer): umbo width = 0.75-0.85 × halfL
- Conical (Conispirifer): umbo width = 0.40-0.50 × halfL (smaller
  because the interarea is huge)
- Dome with prominent beak (Theodossia, Pseudoatrypa): umbo width
  = 0.55-0.65 × halfL

These are roughly 2× the current sizes.

### 3.4 The umbo coil shape is a true wraparound, not a comma

Currently the umbo's inner arc Bezier control point sits slightly
forward of the anchor (`iC2 = ax + hookExt * 0.20`). For a TRUE
coil, the inner arc has to sweep further forward and possibly past
the cy plane, so it visually wraps around. The closed shape
self-intersects, which SVG nonzero winding handles correctly as a
filled region with a "hole" where the coil's inner curve passes
through. This is how a real spiral umbo reads visually — you see
an outer loop with the umbo's tip pointing back into the body.

### 3.5 Interarea geometry derived from the umbos, not standalone

The interarea overlay should be drawn between the two valves' umbo
tips, sized by the gap between them, and positioned with its outer
edge along the line where the umbos' interior edges meet. The
current "fixed hatched trapezoid at (beakX-10, interareaTop) to
(beakX, interareaBot)" should become "trapezoid whose corners are
derived from the umbo path geometry."

This makes the interarea anatomically coherent: when the umbo is
small, the interarea is visible behind it; when the umbo is large
and curls over, the interarea is mostly hidden, only its bottom
portion visible in the gap.

## 4. Calibration tooling: still missing

All of §3 would benefit from a tooling pass: extract silhouettes
from the GLB meshes in `data/3d_models/`, fit per-taxon handles
against those silhouettes, output values into the manifest. Without
that, the §3 implementation is still going to rely on me eyeballing
values that look right for the seven Rockford specimens. The next
unfamiliar specimen will probably break the calibration just like
brach7 broke the previous concavo-convex defaults.

## 5. What this means for "good enough"

The visualizer hasn't reached "the student says 'I should dig in
deep.'" Honest restatement of the current state:

- **Outline-archetype recognition**: working. A wing-shaped vs
  conical vs subcircular outline is distinguishable in PARAM.
- **Specimen-level recognition**: NOT working. Within an archetype,
  the PARAM renders are too similar to each other and too unlike the
  actual specimens to invite deeper comparison.

The §3 changes are what would move us from "icons" to "credible
silhouettes." It's not a polish pass — it's a re-think of the valve
geometry pipeline. The current `sideValveClosedPath` + separate
`coil` model has to be replaced with a single integrated path.
