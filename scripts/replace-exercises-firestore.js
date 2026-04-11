#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const DEFAULT_INPUT = path.join(
  process.cwd(),
  "lib",
  "workouts",
  "imported",
  "free-exercise-db-raw.json",
);

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT,
    confirm: false,
    source: "free-exercise-db",
    sourceVersion: null,
    limit: null,
    offset: 0,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const n = argv[i + 1];
    if ((a === "--input" || a === "-i") && n) {
      options.input = n;
      i += 1;
      continue;
    }
    if (a === "--confirm") {
      options.confirm = true;
      continue;
    }
    if (a === "--source" && n) {
      options.source = n;
      i += 1;
      continue;
    }
    if (a === "--source-version" && n) {
      options.sourceVersion = n;
      i += 1;
      continue;
    }
    if (a === "--limit" && n) {
      const p = Number.parseInt(n, 10);
      if (!Number.isNaN(p) && p > 0) options.limit = p;
      i += 1;
      continue;
    }
    if (a === "--offset" && n) {
      const p = Number.parseInt(n, 10);
      if (!Number.isNaN(p) && p >= 0) options.offset = p;
      i += 1;
      continue;
    }
  }

  return options;
}

function normalizeToken(value) {
  return String(value || "")
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

async function deleteAllCollection(db, collectionPath, batchSize = 500) {
  const collRef = db.collection(collectionPath);
  let totalDeleted = 0;

  while (true) {
    const snapshot = await collRef.limit(batchSize).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
    if (snapshot.size < batchSize) break;
  }

  return totalDeleted;
}

async function importRecords(db, collectionPath, records, options) {
  const batchSize = 400;
  let imported = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    const batch = db.batch();

    for (const rec of chunk) {
      const id =
        rec.id || toIdSlug(rec.name || rec.source_id || String(Date.now()));
      const ref = db.collection(collectionPath).doc(id);
      const data = Object.assign({}, rec, {
        id,
        is_deleted: false,
        source: options.source || "free-exercise-db",
        source_version:
          options.sourceVersion ||
          rec.source_version ||
          rec.generated_at ||
          now,
        imported_at: now,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      batch.set(ref, data);
    }

    await batch.commit();
    imported += chunk.length;
  }

  return imported;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Load payload
  let payload = null;
  try {
    if (/^https?:\/\//i.test(opts.input)) {
      if (typeof fetch !== "function") {
        throw new Error("Global fetch is not available in this Node runtime.");
      }
      const resp = await fetch(opts.input);
      if (!resp.ok)
        throw new Error(`Failed to fetch ${opts.input} (${resp.status})`);
      payload = await resp.json();
    } else {
      const filePath = path.isAbsolute(opts.input)
        ? opts.input
        : path.join(process.cwd(), opts.input);
      const raw = fs.readFileSync(filePath, "utf8");
      payload = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to load input:", err.message || err);
    process.exitCode = 2;
    return;
  }

  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.records)
      ? payload.records
      : [];
  if (!Array.isArray(records) || records.length === 0) {
    console.error("No records found in input.");
    process.exitCode = 3;
    return;
  }

  // Apply offset/limit
  const sliced =
    opts.limit == null
      ? records.slice(opts.offset)
      : records.slice(opts.offset, opts.offset + opts.limit);

  console.log(
    `Loaded ${records.length} source records, using ${sliced.length} after offset/limit.`,
  );

  if (!opts.confirm) {
    console.log("DRY RUN (no changes). To execute, re-run with --confirm");
    console.log("Summary:");
    console.log(` - Existing exercises: will be deleted (all)`);
    console.log(` - Records to import: ${sliced.length}`);
    console.log(
      "Example record preview:",
      JSON.stringify(sliced.slice(0, 2), null, 2),
    );
    return;
  }

  // Initialize admin SDK. Requires GOOGLE_APPLICATION_CREDENTIALS or other credentials available.
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (err) {
    console.error("Failed to initialize firebase-admin:", err.message || err);
    process.exitCode = 4;
    return;
  }

  const db = admin.firestore();
  const collectionName = "exercises";

  console.log(
    "Purging existing exercises collection (this may take a while)...",
  );
  const deleted = await deleteAllCollection(db, collectionName);
  console.log(`Deleted ${deleted} documents.`);

  console.log("Importing records in batches...");
  const imported = await importRecords(db, collectionName, sliced, opts);
  console.log(`Imported ${imported} records.`);

  console.log("Replace complete.");
}

main().catch((err) => {
  console.error("replace-exercises-firestore failed:", err);
  process.exitCode = 1;
});
