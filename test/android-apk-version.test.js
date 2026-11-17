import test from "node:test";
import assert from "node:assert/strict";
import { readAndroidApkVersion, parseAndroidApkVersion } from "../services/android-apk-version.js";

const apkPath = new URL("../ES TEAMS TV.apk", import.meta.url);

test("reads the Android version from the same APK served by the website", async () => {
  const release = await readAndroidApkVersion(apkPath);
  assert.equal(release.packageName, "com.esteamstv.app");
  assert.match(release.version, /^[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}$/);
  assert.ok(Number.isSafeInteger(release.versionCode) && release.versionCode > 0);
});

test("rejects malformed APK data instead of inventing a version", () => {
  assert.throws(() => parseAndroidApkVersion(Buffer.from("not an APK")), /invalid size/i);
});
