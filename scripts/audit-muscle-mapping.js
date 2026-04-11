const fs = require("fs");
const path = require("path");

const payloadPath = path.join(
  process.cwd(),
  "lib",
  "workouts",
  "imported",
  "free-exercise-db-raw.json",
);
const mappingPath = path.join(
  process.cwd(),
  "lib",
  "workouts",
  "muscle-slug-mapping.ts",
);

function normalize(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function loadMappingKeys(fileText) {
  const re = /^\s*([a-zA-Z0-9_\-]+):\s*"[^"]+"\s*,?\s*$/gm;
  const keys = new Set();
  let match = null;
  while ((match = re.exec(fileText))) {
    keys.add(match[1]);
  }
  return keys;
}

function main() {
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  const mappingText = fs.readFileSync(mappingPath, "utf8");
  const mappingKeys = loadMappingKeys(mappingText);

  const records = Array.isArray(payload.records) ? payload.records : [];
  const used = new Set();

  for (const record of records) {
    const muscles = [
      ...(record.primary_muscles || []),
      ...(record.secondary_muscles || []),
    ];

    for (const muscle of muscles) {
      if (muscle == null || String(muscle).trim().length === 0) {
        continue;
      }
      used.add(String(muscle));
    }
  }

  const unmapped = [];
  for (const key of used) {
    const normalized = normalize(key);
    if (!mappingKeys.has(key) && !mappingKeys.has(normalized)) {
      unmapped.push(key);
    }
  }

  unmapped.sort();

  const report = {
    records: records.length,
    uniqueMuscles: used.size,
    mappedCount: used.size - unmapped.length,
    unmappedCount: unmapped.length,
    unmapped,
  };

  console.log(JSON.stringify(report, null, 2));
}

main();
