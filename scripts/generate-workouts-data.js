const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const FREE_EXERCISE_DB_DIST_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const PROTOTYPE_PATH = path.join(
  ROOT_DIR,
  "docs",
  "prototype_files",
  "coachAI-muscle-map-v2.html",
);

const OUTPUT_DIR = path.join(ROOT_DIR, "lib", "workouts", "generated");
const EXERCISES_OUTPUT = path.join(OUTPUT_DIR, "official-exercises.ts");
const MUSCLE_MAP_OUTPUT = path.join(OUTPUT_DIR, "muscle-map.ts");

function readSource() {
  return fs.readFileSync(PROTOTYPE_PATH, "utf8");
}

function pickLiteral(source, regex, name) {
  const match = source.match(regex);
  if (!match) {
    throw new Error(`Could not extract ${name} from prototype source.`);
  }
  return match[1];
}

function evalLiteral(source, regex, name) {
  const literal = pickLiteral(source, regex, name);
  return Function(`return (${literal});`)();
}

function toId(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toMuscleKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toTitleCaseWords(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const DIFFICULTY_MAP = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "advanced",
  iniciante: "beginner",
  intermediario: "intermediate",
  avancado: "advanced",
};

const EQUIPMENT_MAP = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  machine: "machine",
  cable: "cable",
  "body only": "bodyweight",
  bands: "band",
  band: "band",
  kettlebell: "kettlebell",
  kettlebells: "kettlebell",
  "e-z curl bar": "barbell",
  "medicine ball": "none",
  "exercise ball": "none",
  "foam roll": "none",
  "pull-up bar": "bodyweight",
  other: "none",
  null: "none",
  barra: "barbell",
  halteres: "dumbbell",
  maquina: "machine",
  cabo_polia: "cable",
  faixa_elastica: "band",
  barras_paralelas: "bodyweight",
  barra_fixa: "bodyweight",
  argolas: "bodyweight",
  chao: "bodyweight",
  none: "none",
};

function normalizeDifficulty(raw) {
  const key = toMuscleKey(raw);
  return DIFFICULTY_MAP[key] ?? "intermediate";
}

function normalizeEquipment(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return ["none"];
  }

  const normalized = items
    .map((item) => {
      const key = toMuscleKey(item);
      return EQUIPMENT_MAP[key] ?? "none";
    })
    .filter(Boolean);

  return [...new Set(normalized)];
}

function buildTrainingStyle(record) {
  return [
    ...new Set(
      [
        record.force ? toTitleCaseWords(record.force) : null,
        record.mechanic ? toTitleCaseWords(record.mechanic) : null,
        record.category ? toTitleCaseWords(record.category) : null,
      ].filter(Boolean),
    ),
  ];
}

function generateOfficialExercises(exercisesRaw) {
  return exercisesRaw.map((item) => ({
    id: toId(item.name_en || item.name || item.id),
    name: item.name,
    name_en: item.name_en || item.name,
    force: item.force ?? null,
    mechanic: item.mechanic ?? null,
    category: item.category,
    primary_muscles: normalizeMuscles(item.primaryMuscles),
    secondary_muscles: normalizeMuscles(item.secondaryMuscles),
    primaryMuscles: Array.isArray(item.primaryMuscles)
      ? item.primaryMuscles
      : [],
    secondaryMuscles: Array.isArray(item.secondaryMuscles)
      ? item.secondaryMuscles
      : [],
    equipment: normalizeEquipment(item.equipment),
    difficulty: normalizeDifficulty(item.level ?? item.difficulty),
    video_youtube_ids: [],
    instructions: Array.isArray(item.instructions) ? item.instructions : [],
    instructions_en: Array.isArray(item.instructions)
      ? item.instructions.join("\n")
      : undefined,
    aliases: [item.name, item.name_en, item.id].filter(Boolean),
    muscle_primary: toTitleCaseWords(
      normalizeMuscles(item.primaryMuscles)[0] || "full_body",
    ),
    muscle_secondary: normalizeMuscles(item.secondaryMuscles).map(
      toTitleCaseWords,
    ),
    training_style: buildTrainingStyle(item),
    type: item.mechanic
      ? toTitleCaseWords(item.mechanic)
      : buildTrainingStyle(item)[0] || "General",
    images: Array.isArray(item.images) ? item.images : [],
    source_id: item.id,
    source_level: item.level ?? item.difficulty ?? null,
    source_equipment: item.equipment ?? null,
    source_category: item.category,
    source_images: Array.isArray(item.images) ? item.images : [],
    remote_image_urls: Array.isArray(item.images)
      ? item.images.map(
          (imagePath) =>
            `${FREE_EXERCISE_DB_DIST_URL.replace("dist/exercises.json", "exercises/")}${imagePath}`,
        )
      : [],
  }));
}

function normalizeMuscles(muscles) {
  if (!Array.isArray(muscles) || muscles.length === 0) {
    return [];
  }

  return [...new Set(muscles.map((muscle) => toMuscleKey(muscle)))];
}

function generateMuscleMapGroups(muscleMap) {
  return Object.fromEntries(
    Object.entries(muscleMap).map(([key, value]) => [toMuscleKey(key), value]),
  );
}

function generateHotspots(hotspots, view) {
  return hotspots.map(([id, cx, cy, rx, ry, rotation]) => ({
    id,
    cx,
    cy,
    rx,
    ry,
    rotation,
    view,
  }));
}

function writeExercisesFile(exercises) {
  const fileContent = `/* eslint-disable */
// Generated from yuhonas/free-exercise-db
// Do not edit manually.

import type { Exercise } from "@/types";

export type OfficialExerciseRecord = Exercise & {
  category: string;
  muscle_primary: string;
  muscle_secondary: string[];
  training_style: string[];
  type: string;
};

export const OFFICIAL_EXERCISES: OfficialExerciseRecord[] = ${JSON.stringify(exercises, null, 2)};
`;

  fs.writeFileSync(EXERCISES_OUTPUT, fileContent, "utf8");
}

function writeMuscleMapFile({
  muscleGroups,
  labels,
  frontHotspots,
  backHotspots,
}) {
  const fileContent = `/* eslint-disable */
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

export const MUSCLE_GROUP_TO_HOTSPOTS: Record<string, string[]> = ${JSON.stringify(muscleGroups, null, 2)};

export const HOTSPOT_LABELS: Record<string, string> = ${JSON.stringify(labels, null, 2)};

export const FRONT_HOTSPOTS: MuscleHotspot[] = ${JSON.stringify(frontHotspots, null, 2)};

export const BACK_HOTSPOTS: MuscleHotspot[] = ${JSON.stringify(backHotspots, null, 2)};

export const ALL_HOTSPOTS: MuscleHotspot[] = [...FRONT_HOTSPOTS, ...BACK_HOTSPOTS];
`;

  fs.writeFileSync(MUSCLE_MAP_OUTPUT, fileContent, "utf8");
}

async function loadFreeExerciseDb() {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available in this Node runtime.");
  }

  const response = await fetch(FREE_EXERCISE_DB_DIST_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch free-exercise-db (${response.status} ${response.statusText})`,
    );
  }

  return response.json();
}

function main() {
  const source = readSource();
  const muscleMap = evalLiteral(
    source,
    /const MUSCLE_MAP = (\{.*?\});/s,
    "MUSCLE_MAP",
  );
  const muscleLabels = evalLiteral(
    source,
    /const MUSCLE_LABELS = (\{.*?\});/s,
    "MUSCLE_LABELS",
  );
  const frontHotspots = evalLiteral(
    source,
    /const FRONT_HOTSPOTS = (\[.*?\]);/s,
    "FRONT_HOTSPOTS",
  );
  const backHotspots = evalLiteral(
    source,
    /const BACK_HOTSPOTS\s*= (\[.*?\]);/s,
    "BACK_HOTSPOTS",
  );

  return loadFreeExerciseDb().then((data) => {
    const exercises = Array.isArray(data)
      ? data
      : Array.isArray(data.records)
        ? data.records
        : [];

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    writeExercisesFile(generateOfficialExercises(exercises));
    writeMuscleMapFile({
      muscleGroups: generateMuscleMapGroups(muscleMap),
      labels: muscleLabels,
      frontHotspots: generateHotspots(frontHotspots, "front"),
      backHotspots: generateHotspots(backHotspots, "back"),
    });

    console.log("Generated official workouts files:");
    console.log(`- ${path.relative(process.cwd(), EXERCISES_OUTPUT)}`);
    console.log(`- ${path.relative(process.cwd(), MUSCLE_MAP_OUTPUT)}`);
  });
}

main().catch((error) => {
  console.error("[generate-workouts-data] failed:", error);
  process.exitCode = 1;
});
