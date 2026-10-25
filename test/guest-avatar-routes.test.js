import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { registerLudoRoutes } from "../routes/ludo.js";
import { registerSnakesRoutes } from "../routes/snakes.js";
import { registerWhotRoutes } from "../routes/whot.js";
import { registerTttRoutes } from "../routes/tictactoe.js";

const REGISTER = {
  ludo: registerLudoRoutes,
  snakes: registerSnakesRoutes,
  whot: registerWhotRoutes,
  tictactoe: registerTttRoutes,
};

function makeResponse() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.body = null;
  res.status = function (code) { this.statusCode = code; return this; };
  res.set = function (name, value) {
    if (typeof name === "object") Object.assign(this.headers, name);
    else this.headers[name] = value;
    return this;
  };
  res.json = function (value) { this.body = value; return this; };
  res.send = function (value) { this.body = value; return this; };
  res.end = function () { this.writableEnded = true; return this; };
  return res;
}

function setup(slug, initialProfile) {
  const routes = new Map();
  let profile = initialProfile;
  const router = {
    get(path, ...handlers) { routes.set("GET " + path, handlers); },
    post(path, ...handlers) { routes.set("POST " + path, handlers); },
  };
  class SimpleRateLimiter { middleware() { return (_req, _res, next) => next(); } }
  const requireAuth = (req, res, next) => req.uid ? next() : res.status(401).json({ error: "Sign in" });
  const requireSiteOrigin = (_req, _res, next) => next();
  const hub = { setOnGameOver() {}, sweep() {} };
  REGISTER[slug](router, {
    requireAuth,
    requireSiteOrigin,
    SimpleRateLimiter,
    getUserProfile: async () => profile,
    searchUsersByUsername: async () => [],
    creditCompetitiveGameWin: async () => ({ rewarded: false, coins: 0 }),
    chessHub: {},
    hub,
  });

  async function request(method, path, options = {}) {
    let routeKey = null;
    let params = {};
    for (const key of routes.keys()) {
      const [verb, pattern] = key.split(" ");
      if (verb !== method) continue;
      const names = [];
      const regex = new RegExp("^" + pattern.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&").replace(/:([A-Za-z]+)/g, (_m, name) => { names.push(name); return "([^/]+)"; }) + "$");
      const match = path.match(regex);
      if (match) {
        routeKey = key;
        params = Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
        break;
      }
    }
    assert.ok(routeKey, `route exists: ${method} ${path}`);
    const req = Object.assign(new EventEmitter(), {
      method, params, body: {}, query: {}, cookies: {}, ip: "127.0.0.1", secure: true,
      get: () => "https",
      ...options,
    });
    const res = makeResponse();
    for (const handler of routes.get(routeKey)) {
      let nextCalled = false;
      const result = handler(req, res, () => { nextCalled = true; });
      if (result && typeof result.then === "function") await result;
      if (!nextCalled) break;
    }
    return res;
  }

  return { request, setProfile: (value) => { profile = value; } };
}

for (const slug of ["ludo", "snakes", "whot", "tictactoe"]) {
  test(`${slug} guest invitation serves the inviter's profile image and respects photo privacy`, async () => {
    const expectedBytes = Buffer.from("profile-image-bytes");
    const { request, setProfile } = setup(slug, {
      username: "host",
      firstName: "Host",
      lastName: "Player",
      photoURL: "data:image/png;base64," + expectedBytes.toString("base64"),
    });
    const created = await request("POST", `/api/${slug}/guest/links`, { uid: "host-uid", body: {} });
    assert.equal(created.statusCode, 200);
    const token = created.body.link.token;

    const info = await request("GET", `/api/${slug}/guest/info/${token}`);
    assert.equal(info.body.host.name, "Host Player");
    assert.equal(info.body.host.photo, `/api/${slug}/guest/avatar/${token}`);

    const image = await request("GET", info.body.host.photo);
    assert.equal(image.statusCode, 200);
    assert.equal(image.headers["Content-Type"], "image/png");
    assert.deepEqual(image.body, expectedBytes);
    const invalidToken = await request("GET", `/api/${slug}/guest/avatar/not-a-valid-link`);
    assert.equal(invalidToken.statusCode, 404);

    setProfile({ username: "host", photoURL: "https://images.example.test/profile.jpg" });
    const remotePhoto = await request("GET", `/api/${slug}/guest/info/${token}`);
    assert.equal(remotePhoto.body.host.photo, "https://images.example.test/profile.jpg");

    setProfile({ username: "host", photoURL: "data:image/png;base64," + expectedBytes.toString("base64"), showProfilePhoto: false });
    const privatePhoto = await request("GET", `/api/${slug}/guest/info/${token}`);
    assert.equal(privatePhoto.body.host.photo, null);
    const hiddenImage = await request("GET", `/api/${slug}/guest/avatar/${token}`);
    assert.equal(hiddenImage.statusCode, 404);
  });
}
