import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const account = readFileSync(new URL("../views/account.js", import.meta.url), "utf8");

test("daily claim resets ALTCHA after a failed face scan and when the claim overlay closes", () => {
  assert.match(account, /function resetClaimCaptcha\(\)\s*\{[\s\S]*?claimCaptchaPassed = false;[\s\S]*?claimCaptchaValue = '';[\s\S]*?claimContinueBtn\.disabled = true;[\s\S]*?widget\.reset\(\)/);
  assert.match(account, /function closeRwOverlay\(overlay\)\s*\{[\s\S]*?if \(overlay === rwClaimOverlay\) resetClaimCaptcha\(\);/);
  assert.match(account, /\} catch \(err\) \{\s*claimContinueBtn\.innerHTML = original;\s*resetClaimCaptcha\(\);\s*if \(await claimWasRecordedToday\(\)\)/);
});
