import * as cheerio from "cheerio";

export async function searchApk(query) {
  const q = String(query || "").trim();
  if (!q) throw Object.assign(new Error("Missing search query."), { status: 400 });

  const res = await fetch(`https://apkcombo.com/search?q=${encodeURIComponent(q)}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw Object.assign(new Error(`Search responded ${res.status}.`), { status: 502 });
  const html = await res.text();
  const $ = cheerio.load(html);
  const firstResult = $("a.app-w").first();
  const appPath = firstResult.attr("href");
  if (!appPath) throw Object.assign(new Error("Could not find that app."), { status: 404 });

  return {
    name: firstResult.find(".name").text().trim() || q,
    icon: firstResult.find("img").attr("src") || firstResult.find("img").attr("data-src") || null,
    infoPage: new URL(appPath, "https://apkcombo.com").toString(),
  };
}
