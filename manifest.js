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
            traits: { ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "wing-shaped", size: "medium", umbones: "ribbed" },
            images: [
              { file: "whitneyi_nathan_01.jpg", src: "nathan" },
              { file: "whitneyi_dave_01.jpg",   src: "dave"   },
              { file: "whitneyi_dave_02.jpg",   src: "dave"   },
              { file: "whitneyi_jsm_01.png",    src: "jsm"    }
            ] },
          { genus: "Theodossia", species: "hungerfordi", sites: ["rockford"],
            note: "Globose, rounded outline; subdued ribs. Spiriferid by anatomy but the hinge is short — students often perceive it as astrophic.",
            traits: { ribs: "yes", profile: "biconvex", hinge: ["strophic", "astrophic"], spines: "absent",
                      fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "hungerfordi_nathan_01.jpg", src: "nathan" },
              { file: "hungerfordi_dave_01.jpg",   src: "dave"   },
              { file: "hungerfordi_eqmn_01.png",   src: "eqmn"   }
            ] },
          { genus: "Platyrachella", species: "macbridei", sites: ["rockford"],
            note: "Wide hinge; sharp ribs; flatter ventral valve. Sometimes placed in Spinocyrtia.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "wing-shaped", size: "medium", umbones: "ribbed" },
            images: [
              { file: "macbridei_nathan_01.jpg", src: "nathan" },
              { file: "macbridei_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Tenticospirifer", species: "sp.", sites: ["rockford"],
            note: "Tall, pyramidal ventral valve.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [
              { file: "sp_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Pyramidspirifer", species: "sp.", sites: ["rockford"],
            note: "Steep, pyramid-form spiriferid.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [
              { file: "sp_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Conispirifer", species: "cyrtinaeformis", sites: ["rockford"],
            note: "Narrow, cone-shaped; coarse ribs. Often listed in PBDB as Tenticospirifer cyrtinaeformis.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [
              { file: "cyrtinaeformis_nathan_01.jpg", src: "nathan" },
              { file: "cyrtinaeformis_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Cyrtina", species: "iowaensis", sites: ["rockford"],
            note: "Small, sharply pyramidal; punctate shell.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [
              { file: "iowaensis_nathan_01.jpg", src: "nathan" },
              { file: "iowaensis_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Ambocoelia", species: "sp.", sites: ["rockford"],
            note: "Small, smooth-ish spiriferid with reduced ribbing. PBDB: 6 records at Rockford.",
            traits: { ribs: ["yes", "no"], profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "weak", outline: "subcircular", size: "small", umbones: "smooth" },
            images: [] },
          { genus: "Tylothyris", species: "sulcocostata", sites: ["rockford"],
            note: "Small spiriferid; sulcate fold with strong costae. PBDB: 3 records.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
            images: [] },
          { genus: "Tecnocyrtina", species: "johnsoni", sites: ["crawford"],
            note: "Late Givetian Cedar Valley spiriferid (Johnson, 1990). Small-to-medium; clear fold/sulcus; fine ribs. Associated with the Allanella allani Zone (D&C fig. 2).",
            traits: { ribs: "yes", profile: "biconvex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "wing-shaped", size: "small", umbones: "ribbed" },
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
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", growth_frills: "frills", outline: "subcircular",
                      size: "medium", umbones: "ribbed" },
            images: [
              { file: "devoniana_nathan_01.jpg",    src: "nathan"    },
              { file: "devoniana_dave_01.jpg",      src: "dave"      },
              { file: "devoniana_eqmn_01.png",      src: "eqmn"      },
              { file: "devoniana_daycopper_01.png", src: "daycopper" },
              { file: "devoniana_jsm_01.png",       src: "jsm"       }
            ] },
          { genus: "Pseudoatrypa", species: "lineata", sites: ["rockford"],
            note: "Larger than P. devoniana; globose dorsibiconvex shell with an inflated dome-like dorsal valve; broad angular fold. Idlewild Mbr of the Lithograph City Fm, Floyd Co. (Day & Copper 1998). Per D&C also occurs in the Cedar Valley Group (Coralville Fm / State Quarry) — tag for Crawford once specimens are confirmed.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", growth_frills: "frills", outline: "subcircular",
                      size: "large", umbones: "ribbed" },
            images: [
              { file: "lineata_daycopper_01.png", src: "daycopper" }
            ] },
          { genus: "Spinatrypa", species: "planosulcata", sites: ["rockford"],
            note: "Globose, spinose; flat sulcus.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "weak", growth_frills: "frills", outline: "subcircular",
                      size: "medium", umbones: "ribbed" },
            images: [
              { file: "planosulcata_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Spinatrypa", species: "rockfordensis", sites: ["rockford"],
            note: "Medium-to-large; biconvex to dorsibiconvex; wider than long with rounded outline; coarse undulating ribs (4–7/10 mm); spinose lamellae. Holotype from Rockford Quarry (Day & Copper 1998).",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "weak", growth_frills: "frills", outline: "subcircular",
                      size: "medium", umbones: "ribbed" },
            images: [
              { file: "rockfordensis_nathan_01.jpg",    src: "nathan"    },
              { file: "rockfordensis_unk_01.webp",      src: "unk"       },
              { file: "rockfordensis_daycopper_01.png", src: "daycopper" }
            ] },
          { genus: "Spinatrypa", species: "sp.", sites: ["rockford"],
            note: "Generic spinatrypid view.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "weak", growth_frills: "frills", outline: "subcircular",
                      size: "medium", umbones: "ribbed" },
            images: [
              { file: "sp_dave_01.jpg", src: "dave" }
            ] },
          { genus: "Desquamatia", species: "(Independatrypa) scutiformis", sites: ["rockford"],
            note: "Strophic, shield-shaped; dorsibiconvex with coarse imbricate growth lamellae. Type Lime Creek / Lithograph City Fm taxon (Stainbrook 1938; plate from Day & Copper 1998 Fig. 5).",
            traits: { ribs: "yes", profile: "biconvex", hinge: ["strophic", "astrophic"], spines: "absent",
                      fold_sulcus: "strong", growth_frills: "frills", outline: "subcircular",
                      size: "medium", umbones: "ribbed" },
            images: [
              { file: "independatrypa_eqmn_01.png",                src: "eqmn"      },
              { file: "independatrypa_scutiformis_daycopper_01.png", src: "daycopper" }
            ] },
          { genus: "Hystricina", species: "trulla", sites: ["rockford"],
            note: "Small; densely spinose surface.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "weak", growth_frills: "frills", outline: "subcircular",
                      size: "small", umbones: "ribbed" },
            images: [
              { file: "trulla_eqmn_01.png", src: "eqmn" }
            ] },
          { genus: "Costatrypa", species: "varicostata", sites: ["rockford"],
            note: "Late Frasnian Lime Creek Fm atrypid (Stainbrook 1945); listed by Day & Copper 1998 as part of the standard Lime Creek atrypid fauna. PBDB: 1 record.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", growth_frills: "frills", outline: "subcircular",
                      size: "medium", umbones: "ribbed" },
            images: [] },
          { genus: "Iowatrypa", species: "owenensis", sites: ["rockford"],
            note: "Late Frasnian Lime Creek Fm atrypid (Webster, 1921); zone fossil for the uppermost Lime Creek (M.N. Zone 13 — 'Iowatrypa owenensis Zone'). Day & Copper 1998.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", growth_frills: "frills", outline: "subcircular",
                      size: "medium", umbones: "ribbed" },
            images: [] },
          { genus: "Iowatrypa", species: "minor", sites: ["rockford"],
            note: "Smaller congener of I. owenensis in the Lime Creek Fm fauna (Fenton & Fenton, 1924). Day & Copper 1998.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", growth_frills: "frills", outline: "subcircular",
                      size: "small", umbones: "ribbed" },
            images: [] },
          { genus: "Spinatrypa", species: "bellula", sites: ["crawford"],
            note: "Cedar Valley Group atrypid (Hall, 1858). Globose, spinose; smaller and less coarsely ribbed than the Frasnian S. rockfordensis.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "weak", growth_frills: "frills", outline: "subcircular",
                      size: "small", umbones: "ribbed" },
            images: [] },
          { genus: "Allanella", species: "allani", sites: ["crawford"],
            note: "Zone fossil for the Allanella allani Zone (latest Givetian–earliest Frasnian), spanning upper Cedar Valley into lowermost Lithograph City. Small-to-medium dorsibiconvex atrypid with fine ribs. Day & Copper 1998 fig. 2.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", growth_frills: "frills", outline: "subcircular",
                      size: ["small", "medium"], umbones: "ribbed" },
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
            traits: { ribs: "no", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "weak", outline: "elongate-oval", size: "medium", umbones: "smooth" },
            images: [
              { file: "orestes_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Athyris", species: "vittata", sites: ["crawford"],
            note: "Smooth-shelled athyrid common in Iowa Cedar Valley Group. Subcircular, biconvex, with faint concentric growth lines.",
            traits: { ribs: "no", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "weak", outline: "subcircular", size: "medium", umbones: "smooth" },
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
            traits: { ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "arcuata_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Strophodonta", species: "sp.", sites: ["rockford"],
            note: "Very wide hinge; fine ribs; no pedicle foramen. Most Rockford specimens are S. thomasi. (Cedar Valley Strophodonta — usually S. callawayensis — exists but isn't yet tagged for Crawford pending specimen confirmation.)",
            traits: { ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "sp_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Nervostrophia", species: "rockfordensis", sites: ["rockford"],
            note: "Strong primary costae alternating with finer ones.",
            traits: { ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "rockfordensis_nathan_01.jpg", src: "nathan" },
              { file: "rockfordensis_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Moravostrophia", species: "sp.", sites: ["rockford"],
            note: "Wide-hinged; very fine costae.",
            traits: { ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "sp_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Strophonelloides", species: "reversa", sites: ["rockford"],
            note: "Strongly resupinate — convexity reverses across growth. (Older lit: Strophonella reversa.)",
            traits: { ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "reversa_nathan_01.jpg", src: "nathan" },
              { file: "reversa_dave_01.jpg",   src: "dave"   },
              { file: "reversa_eqmn_01.png",   src: "eqmn"   }
            ] },
          { genus: "Sulcatostrophia", species: "camerata", sites: ["rockford"],
            note: "Sulcate; fine costae. (Older spelling: Sulcastrophia.)",
            traits: { ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent",
                      fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: "ribbed" },
            images: [
              { file: "camerata_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Schuchertella", species: "sp.", sites: ["rockford"],
            note: "Concavo-convex; coarser costae than most strophomenes. Most Rockford specimens are S. parva.",
            traits: { ribs: "yes", profile: "concavo-convex", hinge: "strophic", spines: "absent",
                      fold_sulcus: ["absent", "weak"], outline: "subcircular", size: "medium", umbones: "ribbed" },
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
            traits: { ribs: ["yes", "no"], profile: "concavo-convex", hinge: ["strophic", "astrophic"], spines: "present",
                      fold_sulcus: "absent", outline: "subcircular", size: "medium", umbones: ["ribbed", "smooth"] },
            images: [
              { file: "sp_nathan_01.jpg", src: "nathan" },
              { file: "sp_dave_01.jpg",   src: "dave"   }
            ] },
          { genus: "Productella", species: "sp.", sites: ["rockford"],
            note: "Second productid genus at Rockford — smaller, less inflated than Devonoproductus. PBDB: 9 records.",
            traits: { ribs: ["yes", "no"], profile: "concavo-convex", hinge: ["strophic", "astrophic"], spines: "present",
                      fold_sulcus: "absent", outline: "subcircular", size: ["small", "medium"], umbones: ["ribbed", "smooth"] },
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
            traits: { ribs: ["yes", "no"], profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: ["ribbed", "smooth"] },
            images: [
              { file: "cornuta_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Gypidula", species: "typicalis", sites: ["crawford"],
            note: "Type species of *Gypidula* (HALL, 1867); illustrated from the Cedar Valley Group of Iowa (Amsden 1965). Ventribiconvex; well-developed dorsal sulcus and ventral fold; lyre-shaped hinge plates visible in serial section. Treatise Fig. 681,2a–d.",
            traits: { ribs: ["yes", "no"], profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", outline: "subcircular", size: "medium", umbones: ["ribbed", "smooth"] },
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
            traits: { ribs: "yes", profile: "biconvex", hinge: ["strophic", "astrophic"], spines: "absent",
                      fold_sulcus: "strong", growth_frills: "growth-lines", outline: "subcircular",
                      size: "medium", umbones: "ribbed" },
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
            traits: { ribs: "yes", profile: "biconvex", hinge: ["strophic", "astrophic"], spines: "absent",
                      fold_sulcus: "strong", growth_frills: "growth-lines", outline: "subcircular",
                      size: "large", umbones: "ribbed" },
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
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "strong", outline: "subcircular", size: "small", umbones: "ribbed" },
            images: [
              { file: "saxatillis_nathan_01.jpg", src: "nathan" },
              { file: "camarotoechia_congregata_treatise_01.png", src: "treatise" }
            ] },
          { genus: "Leiorhynchus", species: "argenteum", sites: ["rockford"],
            note: "Subcircular to transversely ovate; biconvex. **Diagnostic:** umbones smooth; costae low and simple, most pronounced on fold/sulcus and weak on flanks (per Treatise diagnosis). Fold + sulcus arise at midlength, not at umbo — distinguishes from *Cupularostrum*/*Camarotoechia*. Treatise Fig. 771,1a–o shows type species *L. quadracostata*.",
            traits: { ribs: "yes", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "weak", outline: "subcircular", size: ["small", "medium"], umbones: "smooth" },
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
            traits: { ribs: "no", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "absent", outline: "elongate-oval", size: "medium", umbones: "smooth" },
            images: [
              { file: "navicella_nathan_01.jpg", src: "nathan" }
            ] },
          { genus: "Cranaenella", species: "sp.", sites: ["rockford"],
            note: "Smaller, more elongate terebratulid; rarer than Cranaena. PBDB: 5 records.",
            traits: { ribs: "no", profile: "biconvex", hinge: "astrophic", spines: "absent",
                      fold_sulcus: "absent", outline: "elongate-oval", size: "small", umbones: "smooth" },
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
  pelmatozoa:         { file: "echinoderm_pelmatozoa.jpg", caption: "Pelmatozoan echinoderms — crinoids and relatives." }
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
  ribs:          { label: "Ribbing" },
  profile:       { label: "Shell profile" },
  hinge:         { label: "Hinge" },
  spines:        { label: "Spines" },
  fold_sulcus:   { label: "Fold + sulcus" },
  growth_frills: { label: "Growth lamellae / frills" },
  outline:       { label: "Outline shape" },
  size:          { label: "Size" },
  umbones:       { label: "Umbones" }
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

  { id: "ribs", trait: "ribs", core: true,
    text: "Does the shell have ribs — radial lines or ridges fanning out from the back?",
    figure: "brachII",
    options: [
      { value: "yes", label: "Yes — clearly ribbed",          setsTraitTo: "yes" },
      { value: "no",  label: "No — smooth (or only growth lines)", setsTraitTo: "no"  }
    ] },

  // Profile: 2-question chain. concavo first (productid splitter), then plano vs biconvex.
  { id: "profile_concavo", trait: "profile", core: true,
    text: "Look at the shell from the side. Is one valve clearly dish-shaped (curved inward), while the other bulges outward?",
    figure: "convexity",
    options: [
      { value: "yes", label: "Yes — one valve dished, one bulges",   setsTraitTo: "concavo-convex" },
      { value: "no",  label: "No — both valves curve outward (or close to it)" }
    ] },

  { id: "profile_plano", trait: "profile",
    when: a => a.profile_concavo === "no",
    text: "Is one valve flat (or nearly flat) and the other bulges out?",
    figure: "convexity",
    options: [
      { value: "yes", label: "Yes — one flat, one bulges",  setsTraitTo: "plano-convex" },
      { value: "no",  label: "No — both valves bulge",       setsTraitTo: "biconvex"     }
    ] },

  { id: "hinge", trait: "hinge", core: true,
    text: "Is the back edge of the shell (where the two valves meet) the widest part of the whole shell?",
    figure: "strophic",
    hint: "Look for a long, straight 'hinge line' running across the back. Pinpoint the widest dimension of the shell.",
    options: [
      { value: "yes", label: "Yes — long, straight back edge that's the widest",      setsTraitTo: "strophic"  },
      { value: "no",  label: "No — back edge is short or curved; widest in the middle", setsTraitTo: "astrophic" }
    ] },

  // ============== BRANCHING FOLLOW-UPS ==============

  { id: "spines", trait: "spines",
    when: a => a.profile_concavo === "yes",
    text: "Are there spines, or visible bumps where spines used to be attached?",
    hint: "Productids carry stout, solid spines that usually broke off, leaving little bumps on the shell surface.",
    options: [
      { value: "yes", label: "Yes — spines or spine-base bumps", setsTraitTo: "present" },
      { value: "no",  label: "No — surface smooth or only ribbed", setsTraitTo: "absent"  }
    ] },

  // Fold/sulcus: 2-question chain. First "any fold?", then "strong?".
  { id: "fold_any", trait: "fold_sulcus",
    when: a => a.ribs === "yes",
    text: "Is there a ridge running down the middle of one valve, with a matching groove on the other?",
    figure: "brachI",
    hint: "Look down the shell from beak to front for a central ridge + groove pattern.",
    options: [
      { value: "yes", label: "Yes — there's a ridge and groove" },
      { value: "no",  label: "No — neither valve has a midline ridge/groove", setsTraitTo: "absent" }
    ] },

  { id: "fold_strong", trait: "fold_sulcus",
    when: a => a.fold_any === "yes",
    text: "Is the ridge/groove strongly developed (deep and obvious), or subtle?",
    options: [
      { value: "yes", label: "Strong — obvious from a few feet away",      setsTraitTo: "strong" },
      { value: "no",  label: "Subtle — only visible when you look closely", setsTraitTo: "weak"   }
    ] },

  // Outline: 2-question chain. Wings first (spiriferids), then elongate (terebratulids).
  // All "no" → default to subcircular (the catch-all for round/oval atrypids/orthids/etc.).
  { id: "outline_wings", trait: "outline",
    when: a => a.ribs !== undefined,
    text: "Are there pointed extensions sticking out to the sides at the back of the shell, making it look wing-like?",
    figure: "brachI",
    options: [
      { value: "yes", label: "Yes — clear wing-like points to the sides", setsTraitTo: "wing-shaped" },
      { value: "no",  label: "No — sides are rounded or flat" }
    ] },

  { id: "outline_elong", trait: "outline",
    when: a => a.outline_wings === "no",
    text: "Is the shell clearly longer (front-to-back) than it is wide (side-to-side)?",
    options: [
      { value: "yes", label: "Yes — egg-shaped or elongate",     setsTraitTo: "elongate-oval" },
      { value: "no",  label: "No — about as long as wide, or wider", setsTraitTo: "subcircular"  }
    ] },

  // Size: 2-question chain.
  { id: "size_small", trait: "size",
    when: a => a.ribs !== undefined,
    text: "Is the shell smaller than a quarter (about 2 cm across)?",
    hint: "A US quarter is 24 mm wide; a dime is 18 mm.",
    options: [
      { value: "yes", label: "Yes — smaller than a quarter", setsTraitTo: "small" },
      { value: "no",  label: "No — quarter-sized or bigger" }
    ] },

  { id: "size_large", trait: "size",
    when: a => a.size_small === "no",
    text: "Is the shell bigger than a golf ball (about 5 cm across)?",
    options: [
      { value: "yes", label: "Yes — bigger than a golf ball",  setsTraitTo: "large"  },
      { value: "no",  label: "No — between a quarter and a golf ball", setsTraitTo: "medium" }
    ] },

  { id: "growth_frills", trait: "growth_frills",
    when: a => a.hinge === "no" && a.ribs === "yes",  // astrophic + ribbed
    text: "Are there raised ridges sticking out around the edge of the shell, like ruffled piecrust?",
    hint: "These are growth frills (imbricate lamellae) — a typical atrypid feature, especially around the margin.",
    options: [
      { value: "yes", label: "Yes — clear raised ridges/frills",     setsTraitTo: "frills"       },
      { value: "no",  label: "No — only fine growth lines (no raised ridges)", setsTraitTo: "growth-lines" }
    ] },

  { id: "umbones", trait: "umbones",
    when: a => a.hinge === "no" && a.ribs === "yes",  // astrophic + ribbed
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
