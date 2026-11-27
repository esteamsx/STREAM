// One-time backfill: sets hasImage on existing posts so feed reads can skip the inline image.
// Run from the project root with the same Firebase env as the server:  node scripts/backfill-post-has-image.js
// Safe to re-run. Posts that already have hasImage are skipped. Only writes the hasImage field.
import { db } from "../config/firebase.js";

const PAGE = 300;
let last = null;
let scanned = 0;
let updated = 0;

for (;;) {
  let q = db.collection("posts").orderBy("__name__").limit(PAGE);
  if (last) q = q.startAfter(last);
  const snap = await q.get();
  if (snap.empty) break;
  const batch = db.batch();
  let inBatch = 0;
  for (const doc of snap.docs) {
    scanned += 1;
    const d = doc.data();
    if (typeof d.hasImage === "boolean") continue;
    batch.update(doc.ref, { hasImage: !!d.imageDataUrl });
    inBatch += 1;
  }
  if (inBatch) { await batch.commit(); updated += inBatch; }
  last = snap.docs[snap.docs.length - 1];
  console.log("scanned", scanned, "updated", updated);
}
console.log("Done. scanned", scanned, "updated", updated);
process.exit(0);
