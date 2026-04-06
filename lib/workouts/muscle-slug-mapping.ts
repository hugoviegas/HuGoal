/**
 * Mapeamento de nossos nomes de músculos (em português)
 * para slugs compatíveis com react-native-body-highlighter
 */

export const MUSCLE_TO_SLUG_MAPPING: Record<string, string> = {
  // Front - Chest
  peitoral_maior: "chest",
  peitoral_superior: "chest",
  peitoral_inferior: "chest",
  peitoral: "chest",
  peito: "chest",
  serratus: "chest",

  // Both - Deltoids
  deltoide_anterior: "deltoids",
  deltoide_lateral: "deltoids",
  deltoide_posterior: "deltoids",
  deltoide_3_porcoes: "deltoids",
  deltoide: "deltoids",
  ombros: "deltoids",

  // Front - Biceps
  biceps_braquial: "biceps",
  biceps_braquial_cabeca_longa: "biceps",
  biceps: "biceps",
  braquial: "biceps",

  // Back - Triceps
  triceps_braquial: "triceps",
  triceps_cabeca_longa: "triceps",
  triceps: "triceps",

  // Both - Forearm
  braquiorradial: "forearm",
  antebraco: "forearm",
  flexores_do_antebraco: "forearm",
  extensores_do_antebraco: "forearm",

  // Front - Abs
  reto_abdominal: "abs",
  reto_abdominal_inferior: "abs",
  transverso_abdominal: "abs",
  core_transverso: "abs",

  // Front - Obliques
  obliquos: "obliques",

  // Front - Quadriceps
  quadriceps: "quadriceps",
  flexores_do_quadril: "quadriceps",

  // Front - Adductors
  adutores: "adductors",

  // Back - Hamstring
  isquiotibiais: "hamstring",

  // Both - Calves
  gastrocnemio: "calves",
  panturrilha: "calves",
  soleo: "calves",

  // Both - Trapezius
  trapezio: "trapezius",
  trapezio_superior: "trapezius",
  levantador_da_escapula: "trapezius",

  // Back - Gluteal
  gluteo_maximo: "gluteal",
  gluteo_medio: "gluteal",
  gluteo_minimo: "gluteal",
  gluteos: "gluteal",
  piriforme: "gluteal",

  // Back - Latissimus (upper-back as closest)
  latissimo_do_dorso: "upper-back",
  dorsais: "upper-back",
  costas: "upper-back",

  // Back - Rhomboid (upper-back)
  romboides: "upper-back",

  // Back - Lower back
  eretores_da_espinha: "lower-back",
  eretores: "lower-back",
  coluna_toracica: "lower-back",
  coluna: "lower-back",
  quadratus_lumborum: "lower-back",

  // Front - Neck
  esternocleidomastoideo: "neck",
  pescoco: "neck",

  // Both - Core (map secondary muscles)
  core: "abs",

  // Full body (for workouts that target the whole body)
  corpo_inteiro: "chest",

  // Arms combined
  bracos: "biceps",
};

/**
 * Converte um slug back para uma lista de músculos equivalentes
 * Útil para categorizar dados
 */
export const SLUG_TO_DETAILS: Record<
  string,
  {
    name: string;
    side: "front" | "back" | "both";
    category: string;
  }
> = {
  chest: { name: "Chest", side: "front", category: "Upper Body" },
  deltoids: { name: "Deltoids", side: "both", category: "Upper Body" },
  biceps: { name: "Biceps", side: "front", category: "Arms" },
  triceps: { name: "Triceps", side: "back", category: "Arms" },
  forearm: { name: "Forearm", side: "both", category: "Arms" },
  abs: { name: "Abs", side: "front", category: "Core" },
  obliques: { name: "Obliques", side: "front", category: "Core" },
  quadriceps: { name: "Quadriceps", side: "front", category: "Lower Body" },
  adductors: { name: "Adductors", side: "front", category: "Lower Body" },
  hamstring: { name: "Hamstring", side: "back", category: "Lower Body" },
  calves: { name: "Calves", side: "both", category: "Lower Body" },
  trapezius: { name: "Trapezius", side: "both", category: "Upper Body" },
  gluteal: { name: "Gluteal", side: "back", category: "Lower Body" },
  "upper-back": { name: "Upper Back", side: "back", category: "Upper Body" },
  "lower-back": { name: "Lower Back", side: "back", category: "Core" },
  neck: { name: "Neck", side: "both", category: "Other" },
};

/**
 * Obtém o slug correspondente a um nome de músculo
 */
export function getMuscleSlug(muscleKey: string): string | undefined {
  return MUSCLE_TO_SLUG_MAPPING[muscleKey];
}

/**
 * Converte um array de nomes de músculos para array de slugs únicos
 */
export function getMusclesSlugs(muscleKeys: string[]): string[] {
  const slugs = new Set<string>();
  for (const key of muscleKeys) {
    const slug = getMuscleSlug(key);
    if (slug) {
      slugs.add(slug);
    }
  }
  return Array.from(slugs);
}
