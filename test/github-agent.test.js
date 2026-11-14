import test from "node:test";
import assert from "node:assert/strict";
import {
  encryptGithubToken,
  decryptGithubToken,
  validateRepo,
  validateRef,
  validatePath,
} from "../services/github-agent-guards.js";

test("GitHub Agent validates repository identifiers, refs, and paths", () => {
  assert.deepEqual(validateRepo("esteamsx", "STREAM"), { owner: "esteamsx", repo: "STREAM" });
  assert.equal(validateRef("feature/coding-agent"), "feature/coding-agent");
  assert.equal(validatePath("src/routes/coding.js"), "src/routes/coding.js");
  assert.throws(() => validateRepo("bad/owner", "repo"), /Invalid GitHub repository/);
  assert.throws(() => validateRef("../main"), /Invalid GitHub branch/);
  assert.throws(() => validatePath("src/../.env"), /Invalid repository path/);
  assert.throws(() => validatePath("/absolute/path"), /Invalid repository path/);
});

test("GitHub Agent encrypts tokens without returning plaintext storage", () => {
  const oldKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  process.env.GITHUB_TOKEN_ENCRYPTION_KEY = "github-agent-test-key";
  try {
    const encrypted = encryptGithubToken("gho_test_secret");
    assert.notEqual(encrypted, "gho_test_secret");
    assert.equal(decryptGithubToken(encrypted), "gho_test_secret");
  } finally {
    if (oldKey == null) delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    else process.env.GITHUB_TOKEN_ENCRYPTION_KEY = oldKey;
  }
});
