import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { registerSnakesRoutes } from "../routes/snakes.js";

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
      for (const sink of users.get(uid)?.sinks || []) sink.send(event, data);
    },
    connect(uid, profile, sink = { send() {} }) {
      let u = users.get(uid);
      if (!u) { u = { profile, sinks: new Set() }; users.set(uid, u); }
      u.profile = profile; u.sinks.add(sink);
      for (const fn of hooks) fn(uid, sink);
      return { close: () => u.sinks.delete(sink) };
    },
    disconnect(uid, conn) { if (conn) conn.close(); },
  };
}

function makeResponse() {
  const res = new EventEmitter();
  res.statusCode = 200; res.headers = {}; res.body = null; res.cookies = {};
  res.status = function (code) { this.statusCode = code; return this; };
  res.set = function (name, value) { if (typeof name === "object") Object.assign(this.headers, name); else this.headers[name] = value; return this; };
  res.json = function (data) { this.body = data; return this; };
  res.cookie = function (name, value, options) { this.cookies[name] = { value, options }; return this; };
  res.send = function (data) { this.body = data; return this; };
  res.end = function () { this.writableEnded = true; return this; };
  res.write = function () { return true; };
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
  registerSnakesRoutes(router, {
    requireAuth, requireSiteOrigin, SimpleRateLimiter, chessHub,
    getUserProfile: async (uid) => ({ username: uid, firstName: "Host", lastName: "Player" }),
    searchUsersByUsername: async () => [],
    creditCompetitiveGameWin: async () => ({ rewarded: false, coins: 0 }),
  });
  async function request(method, path, options = {}) {
    let routePath = path;
    let params = {};
    for (const key of routes.keys()) {
      const [verb, pattern] = key.split(" ");
      if (verb !== method) continue;
      const names = [];
      const regex = new RegExp("^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/:([A-Za-z]+)/g, (_m, n) => { names.push(n); return "([^/]+)"; }) + "$");
      const match = routePath.match(regex);
      if (match) { routePath = key; params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(match[i + 1])])); break; }
    }
    const handlers = routes.get(routePath);
    assert.ok(handlers, "route exists: " + method + " " + path);
    const req = Object.assign(new EventEmitter(), {
      method, params, body: {}, query: {}, cookies: {}, ip: "127.0.0.1", secure: true,
      get: () => "https", ...options,
    });
    const res = makeResponse();
    for (const handler of handlers) {
      let nextCalled = false;
      const next = () => { nextCalled = true; };
      const result = handler(req, res, next);
      if (result && typeof result.then === "function") await result;
      if (!nextCalled) break;
    }
    return { req, res };
  }
  return { chessHub, request };
}

test("Snakes guest link is single-use and starts a real two-player online game", async () => {
  const { chessHub, request } = setup();
  chessHub.connect("host-uid", { uid: "host-uid", username: "host", name: "Host Player", photo: null, verified: false });

  const created = await request("POST", "/api/snakes/guest/links", { uid: "host-uid", body: {} });
  assert.equal(created.res.statusCode, 200);
  const token = created.res.body.link.token;
  assert.match(token, /^[A-Za-z0-9_-]{6,40}$/);

  const info = await request("GET", "/api/snakes/guest/info/" + token);
  assert.equal(info.res.body.status, "open");
  assert.equal(info.res.body.host.name, "Host Player");

  const joined = await request("POST", "/api/snakes/guest/join/" + token, { body: { name: "Guest Player" } });
  assert.equal(joined.res.statusCode, 200);
  assert.ok(joined.res.cookies.sx_guest);
  assert.equal(joined.res.cookies.sx_guest.options.httpOnly, true);
  assert.equal(joined.res.cookies.sx_guest.options.sameSite, "lax");
  assert.equal(joined.res.cookies.sx_guest.options.path, "/api/snakes/guest");
  const cookieValue = joined.res.cookies.sx_guest.value;

  const duplicate = await request("POST", "/api/snakes/guest/join/" + token, { body: { name: "Second Guest" } });
  assert.equal(duplicate.res.statusCode, 409);

  const guestInfo = await request("GET", "/api/snakes/guest/info/" + token, { cookies: { sx_guest: cookieValue } });
  assert.equal(guestInfo.res.body.you, true);
  assert.equal(guestInfo.res.body.status, "playing");
  const forgedInfo = await request("GET", "/api/snakes/guest/info/" + token, { cookies: { sx_guest: "guest_fake.not-a-secret" } });
  assert.equal(forgedInfo.res.body.you, false);

  const stream = await request("GET", "/api/snakes/guest/stream", { cookies: { sx_guest: cookieValue } });
  assert.equal(stream.res.statusCode, 200);
  const starts = chessHub.events.get("host-uid").filter((e) => e.event === "snakes_game_start");
  assert.equal(starts.length, 1);
  assert.equal(starts[0].data.players.length, 2);
  assert.equal(chessHub.events.get("guest_" + cookieValue.split(".")[0].slice(6))?.some((e) => e.event === "snakes_game_start"), true);
  stream.res.emit("close");
});

test("Snakes guest links cannot be joined while the host is offline", async () => {
  const { request } = setup();
  const created = await request("POST", "/api/snakes/guest/links", { uid: "offline-host", body: {} });
  const token = created.res.body.link.token;
  const join = await request("POST", "/api/snakes/guest/join/" + token, { body: { name: "Guest Player" } });
  assert.equal(join.res.statusCode, 409);
  assert.equal(join.res.body.code, "host_offline");
});
