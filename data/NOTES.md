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

## Treatise volume map (Refs/treatise/)

Run this rename script first (sandbox blocks writes to `Refs/`, do this from a terminal):

```bash
cd ../../../Refs/treatise
mv "admin,+HR1-X.pdf"  treatise_revised_vol1.pdf
mv "admin,+HR23-X.pdf" treatise_revised_vol2-3.pdf
mv "admin,+HR4-X.pdf"  treatise_revised_vol4.pdf
mv "admin,+HR5-X.pdf"  treatise_revised_vol5.pdf
mv "admin,+HR6-X.pdf"  treatise_revised_vol6_supplement.pdf
mv H12-X1.pdf treatise_1965_vol1.pdf
mv H12-X2.pdf treatise_1965_vol2.pdf
rm treatise_h_brachiopoda.pdf   # identical to vol4
```

| Volume file (after rename) | Orders covered | Manuscript pg range | Our genera in scope | Page→PDF offset |
| --- | --- | --- | --- | --- |
| `treatise_revised_vol1.pdf` | Intro + general morphology | 1–559 | (background only) | n/a |
| `treatise_revised_vol2-3.pdf` | Linguliformea, Craniiformea, **Strophomenata**, **Productida** (350+), Orthida (714+) | 1–965 | *Douvillina, Strophodonta, Nervostrophia, Moravostrophia, Strophonelloides, Sulcatostrophia, Schuchertella, Devonoproductus, Productella, Schizophoria, Schuchertella* | TBD |
| `treatise_revised_vol4.pdf` | **Pentamerida** (921+), **Rhynchonellida** (1027+) | 921–1688 | ✓ done: *Gypidula, Cupularostrum, Leiorhynchus* | manuscript = PDF + 881 |
| `treatise_revised_vol5.pdf` | **Spiriferida** (1689+), Spiriferinida, Thecideida, Atrypida, Athyridida, Terebratulida | 1689–~2370 | *Cyrtospirifer, Theodossia, Cyrtina, Ambocoelia, Tylothyris, Tecnocyrtina, Platyrachella, Tenticospirifer, Pyramidspirifer, Conispirifer, Pseudoatrypa, Spinatrypa, Desquamatia, Hystricina, Iowatrypa, Costatrypa, Allanella, Riqauxia, Athyris, Cranaena, Cranaenella* | **manuscript = PDF + 1642** |
| `treatise_revised_vol6_supplement.pdf` | Linguliformea, Protorthida, Orthida, Pentamerida, Rhynchonellida, Athyridida (updates) | 2532+ | Schizophoria + Athyris (suppl. data) | TBD |
| `treatise_1965_vol1.pdf` | Original 1965 Part H vol 1 | — | older treatments — only consult if revised vols miss something | n/a |
| `treatise_1965_vol2.pdf` | Original 1965 Part H vol 2 | — | older treatments | n/a |

### Vol 5 trait extraction — recipe for a future pass

```bash
# Find PDF page for a manuscript page, given offset 1642:
#   manuscript page 1722 (Cyrtospirifer) → PDF page 80
pdftotext -layout -f 84 -l 85 Refs/treatise/treatise_revised_vol5.pdf - | \
  sed -n '/Cyrtospirifer N/,/^$/p'
```

Already confirmed:
- *Cyrtospirifer* diagnosis (Vol 5 p. 1722, PDF ~80) — our existing trait tags align: "medium to large, ventribiconvex, transverse, cardinal angles acute auriculate, fold/sulcus broad well-defined, numerous simple costae." 

Workflow for any genus:
1. Find the page in the relevant volume (use the offset).
2. `pdftotext` that page range.
3. Look for the genus name in **bold-equivalent** position (e.g., `GenusName AUTHOR, year, p. xx`).
4. Read the diagnosis; tighten our `traits: {…}` accordingly.
5. To extract a plate, `pdftoppm` the page at 300 DPI and crop with the PIL recipe in this folder's history.

## Future-site expansion

PBDB JSON for the 4 new sites lives in `pbdb_new_sites/` (Maquoketa, Elgin, Scotch Grove, Anamosa). Top species per site are noted in NOTES; stub taxa are added to `manifest.js` with `sites: [...]` tags but without `traits` — they appear in candidate lists until a contradicting answer (per Jonathan's policy).

To extend further: re-run `python3 data/pbdb_fetch.py`-style queries for any new locality, identify the top PBDB taxa, add stubs to FAUNA, and tag traits using the Treatise as available.
