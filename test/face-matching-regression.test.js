import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const auth = await readFile(new URL("../services/auth.js", import.meta.url), "utf8");

test("Face ID uses the standard acceptance cutoff and only flags two valid matches as ambiguous", () => {
  assert.match(auth, /const FACE_MATCH_THRESHOLD = 0\.6;/);
  assert.match(
    auth,
    /function isAmbiguousFaceMatch\(bestDistance, runnerUpDistance\)\s*\{[\s\S]*?bestDistance <= FACE_MATCH_THRESHOLD[\s\S]*?runnerUpDistance <= FACE_MATCH_THRESHOLD/
  );
  assert.match(auth, /if \(isAmbiguousFaceMatch\(bestDistance, runnerUpDistance\)\)/);
});
