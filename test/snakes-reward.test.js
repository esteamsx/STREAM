import test from "node:test";
import assert from "node:assert/strict";
import { createSnakesHub } from "../services/snakes-mp.js";
import { registerSnakesRoutes } from "../routes/snakes.js";

function fakeChess() {
  const inbox = new Map();
  const online = new Set();
  return {
    online,
    emit(uid, event, data) {
      if (!inbox.has(uid)) inbox.set(uid, []);
      inbox.get(uid).push({ event, data: structuredClone(data) });
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

function playNaturalGame() {
  const chess = fakeChess();
  let now = 1_000_000;
  let seed = 13;
  let randomId = 0;
  chess.online.add("a");
  chess.online.add("b");
  const hub = createSnakesHub({
    chess,
    now: () => now,
    randomInt: (n) => {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return seed % n;
    },
    randomHex: (n) => (++randomId).toString(16).padStart(n * 2, "0"),
  });
  const gameId = hub.startDirect("a", "b");
  const starts = { a: chess.last("a", "snakes_game_start"), b: chess.last("b", "snakes_game_start") };
  const uidBySeat = Object.fromEntries(Object.entries(starts).map(([uid, game]) => [game.you, uid]));
  let over = null;
  for (let i = 0; i < 10_000 && !over; i++) {
    const game = hub.syncState("a", gameId, starts.a.key).game;
    const uid = uidBySeat[game.state.turn];
    hub.roll(uid, gameId, starts[uid].key);
    now += 10_000;
    over = chess.last("a", "snakes_over");
  }
  return { chess, hub, gameId, starts, over, uidBySeat };
}

test("only the authenticated winner of a sufficiently played natural Snakes match gets reward proof", () => {
  const { hub, gameId, over, uidBySeat } = playNaturalGame();
  assert.ok(over, "the server-side match should complete naturally");
  assert.equal(over.result.reason, "home");
  assert.equal(over.state.winner, over.result.winner);
  const winnerUid = uidBySeat[over.result.winner];
  const proof = hub.rewardableWin(winnerUid, gameId);
  assert.ok(proof);
  assert.deepEqual(new Set(proof.participantUids), new Set(["a", "b"]));
  assert.equal(hub.rewardableWin(winnerUid === "a" ? "b" : "a", gameId), null);
  assert.equal(hub.rewardableWin(winnerUid, "not-a-server-game"), null);
});

test("incomplete, resigned, and guest matches cannot produce Snakes reward proof", () => {
  const chess = fakeChess();
  chess.online.add("a");
  chess.online.add("b");
  const hub = createSnakesHub({ chess });
  const gameId = hub.startDirect("a", "b");
  assert.equal(hub.rewardableWin("a", gameId), null);
  hub.resign("b", gameId, chess.last("b", "snakes_game_start").key);
  assert.equal(chess.last("a", "snakes_over").result.reason, "resigned");
  assert.equal(hub.rewardableWin("a", gameId), null);
  assert.equal(hub.rewardableWin("b", gameId), null);
});

test("Snakes reward endpoint credits only the server proof for req.uid, ignoring client-supplied identity", async () => {
  const registered = [];
  const router = {
    get(path, ...handlers) { registered.push({ method: "GET", path, handlers }); },
    post(path, ...handlers) { registered.push({ method: "POST", path, handlers }); },
  };
  class SimpleRateLimiter { middleware() { return () => {}; } }
  const requireAuth = () => {};
  const requireSiteOrigin = () => {};
  const proof = { gameId: "server-game-7", participantUids: ["winner", "opponent"] };
  const calls = [];
  const hub = {
    setOnGameOver() {},
    rewardableWin(uid, gameId) { calls.push({ uid, gameId }); return proof; },
  };
  registerSnakesRoutes(router, {
    requireAuth,
    requireSiteOrigin,
    SimpleRateLimiter,
    getUserProfile: async () => null,
    searchUsersByUsername: async () => [],
    creditCompetitiveGameWin: async (...args) => { calls.push(args); return { rewarded: true, coins: 1, balance: 8 }; },
    chessHub: { iceServers: () => [] },
    hub,
  });
  const route = registered.find((r) => r.method === "POST" && r.path === "/api/snakes/game/:id/reward");
  assert.ok(route);
  assert.ok(route.handlers.includes(requireAuth));
  assert.ok(route.handlers.includes(requireSiteOrigin));
  const response = {
    statusCode: 200,
    headers: {},
    body: null,
    set(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
  await route.handlers.at(-1)({ uid: "winner", params: { id: "client-route-id" }, body: { uid: "attacker", gameId: "forged" } }, response);
  assert.deepEqual(calls[0], { uid: "winner", gameId: "client-route-id" });
  assert.deepEqual(calls[1], ["winner", "snakes_ladders", proof.gameId, proof.participantUids]);
  assert.equal(response.body.rewarded, true);
  assert.equal(response.headers["Cache-Control"], "no-store");
});
