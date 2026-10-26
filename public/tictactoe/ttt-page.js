import { MARKS, newState, move as engineMove, chooseMove, viewOf, seatOfTurn, emptyCells } from "/tictactoe/ttt-engine.js";
import { sound } from "/chess/chess-sound.js";
import { createVoice } from "/ludo/ludo-voice.js";

const BASE = "/api/tictactoe";
const STREAM = "/api/chess/stream";
const GUEST_MATCH = /^\/tictactoe\/guest\/([A-Za-z0-9_-]{6,40})\/?$/.exec(location.pathname);
const GUEST_TOKEN = GUEST_MATCH ? GUEST_MATCH[1] : "";
const GAME_API = () => GUEST_TOKEN ? BASE + "/guest" : BASE;
const SAVE_KEY = "tx_savedgame";
const MARK_HEX = { X: "#00E0FF", O: "#FF3B5C" };
const BOT_IMG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#04141a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 10v7"/><circle cx="32" cy="8" r="2.4"/><rect x="12" y="17" width="40" height="32" rx="9"/><circle cx="24" cy="31" r="3.4"/><circle cx="40" cy="31" r="3.4"/><path d="M24 41h16"/><path d="M6 31v8M58 31v8"/></svg>');
const LEVELS = [
  { id: "easy", name: "Easy", note: "Plays almost anywhere. Easy to beat.", mark: "1" },
  { id: "medium", name: "Medium", note: "Takes wins and blocks yours, but slips up now and then.", mark: "2" },
  { id: "hard", name: "Hard", note: "Plays perfectly. The best you can do is draw.", mark: "3" },
];
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

function store(key, fallback) { try { const v = localStorage.getItem("tx_" + key); return v == null ? fallback : v; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem("tx_" + key, String(value)); } catch { /* private mode */ } }

const state = {
  tab: "computer",
  me: null, conn: "connecting", resuming: false,
  players: [], incoming: [], outgoing: [], table: null, search: "", offset: 0, loadingPlayers: false,
  game: null, watchCode: "", watchNeedsPin: false, links: [], guest: { info: null, name: "", joined: false }, guestWait: "",
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
        h("button", { type: "button", class: "cx-btn ghost", id: "txConfirmNo", onclick: () => done(false) }, [no || "Cancel"]),
        h("button", { type: "button", class: "cx-btn" + (danger ? " danger" : ""), id: "txConfirmYes", onclick: () => done(true) }, [yes || "OK"]),
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
  const requestPath = GUEST_TOKEN && path.startsWith(BASE + "/guest/")
    ? path + (path.includes("?") ? "&" : "?") + "invite=" + encodeURIComponent(GUEST_TOKEN)
    : path;
  const res = await fetch(requestPath, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Please try again."), { code: data.code, status: res.status });
  return data;
}
function learnMore(paragraphs) {
  return h("details", { class: "cx-learn mini" }, [h("summary", { text: "Learn more" }), h("div", {}, paragraphs.map((t) => h("p", { text: t })))]);
}
const isVerifiedMe = () => !!(state.me && state.me.verified);

state.level = LEVELS.some((l) => l.id === store("level")) ? store("level") : "medium";
state.mark = ["X", "O", "random"].includes(store("mark")) ? store("mark") : "X";
state.score = { win: 0, lose: 0, draw: 0 };

const RULES = [
  "Take turns to place your mark in an empty square. X always goes first.",
  "Get three of your marks in a row, across, down or corner to corner, and you win.",
  "If all nine squares are full and nobody has three in a row, it is a draw.",
  "Online, a coin flip decides who plays X. You have 30 seconds for each move.",
];
const MARK_SVG = {
  X: '<svg class="tx-svg" viewBox="0 0 100 100" aria-hidden="true"><path class="x" pathLength="1" d="M24 24 76 76M76 24 24 76"/></svg>',
  O: '<svg class="tx-svg" viewBox="0 0 100 100" aria-hidden="true"><circle class="o" pathLength="1" cx="50" cy="50" r="27"/></svg>',
};
const cellName = (i) => "row " + (Math.floor(i / 3) + 1) + ", column " + ((i % 3) + 1);

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
const botProfile = (seat) => ({ seat, mark: MARKS[seat], bot: true, name: "Computer", username: "computer", online: true, out: false });
const myProfile = (seat) => ({ seat, mark: MARKS[seat], name: (state.me && (state.me.name || state.me.username)) || "You", username: (state.me && state.me.username) || "", photo: state.me && state.me.photo, verified: !!(state.me && state.me.verified), online: true, out: false });

function newGame(o) {
  return Object.assign({ mode: "bot", id: null, key: null, you: 0, players: [], view: null, deadline: 0, seq: 0, room: null, spectator: false, over: false, result: null,
    queue: [], playing: false, acting: false, log: [], token: 0, st: null, level: "medium", roomCode: "", painted: Array(9).fill(null), finishTimer: 0 }, o);
}
function startBotGame() {
  const old = state.game;
  if (old && old.mode === "bot") old.token++;
  const you = state.mark === "random" ? (Math.random() < 0.5 ? 0 : 1) : state.mark === "O" ? 1 : 0;
  const st = newState();
  const players = [0, 1].map((s) => (s === you ? myProfile(s) : botProfile(s)));
  const g = newGame({ mode: "bot", you, players, st, level: state.level, token: (old ? old.token : 0) + 1 });
  g.view = viewOf(st);
  document.querySelectorAll(".cx-ov").forEach((x) => x.remove());
  beginGame(g, {});
}

function buildBoard() {
  const root = $("cxBoard");
  let cells = "";
  for (let i = 0; i < 9; i++) cells += '<button type="button" class="tx-cell" data-i="' + i + '" aria-label="' + cellName(i) + ', empty"><span class="tx-ghost"></span></button>';
  root.innerHTML = '<div class="tx-grid" id="txGrid">' + cells + '</div><svg class="tx-line" viewBox="0 0 3 3" aria-hidden="true"><line id="txLine" x1="0" y1="0" x2="0" y2="0" pathLength="1"/></svg>';
  root.querySelectorAll(".tx-cell").forEach((b) => b.addEventListener("click", () => onCell(Number(b.getAttribute("data-i")))));
}

function setTttGameAdState(active) {
  document.body.classList.toggle("tx-game-active", !!active);
  window.dispatchEvent(new Event("es-game-session-change"));
}

function beginGame(g, opts = {}) {
  voice.stop();
  setTttGameAdState(true);
  state.game = g;
  g.painted = Array(9).fill(null);
  $("cxMenu").hidden = true;
  $("cxGuest").hidden = true;
  $("cxGame").hidden = false;
  const back = $("cxBack");
  if (back) back.setAttribute("href", "/");
  buildBoard();
  applyTheme();
  paintAll(true);
  if (g.mode === "bot") { saveGame(); botStep(); }
  else {
    startVoiceFor(g);
    paintVoice();
    if (!opts.resume && !g.spectator) toast("Game started. You play " + MARKS[g.you] + (g.you === 0 ? " and go first." : "."));
  }
}

const isMyTurn = (g) => !!g && !g.over && !g.spectator && g.you != null && g.view.turn === g.you && !(g.view.winner != null || g.view.draw);
const playerOfSeat = (g, seat) => g.players.find((p) => p.seat === seat);
function playerLabel(g, p) {
  if (!p) return "Player";
  if (p.bot) return p.name;
  if (g.mode === "bot") return p.name || "You";
  return p.seat === g.you ? "You" : (p.name || p.username || "Player");
}
const seatName = (g, seat) => { const p = playerOfSeat(g, seat); return p ? playerLabel(g, p) : MARKS[seat]; };
const youOrName = (g, seat, you) => (seat === g.you ? you : seatName(g, seat));

function paintAll(first) {
  const g = state.game;
  if (!g) return;
  paintPlayers();
  paintBoard(first);
  paintStatus();
  paintLog();
  paintScore();
  paintControls();
  paintVoice();
}

function paintPlayers() {
  const g = state.game;
  const box = $("cxTop");
  box.textContent = "";
  box.className = "tx-players";
  const v = g.view;
  const order = [...g.players].sort((a, b) => (a.seat === g.you ? -1 : 0) - (b.seat === g.you ? -1 : 0) || a.seat - b.seat);
  for (const p of order) {
    const mark = MARKS[p.seat];
    const mine = p.seat === g.you;
    const live = v.turn === p.seat && !g.over;
    const status = g.mode === "online" && !mine && !p.bot ? (p.online === false ? "offline" : "available") : null;
    const badge = h("span", { class: "tx-badge", text: mark });
    badge.style.setProperty("--mc", MARK_HEX[mark]);
    box.appendChild(h("div", { class: "tx-pl" + (live ? " live" : "") + (mine ? " me" : "") + (v.winner === p.seat ? " won" : ""), "data-seat": p.seat, "data-mark": mark, style: "--pc:" + MARK_HEX[mark] }, [
      avatar(p, status),
      h("div", { class: "tx-pin" }, [nameWithBadge(playerLabel(g, p), p.verified), h("span", { text: "Plays " + mark })]),
      badge,
      h("div", { class: "tx-pt", "data-timer": p.seat }),
    ]));
  }
  tickTimer();
}

function tickTimer() {
  const g = state.game;
  if (!g || g.mode === "bot") return;
  document.querySelectorAll("[data-timer]").forEach((el) => {
    const seat = Number(el.getAttribute("data-timer"));
    const live = !g.over && g.view.turn === seat;
    el.textContent = live && g.deadline ? Math.max(0, Math.ceil((g.deadline - serverNow()) / 1000)) + "s" : "";
    el.classList.toggle("low", live && g.deadline - serverNow() < 8000);
  });
}
setInterval(tickTimer, 500);

function paintBoard(first) {
  const g = state.game;
  const v = g.view;
  const myTurn = isMyTurn(g);
  const grid = $("txGrid");
  if (!grid) return;
  grid.classList.toggle("over", g.over || v.winner != null || v.draw);
  grid.classList.toggle("drawn", !!v.draw);
  const myMark = g.you != null ? MARKS[g.you] : null;
  grid.querySelectorAll(".tx-cell").forEach((b) => {
    const i = Number(b.getAttribute("data-i"));
    const m = v.board[i];
    const had = g.painted[i];
    if (m !== had) {
      b.querySelectorAll(".tx-svg").forEach((s) => s.remove());
      if (m != null) {
        b.insertAdjacentHTML("beforeend", MARK_SVG[MARKS[m]]);
        const svg = b.querySelector(".tx-svg");
        svg.style.setProperty("--mc", MARK_HEX[MARKS[m]]);
        if (!first && had == null && !reduceMotion()) svg.classList.add("draw");
      }
      g.painted[i] = m;
    }
    const can = myTurn && m == null && !g.acting;
    b.classList.toggle("can", can);
    b.classList.toggle("win", !!(v.line && v.line.includes(i)));
    b.classList.toggle("lastmove", !!(g.lastCell === i && !v.line));
    b.disabled = !can;
    b.setAttribute("aria-label", cellName(i) + ", " + (m == null ? "empty" : MARKS[m]));
    const ghost = b.querySelector(".tx-ghost");
    if (ghost && myMark && ghost.getAttribute("data-m") !== myMark) { ghost.innerHTML = MARK_SVG[myMark]; ghost.setAttribute("data-m", myMark); ghost.style.setProperty("--mc", MARK_HEX[myMark]); }
  });
  const line = $("txLine");
  if (line) {
    if (v.line) {
      const c = (n) => ({ x: (n % 3) + 0.5, y: Math.floor(n / 3) + 0.5 });
      const a = c(v.line[0]), z = c(v.line[2]);
      const dx = z.x - a.x, dy = z.y - a.y, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      line.setAttribute("x1", a.x - ux * 0.3); line.setAttribute("y1", a.y - uy * 0.3);
      line.setAttribute("x2", z.x + ux * 0.3); line.setAttribute("y2", z.y + uy * 0.3);
      line.style.setProperty("--mc", MARK_HEX[MARKS[v.winner]]);
      if (!line.classList.contains("on")) { line.classList.add("on"); if (!first && !reduceMotion()) line.classList.add("anim"); }
    } else { line.classList.remove("on", "anim"); }
  }
}

function paintStatus() {
  const g = state.game;
  const v = g.view;
  const el = $("cxStatus"), note = $("cxNote");
  note.hidden = true;
  let color = null, text = "";
  if (v.winner != null) { text = g.spectator ? seatName(g, v.winner) + " (" + MARKS[v.winner] + ") wins" : v.winner === g.you ? "You win!" : seatName(g, v.winner) + " wins"; color = v.winner; }
  else if (v.draw) text = "It is a draw";
  else if (g.spectator) { text = seatName(g, v.turn) + " is playing " + MARKS[v.turn]; color = v.turn; }
  else if (isMyTurn(g)) { color = g.you; text = "Your turn. Place your " + MARKS[g.you] + "."; }
  else if (v.turn != null) { color = v.turn; text = g.mode === "bot" ? "Computer is thinking..." : seatName(g, v.turn) + " is playing..."; }
  el.textContent = text;
  el.style.setProperty("--sc", color != null ? MARK_HEX[MARKS[color]] : "var(--accent)");
  if (g.mode === "online" && !g.over && g.players.some((p) => p.seat !== g.you && p.online === false && !p.out)) {
    note.hidden = false;
    note.textContent = "Your opponent lost their connection. They have a few minutes to come back.";
  }
}

function describe(g, ev) {
  if (ev.type === "out") return youOrName(g, ev.seat, "You") + " left the game";
  if (ev.type !== "move") return "";
  const who = youOrName(g, ev.seat, "You");
  let t = who + " placed " + ev.mark + " in " + cellName(ev.cell);
  if (ev.win) t += " | three in a row!";
  else if (ev.draw) t += " | the board is full";
  return t + (ev.auto ? " (time ran out)" : "");
}
function addLog(g, text) { if (text) { g.log.unshift(text); g.log = g.log.slice(0, 5); } }
function paintLog() {
  const g = state.game;
  const box = $("cxMoves");
  box.textContent = "";
  for (const t of g.log) box.appendChild(h("div", { class: "tx-log", text: t }));
}

/* a running tally against the computer, kept while the page is open */
function paintScore() {
  const g = state.game;
  const box = $("cxBottom");
  box.textContent = "";
  box.className = "tx-score";
  if (g.mode !== "bot") return;
  const s = state.score;
  const pill = (label, n, cls) => h("div", { class: "tx-pill " + cls }, [h("b", { text: String(n) }), h("span", { text: label })]);
  box.appendChild(pill("You", s.win, "w"));
  box.appendChild(pill("Draws", s.draw, "d"));
  box.appendChild(pill("Computer", s.lose, "l"));
}

function paintControls() {
  const g = state.game;
  const box = $("cxControls");
  box.textContent = "";
  const over = g.over;
  if (g.spectator) {
    box.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "txStopWatch", onclick: stopWatching }, [over ? "Close" : "Stop watching"]));
    return;
  }
  if (over) {
    if (g.mode === "online") {
      if (GUEST_TOKEN) box.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxGuestFinish", onclick: showGuestEnded }, ["Finish"]));
      else {
        const opp = g.players.find((p) => p.seat !== g.you);
        if (opp) box.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxRematch", onclick: rematch }, ["Rematch"]));
        box.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "txMenuBtn", onclick: leaveGame }, ["Menu"]));
      }
    } else box.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxNew", onclick: startBotGame }, ["Play again"]));
    if (g.mode !== "online") box.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "txMenuBtn", onclick: leaveGame }, ["Menu"]));
    return;
  }
  if (g.mode === "bot") box.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "txRestart", onclick: onRestart }, ["Restart"]));
  box.appendChild(h("button", { type: "button", class: "cx-btn danger sm", id: "txResign", onclick: onResign }, [g.mode === "bot" ? "Quit game" : "Resign"]));
  if (!GUEST_TOKEN) box.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "txMenuBtn", onclick: leaveAsk }, ["Menu"]));
}

async function onRestart() {
  const g = state.game;
  if (!g || g.mode !== "bot") return;
  if (g.view.board.some((x) => x != null) && !(await confirmModal("Restart this game?", "The board will be cleared and you start again.", "Restart", "Keep playing", true))) return;
  if (state.game === g) startBotGame();
}
async function leaveAsk() {
  const g = state.game;
  if (!g) return;
  if (g.mode === "online" && !g.over) { toast("Resign if you want to stop this game."); return; }
  if (g.mode === "bot" && !g.over && g.view.board.some((x) => x != null) && !(await confirmModal("Leave this game?", "Your game against the computer will be closed.", "Leave", "Keep playing", true))) return;
  leaveGame();
}
function leaveGame() {
  const g = state.game;
  if (g) clearTimeout(g.finishTimer);
  if (g && g.mode === "bot") { g.token++; clearSaved(); }
  voice.stop();
  setTttGameAdState(false);
  state.game = null;
  $("cxGame").hidden = true;
  $("cxVoiceDock").hidden = true;
  document.querySelectorAll(".cx-ov").forEach((x) => x.remove());
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
  const ok = await confirmModal(g.mode === "bot" ? "Quit this game?" : "Resign?", g.mode === "bot" ? "Your game against the computer will be closed." : "You will lose this game.", g.mode === "bot" ? "Quit" : "Resign", "Keep playing", true);
  if (!ok || state.game !== g || g.over) return;
  if (g.mode === "bot") { g.token++; clearSaved(); leaveGame(); return; }
  try { await api(GAME_API() + "/game/" + encodeURIComponent(g.id) + "/resign", { key: g.key }); } catch (e) { toast(e.message); }
}
async function rematch() {
  const g = state.game;
  const opp = g && g.players.find((p) => p.seat !== g.you);
  if (!opp) return;
  try { await api(BASE + "/challenge", { toUid: opp.uid }); toast("Rematch request sent."); leaveGame(); } catch (err) { toast(err.message); }
}

/* ------------------------------------------------------------------ playing */
async function onCell(i) {
  const g = state.game;
  if (!g || g.over || g.spectator || g.acting) return;
  if (!isMyTurn(g)) { if (g.view.turn != null) toast("It is not your turn."); return; }
  if (g.view.board[i] != null) { toast("That square is taken."); return; }
  g.acting = true;
  try {
    if (g.mode === "bot") {
      const ev = engineMove(g.st, g.you, i);
      if (ev.ok === false) { toast("You cannot play there."); return; }
      applyEvent(g, ev, viewOf(g.st), g.players, 0);
      botStep();
    } else {
      g.pending = i;
      await api(GAME_API() + "/game/" + encodeURIComponent(g.id) + "/move", { key: g.key, cell: i });
    }
  } catch (e) {
    toast(e.message);
    if (e.code === "not_your_turn" || e.code === "taken") resync();
  } finally { g.acting = false; g.pending = null; if (state.game === g) paintBoard(); }
}

/* the computer: a short think, then it moves */
async function botStep() {
  const g = state.game;
  if (!g || g.mode !== "bot" || g.over || g.botBusy) return;
  const token = g.token;
  g.botBusy = true;
  try {
    while (state.game === g && g.token === token && !g.over && !isOverState(g)) {
      const seat = seatOfTurn(g.st);
      if (seat === g.you) break;
      if (document.hidden) break;
      await sleep(g.level === "hard" ? 600 : 450 + Math.floor(Math.random() * 450));
      if (state.game !== g || g.token !== token || g.over || document.hidden || seatOfTurn(g.st) !== seat) continue;
      const cell = chooseMove(g.st, seat, g.level);
      const ev = engineMove(g.st, seat, cell);
      if (ev.ok === false) { console.error("[tictactoe] computer move refused", ev); break; }
      applyEvent(g, ev, viewOf(g.st), g.players, 0);
    }
  } finally { g.botBusy = false; }
}
const isOverState = (g) => g.st.winner != null || g.st.draw;

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
    if (!d || d.v !== 1 || !d.st || d.st.winner != null || d.st.draw || !Array.isArray(d.players) || !Array.isArray(d.st.board)) { clearSaved(); return false; }
    const g = newGame({ mode: "bot", you: d.you || 0, players: d.players, st: d.st, log: d.log || [], level: d.level || "medium" });
    g.view = viewOf(d.st);
    beginGame(g, { resume: true });
    return true;
  } catch { clearSaved(); return false; }
}

/* a move happened (ours, the computer's, or an online opponent's) */
function applyEvent(g, ev, view, players, deadline) {
  g.view = view;
  if (players) g.players = players;
  if (deadline !== undefined) g.deadline = deadline;
  if (ev && ev.type === "move") { g.lastCell = ev.cell; sound.move(); }
  paintAll(false);
  if (ev) { addLog(g, describe(g, ev)); paintLog(); }
  if (ev && ev.type === "out" && ev.seat === g.you && g.mode === "online") {
    setTimeout(() => { if (state.game === g && !g.over) { toast("You left the game."); leaveGame(); } }, 900);
  }
  if (g.mode === "bot") {
    saveGame();
    if (view.winner != null || view.draw) finishGame(view.winner, view.winner != null ? "line" : "draw", view, g.players, { line: view.line });
  }
}
function present(p) {
  const g = state.game;
  if (g) applyEvent(g, p.event, p.view, p.players, p.deadline);
}

/* the board and the winning line stay on screen for a moment before the result pops up */
function finishGame(winner, reason, view, players, result) {
  const g = state.game;
  if (!g || g.over) return;
  g.over = true;
  if (g.mode === "online") { try { voice.stop(); } catch { /* voice is optional */ } }
  g.result = { winner, reason };
  if (view) g.view = view;
  if (players) g.players = players;
  if (g.mode === "bot") {
    clearSaved();
    if (winner === g.you) state.score.win++; else if (winner == null) state.score.draw++; else state.score.lose++;
  }
  paintAll(false);
  const delay = reduceMotion() ? 200 : reason === "line" ? 1100 : 700;
  clearTimeout(g.finishTimer);
  g.finishTimer = setTimeout(() => { if (state.game === g) showResult(g, winner, reason); }, delay);
}
function showResult(g, winner, reason) {
  try {
    if (winner == null) sound.draw();
    else if (g.spectator || winner === g.you) sound.win();
    else sound.lose();
  } catch { /* optional */ }
  const won = winner != null && winner === g.you;
  const w = winner != null ? playerOfSeat(g, winner) : null;
  const wname = w ? playerLabel(g, w) : "";
  const why = reason === "resigned" ? (g.spectator ? "The other player resigned." : won ? "Your opponent resigned." : "You resigned.")
    : reason === "left" ? (won ? "Your opponent left the game." : "You were away for too long.")
    : reason === "timeout" ? (won ? "Your opponent ran out of time." : "You missed too many turns.")
    : reason === "draw" ? "The board is full and nobody has three in a row."
    : won ? "You got three " + MARKS[g.you] + " in a row." : wname + " got three " + MARKS[winner] + " in a row.";
  const title = winner == null ? "It is a draw" : g.spectator ? wname + " won" : won ? "You won!" : g.mode === "bot" ? "Computer won" : wname + " won";
  const m = modal([h("div", { class: "tx-bigmark" }), h("h2", { text: title }), h("p", { class: "cx-hint", style: "margin-top:8px", text: why })]);
  if (winner != null) { const bm = m.el.querySelector(".tx-bigmark"); bm.innerHTML = MARK_SVG[MARKS[winner]]; bm.style.setProperty("--mc", MARK_HEX[MARKS[winner]]); } else m.el.querySelector(".tx-bigmark").remove();
  if (g.mode === "bot") {
    const s = state.score;
    m.el.querySelector(".cx-modal").appendChild(h("div", { class: "tx-tally", text: "You " + s.win + "   Draws " + s.draw + "   Computer " + s.lose }));
  }
  const row = h("div", { class: "row" });
  if (GUEST_TOKEN) {
    row.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxGuestFinish", onclick: () => { m.close(); showGuestEnded(); } }, ["Finish"]));
  } else if (g.mode === "bot") {
    row.appendChild(h("button", { type: "button", class: "cx-btn ghost", onclick: () => { m.close(); leaveGame(); } }, ["Menu"]));
    row.appendChild(h("button", { type: "button", class: "cx-btn", id: "txPlayAgain", onclick: () => { m.close(); startBotGame(); } }, ["Play again"]));
  } else {
    row.appendChild(h("button", { type: "button", class: "cx-btn ghost", onclick: () => { m.close(); if (g.spectator) stopWatching(); else leaveGame(); } }, ["Menu"]));
    const opp = g.players.find((p) => p.seat !== g.you);
    if (!g.spectator && opp) {
      row.appendChild(h("button", { type: "button", class: "cx-btn", id: "txRematch", onclick: async (e) => {
        const btn = e.currentTarget; busy(btn, true);
        try { await api(BASE + "/challenge", { toUid: opp.uid }); toast("Rematch request sent."); m.close(); leaveGame(); } catch (err) { busy(btn, false); toast(err.message); }
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
  root.appendChild(h("div", { class: "cx-hero" }, [h("h1", { text: "Tic-Tac-Toe" }), h("p", { text: "Three in a row wins. Play the computer, or challenge someone who is online." })]));
  root.appendChild(h("div", { class: "cx-tabs" }, [
    h("button", { class: "cx-tab" + (state.tab === "computer" ? " on" : ""), id: "tabComputer", type: "button", onclick: () => { state.tab = "computer"; renderMenu(); } }, [html("span", "", ICON.cpu).firstChild, "Computer"]),
    h("button", { class: "cx-tab" + (state.tab === "online" ? " on" : ""), id: "tabOnline", type: "button", onclick: () => { state.tab = "online"; renderMenu(); loadPlayers(); } }, [html("span", "", ICON.users).firstChild, "Online", pending ? h("span", { class: "badge", text: String(pending) }) : null]),
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
  card.appendChild(h("div", { class: "cx-h", text: "You play as" }));
  card.appendChild(h("div", { class: "cx-chips" }, [["X", "X (first)"], ["O", "O (second)"], ["random", "Random"]].map(([id, label]) => h("button", {
    type: "button", class: "cx-chip" + (state.mark === id ? " on" : ""), "data-mark": id, onclick: () => { state.mark = id; save("mark", id); renderMenu(); },
  }, [label]))));
  card.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxStartBot", onclick: (e) => { busy(e.currentTarget, true); setTimeout(startBotGame, 180); } }, ["Start game"]));
  card.appendChild(learnMore(RULES.concat(["A game in progress is saved on this device, so you can leave and come back to it."])));
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
  if (state.outgoing.length) {
    card.appendChild(h("div", { class: "cx-h", text: "Waiting for an answer" }));
    for (const o of state.outgoing) {
      card.appendChild(h("div", { class: "cx-wait", "data-out": o.id }, [avatar(o.to), h("div", { class: "grow" }, [nameWithBadge(o.to.name || o.to.username, o.to.verified), h("div", { class: "cx-sub", text: "Tic-Tac-Toe | waiting..." })]),
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
  card.appendChild(guestLinkBox());
}

/* ------------------------------------------------------------------ guest links (host side) */
function guestLinkUrl(token) { return location.origin + "/tictactoe/guest/" + token; }
function leftText(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  if (m >= 120) return Math.round(m / 60) + " hours left";
  if (m >= 60) return "1 hour left";
  return m + " min left";
}
async function shareTttLink(url, fresh) {
  const text = "Play Tic-Tac-Toe with me. No account needed.";
  if (navigator.share && !fresh) {
    try { await navigator.share({ title: "Tic-Tac-Toe", text, url }); return; }
    catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); toast(fresh ? "Game link created and copied." : "Link copied."); }
  catch { window.prompt("Copy this link", url); }
}
function guestLinkBox() {
  const box = h("div", { class: "cx-guestbox", id: "cxGuestBox" });
  box.appendChild(h("div", { class: "cx-h", text: "Play with a guest" }));
  box.appendChild(h("p", { class: "cx-sub", style: "margin:10px 0", text: "Invite someone without an account. Tic-Tac-Toe is for exactly two players." }));
  box.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxMakeLink", onclick: (e) => createGuestLink(e.currentTarget) }, ["Create game link"]));
  box.appendChild(learnMore([
    "Your guest can join without creating an account. The link can only be used once.",
    "If nobody uses it, the link expires after 24 hours. It expires five minutes after the game ends.",
  ]));
  for (const link of state.links || []) {
    const url = guestLinkUrl(link.token);
    const playing = link.status === "playing";
    box.appendChild(h("div", { class: "cx-linkrow", "data-link": link.token }, [
      h("div", { class: "grow" }, [h("b", { text: "Guest game" }), h("span", { class: "cx-sub", text: playing ? "A guest is playing" : "Waiting for a guest | " + leftText(link.expiresAt - serverNow()) })]),
      h("div", { class: "acts" }, playing ? [] : [
        (() => { const share = h("button", { type: "button", class: "cx-vbtn sm on", "aria-label": "Share game link", onclick: () => shareTttLink(url, false) }); share.innerHTML = VI.share; return share; })(),
        h("button", { type: "button", class: "cx-btn ghost sm", onclick: (e) => cancelGuestLink(link, e.currentTarget) }, ["End"]),
      ]),
    ]));
  }
  return box;
}
async function loadGuestLinks() {
  if (GUEST_TOKEN || state.conn !== "online") return;
  try {
    const d = await api(BASE + "/guest/links");
    state.links = d.links || [];
    if (state.tab === "online" && $("cxMenu") && !$("cxMenu").hidden && !(document.activeElement && document.activeElement.matches("input"))) renderMenu();
  } catch { /* keep the last link list */ }
}
async function createGuestLink(btn) {
  busy(btn, true);
  try {
    const d = await api(BASE + "/guest/links", {});
    state.links = [d.link].concat(state.links || []);
    renderMenu();
    shareTttLink(guestLinkUrl(d.link.token), true);
  } catch (e) { busy(btn, false); toast(e.message); }
}
async function cancelGuestLink(link, btn) {
  busy(btn, true);
  try {
    await api(BASE + "/guest/links/" + encodeURIComponent(link.token) + "/cancel", {});
    state.links = (state.links || []).filter((item) => item.token !== link.token);
    renderMenu();
  } catch (e) { busy(btn, false); toast(e.message); }
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
    box.appendChild(h("div", { class: "cx-player", "data-uid": p.uid }, [avatar(p, p.status), h("div", { class: "cx-pinfo" }, [nameWithBadge(p.name || p.username, p.verified), h("span", { text: "@" + p.username + " | " + label })]),
      h("button", { type: "button", class: "cx-btn pill", "data-challenge": p.uid, disabled: can ? null : true, onclick: () => openChallengeSheet(p) }, [waiting ? "Sent" : "Challenge"])]));
  }
}

function openChallengeSheet(p) {
  const m = modal([
    h("h2", { text: "Challenge " + (p.name || p.username) }),
    h("p", { class: "cx-hint", text: "They will see your request and can accept or decline." }),
    learnMore([
      "Tic-Tac-Toe is a game for exactly 2 players. When they accept, a coin flip decides who plays X and goes first.",
      "You have 30 seconds for each move. If time runs out a move is made for you, and after three missed turns in a row you lose the game.",
      "If you lose your connection you have a few minutes to get back into the game.",
    ]),
    h("div", { class: "row" }, [
      h("button", { type: "button", class: "cx-btn ghost", onclick: () => m.close() }, ["Cancel"]),
      h("button", { type: "button", class: "cx-btn", id: "cxSend", onclick: async (e) => {
        const btn = e.currentTarget; busy(btn, true);
        try {
          await api(BASE + "/challenge", { toUid: p.uid });
          m.close();
          toast("Request sent to " + (p.name || p.username) + ".");
        } catch (err) { busy(btn, false); toast(err.message); }
      } }, ["Send request"]),
    ]),
  ]);
}

/* ------------------------------------------------------------------ voice and rooms (same as chess and Ludo) */
const voice = createVoice({
  post: (path, body) => api(GAME_API() + "/game/" + encodeURIComponent(body.gameId) + path, body),
  getIce: () => api(GUEST_TOKEN ? BASE + "/guest/ice" : BASE + "/ice"),
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

const roomLink = (code) => location.origin + "/tictactoe?watch=" + encodeURIComponent(code);
async function shareText(text, url) {
  if (navigator.share) { try { await navigator.share({ title: "Watch my Tic-Tac-Toe game", text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
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
    const d = await api(GAME_API() + "/game/" + encodeURIComponent(g.id) + "/room/settings", { key: g.key, ...body });
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
      share.addEventListener("click", () => shareText("Watch my Tic-Tac-Toe game. Room code " + room.code + (room.pinSet ? " (needs the PIN)" : ""), roomLink(room.code)));
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
      row(p.uid, (p.name || p.username || "Player") + (isMe ? " (you)" : "") + " | " + "Plays " + MARKS[p.seat], p.photo, "Player", !isMe, p.verified);
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
    try { const d = await api(GAME_API() + "/game/" + encodeURIComponent(g.id) + "/room", { key: g.key }); g.room = d; info = d; draw(); }
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
  if (GUEST_TOKEN) renderGuest();
  else renderLobby();
}

let guestConnectionSounded = false;
function playPing() { try { sound.ping(); } catch { /* sound is optional */ } }
function playGameStartPing(gameId) {
  if (GUEST_TOKEN) {
    if (!gameId || guestConnectionSounded) return;
    guestConnectionSounded = true;
  }
  playPing();
}

function connect() {
  clearTimeout(retryTimer);
  if (es) { es.close(); es = null; }
  setConn("connecting");
  es = new EventSource(GUEST_TOKEN ? BASE + "/guest/stream?invite=" + encodeURIComponent(GUEST_TOKEN) : STREAM);
  const on = (name, fn) => es.addEventListener(name, (e) => { let d = null; try { d = JSON.parse(e.data); } catch { return; } fn(d); });
  on("ping", () => {});
  on("hello", (d) => { retries = 0; state.me = d.me || state.me; state.resuming = false; applyTheme(); setConn("online"); if (state.game) { paintPlayers(); if (state.game.mode === "online") startVoiceFor(state.game); } });
  on("ttt_hello", (d) => {
    state.offset = (d.serverTime || Date.now()) - Date.now();
    state.incoming = d.incoming || [];
    state.outgoing = d.outgoing || [];
    state.resuming = false;
    if (!GUEST_TOKEN) loadGuestLinks();
    if (d.game && d.game.status === "active") { if (GUEST_TOKEN) playGameStartPing(d.game.id); startOnlineGame(d.game, { resume: true }); }
    else if (d.spectate) startSpectate(d.spectate, state.watchCode);
    else if (state.game && state.game.mode === "online" && !state.game.over) resync();
    renderLobby();
  });
  on("ttt_guest_wait", (d) => { state.guestWait = d.message || "Waiting for the host."; renderGuest(); });
  on("ttt_challenge", (c) => { playPing(); state.incoming = state.incoming.filter((x) => x.id !== c.id).concat(c); renderLobby(); });
  on("ttt_challenge_sent", (c) => { state.outgoing = state.outgoing.filter((x) => x.id !== c.id).concat(c); renderLobby(); });
  on("ttt_challenge_update", (u) => {
    const was = state.outgoing.find((x) => x.id === u.id);
    state.incoming = state.incoming.filter((x) => x.id !== u.id);
    state.outgoing = state.outgoing.filter((x) => x.id !== u.id);
    if (was && u.status === "declined") toast((was.to.name || was.to.username) + " declined your request.");
    if (was && u.status === "expired") toast("Your request to " + (was.to.name || was.to.username) + " expired.");
    renderLobby();
  });
  on("ttt_game_start", (v) => { state.guestWait = ""; playGameStartPing(v.id); startOnlineGame(v, {}); });
  on("ttt_state", (v) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== v.gameId) return;
    if (v.seq <= g.seq) return;
    g.seq = v.seq;
    state.offset = (v.serverTime || Date.now()) - Date.now();
    if (v.room) g.room = { ...(g.room || {}), ...v.room };
    present({ event: v.event, view: v.state, deadline: v.deadline, players: v.players });
  });
  on("ttt_over", (v) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== v.gameId) return;
    if (g.playing || g.queue.length) g.pendingOver = { winner: v.result.winner, reason: v.result.reason, view: v.state, players: v.players, result: v.result };
    else finishGame(v.result.winner, v.result.reason, v.state, v.players, v.result);
  });
  on("ttt_opponent", (d) => {
    const g = state.game;
    if (!g || g.id !== d.gameId) return;
    const p = g.players.find((x) => x.uid === d.uid);
    if (p) p.online = !!d.online;
    paintStatus(); paintPlayers();
  });
  on("ttt_room_update", (d) => {
    const g = state.game;
    if (!g || g.id !== d.gameId) return;
    g.room = { ...(g.room || {}), ...d };
    paintVoice();
    if (roomUi && roomUi.box.isConnected) roomUi.draw();
  });
  on("ttt_spectate_end", (d) => {
    const g = state.game;
    if (!g || !g.spectator || g.id !== d.gameId) return;
    if (d.reason === "closed") toast("The host closed this room.");
    else if (d.reason === "full") toast("The room is full.");
    else if (d.reason !== "ended") toast("You are no longer watching.");
    leaveGame();
  });
  on("ttt_voice_peer", (d) => { const g = state.game; if (g && g.id === d.gameId) voice.onPeer(d); });
  on("ttt_voice_signal", (d) => { const g = state.game; if (g && g.id === d.gameId) voice.onSignal(d); });
  es.onerror = () => {
    if (!es) return;
    if (GUEST_TOKEN) guestConnectionSounded = false;
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
    const d = await api(GAME_API() + "/game/" + encodeURIComponent(g.id) + "/state", { key: g.key });
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

async function loadPlayers() {
  if (GUEST_TOKEN || state.conn !== "online") return;
  state.loadingPlayers = true;
  paintLobbyPlayers();
  try { const d = await api(BASE + "/online?q=" + encodeURIComponent(state.search.trim())); state.players = d.players || []; } catch { /* the list just stays as it was */ }
  state.loadingPlayers = false;
  paintLobbyPlayers();
}

const GUEST_CREATE_GAME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>';
function guestEndedCard(title, text) {
  const btn = h("button", { type: "button", class: "cx-btn", id: "cxCreateGame", onclick: (e) => { busy(e.currentTarget, true); location.href = "/tictactoe"; } });
  btn.innerHTML = 'CREATE GAME <span class="ico">' + GUEST_CREATE_GAME_ICON + "</span>";
  return h("div", { class: "cx-card cx-ended", style: "text-align:center" }, [
    h("h1", { text: title }), h("p", { text }), btn,
  ]);
}
function showGuestEnded() {
  if (!GUEST_TOKEN) return;
  const game = state.game;
  const result = game && game.over ? game.result : null;
  if (game) { clearTimeout(game.finishTimer); game.token++; state.game = null; }
  voice.stop();
  $("cxVoiceDock").hidden = true;
  $("cxGame").hidden = true;
  $("cxMenu").hidden = true;
  state.guest.info = result ? { ...(state.guest.info || {}), status: "finished", result } : { ...(state.guest.info || {}), status: "ended" };
  renderGuest();
}
async function refreshGuestInfo() {
  try { state.guest.info = await api(BASE + "/guest/info/" + encodeURIComponent(GUEST_TOKEN)); }
  catch (e) { state.guest.info = { status: "error", error: e.message }; }
  if (state.guest.info && state.guest.info.youName) state.guest.name = state.guest.info.youName;
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
  if (!info) { card([h("div", { class: "cx-loading" }, [h("span", { class: "cx-roll" }), "Opening game link"])]); return; }
  if (info.status === "finished") { root.appendChild(guestEndedCard("Game Finished", "This Tic-Tac-Toe game has ended. Ask the host for a new invitation to play again.")); return; }
  if (info.status === "ended" || info.status === "expired") { root.appendChild(guestEndedCard("Game Link Expired", "This game link is no longer active. Ask the host to create a new one.")); return; }
  if (info.status === "error") {
    card([h("h2", { text: "Could not open the game" }), h("p", { class: "cx-hint", style: "margin-top:8px", text: info.error || "Check your connection and try again." }), h("button", { type: "button", class: "cx-btn", onclick: refreshGuestInfo }, ["Try again"])]);
    return;
  }
  if (info.status === "playing" && !info.you) { root.appendChild(guestEndedCard("This link is already in use", "Someone is already playing on this link. Ask the host for a new invitation.")); return; }
  const host = info.host || {};
  const hostLine = h("div", { class: "cx-hostline" }, [avatar({ name: host.name || host.username, photo: host.photo })]);
  if (state.guest.joined) {
    const actions = state.conn === "unavailable"
      ? [h("p", { class: "cx-hint", text: "Could not connect. Check your internet and try again." }), h("button", { type: "button", class: "cx-btn", onclick: () => { retries = 0; connect(); } }, ["Reconnect"])]
      : state.guestWait
        ? [h("p", { class: "cx-hint", text: state.guestWait }), h("button", { type: "button", class: "cx-btn", onclick: async (e) => { const btn = e.currentTarget; busy(btn, true); try { await api(BASE + "/guest/start", {}); state.guestWait = ""; } catch (err) { toast(err.message); } busy(btn, false); renderGuest(); } }, ["Try again"])]
        : [h("div", { class: "cx-loading" }, [h("span", { class: "cx-roll" }), "Starting your game"])];
    card([hostLine, h("h2", { text: "Playing " + (host.name || host.username || "the host") }), ...actions]);
    return;
  }
  const input = h("input", { class: "cx-field", id: "cxGuestName", type: "text", maxlength: "20", placeholder: "Your name", autocomplete: "off", value: keepName || "" });
  card([
    hostLine,
    h("h2", { text: (host.name || host.username || "Someone") + " invited you to play Tic-Tac-Toe" }),
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
    await api(BASE + "/guest/join/" + encodeURIComponent(GUEST_TOKEN), { name });
    state.guest.name = name; state.guest.joined = true; state.guest.info.you = true; state.guest.info.status = "playing";
    state.guestWait = "";
    renderGuest(); retries = 0; connect();
  } catch (e) {
    busy(btn, false); toast(e.message);
    if (["ended", "playing", "expired"].includes(e.code)) refreshGuestInfo();
  }
}
async function initGuest() {
  $("cxMenu").hidden = true;
  const back = $("cxBack");
  if (back) back.setAttribute("href", "/");
  const cog = $("cxCog");
  if (cog) cog.style.display = "none";
  renderGuest();
  await refreshGuestInfo();
  if (state.guest.info && state.guest.info.you && state.guest.info.status === "playing") {
    state.guest.joined = true;
    retries = 0;
    connect();
  }
  renderGuest();
}

function requestRow(r) {
  const left = Math.max(0, Math.round((r.expiresAt - serverNow()) / 1000));
  return h("div", { class: "cx-req", "data-req": r.id }, [avatar(r.from), h("div", { class: "cx-pinfo" }, [nameWithBadge(r.from.name || r.from.username, r.from.verified), h("span", { text: "wants to play Tic-Tac-Toe | " + left + "s" })]),
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
  if (GUEST_TOKEN) return;
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
    if (r && span) span.textContent = "wants to play Tic-Tac-Toe | " + Math.max(0, Math.round((r.expiresAt - now) / 1000)) + "s";
  });
}, 1000);
setInterval(() => { if (!GUEST_TOKEN && !document.hidden && state.tab === "online" && !$("cxMenu").hidden) loadPlayers(); }, 12000);

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
    if (GUEST_TOKEN && !state.guest.joined) return;
    if (!es || es.readyState === EventSource.CLOSED) { retries = 0; connect(); }
    const g = state.game;
    if (g && g.mode === "online" && !g.over) resync();
    if (g && g.mode === "bot") botStep();
  });
  window.addEventListener("pagehide", saveGame);
  window.addEventListener("online", () => { if (GUEST_TOKEN && !state.guest.joined) return; retries = 0; connect(); });
  window.addEventListener("beforeunload", (e) => { const g = state.game; if (g && g.mode === "online" && !g.over && !g.spectator) { e.preventDefault(); e.returnValue = ""; } });
  if (GUEST_TOKEN) { initGuest(); return; }
  const watch = new URLSearchParams(location.search).get("watch");
  if (watch) { state.tab = "online"; state.watchCode = String(watch).toUpperCase().slice(0, 6); }
  if (!restoreBotGame()) renderMenu();
  loadMe();
  connect();
}
init();
window.__ttt = { state };
