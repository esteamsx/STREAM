import { SEAT_COLORS, SEAT_NAMES, SIZE, LADDERS, SNAKES, newState, roll as engineRoll, rollValue, seatOfTurn, viewOf, cellOf, walkOf } from "/snakes/snakes-engine.js";
import { sound } from "/chess/chess-sound.js";
import { createVoice } from "/ludo/ludo-voice.js";

const GUEST_MATCH = /^\/snakes\/guest\/([A-Za-z0-9_-]{6,40})\/?$/.exec(location.pathname);
const GUEST_TOKEN = GUEST_MATCH ? GUEST_MATCH[1] : null;
const BASE = GUEST_TOKEN ? "/api/snakes/guest" : "/api/snakes";
const STREAM = GUEST_TOKEN ? "/api/snakes/guest/stream" : "/api/chess/stream";
const SAVE_KEY = "sx_savedgame";
const SEAT_HEX = { red: "#FF3B5C", green: "#12C48B", yellow: "#FFC93C", blue: "#3B82FF" };
const SNAKE_COLORS = ["#FF3B5C", "#12C48B", "#B070FF", "#FFC93C", "#3B82FF"];
const BOT_IMG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#04141a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 10v7"/><circle cx="32" cy="8" r="2.4"/><rect x="12" y="17" width="40" height="32" rx="9"/><circle cx="24" cy="31" r="3.4"/><circle cx="40" cy="31" r="3.4"/><path d="M24 41h16"/><path d="M6 31v8M58 31v8"/></svg>');
const BOARD_THEMES = [
  { id: "es", name: "ES Glass", a: "#3d4d69", b: "#25314a", free: true },
  { id: "forest", name: "Forest", a: "#cfeee2", b: "#12a273" },
  { id: "ocean", name: "Ocean", a: "#d3e4ff", b: "#3b82ff" },
  { id: "sunset", name: "Sunset", a: "#ffe3c4", b: "#d9774f" },
  { id: "midnight", name: "Midnight", a: "#2a2f45", b: "#12151f" },
];

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

function store(key, fallback) { try { const v = localStorage.getItem("sx_" + key); return v == null ? fallback : v; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem("sx_" + key, String(value)); } catch { /* private mode */ } }

const state = {
  tab: "computer",
  level: ["easy", "medium", "hard"].includes(store("level")) ? store("level") : "medium",
  opponents: [1, 2, 3].includes(Number(store("opps"))) ? Number(store("opps")) : 1,
  size: [2, 3, 4].includes(Number(store("size"))) ? Number(store("size")) : 2,
  me: null, conn: "connecting", resuming: false,
  players: [], incoming: [], outgoing: [], table: null, search: "", offset: 0, loadingPlayers: false,
  game: null, links: null, watchCode: "", watchNeedsPin: false,
  guest: GUEST_TOKEN ? { token: GUEST_TOKEN, info: null, name: store("guestname", ""), joined: false } : null,
  guestWait: null,
};
const serverNow = () => Date.now() + state.offset;

const ICON = {
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.9.2 5 2.4 5 5.8"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  tick: '<svg viewBox="0 0 24 24" aria-label="Verified"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M8 12.2l2.7 2.7L16 9.5"/></svg>',
};
const VI = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
  micOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9v2a3 3 0 005 2.2M15 9.3V6a3 3 0 00-5.9-.8"/><path d="M5 11a7 7 0 0011.2 5.6M19 11a7 7 0 01-.6 2.8M12 18v3M3 3l18 18"/></svg>',
  spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/></svg>',
  spkOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>',
  room: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9.5" r="2.3"/><path d="M16.5 14.2c2.7.2 4.5 2.3 4.5 5.3"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.9l7.6-4.3M8.2 13.1l7.6 4.3"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
};
const SPEAKER_ON = VI.spk;
const SPEAKER_OFF = VI.spkOff;

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
function avatar(p, status) {
  const letter = ((p && (p.name || p.username)) || "?").trim().charAt(0).toUpperCase() || "?";
  const box = h("div", { class: "cx-av" });
  if (p && p.bot) box.appendChild(h("img", { alt: "Computer", class: "bot", src: BOT_IMG }));
  else if (p && p.photo) {
    const img = h("img", { alt: "", referrerpolicy: "no-referrer" });
    img.addEventListener("error", () => { img.remove(); box.insertBefore(document.createTextNode(letter), box.firstChild); });
    img.src = p.photo;
    box.appendChild(img);
  } else box.appendChild(document.createTextNode(letter));
  if (status) box.appendChild(h("i", { class: "st " + status }));
  return box;
}
function nameWithBadge(name, verified) {
  const b = h("b", { class: "cx-nm" }, [h("span", { text: name })]);
  if (verified) b.insertAdjacentHTML("beforeend", ICON.tick);
  return b;
}
function modal(content) {
  const ov = h("div", { class: "cx-ov" }, [h("div", { class: "cx-modal", role: "dialog" }, content)]);
  document.body.appendChild(ov);
  return { el: ov, close: () => ov.remove() };
}
/* our own confirm popup, never the browser's */
function confirmModal(title, text, yes, no, danger) {
  return new Promise((resolve) => {
    const done = (v) => { m.close(); resolve(v); };
    const m = modal([
      h("h2", { text: title }),
      text ? h("p", { text }) : null,
      h("div", { class: "row" }, [
        h("button", { type: "button", class: "cx-btn ghost", id: "sxConfirmNo", onclick: () => done(false) }, [no || "Cancel"]),
        h("button", { type: "button", class: "cx-btn" + (danger ? " danger" : ""), id: "sxConfirmYes", onclick: () => done(true) }, [yes || "OK"]),
      ]),
    ]);
    m.el.addEventListener("click", (e) => { if (e.target === m.el) done(false); });
  });
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
const isVerifiedMe = () => !!(state.me && state.me.verified);

const RULES = [
  "Everyone starts off the board. Take turns to roll the die and move forward that many squares, from 1 up to 100.",
  "Land on the foot of a ladder and you climb up to its top. Land on a snake's head and you slide down to its tail.",
  "Roll a 6 and you roll again. Three 6s in a row and you lose that turn.",
  "You need an exact roll to land on 100. If your roll is too big you stay where you are. The first player to reach 100 wins.",
];

/* ------------------------------------------------------------------ the board */
const NS = "http://www.w3.org/2000/svg";
const centerOf = (n) => { const c = cellOf(n); return { x: c.col + 0.5, y: 9 - c.row + 0.5 }; };
const spotOf = (seat) => ({ x: 1.6 + seat * 2.267, y: 10.8 });
const r2 = (n) => Math.round(n * 100) / 100;

function ladderSvg(a, b) {
  const p = centerOf(a), q = centerOf(b);
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy * 0.13, ny = ux * 0.13;
  let s = '<line class="sx-rail" x1="' + r2(p.x + nx) + '" y1="' + r2(p.y + ny) + '" x2="' + r2(q.x + nx) + '" y2="' + r2(q.y + ny) + '"/>';
  s += '<line class="sx-rail" x1="' + r2(p.x - nx) + '" y1="' + r2(p.y - ny) + '" x2="' + r2(q.x - nx) + '" y2="' + r2(q.y - ny) + '"/>';
  for (let d = 0.3; d < len - 0.15; d += 0.42) {
    const cx = p.x + ux * d, cy = p.y + uy * d;
    s += '<line class="sx-rung" x1="' + r2(cx + nx) + '" y1="' + r2(cy + ny) + '" x2="' + r2(cx - nx) + '" y2="' + r2(cy - ny) + '"/>';
  }
  return '<g class="sx-ladder" data-from="' + a + '" data-to="' + b + '">' + s + "</g>";
}
function snakeSvg(head, tail, i) {
  const p = centerOf(head), q = centerOf(tail);
  const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const waves = Math.max(2, Math.round(len / 1.4)), amp = Math.min(0.3, len * 0.12);
  const pts = [];
  for (let k = 0; k <= 30; k++) {
    const t = k / 30, off = amp * Math.sin(t * waves * Math.PI) * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08));
    pts.push(r2(p.x + dx * t + nx * off) + " " + r2(p.y + dy * t + ny * off));
  }
  const d = "M" + pts.join(" L");
  const color = SNAKE_COLORS[i % SNAKE_COLORS.length];
  const ex = ux * 0.04, ey = uy * 0.04;
  return '<g class="sx-snake" data-from="' + head + '" data-to="' + tail + '"><path class="sx-body" d="' + d + '" stroke="' + color + '" stroke-width=".26" opacity=".92"/>' +
    '<path class="sx-stripe" d="' + d + '" stroke-width=".09"/>' +
    '<circle cx="' + p.x + '" cy="' + p.y + '" r=".21" fill="' + color + '"/>' +
    '<circle class="sx-eye" cx="' + r2(p.x - 0.075 + nx * 0.02) + '" cy="' + r2(p.y - 0.05) + '" r=".055"/><circle class="sx-eye" cx="' + r2(p.x + 0.075) + '" cy="' + r2(p.y - 0.05) + '" r=".055"/>' +
    '<circle class="sx-pupil" cx="' + r2(p.x - 0.075 + ex) + '" cy="' + r2(p.y - 0.05 + ey) + '" r=".026"/><circle class="sx-pupil" cx="' + r2(p.x + 0.075 + ex) + '" cy="' + r2(p.y - 0.05 + ey) + '" r=".026"/></g>';
}
function boardSvg() {
  let s = '<svg viewBox="0 0 10 11.6" role="img" aria-label="Snakes and Ladders board, squares 1 to 100">';
  for (let n = 1; n <= SIZE; n++) { const c = cellOf(n); s += '<rect class="sx-cell" x="' + c.col + '" y="' + (9 - c.row) + '" width="1" height="1" style="fill:var(--c' + ((c.col + c.row) % 2 ? 1 : 2) + ')"/>'; }
  s += '<rect class="sx-cell" x="0" y="10.05" width="10" height="1.55" style="fill:var(--c2)"/><text class="sx-start" x="5" y="10.42" text-anchor="middle">START</text>';
  for (let seat = 0; seat < 4; seat++) { const sp = spotOf(seat); s += '<circle class="sx-spot" cx="' + sp.x + '" cy="' + sp.y + '" r=".38"/>'; }
  for (const [a, b] of Object.entries(LADDERS)) s += ladderSvg(Number(a), b);
  Object.entries(SNAKES).forEach(([a, b], i) => { s += snakeSvg(Number(a), b, i); });
  for (let n = 1; n <= SIZE; n++) { const c = cellOf(n); s += '<text class="sx-n" x="' + r2(c.col + 0.07) + '" y="' + r2(9 - c.row + 0.3) + '">' + n + "</text>"; }
  s += '<g id="sxTokens"></g></svg>';
  return s;
}

/* the pieces: where each one is drawn right now (this can be ahead of the real position while a move is being shown) */
function tokenXY(seat, square, slot, count) {
  if (square <= 0) return spotOf(seat);
  const c = centerOf(square);
  if (count <= 1) return c;
  const o = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]][slot % 4];
  return { x: c.x + o[0], y: c.y + o[1] };
}
function placeTokens(slideSeat) {
  const g = state.game;
  const layer = document.getElementById("sxTokens");
  if (!g || !layer) return;
  const v = g.view;
  const seats = g.players.map((p) => p.seat).sort((a, b) => a - b);
  const bySquare = {};
  for (const seat of seats) if (!(v.out || []).includes(seat)) (bySquare[g.disp[seat] || 0] = bySquare[g.disp[seat] || 0] || []).push(seat);
  for (const seat of seats) {
    let el = layer.querySelector('[data-seat="' + seat + '"]');
    if (!el) {
      el = document.createElementNS(NS, "g");
      el.setAttribute("class", "sx-tok");
      el.setAttribute("data-seat", seat);
      el.innerHTML = '<circle class="base" r=".27" fill="' + SEAT_HEX[SEAT_COLORS[seat]] + '"/><circle class="shine" cx="-.08" cy="-.09" r=".08"/>';
      el.style.transform = "translate(" + spotOf(seat).x + "px," + spotOf(seat).y + "px)";
      layer.appendChild(el);
    }
    const gone = (v.out || []).includes(seat);
    el.style.display = gone ? "none" : "";
    if (gone) continue;
    const sq = g.disp[seat] || 0;
    const list = bySquare[sq] || [seat];
    const xy = tokenXY(seat, sq, list.indexOf(seat), list.length);
    el.classList.toggle("slide", slideSeat === seat);
    el.classList.toggle("live", v.turn === seat && !g.over);
    el.style.transform = "translate(" + xy.x + "px," + xy.y + "px)";
    el.setAttribute("aria-label", SEAT_NAMES[SEAT_COLORS[seat]] + (sq ? " on square " + sq : " at the start"));
  }
  layer.querySelectorAll(".sx-tok").forEach((el) => { const s = Number(el.getAttribute("data-seat")); if (!seats.includes(s)) el.remove(); });
}

/* ------------------------------------------------------------------ theme (board colours, like chess) */
function activeTheme() {
  const board = store("board", "es");
  return { board: isVerifiedMe() && BOARD_THEMES.some((t) => t.id === board) ? board : "es" };
}
function applyTheme() {
  const el = $("cxBoard");
  if (el) el.setAttribute("data-board", activeTheme().board);
}
function openSettings() {
  const verified = isVerifiedMe();
  const box = h("div", { class: "cx-set" });
  const draw = () => {
    box.textContent = "";
    const now = activeTheme();
    box.appendChild(h("div", { class: "cx-h", text: "Board colours" }));
    const sw = h("div", { class: "cx-sw" });
    for (const t of BOARD_THEMES) {
      const locked = !verified && !t.free;
      const b = h("button", { type: "button", class: "cx-swatch" + (now.board === t.id ? " on" : "") + (locked ? " locked" : ""), "data-board": t.id, "aria-label": t.name });
      b.style.setProperty("--a", t.a); b.style.setProperty("--b", t.b);
      b.appendChild(h("i", {}, [h("b"), h("b"), h("b"), h("b")]));
      b.addEventListener("click", () => {
        if (locked) { toast("Verified members can change the board colours."); return; }
        save("board", t.id); applyTheme(); draw();
      });
      sw.appendChild(h("div", {}, [b, h("div", { class: "cx-swlabel", text: t.name })]));
    }
    box.appendChild(sw);
    if (!verified) box.appendChild(h("div", { class: "cx-upsell" }, ["Board colours are for ", h("b", { text: "verified members" }), ". ", h("a", { href: "/account" }, ["Get verified"]), " to unlock them."]));
  };
  draw();
  modal([h("h2", { text: "Board settings" }), box, h("div", { class: "row" }, [h("button", { type: "button", class: "cx-btn", id: "cxSettingsDone", onclick: (e) => e.currentTarget.closest(".cx-ov").remove() }, ["Done"])])]);
}

/* ------------------------------------------------------------------ games */
const botProfile = (seat) => ({ seat, color: SEAT_COLORS[seat], bot: true, name: seat > 1 ? "Computer " + seat : "Computer", username: "computer", online: true, out: false });
const myProfile = () => ({ seat: 0, color: SEAT_COLORS[0], name: (state.me && (state.me.name || state.me.username)) || "You", username: (state.me && state.me.username) || "", photo: state.me && state.me.photo, verified: !!(state.me && state.me.verified), online: true, out: false });

function newGame(o) {
  return Object.assign({ mode: "bot", id: null, key: null, you: 0, players: [], view: null, deadline: 0, seq: 0, room: null, spectator: false, over: false, result: null,
    queue: [], playing: false, acting: false, rolling: false, log: [], token: 0, st: null, pendingOver: null, roomCode: "", shown: 0, disp: {} }, o);
}
function startBotGame() {
  const old = state.game;
  if (old && old.mode === "bot") old.token++;
  const seats = [0, 1, 2, 3].slice(0, state.opponents + 1);
  const st = newState(seats);
  const players = seats.map((s) => (s === 0 ? myProfile() : botProfile(s)));
  const g = newGame({ mode: "bot", you: 0, players, st, level: state.level, token: (old ? old.token : 0) + 1 });
  g.view = viewOf(st);
  document.querySelectorAll(".cx-ov").forEach((x) => x.remove());
  beginGame(g, {});
}

function beginGame(g, opts = {}) {
  voice.stop();
  state.game = g;
  g.disp = { ...g.view.pos };
  $("cxMenu").hidden = true;
  $("cxGame").hidden = false;
  const back = $("cxBack");
  if (back) back.setAttribute("href", GUEST_TOKEN ? "/snakes" : "/");
  if (GUEST_TOKEN && $("cxGuest")) $("cxGuest").hidden = true;
  $("cxBoard").innerHTML = boardSvg();
  applyTheme();
  paintAll();
  if (g.mode === "bot") { saveGame(); botStep(); }
  else {
    startVoiceFor(g);
    paintVoice();
    if (!opts.resume && !g.spectator) toast("Game started. You are " + SEAT_NAMES[SEAT_COLORS[g.you]] + ".");
  }
}

const isMyTurn = (g) => !!g && !g.over && !g.spectator && g.you != null && g.view.turn === g.you && !(g.view.out || []).includes(g.you);
const playerOfSeat = (g, seat) => g.players.find((p) => p.seat === seat);
function playerLabel(g, p) {
  if (!p) return "Player";
  if (p.bot) return p.name;
  if (g.mode === "bot") return p.name || "You";
  return p.seat === g.you ? "You" : (p.name || p.username || "Player");
}
const seatName = (g, seat) => { const p = playerOfSeat(g, seat); return p ? playerLabel(g, p) : SEAT_NAMES[SEAT_COLORS[seat]]; };
const youOrName = (g, seat, you) => (seat === g.you ? you : seatName(g, seat));

function paintAll() {
  const g = state.game;
  if (!g) return;
  g.disp = { ...g.view.pos };
  paintPlayers();
  placeTokens();
  paintDice();
  paintStatus();
  paintLog();
  paintControls();
  paintVoice();
}

function paintPlayers() {
  const g = state.game;
  const box = $("cxTop");
  box.textContent = "";
  box.className = "sx-players";
  const v = g.view;
  const base = g.you == null ? 0 : g.you;
  const order = [...g.players].sort((a, b) => ((a.seat - base + 4) % 4) - ((b.seat - base + 4) % 4));
  for (const p of order) {
    const cname = SEAT_COLORS[p.seat];
    const mine = p.seat === g.you;
    const gone = (v.out || []).includes(p.seat);
    const live = v.turn === p.seat && !g.over && !gone;
    const status = g.mode === "online" && !mine && !p.bot ? (p.online === false ? "offline" : "available") : null;
    const at = v.pos[p.seat] || 0;
    const sub = gone ? SEAT_NAMES[cname] + " | left" : at ? "Square " + at : "At the start";
    box.appendChild(h("div", { class: "sx-pl" + (live ? " live" : "") + (mine ? " me" : "") + (gone ? " gone" : ""), "data-seat": p.seat, "data-color": cname, style: "--pc:" + SEAT_HEX[cname] }, [
      avatar(p, status),
      h("div", { class: "sx-pin" }, [nameWithBadge(playerLabel(g, p), p.verified), h("span", { text: sub })]),
      h("div", { class: "sx-pt", "data-timer": p.seat }),
    ]));
  }
  tickTimer();
}

function tickTimer() {
  const g = state.game;
  if (!g || g.mode === "bot") return;
  document.querySelectorAll("[data-timer]").forEach((el) => {
    const seat = Number(el.getAttribute("data-timer"));
    const live = !g.over && g.view.turn === seat && !g.playing;
    el.textContent = live && g.deadline ? Math.max(0, Math.ceil((g.deadline - serverNow()) / 1000)) + "s" : "";
    el.classList.toggle("low", live && g.deadline - serverNow() < 8000);
  });
}
setInterval(tickTimer, 500);

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function diceFace(v) {
  const d = h("div", { class: "sx-face", "data-v": v });
  for (let i = 0; i < 9; i++) d.appendChild(h("i", { class: PIPS[v] && PIPS[v].includes(i) ? "on" : "" }));
  return d;
}
function paintDice() {
  const g = state.game;
  const wrap = $("sxDiceWrap");
  if (!wrap) return;
  let dice = $("sxDice"), hint = $("sxHint");
  if (!dice) {
    dice = h("button", { type: "button", id: "sxDice", class: "sx-dice", "aria-label": "Roll the die", onclick: onRoll });
    hint = h("div", { id: "sxHint", class: "sx-hint", "aria-live": "polite" });
    wrap.appendChild(dice); wrap.appendChild(hint);
  }
  const mine = isMyTurn(g);
  const canRoll = mine && !g.rolling && !g.acting && !g.playing && !g.queue.length;
  dice.style.setProperty("--dc", g.view.turn != null ? SEAT_HEX[SEAT_COLORS[g.view.turn]] : "#00E0FF");
  dice.classList.toggle("ready", canRoll);
  dice.classList.toggle("waiting", !mine && !g.over);
  dice.classList.toggle("rolling", !!g.rolling);
  dice.disabled = !canRoll;
  if (!g.rolling) {
    dice.textContent = "";
    if (g.shown) dice.appendChild(diceFace(g.shown));
    else dice.appendChild(html("span", "sx-dice-ico", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>'));
  }
  hint.textContent = g.over || g.spectator ? "" : canRoll ? "Tap the die to roll" : mine ? "" : g.view.turn != null ? seatName(g, g.view.turn) + " rolls..." : "";
  dice.setAttribute("aria-label", canRoll ? "Roll the die" : g.shown ? "The die shows " + g.shown : "The die");
}

function paintStatus() {
  const g = state.game;
  const v = g.view;
  const el = $("cxStatus"), note = $("cxNote");
  note.hidden = true;
  let color = null, text = "";
  if (g.over) text = "Game over";
  else if (g.spectator) { text = seatName(g, v.turn) + " is rolling"; color = v.turn; }
  else if ((v.out || []).includes(g.you)) text = "You left this game";
  else if (isMyTurn(g)) { color = g.you; text = v.sixes > 0 ? "You rolled a 6. Roll again!" : "Your turn. Tap the die."; }
  else if (v.turn != null) { color = v.turn; text = seatName(g, v.turn) + " is rolling..."; }
  el.textContent = text;
  el.style.setProperty("--sc", color != null ? SEAT_HEX[SEAT_COLORS[color]] : "var(--accent)");
  if (g.mode === "online" && !g.over && g.players.some((p) => p.seat !== g.you && p.online === false && !p.out)) {
    note.hidden = false;
    note.textContent = "A player lost their connection. They have a few minutes to come back.";
  }
}

function describe(g, ev) {
  if (ev.type === "out") return youOrName(g, ev.seat, "You") + " left the game";
  if (ev.type !== "roll") return "";
  const who = youOrName(g, ev.seat, "You");
  if (ev.skipped === "three_sixes") return who + " rolled three 6s in a row and lost the turn";
  let t = who + " rolled a " + ev.value;
  if (ev.bounced) t += " but needs exactly " + (100 - ev.from) + " to finish";
  else t += " and moved to " + ev.landed;
  if (ev.effect === "ladder") t += " | climbed a ladder to " + ev.to;
  else if (ev.effect === "snake") t += " | a snake took them down to " + ev.to;
  if (ev.win) return t + " and won!";
  if (ev.extra) t += " | rolls again";
  return t + (ev.auto ? " (time ran out)" : "");
}
function addLog(g, text) { if (text) { g.log.unshift(text); g.log = g.log.slice(0, 6); } }
function paintLog() {
  const g = state.game;
  const box = $("cxMoves");
  box.textContent = "";
  for (const t of g.log) box.appendChild(h("div", { class: "sx-log", text: t }));
}

function paintControls() {
  const g = state.game;
  const box = $("cxControls");
  box.textContent = "";
  if (g.spectator) {
    box.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "sxStopWatch", onclick: stopWatching }, [g.over ? "Close" : "Stop watching"]));
    return;
  }
  if (g.over) {
    if (g.mode === "online" && g.players.length === 2) {
      const opp = g.players.find((p) => p.seat !== g.you);
      if (opp && !opp.guest) box.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxRematch", onclick: rematch }, ["Rematch"]));
    }
    box.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxNew", onclick: () => (g.mode === "bot" ? startBotGame() : leaveGame()) }, [g.mode === "bot" ? "Play again" : "New game"]));
    box.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "sxMenuBtn", onclick: leaveGame }, ["Menu"]));
    return;
  }
  box.appendChild(h("button", { type: "button", class: "cx-btn danger sm", id: "sxResign", onclick: onResign }, [g.mode === "bot" ? "Quit game" : "Resign"]));
  box.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "sxMenuBtn", onclick: leaveAsk }, ["Menu"]));
}

async function leaveAsk() {
  const g = state.game;
  if (!g) return;
  if (g.mode === "online" && !g.over) { toast("Resign if you want to stop this game."); return; }
  if (g.mode === "bot" && !g.over && !(await confirmModal("Leave this game?", "Your game against the computer will be closed.", "Leave", "Keep playing", true))) return;
  leaveGame();
}
function leaveGame() {
  const g = state.game;
  if (g && g.mode === "bot") { g.token++; clearSaved(); }
  voice.stop();
  state.game = null;
  $("cxGame").hidden = true;
  $("cxVoiceDock").hidden = true;
  if (GUEST_TOKEN) { showGuestEnded(); return; }
  $("cxMenu").hidden = false;
  renderMenu();
}
async function stopWatching() {
  try { await api(BASE + "/spectate/leave", {}); } catch { /* leaving locally is enough */ }
  leaveGame();
}
async function onResign() {
  const g = state.game;
  if (!g || g.over) return;
  const ok = await confirmModal(g.mode === "bot" ? "Quit this game?" : "Resign?", g.mode === "bot" ? "Your game against the computer will be closed." : g.players.length > 2 ? "You will leave this game and the others will play on." : "You will lose this game.", g.mode === "bot" ? "Quit" : "Resign", "Keep playing", true);
  if (!ok || state.game !== g || g.over) return;
  if (g.mode === "bot") { g.token++; clearSaved(); leaveGame(); return; }
  try { await api(BASE + "/game/" + encodeURIComponent(g.id) + "/resign", { key: g.key }); } catch (e) { toast(e.message); }
}
async function rematch() {
  const g = state.game;
  const opp = g && g.players.find((p) => p.seat !== g.you);
  if (!opp) return;
  try { await api(BASE + "/challenge", { toUid: opp.uid, size: 2 }); toast("Rematch request sent."); leaveGame(); } catch (err) { toast(err.message); }
}

/* ------------------------------------------------------------------ rolling */
async function onRoll() {
  const g = state.game;
  if (!g || g.over || g.spectator || g.acting || g.rolling || g.playing || g.queue.length) return;
  if (!isMyTurn(g)) { if (g.view.turn != null) toast("It is not your turn."); return; }
  g.acting = true;
  try {
    if (g.mode === "bot") {
      const ev = engineRoll(g.st, g.you, rollValue());
      if (ev.ok === false) { toast("You cannot roll now."); return; }
      localEvent(g, ev);
    } else {
      g.rolling = true; paintDice();
      await api(BASE + "/game/" + encodeURIComponent(g.id) + "/roll", { key: g.key });
    }
  } catch (e) {
    g.rolling = false; paintDice();
    toast(e.message);
    if (e.code === "not_your_turn") resync();
  } finally { g.acting = false; paintDice(); }
}

/* ---- the computer: it only ever has to roll, so there is nothing to be clever about ---- */
function localEvent(g, ev) {
  present({ event: ev, view: viewOf(g.st), players: g.players, deadline: 0 });
  if (g.st.winner != null) g.pendingOver = { winner: g.st.winner, reason: "home" };
  saveGame();
  if (!g.pendingOver) botStep();
}
async function botStep() {
  const g = state.game;
  if (!g || g.mode !== "bot" || g.over || g.botBusy) return;
  const token = g.token;
  g.botBusy = true;
  try {
    while (state.game === g && g.token === token && !g.over && !g.pendingOver) {
      if (g.queue.length || g.playing) { await sleep(120); continue; }
      const seat = seatOfTurn(g.st);
      if (seat === g.you) break;
      if (document.hidden) break;
      const pace = g.level === "easy" ? [1150, 650] : g.level === "hard" ? [350, 350] : [700, 500];
      await sleep(pace[0] + Math.floor(Math.random() * pace[1]));
      if (state.game !== g || g.token !== token || g.over || document.hidden) break;
      if (g.queue.length || g.playing || seatOfTurn(g.st) !== seat) continue;
      const ev = engineRoll(g.st, seat, rollValue());
      if (ev.ok === false) { console.error("[snakes] computer roll refused", ev); break; }
      present({ event: ev, view: viewOf(g.st), players: g.players, deadline: 0 });
      if (g.st.winner != null) g.pendingOver = { winner: g.st.winner, reason: "home" };
      saveGame();
    }
  } finally { g.botBusy = false; }
}

function saveGame() {
  const g = state.game;
  try { if (g && g.mode === "bot" && !g.over) localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, st: g.st, players: g.players, log: g.log, you: g.you, level: g.level })); } catch { /* private mode or full */ }
}
function clearSaved() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
function restoreBotGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !d.st || d.st.winner != null || !Array.isArray(d.players)) { clearSaved(); return false; }
    const g = newGame({ mode: "bot", you: d.you || 0, players: d.players, st: d.st, log: d.log || [], level: ["easy", "medium", "hard"].includes(d.level) ? d.level : state.level });
    g.view = viewOf(d.st);
    beginGame(g, { resume: true });
    return true;
  } catch { clearSaved(); return false; }
}

/* ---- showing what happened, one thing at a time ---- */
function present(p) {
  const g = state.game;
  if (!g) return;
  g.queue.push(p);
  drain();
}
async function drain() {
  const g = state.game;
  if (!g || g.playing) return;
  g.playing = true;
  try {
    while (g.queue.length && state.game === g) await showEvent(g, g.queue.shift());
  } finally {
    g.playing = false;
    g.rolling = false;
    if (state.game === g) {
      if (g.pendingOver && !g.over) {
        const po = g.pendingOver;
        g.pendingOver = null;
        if (g.mode === "bot") finishGame(po.winner, po.reason, viewOf(g.st), g.players, { pos: { ...g.st.pos } });
        else finishGame(po.winner, po.reason, po.view, po.players, po.result);
      } else paintAll();
      if (g.mode === "bot") botStep();
    }
  }
}

async function animateRoll(g, ev) {
  g.rolling = true;
  paintDice();
  sound.move();
  await sleep(reduceMotion() ? 120 : 560);
  g.rolling = false;
  g.shown = ev.value;
  paintDice();
  const seat = ev.seat;
  if (!ev.bounced && ev.landed > ev.from) {
    await sleep(220);
    for (const sq of walkOf(ev.from, ev.landed)) {
      g.disp[seat] = sq;
      placeTokens();
      sound.move();
      if (!reduceMotion()) await sleep(150);
    }
  }
  if (ev.effect) {
    await sleep(reduceMotion() ? 50 : 320);
    g.disp[seat] = ev.to;
    placeTokens(seat);
    if (ev.effect === "snake") sound.capture(); else sound.check();
    await sleep(reduceMotion() ? 50 : 820);
    const t = document.querySelector('#sxTokens [data-seat="' + seat + '"]');
    if (t) t.classList.remove("slide");
  }
}
async function showEvent(g, p) {
  const ev = p.event;
  if (ev && ev.type === "roll") await animateRoll(g, ev);
  g.view = p.view;
  if (p.players) g.players = p.players;
  if (p.deadline !== undefined) g.deadline = p.deadline;
  paintAll();
  if (!ev) return;
  addLog(g, describe(g, ev));
  paintLog();
  if (ev.type === "roll" && ev.win) { /* the result screen plays the fanfare */ }
  else if (ev.type === "roll" && ev.extra) sound.ping();
  if (ev.type === "out" && ev.seat === g.you && g.mode === "online") {
    setTimeout(() => { if (state.game === g && !g.over) { toast("You left the game."); leaveGame(); } }, 900);
  }
  await sleep(ev.type === "roll" ? 380 : 260);
}

function finishGame(winner, reason, view, players, result) {
  const g = state.game;
  if (!g || g.over) return;
  g.over = true;
  g.result = { winner, reason };
  if (view) g.view = view;
  if (players) g.players = players;
  const pos = (result && result.pos) || g.view.pos || {};
  try { if (winner === g.you) sound.win(); else if (winner == null) sound.draw(); } catch { /* optional */ }
  if (g.mode === "bot") clearSaved();
  paintAll();
  const won = winner != null && winner === g.you;
  const w = winner != null ? playerOfSeat(g, winner) : null;
  const wname = w ? playerLabel(g, w) : "";
  const why = reason === "resigned" ? (g.spectator ? "The other players resigned." : won ? "Everyone else resigned." : "You resigned.")
    : reason === "left" ? (won ? "The other players left the game." : "You were away for too long.")
    : reason === "timeout" ? (won ? "The other players ran out of time." : "You missed too many turns.")
    : won ? "You reached square 100 first." : wname + " reached square 100 first.";
  const title = winner == null ? "It is a tie" : g.spectator ? wname + " won" : won ? "You won!" : wname + " won";
  const ranked = [...g.players].sort((a, b) => (b.seat === winner) - (a.seat === winner) || (pos[b.seat] || 0) - (pos[a.seat] || 0));
  const list = h("div", { class: "sx-results", id: "sxResults" });
  for (const p of ranked) {
    const gone = (g.view.out || []).includes(p.seat);
    const at = pos[p.seat] || 0;
    list.appendChild(h("div", { class: "sx-res" + (p.seat === winner ? " win" : ""), style: "--pc:" + SEAT_HEX[SEAT_COLORS[p.seat]] }, [
      avatar(p),
      h("div", { class: "grow" }, [nameWithBadge(playerLabel(g, p), p.verified), h("small", { text: gone ? "Left the game" : p.seat === winner ? "Reached 100" : at ? "Stopped on square " + at : "Never left the start" })]),
      h("b", { class: "pts", text: gone ? "-" : String(at) }),
    ]));
  }
  const m = modal([h("h2", { text: title }), h("p", { class: "cx-hint", style: "margin-top:8px", text: why }), list]);
  if (won && g.mode === "online" && !g.spectator && !GUEST_TOKEN) {
    api(BASE + "/game/" + encodeURIComponent(g.id) + "/reward", {}).then((reward) => {
      if (!reward.rewarded) return;
      const box = m.el.querySelector(".cx-modal");
      const row = box && box.querySelector(".row");
      if (box && row) box.insertBefore(h("p", { class: "cx-hint", style: "margin-top:8px", text: reward.message || "+1 coin for your Snakes and Ladders win!" }), row);
    }).catch(() => { /* reward eligibility and account status are decided by the server */ });
  }
  const row = h("div", { class: "row" });
  if (g.mode === "bot") {
    row.appendChild(h("button", { type: "button", class: "cx-btn ghost", onclick: () => { m.close(); leaveGame(); } }, ["Menu"]));
    row.appendChild(h("button", { type: "button", class: "cx-btn", id: "sxPlayAgain", onclick: () => { m.close(); startBotGame(); } }, ["Play again"]));
  } else {
    row.appendChild(h("button", { type: "button", class: "cx-btn ghost", onclick: () => { m.close(); if (g.spectator) stopWatching(); else leaveGame(); } }, ["Menu"]));
    const opp = g.players.find((p) => p.seat !== g.you);
    if (!g.spectator && !GUEST_TOKEN && g.players.length === 2 && opp && !opp.guest) {
      row.appendChild(h("button", { type: "button", class: "cx-btn", id: "sxRematch", onclick: async (e) => {
        const btn = e.currentTarget; busy(btn, true);
        try { await api(BASE + "/challenge", { toUid: opp.uid, size: 2 }); toast("Rematch request sent."); m.close(); leaveGame(); } catch (err) { busy(btn, false); toast(err.message); }
      } }, ["Rematch"]));
    }
  }
  m.el.querySelector(".cx-modal").appendChild(row);
}

/* ------------------------------------------------------------------ menu */
function renderMenu() {
  const root = $("cxMenu");
  root.textContent = "";
  if (state.resuming) { root.appendChild(h("div", { class: "cx-card" }, [h("div", { class: "cx-loading", id: "cxResuming" }, [h("span", { class: "cx-roll" }), "Getting your game back"])])); return; }
  const pending = state.incoming.length;
  root.appendChild(h("div", { class: "cx-hero" }, [h("h1", { text: "Snakes and Ladders" }), h("p", { text: "Race to square 100. Play the computer, or play 2 to 4 people who are online." })]));
  root.appendChild(h("div", { class: "cx-tabs" }, [
    h("button", { class: "cx-tab" + (state.tab === "computer" ? " on" : ""), id: "tabComputer", type: "button", onclick: () => { state.tab = "computer"; renderMenu(); } }, [html("span", "", ICON.cpu).firstChild, "Computer"]),
    h("button", { class: "cx-tab" + (state.tab === "online" ? " on" : ""), id: "tabOnline", type: "button", onclick: () => { state.tab = "online"; renderMenu(); loadPlayers(); loadLinks(); } }, [html("span", "", ICON.users).firstChild, "Online", pending ? h("span", { class: "badge", text: String(pending) }) : null]),
  ]));
  const card = h("div", { class: "cx-card", id: "cxPanel" });
  root.appendChild(card);
  if (state.tab === "computer") renderComputerPanel(card); else renderOnlinePanel(card);
}

function renderComputerPanel(card) {
  const levels = [
    { id: "easy", name: "Easy", note: "Takes its time. The die stays fair.", mark: "1" },
    { id: "medium", name: "Medium", note: "A steady pace. The die stays fair.", mark: "2" },
    { id: "hard", name: "Hard", note: "Quicker turns. The die stays fair.", mark: "3" },
  ];
  card.appendChild(h("div", { class: "cx-h", text: "Difficulty" }));
  card.appendChild(h("div", { class: "cx-levels" }, levels.map((l) => h("button", {
    type: "button", class: "cx-level" + (state.level === l.id ? " on" : ""), "data-level": l.id,
    onclick: () => { state.level = l.id; save("level", l.id); renderMenu(); },
  }, [h("div", { class: "lv " + l.id, text: l.mark }), h("div", {}, [h("b", { text: l.name }), h("span", { text: l.note })])]))));
  card.appendChild(h("div", { class: "cx-h", text: "Computer players" }));
  card.appendChild(h("div", { class: "cx-chips" }, [[1, "1 player"], [2, "2 players"], [3, "3 players"]].map(([n, label]) => h("button", {
    type: "button", class: "cx-chip" + (state.opponents === n ? " on" : ""), "data-opps": n, onclick: () => { state.opponents = n; save("opps", n); renderMenu(); },
  }, [label]))));
  card.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxStartBot", onclick: (e) => { busy(e.currentTarget, true); setTimeout(startBotGame, 180); } }, ["Start game"]));
  card.appendChild(learnMore(RULES.concat(["Snakes and Ladders is a game of luck. Difficulty changes how quickly the computer takes its turns; it does not change the fair die rolls.", "A game in progress is saved on this device, so you can leave and come back to it."])));
}

/* ------------------------------------------------------------------ voice and rooms (same as chess and Ludo) */
const voice = createVoice({
  post: (path, body) => api(BASE + "/game/" + encodeURIComponent(body.gameId) + path, body),
  getIce: () => api(BASE + "/ice"),
  onChange: () => paintVoice(),
});
let voiceRaf = 0;
let voiceLast = 0;
let roomUi = null;

const voiceAvailable = () => !!(state.game && state.game.mode === "online" && state.game.id);

function startVoiceFor(g) {
  if (!g || g.mode !== "online" || !state.me) return;
  const players = {};
  for (const p of g.players) if (!p.out && p.uid) players[p.seat] = p.uid;
  if (g.spectator) voice.start({ gameId: g.id, key: null, uid: state.me.uid, role: "spectator", color: null, players });
  else voice.start({ gameId: g.id, key: g.key, uid: state.me.uid, role: "player", color: g.you, players });
}

function paintVoice() {
  const dock = $("cxVoiceDock");
  if (!dock) return;
  if (!voiceAvailable() || (state.game.over && !state.game.spectator)) { dock.hidden = true; return; }
  const g = state.game;
  dock.hidden = false;
  const spectator = !!g.spectator;
  const vs = voice.status();
  const vnote = vs.state === "connecting" ? "connecting" : vs.state === "failed" ? "failed:" + (vs.message || "") : vs.audioBlocked ? "blocked" : "";
  const key = [spectator, voice.micOn, voice.mutedAll, (g.room && g.room.count) || 0, vnote].join("|");
  if (dock.getAttribute("data-key") !== key) {
    dock.setAttribute("data-key", key);
    dock.textContent = "";
    if (!spectator) {
      const mic = h("button", { type: "button", class: "cx-vbtn" + (voice.micOn ? " on" : ""), id: "cxMic", "aria-label": voice.micOn ? "Turn microphone off" : "Turn microphone on", "aria-pressed": String(voice.micOn) });
      mic.innerHTML = voice.micOn ? VI.mic : VI.micOff;
      mic.addEventListener("click", async () => {
        busy(mic, true);
        try { await voice.setMic(!voice.micOn); } catch (e) { toast(e.message); }
        busy(mic, false);
        paintVoice();
      });
      dock.appendChild(h("div", { class: "cx-vwrap" }, [mic, h("span", { text: voice.micOn ? "Mic on" : "Mic off" })]));
    }
    const spk = h("button", { type: "button", class: "cx-vbtn" + (voice.mutedAll ? "" : " on"), id: "cxSpk", "aria-label": voice.mutedAll ? "Hear everyone" : "Mute everyone" });
    spk.innerHTML = voice.mutedAll ? VI.spkOff : VI.spk;
    spk.addEventListener("click", () => { voice.muteAll(!voice.mutedAll); });
    dock.appendChild(h("div", { class: "cx-vwrap" }, [spk, h("span", { text: voice.mutedAll ? "Muted" : "Sound" })]));
    const room = h("button", { type: "button", class: "cx-vbtn", id: "cxRoom", "aria-label": "Room settings" });
    room.innerHTML = VI.room;
    if (g.room && g.room.count) room.appendChild(h("i", { class: "cx-vbadge", text: String(g.room.count) }));
    room.addEventListener("click", openRoom);
    dock.appendChild(h("div", { class: "cx-vwrap" }, [room, h("span", { text: "Room" })]));
    if (vs.state === "connecting") dock.appendChild(h("div", { class: "cx-vstate" }, [h("span", { class: "cx-roll" }), " Connecting voice"]));
    else if (vs.state === "failed") dock.appendChild(h("div", { class: "cx-vstate cx-verr" }, [h("span", { text: vs.message || "Voice could not connect." }), h("button", { type: "button", class: "cx-btn sm", id: "cxVoiceRetry", onclick: () => { startVoiceFor(state.game); } }, ["Try again"])]));
    else if (vs.audioBlocked) dock.appendChild(h("div", { class: "cx-vstate" }, [h("button", { type: "button", class: "cx-btn sm", id: "cxVoiceSound", onclick: () => voice.resumeAudio() }, ["Tap to hear voice"])]));
  }
  if (!voiceRaf) voiceRaf = requestAnimationFrame(voiceLoop);
  if (roomUi && roomUi.box.isConnected) roomUi.draw();
}

function voiceLoop(ts) {
  voiceRaf = 0;
  if (!voiceAvailable() || $("cxVoiceDock").hidden) return;
  if (ts - voiceLast > 40) {
    voiceLast = ts;
    const mic = $("cxMic"), spk = $("cxSpk");
    if (mic) mic.style.setProperty("--lv", voice.myLevel().toFixed(2));
    if (spk) spk.style.setProperty("--lv", voice.incomingLevel().toFixed(2));
    document.querySelectorAll("[data-lv]").forEach((el) => {
      const uid = el.getAttribute("data-lv");
      el.style.setProperty("--lv", (uid === "me" ? voice.myLevel() : voice.peerLevel(uid)).toFixed(2));
    });
  }
  if (voice.active) voiceRaf = requestAnimationFrame(voiceLoop);
}

const roomLink = (code) => location.origin + "/snakes?watch=" + encodeURIComponent(code);
async function shareText(text, url) {
  if (navigator.share) { try { await navigator.share({ title: "Watch my Snakes and Ladders game", text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); toast("Link copied."); } catch { window.prompt("Copy this link", url); }
}

async function openRoom() {
  const g = state.game;
  if (!g || g.mode !== "online") return;
  const spectator = !!g.spectator;
  let info = spectator
    ? { code: g.roomCode || "", open: true, pinSet: false, max: (g.room && g.room.max) || 0, count: (g.room && g.room.count) || 0, spectators: (g.room && g.room.spectators) || [], isHost: false }
    : (g.room && g.room.code ? g.room : null);
  const box = h("div", { class: "cx-set cx-roomui" });
  const ov = modal([
    h("h2", { text: "Room" }),
    box,
    h("div", { class: "row" }, [h("button", { type: "button", class: "cx-btn", id: "cxRoomDone", onclick: (e) => e.currentTarget.closest(".cx-ov").remove() }, ["Done"])]),
  ]);
  ov.el.classList.add("cx-ovwide");

  const post = async (body) => {
    const d = await api(BASE + "/game/" + encodeURIComponent(g.id) + "/room/settings", { key: g.key, ...body });
    g.room = d; info = d; draw();
  };
  const sw = (label, sub, on, onToggle, id) => {
    const b = h("button", { type: "button", class: "cx-switch" + (on ? " on" : ""), role: "switch", "aria-checked": String(on), id });
    b.appendChild(h("i"));
    b.addEventListener("click", async () => { busy(b, true); try { await onToggle(!on); } catch (e) { toast(e.message); } busy(b, false); });
    return h("div", { class: "cx-roomrow" }, [h("div", { class: "grow" }, [h("b", { text: label }), sub ? h("small", { text: sub }) : null]), b]);
  };

  function draw() {
    box.textContent = "";
    const room = spectator ? info : (g.room && g.room.code ? g.room : info);
    if (!room) { box.appendChild(h("div", { class: "cx-loading" }, [h("span", { class: "cx-roll" }), "Loading room"])); return; }
    const host = !spectator && room.isHost;
    if (room.code) {
      const codeEl = h("div", { class: "cx-code", text: room.code });
      const copy = h("button", { type: "button", class: "cx-vbtn sm", "aria-label": "Copy room code" });
      copy.innerHTML = VI.copy;
      copy.addEventListener("click", async () => { try { await navigator.clipboard.writeText(room.code); toast("Room code copied."); } catch { window.prompt("Room code", room.code); } });
      const share = h("button", { type: "button", class: "cx-vbtn sm", "aria-label": "Share room link" });
      share.innerHTML = VI.share;
      share.addEventListener("click", () => shareText("Watch my Snakes and Ladders game. Room code " + room.code + (room.pinSet ? " (needs the PIN)" : ""), roomLink(room.code)));
      box.appendChild(h("div", { class: "cx-codebox" }, [h("small", { text: spectator ? "You are watching room" : "Room code" }), h("div", { class: "cx-coderow" }, [codeEl, copy, share])]));
    }
    if (host) {
      box.appendChild(sw("Allow spectators", room.open ? "People with the code can watch" : "Nobody can join to watch", !!room.open, (v) => post({ open: v }), "cxAllow"));
      if (room.open) {
        box.appendChild(sw("PIN lock", room.pinSet ? "A 4 digit PIN is needed to watch" : "Anyone with the code can watch", !!room.pinSet, async (v) => {
          if (!v) return post({ pin: null });
          const pin = String(Math.floor(1000 + Math.random() * 9000));
          await post({ pin });
          toast("PIN set to " + pin + ". Share it with your guests.");
        }, "cxPinSw"));
        if (room.pinSet) {
          const input = h("input", { class: "cx-field", id: "cxPinInput", type: "text", inputmode: "numeric", maxlength: "4", placeholder: "New 4 digit PIN", autocomplete: "off" });
          const setBtn = h("button", { type: "button", class: "cx-btn sm", id: "cxPinSave", onclick: async (e) => {
            const v = input.value.trim();
            if (!/^\d{4}$/.test(v)) { toast("The PIN must be 4 digits."); return; }
            busy(e.currentTarget, true);
            try { await post({ pin: v }); toast("PIN changed."); } catch (err) { toast(err.message); }
            busy(e.currentTarget, false);
          } }, ["Change PIN"]);
          box.appendChild(h("div", { class: "cx-pinrow" }, [input, setBtn]));
        }
        const minus = h("button", { type: "button", class: "cx-step", "aria-label": "Fewer spectators", text: "-" });
        const plus = h("button", { type: "button", class: "cx-step", "aria-label": "More spectators", text: "+" });
        const change = async (btn, n) => { busy(btn, true); try { await post({ max: n }); } catch (err) { toast(err.message); } busy(btn, false); };
        minus.addEventListener("click", () => { if (room.max > 1) change(minus, room.max - 1); });
        plus.addEventListener("click", () => { if (room.max < 20) change(plus, room.max + 1); });
        box.appendChild(h("div", { class: "cx-roomrow" }, [h("div", { class: "grow" }, [h("b", { text: "Spectator limit" }), h("small", { text: "How many people can watch at once" })]), h("div", { class: "cx-stepper" }, [minus, h("b", { text: String(room.max) }), plus])]));
      }
    } else if (!spectator) {
      box.appendChild(h("div", { class: "cx-hint", text: "Only the host can change who watches." }));
    }
    const watchers = room.spectators || [];
    box.appendChild(h("div", { class: "cx-h" }, [h("span", { text: "People" })]));
    const people = h("div", { class: "cx-people" });
    const peerState = new Map(voice.peers().map((p) => [p.uid, p]));
    const row = (uid, name, photo, role, canMute, verified) => {
      const ps = peerState.get(uid);
      const ring = h("div", { class: "cx-pring", "data-lv": uid });
      ring.appendChild(avatar({ name, photo }));
      const kids = [ring, h("div", { class: "grow" }, [nameWithBadge(name, verified), h("small", { text: role + (ps ? (ps.state === "connected" ? " | voice connected" : ps.state === "failed" ? " | voice failed" : " | connecting") : "") })])];
      if (canMute && ps) {
        const m = h("button", { type: "button", class: "cx-vbtn sm" + (ps.muted ? "" : " on"), "aria-label": ps.muted ? "Hear " + name : "Mute " + name });
        m.innerHTML = ps.muted ? VI.spkOff : VI.spk;
        m.addEventListener("click", () => voice.mutePeer(uid, !ps.muted));
        kids.push(m);
      }
      people.appendChild(h("div", { class: "cx-person" }, kids));
    };
    const meUid = state.me && state.me.uid;
    for (const p of g.players) {
      if (p.out) continue;
      const isMe = p.uid === meUid;
      row(p.uid, (p.name || p.username || "Player") + (isMe ? " (you)" : "") + " | " + SEAT_NAMES[SEAT_COLORS[p.seat]], p.photo, "Player", !isMe, p.verified);
    }
    for (const w of watchers) if (w.uid !== meUid) row(w.uid, w.name || w.username, w.photo, "Watching", false, w.verified);
    box.appendChild(people);
    box.appendChild(sw("Mute everyone", "Stops all voices on this phone", voice.mutedAll, (v) => { voice.muteAll(v); return Promise.resolve(); }, "cxMuteAll"));
    box.appendChild(h("details", { class: "cx-learn" }, [
      h("summary", { text: "Learn more" }),
      h("div", {}, [
        h("p", { text: "Players can talk to each other with their microphones. Spectators can only listen." }),
        h("p", { text: "Voice goes straight between phones, so the site does not record it. Turn your mic on or off any time with the mic button." }),
        h("p", { text: "The host can let people watch with a room code, add a 4 digit PIN, and choose how many can watch." }),
        h("p", { text: "You can mute any voice just for yourself. Others will not know." }),
      ]),
    ]));
  }
  roomUi = { box, draw };
  draw();
  if (!spectator && !(g.room && g.room.code)) {
    try { const d = await api(BASE + "/game/" + encodeURIComponent(g.id) + "/room", { key: g.key }); g.room = d; info = d; draw(); }
    catch (e) { toast(e.message); }
  }
}

function startSpectate(v, code) {
  if (state.game && state.game.mode === "bot") { state.game.token++; }
  if (v.serverTime) state.offset = v.serverTime - Date.now();
  const g = newGame({ mode: "online", id: v.id, you: null, players: v.players, view: v.state, deadline: v.deadline, seq: v.seq, spectator: true, room: v.room || null, roomCode: code || (state.game && state.game.roomCode) || "" });
  beginGame(g, { resume: true });
  document.querySelectorAll(".cx-ov").forEach((x) => x.remove());
  if (v.status !== "active" && v.result) finishGame(v.result.winner, v.result.reason, v.state, v.players, v.result);
  else toast("You are watching this game.");
}
async function watchRoom(code, pin, btn) {
  busy(btn, true);
  try {
    const d = await api(BASE + "/spectate", { code, pin: pin || undefined });
    busy(btn, false);
    startSpectate(d.view, String(code).toUpperCase());
    return null;
  } catch (e) {
    busy(btn, false);
    return e;
  }
}
function watchBox() {
  const wrap = h("div", { class: "cx-guestbox", id: "cxWatchBox" });
  wrap.appendChild(h("div", { class: "cx-h", text: "Watch a game" }));
  const code = h("input", { class: "cx-field", id: "cxWatchCode", type: "text", maxlength: "6", placeholder: "Room code", autocomplete: "off", autocapitalize: "characters", value: state.watchCode || "" });
  const pin = h("input", { class: "cx-field", id: "cxWatchPin", type: "text", inputmode: "numeric", maxlength: "4", placeholder: "4 digit PIN", autocomplete: "off", hidden: !state.watchNeedsPin });
  const go = h("button", { type: "button", class: "cx-btn", id: "cxWatchGo" }, [h("span", { class: "ico" }), "Watch"]);
  go.firstChild.innerHTML = VI.eye;
  go.addEventListener("click", async () => {
    const c = code.value.trim().toUpperCase();
    if (c.length < 6) { toast("Enter the 6 character room code."); return; }
    state.watchCode = c;
    const e = await watchRoom(c, pin.value.trim(), go);
    if (e) {
      if (e.code === "pin_required" || e.code === "bad_pin") { state.watchNeedsPin = true; pin.hidden = false; pin.focus(); }
      toast(e.message);
    }
  });
  wrap.appendChild(code);
  wrap.appendChild(pin);
  wrap.appendChild(go);
  wrap.appendChild(learnMore([
    "Got a room code from a friend? Enter it to watch their game and listen in.",
    "Some rooms also ask for a 4 digit PIN from the host. You will see every move as it happens.",
  ]));
  return wrap;
}

/* ------------------------------------------------------------------ online */
let es = null, retries = 0, retryTimer = null;

function setConn(c) {
  state.conn = c;
  const el = $("cxConn");
  if (el) el.className = "cx-conn " + (c === "online" ? "on" : c === "unavailable" ? "off" : "");
  const tx = $("cxConnText");
  if (tx) tx.textContent = c === "online" ? "Online" : c === "connecting" ? "Connecting" : c === "unavailable" ? "Unavailable" : "Reconnecting";
  renderLobby();
  if (GUEST_TOKEN) renderGuest();
}

function connect() {
  if (GUEST_TOKEN && !state.guest.joined) return;
  clearTimeout(retryTimer);
  if (es) { es.close(); es = null; }
  setConn("connecting");
  es = new EventSource(STREAM);
  const on = (name, fn) => es.addEventListener(name, (e) => { let d = null; try { d = JSON.parse(e.data); } catch { return; } fn(d); });
  on("ping", () => {});
  on("snakes_guest_wait", (d) => { state.guestWait = d.message || "Waiting for the host."; renderGuest(); });
  on("hello", (d) => { retries = 0; state.me = d.me || state.me; state.resuming = false; applyTheme(); setConn("online"); if (state.game) { paintPlayers(); if (state.game.mode === "online") startVoiceFor(state.game); } if (!GUEST_TOKEN && state.tab === "online") { loadPlayers(); loadLinks(); } });
  on("snakes_hello", (d) => {
    state.offset = (d.serverTime || Date.now()) - Date.now();
    state.incoming = d.incoming || [];
    state.outgoing = d.outgoing || [];
    state.table = d.table || null;
    state.resuming = false;
    if (d.game && d.game.status === "active") startOnlineGame(d.game, { resume: true });
    else if (d.spectate) startSpectate(d.spectate, state.watchCode);
    else if (state.game && state.game.mode === "online" && !state.game.over) resync();
    renderLobby();
  });
  on("snakes_challenge", (c) => { state.incoming = state.incoming.filter((x) => x.id !== c.id).concat(c); renderLobby(); });
  on("snakes_challenge_sent", (c) => { state.outgoing = state.outgoing.filter((x) => x.id !== c.id).concat(c); renderLobby(); });
  on("snakes_challenge_update", (u) => {
    const was = state.outgoing.find((x) => x.id === u.id);
    state.incoming = state.incoming.filter((x) => x.id !== u.id);
    state.outgoing = state.outgoing.filter((x) => x.id !== u.id);
    if (was && u.status === "declined") toast((was.to.name || was.to.username) + " declined your request.");
    if (was && u.status === "expired") toast("Your request to " + (was.to.name || was.to.username) + " expired.");
    renderLobby();
  });
  on("snakes_table", (t) => { state.table = t; renderLobby(); });
  on("snakes_table_end", (d) => {
    if (state.table && state.table.id === d.id) {
      const mine = state.table.host === (state.me && state.me.uid);
      state.table = null;
      if (d.reason === "cancelled" && !mine) toast("The host closed the table.");
      if (d.reason === "expired") toast("Your table expired.");
    }
    renderLobby();
  });
  on("snakes_game_start", (v) => { state.table = null; startOnlineGame(v, {}); });
  on("snakes_state", (v) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== v.gameId) return;
    if (v.seq <= g.seq) return;
    g.seq = v.seq;
    state.offset = (v.serverTime || Date.now()) - Date.now();
    if (v.room) g.room = { ...(g.room || {}), ...v.room };
    present({ event: v.event, view: v.state, deadline: v.deadline, players: v.players });
  });
  on("snakes_over", (v) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== v.gameId) return;
    if (g.playing || g.queue.length) g.pendingOver = { winner: v.result.winner, reason: v.result.reason, view: v.state, players: v.players, result: v.result };
    else finishGame(v.result.winner, v.result.reason, v.state, v.players, v.result);
  });
  on("snakes_opponent", (d) => {
    const g = state.game;
    if (!g || g.id !== d.gameId) return;
    const p = g.players.find((x) => x.uid === d.uid);
    if (p) p.online = !!d.online;
    paintStatus(); paintPlayers();
  });
  on("snakes_room_update", (d) => {
    const g = state.game;
    if (!g || g.id !== d.gameId) return;
    g.room = { ...(g.room || {}), ...d };
    paintVoice();
    if (roomUi && roomUi.box.isConnected) roomUi.draw();
  });
  on("snakes_spectate_end", (d) => {
    const g = state.game;
    if (!g || !g.spectator || g.id !== d.gameId) return;
    if (d.reason === "closed") toast("The host closed this room.");
    else if (d.reason === "full") toast("The room is full.");
    else if (d.reason !== "ended") toast("You are no longer watching.");
    leaveGame();
  });
  on("snakes_voice_peer", (d) => { const g = state.game; if (g && g.id === d.gameId) voice.onPeer(d); });
  on("snakes_voice_signal", (d) => { const g = state.game; if (g && g.id === d.gameId) voice.onSignal(d); });
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

function startOnlineGame(v, opts) {
  const old = state.game;
  if (old && old.mode === "online" && old.id === v.id && !old.spectator) {
    if (opts.resume) {
      old.view = v.state; old.players = v.players; old.deadline = v.deadline; old.seq = Math.max(old.seq, v.seq); old.queue = []; old.room = v.room || old.room;
      paintAll();
    }
    return;
  }
  if (old && old.mode === "bot") { old.token++; clearSaved(); }
  document.querySelectorAll(".cx-ov").forEach((x) => x.remove());
  const g = newGame({ mode: "online", id: v.id, key: v.key, you: v.you, players: v.players, view: v.state, deadline: v.deadline, seq: v.seq, room: v.room });
  beginGame(g, opts);
  if (v.status !== "active" && v.result) finishGame(v.result.winner, v.result.reason, v.state, v.players, v.result);
}

async function resync() {
  const g = state.game;
  if (!g || g.mode !== "online" || g.over || g.spectator) return;
  try {
    const d = await api(BASE + "/game/" + encodeURIComponent(g.id) + "/state", { key: g.key });
    const v = d.game;
    if (v.status !== "active") { finishGame(v.result.winner, v.result.reason, v.state, v.players, v.result); return; }
    g.view = v.state; g.players = v.players; g.deadline = v.deadline; g.seq = v.seq; g.queue = []; g.playing = false;
    if (v.room) g.room = v.room;
    paintAll();
  } catch (e) { if (e.code === "no_game" || e.code === "bad_key") { state.game = null; leaveGameUi(); } }
}
function leaveGameUi() {
  voice.stop(); $("cxGame").hidden = true; $("cxVoiceDock").hidden = true;
  if (GUEST_TOKEN) { showGuestEnded(); return; }
  $("cxMenu").hidden = false; renderMenu();
}

function tablePanel() {
  const t = state.table;
  const meUid = state.me && state.me.uid;
  const isHost = t.host === meUid;
  const box = h("div", { class: "sx-tbl", id: "sxTbl" });
  box.appendChild(h("div", { class: "cx-h" }, [h("span", { class: "cx-live", text: "Your table | " + t.seats.length + " of " + t.size + " players" })]));
  const seats = h("div", { class: "sx-seats" });
  for (const s of t.seats) {
    seats.appendChild(h("div", { class: "sx-seat", style: "--pc:" + SEAT_HEX[SEAT_COLORS[s.seat]] }, [avatar(s), h("div", { class: "grow" }, [nameWithBadge(s.name || s.username || "Player", s.verified), h("small", { text: SEAT_NAMES[SEAT_COLORS[s.seat]] + (s.uid === t.host ? " | host" : "") })])]));
  }
  for (const inv of t.invited || []) {
    seats.appendChild(h("div", { class: "sx-seat wait" }, [avatar(inv.to), h("div", { class: "grow" }, [nameWithBadge(inv.to.name || inv.to.username || "Player", inv.to.verified), h("small", { text: "Invited | waiting..." })])]));
  }
  const empty = t.size - t.seats.length - (t.invited || []).length;
  for (let i = 0; i < empty; i++) seats.appendChild(h("div", { class: "sx-seat empty" }, [h("div", { class: "cx-av" }, ["+"]), h("div", { class: "grow" }, [h("small", { text: "Open seat | invite a player below" })])]));
  box.appendChild(seats);
  const row = h("div", { class: "cx-controls" });
  if (isHost) row.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "sxStartTable", disabled: t.seats.length < 2 ? true : null, onclick: async (e) => { busy(e.currentTarget, true); try { await api(BASE + "/table/start", {}); } catch (err) { busy(e.currentTarget, false); toast(err.message); } } }, ["Start now"]));
  row.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "sxLeaveTable", onclick: async (e) => { busy(e.currentTarget, true); try { await api(BASE + "/table/leave", {}); state.table = null; renderLobby(); } catch (err) { busy(e.currentTarget, false); toast(err.message); } } }, [isHost ? "Close table" : "Leave table"]));
  box.appendChild(row);
  box.appendChild(h("div", { class: "cx-hint", text: isHost ? "Invite more players from the list. The game starts when every seat is taken, or press Start now." : "Waiting for the host to start the game." }));
  return box;
}

function snakesGuestLinkUrl(token) { return location.origin + "/snakes/guest/" + token; }
function leftText(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  if (m >= 120) return Math.round(m / 60) + " hours left";
  if (m >= 60) return "1 hour left";
  return m + " min left";
}
async function shareSnakesLink(url, fresh) {
  if (navigator.share && !fresh) {
    try { await navigator.share({ title: "Snakes and Ladders", text: "Play Snakes and Ladders with me. No account needed.", url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); toast(fresh ? "Game link created and copied." : "Link copied."); }
  catch { window.prompt("Copy this link", url); }
}
function guestLinkBox() {
  const box = h("div", { class: "cx-guestbox", id: "sxGuestLinks" });
  box.appendChild(h("div", { class: "cx-h", text: "Play with a guest" }));
  box.appendChild(h("div", { class: "cx-sub", style: "margin:10px 0 8px", text: "Create a private one-use link for someone without an account." }));
  box.appendChild(h("button", { type: "button", class: "cx-btn", id: "sxMakeLink", onclick: (e) => createSnakesLink(e.currentTarget) }, ["Create game link"]));
  if (state.links && state.links.length) {
    box.appendChild(h("div", { class: "cx-h", text: "Your active links" }));
    for (const l of state.links) {
      const url = snakesGuestLinkUrl(l.token), playing = l.status === "playing";
      const actions = h("div", { class: "acts" });
      if (!playing) {
        const share = h("button", { type: "button", class: "cx-vbtn sm on", "aria-label": "Share game link", onclick: () => shareSnakesLink(url) });
        share.innerHTML = VI.share;
        actions.appendChild(share);
        actions.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", onclick: (e) => cancelSnakesLink(l, e.currentTarget) }, ["End"]));
      }
      box.appendChild(h("div", { class: "cx-linkrow", "data-link": l.token }, [
        h("div", { class: "grow" }, [h("b", { text: "Guest game" }), h("span", { class: "cx-sub", text: playing ? "A guest is playing" : "Waiting for a guest | " + leftText(l.expiresAt - serverNow()) })]), actions,
      ]));
    }
  }
  box.appendChild(learnMore(["The guest opens your link, enters a name, and plays you directly. No account is needed.", "Each link is for one guest, works for up to 24 hours if unused, and expires shortly after the game ends."]));
  return box;
}
async function loadLinks() {
  if (GUEST_TOKEN || state.conn !== "online") return;
  try {
    const d = await api("/api/snakes/guest/links");
    state.links = d.links || [];
    if (state.tab === "online" && $("cxMenu") && !$("cxMenu").hidden) renderMenu();
  } catch { /* keep existing links visible */ }
}
async function createSnakesLink(btn) {
  busy(btn, true);
  try {
    const d = await api("/api/snakes/guest/links", {});
    state.links = [d.link].concat(state.links || []);
    renderMenu();
    shareSnakesLink(snakesGuestLinkUrl(d.link.token), true);
  } catch (e) { busy(btn, false); toast(e.message); }
}
async function cancelSnakesLink(link, btn) {
  busy(btn, true);
  try {
    await api("/api/snakes/guest/links/" + encodeURIComponent(link.token) + "/cancel", {});
    state.links = (state.links || []).filter((x) => x.token !== link.token);
    renderMenu();
  } catch (e) { busy(btn, false); toast(e.message); }
}

function renderOnlinePanel(card) {
  if (state.conn !== "online") {
    card.appendChild(h("div", { class: "cx-empty", id: "cxOffline", text: state.conn === "unavailable" ? "Online play is not available right now. You can still play the computer." : "" }, state.conn === "unavailable" ? [] : [h("span", { class: "cx-roll" }), " Connecting"]));
    return;
  }
  if (state.incoming.length) {
    card.appendChild(h("div", { class: "cx-h", text: "Requests for you" }));
    for (const r of state.incoming) card.appendChild(requestRow(r));
  }
  if (state.table) card.appendChild(tablePanel());
  const tableOutgoing = new Set(((state.table && state.table.invited) || []).map((i) => i.id));
  const solo = state.outgoing.filter((o) => !tableOutgoing.has(o.id));
  if (solo.length) {
    card.appendChild(h("div", { class: "cx-h", text: "Waiting for an answer" }));
    for (const o of solo) {
      card.appendChild(h("div", { class: "cx-wait", "data-out": o.id }, [avatar(o.to), h("div", { class: "grow" }, [nameWithBadge(o.to.name || o.to.username, o.to.verified), h("div", { class: "cx-sub", text: "Snakes and Ladders | waiting..." })]),
        h("button", { type: "button", class: "cx-btn ghost sm", onclick: () => api(BASE + "/challenge/" + encodeURIComponent(o.id) + "/cancel", {}).catch((e) => toast(e.message)) }, ["Cancel"])]));
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
  card.appendChild(watchBox());
  if (!GUEST_TOKEN) card.appendChild(guestLinkBox());
}

async function loadPlayers() {
  if (state.conn !== "online") return;
  state.loadingPlayers = true;
  paintLobbyPlayers();
  try { const d = await api(BASE + "/online?q=" + encodeURIComponent(state.search.trim())); state.players = d.players || []; } catch { /* the list just stays as it was */ }
  state.loadingPlayers = false;
  paintLobbyPlayers();
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
    const seated = !!(state.table && state.table.seats.some((s) => s.uid === p.uid));
    const can = p.status === "available" && !waiting && !seated;
    const label = p.status === "offline" ? "Offline" : p.status === "playing" ? "In a game" : "Online";
    box.appendChild(h("div", { class: "cx-player", "data-uid": p.uid }, [avatar(p, p.status), h("div", { class: "cx-pinfo" }, [nameWithBadge(p.name || p.username, p.verified), h("span", { text: "@" + p.username + " | " + label })]),
      h("button", { type: "button", class: "cx-btn pill", "data-challenge": p.uid, disabled: can ? null : true, onclick: () => openChallengeSheet(p) }, [seated ? "Seated" : waiting ? "Sent" : state.table ? "Invite" : "Challenge"])]));
  }
}

function openChallengeSheet(p) {
  let size = state.table ? state.table.size : state.size;
  const hasTable = !!state.table;
  const sizeRow = h("div", { class: "sx-sizes" });
  const paint = () => {
    sizeRow.textContent = "";
    if (hasTable) return;
    sizeRow.appendChild(h("div", { class: "cx-h", text: "How many players?" }));
    sizeRow.appendChild(h("div", { class: "cx-chips" }, [2, 3, 4].map((n) => h("button", { type: "button", class: "cx-chip" + (size === n ? " on" : ""), "data-size": n, onclick: () => { size = n; paint(); } }, [n + " players"]))));
  };
  paint();
  const m = modal([
    h("h2", { text: (hasTable ? "Invite " : "Challenge ") + (p.name || p.username) }),
    hasTable ? h("p", { class: "cx-hint", text: "They will join your table of " + state.table.size + " players if they accept." }) : sizeRow,
    learnMore([
      "They will see your request and can accept or decline.",
      "Snakes and Ladders takes 2 to 4 players. With 3 or 4 players you get a table: invite more people, and the game starts when every seat is taken or you press Start now.",
      "You have 30 seconds for each turn. If time runs out the die is rolled for you, and after three missed turns in a row you leave the game.",
    ]),
    h("div", { class: "row" }, [
      h("button", { type: "button", class: "cx-btn ghost", onclick: () => m.close() }, ["Cancel"]),
      h("button", { type: "button", class: "cx-btn", id: "cxSend", onclick: async (e) => {
        const btn = e.currentTarget; busy(btn, true);
        try {
          await api(BASE + "/challenge", { toUid: p.uid, size });
          if (!hasTable) { state.size = size; save("size", size); }
          m.close();
          toast((hasTable || size > 2 ? "Invite" : "Request") + " sent to " + (p.name || p.username) + ".");
        } catch (err) { busy(btn, false); toast(err.message); }
      } }, ["Send request"]),
    ]),
  ]);
}

function requestRow(r) {
  const left = Math.max(0, Math.round((r.expiresAt - serverNow()) / 1000));
  return h("div", { class: "cx-req", "data-req": r.id }, [avatar(r.from), h("div", { class: "cx-pinfo" }, [nameWithBadge(r.from.name || r.from.username, r.from.verified), h("span", { text: "wants to play Snakes and Ladders | " + (r.size > 2 ? r.size + " players | " : "") + left + "s" })]),
    h("div", { class: "acts" }, [
      h("button", { type: "button", class: "cx-btn sm", "data-accept": r.id, onclick: () => respondChallenge(r, true) }, ["Accept"]),
      h("button", { type: "button", class: "cx-btn ghost sm", "data-decline": r.id, onclick: () => respondChallenge(r, false) }, ["Decline"]),
    ])]);
}

async function respondChallenge(r, accept) {
  if (accept && state.game && state.game.mode === "bot" && !state.game.over) {
    if (!(await confirmModal("Leave your game?", "Your game against the computer will be closed.", "Leave and accept", "Keep playing", false))) return;
  }
  try {
    await api(BASE + "/challenge/" + encodeURIComponent(r.id) + "/respond", { accept });
    state.incoming = state.incoming.filter((x) => x.id !== r.id);
    renderLobby();
  } catch (e) { toast(e.message); }
}

function renderLobby() {
  if ($("cxMenu") && !$("cxMenu").hidden) {
    const a = document.activeElement;
    const focused = a && (a.id === "cxSearch" || a.id === "cxWatchCode" || a.id === "cxWatchPin") ? a : null;
    const id = focused && focused.id, pos = focused ? focused.selectionStart : 0;
    renderMenu();
    if (id && $(id)) { $(id).focus(); try { $(id).setSelectionRange(pos, pos); } catch { /* ignore */ } }
  }
}

setInterval(() => {
  const now = serverNow();
  const gone = state.incoming.filter((r) => r.expiresAt <= now);
  if (gone.length) { state.incoming = state.incoming.filter((r) => r.expiresAt > now); renderLobby(); }
  document.querySelectorAll("[data-req]").forEach((el) => {
    const r = state.incoming.find((x) => x.id === el.getAttribute("data-req"));
    const span = el.querySelector(".cx-pinfo span");
    if (r && span) span.textContent = "wants to play Snakes and Ladders | " + (r.size > 2 ? r.size + " players | " : "") + Math.max(0, Math.round((r.expiresAt - now) / 1000)) + "s";
  });
}, 1000);
setInterval(() => { if (!document.hidden && state.tab === "online" && !$("cxMenu").hidden) { loadPlayers(); loadLinks(); } }, 12000);

/* ------------------------------------------------------------------ guest links */
function guestEndedCard(title, text) {
  return h("div", { class: "cx-card cx-ended", style: "text-align:center" }, [h("h1", { text: title }), h("p", { text }), h("a", { class: "cx-btn", href: "/snakes" }, ["Create game"])]);
}
function showGuestEnded() {
  if (!GUEST_TOKEN || !state.guest) return;
  if (state.game) { state.game.token++; state.game = null; }
  voice.stop();
  if (es) { es.close(); es = null; }
  $("cxVoiceDock").hidden = true; $("cxGame").hidden = true;
  state.guest.joined = false; state.guestWait = null;
  state.guest.info = null;
  renderGuest();
  refreshGuestInfo();
}
async function refreshGuestInfo() {
  try { state.guest.info = await api("/api/snakes/guest/info/" + encodeURIComponent(GUEST_TOKEN)); }
  catch (e) { state.guest.info = { status: "error", error: e.message }; }
  renderGuest();
}
function renderGuest() {
  if (!GUEST_TOKEN) return;
  const root = $("cxGuest");
  if (!root) return;
  if (state.game) { root.hidden = true; return; }
  const keepName = $("cxGuestName") ? $("cxGuestName").value : state.guest.name;
  root.hidden = false; root.textContent = "";
  const info = state.guest.info;
  const card = (kids) => root.appendChild(h("div", { class: "cx-card", style: "text-align:center" }, kids));
  if (!info) { card([h("div", { class: "cx-loading" }, [h("span", { class: "cx-roll" }), "Opening game link"])]); return; }
  if (info.status === "finished") {
    const winner = info.result && info.result.winner;
    root.appendChild(guestEndedCard("Game finished", (winner == null ? "The game is over." : SEAT_NAMES[SEAT_COLORS[winner]] + " won the game.") + " This link will expire shortly."));
    return;
  }
  if (info.status === "ended" || info.status === "expired") { root.appendChild(guestEndedCard("Game link expired", "This invitation is no longer active. Ask your friend for a new link.")); return; }
  if (info.status === "error") { card([h("h2", { text: "Could not open the game" }), h("p", { class: "cx-hint", text: info.error || "Check your connection and try again." }), h("button", { type: "button", class: "cx-btn", onclick: refreshGuestInfo }, ["Try again"])]); return; }
  if (info.status === "playing" && !info.you) { root.appendChild(guestEndedCard("This link is already in use", "Someone else has joined this one-use invitation.")); return; }
  const host = info.host || {};
  const hostLine = h("div", { class: "cx-hostline" }, [avatar({ name: host.name || host.username, photo: host.photo })]);
  if (state.guest.joined) {
    const waiting = state.conn === "unavailable"
      ? [h("p", { class: "cx-hint", text: "Could not connect. Check your internet and try again." }), h("button", { type: "button", class: "cx-btn", onclick: () => { retries = 0; connect(); } }, ["Reconnect"])]
      : state.guestWait
        ? [h("p", { class: "cx-hint", text: state.guestWait }), h("button", { type: "button", class: "cx-btn", onclick: async (e) => { busy(e.currentTarget, true); try { await api("/api/snakes/guest/start", {}); } catch (err) { toast(err.message); } busy(e.currentTarget, false); } }, ["Try again"])]
        : [h("div", { class: "cx-loading" }, [h("span", { class: "cx-roll" }), "Starting your game"])];
    card([hostLine, h("h2", { text: "Playing " + (host.name || host.username || "the host") }), ...waiting]);
    return;
  }
  const input = h("input", { class: "cx-field", id: "cxGuestName", type: "text", maxlength: "20", placeholder: "Your name", autocomplete: "off", value: keepName || "" });
  card([hostLine, h("h2", { text: (host.name || host.username || "Someone") + " invited you to play Snakes and Ladders" }), h("p", { class: "cx-hint", style: "margin-top:8px", text: "No account needed. Pick a name and join." }), input,
    h("button", { type: "button", class: "cx-btn", id: "sxGuestJoin", onclick: (e) => joinSnakesGuest(e.currentTarget, input) }, ["Join game"])]);
}
async function joinSnakesGuest(btn, input) {
  const name = input.value.trim();
  if (name.length < 2) { toast("Enter a name (at least 2 letters)."); return; }
  busy(btn, true);
  try {
    await api("/api/snakes/guest/join/" + encodeURIComponent(GUEST_TOKEN), { name });
    save("guestname", name); state.guest.name = name; state.guest.joined = true;
    state.guest.info.you = true; state.guest.info.status = "playing";
    renderGuest(); retries = 0; connect();
  } catch (e) {
    busy(btn, false); toast(e.message);
    if (["ended", "playing", "expired"].includes(e.code)) refreshGuestInfo();
  }
}
async function initGuest() {
  $("cxMenu").hidden = true;
  const back = $("cxBack"); if (back) back.setAttribute("href", "/snakes");
  const cog = $("cxCog"); if (cog) cog.style.display = "none";
  renderGuest();
  await refreshGuestInfo();
  if (state.guest.info.you && state.guest.info.status === "playing") { state.guest.joined = true; retries = 0; connect(); }
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
  try { const d = await api("/api/chess/me"); if (!state.me) { state.me = d.me; applyTheme(); if (state.game) paintPlayers(); } } catch { /* the stream also tells us */ }
}

function init() {
  wireSound();
  const cog = $("cxCog");
  if (cog) {
    cog.addEventListener("click", openSettings);
    cog.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSettings(); } });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { saveGame(); return; }
    if (!es || es.readyState === EventSource.CLOSED) { retries = 0; connect(); }
    const g = state.game;
    if (g && g.mode === "online" && !g.over) resync();
    if (g && g.mode === "bot") botStep();
  });
  window.addEventListener("pagehide", saveGame);
  window.addEventListener("online", () => { retries = 0; connect(); });
  window.addEventListener("beforeunload", (e) => { const g = state.game; if (g && g.mode === "online" && !g.over && !g.spectator) { e.preventDefault(); e.returnValue = ""; } });
  const watch = new URLSearchParams(location.search).get("watch");
  if (watch) { state.tab = "online"; state.watchCode = String(watch).toUpperCase().slice(0, 6); }
  if (GUEST_TOKEN) { initGuest(); return; }
  if (!restoreBotGame()) renderMenu();
  loadMe();
  connect();
}
init();
window.__snakes = { state };
