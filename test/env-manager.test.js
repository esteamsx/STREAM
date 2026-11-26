import test from "node:test";
import assert from "node:assert/strict";
import { encryptEnvValue, decryptEnvValue, parseEnvText, normalizeEnvName } from "../services/env-manager-core.js";
import { readFile } from "node:fs/promises";

process.env.ENV_MANAGER_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

test(".env parser handles comments, exports, quotes, multiline values, special characters, and blanks", () => {
  const parsed = parseEnvText(`# comment\nexport SIMPLE=hello\nQUOTED="hello world # stays"\nSINGLE='a=b # stays'\nMULTI="line one\nline two\nline three"\nSPECIAL=abc#def\nBLANK=\nTRAIL=plain # comment\n`);
  assert.deepEqual(parsed, {
    SIMPLE: "hello",
    QUOTED: "hello world # stays",
    SINGLE: "a=b # stays",
    MULTI: "line one\nline two\nline three",
    SPECIAL: "abc#def",
    BLANK: "",
    TRAIL: "plain",
  });
});

test(".env parser rejects invalid names, malformed declarations, and unterminated quotes", () => {
  assert.throws(() => parseEnvText("BAD-NAME=value"), /Invalid environment variable declaration/);
  assert.throws(() => parseEnvText("GOOD=\"unterminated"), /Unterminated quoted value/);
  assert.throws(() => normalizeEnvName("BAD-NAME"), /Invalid environment variable name/);
});

test("ENV values use authenticated encryption and fail with the wrong key", () => {
  const encrypted = encryptEnvValue("firebase-token=secret\nwith-newline");
  assert.notEqual(encrypted.data, "firebase-token=secret\\nwith-newline");
  assert.equal(decryptEnvValue(encrypted), "firebase-token=secret\nwith-newline");
  process.env.ENV_MANAGER_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString("base64");
  assert.throws(() => decryptEnvValue(encrypted), /Stored ENV data could not be decrypted/);
  process.env.ENV_MANAGER_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

test("Admin ENV API and UI do not expose provider tokens or stored secret values", async () => {
  const route = await readFile(new URL("../routes/env-manager.js", import.meta.url), "utf8");
  const service = await readFile(new URL("../services/env-manager.js", import.meta.url), "utf8");
  const core = await readFile(new URL("../services/env-manager-core.js", import.meta.url), "utf8");
  const admin = await readFile(new URL("../views/admin.js", import.meta.url), "utf8");
  assert.match(route, /requireSiteOrigin/);
  assert.match(core, /aes-256-gcm/);
  assert.match(service, /tokenHash|Authorization/);
  assert.doesNotMatch(admin, /localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(admin, /ENV_MANAGER_ENCRYPTION_KEY|HEROKU_API_TOKEN|RAILWAY_API_TOKEN|RENDER_API_KEY/);
});
