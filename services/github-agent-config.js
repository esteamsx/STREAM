export const CODING_GITHUB_OAUTH_SCOPE = "repo";

export function getCodingGithubOAuthConfig(env = process.env) {
  const clientId = String(env.CODING_GITHUB_CLIENT_ID || "").trim();
  const clientSecret = String(env.CODING_GITHUB_CLIENT_SECRET || "").trim();
  const siteUrl = String(env.SITE_URL || "https://esteamstv.devs.surf").replace(/\/$/, "");
  const redirectUri = String(env.CODING_GITHUB_REDIRECT_URI || `${siteUrl}/api/coding/github/callback`).trim();
  return { clientId, clientSecret, redirectUri };
}
