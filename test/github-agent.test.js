import test from "node:test";
import assert from "node:assert/strict";
import {
  encryptGithubToken,
  decryptGithubToken,
  validateRepo,
  parseGithubRepositoryInput,
  validateRef,
  validatePath,
} from "../services/github-agent-guards.js";
import { getCodingGithubOAuthConfig, CODING_GITHUB_OAUTH_SCOPE } from "../services/github-agent-config.js";
import { resolveVerifiedGithubStatus } from "../services/github-agent-status.js";

test("GitHub Agent OAuth uses dedicated credentials and callback variables", () => {
  assert.deepEqual(getCodingGithubOAuthConfig({
    CODING_GITHUB_CLIENT_ID: "coding-client",
    CODING_GITHUB_CLIENT_SECRET: "coding-secret",
    CODING_GITHUB_REDIRECT_URI: "https://example.test/api/coding/github/callback",
    GITHUB_CLIENT_ID: "website-client",
    GITHUB_CLIENT_SECRET: "website-secret",
  }), {
    clientId: "coding-client",
    clientSecret: "coding-secret",
    redirectUri: "https://example.test/api/coding/github/callback",
  });
  assert.equal(getCodingGithubOAuthConfig({ SITE_URL: "https://coding.example" }).redirectUri, "https://coding.example/api/coding/github/callback");
});

test("GitHub Agent validates repository identifiers, refs, and paths", () => {
  assert.deepEqual(validateRepo("esteamsx", "STREAM"), { owner: "esteamsx", repo: "STREAM" });
  assert.deepEqual(parseGithubRepositoryInput({ url: "https://github.com/esteamsx/STREAM" }), { owner: "esteamsx", repo: "STREAM" });
  assert.deepEqual(parseGithubRepositoryInput({ url: "github.com/esteamsx/STREAM.git" }), { owner: "esteamsx", repo: "STREAM" });
  assert.equal(validateRef("feature/coding-agent"), "feature/coding-agent");
  assert.equal(validatePath("src/routes/coding.js"), "src/routes/coding.js");
  assert.throws(() => validateRepo("bad/owner", "repo"), /Invalid GitHub repository/);
  assert.throws(() => parseGithubRepositoryInput({ url: "https://example.com/esteamsx/STREAM" }), /github.com/);
  assert.throws(() => validateRef("../main"), /Invalid GitHub branch/);
  assert.throws(() => validatePath("src/../.env"), /Invalid repository path/);
  assert.throws(() => validatePath("/absolute/path"), /Invalid repository path/);
});

test("GitHub Agent encrypts tokens without returning plaintext storage", () => {
  const oldCodingKey = process.env.CODING_GITHUB_ENCRYPTION_KEY;
  const oldGenericKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  process.env.CODING_GITHUB_ENCRYPTION_KEY = "github-agent-test-key";
  try {
    const encrypted = encryptGithubToken("gho_test_secret");
    assert.notEqual(encrypted, "gho_test_secret");
    assert.equal(decryptGithubToken(encrypted), "gho_test_secret");
    delete process.env.CODING_GITHUB_ENCRYPTION_KEY;
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = "website-login-key";
    assert.throws(() => encryptGithubToken("gho_test_secret"), /encryption is not configured/);
  } finally {
    if (oldCodingKey == null) delete process.env.CODING_GITHUB_ENCRYPTION_KEY;
    else process.env.CODING_GITHUB_ENCRYPTION_KEY = oldCodingKey;
    if (oldGenericKey == null) delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    else process.env.GITHUB_TOKEN_ENCRYPTION_KEY = oldGenericKey;
  }
});

test("GitHub Agent requests only the repository scope needed for write operations", () => {
  assert.equal(CODING_GITHUB_OAUTH_SCOPE, "repo");
});


test("GitHub status reports the username verified by the authenticated account endpoint", async () => {
  let suppliedToken = "";
  const status = await resolveVerifiedGithubStatus({ token: "decrypted-access-token", login: "stale-name", scopes: ["repo"], selectedRepo: { owner: "esteamsx", repo: "STREAM" }, connectedAt: 12 }, {
    getUser: async (token) => { suppliedToken = token; return { login: "paskito002", avatar_url: "https://avatars.example/paskito002.png" }; },
    markExpired: async () => assert.fail("a valid token must not be revoked"),
  });
  assert.equal(suppliedToken, "decrypted-access-token");
  assert.equal(status.connected, true);
  assert.equal(status.login, "paskito002");
  assert.equal(status.avatarUrl, "https://avatars.example/paskito002.png");
  assert.deepEqual(status.selectedRepo, { owner: "esteamsx", repo: "STREAM" });
});

test("GitHub status marks confirmed 401 tokens expired but preserves 403 and transient errors", async () => {
  let invalidations = 0;
  const connection = { token: "expired-token", login: "paskito002", scopes: ["repo"] };
  const expired = await resolveVerifiedGithubStatus(connection, {
    getUser: async () => { throw Object.assign(new Error("unauthorized"), { upstreamStatus: 401 }); },
    markExpired: async (previous) => { invalidations += 1; assert.equal(previous.login, "paskito002"); },
  });
  assert.deepEqual(expired, { connected: false, selectedRepo: null, needsPermissionUpgrade: false, reason: "token_expired", previousLogin: "paskito002" });
  assert.equal(invalidations, 1);

  for (const upstreamStatus of [403, 503]) {
    await assert.rejects(resolveVerifiedGithubStatus(connection, {
      getUser: async () => { throw Object.assign(new Error("temporary or permission error"), { upstreamStatus }); },
      markExpired: async () => assert.fail("only a confirmed 401 should revoke the token"),
    }), /temporary or permission error/);
  }
  assert.equal(invalidations, 1);
});
