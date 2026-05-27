// Field-guide manifest (restructured 2026-05-27): a flat TAXA registry +
// site membership lists + clade/phylum metadata. Trait scorings live in
// scorings.js (loaded first). render.js rebuilds the grouped FAUNA below.
const SITES = [
  {
    "id": "rockford",
    "title": "Rockford (Floyd Co., Iowa)",
    "subtitle": "Late Devonian (Frasnian)",
    "formation": "Lime Creek Fm — Cerro Gordo Member / Lithograph City Fm / Shell Rock Fm",
    "location": "Rockford Fossil & Prairie Park, north-central Iowa",
    "blurb": "Classic Frasnian fauna dominated by brachiopods, with rugose corals, paracyclid bivalves, gastropods, crinoid columnals, and bryozoans.",
    "taxa": [
      "cyrtospirifer-whitneyi",
      "theodossia-hungerfordi",
      "platyrachella-macbridei",
      "tenticospirifer-sp",
      "pyramidspirifer-sp",
      "conispirifer-cyrtinaeformis",
      "cyrtina-iowaensis",
      "ambocoelia-sp",
      "tylothyris-sulcocostata",
      "pseudoatrypa-devoniana",
      "pseudoatrypa-lineata",
      "spinatrypa-planosulcata",
      "spinatrypa-rockfordensis",
      "spinatrypa-sp",
      "desquamatia-independatrypa-scutiformis",
      "hystricina-trulla",
      "costatrypa-varicostata",
      "iowatrypa-owenensis",
      "iowatrypa-minor",
      "riqauxia-orestes",
      "douvillina-arcuata",
      "strophodonta-sp",
      "nervostrophia-rockfordensis",
      "moravostrophia-sp",
      "strophonelloides-reversa",
      "sulcatostrophia-camerata",
      "schuchertella-sp",
      "devonoproductus-sp",
      "productella-sp",
      "gypidula-cornuta",
      "schizophoria-iowensis",
      "schizophoria-magna",
      "cupularostrum-saxatillis",
      "leiorhynchus-argenteum",
      "cranaena-navicella",
      "cranaenella-sp",
      "horn-corals-assorted",
      "horn-corals-cluster",
      "tabulophyllum-sp",
      "heliophyllum-solidum",
      "gastropods-assorted",
      "gastropods-large",
      "floyda-gigantea",
      "diaphorostoma-antiquum",
      "straparollus-sp",
      "paracyclas-sabini",
      "bivalves-assorted-large",
      "crinoids-columnals",
      "bryozoans-fragments",
      "unknown-nathan-9",
      "tubey-belt"
    ]
  },
  {
    "id": "crawford",
    "title": "Crawford Quarry",
    "subtitle": "Middle Devonian (Givetian)",
    "formation": "Cedar Valley Group — Coralville / Little Cedar Fms",
    "location": "Johnson Co., eastern Iowa",
    "blurb": "Givetian Cedar Valley fauna — large atrypid brachiopods (Pseudoatrypa lineata, Spinatrypa bellula), the Allanella allani zone fauna, colonial rugose corals, and abundant crinoid columnals.",
    "taxa": [
      "tecnocyrtina-johnsoni",
      "spinatrypa-bellula",
      "allanella-allani",
      "athyris-vittata",
      "gypidula-typicalis",
      "schizophoria-iowensis",
      "schizophoria-magna",
      "hexagonaria-sp"
    ]
  },
  {
    "id": "graf",
    "title": "Graf section",
    "subtitle": "Late Ordovician (Cincinnatian)",
    "formation": "Maquoketa Group — Elgin / Clermont / Brainard Mbrs",
    "location": "Graf, Dubuque Co., eastern Iowa",
    "blurb": "Diverse Late Ordovician fauna: crinoids (Carabocrinus, Cupulocrinus, Dendrocrinus, Porocrinus), cystoids (Iowacystis), small brachiopods, nautiloid orthocones, ostracods, bryozoans.",
    "taxa": [
      "plaesiomys-subquadrata",
      "paucicrura-corpulenta",
      "megamyonia-unicostata",
      "cupulocrinus-angustatus",
      "carabocrinus-slocomi",
      "iowacystis-sagittaria"
    ]
  },
  {
    "id": "elgin-clement",
    "title": "Elgin-Clement trilobite sites",
    "subtitle": "Late Ordovician (Cincinnatian)",
    "formation": "Maquoketa Group — Elgin Member",
    "location": "Northeast Iowa (Fayette/Winneshiek Co.)",
    "blurb": "Famous trilobite-bearing Maquoketa exposures: Isotelus and other asaphids, plus brachiopods (Plaesiomys, Thaerodonta, Megamyonia), rugose horn corals (Grewingkia), orthocone nautiloids.",
    "taxa": [
      "plaesiomys-subquadrata",
      "paucicrura-corpulenta",
      "megamyonia-unicostata",
      "thaerodonta-saxea",
      "isotelus-sp",
      "grewingkia-sp",
      "isorthoceras-sociale"
    ]
  },
  {
    "id": "maquoketa-caves",
    "title": "Maquoketa Caves limestones",
    "subtitle": "Silurian (Llandovery–Wenlock)",
    "formation": "Hopkinton Dolomite (Maquoketa Caves State Park, Iowa)",
    "location": "Maquoketa Caves State Park, Jackson Co., eastern Iowa",
    "blurb": "Silurian carbonate fauna in cave-bearing dolomite: brachiopods, tabulate corals (Halysites, Favosites), large Eucalyptocrinites crinoids. (Stratigraphy assignment provisional — confirm before relying on it.)",
    "taxa": [
      "atrypa-reticularis",
      "halysites-sp",
      "favosites-sp"
    ]
  },
  {
    "id": "anamosa",
    "title": "Anamosa limestone",
    "subtitle": "Late Silurian (Wenlock)",
    "formation": "Scotch Grove Formation — Anamosa Member",
    "location": "Anamosa, Jones Co., eastern Iowa",
    "blurb": "Late Silurian carbonate sequence: Atrypa reticularis, pentamerid (Costistricklandia), chain corals (Halysites), honeycomb corals (Favosites), Calymene trilobites, large Eucalyptocrinites crinoids.",
    "taxa": [
      "atrypa-reticularis",
      "costistricklandia-castellana",
      "ferganella-sp",
      "resserella-sp",
      "isorthis-sp",
      "calymene-sp",
      "stenopareia-sp",
      "halysites-sp",
      "favosites-sp",
      "heliolites-sp",
      "eucalyptocrinites-ornatus"
    ]
  }
];

const SOURCES = {
  "nathan": {
    "label": "Nathan — Rockford Iowa brachiopods album",
    "url": "https://imgur.com/a/rockford-iowa-brachiopods-iHLNl"
  },
  "dave": {
    "label": "Dave — Views of the Mahantango",
    "url": "https://vmnhpaleontology.wordpress.com/"
  },
  "eqmn": {
    "label": "EquatorialMinnesota blog",
    "url": ""
  },
  "jsm": {
    "label": "J. Mitchell",
    "url": ""
  },
  "daycopper": {
    "label": "Day & Copper (1998), Acta Palaeontologica Polonica 43(2)",
    "url": "https://www.app.pan.pl/archive/published/app43/app43-155.pdf"
  },
  "stigallrode": {
    "label": "Stigall Rode (2005), J. Syst. Palaeontology 3(2):133–167",
    "url": "https://doi.org/10.1017/S1477201905001537"
  },
  "treatise": {
    "label": "Treatise on Invertebrate Paleontology, Part H Brachiopoda Revised, vol. 4 (2002, Kaesler ed.)",
    "url": ""
  },
  "unk": {
    "label": "Source unknown",
    "url": ""
  }
};

const FIGURES = {
  "symmetry": {
    "file": "symmetry_in_fossils.jpg",
    "caption": "Symmetry in fossils — between valves (bivalves) vs. across each valve's midline (brachiopods)."
  },
  "strophic": {
    "file": "strophic_vs_astrophic.png",
    "caption": "Strophic (straight hinge that is the longest part of the shell) vs. astrophic (curved or short hinge)."
  },
  "convexity": {
    "file": "convexity.png",
    "caption": "Biconvex, plano-convex, concavo-convex shell profiles."
  },
  "brachI": {
    "file": "brachiopod_groups_I.jpg",
    "caption": "Brachiopod groups I — orders with characteristic shell forms (Quinton & Rygel)."
  },
  "brachII": {
    "file": "brachiopod_groups_II.jpg",
    "caption": "Brachiopod groups II — Rhynchonellida, Productida, Terebratulida, Spiriferida."
  },
  "brachPhylogeny": {
    "file": "brachiopod_phylogeny.png",
    "caption": "A rough brachiopod phylogeny."
  },
  "shells": {
    "file": "fossils_with_shells.jpg",
    "caption": "Shelled fossils — conispiral, planispiral, patellate, orthocone forms; septa, sutures."
  },
  "holes": {
    "file": "fossils_with_holes.jpg",
    "caption": "'Fossils with holes' — sponges, corals, bryozoans, and other porous forms."
  },
  "cnidaria": {
    "file": "cnidaria_groups.jpg",
    "caption": "Major fossil cnidarian groups."
  },
  "mollusca": {
    "file": "mollusca_groups.jpg",
    "caption": "Common fossil mollusks."
  },
  "bryozoa": {
    "file": "bryozoa_groups.jpg",
    "caption": "Major fossil bryozoan groups."
  },
  "pelmatozoa": {
    "file": "echinoderm_pelmatozoa.jpg",
    "caption": "Pelmatozoan echinoderms — crinoids and relatives."
  },
  "ukyOutlines": {
    "file": "brach_outlines_uky.jpg",
    "caption": "Brachiopod outline vocabulary — circular, elliptical, elongate, pentagonal, triangular, quadrate, rectangular, transverse, transversely elliptical, alate (winged). (Kentucky Geological Survey)"
  },
  "ukyProfiles": {
    "file": "brach_profiles_uky.jpg",
    "caption": "Brachiopod profile vocabulary (side view) — biconvex, dorsi-/ventri-biconvex, plano-convex, concavo-convex, convexo-plane, resupinate, geniculate. Each shown as separated valves above + joined cross-section below. (Kentucky Geological Survey)"
  }
};

const PHYLA = {
  "brachiopods": {
    "title": "Brachiopods",
    "blurb": "Bilaterally symmetric across the shell midline (not between valves). The dominant Rockford fossil — most of what you pick up will be here.",
    "phylum": "brachiopoda"
  },
  "trilobites": {
    "title": "Trilobites",
    "blurb": "Three-lobed arthropods. Found in Ordovician Maquoketa exposures (Elgin) and Silurian Anamosa beds.",
    "phylum": "arthropoda"
  },
  "corals": {
    "title": "Corals",
    "blurb": "Solitary rugose 'horn corals' and clusters. Look for the radial septa inside the calice.",
    "phylum": "cnidaria"
  },
  "mollusks": {
    "title": "Mollusks",
    "blurb": "Gastropods (snails) and bivalves. Less common than brachiopods but distinctive when present.",
    "phylum": "mollusca"
  },
  "echinoderms": {
    "title": "Echinoderms",
    "blurb": "Almost entirely disarticulated crinoid ossicles. Whole calyxes are rare.",
    "phylum": "echinodermata"
  },
  "bryozoans": {
    "title": "Bryozoans",
    "blurb": "Colonial filter-feeders — small branching or encrusting fragments.",
    "phylum": "bryozoa"
  },
  "unknown": {
    "title": "Awaiting identification",
    "blurb": "Specimens not yet confidently identified — contributions welcome.",
    "phylum": "unknown"
  }
};
const CLADES = {
  "spiriferids": {
    "title": "Spiriferid brachiopods",
    "blurb": "Wing-shaped outline, prominent fold & sulcus, many fine ribs.",
    "group": "brachiopods",
    "clade": "spiriferida"
  },
  "atrypids": {
    "title": "Atrypid brachiopods",
    "blurb": "Round to subcircular, biconvex, ribbed, often with concentric growth frills.",
    "group": "brachiopods",
    "clade": "atrypida"
  },
  "athyridids": {
    "title": "Athyridid brachiopods",
    "blurb": "Smooth or nearly smooth, oval to subcircular; faint concentric growth lines.",
    "group": "brachiopods",
    "clade": "athyridida"
  },
  "strophomenids": {
    "title": "Strophomenid & strophomenide-like brachiopods",
    "blurb": "Wide hinge line, flat to concavo-convex; fine radial costae.",
    "group": "brachiopods",
    "clade": "strophomenida"
  },
  "productids": {
    "title": "Productid brachiopods",
    "blurb": "Strongly concavo-convex, no interarea; usually with spines (often broken off, leaving bases).",
    "group": "brachiopods",
    "clade": "productida"
  },
  "pentamerids": {
    "title": "Pentamerid brachiopods",
    "blurb": "Globose; pronounced fold along midline; can resemble atrypids but with a keel-like ridge.",
    "group": "brachiopods",
    "clade": "pentamerida"
  },
  "orthids": {
    "title": "Orthid brachiopods",
    "blurb": "Subcircular, biconvex, finely costate.",
    "group": "brachiopods",
    "clade": "orthida"
  },
  "rhynchonellids": {
    "title": "Rhynchonellid brachiopods",
    "blurb": "Small, triangular outline, coarse ribs, deep sulcus.",
    "group": "brachiopods",
    "clade": "rhynchonellida"
  },
  "terebratulids": {
    "title": "Terebratulid brachiopods",
    "blurb": "Smooth, elongate-oval shells with no ribs.",
    "group": "brachiopods",
    "clade": "terebratulida"
  },
  "ord-orthids": {
    "title": "Ordovician orthid brachiopods",
    "blurb": "Maquoketa Group orthids — Cincinnatian Iowa.",
    "group": "brachiopods",
    "clade": "orthida"
  },
  "ord-strophomenids": {
    "title": "Ordovician strophomenid brachiopods",
    "blurb": "Maquoketa Group strophomenides.",
    "group": "brachiopods",
    "clade": "strophomenida"
  },
  "sil-brachs": {
    "title": "Silurian brachiopods (Anamosa fauna)",
    "blurb": "Late Silurian carbonate brachiopods of the Anamosa Mbr / Hopkinton Dolomite.",
    "group": "brachiopods",
    "clade": "sil-brachiopoda"
  },
  "asaphids": {
    "title": "Asaphid trilobites",
    "blurb": "Large, oval-outlined trilobites with smooth or weakly furrowed glabellae.",
    "group": "trilobites",
    "clade": "asaphida"
  },
  "calymenids": {
    "title": "Calymenid trilobites",
    "blurb": "Medium-sized trilobites with strongly furrowed glabella and many thoracic segments.",
    "group": "trilobites",
    "clade": "calymenida"
  },
  "corynexochids": {
    "title": "Corynexochid trilobites",
    "blurb": "Trilobites with elongate glabella reaching the anterior border.",
    "group": "trilobites",
    "clade": "corynexochida"
  },
  "rugose": {
    "title": "Rugose (horn) corals",
    "blurb": "Single conical or clustered cup-shaped corals; radial septa visible in cross-section.",
    "group": "corals",
    "clade": "rugosa"
  },
  "tabulate": {
    "title": "Tabulate corals",
    "blurb": "Colonial corals with horizontal partitions (tabulae) and no/very simple septa. Dominant Silurian corals at Anamosa.",
    "group": "corals",
    "clade": "tabulata"
  },
  "gastropods": {
    "title": "Gastropods",
    "blurb": "Coiled snails; usually preserved as internal molds.",
    "group": "mollusks",
    "clade": "gastropoda"
  },
  "bivalves": {
    "title": "Bivalves",
    "blurb": "Two-valved shells, symmetry between valves (contrast with brachiopods).",
    "group": "mollusks",
    "clade": "bivalvia"
  },
  "cephalopods": {
    "title": "Cephalopods",
    "blurb": "Chambered shells with internal septa. Ordovician/Silurian Iowa fauna has both orthocone (straight) and coiled forms.",
    "group": "mollusks",
    "clade": "cephalopoda"
  },
  "crinoids": {
    "title": "Crinoids",
    "blurb": "Disc-shaped columnals (stem segments) and stem fragments.",
    "group": "echinoderms",
    "clade": "crinoidea"
  },
  "cystoids": {
    "title": "Cystoids",
    "blurb": "Plated echinoderms with pore-rhomb breathing structures; mostly Ordovician.",
    "group": "echinoderms",
    "clade": "cystoidea"
  },
  "branching": {
    "title": "Branching bryozoans",
    "blurb": "Thin, twig-like branches with regular surface pores.",
    "group": "bryozoans",
    "clade": "bryozoa-branching"
  },
  "pending": {
    "title": "Pending ID",
    "blurb": "",
    "group": "unknown",
    "clade": "pending"
  }
};

const TAXA = [
  {
    "slug": "cyrtospirifer-whitneyi",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Cyrtospirifer",
    "species": "whitneyi",
    "photos": [
      {
        "src": "jsm",
        "file": "whitneyi_jsm_02.png",
        "site": "rockford"
      },
      {
        "src": "nathan",
        "file": "whitneyi_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "whitneyi_dave_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "whitneyi_dave_02.jpg",
        "site": "rockford"
      },
      {
        "src": "jsm",
        "file": "whitneyi_jsm_01.png",
        "site": "rockford"
      }
    ],
    "note": "Wide-winged; deep sulcus; many fine ribs.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "theodossia-hungerfordi",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Theodossia",
    "species": "hungerfordi",
    "photos": [
      {
        "src": "jsm",
        "file": "hungerfordi_jsm_01.png",
        "site": "rockford"
      },
      {
        "src": "nathan",
        "file": "hungerfordi_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "hungerfordi_dave_01.jpg",
        "site": "rockford"
      },
      {
        "src": "eqmn",
        "file": "hungerfordi_eqmn_01.png",
        "site": "rockford"
      }
    ],
    "note": "Globose, rounded outline; subdued ribs. Spiriferid by anatomy but the hinge is short — students often perceive it as astrophic.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "platyrachella-macbridei",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Platyrachella",
    "species": "macbridei",
    "photos": [
      {
        "src": "nathan",
        "file": "macbridei_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "macbridei_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Wide hinge; sharp ribs; flatter ventral valve. Sometimes placed in Spinocyrtia.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "tenticospirifer-sp",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Tenticospirifer",
    "species": "sp.",
    "photos": [
      {
        "src": "dave",
        "file": "sp_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Tall, pyramidal ventral valve.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "pyramidspirifer-sp",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Pyramidspirifer",
    "species": "sp.",
    "photos": [
      {
        "src": "nathan",
        "file": "sp_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Steep, pyramid-form spiriferid.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "conispirifer-cyrtinaeformis",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Conispirifer",
    "species": "cyrtinaeformis",
    "photos": [
      {
        "src": "jsm",
        "file": "cyrtinaeformis_jsm_01.png",
        "site": "rockford"
      },
      {
        "src": "nathan",
        "file": "cyrtinaeformis_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "cyrtinaeformis_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Narrow, cone-shaped; coarse ribs. Often listed in PBDB as Tenticospirifer cyrtinaeformis.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "cyrtina-iowaensis",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Cyrtina",
    "species": "iowaensis",
    "photos": [
      {
        "src": "nathan",
        "file": "iowaensis_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "iowaensis_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Small, sharply pyramidal; punctate shell.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "ambocoelia-sp",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Ambocoelia",
    "species": "sp.",
    "photos": [],
    "note": "Small, smooth-ish spiriferid with reduced ribbing. PBDB: 6 records at Rockford.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "tylothyris-sulcocostata",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Tylothyris",
    "species": "sulcocostata",
    "photos": [],
    "note": "Small spiriferid; sulcate fold with strong costae. PBDB: 3 records.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "tecnocyrtina-johnsoni",
    "group": "brachiopods",
    "subgroup": "spiriferids",
    "genus": "Tecnocyrtina",
    "species": "johnsoni",
    "photos": [],
    "note": "Late Givetian Cedar Valley spiriferid (Johnson, 1990). Small-to-medium; clear fold/sulcus; fine ribs. Associated with the Allanella allani Zone (D&C fig. 2).",
    "sites": [
      "crawford"
    ]
  },
  {
    "slug": "pseudoatrypa-devoniana",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Pseudoatrypa",
    "species": "devoniana",
    "photos": [
      {
        "src": "jsm",
        "file": "devoniana_jsm_02.png",
        "site": "rockford"
      },
      {
        "src": "nathan",
        "file": "devoniana_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "devoniana_dave_01.jpg",
        "site": "rockford"
      },
      {
        "src": "eqmn",
        "file": "devoniana_eqmn_01.png",
        "site": "rockford"
      },
      {
        "src": "daycopper",
        "file": "devoniana_daycopper_01.png",
        "site": "rockford"
      },
      {
        "src": "jsm",
        "file": "devoniana_jsm_01.png",
        "site": "rockford"
      }
    ],
    "note": "Subcircular, dorsibiconvex; fine tubular ribs; concentric growth frills. By far the most abundant atrypid at Rockford (Day & Copper 1998 plate from Cerro Gordo Mbr at Hackberry Grove and Rockford Quarry).",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "pseudoatrypa-lineata",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Pseudoatrypa",
    "species": "lineata",
    "photos": [
      {
        "src": "daycopper",
        "file": "lineata_daycopper_01.png",
        "site": "rockford"
      }
    ],
    "note": "Larger than P. devoniana; globose dorsibiconvex shell with an inflated dome-like dorsal valve; broad angular fold. Idlewild Mbr of the Lithograph City Fm, Floyd Co. (Day & Copper 1998). Per D&C also occurs in the Cedar Valley Group (Coralville Fm / State Quarry) — tag for Crawford once specimens are confirmed.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "spinatrypa-planosulcata",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Spinatrypa",
    "species": "planosulcata",
    "photos": [
      {
        "src": "nathan",
        "file": "planosulcata_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Globose, spinose; flat sulcus.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "spinatrypa-rockfordensis",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Spinatrypa",
    "species": "rockfordensis",
    "photos": [
      {
        "src": "jsm",
        "file": "rockfordensis_jsm_01.png",
        "site": "rockford"
      },
      {
        "src": "nathan",
        "file": "rockfordensis_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "jsm",
        "file": "rockfordensis_jsm_01.webp",
        "site": "rockford"
      },
      {
        "src": "daycopper",
        "file": "rockfordensis_daycopper_01.png",
        "site": "rockford"
      }
    ],
    "note": "Medium-to-large; biconvex to dorsibiconvex; wider than long with rounded outline; coarse undulating ribs (4–7/10 mm); spinose lamellae. Holotype from Rockford Quarry (Day & Copper 1998).",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "spinatrypa-sp",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Spinatrypa",
    "species": "sp.",
    "photos": [
      {
        "src": "dave",
        "file": "sp_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Generic spinatrypid view.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "desquamatia-independatrypa-scutiformis",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Desquamatia",
    "species": "(Independatrypa) scutiformis",
    "photos": [
      {
        "src": "eqmn",
        "file": "independatrypa_eqmn_01.png",
        "site": "rockford"
      },
      {
        "src": "daycopper",
        "file": "independatrypa_scutiformis_daycopper_01.png",
        "site": "rockford"
      }
    ],
    "note": "Strophic, shield-shaped; dorsibiconvex with coarse imbricate growth lamellae. Type Lime Creek / Lithograph City Fm taxon (Stainbrook 1938; plate from Day & Copper 1998 Fig. 5).",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "hystricina-trulla",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Hystricina",
    "species": "trulla",
    "photos": [
      {
        "src": "eqmn",
        "file": "trulla_eqmn_01.png",
        "site": "rockford"
      }
    ],
    "note": "Small; densely spinose surface.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "costatrypa-varicostata",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Costatrypa",
    "species": "varicostata",
    "photos": [],
    "note": "Late Frasnian Lime Creek Fm atrypid (Stainbrook 1945); listed by Day & Copper 1998 as part of the standard Lime Creek atrypid fauna. PBDB: 1 record.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "iowatrypa-owenensis",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Iowatrypa",
    "species": "owenensis",
    "photos": [],
    "note": "Late Frasnian Lime Creek Fm atrypid (Webster, 1921); zone fossil for the uppermost Lime Creek (M.N. Zone 13 — 'Iowatrypa owenensis Zone'). Day & Copper 1998.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "iowatrypa-minor",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Iowatrypa",
    "species": "minor",
    "photos": [],
    "note": "Smaller congener of I. owenensis in the Lime Creek Fm fauna (Fenton & Fenton, 1924). Day & Copper 1998.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "spinatrypa-bellula",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Spinatrypa",
    "species": "bellula",
    "photos": [],
    "note": "Cedar Valley Group atrypid (Hall, 1858). Globose, spinose; smaller and less coarsely ribbed than the Frasnian S. rockfordensis.",
    "sites": [
      "crawford"
    ]
  },
  {
    "slug": "allanella-allani",
    "group": "brachiopods",
    "subgroup": "atrypids",
    "genus": "Allanella",
    "species": "allani",
    "photos": [],
    "note": "Zone fossil for the Allanella allani Zone (latest Givetian–earliest Frasnian), spanning upper Cedar Valley into lowermost Lithograph City. Small-to-medium dorsibiconvex atrypid with fine ribs. Day & Copper 1998 fig. 2.",
    "sites": [
      "crawford"
    ]
  },
  {
    "slug": "riqauxia-orestes",
    "group": "brachiopods",
    "subgroup": "athyridids",
    "genus": "Riqauxia",
    "species": "orestes",
    "photos": [
      {
        "src": "nathan",
        "file": "orestes_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Smooth, oval; subtle growth lines. PBDB sometimes lists as 'Spirifer orestes'.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "athyris-vittata",
    "group": "brachiopods",
    "subgroup": "athyridids",
    "genus": "Athyris",
    "species": "vittata",
    "photos": [],
    "note": "Smooth-shelled athyrid common in Iowa Cedar Valley Group. Subcircular, biconvex, with faint concentric growth lines.",
    "sites": [
      "crawford"
    ]
  },
  {
    "slug": "douvillina-arcuata",
    "group": "brachiopods",
    "subgroup": "strophomenids",
    "genus": "Douvillina",
    "species": "arcuata",
    "photos": [
      {
        "src": "jsm",
        "file": "arcuata_jsm_01.png",
        "site": "rockford"
      },
      {
        "src": "nathan",
        "file": "arcuata_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Concavo-convex; geniculate margin; fine ribs.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "strophodonta-sp",
    "group": "brachiopods",
    "subgroup": "strophomenids",
    "genus": "Strophodonta",
    "species": "sp.",
    "photos": [
      {
        "src": "nathan",
        "file": "sp_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Very wide hinge; fine ribs; no pedicle foramen. Most Rockford specimens are S. thomasi. (Cedar Valley Strophodonta — usually S. callawayensis — exists but isn't yet tagged for Crawford pending specimen confirmation.)",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "nervostrophia-rockfordensis",
    "group": "brachiopods",
    "subgroup": "strophomenids",
    "genus": "Nervostrophia",
    "species": "rockfordensis",
    "photos": [
      {
        "src": "nathan",
        "file": "rockfordensis_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "rockfordensis_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Strong primary costae alternating with finer ones.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "moravostrophia-sp",
    "group": "brachiopods",
    "subgroup": "strophomenids",
    "genus": "Moravostrophia",
    "species": "sp.",
    "photos": [
      {
        "src": "nathan",
        "file": "sp_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Wide-hinged; very fine costae.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "strophonelloides-reversa",
    "group": "brachiopods",
    "subgroup": "strophomenids",
    "genus": "Strophonelloides",
    "species": "reversa",
    "photos": [
      {
        "src": "nathan",
        "file": "reversa_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "reversa_dave_01.jpg",
        "site": "rockford"
      },
      {
        "src": "eqmn",
        "file": "reversa_eqmn_01.png",
        "site": "rockford"
      }
    ],
    "note": "Strongly resupinate — convexity reverses across growth. (Older lit: Strophonella reversa.)",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "sulcatostrophia-camerata",
    "group": "brachiopods",
    "subgroup": "strophomenids",
    "genus": "Sulcatostrophia",
    "species": "camerata",
    "photos": [
      { "src": "nathan", "file": "camerata_nathan_01.jpg", "site": "rockford" },
      { "src": "jsm", "file": "camerata_jsm_02.png", "site": "rockford" },
      { "src": "jsm", "file": "camerata_jsm_dorsal.png", "site": "rockford" },
      { "src": "jsm", "file": "camerata_jsm_ventral.png", "site": "rockford" },
      { "src": "jsm", "file": "camerata_jsm_side.png", "site": "rockford" },
      { "src": "jsm", "file": "camerata_jsm_anterior.png", "site": "rockford" },
      { "src": "jsm", "file": "camerata_jsm_posterior.png", "site": "rockford" }
    ],
    "note": "Sulcate; fine costae. (Older spelling: Sulcastrophia.)",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "schuchertella-sp",
    "group": "brachiopods",
    "subgroup": "strophomenids",
    "genus": "Schuchertella",
    "species": "sp.",
    "photos": [
      {
        "src": "dave",
        "file": "sp_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Concavo-convex; coarser costae than most strophomenes. Most Rockford specimens are S. parva.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "devonoproductus-sp",
    "group": "brachiopods",
    "subgroup": "productids",
    "genus": "Devonoproductus",
    "species": "sp.",
    "photos": [
      {
        "src": "nathan",
        "file": "sp_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "sp_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Highly convex ventral valve; spine bases on shell. Most Rockford specimens are D. walcotti.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "productella-sp",
    "group": "brachiopods",
    "subgroup": "productids",
    "genus": "Productella",
    "species": "sp.",
    "photos": [],
    "note": "Second productid genus at Rockford — smaller, less inflated than Devonoproductus. PBDB: 9 records.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "gypidula-cornuta",
    "group": "brachiopods",
    "subgroup": "pentamerids",
    "genus": "Gypidula",
    "species": "cornuta",
    "photos": [
      {
        "src": "nathan",
        "file": "cornuta_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Globose; strong median fold; smooth or coarsely ribbed. Frasnian-aged form within the genus range (Treatise: *Gypidula* spans Silurian Telychian–Upper Devonian Frasnian).",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "gypidula-typicalis",
    "group": "brachiopods",
    "subgroup": "pentamerids",
    "genus": "Gypidula",
    "species": "typicalis",
    "photos": [
      {
        "src": "treatise",
        "file": "typicalis_treatise_01.png",
        "site": "crawford"
      }
    ],
    "note": "Type species of *Gypidula* (HALL, 1867); illustrated from the Cedar Valley Group of Iowa (Amsden 1965). Ventribiconvex; well-developed dorsal sulcus and ventral fold; lyre-shaped hinge plates visible in serial section. Treatise Fig. 681,2a–d.",
    "sites": [
      "crawford"
    ]
  },
  {
    "slug": "schizophoria-iowensis",
    "group": "brachiopods",
    "subgroup": "orthids",
    "genus": "Schizophoria",
    "species": "iowensis",
    "photos": [
      {
        "src": "nathan",
        "file": "iowensis_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "dave",
        "file": "iowensis_dave_01.jpg",
        "site": "rockford"
      },
      {
        "src": "eqmn",
        "file": "iowensis_eqmn_01.png",
        "site": "rockford"
      },
      {
        "src": "jsm",
        "file": "iowensis_jsm_01.png",
        "site": "rockford"
      },
      {
        "src": "jsm",
        "file": "iowensis_jsm_02.png",
        "site": "rockford"
      },
      {
        "src": "jsm",
        "file": "iowensis_jsm_01.png",
        "site": "crawford"
      },
      {
        "src": "stigallrode",
        "file": "iowensis_stigallrode_01.png",
        "site": "rockford"
      }
    ],
    "note": "Medium-sized, dorsibiconvex; transversely ovate outline; short hinge with truncated cardinal extremities; moderately to highly developed fold + sulcus; fine costae. Givetian Cedar Valley Group → Frasnian Lime Creek Fm. Two morphotypes recognized — 'A' (subcircular) and 'B' (transverse, formerly *macfarlanii*). Stigall Rode 2005 synonymises *S. macfarlanii* and *S. iowaensis* (older spelling) into *S. iowensis*. The Stigall Rode plate shows panel 3 = *iowensis* lectotype, panels 5–7 = *macfarlanii* (now *iowensis* 'B').",
    "sites": [
      "rockford",
      "crawford"
    ]
  },
  {
    "slug": "schizophoria-magna",
    "group": "brachiopods",
    "subgroup": "orthids",
    "genus": "Schizophoria",
    "species": "magna",
    "photos": [
      {
        "src": "stigallrode",
        "file": "iowensis_stigallrode_01.png",
        "site": "rockford"
      }
    ],
    "note": "Larger, more inflated congener of *S. iowensis*; longer hinge line, wider dorsal umbonal angle, narrower delthyrium. Givetian Cedar Valley Lst → Frasnian Lime Creek Fm of Iowa (Stigall Rode 2005). Field-distinguishing *S. magna* from *S. iowensis* is morphometric — note coexistence at both Iowa sites. Plate panels 1 and 2a/2b in the shared Stigall Rode figure are *magna*.",
    "sites": [
      "rockford",
      "crawford"
    ]
  },
  {
    "slug": "cupularostrum-saxatillis",
    "group": "brachiopods",
    "subgroup": "rhynchonellids",
    "genus": "Cupularostrum",
    "species": "saxatillis",
    "photos": [
      {
        "src": "nathan",
        "file": "saxatillis_nathan_01.jpg",
        "site": "rockford"
      },
      {
        "src": "treatise",
        "file": "camarotoechia_congregata_treatise_01.png",
        "site": "rockford"
      }
    ],
    "note": "Triangular; coarsely ribbed; deep sulcus. Older lit places this in *Camarotoechia* (per Treatise: low rounded costae present on flanks AND fold/sulcus, fold/sulcus low + commencing at umbones, anterior commissure uniplicate). Treatise Fig. 769,1a–b illustrates the Camarotoechia type species *C. congregata* for genus comparison.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "leiorhynchus-argenteum",
    "group": "brachiopods",
    "subgroup": "rhynchonellids",
    "genus": "Leiorhynchus",
    "species": "argenteum",
    "photos": [
      {
        "src": "treatise",
        "file": "quadracostata_treatise_01.png",
        "site": "rockford"
      }
    ],
    "note": "Subcircular to transversely ovate; biconvex. **Diagnostic:** umbones smooth; costae low and simple, most pronounced on fold/sulcus and weak on flanks (per Treatise diagnosis). Fold + sulcus arise at midlength, not at umbo — distinguishes from *Cupularostrum*/*Camarotoechia*. Treatise Fig. 771,1a–o shows type species *L. quadracostata*.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "cranaena-navicella",
    "group": "brachiopods",
    "subgroup": "terebratulids",
    "genus": "Cranaena",
    "species": "navicella",
    "photos": [
      {
        "src": "nathan",
        "file": "navicella_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Smooth oval shell; no costae.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "cranaenella-sp",
    "group": "brachiopods",
    "subgroup": "terebratulids",
    "genus": "Cranaenella",
    "species": "sp.",
    "photos": [],
    "note": "Smaller, more elongate terebratulid; rarer than Cranaena. PBDB: 5 records.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "plaesiomys-subquadrata",
    "group": "brachiopods",
    "subgroup": "ord-orthids",
    "genus": "Plaesiomys",
    "species": "subquadrata",
    "photos": [],
    "note": "Common Ordovician orthid in the Maquoketa Group. PBDB top taxon at Elgin (3 records).",
    "sites": [
      "graf",
      "elgin-clement"
    ]
  },
  {
    "slug": "paucicrura-corpulenta",
    "group": "brachiopods",
    "subgroup": "ord-orthids",
    "genus": "Paucicrura",
    "species": "corpulenta",
    "photos": [],
    "note": "Small Ordovician orthid; reported from Elgin Mbr.",
    "sites": [
      "graf",
      "elgin-clement"
    ]
  },
  {
    "slug": "megamyonia-unicostata",
    "group": "brachiopods",
    "subgroup": "ord-strophomenids",
    "genus": "Megamyonia",
    "species": "unicostata",
    "photos": [],
    "note": "Common Ordovician strophomenid (PBDB: 4 records at Graf, 2 at Elgin).",
    "sites": [
      "graf",
      "elgin-clement"
    ]
  },
  {
    "slug": "thaerodonta-saxea",
    "group": "brachiopods",
    "subgroup": "ord-strophomenids",
    "genus": "Thaerodonta",
    "species": "saxea",
    "photos": [],
    "note": "Strophomenid in the Elgin Mbr.",
    "sites": [
      "elgin-clement"
    ]
  },
  {
    "slug": "atrypa-reticularis",
    "group": "brachiopods",
    "subgroup": "sil-brachs",
    "genus": "Atrypa",
    "species": "reticularis",
    "photos": [],
    "note": "Classic Silurian atrypid — globose, ribbed, with concentric growth lamellae. PBDB: 11 records at Anamosa.",
    "sites": [
      "anamosa",
      "maquoketa-caves"
    ]
  },
  {
    "slug": "costistricklandia-castellana",
    "group": "brachiopods",
    "subgroup": "sil-brachs",
    "genus": "Costistricklandia",
    "species": "castellana",
    "photos": [],
    "note": "Late Silurian pentamerid — globose, with strong median fold. PBDB: 11 records.",
    "sites": [
      "anamosa"
    ]
  },
  {
    "slug": "ferganella-sp",
    "group": "brachiopods",
    "subgroup": "sil-brachs",
    "genus": "Ferganella",
    "species": "sp.",
    "photos": [],
    "note": "Silurian rhynchonellid. PBDB: 13 records.",
    "sites": [
      "anamosa"
    ]
  },
  {
    "slug": "resserella-sp",
    "group": "brachiopods",
    "subgroup": "sil-brachs",
    "genus": "Resserella",
    "species": "sp.",
    "photos": [],
    "note": "Silurian orthid. PBDB: 9 records.",
    "sites": [
      "anamosa"
    ]
  },
  {
    "slug": "isorthis-sp",
    "group": "brachiopods",
    "subgroup": "sil-brachs",
    "genus": "Isorthis",
    "species": "sp.",
    "photos": [],
    "note": "Silurian orthid. PBDB: 9 records.",
    "sites": [
      "anamosa"
    ]
  },
  {
    "slug": "isotelus-sp",
    "group": "trilobites",
    "subgroup": "asaphids",
    "genus": "Isotelus",
    "species": "sp.",
    "photos": [],
    "note": "Large Ordovician asaphid trilobite — the classic Iowa Maquoketa trilobite. PBDB: 2 records at Elgin.",
    "sites": [
      "elgin-clement"
    ]
  },
  {
    "slug": "calymene-sp",
    "group": "trilobites",
    "subgroup": "calymenids",
    "genus": "Calymene",
    "species": "sp.",
    "photos": [],
    "note": "Common Silurian calymenid. PBDB: 11 records at Anamosa.",
    "sites": [
      "anamosa"
    ]
  },
  {
    "slug": "stenopareia-sp",
    "group": "trilobites",
    "subgroup": "corynexochids",
    "genus": "Stenopareia",
    "species": "sp.",
    "photos": [],
    "note": "Silurian corynexochid (likely Bumastella-related). PBDB: 11 records.",
    "sites": [
      "anamosa"
    ]
  },
  {
    "slug": "horn-corals-assorted",
    "group": "corals",
    "subgroup": "rugose",
    "genus": "Horn corals",
    "species": "(assorted)",
    "photos": [
      {
        "src": "dave",
        "file": "assorted_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "horn_corals",
    "note": "Fragmentary rugose corals — typical Rockford finds; usually Tabulophyllum or Heliophyllum.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "horn-corals-cluster",
    "group": "corals",
    "subgroup": "rugose",
    "genus": "Horn corals",
    "species": "(cluster)",
    "photos": [
      {
        "src": "dave",
        "file": "cluster_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "horn_corals",
    "note": "Multiple calices clustered on a single piece.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "tabulophyllum-sp",
    "group": "corals",
    "subgroup": "rugose",
    "genus": "Tabulophyllum",
    "species": "sp.",
    "photos": [],
    "note": "Solitary rugose coral with well-developed tabulae. Most diverse horn-coral genus at Rockford (8+ species in PBDB).",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "heliophyllum-solidum",
    "group": "corals",
    "subgroup": "rugose",
    "genus": "Heliophyllum",
    "species": "solidum",
    "photos": [],
    "note": "Solitary rugose coral; carinate septa giving 'feathered' appearance in cross-section. PBDB: 4 records.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "hexagonaria-sp",
    "group": "corals",
    "subgroup": "rugose",
    "genus": "Hexagonaria",
    "species": "sp.",
    "photos": [],
    "note": "Colonial rugose coral — typical 'honeycomb' polygonal corallites in cross-section. Common in Cedar Valley Group of Iowa.",
    "sites": [
      "crawford"
    ]
  },
  {
    "slug": "grewingkia-sp",
    "group": "corals",
    "subgroup": "rugose",
    "genus": "Grewingkia",
    "species": "sp.",
    "photos": [],
    "note": "Common Ordovician horn coral in the Maquoketa Group.",
    "sites": [
      "elgin-clement"
    ]
  },
  {
    "slug": "halysites-sp",
    "group": "corals",
    "subgroup": "tabulate",
    "genus": "Halysites",
    "species": "sp.",
    "photos": [],
    "note": "'Chain coral' — corallites linked end-to-end in chain-like rows when viewed in cross-section. Silurian diagnostic. PBDB top coral at Anamosa (17 records).",
    "sites": [
      "anamosa",
      "maquoketa-caves"
    ]
  },
  {
    "slug": "favosites-sp",
    "group": "corals",
    "subgroup": "tabulate",
    "genus": "Favosites",
    "species": "sp.",
    "photos": [],
    "note": "'Honeycomb coral' — polygonal corallites packed tightly together in a colony. PBDB: 13 records at Anamosa.",
    "sites": [
      "anamosa",
      "maquoketa-caves"
    ]
  },
  {
    "slug": "heliolites-sp",
    "group": "corals",
    "subgroup": "tabulate",
    "genus": "Heliolites",
    "species": "sp.",
    "photos": [],
    "note": "Tabulate coral with small corallites separated by coenenchyme (mesh-like tissue between).",
    "sites": [
      "anamosa"
    ]
  },
  {
    "slug": "gastropods-assorted",
    "group": "mollusks",
    "subgroup": "gastropods",
    "genus": "Gastropods",
    "species": "(assorted)",
    "photos": [
      {
        "src": "dave",
        "file": "assorted_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "gastropods_misc",
    "note": "Range of sizes/coiling; commonly internal molds.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "gastropods-large",
    "group": "mollusks",
    "subgroup": "gastropods",
    "genus": "Gastropods",
    "species": "(large)",
    "photos": [
      {
        "src": "dave",
        "file": "large_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "gastropods_misc",
    "note": "Large internal mold; spire often abraded.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "floyda-gigantea",
    "group": "mollusks",
    "subgroup": "gastropods",
    "genus": "Floyda",
    "species": "gigantea",
    "photos": [],
    "note": "Large, low-spired Euomphalid gastropod — diagnostic Rockford taxon. PBDB: 4+ records.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "diaphorostoma-antiquum",
    "group": "mollusks",
    "subgroup": "gastropods",
    "genus": "Diaphorostoma",
    "species": "antiquum",
    "photos": [],
    "note": "Globose, low-spired gastropod with broad aperture. PBDB: 6 records across species.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "straparollus-sp",
    "group": "mollusks",
    "subgroup": "gastropods",
    "genus": "Straparollus",
    "species": "sp.",
    "photos": [],
    "note": "Flat-spired euomphaloid gastropod; tightly coiled disc. PBDB: 5 records.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "paracyclas-sabini",
    "group": "mollusks",
    "subgroup": "bivalves",
    "genus": "Paracyclas",
    "species": "sabini",
    "photos": [
      {
        "src": "dave",
        "file": "sabini_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "note": "Subcircular, low-relief growth lines. PBDB also lists P. elliptica, parvula, dubia at Rockford.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "bivalves-assorted-large",
    "group": "mollusks",
    "subgroup": "bivalves",
    "genus": "Bivalves",
    "species": "(assorted large)",
    "photos": [
      {
        "src": "dave",
        "file": "large_assorted_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "bivalves_misc",
    "note": "Rounded, smooth-shelled bivalves.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "isorthoceras-sociale",
    "group": "mollusks",
    "subgroup": "cephalopods",
    "genus": "Isorthoceras",
    "species": "sociale",
    "photos": [],
    "note": "Straight (orthocone) Ordovician nautiloid in the Maquoketa Group. PBDB: 2 records at Elgin.",
    "sites": [
      "elgin-clement"
    ]
  },
  {
    "slug": "crinoids-columnals",
    "group": "echinoderms",
    "subgroup": "crinoids",
    "genus": "Crinoids",
    "species": "columnals",
    "photos": [
      {
        "src": "dave",
        "file": "columnals_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "crinoids_misc",
    "note": "Stem discs and segments; star-shaped lumen common.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "cupulocrinus-angustatus",
    "group": "echinoderms",
    "subgroup": "crinoids",
    "genus": "Cupulocrinus",
    "species": "angustatus",
    "photos": [],
    "note": "Common Ordovician crinoid in the Maquoketa Group at Graf. Cupulate calyx.",
    "sites": [
      "graf"
    ]
  },
  {
    "slug": "carabocrinus-slocomi",
    "group": "echinoderms",
    "subgroup": "crinoids",
    "genus": "Carabocrinus",
    "species": "slocomi",
    "photos": [],
    "note": "Porocrinid crinoid — Maquoketa Group, Graf area. Top PBDB taxon at Graf (7 records).",
    "sites": [
      "graf"
    ]
  },
  {
    "slug": "eucalyptocrinites-ornatus",
    "group": "echinoderms",
    "subgroup": "crinoids",
    "genus": "Eucalyptocrinites",
    "species": "ornatus",
    "photos": [],
    "note": "Large Silurian camerate crinoid with characteristic cup-like calyx. PBDB: 10 records at Anamosa.",
    "sites": [
      "anamosa"
    ]
  },
  {
    "slug": "iowacystis-sagittaria",
    "group": "echinoderms",
    "subgroup": "cystoids",
    "genus": "Iowacystis",
    "species": "sagittaria",
    "photos": [],
    "note": "Distinctive Ordovician cystoid (Maquoketa Group, Graf area). PBDB: 4 records.",
    "sites": [
      "graf"
    ]
  },
  {
    "slug": "bryozoans-fragments",
    "group": "bryozoans",
    "subgroup": "branching",
    "genus": "Bryozoans",
    "species": "(fragments)",
    "photos": [
      {
        "src": "dave",
        "file": "fragments_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "bryozoans_misc",
    "note": "Branching colony fragments; pores in regular pattern. PBDB-named genera include Fenestella, Petalotrypa, Leioclema.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "unknown-nathan-9",
    "group": "unknown",
    "subgroup": "pending",
    "genus": "Unknown",
    "species": "(Nathan #9)",
    "photos": [
      {
        "src": "nathan",
        "file": "nathan_9_nathan_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "unknown_misc",
    "note": "Possibly Paracyclas or a gastropod from above.",
    "sites": [
      "rockford"
    ]
  },
  {
    "slug": "tubey-belt",
    "group": "unknown",
    "subgroup": "pending",
    "genus": "\"Tubey belt\"",
    "species": "",
    "photos": [
      {
        "src": "dave",
        "file": "tubey_belt_dave_01.jpg",
        "site": "rockford"
      }
    ],
    "dir": "unknown_misc",
    "note": "Paired rounded molluscan(?) forms — needs ID.",
    "sites": [
      "rockford"
    ]
  }
];

// ---- Build the grouped FAUNA that render.js consumes, from the registry. ----
// Each taxon is stamped with derived .images/.traits/.sites + folder keys
// (._phylum/._clade/._slug) so existing views and imgPath() work unchanged.
const FAUNA = (() => {
  const byGroup = {};
  for (const t of TAXA) {
    t.images = t.photos;
    t.traits = (typeof SCORINGS !== "undefined" && SCORINGS[t.slug]) || {};
    t._phylum = PHYLA[t.group].phylum;
    t._clade  = CLADES[t.subgroup].clade;
    t._slug   = t.slug;
    (byGroup[t.group] = byGroup[t.group] || {})[t.subgroup] =
      (byGroup[t.group][t.subgroup] || []);
    byGroup[t.group][t.subgroup].push(t);
  }
  const groups = [];
  for (const gid in byGroup) {
    const subs = [];
    for (const sgid in byGroup[gid])
      subs.push({ id: sgid, title: CLADES[sgid].title, blurb: CLADES[sgid].blurb, taxa: byGroup[gid][sgid] });
    groups.push({ id: gid, title: PHYLA[gid].title, blurb: PHYLA[gid].blurb, subgroups: subs });
  }
  return groups;
})();
