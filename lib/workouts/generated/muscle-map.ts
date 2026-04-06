/* eslint-disable */
// Generated from docs/prototype_files/coachAI-muscle-map-v2.html
// Do not edit manually.

export type MuscleView = "front" | "back";

export interface MuscleHotspot {
  id: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
  view: MuscleView;
}

export const MUSCLE_GROUP_TO_HOTSPOTS: Record<string, string[]> = {
  "peitoral_maior": [
    "f-pec-l",
    "f-pec-r"
  ],
  "peitoral_superior": [
    "f-pec-upper-l",
    "f-pec-upper-r"
  ],
  "peitoral_inferior": [
    "f-pec-lower-l",
    "f-pec-lower-r"
  ],
  "peitoral": [
    "f-pec-l",
    "f-pec-r"
  ],
  "peito": [
    "f-pec-l",
    "f-pec-r"
  ],
  "deltoide_anterior": [
    "f-delt-ant-l",
    "f-delt-ant-r"
  ],
  "deltoide_lateral": [
    "f-delt-lat-l",
    "f-delt-lat-r"
  ],
  "deltoide_posterior": [
    "b-delt-post-l",
    "b-delt-post-r"
  ],
  "deltoide_3_porcoes": [
    "f-delt-ant-l",
    "f-delt-ant-r",
    "f-delt-lat-l",
    "f-delt-lat-r",
    "b-delt-post-l",
    "b-delt-post-r"
  ],
  "deltoide": [
    "f-delt-ant-l",
    "f-delt-ant-r",
    "f-delt-lat-l",
    "f-delt-lat-r"
  ],
  "ombros": [
    "f-delt-ant-l",
    "f-delt-ant-r",
    "f-delt-lat-l",
    "f-delt-lat-r"
  ],
  "trapezio": [
    "f-trap-l",
    "f-trap-r",
    "b-trap-mid"
  ],
  "trapezio_superior": [
    "f-trap-l",
    "f-trap-r",
    "b-trap-upper"
  ],
  "biceps_braquial": [
    "f-bicep-l",
    "f-bicep-r"
  ],
  "biceps_braquial_cabeca_longa": [
    "f-bicep-l",
    "f-bicep-r"
  ],
  "biceps": [
    "f-bicep-l",
    "f-bicep-r"
  ],
  "triceps_braquial": [
    "b-tricep-l",
    "b-tricep-r"
  ],
  "triceps_cabeca_longa": [
    "b-tricep-l",
    "b-tricep-r"
  ],
  "triceps": [
    "b-tricep-l",
    "b-tricep-r"
  ],
  "braquial": [
    "f-brachialis-l",
    "f-brachialis-r"
  ],
  "braquiorradial": [
    "f-forearm-l",
    "f-forearm-r"
  ],
  "bracos": [
    "f-bicep-l",
    "f-bicep-r",
    "b-tricep-l",
    "b-tricep-r"
  ],
  "antebraco": [
    "f-forearm-l",
    "f-forearm-r",
    "b-forearm-l",
    "b-forearm-r"
  ],
  "flexores_do_antebraco": [
    "f-forearm-l",
    "f-forearm-r"
  ],
  "extensores_do_antebraco": [
    "b-forearm-l",
    "b-forearm-r"
  ],
  "latissimo_do_dorso": [
    "b-lat-l",
    "b-lat-r"
  ],
  "dorsais": [
    "b-lat-l",
    "b-lat-r"
  ],
  "costas": [
    "b-lat-l",
    "b-lat-r",
    "b-trap-mid"
  ],
  "romboides": [
    "b-rhomboid"
  ],
  "eretores_da_espinha": [
    "b-erector-l",
    "b-erector-r"
  ],
  "eretores": [
    "b-erector-l",
    "b-erector-r"
  ],
  "coluna_toracica": [
    "b-erector-l",
    "b-erector-r",
    "b-rhomboid"
  ],
  "coluna": [
    "b-erector-l",
    "b-erector-r"
  ],
  "quadratus_lumborum": [
    "b-ql-l",
    "b-ql-r"
  ],
  "levantador_da_escapula": [
    "f-trap-l",
    "f-trap-r"
  ],
  "reto_abdominal": [
    "f-abs"
  ],
  "reto_abdominal_inferior": [
    "f-abs-lower"
  ],
  "obliquos": [
    "f-oblique-l",
    "f-oblique-r"
  ],
  "transverso_abdominal": [
    "f-transverse"
  ],
  "core_transverso": [
    "f-transverse",
    "f-abs"
  ],
  "core": [
    "f-abs",
    "f-oblique-l",
    "f-oblique-r",
    "f-transverse"
  ],
  "flexores_do_quadril": [
    "f-hipflex-l",
    "f-hipflex-r"
  ],
  "gluteo_maximo": [
    "b-glute-max-l",
    "b-glute-max-r"
  ],
  "gluteo_medio": [
    "b-glute-med-l",
    "b-glute-med-r"
  ],
  "gluteo_minimo": [
    "b-glute-med-l",
    "b-glute-med-r"
  ],
  "gluteos": [
    "b-glute-max-l",
    "b-glute-max-r",
    "b-glute-med-l",
    "b-glute-med-r"
  ],
  "piriforme": [
    "b-glute-max-l",
    "b-glute-max-r"
  ],
  "adutores": [
    "f-adductor-l",
    "f-adductor-r"
  ],
  "quadriceps": [
    "f-quad-l",
    "f-quad-r"
  ],
  "isquiotibiais": [
    "b-hamstring-l",
    "b-hamstring-r"
  ],
  "gastrocnemio": [
    "b-calf-l",
    "b-calf-r"
  ],
  "panturrilha": [
    "b-calf-l",
    "b-calf-r"
  ],
  "soleo": [
    "b-soleus-l",
    "b-soleus-r"
  ],
  "esternocleidomastoideo": [
    "f-neck"
  ],
  "pescoco": [
    "f-neck"
  ],
  "tornozelo": [
    "f-tibialis-l",
    "f-tibialis-r"
  ],
  "serratus": [
    "f-serratus-l",
    "f-serratus-r"
  ],
  "corpo_inteiro": [
    "f-pec-l",
    "f-pec-r",
    "f-abs",
    "f-quad-l",
    "f-quad-r",
    "b-lat-l",
    "b-lat-r",
    "b-glute-max-l",
    "b-glute-max-r",
    "b-hamstring-l",
    "b-hamstring-r"
  ]
};

export const HOTSPOT_LABELS: Record<string, string> = {
  "f-pec-l": "Peitoral Esq.",
  "f-pec-r": "Peitoral Dir.",
  "f-pec-upper-l": "Peitoral Sup. Esq.",
  "f-pec-upper-r": "Peitoral Sup. Dir.",
  "f-pec-lower-l": "Peitoral Inf. Esq.",
  "f-pec-lower-r": "Peitoral Inf. Dir.",
  "f-delt-ant-l": "Deltoide Ant. Esq.",
  "f-delt-ant-r": "Deltoide Ant. Dir.",
  "f-delt-lat-l": "Deltoide Lat. Esq.",
  "f-delt-lat-r": "Deltoide Lat. Dir.",
  "f-trap-l": "Trapézio Esq.",
  "f-trap-r": "Trapézio Dir.",
  "f-bicep-l": "Bíceps Esq.",
  "f-bicep-r": "Bíceps Dir.",
  "f-brachialis-l": "Braquial Esq.",
  "f-brachialis-r": "Braquial Dir.",
  "f-forearm-l": "Antebraço Esq.",
  "f-forearm-r": "Antebraço Dir.",
  "f-abs": "Reto Abdominal",
  "f-abs-lower": "Abs Inferior",
  "f-oblique-l": "Oblíquo Esq.",
  "f-oblique-r": "Oblíquo Dir.",
  "f-transverse": "Transverso Abd.",
  "f-serratus-l": "Serratus Esq.",
  "f-serratus-r": "Serratus Dir.",
  "f-hipflex-l": "Flex. Quadril Esq.",
  "f-hipflex-r": "Flex. Quadril Dir.",
  "f-adductor-l": "Adutor Esq.",
  "f-adductor-r": "Adutor Dir.",
  "f-quad-l": "Quadríceps Esq.",
  "f-quad-r": "Quadríceps Dir.",
  "f-vmed-l": "Vasto Med. Esq.",
  "f-vmed-r": "Vasto Med. Dir.",
  "f-tibialis-l": "Tibial Ant. Esq.",
  "f-tibialis-r": "Tibial Ant. Dir.",
  "f-neck": "Esternocleidomastoideo",
  "b-delt-post-l": "Deltoide Post. Esq.",
  "b-delt-post-r": "Deltoide Post. Dir.",
  "b-trap-upper": "Trapézio Superior",
  "b-trap-mid": "Trapézio Médio",
  "b-rhomboid": "Romboides",
  "b-lat-l": "Latíssimo Esq.",
  "b-lat-r": "Latíssimo Dir.",
  "b-erector-l": "Eretor Esq.",
  "b-erector-r": "Eretor Dir.",
  "b-ql-l": "Q. Lumborum Esq.",
  "b-ql-r": "Q. Lumborum Dir.",
  "b-tricep-l": "Tríceps Esq.",
  "b-tricep-r": "Tríceps Dir.",
  "b-forearm-l": "Antebraço Post. Esq.",
  "b-forearm-r": "Antebraço Post. Dir.",
  "b-glute-max-l": "Glúteo Máx. Esq.",
  "b-glute-max-r": "Glúteo Máx. Dir.",
  "b-glute-med-l": "Glúteo Médio Esq.",
  "b-glute-med-r": "Glúteo Médio Dir.",
  "b-hamstring-l": "Isquiotibial Esq.",
  "b-hamstring-r": "Isquiotibial Dir.",
  "b-calf-l": "Panturrilha Esq.",
  "b-calf-r": "Panturrilha Dir.",
  "b-soleus-l": "Sóleo Esq.",
  "b-soleus-r": "Sóleo Dir."
};

export const FRONT_HOTSPOTS: MuscleHotspot[] = [
  {
    "id": "f-neck",
    "cx": 50,
    "cy": 12.5,
    "rx": 5,
    "ry": 3.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-trap-l",
    "cx": 37,
    "cy": 14.5,
    "rx": 9,
    "ry": 3.5,
    "rotation": -15,
    "view": "front"
  },
  {
    "id": "f-trap-r",
    "cx": 63,
    "cy": 14.5,
    "rx": 9,
    "ry": 3.5,
    "rotation": 15,
    "view": "front"
  },
  {
    "id": "f-delt-lat-l",
    "cx": 20.5,
    "cy": 21,
    "rx": 7,
    "ry": 8.5,
    "rotation": -8,
    "view": "front"
  },
  {
    "id": "f-delt-lat-r",
    "cx": 79.5,
    "cy": 21,
    "rx": 7,
    "ry": 8.5,
    "rotation": 8,
    "view": "front"
  },
  {
    "id": "f-delt-ant-l",
    "cx": 24,
    "cy": 20,
    "rx": 5.5,
    "ry": 7,
    "rotation": -5,
    "view": "front"
  },
  {
    "id": "f-delt-ant-r",
    "cx": 76,
    "cy": 20,
    "rx": 5.5,
    "ry": 7,
    "rotation": 5,
    "view": "front"
  },
  {
    "id": "f-pec-l",
    "cx": 35,
    "cy": 25.5,
    "rx": 13,
    "ry": 8.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-pec-r",
    "cx": 65,
    "cy": 25.5,
    "rx": 13,
    "ry": 8.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-pec-upper-l",
    "cx": 35,
    "cy": 22.5,
    "rx": 11,
    "ry": 5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-pec-upper-r",
    "cx": 65,
    "cy": 22.5,
    "rx": 11,
    "ry": 5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-pec-lower-l",
    "cx": 35,
    "cy": 29,
    "rx": 11,
    "ry": 5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-pec-lower-r",
    "cx": 65,
    "cy": 29,
    "rx": 11,
    "ry": 5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-serratus-l",
    "cx": 28,
    "cy": 32,
    "rx": 4,
    "ry": 8,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-serratus-r",
    "cx": 72,
    "cy": 32,
    "rx": 4,
    "ry": 8,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-bicep-l",
    "cx": 18,
    "cy": 31.5,
    "rx": 5.5,
    "ry": 10.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-bicep-r",
    "cx": 82,
    "cy": 31.5,
    "rx": 5.5,
    "ry": 10.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-brachialis-l",
    "cx": 13.5,
    "cy": 35.5,
    "rx": 3.5,
    "ry": 6,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-brachialis-r",
    "cx": 86.5,
    "cy": 35.5,
    "rx": 3.5,
    "ry": 6,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-forearm-l",
    "cx": 16,
    "cy": 44.5,
    "rx": 5.5,
    "ry": 11.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-forearm-r",
    "cx": 84,
    "cy": 44.5,
    "rx": 5.5,
    "ry": 11.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-abs",
    "cx": 50,
    "cy": 37.5,
    "rx": 7,
    "ry": 11,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-abs-lower",
    "cx": 50,
    "cy": 44,
    "rx": 7,
    "ry": 4.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-oblique-l",
    "cx": 38,
    "cy": 36.5,
    "rx": 5.5,
    "ry": 10,
    "rotation": -10,
    "view": "front"
  },
  {
    "id": "f-oblique-r",
    "cx": 62,
    "cy": 36.5,
    "rx": 5.5,
    "ry": 10,
    "rotation": 10,
    "view": "front"
  },
  {
    "id": "f-transverse",
    "cx": 50,
    "cy": 45.5,
    "rx": 9,
    "ry": 3.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-hipflex-l",
    "cx": 39.5,
    "cy": 48.5,
    "rx": 6,
    "ry": 4.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-hipflex-r",
    "cx": 60.5,
    "cy": 48.5,
    "rx": 6,
    "ry": 4.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-adductor-l",
    "cx": 44.5,
    "cy": 61,
    "rx": 5,
    "ry": 14,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-adductor-r",
    "cx": 55.5,
    "cy": 61,
    "rx": 5,
    "ry": 14,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-quad-l",
    "cx": 36,
    "cy": 63.5,
    "rx": 9.5,
    "ry": 14.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-quad-r",
    "cx": 64,
    "cy": 63.5,
    "rx": 9.5,
    "ry": 14.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-vmed-l",
    "cx": 39,
    "cy": 74.5,
    "rx": 5,
    "ry": 5.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-vmed-r",
    "cx": 61,
    "cy": 74.5,
    "rx": 5,
    "ry": 5.5,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-tibialis-l",
    "cx": 37,
    "cy": 84.5,
    "rx": 4,
    "ry": 9,
    "rotation": 0,
    "view": "front"
  },
  {
    "id": "f-tibialis-r",
    "cx": 63,
    "cy": 84.5,
    "rx": 4,
    "ry": 9,
    "rotation": 0,
    "view": "front"
  }
];

export const BACK_HOTSPOTS: MuscleHotspot[] = [
  {
    "id": "b-trap-upper",
    "cx": 50,
    "cy": 14,
    "rx": 18,
    "ry": 3.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-trap-mid",
    "cx": 50,
    "cy": 18,
    "rx": 15,
    "ry": 5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-delt-post-l",
    "cx": 20.5,
    "cy": 21,
    "rx": 7,
    "ry": 8.5,
    "rotation": -8,
    "view": "back"
  },
  {
    "id": "b-delt-post-r",
    "cx": 79.5,
    "cy": 21,
    "rx": 7,
    "ry": 8.5,
    "rotation": 8,
    "view": "back"
  },
  {
    "id": "b-rhomboid",
    "cx": 50,
    "cy": 22.5,
    "rx": 9,
    "ry": 7.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-lat-l",
    "cx": 29,
    "cy": 31,
    "rx": 9.5,
    "ry": 14,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-lat-r",
    "cx": 71,
    "cy": 31,
    "rx": 9.5,
    "ry": 14,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-erector-l",
    "cx": 46.5,
    "cy": 35.5,
    "rx": 3.5,
    "ry": 10,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-erector-r",
    "cx": 53.5,
    "cy": 35.5,
    "rx": 3.5,
    "ry": 10,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-ql-l",
    "cx": 39.5,
    "cy": 43.5,
    "rx": 5,
    "ry": 5.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-ql-r",
    "cx": 60.5,
    "cy": 43.5,
    "rx": 5,
    "ry": 5.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-tricep-l",
    "cx": 16.5,
    "cy": 31.5,
    "rx": 5.5,
    "ry": 11,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-tricep-r",
    "cx": 83.5,
    "cy": 31.5,
    "rx": 5.5,
    "ry": 11,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-forearm-l",
    "cx": 14,
    "cy": 44.5,
    "rx": 5,
    "ry": 11.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-forearm-r",
    "cx": 86,
    "cy": 44.5,
    "rx": 5,
    "ry": 11.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-glute-med-l",
    "cx": 31.5,
    "cy": 50.5,
    "rx": 8,
    "ry": 7,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-glute-med-r",
    "cx": 68.5,
    "cy": 50.5,
    "rx": 8,
    "ry": 7,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-glute-max-l",
    "cx": 35,
    "cy": 58.5,
    "rx": 11,
    "ry": 11,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-glute-max-r",
    "cx": 65,
    "cy": 58.5,
    "rx": 11,
    "ry": 11,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-hamstring-l",
    "cx": 35,
    "cy": 72,
    "rx": 9,
    "ry": 13,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-hamstring-r",
    "cx": 65,
    "cy": 72,
    "rx": 9,
    "ry": 13,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-calf-l",
    "cx": 34,
    "cy": 86.5,
    "rx": 6.5,
    "ry": 8.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-calf-r",
    "cx": 66,
    "cy": 86.5,
    "rx": 6.5,
    "ry": 8.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-soleus-l",
    "cx": 33.5,
    "cy": 93.5,
    "rx": 5.5,
    "ry": 4.5,
    "rotation": 0,
    "view": "back"
  },
  {
    "id": "b-soleus-r",
    "cx": 66.5,
    "cy": 93.5,
    "rx": 5.5,
    "ry": 4.5,
    "rotation": 0,
    "view": "back"
  }
];

export const ALL_HOTSPOTS: MuscleHotspot[] = [...FRONT_HOTSPOTS, ...BACK_HOTSPOTS];
