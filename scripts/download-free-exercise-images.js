const fs = require("fs");
const path = require("path");
const { Buffer } = require("buffer");

const FREE_EXERCISE_DB_IMAGE_PREFIX =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const DEFAULT_INPUT_PATH = path.join(
  process.cwd(),
  "lib",
  "workouts",
  "imported",
  "free-exercise-db-raw.json",
);
const DEFAULT_DESTINATION = path.join(process.cwd(), "assets", "exercises");
const DEFAULT_MANIFEST = path.join(
  process.cwd(),
  "assets",
  "exercises",
  "MANIFEST.json",
);

function parseArgs(argv) {
  const options = {
    input: DEFAULT_INPUT_PATH,
    dest: DEFAULT_DESTINATION,
    manifest: DEFAULT_MANIFEST,
    limit: null,
    offset: 0,
    skipExisting: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--input" && next) {
      options.input = next;
      index += 1;
      continue;
    }
    if (arg === "--dest" && next) {
      options.dest = next;
      index += 1;
      continue;
    }
    if (arg === "--manifest" && next) {
      options.manifest = next;
      index += 1;
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
    if (arg === "--overwrite") {
      options.skipExisting = false;
      continue;
    }
  }

  return options;
}

async function loadJson(source) {
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

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function toPosixRelative(fromRootAbsolutePath) {
  const relative = path.relative(process.cwd(), fromRootAbsolutePath);
  return relative.split(path.sep).join("/");
}

function buildRemoteUrls(record) {
  if (
    Array.isArray(record.remote_image_urls) &&
    record.remote_image_urls.length > 0
  ) {
    return record.remote_image_urls;
  }

  const sourceImages = Array.isArray(record.source_images)
    ? record.source_images
    : Array.isArray(record.images)
      ? record.images
      : [];

  return sourceImages.map(
    (imagePath) => `${FREE_EXERCISE_DB_IMAGE_PREFIX}${imagePath}`,
  );
}

async function downloadFile(url, destinationPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const data = Buffer.from(arrayBuffer);
  fs.writeFileSync(destinationPath, data);
}

function detectExtensionFromUrl(url, fallback = ".jpg") {
  try {
    const ext = path.extname(new URL(url).pathname);
    return ext || fallback;
  } catch {
    return fallback;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const loaded = await loadJson(options.input);
  const sourceRecords = Array.isArray(loaded)
    ? loaded
    : Array.isArray(loaded.records)
      ? loaded.records
      : null;

  if (!sourceRecords) {
    throw new Error(
      "Invalid input format. Expected an array or an object with a 'records' array.",
    );
  }

  const records =
    options.limit == null
      ? sourceRecords.slice(options.offset)
      : sourceRecords.slice(options.offset, options.offset + options.limit);

  ensureDirectory(options.dest);

  const manifest = {
    generated_at: new Date().toISOString(),
    source: options.input,
    total_records: records.length,
    downloaded_files: 0,
    skipped_existing_files: 0,
    failed_files: 0,
    records: {},
  };

  for (const record of records) {
    const id = String(record.id || "").trim();
    if (!id) {
      continue;
    }

    const remoteUrls = buildRemoteUrls(record).slice(0, 2);
    const recordDir = path.join(options.dest, id);
    ensureDirectory(recordDir);

    const localImages = [];
    const failures = [];

    for (let index = 0; index < remoteUrls.length; index += 1) {
      const remoteUrl = remoteUrls[index];
      const extension = detectExtensionFromUrl(remoteUrl);
      const fileName = `${index}${extension}`;
      const absoluteFilePath = path.join(recordDir, fileName);
      const relativeFilePath = toPosixRelative(absoluteFilePath);

      if (options.skipExisting && fs.existsSync(absoluteFilePath)) {
        manifest.skipped_existing_files += 1;
        localImages.push(relativeFilePath);
        continue;
      }

      try {
        await downloadFile(remoteUrl, absoluteFilePath);
        manifest.downloaded_files += 1;
        localImages.push(relativeFilePath);
      } catch (error) {
        manifest.failed_files += 1;
        failures.push({
          url: remoteUrl,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }

    manifest.records[id] = {
      source_id: record.source_id || id,
      remote_urls: remoteUrls,
      local_images: localImages,
      failures,
    };
  }

  ensureDirectory(path.dirname(options.manifest));
  fs.writeFileSync(options.manifest, JSON.stringify(manifest, null, 2), "utf8");

  console.log("free-exercise-db image download complete");
  console.log(`Input: ${options.input}`);
  console.log(`Destination: ${toPosixRelative(options.dest)}`);
  console.log(`Manifest: ${toPosixRelative(options.manifest)}`);
  console.log(`Records processed: ${records.length}`);
  console.log(`Files downloaded: ${manifest.downloaded_files}`);
  console.log(`Files skipped: ${manifest.skipped_existing_files}`);
  console.log(`Files failed: ${manifest.failed_files}`);
}

main().catch((error) => {
  console.error("[download-free-exercise-images] failed:", error);
  process.exitCode = 1;
});
