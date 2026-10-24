export const THEME_ACCENT_IDS = new Set([
  "default", "ocean", "sunset", "forest", "rose", "gold", "violet", "crimson", "mint", "graphite", "midnight",
]);

function bad(status, message) {
  return Object.assign(new Error(message), { status });
}

export async function saveThemePreference(uid, input, deps) {
  const { getUserProfile, updateUserProfile, isVerificationActive, isAdminEmail } = deps;
  const body = input && typeof input === "object" ? input : {};
  const data = {};

  if (body.accent !== undefined) {
    if (typeof body.accent !== "string" || !THEME_ACCENT_IDS.has(body.accent)) throw bad(400, "Unknown theme.");
    if (body.accent !== "default") {
      const profile = await getUserProfile(uid);
      if (!profile || !(isVerificationActive(profile) || isAdminEmail(profile.email))) {
        throw bad(403, "Themes are for verified members.");
      }
    }
    data.themeAccent = body.accent;
  }

  if (body.mode !== undefined) {
    if (body.mode !== "light" && body.mode !== "dark") throw bad(400, "Unknown display mode.");
    data.themeMode = body.mode;
  }

  if (Object.keys(data).length === 0) throw bad(400, "Nothing to save.");
  await updateUserProfile(uid, data);
  return data;
}
