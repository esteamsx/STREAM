import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const sources = ["views/login.js", "views/reset.js", "views/verify.js"].map((file) => fs.readFileSync(`${root}/${file}`, "utf8"));

for (const [index, source] of sources.entries()) {
  test(`Firebase browser flow ${index + 1} initializes App Check before Auth`, () => {
    assert.match(source, /firebase-app-check\.js/);
    assert.match(source, /ReCaptchaEnterpriseProvider/);
    assert.match(source, /6LeeIy8uAAAAAMID8hOwXSalr-RW5wLdmgYVGAZf/);
    assert.match(source, /isTokenAutoRefreshEnabled:\s*true/);
    assert.match(source, /getApps\(\)\.length \? getApp\(\) : initializeApp/);
    assert.ok(source.indexOf("initializeAppCheck(app") < source.indexOf("getAuth(app)"), "App Check must be initialized before Auth");
    assert.equal((source.match(/initializeAppCheck\(/g) || []).length, 1);
  });
}

test("App Check is monitoring-only in the client integration", () => {
  const combined = sources.join("\n");
  assert.doesNotMatch(combined, /enforceAppCheck|appCheckEnforcement|enforceAppCheck:|enforcementState/i);
});
