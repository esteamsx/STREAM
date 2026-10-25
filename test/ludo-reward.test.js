import test from "node:test";
import assert from "node:assert/strict";
import { createLudoHub } from "../services/ludo-mp.js";
import { legalTokens } from "../public/ludo/ludo-engine.js";

function fakeChess() {
  const inbox = new Map();
  const online = new Set();
  return {
    online,
    emit(uid, event, data) {
      if (!inbox.has(uid)) inbox.set(uid, []);
      inbox.get(uid).push({ event, data: JSON.parse(JSON.stringify(data)) });
    },
    isOnline: (uid) => online.has(uid),
    isPresent: (uid) => online.has(uid),
    profileOf: (uid) => ({ uid, username: uid, name: uid, photo: null, verified: false }),
    onConnect: () => {},
    last(uid, event) {
      const messages = (inbox.get(uid) || []).filter((m) => m.event === event);
      return messages.length ? messages[messages.length - 1].data : null;
    },
  };
}

test("only the authenticated winner of a sufficiently played natural Ludo match gets reward proof", () => {
  const chess = fakeChess();
  let now = 1_000_000;
  let randomValue = 13;
  let randomId = 0;
  chess.online.add("a");
  chess.online.add("b");
  const hub = createLudoHub({
    chess,
    now: () => now,
    randomInt: (n) => {
      randomValue = (randomValue * 1103515245 + 12345) >>> 0;
      return randomValue % n;
    },
    randomHex: (n) => (++randomId).toString(16).padStart(n * 2, "0"),
  });
  const gameId = hub.startDirect("a", "b", { color: "red" });
  const starts = {
    a: chess.last("a", "ludo_game_start"),
    b: chess.last("b", "ludo_game_start"),
  };
  const uidByColor = Object.fromEntries(Object.entries(starts).map(([uid, game]) => [game.you, uid]));
  let over = null;

  for (let i = 0; i < 30_000 && !over; i++) {
    const game = hub.syncState("a", gameId, starts.a.key).game;
    const color = game.state.turn;
    const uid = uidByColor[color];
    const key = starts[uid].key;
    if (game.state.roll == null) {
      hub.roll(uid, gameId, key);
    } else {
      const engineState = { ...game.state, turn: game.state.seats.indexOf(color) };
      const legal = legalTokens(engineState);
      assert.ok(legal.length > 0, "a pending roll must have a legal token");
      hub.move(uid, gameId, key, legal[0]);
    }
    now += 1000;
    over = chess.last("a", "ludo_over");
  }

  assert.ok(over, "the server-side match should complete naturally");
  assert.equal(over.result.reason, "home");
  assert.equal(over.state.winner, over.result.winner);
  const winnerUid = uidByColor[over.result.winner];
  const proof = hub.rewardableWin(winnerUid, gameId);
  assert.ok(proof);
  assert.deepEqual(new Set(proof.participantUids), new Set(["a", "b"]));
  assert.equal(hub.rewardableWin(winnerUid === "a" ? "b" : "a", gameId), null);
  assert.equal(hub.rewardableWin(winnerUid, "not-a-server-game"), null);
});

test("resignation, incomplete matches, and fabricated IDs are not eligible for Ludo rewards", () => {
  const chess = fakeChess();
  chess.online.add("a");
  chess.online.add("b");
  const hub = createLudoHub({ chess });
  const gameId = hub.startDirect("a", "b", { color: "red" });
  const a = chess.last("a", "ludo_game_start");
  assert.equal(hub.rewardableWin("a", gameId), null);
  assert.equal(hub.rewardableWin("a", "fabricated"), null);
  hub.resign("b", gameId, chess.last("b", "ludo_game_start").key);
  assert.equal(chess.last("a", "ludo_over").result.reason, "resigned");
  assert.equal(hub.rewardableWin("a", gameId), null);
  assert.equal(hub.rewardableWin("b", gameId), null);
  assert.ok(a.key);
});
