import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../public/ios-motion.js", import.meta.url), "utf8");

function matches(el, selector) {
  return selector.split(",").some((part) => {
    const sel = part.trim();
    if (!sel) return false;
    const tag = (sel.match(/^[a-z][a-z0-9-]*/i) || [""])[0].toLowerCase();
    if (tag && el.tag !== tag) return false;
    for (const m of sel.matchAll(/\.([\w-]+)/g)) if (!el.classes.has(m[1])) return false;
    for (const m of sel.matchAll(/\[([\w-]+)(\*?=)?(?:"([^"]*)")?\]/g)) {
      if (m[2] === "*=") {
        if (m[1] === "class") { if (!el.className.includes(m[3])) return false; } else if (!String(el.attrs[m[1]] || "").includes(m[3])) return false;
      } else if (m[2] === "=") {
        if (el.attrs[m[1]] !== m[3]) return false;
      } else if (!(m[1] in el.attrs)) return false;
    }
    return Boolean(tag) || /[.[]/.test(sel);
  });
}

function makeEnv({ path = "/chess", menuLinks = null } = {}) {
  const all = [];
  const listeners = {};
  const docListeners = {};
  const assigned = [];

  function makeEl(tag = "div", init = {}) {
    const el = {
      tag: String(tag).toLowerCase(),
      attrs: {},
      classes: new Set(),
      children: [],
      dataset: {},
      style: { setProperty() {}, removeProperty() {} },
      isConnected: false,
      hidden: false,
      parentNode: null,
      _text: "",
      _byClass: {},
      listeners: {},
      get className() { return [...this.classes].join(" "); },
      set className(v) { this.classes = new Set(String(v).split(/\s+/).filter(Boolean)); },
      get id() { return this.attrs.id || ""; },
      set id(v) { this.attrs.id = String(v); },
      classList: {
        add: (...n) => n.forEach((x) => el.classes.add(x)),
        remove: (...n) => n.forEach((x) => el.classes.delete(x)),
        toggle: (n, force) => { const on = force === undefined ? !el.classes.has(n) : force; if (on) el.classes.add(n); else el.classes.delete(n); return on; },
        contains: (n) => el.classes.has(n),
      },
      setAttribute(k, v) { this.attrs[k] = String(v); },
      getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      hasAttribute(k) { return k in this.attrs; },
      removeAttribute(k) { delete this.attrs[k]; },
      appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        const connect = (n) => { n.isConnected = true; n.children.forEach(connect); };
        if (this.isConnected) connect(child);
        return child;
      },
      insertBefore(child) { return this.appendChild(child); },
      addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
      removeEventListener() {},
      querySelector(sel) {
        const cls = (sel.match(/^\.([\w-]+)$/) || [])[1];
        return cls ? this._byClass[cls] || null : null;
      },
      querySelectorAll() { return []; },
      closest(sel) { return matches(this, sel) ? this : null; },
      contains(n) { return n === this || this.children.some((c) => c.contains && c.contains(n)); },
      getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; },
      getClientRects() { return [1]; },
      focus() {},
      get textContent() { return this._text; },
      set textContent(v) { this._text = String(v); if (v === "") this.children = []; },
      set innerHTML(html) {
        this._byClass = {};
        for (const m of String(html).matchAll(/class="([^"]+)"/g)) {
          const child = makeEl("div");
          child.className = m[1];
          this._byClass[m[1].split(/\s+/)[0]] = child;
        }
      },
      get innerHTML() { return ""; },
    };
    Object.assign(el, init);
    all.push(el);
    return el;
  }

  const html = makeEl("html");
  const body = makeEl("body");
  const head = makeEl("head");
  html.isConnected = body.isConnected = head.isConnected = true;

  const menuAnchors = (menuLinks || []).map((l) => {
    const a = makeEl("a");
    a.href = l.href;
    a.textContent = l.label;
    a.attrs["data-es-href"] = l.href;
    return a;
  });

  const document = {
    body,
    head,
    documentElement: html,
    activeElement: null,
    hidden: false,
    createElement: (tag) => makeEl(tag),
    getElementById: (id) => all.find((e) => e.isConnected && e.attrs.id === id) || null,
    querySelector: (sel) => (sel === "main" ? null : null),
    querySelectorAll: (sel) => (String(sel).includes("#esMenuList a[data-es-href]") ? menuAnchors : []),
    elementFromPoint: () => document.__point,
    addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
    removeEventListener() {},
    __point: null,
  };

  const context = {
    document,
    navigator: { vibrate: () => true },
    location: {
      pathname: path,
      search: "",
      hash: "",
      origin: "https://site.test",
      href: "https://site.test" + path,
      assign: (u) => assigned.push(u),
    },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => "", overflowY: "visible" }),
    requestAnimationFrame: (fn) => fn(),
    cancelAnimationFrame() {},
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    visualViewport: { scale: 1, addEventListener() {} },
    innerHeight: 800,
    innerWidth: 400,
    scrollY: 0,
    scrollTo() {},
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval() {},
    URL,
    console,
  };
  context.window = context;
  context.self = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "ios-motion.js" });

  const fire = (type, event) => {
    const e = { preventDefault() { e.defaultPrevented = true; }, cancelable: true, isTrusted: true, ...event };
    (docListeners[type] || []).forEach((fn) => fn(e));
    return e;
  };

  const target = (tag = "div", className = "") => {
    const el = makeEl(tag);
    el.className = className;
    el.isConnected = true;
    return el;
  };

  const touches = (a, b, gap) => [
    { clientX: 100, clientY: 300, target: a },
    { clientX: 100 + gap, clientY: 300, target: b },
  ];

  const pinchIn = (a, b = a) => {
    document.__point = a;
    fire("touchstart", { target: a, touches: touches(a, b, 200) });
    fire("touchmove", { target: a, touches: touches(a, b, 90) });
    fire("touchend", { touches: [] });
  };

  const overlay = () => document.getElementById("esPageOverview");
  return { all, document, context, fire, target, touches, pinchIn, overlay, assigned, makeEl };
}

test("a page with no shared menu still gets the overview and nothing is added to a menu", () => {
  const env = makeEnv({ path: "/chess" });
  assert.ok(env.overlay(), "overview overlay exists without #esMenuList");
  assert.ok(env.context.ESIOSPageOverview && typeof env.context.ESIOSPageOverview.open === "function");
  assert.ok(!env.all.some((e) => e.classes.has("es-page-overview-launch")), "no menu launcher is created");
});

test("pinching in opens the overview with the full page list and marks the current page", () => {
  const env = makeEnv({ path: "/tools/trading" });
  env.pinchIn(env.target("div", "content"));
  const overlay = env.overlay();
  assert.ok(overlay.classes.has("show"));
  assert.equal(overlay.attrs["aria-hidden"], "false");
  const grid = overlay._byClass["es-overview-scroll"] && overlay.querySelector(".es-overview-grid");
  assert.ok(grid, "grid exists");
  assert.equal(grid.children.length, 19);
  const labels = grid.children.map((c) => c.attrs["aria-label"]);
  assert.ok(labels.includes("Home") && labels.includes("Developers") && labels.includes("Tic-Tac-Toe") && labels.includes("Cod\\ng"));
  assert.ok(!labels.includes("Page overview"));
  const current = grid.children.filter((c) => c.attrs["aria-current"] === "page");
  assert.equal(current.length, 1);
  assert.equal(current[0].attrs["aria-label"], "Trading");
});

test("a pinch that starts on links and buttons now works, so card-based pages are not dead", () => {
  const env = makeEnv({ path: "/giveaway" });
  env.pinchIn(env.target("a", "tool-card"), env.target("button", "cta"));
  assert.ok(env.overlay().classes.has("show"));
});

test("immersive and input surfaces still refuse the pinch", () => {
  for (const [tag, cls] of [["video", ""], ["input", ""], ["textarea", ""], ["canvas", ""], ["div", "game-board"], ["div", "chat-thread"], ["div", "page-overlay show"]]) {
    const env = makeEnv({ path: "/chess" });
    env.pinchIn(env.target(tag, cls));
    assert.ok(!env.overlay().classes.has("show"), tag + "." + cls + " must not open the overview");
  }
});

test("a zoomed-in page does not open the overview", () => {
  const env = makeEnv({ path: "/profile" });
  env.context.visualViewport.scale = 1.6;
  env.pinchIn(env.target("div", "content"));
  assert.ok(!env.overlay().classes.has("show"));
});

test("the live shared menu is used when it exists", () => {
  const env = makeEnv({ path: "/profile", menuLinks: [{ href: "/profile", label: "Profile" }, { href: "/admin", label: "Admin" }] });
  env.pinchIn(env.target("div", "content"));
  const grid = env.overlay().querySelector(".es-overview-grid");
  assert.deepEqual(grid.children.map((c) => c.attrs["aria-label"]), ["Profile", "Admin"]);
});

test("pinching out, Escape and the close button each close the overview", () => {
  const env = makeEnv({ path: "/live" });
  const plain = env.target("div", "content");

  env.pinchIn(plain);
  assert.ok(env.overlay().classes.has("show"));
  env.fire("touchstart", { target: env.overlay(), touches: env.touches(env.overlay(), env.overlay(), 80) });
  env.fire("touchmove", { target: env.overlay(), touches: env.touches(env.overlay(), env.overlay(), 200) });
  env.fire("touchend", { touches: [] });
  assert.ok(!env.overlay().classes.has("show"), "pinch out closes");

  env.pinchIn(plain);
  assert.ok(env.overlay().classes.has("show"));
  env.fire("keydown", { key: "Escape" });
  assert.ok(!env.overlay().classes.has("show"), "Escape closes");

  env.pinchIn(plain);
  const close = env.overlay().querySelector(".es-overview-close");
  close.listeners.click[0]({});
  assert.ok(!env.overlay().classes.has("show"), "close button closes");
});

test("tapping a card expands it and navigates to that page", async () => {
  const env = makeEnv({ path: "/chess" });
  env.pinchIn(env.target("div", "content"));
  const grid = env.overlay().querySelector(".es-overview-grid");
  const card = grid.children.find((c) => c.attrs["aria-label"] === "Movies");
  card.href = "https://site.test/movies";
  const click = { target: card, button: 0, preventDefault() { click.prevented = true; } };
  grid.listeners.click[0](click);
  assert.ok(click.prevented);
  assert.ok(card.classes.has("es-expanding"));
  await new Promise((resolve) => setTimeout(resolve, 450));
  assert.deepEqual(env.assigned, ["https://site.test/movies"]);
});
