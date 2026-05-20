# Data folder — notes & deferred features

## Day & Copper 1998 — additional content to pull in later

The full PDF lives at `../../../Refs/app43-155.pdf`. Plates we've already extracted live in `daycopper_pages/` (page renders) and `images/<genus>/rockford/*_daycopper_*.png` (cropped plates):

- Fig. 5 — *Desquamatia (Independatrypa) scutiformis* plate ✓ pulled
- Fig. 8 — *Pseudoatrypa devoniana* plate ✓ pulled
- Fig. 10 — *Pseudoatrypa lineata* plate ✓ pulled
- Fig. 25 — *Spinatrypa (S.) rockfordensis* plate ✓ pulled

To pull another plate, re-render its page with `pdftoppm` and re-crop with the script in this folder's prior turns:

```bash
pdftoppm -png -r 300 -f <PDF_PAGE> -l <PDF_PAGE> ../../../Refs/app43-155.pdf daycopper_pages/page_<N>
```

Publication-page-to-PDF-page offset: PDF page = pub page − 154.

## Stratigraphic context — parked

Useful but **not yet integrated** (per Jonathan's note "let's not dig too deep into local geology yet"):

- **Day & Copper Fig. 1 (p. 156, PDF page 2)** — cross-section of late Eifelian–Frasnian strata of north-central + eastern Iowa, with an inset Iowa map showing locality clusters (A = Floyd Co./Rockford, B = Johnson Co., C = central). Would be a great Rockford-specific reference figure alongside the Quinton & Rygel diagrams.
- **Day & Copper Fig. 2 (p. 157, PDF page 3)** — full stratigraphic + biostratigraphic framework for the Middle–Late Devonian Iowa Basin. Conodont zones + brachiopod zones (*Iowatrypa owenensis*, *Cyrtospirifer whitneyi*, *Douvillina arcuata*, *Nervostrophia thomasi*, *Tenticospirifer shellrockensis*, etc.) tied to formation members. Would power a "what stratigraphic interval did I find this in?" angle.
- **Day & Copper Table 1 (p. 158, PDF page 4)** — atrypid fauna broken down by formation; already used to populate Costatrypa / Iowatrypa entries.

Possible future feature: a *"Stratigraphic context"* card on each taxon detail page showing which member(s) the taxon comes from, with a small inline copy of the relevant slice of Fig. 2.

## PBDB gap analysis

`pbdb_fetch.py` pulls the PBDB and regenerates `pbdb_gaps.md`. Run `--analyze-only` to skip the fetch.

## Treatise H, Brachiopoda Revised (vol. 4) — survey notes

PDF at `../../../Refs/treatise_h_brachiopoda.pdf` (806 pages). This volume covers **Pentamerida + Rhynchonellida only** — atrypids and spiriferids would be in vols. 5–6 (not yet on file). Manuscript-to-PDF page offset: `manuscript = PDF + 881`.

Iowa-relevant content pulled:

| Plate (manuscript / PDF) | Genus illustrated | Iowa relevance | Status |
| --- | --- | --- | --- |
| Fig. 681 (p. 1007 / PDF 126) | *Gypidula typicalis* (type sp., Amsden 1965, Cedar Valley Group Iowa) | Direct | ✓ Extracted → *Gypidula typicalis* (Crawford) |
| Fig. 769 (p. 1133 / PDF 252) | *Camarotoechia congregata* (type sp., Givetian NY) | Genus reference for our *Cupularostrum saxatillis* | ✓ Extracted → cross-ref'd to *Cupularostrum* entry |
| Fig. 771 (p. 1135 / PDF 254) | *Leiorhynchus quadracostata* (type sp., Givetian NY) | Genus reference for our *L. argenteum* | ✓ Extracted → *Leiorhynchus argenteum* (Rockford) |

Diagnostic features added to the manifest from this volume:
- *Leiorhynchus*: "umbones smooth; costae most pronounced on fold/sulcus, weak on flanks; fold/sulcus arise at midlength, not at umbo" — clean discriminator from *Cupularostrum*.
- *Camarotoechia* (= *Cupularostrum* in older lit): "low rounded costae present on flanks AND fold/sulcus; fold/sulcus low + commence at umbones; uniplicate anterior commissure."
- *Gypidula* range: Silurian Telychian–Upper Devonian Frasnian (caps the Rockford *G. cornuta* identification).

### Other Iowa-relevant content in this volume not yet pulled

Lots of Iowa material in the Pentamerida and Rhynchonellida sections — many genera mention Iowa as a locality. To find more, grep the text dump for "Iowa" or "Cedar Valley" or "Lime Creek". Quick recipe:

```bash
pdftotext -layout ../../../Refs/treatise_h_brachiopoda.pdf - | grep -nB1 -A2 "Iowa\|Cedar Valley\|Lime Creek"
```

### Atrypid and spiriferid coverage — pending

The most-Iowa-relevant Treatise volumes (5 and 6) cover atrypids, spiriferids, athyridids, strophomenids, productids, and terebratulids. If those are added to `Refs/`, the same workflow (offset + `pdftoppm + PIL crop`) will pull plates for *Cyrtospirifer*, *Spinatrypa*, *Pseudoatrypa*, *Devonoproductus*, etc. — most of the Rockford fauna.
