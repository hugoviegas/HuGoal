#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const IGNORES = [
  "node_modules",
  ".git",
  ".claude",
  "dist",
  "build",
  "webview-ui",
  "pixel-agents",
  "e2e",
  "scripts",
];
const FILE_EXTS = [".tsx", ".ts", ".jsx", ".js"];

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORES.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (FILE_EXTS.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function findViolations(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const re = /<ScrollView\b[\s\S]*?>/g;
  const violations = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const tag = m[0];
    if (
      !/showsVerticalScrollIndicator\s*=/.test(tag) &&
      !/showsHorizontalScrollIndicator\s*=/.test(tag)
    ) {
      const line = src.slice(0, m.index).split("\n").length;
      violations.push({
        line,
        tag: tag.replace(/\n/g, " ").trim().slice(0, 200),
      });
    }
  }
  return violations;
}

function main() {
  const files = walk(ROOT);
  const problems = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const v = findViolations(f);
    if (v.length) problems.push({ file: rel, items: v });
  }

  if (problems.length === 0) {
    console.log("No ScrollView scrollbar violations found.");
    process.exit(0);
  }

  console.error("ScrollView scrollbar rule violations found:");
  for (const p of problems) {
    console.error("\n", p.file);
    for (const item of p.items) {
      console.error(`  - L${item.line}: ${item.tag}`);
    }
  }

  console.error(
    "\nPlease add `showsVerticalScrollIndicator={false}` or `showsHorizontalScrollIndicator={false}` to the ScrollView opening tag, or wrap/replace with a custom component that enforces hidden scrollbars.",
  );
  process.exit(1);
}

main();
