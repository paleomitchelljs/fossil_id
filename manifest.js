// Field-guide manifest — multi-site capable.
//
// Image path layout:
//   images/<genus-dir>/<site>/<species>_<source>_<NN>.<ext>
//
// <genus-dir> is auto-derived from `taxon.genus` (lowercased, non-alnum → "_").
// Override with `dir:` on the taxon for pseudo-genus group shots
// (e.g. "Horn corals" → "horn_corals", "Gastropods (assorted)" → "gastropods_misc").
//
// Each image entry only specifies its file name (no path). Optional `site:`
// on an image overrides the default of `taxon.sites[0]` — useful only when
// a contributor's photo of a multi-site taxon comes from a specific site.
// See README.md for the full workflow.

const SITES = [
  {
    id: "rockford",
    title: "Rockford (Floyd Co., Iowa)",
    subtitle: "Late Devonian (Frasnian)",
    formation: "Lime Creek Fm — Cerro Gordo Member / Lithograph City Fm / Shell Rock Fm",
    location: "Rockford Fossil & Prairie Park, north-central Iowa",
    blurb: "Classic Frasnian fauna dominated by brachiopods, with rugose corals, paracyclid bivalves, gastropods, crinoid columnals, and bryozoans."
  },
  {
    id: "crawford",
    title: "Crawford Quarry",
    subtitle: "Middle Devonian (Givetian)",
    formation: "Cedar Valley Group — Coralville / Little Cedar Fms",
    location: "Johnson Co., eastern Iowa",
    blurb: "Givetian Cedar Valley fauna — large atrypid brachiopods (Pseudoatrypa lineata, Spinatrypa bellula), the Allanella allani zone fauna, colonial rugose corals, and abundant crinoid columnals."
  },
  {
    id: "graf",
    title: "Graf section",
    subtitle: "Late Ordovician (Cincinnatian)",
    formation: "Maquoketa Group — Elgin / Clermont / Brainard Mbrs",
    location: "Graf, Dubuque Co., eastern Iowa",
    blurb: "Diverse Late Ordovician fauna: crinoids (Carabocrinus, Cupulocrinus, Dendrocrinus, Porocrinus), cystoids (Iowacystis), small brachiopods, nautiloid orthocones, ostracods, bryozoans."
  },
  {
    id: "elgin-clement",
    title: "Elgin-Clement trilobite sites",
    subtitle: "Late Ordovician (Cincinnatian)",
    formation: "Maquoketa Group — Elgin Member",
    location: "Northeast Iowa (Fayette/Winneshiek Co.)",
    blurb: "Famous trilobite-bearing Maquoketa exposures: Isotelus and other asaphids, plus brachiopods (Plaesiomys, Thaerodonta, Megamyonia), rugose horn corals (Grewingkia), orthocone nautiloids."
  },
  {
    id: "maquoketa-caves",
    title: "Maquoketa Caves limestones",
    subtitle: "Silurian (Llandovery–Wenlock)",
    formation: "Hopkinton Dolomite (Maquoketa Caves State Park, Iowa)",
    location: "Maquoketa Caves State Park, Jackson Co., eastern Iowa",
    blurb: "Silurian carbonate fauna in cave-bearing dolomite: brachiopods, tabulate corals (Halysites, Favosites), large Eucalyptocrinites crinoids. (Stratigraphy assignment provisional — confirm before relying on it.)"
  },
  {
    id: "anamosa",
    title: "Anamosa limestone",
    subtitle: "Late Silurian (Wenlock)",
    formation: "Scotch Grove Formation — Anamosa Member",
    location: "Anamosa, Jones Co., eastern Iowa",
    blurb: "Late Silurian carbonate sequence: Atrypa reticularis, pentamerid (Costistricklandia), chain corals (Halysites), honeycomb corals (Favosites), Calymene trilobites, large Eucalyptocrinites crinoids."
  }
];

const SOURCES = {
  nathan:    { label: "Nathan — Rockford Iowa brachiopods album", url: "https://imgur.com/a/rockford-iowa-brachiopods-iHLNl" },
  dave:      { label: "Dave — Views of the Mahantango", url: "https://vmnhpaleontology.wordpress.com/" },
  eqmn:      { label: "EquatorialMinnesota blog", url: "" },
  jsm:       { label: "J. Mitchell", url: "" },
  daycopper: { label: "Day & Copper (1998), Acta Palaeontologica Polonica 43(2)",
               url: "https://www.app.pan.pl/archive/published/app43/app43-155.pdf" },
  stigallrode: { label: "Stigall Rode (2005), J. Syst. Palaeontology 3(2):133–167",
                 url: "https://doi.org/10.1017/S1477201905001537" },
  treatise:  { label: "Treatise on Invertebrate Paleontology, Part H Brachiopoda Revised, vol. 4 (2002, Kaesler ed.)",
               url: "" },
  unk:       { label: "Source unknown", url: "" }
};

const FAUNA = [
  {
    id: "brachiopods",
    title: "Brachiopods",
    blurb: "Bilaterally symmetric across the shell midline (not between valves). The dominant Rockford fossil — most of what you pick up will be here.",
    subgroups: [
      {
        id: "spiriferids",
        title: "Spiriferid brachiopods",
        blurb: "Wing-shaped outline, prominent fold & sulcus, many fine ribs.",
        taxa: [
          { genus: "Cyrtospirifer", species: "whitneyi", sites: ["rockford"],
            note: "Wide-winged; deep sulcus; many fine ribs.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "wing-shaped", size: "medium", umbones: "ribbed" },
            images: [
              { file: "whitneyi_nathan_01.jpg", src: "nathan" },
              { file: "whitneyi_dave_01.jpg",   src: "dave"   },
              { file: "whitneyi_dave_02.jpg",   src: "dave"   },
              { file: "whitneyi_jsm_01.png",    src: "jsm"    }
            ] },
          { genus: "Theodossia", species: "hungerfordi", sites: ["rockford"],
            note: "Globose, rounded outline; subdued ribs. Spiriferid by anatomy but the hinge is short — students often perceive it as astrophic.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: ["strophic", "astrophic"], spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "hungerfordi_nathan_01.jpg", src: "nathan" },
              { file: "hungerfordi_dave_01.jpg",   src: "dave"   },
              { file: "hungerfordi_eqmn_01.png",   src: "eqmn"   }
            ] },
          { genus: "Platyrachella", species: "macbridei", sites: ["rockford"],
            note: "Wide hinge; sharp ribs; flatter ventral valve. Sometimes placed in Spinocyrtia.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "wing-shaped", size: "medium", umbones: "ribbed" },
            images: [
              { file: "macbridei_nathan_01.jpg", src: "nathan" },
              { file: "macbridei_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Tenticospirifer", species: "sp.", sites: ["rockford"],
            note: "Tall, pyramidal ventral valve.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [
              { file: "sp_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Pyramidspirifer", species: "sp.", sites: ["rockford"],
            note: "Steep, pyramid-form spiriferid.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [
              { file: "sp_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Conispirifer", species: "cyrtinaeformis", sites: ["rockford"],
            note: "Narrow, cone-shaped; coarse ribs. Often listed in PBDB as Tenticospirifer cyrtinaeformis.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [
              { file: "cyrtinaeformis_nathan_01.jpg", src: "nathan" },
              { file: "cyrtinaeformis_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Cyrtina", species: "iowaensis", sites: ["rockford"],
            note: "Small, sharply pyramidal; punctate shell.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [
              { file: "iowaensis_nathan_01.jpg", src: "nathan" },
              { file: "iowaensis_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Ambocoelia", species: "sp.", sites: ["rockford"],
            note: "Small, smooth-ish spiriferid with reduced ribbing. PBDB: 6 records at Rockford.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "weak", outline: "subcircular", size: "small", umbones: "smooth" },
            images: [] },
          { genus: "Tylothyris", species: "sulcocostata", sites: ["rockford"],
            note: "Small spiriferid; sulcate fold with strong costae. PBDB: 3 records.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [] },
          { genus: "Tecnocyrtina", species: "johnsoni", sites: ["crawford"],
            note: "Late Givetian Cedar Valley spiriferid (Johnson, 1990). Small-to-medium; clear fold/sulcus; fine ribs. Associated with the Allanella allani Zone (D&C fig. 2).",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [] }
        ]
      },
      {
        id: "atrypids",
        title: "Atrypid brachiopods",
        blurb: "Round to subcircular, biconvex, ribbed, often with concentric growth frills.",
        taxa: [
          { genus: "Pseudoatrypa", species: "devoniana", sites: ["rockford"],
            note: "Subcircular, dorsibiconvex; fine tubular ribs; concentric growth frills. By far the most abundant atrypid at Rockford (Day & Copper 1998 plate from Cerro Gordo Mbr at Hackberry Grove and Rockford Quarry).",
            traits: { surface_ribs: "yes", surface_frills: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "devoniana_nathan_01.jpg",    src: "nathan"    },
              { file: "devoniana_dave_01.jpg",      src: "dave"      },
              { file: "devoniana_eqmn_01.png",      src: "eqmn"      },
              { file: "devoniana_daycopper_01.png", src: "daycopper" },
              { file: "devoniana_jsm_01.png",       src: "jsm"       }
            ] },
          { genus: "Pseudoatrypa", species: "lineata", sites: ["rockford"],
            note: "Larger than P. devoniana; globose dorsibiconvex shell with an inflated dome-like dorsal valve; broad angular fold. Idlewild Mbr of the Lithograph City Fm, Floyd Co. (Day & Copper 1998). Per D&C also occurs in the Cedar Valley Group (Coralville Fm / State Quarry) — tag for Crawford once specimens are confirmed.",
            traits: { surface_ribs: "yes", surface_frills: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "large", umbones: "ribbed" },
            images: [
              { file: "lineata_daycopper_01.png", src: "daycopper" }
            ] },
          { genus: "Spinatrypa", species: "planosulcata", sites: ["rockford"],
            note: "Globose, spinose; flat sulcus.",
            traits: { surface_ribs: "yes", surface_frills: "yes", surface_spines: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "weak", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "planosulcata_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Spinatrypa", species: "rockfordensis", sites: ["rockford"],
            note: "Medium-to-large; biconvex to dorsibiconvex; wider than long with rounded outline; coarse undulating ribs (4–7/10 mm); spinose lamellae. Holotype from Rockford Quarry (Day & Copper 1998).",
            traits: { surface_ribs: "yes", surface_frills: "yes", surface_spines: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "weak", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "rockfordensis_nathan_01.jpg",    src: "nathan"    },
              { file: "rockfordensis_unk_01.webp",      src: "unk"       },
              { file: "rockfordensis_daycopper_01.png", src: "daycopper" }
            ] },
          { genus: "Spinatrypa", species: "sp.", sites: ["rockford"],
            note: "Generic spinatrypid view.",
            traits: { surface_ribs: "yes", surface_frills: "yes", surface_spines: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "weak", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "sp_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Desquamatia", species: "(Independatrypa) scutiformis", sites: ["rockford"],
            note: "Strophic, shield-shaped; dorsibiconvex with coarse imbricate growth lamellae. Type Lime Creek / Lithograph City Fm taxon (Stainbrook 1938; plate from Day & Copper 1998 Fig. 5).",
            traits: { surface_ribs: "yes", surface_frills: "yes", profile: "biconvex", hinge: ["strophic", "astrophic"], spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "independatrypa_eqmn_01.png",                src: "eqmn"      },
              { file: "independatrypa_scutiformis_daycopper_01.png", src: "daycopper" }
            ] },
          { genus: "Hystricina", species: "trulla", sites: ["rockford"],
            note: "Small; densely spinose surface.",
            traits: { surface_ribs: "yes", surface_frills: "yes", surface_spines: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "weak", outline: "subcircular", size: "small", umbones: "ribbed" },
            images: [
              { file: "trulla_eqmn_01.png", src: "eqmn" }
            ] },
          { genus: "Costatrypa", species: "varicostata", sites: ["rockford"],
            note: "Late Frasnian Lime Creek Fm atrypid (Stainbrook 1945); listed by Day & Copper 1998 as part of the standard Lime Creek atrypid fauna. PBDB: 1 record.",
            traits: { surface_ribs: "yes", surface_frills: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [] },
          { genus: "Iowatrypa", species: "owenensis", sites: ["rockford"],
            note: "Late Frasnian Lime Creek Fm atrypid (Webster, 1921); zone fossil for the uppermost Lime Creek (M.N. Zone 13 — 'Iowatrypa owenensis Zone'). Day & Copper 1998.",
            traits: { surface_ribs: "yes", surface_frills: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [] },
          { genus: "Iowatrypa", species: "minor", sites: ["rockford"],
            note: "Smaller congener of I. owenensis in the Lime Creek Fm fauna (Fenton & Fenton, 1924). Day & Copper 1998.",
            traits: { surface_ribs: "yes", surface_frills: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "small", umbones: "ribbed" },
            images: [] },
          { genus: "Spinatrypa", species: "bellula", sites: ["crawford"],
            note: "Cedar Valley Group atrypid (Hall, 1858). Globose, spinose; smaller and less coarsely ribbed than the Frasnian S. rockfordensis.",
            traits: { surface_ribs: "yes", surface_frills: "yes", surface_spines: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "weak", outline: "subcircular", size: "small", umbones: "ribbed" },
            images: [] },
          { genus: "Allanella", species: "allani", sites: ["crawford"],
            note: "Zone fossil for the Allanella allani Zone (latest Givetian–earliest Frasnian), spanning upper Cedar Valley into lowermost Lithograph City. Small-to-medium dorsibiconvex atrypid with fine ribs. Day & Copper 1998 fig. 2.",
            traits: { surface_ribs: "yes", surface_frills: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: ["small", "medium"], umbones: "ribbed" },
            images: [] }
        ]
      },
      {
        id: "athyridids",
        title: "Athyridid brachiopods",
        blurb: "Smooth or nearly smooth, oval to subcircular; faint concentric growth lines.",
        taxa: [
          { genus: "Riqauxia", species: "orestes", sites: ["rockford"],
            note: "Smooth, oval; subtle growth lines. PBDB sometimes lists as 'Spirifer orestes'.",
            traits: { profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "weak", outline: "elongate-oval", size: "medium", umbones: "smooth" },
            images: [
              { file: "orestes_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Athyris", species: "vittata", sites: ["crawford"],
            note: "Smooth-shelled athyrid common in Iowa Cedar Valley Group. Subcircular, biconvex, with faint concentric growth lines.",
            traits: { profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "weak", outline: "subcircular", size: "medium", umbones: "smooth" },
            images: [] }
        ]
      },
      {
        id: "strophomenids",
        title: "Strophomenid & strophomenide-like brachiopods",
        blurb: "Wide hinge line, flat to concavo-convex; fine radial costae.",
        taxa: [
          { genus: "Douvillina", species: "arcuata", sites: ["rockford"],
            note: "Concavo-convex; geniculate margin; fine ribs.",
            traits: { surface_ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent", fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "arcuata_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Strophodonta", species: "sp.", sites: ["rockford"],
            note: "Very wide hinge; fine ribs; no pedicle foramen. Most Rockford specimens are S. thomasi. (Cedar Valley Strophodonta — usually S. callawayensis — exists but isn't yet tagged for Crawford pending specimen confirmation.)",
            traits: { surface_ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent", fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "sp_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Nervostrophia", species: "rockfordensis", sites: ["rockford"],
            note: "Strong primary costae alternating with finer ones.",
            traits: { surface_ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent", fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "rockfordensis_nathan_01.jpg", src: "nathan" },
              { file: "rockfordensis_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Moravostrophia", species: "sp.", sites: ["rockford"],
            note: "Wide-hinged; very fine costae.",
            traits: { surface_ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent", fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "sp_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Strophonelloides", species: "reversa", sites: ["rockford"],
            note: "Strongly resupinate — convexity reverses across growth. (Older lit: Strophonella reversa.)",
            traits: { surface_ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent", fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "reversa_nathan_01.jpg", src: "nathan" },
              { file: "reversa_dave_01.jpg",   src: "dave"   },
              { file: "reversa_eqmn_01.png",   src: "eqmn"   }
            ] },
          { genus: "Sulcatostrophia", species: "camerata", sites: ["rockford"],
            note: "Sulcate; fine costae. (Older spelling: Sulcastrophia.)",
            traits: { surface_ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "camerata_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Schuchertella", species: "sp.", sites: ["rockford"],
            note: "Concavo-convex; coarser costae than most strophomenes. Most Rockford specimens are S. parva.",
            traits: { surface_ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent", fold_sulcus: ["absent", "weak"], outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "sp_dave_01.jpg", src: "dave" }
            ] }
        ]
      },
      {
        id: "productids",
        title: "Productid brachiopods",
        blurb: "Strongly concavo-convex, no interarea; usually with spines (often broken off, leaving bases).",
        taxa: [
          { genus: "Devonoproductus", species: "sp.", sites: ["rockford"],
            note: "Highly convex ventral valve; spine bases on shell. Most Rockford specimens are D. walcotti.",
            traits: { surface_ribs: "yes", surface_spines: "yes", profile: "concavo-convex", hinge: ["strophic", "astrophic"], spines: "present", fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: ["ribbed", "smooth"] },
            images: [
              { file: "sp_nathan_01.jpg", src: "nathan" },
              { file: "sp_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Productella", species: "sp.", sites: ["rockford"],
            note: "Second productid genus at Rockford — smaller, less inflated than Devonoproductus. PBDB: 9 records.",
            traits: { surface_ribs: "yes", surface_spines: "yes", profile: "concavo-convex", hinge: ["strophic", "astrophic"], spines: "present", fold_sulcus: "absent", outline: "subcircular", size: ["small", "medium"], umbones: ["ribbed", "smooth"] },
            images: [] }
        ]
      },
      {
        id: "pentamerids",
        title: "Pentamerid brachiopods",
        blurb: "Globose; pronounced fold along midline; can resemble atrypids but with a keel-like ridge.",
        taxa: [
          { genus: "Gypidula", species: "cornuta", sites: ["rockford"],
            note: "Globose; strong median fold; smooth or coarsely ribbed. Frasnian-aged form within the genus range (Treatise: *Gypidula* spans Silurian Telychian–Upper Devonian Frasnian).",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: ["ribbed", "smooth"] },
            images: [
              { file: "cornuta_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Gypidula", species: "typicalis", sites: ["crawford"],
            note: "Type species of *Gypidula* (HALL, 1867); illustrated from the Cedar Valley Group of Iowa (Amsden 1965). Ventribiconvex; well-developed dorsal sulcus and ventral fold; lyre-shaped hinge plates visible in serial section. Treatise Fig. 681,2a–d.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: ["ribbed", "smooth"] },
            images: [
              { file: "typicalis_treatise_01.png", src: "treatise" }
            ] }
        ]
      },
      {
        id: "orthids",
        title: "Orthid brachiopods",
        blurb: "Subcircular, biconvex, finely costate.",
        taxa: [
          { genus: "Schizophoria", species: "iowensis", sites: ["rockford", "crawford"],
            note: "Medium-sized, dorsibiconvex; transversely ovate outline; short hinge with truncated cardinal extremities; moderately to highly developed fold + sulcus; fine costae. Givetian Cedar Valley Group → Frasnian Lime Creek Fm. Two morphotypes recognized — 'A' (subcircular) and 'B' (transverse, formerly *macfarlanii*). Stigall Rode 2005 synonymises *S. macfarlanii* and *S. iowaensis* (older spelling) into *S. iowensis*. The Stigall Rode plate shows panel 3 = *iowensis* lectotype, panels 5–7 = *macfarlanii* (now *iowensis* 'B').",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: ["strophic", "astrophic"], spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "iowensis_nathan_01.jpg",      src: "nathan"                  },
              { file: "iowensis_dave_01.jpg",        src: "dave"                    },
              { file: "iowensis_eqmn_01.png",        src: "eqmn"                    },
              { file: "iowensis_jsm_01.png",         src: "jsm"                     },
              { file: "iowensis_jsm_01.png",         src: "jsm", site: "crawford"   },
              { file: "iowensis_stigallrode_01.png", src: "stigallrode"             }
            ] },
          { genus: "Schizophoria", species: "magna", sites: ["rockford", "crawford"],
            note: "Larger, more inflated congener of *S. iowensis*; longer hinge line, wider dorsal umbonal angle, narrower delthyrium. Givetian Cedar Valley Lst → Frasnian Lime Creek Fm of Iowa (Stigall Rode 2005). Field-distinguishing *S. magna* from *S. iowensis* is morphometric — note coexistence at both Iowa sites. Plate panels 1 and 2a/2b in the shared Stigall Rode figure are *magna*.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: ["strophic", "astrophic"], spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "large", umbones: "ribbed" },
            images: [
              { file: "iowensis_stigallrode_01.png", src: "stigallrode", note: "Comparative plate; panels 1, 2a, 2b = magna" }
            ] }
        ]
      },
      {
        id: "rhynchonellids",
        title: "Rhynchonellid brachiopods",
        blurb: "Small, triangular outline, coarse ribs, deep sulcus.",
        taxa: [
          { genus: "Cupularostrum", species: "saxatillis", sites: ["rockford"],
            note: "Triangular; coarsely ribbed; deep sulcus. Older lit places this in *Camarotoechia* (per Treatise: low rounded costae present on flanks AND fold/sulcus, fold/sulcus low + commencing at umbones, anterior commissure uniplicate). Treatise Fig. 769,1a–b illustrates the Camarotoechia type species *C. congregata* for genus comparison.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "strong", outline: "subcircular", size: "small", umbones: "ribbed" },
            images: [
              { file: "saxatillis_nathan_01.jpg", src: "nathan" },
              { file: "camarotoechia_congregata_treatise_01.png", src: "treatise" }
            ] },
          { genus: "Leiorhynchus", species: "argenteum", sites: ["rockford"],
            note: "Subcircular to transversely ovate; biconvex. **Diagnostic:** umbones smooth; costae low and simple, most pronounced on fold/sulcus and weak on flanks (per Treatise diagnosis). Fold + sulcus arise at midlength, not at umbo — distinguishes from *Cupularostrum*/*Camarotoechia*. Treatise Fig. 771,1a–o shows type species *L. quadracostata*.",
            traits: { surface_ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "weak", outline: "subcircular", size: ["small", "medium"], umbones: "smooth" },
            images: [
              { file: "quadracostata_treatise_01.png", src: "treatise" }
            ] }
        ]
      },
      {
        id: "terebratulids",
        title: "Terebratulid brachiopods",
        blurb: "Smooth, elongate-oval shells with no ribs.",
        taxa: [
          { genus: "Cranaena", species: "navicella", sites: ["rockford"],
            note: "Smooth oval shell; no costae.",
            traits: { profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "absent", outline: "elongate-oval", size: "medium", umbones: "smooth" },
            images: [
              { file: "navicella_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Cranaenella", species: "sp.", sites: ["rockford"],
            note: "Smaller, more elongate terebratulid; rarer than Cranaena. PBDB: 5 records.",
            traits: { profile: "biconvex", hinge: "astrophic", spines: "absent", fold_sulcus: "absent", outline: "elongate-oval", size: "small", umbones: "smooth" },
            images: [] }
        ]
      },

      // -------- Ordovician (Maquoketa) + Silurian (Anamosa) stubs --------
      // No traits yet — they stay in candidate lists until tagged. PBDB ranks per site
      // in data/pbdb_new_sites/.
      {
        id: "ord-orthids",
        title: "Ordovician orthid brachiopods",
        blurb: "Maquoketa Group orthids — Cincinnatian Iowa.",
        taxa: [
          { genus: "Plaesiomys", species: "subquadrata", sites: ["graf", "elgin-clement"],
            note: "Common Ordovician orthid in the Maquoketa Group. PBDB top taxon at Elgin (3 records).",
            images: [] },
          { genus: "Paucicrura", species: "corpulenta", sites: ["graf", "elgin-clement"],
            note: "Small Ordovician orthid; reported from Elgin Mbr.",
            images: [] }
        ]
      },
      {
        id: "ord-strophomenids",
        title: "Ordovician strophomenid brachiopods",
        blurb: "Maquoketa Group strophomenides.",
        taxa: [
          { genus: "Megamyonia", species: "unicostata", sites: ["graf", "elgin-clement"],
            note: "Common Ordovician strophomenid (PBDB: 4 records at Graf, 2 at Elgin).",
            images: [] },
          { genus: "Thaerodonta", species: "saxea", sites: ["elgin-clement"],
            note: "Strophomenid in the Elgin Mbr.",
            images: [] }
        ]
      },
      {
        id: "sil-brachs",
        title: "Silurian brachiopods (Anamosa fauna)",
        blurb: "Late Silurian carbonate brachiopods of the Anamosa Mbr / Hopkinton Dolomite.",
        taxa: [
          { genus: "Atrypa", species: "reticularis", sites: ["anamosa", "maquoketa-caves"],
            note: "Classic Silurian atrypid — globose, ribbed, with concentric growth lamellae. PBDB: 11 records at Anamosa.",
            images: [] },
          { genus: "Costistricklandia", species: "castellana", sites: ["anamosa"],
            note: "Late Silurian pentamerid — globose, with strong median fold. PBDB: 11 records.",
            images: [] },
          { genus: "Ferganella", species: "sp.", sites: ["anamosa"],
            note: "Silurian rhynchonellid. PBDB: 13 records.",
            images: [] },
          { genus: "Resserella", species: "sp.", sites: ["anamosa"],
            note: "Silurian orthid. PBDB: 9 records.",
            images: [] },
          { genus: "Isorthis", species: "sp.", sites: ["anamosa"],
            note: "Silurian orthid. PBDB: 9 records.",
            images: [] }
        ]
      }
    ]
  },

  // ========== Trilobites (Ordovician + Silurian sites) ==========
  {
    id: "trilobites",
    title: "Trilobites",
    blurb: "Three-lobed arthropods. Found in Ordovician Maquoketa exposures (Elgin) and Silurian Anamosa beds.",
    subgroups: [
      {
        id: "asaphids",
        title: "Asaphid trilobites",
        blurb: "Large, oval-outlined trilobites with smooth or weakly furrowed glabellae.",
        taxa: [
          { genus: "Isotelus", species: "sp.", sites: ["elgin-clement"],
            note: "Large Ordovician asaphid trilobite — the classic Iowa Maquoketa trilobite. PBDB: 2 records at Elgin.",
            images: [] }
        ]
      },
      {
        id: "calymenids",
        title: "Calymenid trilobites",
        blurb: "Medium-sized trilobites with strongly furrowed glabella and many thoracic segments.",
        taxa: [
          { genus: "Calymene", species: "sp.", sites: ["anamosa"],
            note: "Common Silurian calymenid. PBDB: 11 records at Anamosa.",
            images: [] }
        ]
      },
      {
        id: "corynexochids",
        title: "Corynexochid trilobites",
        blurb: "Trilobites with elongate glabella reaching the anterior border.",
        taxa: [
          { genus: "Stenopareia", species: "sp.", sites: ["anamosa"],
            note: "Silurian corynexochid (likely Bumastella-related). PBDB: 11 records.",
            images: [] }
        ]
      }
    ]
  },

  {
    id: "corals",
    title: "Corals",
    blurb: "Solitary rugose 'horn corals' and clusters. Look for the radial septa inside the calice.",
    subgroups: [
      {
        id: "rugose",
        title: "Rugose (horn) corals",
        blurb: "Single conical or clustered cup-shaped corals; radial septa visible in cross-section.",
        taxa: [
          { genus: "Horn corals", species: "(assorted)", sites: ["rockford"], dir: "horn_corals",
            note: "Fragmentary rugose corals — typical Rockford finds; usually Tabulophyllum or Heliophyllum.",
            images: [
              { file: "assorted_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Horn corals", species: "(cluster)", sites: ["rockford"], dir: "horn_corals",
            note: "Multiple calices clustered on a single piece.",
            images: [
              { file: "cluster_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Tabulophyllum", species: "sp.", sites: ["rockford"],
            note: "Solitary rugose coral with well-developed tabulae. Most diverse horn-coral genus at Rockford (8+ species in PBDB).",
            images: [] },
          { genus: "Heliophyllum", species: "solidum", sites: ["rockford"],
            note: "Solitary rugose coral; carinate septa giving 'feathered' appearance in cross-section. PBDB: 4 records.",
            images: [] },
          { genus: "Hexagonaria", species: "sp.", sites: ["crawford"],
            note: "Colonial rugose coral — typical 'honeycomb' polygonal corallites in cross-section. Common in Cedar Valley Group of Iowa.",
            images: [] },
          { genus: "Grewingkia", species: "sp.", sites: ["elgin-clement"],
            note: "Common Ordovician horn coral in the Maquoketa Group.",
            images: [] }
        ]
      },
      {
        id: "tabulate",
        title: "Tabulate corals",
        blurb: "Colonial corals with horizontal partitions (tabulae) and no/very simple septa. Dominant Silurian corals at Anamosa.",
        taxa: [
          { genus: "Halysites", species: "sp.", sites: ["anamosa", "maquoketa-caves"],
            note: "'Chain coral' — corallites linked end-to-end in chain-like rows when viewed in cross-section. Silurian diagnostic. PBDB top coral at Anamosa (17 records).",
            images: [] },
          { genus: "Favosites", species: "sp.", sites: ["anamosa", "maquoketa-caves"],
            note: "'Honeycomb coral' — polygonal corallites packed tightly together in a colony. PBDB: 13 records at Anamosa.",
            images: [] },
          { genus: "Heliolites", species: "sp.", sites: ["anamosa"],
            note: "Tabulate coral with small corallites separated by coenenchyme (mesh-like tissue between).",
            images: [] }
        ]
      }
    ]
  },

  {
    id: "mollusks",
    title: "Mollusks",
    blurb: "Gastropods (snails) and bivalves. Less common than brachiopods but distinctive when present.",
    subgroups: [
      {
        id: "gastropods",
        title: "Gastropods",
        blurb: "Coiled snails; usually preserved as internal molds.",
        taxa: [
          { genus: "Gastropods", species: "(assorted)", sites: ["rockford"], dir: "gastropods_misc",
            note: "Range of sizes/coiling; commonly internal molds.",
            images: [
              { file: "assorted_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Gastropods", species: "(large)", sites: ["rockford"], dir: "gastropods_misc",
            note: "Large internal mold; spire often abraded.",
            images: [
              { file: "large_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Floyda", species: "gigantea", sites: ["rockford"],
            note: "Large, low-spired Euomphalid gastropod — diagnostic Rockford taxon. PBDB: 4+ records.",
            images: [] },
          { genus: "Diaphorostoma", species: "antiquum", sites: ["rockford"],
            note: "Globose, low-spired gastropod with broad aperture. PBDB: 6 records across species.",
            images: [] },
          { genus: "Straparollus", species: "sp.", sites: ["rockford"],
            note: "Flat-spired euomphaloid gastropod; tightly coiled disc. PBDB: 5 records.",
            images: [] }
        ]
      },
      {
        id: "bivalves",
        title: "Bivalves",
        blurb: "Two-valved shells, symmetry between valves (contrast with brachiopods).",
        taxa: [
          { genus: "Paracyclas", species: "sabini", sites: ["rockford"],
            note: "Subcircular, low-relief growth lines. PBDB also lists P. elliptica, parvula, dubia at Rockford.",
            images: [
              { file: "sabini_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Bivalves", species: "(assorted large)", sites: ["rockford"], dir: "bivalves_misc",
            note: "Rounded, smooth-shelled bivalves.",
            images: [
              { file: "large_assorted_dave_01.jpg", src: "dave" }
            ] }
        ]
      },
      {
        id: "cephalopods",
        title: "Cephalopods",
        blurb: "Chambered shells with internal septa. Ordovician/Silurian Iowa fauna has both orthocone (straight) and coiled forms.",
        taxa: [
          { genus: "Isorthoceras", species: "sociale", sites: ["elgin-clement"],
            note: "Straight (orthocone) Ordovician nautiloid in the Maquoketa Group. PBDB: 2 records at Elgin.",
            images: [] }
        ]
      }
    ]
  },

  {
    id: "echinoderms",
    title: "Echinoderms",
    blurb: "Almost entirely disarticulated crinoid ossicles. Whole calyxes are rare.",
    subgroups: [
      {
        id: "crinoids",
        title: "Crinoids",
        blurb: "Disc-shaped columnals (stem segments) and stem fragments.",
        taxa: [
          { genus: "Crinoids", species: "columnals", sites: ["rockford"], dir: "crinoids_misc",
            note: "Stem discs and segments; star-shaped lumen common.",
            images: [
              { file: "columnals_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Cupulocrinus", species: "angustatus", sites: ["graf"],
            note: "Common Ordovician crinoid in the Maquoketa Group at Graf. Cupulate calyx.",
            images: [] },
          { genus: "Carabocrinus", species: "slocomi", sites: ["graf"],
            note: "Porocrinid crinoid — Maquoketa Group, Graf area. Top PBDB taxon at Graf (7 records).",
            images: [] },
          { genus: "Eucalyptocrinites", species: "ornatus", sites: ["anamosa"],
            note: "Large Silurian camerate crinoid with characteristic cup-like calyx. PBDB: 10 records at Anamosa.",
            images: [] }
        ]
      },
      {
        id: "cystoids",
        title: "Cystoids",
        blurb: "Plated echinoderms with pore-rhomb breathing structures; mostly Ordovician.",
        taxa: [
          { genus: "Iowacystis", species: "sagittaria", sites: ["graf"],
            note: "Distinctive Ordovician cystoid (Maquoketa Group, Graf area). PBDB: 4 records.",
            images: [] }
        ]
      }
    ]
  },

  {
    id: "bryozoans",
    title: "Bryozoans",
    blurb: "Colonial filter-feeders — small branching or encrusting fragments.",
    subgroups: [
      {
        id: "branching",
        title: "Branching bryozoans",
        blurb: "Thin, twig-like branches with regular surface pores.",
        taxa: [
          { genus: "Bryozoans", species: "(fragments)", sites: ["rockford"], dir: "bryozoans_misc",
            note: "Branching colony fragments; pores in regular pattern. PBDB-named genera include Fenestella, Petalotrypa, Leioclema.",
            images: [
              { file: "fragments_dave_01.jpg", src: "dave" }
            ] }
        ]
      }
    ]
  },

  {
    id: "unknown",
    title: "Awaiting identification",
    blurb: "Specimens not yet confidently identified — contributions welcome.",
    subgroups: [
      {
        id: "pending",
        title: "Pending ID",
        blurb: "",
        taxa: [
          { genus: "Unknown", species: "(Nathan #9)", sites: ["rockford"], dir: "unknown_misc",
            note: "Possibly Paracyclas or a gastropod from above.",
            images: [
              { file: "nathan_9_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: '"Tubey belt"', species: "", sites: ["rockford"], dir: "unknown_misc",
            note: "Paired rounded molluscan(?) forms — needs ID.",
            images: [
              { file: "tubey_belt_dave_01.jpg", src: "dave" }
            ] }
        ]
      }
    ]
  }
];

// Reference figures (Quinton & Rygel; CC — see images/reference/source.txt).
const FIGURES = {
  symmetry:           { file: "symmetry_in_fossils.jpg",   caption: "Symmetry in fossils — between valves (bivalves) vs. across each valve's midline (brachiopods)." },
  strophic:           { file: "strophic_vs_astrophic.png", caption: "Strophic (straight hinge that is the longest part of the shell) vs. astrophic (curved or short hinge)." },
  convexity:          { file: "convexity.png",             caption: "Biconvex, plano-convex, concavo-convex shell profiles." },
  brachI:             { file: "brachiopod_groups_I.jpg",   caption: "Brachiopod groups I — orders with characteristic shell forms (Quinton & Rygel)." },
  brachII:            { file: "brachiopod_groups_II.jpg",  caption: "Brachiopod groups II — Rhynchonellida, Productida, Terebratulida, Spiriferida." },
  brachPhylogeny:     { file: "brachiopod_phylogeny.png",  caption: "A rough brachiopod phylogeny." },
  shells:             { file: "fossils_with_shells.jpg",   caption: "Shelled fossils — conispiral, planispiral, patellate, orthocone forms; septa, sutures." },
  holes:              { file: "fossils_with_holes.jpg",    caption: "'Fossils with holes' — sponges, corals, bryozoans, and other porous forms." },
  cnidaria:           { file: "cnidaria_groups.jpg",       caption: "Major fossil cnidarian groups." },
  mollusca:           { file: "mollusca_groups.jpg",       caption: "Common fossil mollusks." },
  bryozoa:            { file: "bryozoa_groups.jpg",        caption: "Major fossil bryozoan groups." },
  pelmatozoa:         { file: "echinoderm_pelmatozoa.jpg", caption: "Pelmatozoan echinoderms — crinoids and relatives." },
  ukyOutlines:        { file: "brach_outlines_uky.jpg",    caption: "Brachiopod outline vocabulary — circular, elliptical, elongate, pentagonal, triangular, quadrate, rectangular, transverse, transversely elliptical, alate (winged). (Kentucky Geological Survey)" },
  ukyProfiles:        { file: "brach_profiles_uky.jpg",    caption: "Brachiopod profile vocabulary (side view) — biconvex, dorsi-/ventri-biconvex, plano-convex, concavo-convex, convexo-plane, resupinate, geniculate. Each shown as separated valves above + joined cross-section below. (Kentucky Geological Survey)" }
};

// =================================================================
// Identification system
// =================================================================
//
// Two stages:
//   1. KEY (phylum / shape pre-filter)   — short binary chain that routes
//      students to the right group. Brachiopod identifications end at the
//      sentinel `result: { filter: "brachiopod" }`, which jumps to:
//   2. Trait filter (Brachiopoda only — for now)
//      - Three CORE questions always asked first: ribs, profile, hinge
//      - Conditional follow-ups: each has a `when(answers)` predicate
//      - Each brachiopod taxon is tagged with `traits: {...}`
//      - Filtering: only show taxa whose tagged traits are compatible
//        with the user's answers ("not sure" = no constraint on that trait)
//
// To add a new question:
//   1. (Optional) Add a new trait dimension to TRAITS
//   2. Append a question to QUESTIONS (set `core: true` for always-asked,
//      otherwise `when: a => <predicate>` based on prior answers)
//   3. Tag the relevant taxa with the new trait
//
// To add a non-brachiopod trait system later: model it on this one and
// route from KEY using a different filter id (e.g., result: { filter: "gastropod" }).

const TRAITS = {
  // Surface decorations — independent booleans so multiple can stack (e.g. ribs + spines for productids)
  surface_lines:  { label: "Growth lines" },
  surface_ribs:   { label: "Radial ribs" },
  surface_frills: { label: "Raised frills" },
  surface_spines: { label: "Spines / bumps" },
  // Other traits
  profile:        { label: "Shell profile" },
  hinge:          { label: "Hinge" },
  spines:         { label: "Spines (productid)" },
  fold_sulcus:    { label: "Fold + sulcus" },
  outline:        { label: "Outline shape" },
  size:           { label: "Size" },
  umbones:        { label: "Umbones" }
};

// Asked in order. `core: true` = always asked. Others gated by `when(answers)`.
// "Not sure" option is appended automatically by the renderer.
//
// Each option has a `value` (stored in the URL as the answer) and an optional
// `setsTraitTo`. If `setsTraitTo` is set, the trait gets that value when the
// option is picked. Otherwise the answer is a "no, continue" chain signal —
// downstream questions in the same chain key off it via `when(a)`.
//
// All questions here are binary (Yes / No) plus the auto-appended "Not sure".
const QUESTIONS = [
  // ============== CORE — always asked ==============

  // Surface: visual multi-pick — 4 surface-decoration patterns.
  // The "smooth" and "growth-lines-only" options are pedagogically distinct
  // (students learn the vocabulary) but filter the same way (both = surface "smooth").
  { id: "surface_pick", trait: "surface_ribs", core: true,
    text: "How is the shell decorated? Pick the closest pattern.",
    hint: "Radial ribs = lines fanning out from the back beak. Growth lines = concentric arcs parallel to the front edge. Frills = raised ruffles around the edge.",
    optionsLayout: "visual",
    options: [
      { value: "smooth",
        setsTraits: {},
        label: "Smooth — no markings",
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="40" rx="38" ry="30" fill="white" stroke="black" stroke-width="2.5"/></svg>' },
      { value: "growth-lines-only",
        setsTraits: {},
        label: "Growth lines only (concentric arcs, no radial ribs)",
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="40" rx="38" ry="30" fill="white" stroke="black" stroke-width="2.5"/><path d="M 16,28 A 36,18 0 0 0 84,28" fill="none" stroke="black" stroke-width="1"/><path d="M 14,40 A 38,22 0 0 0 86,40" fill="none" stroke="black" stroke-width="1"/><path d="M 14,52 A 38,22 0 0 0 86,52" fill="none" stroke="black" stroke-width="1"/></svg>' },
      { value: "ribs",
        setsTraits: { surface_ribs: "yes" },
        label: "Radial ribs (lines fanning out from the back)",
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="40" rx="38" ry="30" fill="white" stroke="black" stroke-width="2.5"/><line x1="50" y1="12" x2="18" y2="60" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="28" y2="65" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="38" y2="68" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="50" y2="68" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="62" y2="68" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="72" y2="65" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="82" y2="60" stroke="black" stroke-width="1"/></svg>' },
      { value: "ribs-and-frills",
        setsTraits: { surface_ribs: "yes", surface_frills: "yes" },
        label: "Ribs + raised growth frills around the edge",
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="40" rx="38" ry="30" fill="white" stroke="black" stroke-width="2.5"/><line x1="50" y1="12" x2="18" y2="60" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="28" y2="65" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="38" y2="68" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="50" y2="68" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="62" y2="68" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="72" y2="65" stroke="black" stroke-width="1"/><line x1="50" y1="12" x2="82" y2="60" stroke="black" stroke-width="1"/><path d="M 14,50 Q 22,60 32,56 Q 42,62 50,57 Q 58,62 68,56 Q 78,60 86,50" fill="none" stroke="black" stroke-width="1.5"/></svg>' }
    ] },

  // Profile: visual multi-pick. Exaggerated bulges so the difference is obvious at glance.
  { id: "profile_pick", trait: "profile", core: true,
    text: "Look at the shell from the side. Which profile is closest?",
    figure: "ukyProfiles",
    hint: "Both valves bulge outward = biconvex (most brachiopods). One flat, one curved = plano-convex. One dish-shaped (curves inward), other bulges = concavo-convex (productids + most strophomenids).",
    optionsLayout: "visual",
    options: [
      { value: "biconvex", setsTraitTo: "biconvex",
        label: "Biconvex — both valves bulge out",
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><path d="M 5,40 Q 50,-5 95,40 Q 50,85 5,40 Z" fill="white" stroke="black" stroke-width="2.5" stroke-linejoin="round"/></svg>' },
      { value: "plano-convex", setsTraitTo: "plano-convex",
        label: "Plano-convex — one flat, one bulges",
        svg: '<svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg"><path d="M 5,55 Q 50,-5 95,55 L 5,55 Z" fill="white" stroke="black" stroke-width="2.5" stroke-linejoin="round"/></svg>' },
      { value: "concavo-convex", setsTraitTo: "concavo-convex",
        label: "Concavo-convex — one dish-shaped, one bulges",
        svg: '<svg viewBox="0 0 100 70" xmlns="http://www.w3.org/2000/svg"><path d="M 5,50 Q 50,-10 95,50 Q 50,15 5,50 Z" fill="white" stroke="black" stroke-width="2.5" stroke-linejoin="round"/></svg>' }
    ] },

  // Hinge: visual multi-pick. Three top-down silhouettes — the bold horizontal
  // bar across the top emphasizes the hinge line.
  { id: "hinge_pick", trait: "hinge", core: true,
    text: "Look at the back of the shell (the hinge area). Which best describes the back edge?",
    figure: "strophic",
    hint: "Long straight hinge as the widest part = strophic (spiriferids, strophomenids, productids). Short or curved back = astrophic (atrypids, most rhynchonellids, terebratulids).",
    optionsLayout: "visual",
    options: [
      { value: "wide-strophic", setsTraitTo: "strophic",
        label: "Long, straight hinge with pointed wings (widest part)",
        svg: '<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg"><path d="M 60,12 L 68,20 L 118,18 L 95,55 L 60,75 L 25,55 L 2,18 L 52,20 Z" fill="white" stroke="black" stroke-width="2"/><line x1="2" y1="18" x2="118" y2="18" stroke="black" stroke-width="5"/></svg>' },
      { value: "narrow-strophic", setsTraitTo: "strophic",
        label: "Short straight hinge, but shell wider in the middle",
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><path d="M 30,15 L 70,15 L 90,55 L 50,75 L 10,55 Z" fill="white" stroke="black" stroke-width="2"/><line x1="30" y1="15" x2="70" y2="15" stroke="black" stroke-width="5"/></svg>' },
      { value: "astrophic", setsTraitTo: "astrophic",
        label: "Smoothly curved back (no straight hinge edge)",
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="40" rx="40" ry="32" fill="white" stroke="black" stroke-width="2.5"/></svg>' }
    ] },

  // ============== BRANCHING FOLLOW-UPS ==============

  { id: "spines", trait: "spines",
    // Only ask if surface-pick didn't already capture spines AND profile suggests we should
    when: a => a.profile_pick === "concavo-convex" && a.surface_pick !== "spines-or-bumps",
    text: "Are there spines, or visible bumps where spines used to be attached?",
    hint: "Productids carry stout, solid spines that usually broke off, leaving little bumps on the shell surface.",
    options: [
      { value: "yes", label: "Yes — spines or spine-base bumps", setsTraitTo: "present" },
      { value: "no",  label: "No — surface smooth or only ribbed", setsTraitTo: "absent"  }
    ] },

  // Fold/sulcus: visual multi-pick (front view of the commissure line).
  // Only asked when surface has ribs (smooth shells don't typically show fold).
  { id: "fold_pick", trait: "fold_sulcus",
    when: a => ["ribs", "ribs-and-frills"].includes(a.surface_pick) || a.surface_ribs === "yes",
    text: "Look at the front edge of the shell (where the two valves meet). Which best describes the line?",
    figure: "brachI",
    hint: "The commissure (where the valves meet) is straight in shells without a fold. A fold + sulcus makes the line bend into a peak or V in the middle.",
    optionsLayout: "visual",
    options: [
      { value: "none", setsTraitTo: "absent",
        label: "Straight — no peak or dip in the middle",
        svg: '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="30" rx="40" ry="22" fill="white" stroke="black" stroke-width="2"/><line x1="10" y1="30" x2="90" y2="30" stroke="black" stroke-width="2.5"/></svg>' },
      { value: "weak", setsTraitTo: "weak",
        label: "Subtle wave — slight ridge or dip in the middle",
        svg: '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="30" rx="40" ry="22" fill="white" stroke="black" stroke-width="2"/><path d="M 10,30 Q 30,32 50,22 Q 70,32 90,30" fill="none" stroke="black" stroke-width="2.5"/></svg>' },
      { value: "strong", setsTraitTo: "strong",
        label: "Sharp peak/V — clear fold and sulcus",
        svg: '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="30" rx="40" ry="22" fill="white" stroke="black" stroke-width="2"/><path d="M 10,30 L 40,32 L 50,8 L 60,32 L 90,30" fill="none" stroke="black" stroke-width="2.5"/></svg>' }
    ] },

  // Outline — core question. Top-down silhouettes with exaggerated bulges so
  // the distinction is obvious at a glance.
  { id: "outline_pick", trait: "outline", core: true,
    text: "Which outline looks closest to your shell (top-down view, with the hinge at the back)?",
    figure: "ukyOutlines",
    hint: "Pointed 'wings' to the sides → spiriferid. Tall and narrow → terebratulid. Round/squat → most other brachiopods.",
    optionsLayout: "visual",
    options: [
      { value: "wing-shaped", setsTraitTo: "wing-shaped",
        label: "Winged (alate) — pointed extensions to the sides",
        svg: '<svg viewBox="0 0 130 80" xmlns="http://www.w3.org/2000/svg"><path d="M 65,8 L 73,18 L 128,12 L 105,50 L 65,72 L 25,50 L 2,12 L 57,18 Z" fill="white" stroke="black" stroke-width="2.5" stroke-linejoin="round"/></svg>' },
      { value: "subcircular", setsTraitTo: "subcircular",
        label: "Round — about as wide as tall",
        svg: '<svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="40" rx="38" ry="32" fill="white" stroke="black" stroke-width="2.5"/></svg>' },
      { value: "elongate-oval", setsTraitTo: "elongate-oval",
        label: "Egg-shaped / elongate — clearly taller than wide",
        svg: '<svg viewBox="0 0 70 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="35" cy="50" rx="20" ry="42" fill="white" stroke="black" stroke-width="2.5"/></svg>' }
    ] },

  // Size — single visual pick. (Previously a two-step yes/no chain.)
  { id: "size_pick", trait: "size",
    when: a => a.surface_pick !== undefined,
    text: "How big is the shell?",
    hint: "A US dime is 18 mm; a quarter is 24 mm; a golf ball is ~42 mm. Pick the closest size.",
    optionsLayout: "visual",
    options: [
      { value: "small",  setsTraitTo: "small",
        label: "Smaller than a quarter (under 2 cm)",
        svg: '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="30" r="12" fill="white" stroke="black" stroke-width="2"/></svg>' },
      { value: "medium", setsTraitTo: "medium",
        label: "Between a quarter and a golf ball (2–5 cm)",
        svg: '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="30" r="22" fill="white" stroke="black" stroke-width="2"/></svg>' },
      { value: "large",  setsTraitTo: "large",
        label: "Bigger than a golf ball (over 5 cm)",
        svg: '<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="30" r="28" fill="white" stroke="black" stroke-width="2"/></svg>' }
    ] },

  // Umbones — only meaningful for ribbed astrophic shells (rhynchonellid splitter).
  { id: "umbones", trait: "umbones",
    when: a => a.hinge_pick === "astrophic" && (["ribs", "ribs-and-frills"].includes(a.surface_pick) || a.surface_ribs === "yes"),
    text: "Look at the beak — the back tip where the two valves come together. Do ribs run across it, or is it smooth?",
    hint: "Leiorhynchus has a smooth beak with ribs only toward the front; most other rhynchonellids/atrypids have ribs all the way to the beak.",
    options: [
      { value: "yes", label: "Ribs continue onto the beak",         setsTraitTo: "ribbed" },
      { value: "no",  label: "Beak is smooth — ribs only toward front", setsTraitTo: "smooth" }
    ] }
];

// =================================================================
// Pre-filter key — phylum / shape only. Brachiopod paths terminate
// with `result: { filter: "brachiopod" }` which routes to the trait
// filter view.
// =================================================================
const KEY = {
  root: "q-phylum",
  nodes: {
    "q-phylum": {
      question: "Do you already know what phylum this is?",
      hint: "Brachiopod, mollusk, coral (cnidarian), crinoid (echinoderm), or bryozoan?",
      options: [
        { label: "Yes — let me pick",       next: "q-phylum-pick" },
        { label: "No — walk me through it", next: "q-shell" }
      ]
    },

    "q-phylum-pick": {
      question: "Which phylum?",
      options: [
        { label: "Brachiopoda",       hint: "Two valves, each symmetric across its own midline.",
          result: { filter: "brachiopod" } },
        { label: "Mollusca",          hint: "Bivalves (mirror-image valves) or gastropods (single coiled shell).",
          next: "q-mollusk" },
        { label: "Cnidaria (corals)", hint: "Cone- or horn-shaped with internal radial walls (septa).",
          result: { subgroups: ["rugose"] } },
        { label: "Echinodermata",     hint: "Disc, button, or short cylinder — pieces of a crinoid stem.",
          result: { subgroups: ["crinoids"] } },
        { label: "Bryozoa",           hint: "Thin branching twigs with tiny regular pores.",
          result: { subgroups: ["branching"] } }
      ]
    },

    "q-mollusk": {
      question: "Bivalve or gastropod?",
      hint: "Bivalve = two valves like a clam. Gastropod = single coiled shell.",
      options: [
        { label: "Bivalve",   result: { subgroups: ["bivalves"] } },
        { label: "Gastropod", result: { subgroups: ["gastropods"] } }
      ]
    },

    "q-shell": {
      question: "Is it a two-piece shell — two halves that fit together along an edge?",
      hint: "Single coiled shells, cones, and stem fragments are 'no'.",
      options: [
        { label: "Yes", next: "q-symmetry" },
        { label: "No",  next: "q-cone" }
      ]
    },

    "q-symmetry": {
      question: "Are the two halves mirror images of each other?",
      figure: "symmetry",
      options: [
        { label: "Yes — mirror images",                          result: { subgroups: ["bivalves"] } },
        { label: "No — each half symmetric across its own midline", result: { filter: "brachiopod" } }
      ]
    },

    "q-cone": {
      question: "Is it cone- or horn-shaped?",
      figure: "cnidaria",
      hint: "Look for internal radial walls (septa) inside the cup.",
      options: [
        { label: "Yes", result: { subgroups: ["rugose"] } },
        { label: "No",  next: "q-disc" }
      ]
    },

    "q-disc": {
      question: "Is it a small disc, button, or short cylinder?",
      figure: "pelmatozoa",
      hint: "Like beads from a broken-up stem; often with a star-shaped hole.",
      options: [
        { label: "Yes", result: { subgroups: ["crinoids"] } },
        { label: "No",  next: "q-coil" }
      ]
    },

    "q-coil": {
      question: "Is it coiled like a snail?",
      figure: "shells",
      options: [
        { label: "Yes", result: { subgroups: ["gastropods"] } },
        { label: "No",  next: "q-twig" }
      ]
    },

    "q-twig": {
      question: "Is it a thin branching twig?",
      figure: "bryozoa",
      hint: "Usually with tiny regular pores along the surface.",
      options: [
        { label: "Yes", result: { subgroups: ["branching"] } },
        { label: "No",  result: { subgroups: ["pending"] } }
      ]
    }
  }
};
