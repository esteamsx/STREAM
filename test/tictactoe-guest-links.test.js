import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { registerTttRoutes } from "../routes/tictactoe.js";

function fakeChess() {
  const users = new Map(), hooks = [], events = new Map();
  return {
    users, events,
    onConnect(fn) { hooks.push(fn); },
    isOnline(uid) { return !!(users.get(uid) && users.get(uid).sinks.size); },
    isPresent(uid) { return this.isOnline(uid); },
    profileOf(uid) { return users.get(uid)?.profile || null; },
    connectionCount(uid) { return users.get(uid)?.sinks.size || 0; },
    online() { return []; }, annotate(list) { return list; }, iceServers() { return []; },
    emit(uid, event, data) {
      if (!events.has(uid)) events.set(uid, []);
      events.get(uid).push({ event, data });
      for (const sink of users.get(uid)?.sinks.values() || []) sink.send(event, data);
    },
    connect(uid, profile, sink = { send() {} }) {
      let user = users.get(uid);
      if (!user) { user = { profile, sinks: new Map() }; users.set(uid, user); }
      user.profile = profile;
      const connId = String(user.sinks.size + 1);
      user.sinks.set(connId, sink);
      for (const fn of hooks) fn(uid, sink);
      return connId;
    },
    disconnect(uid, connId) { users.get(uid)?.sinks.delete(connId); },
  };
}

function makeResponse() {
  const res = new EventEmitter();
  res.statusCode = 200; res.headers = {}; res.body = null; res.cookies = {}; res.output = "";
  res.status = function (code) { this.statusCode = code; return this; };
  res.set = function (name, value) { if (typeof name === "object") Object.assign(this.headers, name); else this.headers[name] = value; return this; };
  res.json = function (data) { this.body = data; return this; };
  res.cookie = function (name, value, options) { this.cookies[name] = { value, options }; return this; };
  res.send = function (data) { this.body = data; return this; };
  res.end = function () { this.writableEnded = true; return this; };
  res.write = function (chunk) { this.output += String(chunk); return true; };
  res.flush = function () {};
  res.flushHeaders = function () {};
  return res;
}

function setup() {
  const routes = new Map(), chessHub = fakeChess();
  const router = {
    get(path, ...handlers) { routes.set("GET " + path, handlers); },
    post(path, ...handlers) { routes.set("POST " + path, handlers); },
  };
  class SimpleRateLimiter { middleware() { return (_req, _res, next) => next(); } }
  const requireAuth = (req, res, next) => req.uid ? next() : res.status(401).json({ error: "Sign in" });
  const requireSiteOrigin = (_req, _res, next) => next();
  registerTttRoutes(router, {
    requireAuth,
    requireSiteOrigin,
    SimpleRateLimiter,
    chessHub,
    getUserProfile: async (uid) => ({ uid, username: uid === "host-uid" ? "host" : "guest", firstName: "Host", lastName: "Player" }),
    searchUsersByUsername: async () => [],
  });

  async function request(method, path, options = {}) {
    let routeKey = null, params = {};
    for (const key of routes.keys()) {
      const [verb, pattern] = key.split(" ");
      if (verb !== method) continue;
      const names = [];
      const routePattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:([A-Za-z]+)/g, (_m, name) => { names.push(name); return "([^/]+)"; });
      const match = path.match(new RegExp("^" + routePattern + "$"));
      if (match) { routeKey = key; params = Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])])); break; }
    }
    assert.ok(routeKey, `route exists: ${method} ${path}`);
    const req = Object.assign(new EventEmitter(), { method, params, body: {}, query: {}, cookies: {}, ip: "127.0.0.1", secure: true, get: () => "https", ...options });
    const res = makeResponse();
    for (const handler of routes.get(routeKey)) {
      let nextCalled = false;
      const result = handler(req, res, () => { nextCalled = true; });
      if (result && typeof result.then === "function") await result;
      if (!nextCalled) break;
    }
    return { req, res };
  }
  return { chessHub, request };
}

const guestCookieName = (token) => `ttt_guest_${token}`;

test("TTT guest invitation is one-use and starts a real two-player game through the shared stream", async () => {
  const { chessHub, request } = setup();
  chessHub.connect("host-uid", { uid: "host-uid", username: "host", name: "Host Player", photo: null, verified: false });

  const created = await request("POST", "/api/tictactoe/guest/links", { uid: "host-uid", body: {} });
  assert.equal(created.res.statusCode, 200);
  const link = created.res.body.link;
  assert.match(link.token, /^[A-Za-z0-9_-]{12}$/);
  assert.equal(link.expiresAt - link.createdAt, 24 * 60 * 60 * 1000);

  const info = await request("GET", `/api/tictactoe/guest/info/${link.token}`);
  assert.equal(info.res.body.status, "open");
  assert.equal(info.res.body.host.name, "Host Player");

  const joined = await request("POST", `/api/tictactoe/guest/join/${link.token}`, { body: { name: "Guest Player" } });
  assert.equal(joined.res.statusCode, 200);
  const cookieName = guestCookieName(link.token);
  assert.ok(joined.res.cookies[cookieName]);
  assert.equal(joined.res.cookies[cookieName].options.httpOnly, true);
  assert.equal(joined.res.cookies[cookieName].options.sameSite, "lax");
  assert.equal(joined.res.cookies[cookieName].options.path, "/api/tictactoe/guest");
  const cookieValue = joined.res.cookies[cookieName].value;

  const duplicate = await request("POST", `/api/tictactoe/guest/join/${link.token}`, { body: { name: "Another Guest" } });
  assert.equal(duplicate.res.statusCode, 409);
  assert.equal(duplicate.res.body.code, "playing");

  const guestInfo = await request("GET", `/api/tictactoe/guest/info/${link.token}`, { cookies: { [cookieName]: cookieValue } });
  assert.equal(guestInfo.res.body.you, true);
  assert.equal(guestInfo.res.body.youName, "Guest Player");
  assert.equal(guestInfo.res.body.status, "playing");
  const forged = await request("GET", `/api/tictactoe/guest/info/${link.token}`, { cookies: { [cookieName]: "guest_fake.not-a-secret" } });
  assert.equal(forged.res.body.you, false);

  const stream = await request("GET", "/api/tictactoe/guest/stream", { query: { invite: link.token }, cookies: { [cookieName]: cookieValue } });
  try {
    assert.equal(stream.res.statusCode, 200);
    const hostStarts = chessHub.events.get("host-uid").filter((event) => event.event === "ttt_game_start");
    assert.equal(hostStarts.length, 1);
    assert.equal(hostStarts[0].data.players.length, 2);
    const guestUid = hostStarts[0].data.players.find((player) => player.uid.startsWith("guest_"))?.uid;
    assert.ok(guestUid);
    assert.equal(hostStarts[0].data.players.find((player) => player.uid === guestUid).name, "Guest Player");
    assert.equal(chessHub.events.get(guestUid)?.some((event) => event.event === "ttt_game_start"), true);
    const guestStart = chessHub.events.get(guestUid).find((event) => event.event === "ttt_game_start").data;
    const synced = await request("POST", `/api/tictactoe/guest/game/${guestStart.id}/state`, { query: { invite: link.token }, cookies: { [cookieName]: cookieValue }, body: { key: guestStart.key } });
    assert.equal(synced.res.body.game.id, guestStart.id);
    assert.equal(synced.res.body.game.you, guestStart.you);
  } finally { stream.res.emit("close"); }
});

test("TTT guest cookies remain isolated when one browser joins multiple invitations", async () => {
  const { chessHub, request } = setup();
  chessHub.connect("host-one", { uid: "host-one", username: "one", name: "Host One" });
  chessHub.connect("host-two", { uid: "host-two", username: "two", name: "Host Two" });
  const firstCreated = await request("POST", "/api/tictactoe/guest/links", { uid: "host-one", body: {} });
  const secondCreated = await request("POST", "/api/tictactoe/guest/links", { uid: "host-two", body: {} });
  const firstToken = firstCreated.res.body.link.token;
  const secondToken = secondCreated.res.body.link.token;
  const firstJoin = await request("POST", `/api/tictactoe/guest/join/${firstToken}`, { body: { name: "First Guest" } });
  const firstCookieName = guestCookieName(firstToken);
  const firstCookie = firstJoin.res.cookies[firstCookieName].value;
  const secondJoin = await request("POST", `/api/tictactoe/guest/join/${secondToken}`, { body: { name: "Second Guest" }, cookies: { [firstCookieName]: firstCookie } });
  const secondCookieName = guestCookieName(secondToken);
  const secondCookie = secondJoin.res.cookies[secondCookieName].value;
  const browserCookies = { [firstCookieName]: firstCookie, [secondCookieName]: secondCookie };

  const firstInfo = await request("GET", `/api/tictactoe/guest/info/${firstToken}`, { cookies: browserCookies });
  const secondInfo = await request("GET", `/api/tictactoe/guest/info/${secondToken}`, { cookies: browserCookies });
  assert.equal(firstInfo.res.body.youName, "First Guest");
  assert.equal(secondInfo.res.body.youName, "Second Guest");

  const firstStream = await request("GET", "/api/tictactoe/guest/stream", { query: { invite: firstToken }, cookies: browserCookies });
  const secondStream = await request("GET", "/api/tictactoe/guest/stream", { query: { invite: secondToken }, cookies: browserCookies });
  try {
    const firstGame = chessHub.events.get("host-one").find((event) => event.event === "ttt_game_start");
    const secondGame = chessHub.events.get("host-two").find((event) => event.event === "ttt_game_start");
    assert.ok(firstGame);
    assert.ok(secondGame);
    const firstGuest = firstGame.data.players.find((player) => player.uid.startsWith("guest_"));
    const secondGuest = secondGame.data.players.find((player) => player.uid.startsWith("guest_"));
    assert.notEqual(firstGuest.uid, secondGuest.uid);
    assert.equal(firstGuest.name, "First Guest");
    assert.equal(secondGuest.name, "Second Guest");
  } finally {
    firstStream.res.emit("close");
    secondStream.res.emit("close");
  }
});

test("TTT guest links reject offline hosts and expire after 24 hours", async () => {
  const { request } = setup();
  const created = await request("POST", "/api/tictactoe/guest/links", { uid: "offline-host", body: {} });
  const token = created.res.body.link.token;
  const join = await request("POST", `/api/tictactoe/guest/join/${token}`, { body: { name: "Guest Player" } });
  assert.equal(join.res.statusCode, 409);
  assert.equal(join.res.body.code, "host_offline");

  const actualNow = Date.now;
  try {
    Date.now = () => actualNow() + 24 * 60 * 60 * 1000 + 1;
    const info = await request("GET", `/api/tictactoe/guest/info/${token}`);
    assert.equal(info.res.body.status, "expired");
    const expired = await request("POST", `/api/tictactoe/guest/join/${token}`, { body: { name: "Guest Player" } });
    assert.equal(expired.res.statusCode, 409);
    assert.equal(expired.res.body.code, "expired");
  } finally { Date.now = actualNow; }
});
