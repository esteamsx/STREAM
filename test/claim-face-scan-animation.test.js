import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const loginScanner = readFileSync(new URL("../public/face-scan.js", import.meta.url), "utf8");
const account = readFileSync(new URL("../views/account.js", import.meta.url), "utf8");

test("daily coin face check reuses Login Face ID without a duplicate scanner module", () => {
  assert.match(loginScanner, /import \{ requestMedia \} from '\/permission-gate\.js'/);
  assert.match(loginScanner, /setStatus\('Turn your head to the left'\)/);
  assert.match(loginScanner, /setStatus\('Now turn to the right'\)/);
  assert.match(loginScanner, /setStatus\('Now nod your head'\)/);
  assert.match(loginScanner, /setStatus\('Hold still'\)/);
  assert.match(loginScanner, /if \(stream\) stream\.getTracks\(\)\.forEach\(\(t\) => t\.stop\(\)\)/);
  assert.match(loginScanner, /fs-account-mode\.fs-top-mode\{background:rgba\(5,5,8,\.72\);justify-content:center/);
  assert.match(loginScanner, /fs-account-mode\.fs-top-mode \.fs-abstract\{width:min\(220px,58vw\)/);
  assert.match(loginScanner, /backdrop-filter:blur\(18px\)/);
  assert.match(loginScanner, /window\.location\.pathname === '\/account'/);
  assert.match(loginScanner, /const ENROLLMENT_TIMEOUT_MS = 90000/);
  assert.match(loginScanner, /const enrollmentMode = showCamera && requireLiveness && window\.location\.pathname === '\/account'/);
  assert.match(loginScanner, /fs-enrollment-steps/);
  assert.match(loginScanner, /fs-step-check/);
  assert.match(loginScanner, /flashEnrollmentCapture/);
  assert.match(loginScanner, /fs-capture-flash-cyan/);
  assert.match(loginScanner, /fs-capture-flash-violet/);
  assert.match(loginScanner, /fs-capture-flash-amber/);
  assert.match(account, /try \{ return await import\('\/face-scan\.js'\);/);
  assert.match(account, /claimModule\.captureFaceDescriptor\(\{ requireLiveness: false, showCamera: false, voice: false, returnSamples: true \}\)/);
  assert.doesNotMatch(account, /import\('\/face-scan\.js\?v=\$\{ASSET_VERSION\}/);
  assert.doesNotMatch(account, /claimModule\.captureClaimFace\(\)/);
  assert.doesNotMatch(account, /import\('\/claim-face\.js/);
});
