// Central scorings database — categorical trait scorings keyed by taxon slug.
// One place to review/edit every taxon's diagnostic traits.
const SCORINGS = {
  "cyrtospirifer-whitneyi": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "wing-shaped",
    "interarea_form": "low",
    "size": "medium",
    "umbones": "ribbed"
  },
  "theodossia-hungerfordi": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": [
      "strophic",
      "astrophic"
    ],
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "platyrachella-macbridei": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "wing-shaped",
    "interarea_form": "low",
    "size": "medium",
    "umbones": "ribbed"
  },
  "tenticospirifer-sp": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "conical",
    "interarea_form": "pyramidal",
    "size": "small",
    "umbones": "ribbed"
  },
  "pyramidspirifer-sp": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "conical",
    "interarea_form": "pyramidal",
    "size": "small",
    "umbones": "ribbed"
  },
  "conispirifer-cyrtinaeformis": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "conical",
    "interarea_form": "pyramidal",
    "size": "small",
    "umbones": "ribbed"
  },
  "cyrtina-iowaensis": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "conical",
    "interarea_form": "pyramidal",
    "size": "small",
    "umbones": "ribbed"
  },
  "ambocoelia-sp": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "subcircular",
    "size": "small",
    "umbones": "smooth"
  },
  "tylothyris-sulcocostata": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "conical",
    "interarea_form": "low",
    "size": "small",
    "umbones": "ribbed"
  },
  "tecnocyrtina-johnsoni": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "wing-shaped",
    "interarea_form": "low",
    "size": "small",
    "umbones": "ribbed"
  },
  "pseudoatrypa-devoniana": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "pseudoatrypa-lineata": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "large",
    "umbones": "ribbed"
  },
  "spinatrypa-planosulcata": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "surface_spines": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "spinatrypa-rockfordensis": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "surface_spines": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "spinatrypa-sp": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "surface_spines": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "desquamatia-independatrypa-scutiformis": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "profile": "biconvex",
    "hinge": [
      "strophic",
      "astrophic"
    ],
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "hystricina-trulla": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "surface_spines": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "subcircular",
    "size": "small",
    "umbones": "ribbed"
  },
  "costatrypa-varicostata": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "iowatrypa-owenensis": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "iowatrypa-minor": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "small",
    "umbones": "ribbed"
  },
  "spinatrypa-bellula": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "surface_spines": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "subcircular",
    "size": "small",
    "umbones": "ribbed"
  },
  "allanella-allani": {
    "surface_ribs": "yes",
    "surface_frills": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": [
      "small",
      "medium"
    ],
    "umbones": "ribbed"
  },
  "riqauxia-orestes": {
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "elongate-oval",
    "size": "medium",
    "umbones": "smooth"
  },
  "athyris-vittata": {
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "smooth"
  },
  "douvillina-arcuata": {
    "surface_ribs": "yes",
    "profile": "concavo-convex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "absent",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "strophodonta-sp": {
    "surface_ribs": "yes",
    "profile": "concavo-convex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "absent",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "nervostrophia-rockfordensis": {
    "surface_ribs": "yes",
    "profile": "concavo-convex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "absent",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "moravostrophia-sp": {
    "surface_ribs": "yes",
    "profile": "concavo-convex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "absent",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "strophonelloides-reversa": {
    "surface_ribs": "yes",
    "profile": "concavo-convex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "absent",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "sulcatostrophia-camerata": {
    "surface_ribs": "yes",
    "profile": "concavo-convex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "schuchertella-sp": {
    "surface_ribs": "yes",
    "profile": "concavo-convex",
    "hinge": "strophic",
    "spines": "absent",
    "fold_sulcus": [
      "absent",
      "weak"
    ],
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "devonoproductus-sp": {
    "surface_ribs": "yes",
    "surface_spines": "yes",
    "profile": "concavo-convex",
    "hinge": [
      "strophic",
      "astrophic"
    ],
    "spines": "present",
    "fold_sulcus": "absent",
    "outline": "subcircular",
    "size": "medium",
    "umbones": [
      "ribbed",
      "smooth"
    ]
  },
  "productella-sp": {
    "surface_ribs": "yes",
    "surface_spines": "yes",
    "profile": "concavo-convex",
    "hinge": [
      "strophic",
      "astrophic"
    ],
    "spines": "present",
    "fold_sulcus": "absent",
    "outline": "subcircular",
    "size": [
      "small",
      "medium"
    ],
    "umbones": [
      "ribbed",
      "smooth"
    ]
  },
  "gypidula-cornuta": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": [
      "ribbed",
      "smooth"
    ]
  },
  "gypidula-typicalis": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": [
      "ribbed",
      "smooth"
    ]
  },
  "schizophoria-iowensis": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": [
      "strophic",
      "astrophic"
    ],
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "medium",
    "umbones": "ribbed"
  },
  "schizophoria-magna": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": [
      "strophic",
      "astrophic"
    ],
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "large",
    "umbones": "ribbed"
  },
  "cupularostrum-saxatillis": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "strong",
    "outline": "subcircular",
    "size": "small",
    "umbones": "ribbed"
  },
  "leiorhynchus-argenteum": {
    "surface_ribs": "yes",
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "weak",
    "outline": "subcircular",
    "size": [
      "small",
      "medium"
    ],
    "umbones": "smooth"
  },
  "cranaena-navicella": {
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "absent",
    "outline": "elongate-oval",
    "size": "medium",
    "umbones": "smooth"
  },
  "cranaenella-sp": {
    "profile": "biconvex",
    "hinge": "astrophic",
    "spines": "absent",
    "fold_sulcus": "absent",
    "outline": "elongate-oval",
    "size": "small",
    "umbones": "smooth"
  }
};
