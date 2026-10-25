import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const games = [
  { name: "Ludo", file: "public/ludo/ludo-page.js", event: "ludo" },
  { name: "Snakes & Ladders", file: "public/snakes/snakes-page.js", event: "snakes" },
  { name: "Whot", file: "public/whot/whot-page.js", event: "whot" },
];

for (const game of games) {
  const source = readFileSync(new URL("../" + game.file, import.meta.url), "utf8");

  test(`${game.name} plays a ping after connecting/reconnecting, on challenge, and when a game starts`, () => {
    assert.match(source, /function playPing\(\) \{ try \{ sound\.ping\(\); \}/);
    const hello = source.match(/on\("hello", \(d\) => \{[^\n]+/);
    assert.ok(hello, "shared hello handler exists");
    assert.match(hello[0], /state\.conn !== "online"/);
    assert.match(hello[0], /playPing\(\)/);
    assert.match(source, new RegExp(`on\\("${game.event}_challenge", \\(c\\) => \\{ playPing\\(\\);`));
    assert.match(source, new RegExp(`on\\("${game.event}_game_start", \\(v\\) => \\{ playPing\\(\\);`));
  });

  test(`${game.name} retains win/loss result sounds and board/action sounds`, () => {
    assert.match(source, /sound\.win\(\)/);
    assert.match(source, /sound\.lose\(\)/);
    if (game.name === "Whot") assert.match(source, /whotSound\("move"\)/);
    else assert.match(source, /sound\.move\(\)/);
  });
}
