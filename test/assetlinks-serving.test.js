import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const assetLinks = JSON.parse(readFileSync(new URL("../public/.well-known/assetlinks.json", import.meta.url), "utf8"));

test("serves only the Android asset links file explicitly before dotfile-ignoring static middleware", () => {
  const routeIndex = serverSource.indexOf('app.get("/.well-known/assetlinks.json"');
  const staticIndex = serverSource.indexOf("express.static(path.join(__dirname, \"public\")");
  assert.ok(routeIndex >= 0 && staticIndex > routeIndex, "explicit route must run before static middleware");
  assert.match(serverSource.slice(routeIndex, staticIndex), /sendFile\(path\.join\(__dirname, "public", "\.well-known", "assetlinks\.json"\)/);
  assert.match(serverSource.slice(staticIndex, staticIndex + 400), /dotfiles: "ignore"/);
});

test("keeps the existing ES TEAMS TV Android App Links association", () => {
  assert.equal(assetLinks.length, 1);
  assert.deepEqual(assetLinks[0].relation, ["delegate_permission/common.handle_all_urls"]);
  assert.equal(assetLinks[0].target.namespace, "android_app");
  assert.equal(assetLinks[0].target.package_name, "com.esteamstv.app");
  assert.equal(assetLinks[0].target.sha256_cert_fingerprints.length, 1);
});
