const fs = require("fs");
const path = require("path");

const FREE_EXERCISE_DB_DIST_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const FREE_EXERCISE_DB_IMAGE_PREFIX =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const DEFAULT_OUTPUT_PATH = path.join(
  process.cwd(),
  "lib",
  "workouts",
  "imported",
  "free-exercise-db-raw.json",
);
const DEFAULT_REPORT_PATH = path.join(
  process.cwd(),
  "lib",
  "workouts",
  "imported",
  "free-exercise-db-report.json",
);

const EXTERNAL_LEVEL_TO_DIFFICULTY = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "advanced",
};

const EXTERNAL_EQUIPMENT_TO_INTERNAL = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  machine: "machine",
  cable: "cable",
  "body only": "bodyweight",
  bands: "band",
  kettlebell: "kettlebell",
  kettlebells: "kettlebell",
  "e-z curl bar": "barbell",
  "medicine ball": "none",
  "exercise ball": "none",
  "foam roll": "none",
  "pull-up bar": "bodyweight",
  other: "none",
  null: "none",
};

function toTitleCaseWords(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseArgs(argv) {
  const options = {
    input: FREE_EXERCISE_DB_DIST_URL,
    output: DEFAULT_OUTPUT_PATH,
    report: DEFAULT_REPORT_PATH,
    limit: null,
    offset: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input" && next) {
      options.input = next;
      index += 1;
      continue;
    }
    if (arg === "--output" && next) {
      options.output = next;
      index += 1;
      continue;
    }
    if (arg === "--report" && next) {
      options.report = next;
      index += 1;
      continue;
    }
    if (arg === "--no-report") {
      options.report = null;
      continue;
    }
    if (arg === "--limit" && next) {
      const parsed = Number.parseInt(next, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      index += 1;
      continue;
    }
    if (arg === "--offset" && next) {
      const parsed = Number.parseInt(next, 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        options.offset = parsed;
      }
      index += 1;
      continue;
    }
  }

  return options;
}

function normalizeToken(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toIdSlug(value) {
  return normalizeToken(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueStringArray(values) {
  const seen = new Set();
  const output = [];
  for (const value of values || []) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    output.push(text);
  }
  return output;
}

function toTitleCaseFromSnake(value) {
  return String(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapDifficulty(level) {
  return EXTERNAL_LEVEL_TO_DIFFICULTY[normalizeToken(level)] || "intermediate";
}

function mapEquipment(equipment) {
  const key = normalizeToken(equipment == null ? "null" : equipment);
  return [EXTERNAL_EQUIPMENT_TO_INTERNAL[key] || "none"];
}

function mapMuscles(muscles) {
  return uniqueStringArray(
    (muscles || []).map((muscle) => {
      return toIdSlug(muscle).replace(/-/g, "_");
    }),
  );
}

function buildTrainingStyle(record) {
  return uniqueStringArray([
    record.force ? toTitleCaseWords(record.force) : null,
    record.mechanic ? toTitleCaseWords(record.mechanic) : null,
    record.category ? toTitleCaseWords(record.category) : null,
  ]);
}

function toInstructionText(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return undefined;
  }
  return lines
    .map((line) => String(line).trim())
    .filter(Boolean)
    .join("\n");
}

function transformRecord(record) {
  const primaryMuscles = mapMuscles(record.primaryMuscles);
  const secondaryMuscles = mapMuscles(record.secondaryMuscles);
  const primary = primaryMuscles[0] || "full_body";
  const id = toIdSlug(record.id || record.name);
  const sourceImages = uniqueStringArray(record.images || []);
  const trainingStyle = buildTrainingStyle(record);
  const type = record.mechanic
    ? toTitleCaseWords(record.mechanic)
    : trainingStyle[0] || "General";

  return {
    id,
    name: record.name,
    name_en: record.name,
    force: record.force,
    mechanic: record.mechanic,
    category: record.category,
    primary_muscles: primaryMuscles.length ? primaryMuscles : ["full_body"],
    secondary_muscles: secondaryMuscles,
    primaryMuscles: uniqueStringArray(record.primaryMuscles),
    secondaryMuscles: uniqueStringArray(record.secondaryMuscles),
    equipment: mapEquipment(record.equipment),
    difficulty: mapDifficulty(record.level),
    video_youtube_ids: [],
    instructions_en: toInstructionText(record.instructions),
    instructions: uniqueStringArray(record.instructions),
    aliases: uniqueStringArray([
      record.name,
      String(record.id || "").replace(/_/g, " "),
    ]),
    muscle_primary: toTitleCaseWords(primary),
    muscle_secondary: secondaryMuscles.map(toTitleCaseWords),
    training_style: trainingStyle,
    type,
    source_id: record.id,
    source_level: record.level,
    source_equipment: record.equipment,
    source_category: record.category,
    source_images: sourceImages,
    remote_image_urls: sourceImages.map(
      (imagePath) => `${FREE_EXERCISE_DB_IMAGE_PREFIX}${imagePath}`,
    ),
    images: sourceImages,
  };
}

async function loadJsonFromSource(source) {
  if (/^https?:\/\//i.test(source)) {
    if (typeof fetch !== "function") {
      throw new Error("Global fetch is not available in this Node runtime.");
    }

    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch '${source}' (${response.status})`);
    }
    return response.json();
  }

  const filePath = path.isAbsolute(source)
    ? source
    : path.join(process.cwd(), source);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function buildReport(records, allRecordsCount) {
  const byDifficulty = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  };
  const byCategory = {};
  const byEquipment = {};
  let withImages = 0;
  let withoutImages = 0;

  for (const record of records) {
    byDifficulty[record.difficulty] += 1;

    byCategory[record.category] = (byCategory[record.category] || 0) + 1;

    for (const equipment of record.equipment || []) {
      byEquipment[equipment] = (byEquipment[equipment] || 0) + 1;
    }

    if (
      Array.isArray(record.source_images) &&
      record.source_images.length > 0
    ) {
      withImages += 1;
    } else {
      withoutImages += 1;
    }
  }

  return {
    generated_at: new Date().toISOString(),
    total_source_records: allRecordsCount,
    total_transformed_records: records.length,
    difficulty_distribution: byDifficulty,
    category_distribution: byCategory,
    equipment_distribution: byEquipment,
    images: {
      with_images: withImages,
      without_images: withoutImages,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const data = await loadJsonFromSource(options.input);
  const sourceRecords = Array.isArray(data)
    ? data
    : Array.isArray(data.records)
      ? data.records
      : null;

  if (!sourceRecords) {
    throw new Error(
      "Invalid source format. Expected an array or an object with a 'records' array.",
    );
  }

  const sliced =
    options.limit == null
      ? sourceRecords.slice(options.offset)
      : sourceRecords.slice(options.offset, options.offset + options.limit);

  const transformed = sliced.map(transformRecord);

  const payload = {
    generated_at: new Date().toISOString(),
    source: options.input,
    total_source_records: sourceRecords.length,
    exported_records: transformed.length,
    records: transformed,
  };

  ensureParentDirectory(options.output);
  fs.writeFileSync(options.output, JSON.stringify(payload, null, 2), "utf8");

  if (options.report) {
    const report = buildReport(transformed, sourceRecords.length);
    ensureParentDirectory(options.report);
    fs.writeFileSync(options.report, JSON.stringify(report, null, 2), "utf8");
  }

  console.log("free-exercise-db transform complete");
  console.log(`Source: ${options.input}`);
  console.log(`Output: ${path.relative(process.cwd(), options.output)}`);
  if (options.report) {
    console.log(`Report: ${path.relative(process.cwd(), options.report)}`);
  }
  console.log(`Records exported: ${transformed.length}`);
}

main().catch((error) => {
  console.error("[import-free-exercise-db] failed:", error);
  process.exitCode = 1;
});
