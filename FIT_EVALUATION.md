# Fit evaluation — first-principles review

The IoU plateau (0.7–0.85 for most panels, lower for outliers), the
commissures-still-upside-down observation after the global flip, and
the per-brach inconsistency (some improve with flip, some regress) all
point at deeper problems than any single parameter tweak can fix.
Stepping back.

## 1. What the metrics are actually telling us

| Pattern | Diagnostic |
|---------|-----------|
| **IoU plateau around 0.75 even for well-tuned brachs** | The PARAM silhouettes are *approximately* the right shape but the per-taxon variation within an archetype (Pseudoatrypa vs Spinatrypa, Conispirifer vs Cyrtina) exceeds what a single categorical model can capture. |
| **Commissure Δy is large (>50px) for brachs 2 & 3** | PARAM places cy at the vertical center of the shell bbox, but real specimens have asymmetric dorsal:ventral volumes. The "widest cross-section" in the photo is wherever the shell actually peaks laterally, which depends on the dorsal-ventral inflation ratio. |
| **Anterior flip helps 5/7 brachs, hurts 2/7** | Photo convention isn't uniform. Spiriferids (Conispirifer, Theodossia) appear photographed dorsal-up with fold-up commissure; atrypids, orthids, and strophomenids appear photographed ventral-up with fold-down commissure. The single global flip is the right call for *most* of the collection but wrong for some. |
| **Commissures still upside-down after flip** | The visual flip moved the outer outline but the **internal commissure line direction relative to the fold/sulcus assignment didn't change**. The PARAM was computed under the spiriferid convention (fold on dorsal); flipping just reflects geometry, it doesn't reassign which valve carries the fold. So the commissure line still bends in the wrong direction relative to which valve it should be deflecting toward. |
| **Concavo-convex (brach7) refuses to fit** | The parallel-crescent generator captures the *idea* of concavo-convex but the actual Douvillina specimen has substantially more shell volume than the algorithm produces. There's a real anatomy gap, not just a parameter tweak. |

## 2. Five architectural assumptions that don't hold

### Assumption 1: One PARAM convention works for all brachiopods
**Reality**: brachiopods differ in which valve carries the fold:
- Spiriferids (Cyrtospirifer, Theodossia, Conispirifer): fold on DORSAL, sulcus on VENTRAL → uniplicate tongue points dorsally
- Atrypids (Pseudoatrypa, Spinatrypa): fold on VENTRAL, sulcus on DORSAL → tongue points ventrally
- Orthids (Schizophoria): fold on VENTRAL → tongue points ventrally (some orthids have it reversed)
- Strophomenids: usually no fold, but when present can go either way

A single global render convention CANNOT match all of these even with perfect tuning. The flip helps 5/7 because more than half the collection happens to share the atrypid/orthid convention, but the spiriferids are systematically broken.

### Assumption 2: cy = anatomical commissure plane
**Reality**: I compute every front-view curve relative to cy=100, and the side view places the commissure at cy. But the real commissure plane sits wherever the shell's actual ventral and dorsal valves meet — not at the bbox center. For a heavily dorsibiconvex shell, the commissure is well below center. For a heavily ventribiconvex shell, well above.

The current code's fixed dorsibiconvex bias (dorsalConv > ventralConv) misplaces the commissure for taxa that are roughly equivalve or ventribiconvex.

### Assumption 3: Fold lift = silhouette deflection
**Reality**: I'm folding two distinct things into one model:
1. The outer silhouette curvature (the body convexity profile)
2. The commissure deflection (where the two valves meet)

In real anatomy, the fold/sulcus deflects the COMMISSURE PLANE primarily — the outer silhouette is only secondarily affected by the change in valve thickness at the fold location. My code combines them additively (`body + fold` for dorsal, `body - fold` for ventral), which produces a silhouette where the fold/sulcus dominates the outer shape rather than appearing as a localized feature on an otherwise smooth body.

This is why the diamond looks "too peaked" or "too W" — I'm putting the fold's geometry into the silhouette directly instead of into the commissure layer.

### Assumption 4: Shape archetype + fold = unique render
**Reality**: Within "subcircular biconvex astrophic dome with strong fold" we have:
- Pseudoatrypa (globose, frilly, ventribiconvex)
- Theodossia (very globose, smooth-ish, dorsibiconvex)
- Cranaena (smooth oval, near-equivalve)

These look distinctly different but currently render identically (within the modifier sliders). The categorical model lacks the resolution to separate them.

### Assumption 5: The viewBox stretches to fit
**Reality**: When I scale PARAM bbox to shell bbox, I scale x and y independently. If the PARAM is naturally 1.5:1 and the shell bbox is 1:1, PARAM gets stretched. This distortion can either hide or fabricate shape mismatch:
- Hide: a too-narrow PARAM gets stretched wider to fit a wide shell, looking like it matches
- Fabricate: a correct-shape PARAM gets distorted by mismatched aspect ratios

The IoU metric can't distinguish "wrong shape" from "wrong aspect ratio".

## 3. Three classes of fix, ranked

### Class A — Architectural changes (high impact)

**A1. Add `fold_valve` trait per taxon, parameterize the front render direction.**

Each taxon in the manifest gets a `fold_valve: "dorsal" | "ventral"` field. The slider doesn't expose this directly; it's derived from `(outline, profile, hinge) → fold_valve` lookup:
- `(any, biconvex, strophic) + outline === "wing-shaped"` → spiriferid → dorsal
- `(subcircular, biconvex, astrophic) + frills` → atrypid → ventral
- `(subcircular, biconvex, strophic) + no frills + fold > 0` → orthid → ventral
- etc.

`svgFrontView` reads this and either renders the fold-up convention or the fold-down convention. The internal commissure line direction follows the fold valve assignment. No global flip, no "basically all upside-down" issue.

**A2. Separate the commissure deflection from the body silhouette.**

Rewrite the anterior view as:
- Outer silhouette = body envelope (smooth biconvex/triangular shape, NO fold contribution)
- Internal commissure line = SEPARATE Bezier showing the uniplicate tongue (with proper deflection magnitude and width)
- Surface decorations (ribs, frills, spines) — unchanged

This matches textbook brachiopod anterior diagrams. The silhouette stops trying to encode the fold; it just shows the body shape. The fold reads as the commissure-line peak.

**A3. Aspect-ratio-preserving fit with centroid alignment.**

In the diagnostic harness:
1. Compute the centroid of the shell mask AND the PARAM silhouette
2. Scale PARAM uniformly (single scale factor) so its longest dimension matches the shell's longest dimension
3. Translate PARAM so its centroid aligns with the shell's centroid
4. Then compute IoU on the aligned, uniformly-scaled overlay

This surfaces true shape mismatches rather than masking them with non-uniform stretch.

### Class B — Pedagogical resolution (medium impact)

**B1. Explicit fold-type visual picker.**

Replace the binary "fold strong / weak / none" slider with a 4-choice visual picker:
- Straight (no fold)
- Uniplicate dorsal (commissure peaks UP into the dorsal valve — spiriferid)
- Uniplicate ventral (commissure peaks DOWN into the ventral valve — atrypid/orthid)
- Sulcate dorsal (cut into dorsal valve)

Each choice shows a tiny visual exactly matching what the student would see in anterior view. This eliminates orientation ambiguity at the student-facing layer.

**B2. Explicit "convexity" slider.**

Add: "How fat is the shell from the side?" with options like "thin / moderate / inflated / globose". This maps directly to dorsalConv+ventralConv scaling and lets the student differentiate Pseudoatrypa from Spinatrypa within the same outline+profile combo.

**B3. Use fitted `shape:` data for confirmed candidates.**

The manifest already has fitted parametric data for 4 taxa (Atrypa devoniana, Spinocyrtia iowensis, Pentamerus oblongus, Hebertella occidentalis) — fitted to actual 3D meshes via the morphospace pipeline. These produce noticeably better silhouettes than the categorical model.

When the trait filter narrows to a single taxon (or close to it), switch the build-view PARAM from categorical to the fitted shape. "You picked these traits; here's what the actual shell looks like."

### Class C — Implementation refinements (lower priority)

**C1. Multi-polygon PARAM silhouettes**: render conical as cone-body + dorsal-cap (two separate polygons), concavo-convex as two parallel curves with proper meeting at the hinge. Reduces fill artifacts in the IoU metric.

**C2. Concavo-convex anatomy fix**: real Douvillina has substantial shell mass even though both valves bow the same direction. The generator should produce a curve that REACHES the photo's shell extent vertically.

**C3. Side-view fold visibility**: currently the side-view uniplicate arch is the only way the fold reads in side view, but it's subtle. Real specimens show the fold as a visible RIDGE that runs along the dorsal surface. Could add a stylized ridge line.

## 4. My recommendation for the next iteration

Land Class A in priority order:
- **A1 (fold_valve trait)** is the highest-leverage change. It's the right answer to "commissures upside-down" — currently the convention is hardcoded, this makes it data-driven and per-taxon-correct. Will resolve the brachs 3/6 regression while keeping the atrypid/orthid/strophomenid wins.
- **A3 (aspect-ratio-preserving fit)** clarifies what's really going on with the IoUs. May surface that some "0.85 IoU" panels are actually 0.65 with honest scaling, but at least we'd know.
- **A2 (separate commissure from silhouette)** is the right anatomical fix but invasive — it changes the front-view rendering model fundamentally. Worth doing but I'd defer until A1 lands so we can isolate the impact.

Then evaluate where we are. If Tier-1 leaves the IoU plateau around 0.85, that may just be the achievable ceiling for a categorical model — at which point B3 (use fitted shape data for confirmed candidates) becomes the path to higher fit.

What I'd *not* do: more parameter tweaks. We're past the point of diminishing returns on convexity/handle/fold-magnitude tuning. The remaining gap is structural.
