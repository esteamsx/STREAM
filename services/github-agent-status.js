import { CODING_GITHUB_OAUTH_SCOPE } from "./github-agent-config.js";

export async function resolveVerifiedGithubStatus(connection, { getUser, markExpired } = {}) {
  if (!connection) return { connected: false, selectedRepo: null, needsPermissionUpgrade: false };
  try {
    const account = await getUser(connection.token);
    const login = String(account?.login || connection.login || "").trim();
    if (!login) throw Object.assign(new Error("GitHub did not return the authenticated account name."), { code: "github_identity_unavailable" });
    const scopes = Array.isArray(connection.scopes) ? connection.scopes : [];
    return {
      connected: true,
      login,
      avatarUrl: account?.avatar_url || connection.avatarUrl || null,
      scopes,
      needsPermissionUpgrade: !scopes.includes(CODING_GITHUB_OAUTH_SCOPE),
      selectedRepo: connection.selectedRepo || null,
      connectedAt: connection.connectedAt || null,
    };
  } catch (error) {
    if (Number(error?.upstreamStatus) !== 401) throw error;
    await markExpired?.(connection);
    return {
      connected: false,
      selectedRepo: null,
      needsPermissionUpgrade: false,
      reason: "token_expired",
      previousLogin: String(connection.login || "").trim() || null,
    };
  }
}
