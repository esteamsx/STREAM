import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { siteHead } from "../config/site.js";
import { GAME_GUEST_PREVIEWS, gameGuestManifest, gameGuestPath, retargetGameGuestHead } from "../services/game-guest-preview.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = readFileSync(path.join(root, "server.js"), "utf8");
const games = [
  { slug: "chess", name: "Chess" },
  { slug: "ludo", name: "Ludo" },
  { slug: "tictactoe", name: "Tic-Tac-Toe" },
  { slug: "whot", name: "Whot" },
  { slug: "snakes", name: "Snakes and Ladders" },
];

function pngDimensions(file) {
  const data = readFileSync(file);
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

for (const { slug, name } of games) {
  const preview = GAME_GUEST_PREVIEWS[slug];

  test(`${name} guest invite keeps its route and serves game-specific title, preview and icons`, () => {
    const token = "InviteToken_2026";
    const pathName = `/${slug}/guest/:token`;
    assert.ok(server.includes(`"${pathName}"`), "existing guest URL is still registered");
    assert.ok(server.includes(`gameGuestPreviewMiddleware("${slug}")`));
    assert.ok(server.includes(`sendGameGuestPage("${slug}", req.params.token`));
    assert.ok(server.includes('app.get("/game-previews/:game/manifest.webmanifest"'));
    assert.equal(gameGuestPath(slug, token), `/${slug}/guest/${token}`);

    const page = `<!doctype html><html><head><title>Game | ES TEAMS TV</title>${siteHead({
      title: preview.title,
      description: preview.description,
      path: `/${slug}/guest/${token}`,
      image: preview.image,
    })}</head><body>Guest invitation</body></html>`;
    const html = retargetGameGuestHead(page, slug, token, "https://esteamstv.devs.surf");

    assert.match(html, new RegExp(`<title>Join my ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} game \\| ES TEAMS TV<\\/title>`));
    assert.ok(html.includes(`href="https://esteamstv.devs.surf/${slug}/guest/${token}"`));
    assert.ok(html.includes(`content="https://esteamstv.devs.surf${preview.image}"`));
    assert.ok(html.includes(`content="${preview.title}"`));
    assert.ok(html.includes(`href="${preview.iconBase}/favicon.ico"`));
    assert.ok(html.includes(`href="${preview.iconBase}/icon-32.png"`));
    assert.ok(html.includes(`href="${preview.iconBase}/icon-192.png"`));
    assert.ok(html.includes(`href="${preview.iconBase}/apple-touch-icon.png"`));
    assert.ok(html.includes(`href="${preview.iconBase}/manifest.webmanifest"`));
    assert.ok(html.includes('name="apple-mobile-web-app-title" content="ES TEAMS"'), "keep the site's existing mobile title");
    assert.ok(html.includes("sizes=\"180x180\""));
    assert.ok(html.includes("name=\"twitter:card\" content=\"summary_large_image\""));
    assert.ok(!html.includes('href="/favicon.svg"'));
  });

  test(`${name} preview files are optimized and have browser/mobile favicon dimensions`, () => {
    const dir = path.join(root, "public", preview.iconBase.slice(1));
    assert.deepEqual(pngDimensions(path.join(root, "public", preview.image.slice(1))), [1200, 630]);
    assert.deepEqual(pngDimensions(path.join(dir, "icon-32.png")), [32, 32]);
    assert.deepEqual(pngDimensions(path.join(dir, "icon-192.png")), [192, 192]);
    assert.deepEqual(pngDimensions(path.join(dir, "icon-512.png")), [512, 512]);
    assert.deepEqual(pngDimensions(path.join(dir, "apple-touch-icon.png")), [180, 180]);
    const ico = readFileSync(path.join(dir, "favicon.ico"));
    assert.deepEqual([...ico.subarray(0, 4)], [0, 0, 1, 0]);
    assert.equal(ico.readUInt16LE(4), 3, "ICO contains 16, 32 and 48px sizes");
    assert.ok(statSync(path.join(root, "public", preview.image.slice(1))).size < 900_000);
    assert.ok(ico.length < 20_000);

    const manifest = gameGuestManifest(slug);
    assert.equal(manifest.name, "ES TEAMS TV");
    assert.equal(manifest.short_name, "ES TEAMS");
    assert.equal(manifest.start_url, "/");
    assert.deepEqual(manifest.icons.map((icon) => icon.src), [
      `${preview.iconBase}/icon-192.png`,
      `${preview.iconBase}/icon-512.png`,
      `${preview.iconBase}/icon-512.png`,
    ]);
  });
}

test("guest-token path sanitizing and game asset mapping stay isolated", () => {
  assert.equal(gameGuestPath("tictactoe", "ab/cd?ef"), "/tictactoe/guest/abcdef");
  assert.throws(() => gameGuestPath("unknown", "token"), /Unknown guest game/);
  assert.equal(new Set(Object.values(GAME_GUEST_PREVIEWS).map((item) => item.image)).size, 5);
  assert.equal(new Set(Object.values(GAME_GUEST_PREVIEWS).map((item) => item.iconBase)).size, 5);
});
