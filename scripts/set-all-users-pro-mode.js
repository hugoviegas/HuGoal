#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function parseArgs(argv) {
  return {
    confirm: argv.includes("--confirm"),
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!admin.apps.length) {
    const credentialsPath = path.join(
      process.cwd(),
      "firebase-admin-sdk-key.json",
    );

    if (fs.existsSync(credentialsPath)) {
      admin.initializeApp({
        credential: admin.credential.cert(require(credentialsPath)),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  }

  const db = admin.firestore();
  const snapshot = await db.collection("profiles").get();

  console.log(`Found ${snapshot.size} profile documents.`);

  if (!opts.confirm) {
    console.log("Dry run only. Re-run with --confirm to update all profiles.");
    return;
  }

  const docs = snapshot.docs;
  let updated = 0;

  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + 400);

    for (const docSnap of chunk) {
      batch.set(
        docSnap.ref,
        {
          is_pro: true,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      updated += 1;
    }

    await batch.commit();
  }

  console.log(`Updated ${updated} profiles to is_pro=true.`);
}

main().catch((error) => {
  console.error("Failed to update Pro mode:", error?.message || error);
  process.exitCode = 1;
});
