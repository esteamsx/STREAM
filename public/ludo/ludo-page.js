import {
  COLORS, COLOR_NAMES, START, HOME, SAFE,
  newState, applyRoll, applyMove, legalTokens, chooseToken, rollValue, colorOfTurn, pathOf, passTurn,
} from "/ludo/ludo-engine.js";
import { sound } from "/chess/chess-sound.js";

const GUEST_MATCH = /^\/ludo\/guest\/([A-Za-z0-9_-]{6,40})\/?$/.exec(location.pathname);
const GUEST_TOKEN = GUEST_MATCH ? GUEST_MATCH[1] : null;
const BASE = GUEST_TOKEN ? "/api/ludo/guest" : "/api/ludo";
const STREAM = GUEST_TOKEN ? "/api/ludo/guest/stream" : "/api/chess/stream";
const SAVE_KEY = "lx_savedgame";
const COLOR_HEX = { red: "#FF3B5C", green: "#12C48B", yellow: "#FFC93C", blue: "#3B82FF" };
const COLOR_DARK = { red: "#b81f3d", green: "#0a8a62", yellow: "#c99411", blue: "#2257c9" };
const BOARD_ROTATION = [270, 180, 90, 0];   // turns the board so your colour sits at the bottom left
const BOT_IMG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#04141a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 10v7"/><circle cx="32" cy="8" r="2.4"/><rect x="12" y="17" width="40" height="32" rx="9"/><circle cx="24" cy="31" r="3.4"/><circle cx="40" cy="31" r="3.4"/><path d="M24 41h16"/><path d="M6 31v8M58 31v8"/></svg>');

const LEVELS = [
  { id: "easy", name: "Easy", note: "Plays at random. Good for a relaxed game.", mark: "1" },
  { id: "medium", name: "Medium", note: "Goes for captures and safe squares.", mark: "2" },
  { id: "hard", name: "Hard", note: "Dodges danger and plans its moves.", mark: "3" },
];
const PICKS = [["random", "Random"], ["red", "Red"], ["green", "Green"], ["yellow", "Yellow"], ["blue", "Blue"]];

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function h(tag, attrs, kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const k of Object.keys(attrs)) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  for (const c of [].concat(kids || [])) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}
const html = (tag, cls, markup) => { const el = h(tag, { class: cls }); el.innerHTML = markup; return el; };

function store(key, fallback) { try { const v = localStorage.getItem("lx_" + key); return v == null ? fallback : v; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem("lx_" + key, String(value)); } catch { /* private mode */ } }

const state = {
  tab: "computer",
  level: LEVELS.some((l) => l.id === store("level")) ? store("level") : "medium",
  opponents: [1, 2, 3].includes(Number(store("opps"))) ? Number(store("opps")) : 1,
  color: PICKS.some((p) => p[0] === store("color")) ? store("color") : "random",
  challengeColor: PICKS.some((p) => p[0] === store("ccolor")) ? store("ccolor") : "random",
  gcolor: PICKS.some((p) => p[0] === store("gcolor")) ? store("gcolor") : "random",
  me: null, conn: "connecting", resuming: false,
  players: [], incoming: [], outgoing: [], search: "", offset: 0, loadingPlayers: false,
  game: null, links: null,
  guest: GUEST_TOKEN ? { token: GUEST_TOKEN, info: null, name: store("guestname", "") } : null,
  guestWait: null,
};
const serverNow = () => Date.now() + state.offset;

const ICON = {
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.9.2 5 2.5 5 5.8"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/><circle cx="9" cy="15" r="1" fill="currentColor"/></svg>',
  tick: '<svg viewBox="0 0 24 24" aria-label="Verified"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path d="M8.2 12.3l2.6 2.6 5-5.2" fill="none" stroke="#04141a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
};
const SPEAKER_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const SPEAKER_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';

/* ------------------------------------------------------------------ basics */
let toastTimer = null;
function toast(msg) {
  let t = $("cxToast");
  if (!t) { t = h("div", { id: "cxToast", class: "cx-toast" }); document.body.appendChild(t); }
  t.textContent = msg;
  t.style.display = "none";
  void t.offsetWidth;
  t.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = "none"; }, 2800);
}
function photoSrc(url) {
  if (!url) return null;
  if (GUEST_TOKEN && url.startsWith("/api/chess/avatar/")) return "/api/ludo/guest/avatar/" + encodeURIComponent(GUEST_TOKEN);
  return url;
}
function avatar(p, status) {
  const letter = ((p && (p.name || p.username)) || "?").trim().charAt(0).toUpperCase() || "?";
  const box = h("div", { class: "cx-av" });
  if (p && p.bot) box.appendChild(h("img", { alt: "Computer", class: "bot", src: BOT_IMG }));
  else if (p && p.photo) {
    const img = h("img", { alt: "", referrerpolicy: "no-referrer" });
    img.addEventListener("error", () => { img.remove(); box.insertBefore(document.createTextNode(letter), box.firstChild); });
    img.src = photoSrc(p.photo);
    box.appendChild(img);
  } else box.appendChild(document.createTextNode(letter));
  if (status) box.appendChild(h("i", { class: "st " + status }));
  return box;
}
function modal(content) {
  const ov = h("div", { class: "cx-ov" }, [h("div", { class: "cx-modal", role: "dialog" }, content)]);
  document.body.appendChild(ov);
  return { el: ov, close: () => ov.remove() };
}
function busy(btn, on) { if (!btn) return; btn.classList.toggle("cx-busy", !!on); btn.disabled = !!on; }
async function api(path, body) {
  const opts = body === undefined
    ? { credentials: "same-origin" }
    : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Please try again."), { code: data.code, status: res.status });
  return data;
}
function learnMore(paragraphs) {
  return h("details", { class: "cx-learn mini" }, [h("summary", { text: "Learn more" }), h("div", {}, paragraphs.map((t) => h("p", { text: t })))]);
}
function swatch(color) { return h("i", { class: "lx-sw", style: color === "random" ? "background:conic-gradient(#FF3B5C,#FFC93C,#12C48B,#3B82FF,#FF3B5C)" : "background:" + COLOR_HEX[color] }); }
function chipRow(items, current, set) {
  return h("div", { class: "cx-chips" }, items.map(([id, label]) => h("button", {
    type: "button", class: "cx-chip" + (current === id ? " on" : ""), "data-color": id, onclick: () => set(id),
  }, [swatch(id), label])));
}

/* ------------------------------------------------------------------ board drawing */
const NS = "http://www.w3.org/2000/svg";
const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

const TRACK = [
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0], [7, 0], [8, 0],
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [14, 7], [14, 8],
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14], [7, 14], [6, 14],
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8], [0, 7], [0, 6],
];
const LANE = [
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
];
const YARD = [
  [[1.9, 1.9], [4.1, 1.9], [1.9, 4.1], [4.1, 4.1]],
  [[10.9, 1.9], [13.1, 1.9], [10.9, 4.1], [13.1, 4.1]],
  [[10.9, 10.9], [13.1, 10.9], [10.9, 13.1], [13.1, 13.1]],
  [[1.9, 10.9], [4.1, 10.9], [1.9, 13.1], [4.1, 13.1]],
];
const HOME_SPOT = [[6.7, 7.5], [7.5, 6.7], [8.3, 7.5], [7.5, 8.3]];

function coordOf(color, rel, token) {
  if (rel < 0) return YARD[color][token];
  if (rel <= 50) { const c = TRACK[(START[color] + rel) % 52]; return [c[0] + 0.5, c[1] + 0.5]; }
  if (rel < HOME) { const c = LANE[color][rel - 51]; return [c[0] + 0.5, c[1] + 0.5]; }
  return HOME_SPOT[color];
}

function starPath(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r * 0.45 : r;
    pts.push((cx + Math.cos(ang) * rad).toFixed(3) + "," + (cy + Math.sin(ang) * rad).toFixed(3));
  }
  return pts.join(" ");
}

function buildBoardSvg() {
  const svg = svgEl("svg", { viewBox: "0 0 15 15", class: "lx-svg", role: "img", "aria-label": "Ludo board" });
  const defs = svgEl("defs", {});
  for (const c of COLORS) {
    const g = svgEl("radialGradient", { id: "lxg-" + c, cx: "35%", cy: "30%", r: "75%" });
    g.appendChild(svgEl("stop", { offset: "0", "stop-color": "#fff", "stop-opacity": ".85" }));
    g.appendChild(svgEl("stop", { offset: ".35", "stop-color": COLOR_HEX[c] }));
    g.appendChild(svgEl("stop", { offset: "1", "stop-color": COLOR_DARK[c] }));
    defs.appendChild(g);
  }
  svg.appendChild(defs);
  svg.appendChild(svgEl("rect", { x: 0, y: 0, width: 15, height: 15, rx: 0.9, class: "lx-bg" }));
  const quads = [[0, 0], [9, 0], [9, 9], [0, 9]];
  COLORS.forEach((c, i) => {
    const [qx, qy] = quads[i];
    svg.appendChild(svgEl("rect", { x: qx + 0.12, y: qy + 0.12, width: 5.76, height: 5.76, rx: 0.7, fill: COLOR_HEX[c], class: "lx-quad" }));
    svg.appendChild(svgEl("rect", { x: qx + 1, y: qy + 1, width: 4, height: 4, rx: 0.6, class: "lx-yard" }));
    for (const [x, y] of YARD[i]) svg.appendChild(svgEl("circle", { cx: x, cy: y, r: 0.55, fill: COLOR_HEX[c], opacity: ".28" }));
  });
  const cell = (x, y, fill) => svg.appendChild(svgEl("rect", { x: x + 0.03, y: y + 0.03, width: 0.94, height: 0.94, rx: 0.12, class: "lx-cell", style: fill ? "fill:" + fill : "" }));
  TRACK.forEach(([x, y], idx) => {
    const si = START.indexOf(idx);
    cell(x, y, si >= 0 ? COLOR_HEX[COLORS[si]] : "");
  });
  LANE.forEach((cells, i) => cells.forEach(([x, y]) => cell(x, y, COLOR_HEX[COLORS[i]])));
  for (const idx of SAFE) {
    if (START.includes(idx)) continue;
    const [x, y] = TRACK[idx];
    svg.appendChild(svgEl("polygon", { points: starPath(x + 0.5, y + 0.5, 0.34), class: "lx-star" }));
  }
  START.forEach((idx) => {
    const [x, y] = TRACK[idx];
    svg.appendChild(svgEl("polygon", { points: starPath(x + 0.5, y + 0.5, 0.26), class: "lx-star lx-star-w" }));
  });
  const tri = (pts, c) => svg.appendChild(svgEl("polygon", { points: pts, fill: COLOR_HEX[c], class: "lx-tri" }));
  tri("6,6 7.5,7.5 6,9", "red");
  tri("6,6 9,6 7.5,7.5", "green");
  tri("9,6 9,9 7.5,7.5", "yellow");
  tri("6,9 9,9 7.5,7.5", "blue");
  svg.appendChild(svgEl("g", { id: "lxTokens" }));
  return svg;
}

/* ------------------------------------------------------------------ the game object */
const snap = (s) => ({ seats: [...s.seats], tokens: s.tokens.map((t) => (t ? [...t] : null)), turn: colorOfTurn(s), roll: s.roll, sixes: s.sixes, winner: s.winner, lastMove: s.lastMove ? { ...s.lastMove } : null });
const asState = (v) => ({ seats: v.seats, tokens: v.tokens, turn: v.seats.indexOf(v.turn), roll: v.roll, sixes: v.sixes || 0, winner: v.winner, lastMove: v.lastMove });

function botProfile(i) { return { bot: true, name: i ? "Computer " + (i + 1) : "Computer", username: "computer" }; }

function startBotGame() {
  const you = state.color === "random" ? Math.floor(Math.random() * 4) : COLORS.indexOf(state.color);
  const others = [(you + 2) % 4, (you + 1) % 4, (you + 3) % 4].slice(0, state.opponents);
  const seats = [you, ...others].sort((a, b) => a - b);
  const eng = newState(seats);
  const players = seats.map((c) => (c === you ? { color: c, ...(state.me || {}), name: (state.me && (state.me.name || state.me.username)) || "You", you: true } : { color: c, ...botProfile(others.indexOf(c)) }));
  const g = newGame({ mode: "bot", you, players, eng, level: state.level });
  beginGame(g);
}

function newGame(o) {
  return {
    mode: o.mode, id: o.id || null, key: o.key || null, you: o.you, players: o.players, eng: o.eng || null, level: o.level || "medium",
    view: o.view, deadline: o.deadline || 0, seq: o.seq || 0, over: false, result: null, queue: [], playing: false, rolling: false,
    shown: null, log: [], opponentOnline: true, token: 0,
  };
}

function beginGame(g, opts = {}) {
  state.game = g;
  if (!g.view) g.view = snap(g.eng);
  $("cxMenu").hidden = true;
  if ($("cxGuest")) $("cxGuest").hidden = true;
  $("cxGame").hidden = false;
  const back = $("cxBack");
  if (back && !GUEST_TOKEN) back.setAttribute("href", "/");
  buildGameUi();
  paintAll();
  renderBanner();
  if (g.mode === "bot") { saveGame(); botStep(); }
  else if (!opts.resume) toast("Game started. You are " + COLOR_NAMES[COLORS[g.you]] + ".");
}

function buildGameUi() {
  const g = state.game;
  $("cxBoard").textContent = "";
  const svg = buildBoardSvg();
  $("cxBoard").appendChild(svg);
  $("cxBoard").style.transform = "rotate(" + BOARD_ROTATION[g.you] + "deg)";
  g.tokenEls = {};
  const layer = svg.querySelector("#lxTokens");
  for (const c of g.view.seats) {
    for (let t = 0; t < 4; t++) {
      const el = svgEl("g", { class: "lx-token", "data-c": c, "data-t": t });
      el.style.setProperty("--tc", COLOR_HEX[COLORS[c]]);
      el.appendChild(svgEl("circle", { r: 0.42, class: "lx-tshadow", cx: 0.04, cy: 0.07 }));
      el.appendChild(svgEl("circle", { r: 0.4, fill: "url(#lxg-" + COLORS[c] + ")", class: "lx-tbody" }));
      el.appendChild(svgEl("circle", { r: 0.17, class: "lx-tdot" }));
      el.appendChild(svgEl("circle", { r: 0.52, class: "lx-tring" }));
      el.addEventListener("click", () => onTokenClick(c, t));
      layer.appendChild(el);
      g.tokenEls[c + ":" + t] = el;
    }
  }
}

/* where each token sits right now; tokens sharing a square are nudged apart */
function layoutTokens(view, animateKeys) {
  const g = state.game;
  const spots = new Map();
  for (const c of view.seats) for (let t = 0; t < 4; t++) {
    const p = view.tokens[c][t];
    const [x, y] = coordOf(c, p, t);
    const key = p >= 0 ? x + "," + y : null;
    if (key) { if (!spots.has(key)) spots.set(key, []); spots.get(key).push(c + ":" + t); }
  }
  for (const c of view.seats) for (let t = 0; t < 4; t++) {
    const id = c + ":" + t;
    if (animateKeys && animateKeys.has(id)) continue;
    const p = view.tokens[c][t];
    let [x, y] = coordOf(c, p, t);
    let scale = 1;
    if (p >= 0) {
      const group = spots.get(x + "," + y);
      if (group.length > 1) {
        const i = group.indexOf(id);
        const a = (i / group.length) * Math.PI * 2 - Math.PI / 2;
        x += Math.cos(a) * 0.2; y += Math.sin(a) * 0.2; scale = 0.74;
      }
    }
    place(g.tokenEls[id], x, y, scale);
  }
}
function place(el, x, y, scale = 1) {
  if (!el) return;
  el.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
}

/* ------------------------------------------------------------------ painting */
function isMyTurn(g) {
  return g && !g.over && g.view.winner == null && g.view.turn === g.you && !g.playing && !g.queue.length;
}

function movable(g) {
  if (!isMyTurn(g) || !g.view.roll) return [];
  return legalTokens(asState(g.view));
}

function paintAll() {
  const g = state.game;
  if (!g) return;
  layoutTokens(g.view);
  paintTokens();
  paintPlayers();
  paintDice();
  paintStatus();
  paintControls();
  paintLog();
}

function paintTokens() {
  const g = state.game;
  const can = new Set(movable(g));
  for (const k in g.tokenEls) {
    const [c, t] = k.split(":").map(Number);
    g.tokenEls[k].classList.toggle("can", c === g.you && can.has(t));
  }
  $("cxBoard").classList.toggle("lx-pick", can.size > 0);
}

function playerLabel(g, p) {
  if (p.bot) return p.name;
  if (g.mode === "bot") return (p.name || "You");
  return p.color === g.you ? "You" : (p.name || p.username || "Player");
}

function paintPlayers() {
  const g = state.game;
  const box = $("cxTop");
  box.textContent = "";
  box.className = "lx-players";
  const turn = g.view.turn;
  const order = [...g.players].sort((a, b) => ((a.color - g.you + 4) % 4) - ((b.color - g.you + 4) % 4));
  for (const p of order) {
    const cname = COLORS[p.color];
    const mine = p.color === g.you;
    const live = g.view.winner == null && !g.over && turn === p.color;
    const home = g.view.tokens[p.color].filter((x) => x === HOME).length;
    box.appendChild(h("div", { class: "lx-pl" + (live ? " live" : "") + (mine ? " me" : ""), "data-color": cname, style: "--pc:" + COLOR_HEX[cname] }, [
      avatar(p, g.mode === "online" && !mine && !p.bot ? (p.online === false || !g.opponentOnline ? "offline" : "available") : null),
      h("div", { class: "lx-pin" }, [
        h("b", { text: playerLabel(g, p) }),
        h("span", { text: COLOR_NAMES[cname] + " | " + home + "/4 home" }),
      ]),
      h("div", { class: "lx-pt", "data-timer": p.color }),
    ]));
  }
  tickTimer();
}

function tickTimer() {
  const g = state.game;
  if (!g || g.mode === "bot") return;
  document.querySelectorAll("[data-timer]").forEach((el) => {
    const c = Number(el.getAttribute("data-timer"));
    const live = !g.over && g.view.winner == null && g.view.turn === c && !g.playing;
    el.textContent = live && g.deadline ? Math.max(0, Math.ceil((g.deadline - serverNow()) / 1000)) + "s" : "";
    el.classList.toggle("low", live && g.deadline - serverNow() < 8000);
  });
}
setInterval(tickTimer, 500);

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function diceFace(v) {
  const d = h("div", { class: "lx-face", "data-v": v });
  for (let i = 0; i < 9; i++) d.appendChild(h("i", { class: PIPS[v] && PIPS[v].includes(i) ? "on" : "" }));
  return d;
}

function paintDice() {
  const g = state.game;
  const wrap = $("lxDiceWrap");
  if (!wrap) return;
  const turnColor = COLORS[g.view.turn];
  const mine = g.view.turn === g.you;
  const canRoll = isMyTurn(g) && !g.view.roll && !g.rolling;
  let dice = $("lxDice");
  if (!dice) {
    dice = h("button", { type: "button", id: "lxDice", class: "lx-dice", "aria-label": "Roll the dice", onclick: onRoll });
    wrap.appendChild(dice);
  }
  dice.style.setProperty("--dc", COLOR_HEX[turnColor]);
  dice.classList.toggle("ready", canRoll);
  dice.classList.toggle("waiting", !mine && !g.over);
  dice.disabled = !canRoll;
  if (!g.rolling) {
    const v = g.view.roll || g.shown || 0;
    dice.textContent = "";
    if (v) dice.appendChild(diceFace(v)); else dice.appendChild(html("span", "lx-dice-ico", ICON.dice));
  }
}

function paintStatus() {
  const g = state.game;
  const st = $("cxStatus");
  if (!st) return;
  let text = "";
  const turnColor = COLORS[g.view.turn];
  if (g.over || g.view.winner != null) {
    const w = g.result ? g.result.winner : g.view.winner;
    text = w === g.you ? "You won!" : COLOR_NAMES[COLORS[w]] + " won the game.";
  } else if (g.view.turn === g.you) {
    text = g.view.roll ? (movable(g).length ? "Tap a glowing token to move " + g.view.roll : "Moving...") : "Your turn. Roll the dice.";
  } else {
    const p = g.players.find((x) => x.color === g.view.turn);
    text = (p ? playerLabel(g, p) : COLOR_NAMES[turnColor]) + (g.mode === "bot" ? " is playing..." : g.view.roll ? " is choosing..." : " is rolling...");
  }
  st.textContent = text;
  st.style.setProperty("--sc", COLOR_HEX[turnColor]);
  const note = $("cxNote");
  if (note) {
    const off = g.mode === "online" && !g.opponentOnline && !g.over;
    note.hidden = !off;
    note.textContent = off ? "Your opponent is offline. The game continues and they forfeit if they stay away." : "";
  }
}

function addLog(text) {
  const g = state.game;
  if (!g) return;
  g.log.unshift(text);
  g.log = g.log.slice(0, 6);
  paintLog();
}
function paintLog() {
  const g = state.game;
  const box = $("cxMoves");
  if (!box || !g) return;
  box.textContent = "";
  for (const l of g.log) box.appendChild(h("div", { class: "lx-log", text: l }));
}

function paintControls() {
  const g = state.game;
  const box = $("cxControls");
  box.textContent = "";
  if (g.over) {
    box.appendChild(h("button", { type: "button", class: "cx-btn", id: "lxAgain", onclick: () => (g.mode === "bot" ? startBotGame() : leaveGame()) }, [g.mode === "bot" ? "Play again" : "Back to menu"]));
    box.appendChild(h("button", { type: "button", class: "cx-btn ghost", id: "lxMenuBtn", onclick: leaveGame }, ["Menu"]));
    return;
  }
  box.appendChild(h("button", { type: "button", class: "cx-btn ghost", id: "lxResign", onclick: onResign }, [g.mode === "bot" ? "Quit game" : "Resign"]));
}

function leaveGame() {
  const g = state.game;
  if (g && g.mode === "bot") { g.token++; clearSaved(); }
  state.game = null;
  $("cxGame").hidden = true;
  if (GUEST_TOKEN) { showGuestEnded(); return; }
  $("cxMenu").hidden = false;
  renderMenu();
  renderBanner();
}

async function onResign() {
  const g = state.game;
  if (!g || g.over) return;
  if (!window.confirm(g.mode === "bot" ? "Quit this game?" : "Resign this game? Your opponent will win.")) return;
  if (g.mode === "bot") { g.token++; clearSaved(); leaveGame(); return; }
  try { await api(BASE + "/game/" + encodeURIComponent(g.id) + "/resign", { key: g.key }); } catch (e) { toast(e.message); }
}

/* ------------------------------------------------------------------ dice, moves, animation */
async function animateDice(value, color) {
  const g = state.game;
  const dice = $("lxDice");
  if (!dice) return;
  g.rolling = true;
  dice.style.setProperty("--dc", COLOR_HEX[COLORS[color]]);
  dice.classList.add("rolling");
  dice.disabled = true;
  const end = Date.now() + 650;
  sound.unlock && sound.unlock();
  let tick = 0;
  while (Date.now() < end) {
    dice.textContent = "";
    dice.appendChild(diceFace(1 + Math.floor(Math.random() * 6)));
    if (tick++ % 2 === 0) tap();
    await sleep(75);
  }
  dice.classList.remove("rolling");
  dice.textContent = "";
  dice.appendChild(diceFace(value));
  g.shown = value;
  g.rolling = false;
  tap();
}

function tap() {
  try { sound.move(); } catch { /* sound is optional */ }
}

async function animateMove(mv) {
  const g = state.game;
  const c = mv.color;
  const el = g.tokenEls[c + ":" + mv.token];
  if (!el) return;
  const moving = new Set([c + ":" + mv.token]);
  for (const cap of mv.captured) moving.add(cap.color + ":" + cap.token);
  el.classList.add("moving");
  const path = pathOf(mv.from, mv.to);
  for (let i = 0; i < path.length; i++) {
    const [x, y] = coordOf(c, path[i], mv.token);
    el.style.transition = i === 0 ? "none" : "transform .13s linear";
    place(el, x, y, 1.12);
    if (i > 0) { tap(); await sleep(135); }
  }
  el.style.transition = "";
  el.classList.remove("moving");
  if (mv.captured.length) {
    for (const cap of mv.captured) {
      const ce = g.tokenEls[cap.color + ":" + cap.token];
      if (!ce) continue;
      ce.style.transition = "transform .5s cubic-bezier(.5,0,.2,1)";
      const [x, y] = YARD[cap.color][cap.token];
      place(ce, x, y, 1);
    }
    try { sound.capture(); } catch { /* optional */ }
    await sleep(520);
    for (const cap of mv.captured) { const ce = g.tokenEls[cap.color + ":" + cap.token]; if (ce) ce.style.transition = ""; }
  }
  if (mv.finished) { try { sound.ping(); } catch { /* optional */ } }
}

/* every roll and move goes through here, so both players see the same thing in the same order */
function present(payload) {
  const g = state.game;
  if (!g) return;
  g.queue.push(payload);
  if (!g.playing) drain();
}

async function drain() {
  const g = state.game;
  if (!g || g.playing) return;
  g.playing = true;
  const myToken = g.token;
  try {
    while (g.queue.length) {
      const p = g.queue.shift();
      const ev = p.event || {};
      if (ev.type === "roll") {
        paintTokens();
        const rollColor = ev.color;
        await animateDice(ev.value, rollColor);
        const who = playerName(g, rollColor);
        if (ev.skipped === "three_sixes") addLog(who + " rolled a third 6 and loses the turn");
        else if (ev.skipped === "no_move") addLog(who + " rolled " + ev.value + " with no move");
        else addLog(who + " rolled " + ev.value);
        if (ev.skipped) await sleep(650);
      } else if (ev.type === "move") {
        const mv = ev.move;
        await animateMove(mv);
        const who = playerName(g, mv.color);
        addLog(mv.captured.length ? who + " captured " + mv.captured.map((x) => COLOR_NAMES[COLORS[x.color]]).join(" and ") + "!" : mv.finished ? who + " got a token home" : who + " moved " + mv.roll);
      }
      if (g.token !== myToken) return;
      g.view = p.view;
      g.shown = ev.type === "roll" ? g.shown : null;
      if (p.deadline !== undefined) g.deadline = p.deadline;
      layoutTokens(g.view);
      paintAll();
    }
  } finally {
    g.playing = false;
  }
  if (g.token !== myToken) return;
  paintAll();
  if (g.mode === "bot") botStep();
  if (g.pendingOver) { const o = g.pendingOver; g.pendingOver = null; finishGame(o.winner, o.reason); }
}

function playerName(g, color) {
  const p = g.players.find((x) => x.color === color);
  return p ? playerLabel(g, p) : COLOR_NAMES[COLORS[color]];
}

async function onRoll() {
  const g = state.game;
  if (!g || !isMyTurn(g) || g.view.roll || g.rolling) return;
  if (g.mode === "bot") { localRoll(); return; }
  g.rolling = true;
  const dice = $("lxDice");
  if (dice) { dice.classList.add("rolling"); dice.disabled = true; }
  try {
    await api(BASE + "/game/" + encodeURIComponent(g.id) + "/roll", { key: g.key });
    setTimeout(() => { if (state.game === g && g.rolling && !g.playing && !g.queue.length) { g.rolling = false; resync(); } }, 6000);
  } catch (e) {
    g.rolling = false;
    if (dice) dice.classList.remove("rolling");
    toast(e.message);
    resync();
  }
}

async function onTokenClick(color, token) {
  const g = state.game;
  if (!g || color !== g.you || !movable(g).includes(token)) return;
  if (g.mode === "bot") { localMove(token); return; }
  g.view = { ...g.view, roll: g.view.roll };   // keep the picture steady until the server answers
  g.playing = true;
  try {
    await api(BASE + "/game/" + encodeURIComponent(g.id) + "/move", { key: g.key, token });
  } catch (e) { toast(e.message); resync(); }
  g.playing = false;
  if (g.queue.length) drain();
}

/* ------------------------------------------------------------------ computer games */
function localRoll() {
  const g = state.game;
  const s = g.eng;
  const color = colorOfTurn(s);
  const res = applyRoll(s, rollValue());
  present({ event: { type: "roll", color, value: res.value, skipped: res.skipped }, view: snap(s) });
  afterLocal(g);
}
function localMove(token) {
  const g = state.game;
  const s = g.eng;
  const mv = applyMove(s, token);
  if (!mv) return;
  present({ event: { type: "move", move: mv }, view: snap(s) });
  if (s.winner != null) g.pendingOver = { winner: s.winner, reason: "home" };
  afterLocal(g);
}
function afterLocal(g) { saveGame(); }

async function botStep() {
  const g = state.game;
  if (!g || g.mode !== "bot" || g.over || g.botBusy || g.playing || g.queue.length) return;
  const s = g.eng;
  if (s.winner != null) return;
  const color = colorOfTurn(s);
  if (color === g.you) {
    if (s.roll) {
      const legal = legalTokens(s);
      if (legal.length === 1) { g.botBusy = true; const tk = g.token; await sleep(450); g.botBusy = false; if (state.game === g && g.token === tk && !g.over) localMove(legal[0]); }
    }
    return;
  }
  g.botBusy = true;
  const tk = g.token;
  await sleep(s.roll ? 650 : 750);
  g.botBusy = false;
  if (state.game !== g || g.token !== tk || g.over) return;
  if (!s.roll) localRoll();
  else localMove(chooseToken(s, g.level));
}

function saveGame() {
  const g = state.game;
  if (!g || g.mode !== "bot" || g.over) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ you: g.you, players: g.players.map((p) => ({ color: p.color, bot: !!p.bot, name: p.name, you: !!p.you })), eng: g.eng, level: g.level }));
  } catch { /* private mode */ }
}
function clearSaved() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
function restoreBotGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || !d.eng || d.eng.winner != null || !Array.isArray(d.eng.seats)) return false;
    const players = d.players.map((p) => (p.bot ? { color: p.color, ...botProfile(d.players.filter((x) => x.bot).findIndex((x) => x.color === p.color)) } : { color: p.color, ...(state.me || {}), name: p.name || "You", you: true }));
    beginGame(newGame({ mode: "bot", you: d.you, players, eng: d.eng, level: d.level || "medium" }), { resume: true });
    return true;
  } catch { return false; }
}

/* ------------------------------------------------------------------ result */
function finishGame(winner, reason, view) {
  const g = state.game;
  if (!g || g.over) return;
  g.over = true;
  g.result = { winner, reason };
  try { if (winner === g.you) sound.win(); } catch { /* optional */ }
  if (view) g.view = view;
  if (g.mode === "bot") clearSaved();
  paintAll();
  const won = winner === g.you;
  const w = g.players.find((p) => p.color === winner);
  const why = reason === "resigned" ? (won ? "Your opponent resigned." : "You resigned.") : reason === "left" ? (won ? "Your opponent left the game." : "You were away for too long.") : reason === "timeout" ? (won ? "Your opponent ran out of time." : "You missed too many turns.") : won ? "All four of your tokens are home." : "All four of their tokens reached home.";
  const kids = [
    h("h2", { text: won ? "You won!" : (w ? playerLabel(g, w) : COLOR_NAMES[COLORS[winner]]) + " won" }),
    h("p", { class: "cx-hint", style: "margin-top:8px", text: why }),
  ];
  const row = h("div", { class: "row" });
  const m = modal(kids);
  if (g.mode === "bot") {
    row.appendChild(h("button", { type: "button", class: "cx-btn ghost", onclick: () => { m.close(); leaveGame(); } }, ["Menu"]));
    row.appendChild(h("button", { type: "button", class: "cx-btn", id: "lxPlayAgain", onclick: () => { m.close(); startBotGame(); } }, ["Play again"]));
  } else {
    const opp = g.players.find((p) => p.color !== g.you);
    row.appendChild(h("button", { type: "button", class: "cx-btn ghost", onclick: () => { m.close(); leaveGame(); } }, [GUEST_TOKEN ? "Close" : "Menu"]));
    if (!GUEST_TOKEN && opp && !opp.guest && state.conn === "online") {
      row.appendChild(h("button", { type: "button", class: "cx-btn", id: "lxRematch", onclick: async (e) => {
        const btn = e.currentTarget; busy(btn, true);
        try { await api("/api/ludo/challenge", { toUid: opp.uid, color: "random" }); toast("Rematch request sent."); m.close(); leaveGame(); } catch (err) { busy(btn, false); toast(err.message); }
      } }, ["Rematch"]));
    }
  }
  kids.push(row);
  m.el.querySelector(".cx-modal").appendChild(row);
}

/* ------------------------------------------------------------------ online */
let es = null, retries = 0, retryTimer = null;

function setConn(c) {
  state.conn = c;
  const el = $("cxConn");
  if (el) el.className = "cx-conn " + c;
  const tx = $("cxConnText");
  if (tx) tx.textContent = c === "online" ? "Online" : c === "connecting" ? "Connecting" : c === "unavailable" ? "Unavailable" : "Reconnecting";
  if (GUEST_TOKEN) renderGuest(); else renderLobby();
}

function connect() {
  clearTimeout(retryTimer);
  if (es) { es.close(); es = null; }
  setConn("connecting");
  es = new EventSource(STREAM);
  const on = (name, fn) => es.addEventListener(name, (e) => { let d = null; try { d = JSON.parse(e.data); } catch { return; } fn(d); });
  on("ping", () => {});
  on("hello", (d) => { retries = 0; state.me = d.me || state.me; state.resuming = false; setConn("online"); if (state.game && state.game.mode === "bot") paintPlayers(); });
  on("ludo_hello", (d) => {
    state.offset = (d.serverTime || Date.now()) - Date.now();
    state.incoming = d.incoming || [];
    state.outgoing = d.outgoing || [];
    state.resuming = false;
    state.guestWait = null;
    if (d.game && d.game.status === "active") startOnlineGame(d.game, { resume: true });
    else if (state.game && state.game.mode === "online" && !state.game.over) resync();
    renderLobby(); renderBanner();
  });
  on("ludo_challenge", (c) => { state.incoming = state.incoming.filter((x) => x.id !== c.id).concat(c); try { sound.ping(); } catch { /* optional */ } renderLobby(); renderBanner(); });
  on("ludo_challenge_sent", (c) => { state.outgoing = state.outgoing.filter((x) => x.id !== c.id).concat(c); renderLobby(); });
  on("ludo_challenge_update", (u) => {
    const was = state.outgoing.find((x) => x.id === u.id);
    state.incoming = state.incoming.filter((x) => x.id !== u.id);
    state.outgoing = state.outgoing.filter((x) => x.id !== u.id);
    if (was && u.status === "declined") toast((was.to.name || was.to.username) + " declined your request.");
    if (was && u.status === "expired") toast("Your request to " + (was.to.name || was.to.username) + " expired.");
    renderLobby(); renderBanner();
  });
  on("ludo_game_start", (v) => startOnlineGame(v, {}));
  on("ludo_state", (v) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== v.gameId) return;
    if (v.seq <= g.seq) return;
    g.seq = v.seq;
    state.offset = (v.serverTime || Date.now()) - Date.now();
    present({ event: v.event, view: viewOf(v), deadline: v.deadline });
  });
  on("ludo_over", (v) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== v.gameId) return;
    if (g.playing || g.queue.length) g.pendingOver = { winner: v.result.winner, reason: v.result.reason };
    else finishGame(v.result.winner, v.result.reason, viewOf(v));
  });
  on("ludo_opponent", (d) => { const g = state.game; if (g && g.id === d.gameId) { g.opponentOnline = !!d.online; paintStatus(); paintPlayers(); } });
  on("ludo_guest_wait", (d) => { state.guestWait = d.message; renderGuest(); });
  es.onerror = () => {
    if (!es) return;
    if (es.readyState === EventSource.CLOSED) {
      es = null;
      if (++retries > 6) { setConn("unavailable"); return; }
      setConn("reconnecting");
      retryTimer = setTimeout(connect, Math.min(15000, 1500 * retries));
    } else setConn("reconnecting");
  };
}

const viewOf = (v) => ({ seats: v.state.seats, tokens: v.state.tokens, turn: v.state.turn, roll: v.state.roll, sixes: v.state.sixes, winner: v.state.winner, lastMove: v.state.lastMove });

function startOnlineGame(v, opts) {
  const old = state.game;
  if (old && old.mode === "online" && old.id === v.id) {
    if (opts.resume) { old.view = viewOf(v); old.deadline = v.deadline; old.seq = Math.max(old.seq, v.seq); old.queue = []; old.rolling = false; paintAll(); }
    return;
  }
  if (old && old.mode === "bot") { old.token++; clearSaved(); }
  const g = newGame({ mode: "online", id: v.id, key: v.key, you: v.you, players: v.players, view: viewOf(v), deadline: v.deadline, seq: v.seq });
  g.opponentOnline = v.players.filter((p) => p.color !== v.you).every((p) => p.online !== false);
  beginGame(g, opts);
  if (v.result) finishGame(v.result.winner, v.result.reason, viewOf(v));
}

async function resync() {
  const g = state.game;
  if (!g || g.mode !== "online" || g.over) return;
  try {
    const d = await api(BASE + "/game/" + encodeURIComponent(g.id) + "/state", { key: g.key });
    const v = d.game;
    if (v.status !== "active") { finishGame(v.result.winner, v.result.reason, viewOf(v)); return; }
    g.view = viewOf(v); g.deadline = v.deadline; g.seq = v.seq; g.queue = []; g.rolling = false; g.playing = false;
    paintAll();
  } catch (e) { if (e.code === "no_game" || e.code === "bad_key") { state.game = null; leaveGameUi(); } }
}
function leaveGameUi() { $("cxGame").hidden = true; if (GUEST_TOKEN) showGuestEnded(); else { $("cxMenu").hidden = false; renderMenu(); } }

/* ------------------------------------------------------------------ lobby (same layout as chess) */
function renderMenu() {
  const root = $("cxMenu");
  root.textContent = "";
  if (state.resuming) { root.appendChild(h("div", { class: "cx-card" }, [h("div", { class: "cx-loading", id: "cxResuming" }, [h("span", { class: "cx-roll" }), "Getting your game back"])])); return; }
  const pending = state.incoming.length;
  root.appendChild(h("div", { class: "cx-hero" }, [h("h1", { text: "Ludo" }), h("p", { text: "Race your tokens home. Play the computer, or challenge someone who is online." })]));
  root.appendChild(h("div", { class: "cx-tabs" }, [
    h("button", { class: "cx-tab" + (state.tab === "computer" ? " on" : ""), id: "tabComputer", type: "button", onclick: () => { state.tab = "computer"; renderMenu(); } }, [html("span", "", ICON.cpu).firstChild, "Computer"]),
    h("button", { class: "cx-tab" + (state.tab === "online" ? " on" : ""), id: "tabOnline", type: "button", onclick: () => { state.tab = "online"; renderMenu(); loadPlayers(); loadLinks(); } }, [html("span", "", ICON.users).firstChild, "Online", pending ? h("span", { class: "badge", text: String(pending) }) : null]),
  ]));
  const card = h("div", { class: "cx-card", id: "cxPanel" });
  root.appendChild(card);
  if (state.tab === "computer") renderComputerPanel(card); else renderOnlinePanel(card);
}

function renderComputerPanel(card) {
  card.appendChild(h("div", { class: "cx-h", text: "Difficulty" }));
  card.appendChild(h("div", { class: "cx-levels" }, LEVELS.map((l) => h("button", {
    type: "button", class: "cx-level" + (state.level === l.id ? " on" : ""), "data-level": l.id,
    onclick: () => { state.level = l.id; save("level", l.id); renderMenu(); },
  }, [h("div", { class: "lv " + l.id, text: l.mark }), h("div", {}, [h("b", { text: l.name }), h("span", { text: l.note })])]))));
  card.appendChild(h("div", { class: "cx-h", text: "Computer players" }));
  card.appendChild(h("div", { class: "cx-chips" }, [[1, "1 player"], [2, "2 players"], [3, "3 players"]].map(([n, label]) => h("button", {
    type: "button", class: "cx-chip" + (state.opponents === n ? " on" : ""), "data-opps": n, onclick: () => { state.opponents = n; save("opps", n); renderMenu(); },
  }, [label]))));
  card.appendChild(h("div", { class: "cx-h", text: "You play as" }));
  card.appendChild(chipRow(PICKS, state.color, (id) => { state.color = id; save("color", id); renderMenu(); }));
  card.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxStartBot", onclick: (e) => { busy(e.currentTarget, true); setTimeout(startBotGame, 180); } }, ["Start game"]));
}

function renderOnlinePanel(card) {
  if (state.conn !== "online") {
    card.appendChild(h("div", { class: "cx-empty", id: "cxOffline", text: state.conn === "unavailable" ? "Online play is not available right now. You can still play the computer." : "" }, state.conn === "unavailable" ? [] : [h("span", { class: "cx-roll" }), " Connecting to online play"]));
    return;
  }
  if (state.incoming.length) {
    card.appendChild(h("div", { class: "cx-h", text: "Requests for you" }));
    for (const r of state.incoming) card.appendChild(requestRow(r));
  }
  if (state.outgoing.length) {
    card.appendChild(h("div", { class: "cx-h", text: "Waiting for an answer" }));
    for (const o of state.outgoing) {
      card.appendChild(h("div", { class: "cx-wait", "data-out": o.id }, [avatar(o.to), h("div", { class: "grow" }, [h("b", { text: o.to.name || o.to.username }), h("div", { class: "cx-sub", text: "Ludo | waiting..." })]),
        h("button", { type: "button", class: "cx-btn ghost sm", onclick: () => api("/api/ludo/challenge/" + encodeURIComponent(o.id) + "/cancel", {}).catch((e) => toast(e.message)) }, ["Cancel"])]));
    }
  }
  card.appendChild(h("div", { class: "cx-h" }, [h("span", { class: "cx-live", text: "Players online" })]));
  const input = h("input", { class: "cx-search", id: "cxSearch", type: "search", placeholder: "Search by name or username", autocomplete: "off", value: state.search });
  let t = null;
  input.addEventListener("input", () => { state.search = input.value; state.players = []; state.loadingPlayers = true; paintLobbyPlayers(); clearTimeout(t); t = setTimeout(loadPlayers, 280); });
  const wrap = h("div", { class: "cx-searchwrap" });
  wrap.insertAdjacentHTML("beforeend", ICON.search);
  wrap.appendChild(input);
  card.appendChild(wrap);
  card.appendChild(h("div", { class: "cx-players", id: "cxPlayers" }));
  paintLobbyPlayers();
  card.appendChild(guestBox());
}

async function loadPlayers() {
  if (state.conn !== "online") return;
  state.loadingPlayers = true;
  paintLobbyPlayers();
  try { const d = await api("/api/ludo/online?q=" + encodeURIComponent(state.search.trim())); state.players = d.players || []; } catch { /* the list just stays as it was */ }
  state.loadingPlayers = false;
  paintLobbyPlayers();
}

function playerName2(p) {
  const b = h("b", {}, [h("span", { text: p.name || p.username, style: "overflow:hidden;text-overflow:ellipsis" })]);
  if (p.verified) b.insertAdjacentHTML("beforeend", ICON.tick);
  return b;
}

function paintLobbyPlayers() {
  const box = $("cxPlayers");
  if (!box) return;
  box.textContent = "";
  if (state.loadingPlayers && !state.players.length) {
    if (state.search.trim()) box.appendChild(h("div", { class: "cx-loading" }, [h("span", { class: "cx-dots" }, [h("span"), h("span"), h("span")]), "Searching"]));
    else for (let i = 0; i < 3; i++) box.appendChild(h("div", { class: "cx-sk" }, [h("i"), h("div", { class: "l" }, [h("b"), h("b")])]));
    return;
  }
  if (!state.players.length) { box.appendChild(h("div", { class: "cx-empty", text: "No player at the moment" })); return; }
  for (const p of state.players) {
    const waiting = state.outgoing.some((o) => o.to.uid === p.uid);
    const can = p.status === "available" && !waiting;
    const label = p.status === "offline" ? "Offline" : p.status === "playing" ? "In a game" : "Online";
    box.appendChild(h("div", { class: "cx-player", "data-uid": p.uid }, [avatar(p, p.status), h("div", { class: "cx-pinfo" }, [playerName2(p), h("span", { text: "@" + p.username + " | " + label })]),
      h("button", { type: "button", class: "cx-btn pill", "data-challenge": p.uid, disabled: can ? null : true, onclick: () => openChallengeSheet(p) }, [waiting ? "Sent" : "Challenge"])]));
  }
}

function openChallengeSheet(p) {
  let color = state.challengeColor;
  const colorRow = h("div", { style: "display:flex;justify-content:center;margin-top:12px" });
  const paint = () => { colorRow.textContent = ""; colorRow.appendChild(chipRow(PICKS, color, (id) => { color = id; paint(); })); };
  paint();
  const m = modal([
    h("h2", { text: "Challenge " + (p.name || p.username) }),
    colorRow,
    learnMore([
      "They will see your request and can accept or decline.",
      "Online games are for two players. You sit opposite each other.",
      "Roll within 30 seconds and move within 25 seconds. Miss three turns in a row and you forfeit.",
    ]),
    h("div", { class: "row" }, [
      h("button", { type: "button", class: "cx-btn ghost", onclick: () => m.close() }, ["Cancel"]),
      h("button", { type: "button", class: "cx-btn", id: "cxSend", onclick: async (e) => {
        const btn = e.currentTarget; busy(btn, true);
        try {
          await api("/api/ludo/challenge", { toUid: p.uid, color });
          state.challengeColor = color; save("ccolor", color);
          m.close();
          toast("Request sent to " + (p.name || p.username) + ".");
        } catch (err) { busy(btn, false); toast(err.message); }
      } }, ["Send request"]),
    ]),
  ]);
}

function requestRow(r) {
  const left = Math.max(0, Math.round((r.expiresAt - serverNow()) / 1000));
  return h("div", { class: "cx-req", "data-req": r.id }, [avatar(r.from), h("div", { class: "cx-pinfo" }, [h("b", { text: r.from.name || r.from.username }), h("span", { text: "wants to play Ludo | " + left + "s" })]),
    h("div", { class: "acts" }, [
      h("button", { type: "button", class: "cx-btn sm", "data-accept": r.id, onclick: () => respondChallenge(r, true) }, ["Accept"]),
      h("button", { type: "button", class: "cx-btn ghost sm", "data-decline": r.id, onclick: () => respondChallenge(r, false) }, ["Decline"]),
    ])]);
}

async function respondChallenge(r, accept) {
  if (accept && state.game && state.game.mode === "bot" && !state.game.over) {
    if (!window.confirm("Leave your game against the computer?")) return;
  }
  try {
    await api("/api/ludo/challenge/" + encodeURIComponent(r.id) + "/respond", { accept });
    state.incoming = state.incoming.filter((x) => x.id !== r.id);
    renderLobby(); renderBanner();
  } catch (e) { toast(e.message); }
}

function renderLobby() {
  if (GUEST_TOKEN) return;
  if ($("cxMenu") && !$("cxMenu").hidden) {
    const focused = document.activeElement && document.activeElement.id === "cxSearch";
    const pos = focused ? document.activeElement.selectionStart : 0;
    renderMenu();
    if (focused && $("cxSearch")) { $("cxSearch").focus(); try { $("cxSearch").setSelectionRange(pos, pos); } catch { /* ignore */ } }
  }
}

function renderBanner() {
  if (GUEST_TOKEN) return;
  let b = $("cxBanner");
  if (!b) { b = h("div", { id: "cxBanner", class: "cx-banner" }); document.body.appendChild(b); }
  b.textContent = "";
  const inGame = state.game && state.game.mode === "online" && !state.game.over;
  if (inGame) return;
  if (state.tab === "online" && $("cxMenu") && !$("cxMenu").hidden) return;
  for (const r of state.incoming) b.appendChild(requestRow(r));
}

setInterval(() => {
  const now = serverNow();
  const gone = state.incoming.filter((r) => r.expiresAt <= now);
  if (gone.length) { state.incoming = state.incoming.filter((r) => r.expiresAt > now); renderLobby(); renderBanner(); }
  document.querySelectorAll("[data-req]").forEach((el) => {
    const r = state.incoming.find((x) => x.id === el.getAttribute("data-req"));
    const span = el.querySelector(".cx-pinfo span");
    if (r && span) span.textContent = "wants to play Ludo | " + Math.max(0, Math.round((r.expiresAt - now) / 1000)) + "s";
  });
}, 1000);
setInterval(() => { if (!document.hidden && state.tab === "online" && !$("cxMenu").hidden && !GUEST_TOKEN) loadPlayers(); }, 12000);

/* ------------------------------------------------------------------ guest links (host side) */
const GUEST_COLOR_PICKS = PICKS;
function guestLinkUrl(token) { return location.origin + "/ludo/guest/" + token; }
function leftText(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  if (m >= 120) return Math.round(m / 60) + " hours left";
  if (m >= 60) return "1 hour left";
  return m + " min left";
}
async function shareLink(url, fresh) {
  const text = "Play Ludo with me. No account needed.";
  try {
    if (navigator.share) { await navigator.share({ title: "Ludo", text, url }); return; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(url); toast(fresh ? "Game link created and copied." : "Link copied."); }
  catch { window.prompt("Copy this link", url); }
}

function guestBox() {
  const box = h("div", { class: "cx-guestbox", id: "cxGuestBox" });
  box.appendChild(h("div", { class: "cx-h", text: "Play with a guest" }));
  box.appendChild(h("div", { class: "cx-sub", style: "margin:10px 0 6px", text: "You play as" }));
  box.appendChild(chipRow(GUEST_COLOR_PICKS, state.gcolor, (id) => { state.gcolor = id; save("gcolor", id); renderMenu(); }));
  box.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxMakeLink", onclick: (e) => createLink(e.currentTarget) }, ["Create game link"]));
  box.appendChild(learnMore([
    "Make a link for someone who does not have an account. They can play you straight away.",
    "Roll within 30 seconds and move within 25 seconds.",
    "A link nobody plays on stops working after 24 hours, and it stops working when the game ends.",
  ]));
  if (state.links && state.links.length) {
    box.appendChild(h("div", { class: "cx-h", text: "Your active links" }));
    for (const l of state.links) {
      const url = guestLinkUrl(l.token);
      const playing = l.status === "playing";
      box.appendChild(h("div", { class: "cx-linkrow", "data-link": l.token }, [
        h("div", { class: "grow" }, [h("b", { text: "Guest game" }), h("span", { class: "cx-sub", text: playing ? "A guest is playing" : "Waiting for a guest | " + leftText(l.expiresAt - serverNow()) })]),
        h("div", { class: "acts" }, playing ? [] : [
          (() => { const sb = h("button", { type: "button", class: "cx-vbtn sm on", "data-copy": l.token, "aria-label": "Share game link", onclick: () => shareLink(url) }); sb.innerHTML = ICON.share; return sb; })(),
          h("button", { type: "button", class: "cx-btn ghost sm", "data-cancel": l.token, onclick: (e) => cancelLink(l, e.currentTarget) }, ["End"]),
        ]),
      ]));
    }
  }
  return box;
}
async function loadLinks() {
  if (state.conn !== "online") return;
  try {
    const d = await api("/api/ludo/guest/links");
    state.links = d.links || [];
    if (state.tab === "online" && !$("cxMenu").hidden && !document.activeElement.matches("input")) renderMenu();
  } catch { /* the list just stays as it was */ }
}
async function createLink(btn) {
  busy(btn, true);
  try {
    const d = await api("/api/ludo/guest/links", { color: state.gcolor });
    state.links = [d.link].concat(state.links || []);
    renderMenu();
    shareLink(guestLinkUrl(d.link.token), true);
  } catch (e) { busy(btn, false); toast(e.message); }
}
async function cancelLink(l, btn) {
  busy(btn, true);
  try { await api("/api/ludo/guest/links/" + encodeURIComponent(l.token) + "/cancel", {}); state.links = (state.links || []).filter((x) => x.token !== l.token); renderMenu(); }
  catch (e) { busy(btn, false); toast(e.message); }
}

/* ------------------------------------------------------------------ guest page (the person who opens a link) */
function endedCard(title, text) {
  const btn = h("button", { type: "button", class: "cx-btn", id: "cxCreateGame", onclick: (e) => { busy(e.currentTarget, true); location.href = "/ludo"; } }, ["CREATE GAME"]);
  const ic = html("div", "ic", ICON.dice);
  return h("div", { class: "cx-card cx-ended", id: "cxEnded" }, [ic, h("h1", { text: title }), h("p", { text }), btn]);
}
function showGuestEnded() {
  if (!GUEST_TOKEN) return;
  const fin = state.game && state.game.over ? state.game.result : null;
  if (state.game) { state.game.token++; state.game = null; }
  state.guest.info = fin ? { status: "finished", result: fin } : { status: "ended" };
  $("cxGame").hidden = true;
  renderGuest();
}
async function refreshGuestInfo() {
  try { state.guest.info = await api("/api/ludo/guest/info/" + encodeURIComponent(GUEST_TOKEN)); }
  catch (e) { state.guest.info = { status: "error", error: e.message }; }
  renderGuest();
}
function renderGuest() {
  if (!GUEST_TOKEN) return;
  const root = $("cxGuest");
  if (state.game) { root.hidden = true; return; }
  const keepName = $("cxGuestName") ? $("cxGuestName").value : state.guest.name;
  root.hidden = false;
  root.textContent = "";
  const info = state.guest.info;
  const card = (kids) => root.appendChild(h("div", { class: "cx-card", style: "text-align:center" }, kids));
  if (!info) { card([h("div", { class: "cx-loading", id: "cxGuestLoading" }, [h("span", { class: "cx-roll" }), "Opening game link"])]); return; }
  if (info.status === "finished") {
    const r = info.result || {};
    root.appendChild(endedCard("Game Finished", (r.winner == null ? "The game is over." : COLOR_NAMES[COLORS[r.winner]] + " won the game.") + " This link expires 5 minutes after the game ends. Create your own game to play again."));
    return;
  }
  if (info.status === "ended" || info.status === "expired") { root.appendChild(endedCard("Game Link Expired", "This game link is no longer active. Create your own game to play with friends.")); return; }
  if (info.status === "error") {
    card([h("h2", { text: "Could not open the game" }), h("p", { class: "cx-hint", style: "margin-top:8px", text: info.error || "Check your connection and try again." }), h("button", { type: "button", class: "cx-btn", id: "cxGuestRetry", onclick: (e) => { busy(e.currentTarget, true); refreshGuestInfo(); } }, ["Try again"])]);
    return;
  }
  if (info.status === "playing" && !info.you) { root.appendChild(endedCard("This link is already in use", "Someone is already playing on this link. Create your own game to play.")); return; }
  const host = info.host || {};
  const hostLine = h("div", { class: "cx-hostline" }, [avatar({ name: host.name || host.username, photo: host.photo })]);
  if (state.guest.joined) {
    const waiting = state.conn === "unavailable"
      ? [h("p", { class: "cx-hint", text: "Could not connect. Check your internet and try again." }), h("button", { type: "button", class: "cx-btn", id: "cxGuestReconnect", onclick: () => { retries = 0; connect(); } }, ["Reconnect"])]
      : state.guestWait
        ? [h("p", { class: "cx-hint", id: "cxGuestWait", text: state.guestWait }), h("button", { type: "button", class: "cx-btn", id: "cxGuestStart", onclick: async (e) => { const btn = e.currentTarget; busy(btn, true); try { await api("/api/ludo/guest/start", {}); } catch (err) { toast(err.message); } busy(btn, false); } }, ["Try again"])]
        : [h("div", { class: "cx-loading" }, [h("span", { class: "cx-roll" }), "Starting your game"])];
    card([hostLine, h("h2", { text: "Playing " + (host.name || host.username || "the host") }), ...waiting]);
    return;
  }
  const input = h("input", { class: "cx-field", id: "cxGuestName", type: "text", maxlength: "20", placeholder: "Your name", autocomplete: "off", value: keepName || "" });
  card([
    hostLine,
    h("h2", { text: (host.name || host.username || "Someone") + " invited you to play Ludo" }),
    h("p", { class: "cx-hint", style: "margin-top:8px", text: "No account needed. Pick a name and join." }),
    input,
    h("button", { type: "button", class: "cx-btn", id: "cxGuestJoin", onclick: (e) => joinGuest(e.currentTarget, input) }, ["Join game"]),
  ]);
}
async function joinGuest(btn, input) {
  const name = input.value.trim();
  if (name.length < 2) { toast("Enter a name (at least 2 letters)."); return; }
  busy(btn, true);
  try {
    await api("/api/ludo/guest/join/" + encodeURIComponent(GUEST_TOKEN), { name });
    save("guestname", name);
    state.guest.name = name; state.guest.joined = true; state.guest.info.you = true; state.guest.info.status = "playing";
    renderGuest(); retries = 0; connect();
  } catch (e) {
    busy(btn, false); toast(e.message);
    if (e.code === "ended" || e.code === "playing" || e.code === "expired") refreshGuestInfo();
  }
}
async function initGuest() {
  $("cxMenu").hidden = true;
  const back = $("cxBack");
  if (back) back.setAttribute("href", "/ludo");
  renderGuest();
  try { state.guest.info = await api("/api/ludo/guest/info/" + encodeURIComponent(GUEST_TOKEN)); }
  catch (e) { state.guest.info = { status: "error", error: e.message }; }
  if (state.guest.info.you && state.guest.info.status === "playing") { state.guest.joined = true; retries = 0; connect(); }
  renderGuest();
}

/* ------------------------------------------------------------------ start up */
function wireSound() {
  const b = $("cxSound");
  const paint = () => { b.classList.toggle("on", sound.isOn()); b.setAttribute("aria-pressed", String(sound.isOn())); b.innerHTML = sound.isOn() ? SPEAKER_ON : SPEAKER_OFF; };
  const flip = () => { sound.setOn(!sound.isOn()); paint(); };
  b.addEventListener("click", flip);
  b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  paint();
  document.addEventListener("pointerdown", () => sound.unlock && sound.unlock(), { once: true, capture: true });
}

async function loadMe() {
  if (GUEST_TOKEN) return;
  try { const d = await api("/api/chess/me"); if (!state.me) { state.me = d.me; if (state.game) paintPlayers(); } } catch { /* the stream also tells us */ }
}

function init() {
  wireSound();
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { saveGame(); return; }
    if (GUEST_TOKEN && !state.guest.joined) return;
    if (!es || es.readyState === EventSource.CLOSED) { retries = 0; connect(); }
    const g = state.game;
    if (g && g.mode === "online" && !g.over) resync();
    if (g && g.mode === "bot") botStep();
  });
  window.addEventListener("pagehide", saveGame);
  window.addEventListener("online", () => { retries = 0; connect(); });
  window.addEventListener("beforeunload", (e) => { const g = state.game; if (g && g.mode === "online" && !g.over) { e.preventDefault(); e.returnValue = ""; } });
  if (GUEST_TOKEN) { initGuest(); return; }
  if (!restoreBotGame()) renderMenu();
  loadMe();
  connect();
}
init();
window.__ludo = { state };
