import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const games = [
  { name: "Ludo", file: "public/ludo/ludo-page.js", event: "ludo" },
  { name: "Snakes & Ladders", file: "public/snakes/snakes-page.js", event: "snakes" },
  { name: "Whot", file: "public/whot/whot-page.js", event: "whot" },
  { name: "Tic-Tac-Toe", file: "public/tictactoe/ttt-page.js", event: "ttt" },
];

for (const game of games) {
  const source = readFileSync(new URL("../" + game.file, import.meta.url), "utf8");

  test(`${game.name} pings for challenges and starts, and for a guest only after an active game is confirmed`, () => {
    assert.match(source, /function playPing\(\) \{ try \{ sound\.ping\(\); \}/);
    assert.match(source, /function playGameStartPing\(gameId\)/);
    assert.match(source, /if \(GUEST_TOKEN\) \{\s*if \(!gameId \|\| guestConnectionSounded\) return;/);

    const hello = source.match(/on\("hello", \(d\) => \{[^\n]+/);
    assert.ok(hello, "shared hello handler exists");
    assert.doesNotMatch(hello[0], /playPing\(\)|playGameStartPing\(/, "ordinary page connection must stay silent");

    const gameHello = source.match(new RegExp(`on\\("${game.event}_hello", \\(d\\) => \\{[\\s\\S]*?\\n  \\}\\);`));
    assert.ok(gameHello, "game-specific hello handler exists");
    assert.match(gameHello[0], /d\.game && d\.game\.status === "active"/);
    assert.match(gameHello[0], /if \(GUEST_TOKEN\) playGameStartPing\(d\.game\.id\)/);

    assert.match(source, new RegExp(`on\\("${game.event}_challenge", \\(c\\) => \\{ playPing\\(\\);`));
    assert.match(source, new RegExp(`on\\("${game.event}_game_start", \\(v\\) => \\{[^}]*playGameStartPing\\(v\\.id\\);`));
    assert.match(source, /if \(GUEST_TOKEN\) guestConnectionSounded = false;/);
  });

  test(`${game.name} retains win/loss result sounds and board/action sounds`, () => {
    assert.match(source, /sound\.win\(\)/);
    assert.match(source, /sound\.lose\(\)/);
    if (game.name === "Whot") assert.match(source, /whotSound\("move"\)/);
    else assert.match(source, /sound\.move\(\)/);
  });
}
