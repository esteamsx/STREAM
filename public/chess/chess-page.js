import { Chess } from "/chess/chess-engine.js";
import { pieceSymbols } from "/chess/chess-pieces.js";

const FILES = "abcdefgh";
const LEVELS = [
  { id: "easy", name: "Easy", note: "Friendly. Makes mistakes you can punish.", mark: "1" },
  { id: "medium", name: "Medium", note: "Plays sensible chess. A fair fight.", mark: "2" },
  { id: "hard", name: "Hard", note: "Thinks several moves ahead. Takes a few seconds.", mark: "3" },
];
const TIMES = [3, 5, 10, 15, 30];
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const START_COUNT = { p: 8, n: 2, b: 2, r: 2, q: 1 };

const $ = (id) => document.getElementById(id);

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

function pieceSvg(code, cls) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 45 45");
  if (cls) svg.setAttribute("class", cls);
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", "#" + code);
  svg.appendChild(use);
  return svg;
}

function store(key, fallback) {
  try { const v = localStorage.getItem("cx_" + key); return v == null ? fallback : v; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem("cx_" + key, String(value)); } catch { /* private mode */ }
}

const state = {
  tab: "computer",
  level: LEVELS.some((l) => l.id === store("level")) ? store("level") : "medium",
  color: ["white", "black", "random"].includes(store("color")) ? store("color") : "random",
  minutes: TIMES.includes(Number(store("minutes"))) ? Number(store("minutes")) : 10,
  challengeColor: ["white", "black", "random"].includes(store("ccolor")) ? store("ccolor") : "random",
  me: null,
  conn: "connecting",
  players: [],
  incoming: [],
  outgoing: [],
  search: "",
  offset: 0,
  game: null,
};

let toastTimer = null;
function toast(msg) {
  let t = $("cxToast");
  if (!t) { t = h("div", { id: "cxToast", class: "cx-toast" }); document.body.appendChild(t); }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = "none"; }, 2800);
}

function avatar(p, status) {
  const letter = (p && (p.name || p.username) || "?").trim().charAt(0).toUpperCase() || "?";
  const box = h("div", { class: "cx-av" });
  if (p && p.photo) {
    const img = h("img", { alt: "", referrerpolicy: "no-referrer" });
    img.addEventListener("error", () => { img.remove(); box.insertBefore(document.createTextNode(letter), box.firstChild); });
    img.src = p.photo;
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

async function api(path, body) {
  const opts = body === undefined
    ? { credentials: "same-origin" }
    : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || "Something went wrong. Please try again."), { code: data.code, status: res.status });
  return data;
}

const serverNow = () => Date.now() + state.offset;

let es = null;
let retries = 0;
let retryTimer = null;

function connect() {
  clearTimeout(retryTimer);
  if (es) { es.close(); es = null; }
  setConn("connecting");
  es = new EventSource("/api/chess/stream");
  const on = (name, fn) => es.addEventListener(name, (e) => { let d = null; try { d = JSON.parse(e.data); } catch { return; } fn(d); });

  on("hello", (d) => {
    retries = 0;
    state.me = d.me;
    state.offset = (d.serverTime || Date.now()) - Date.now();
    state.incoming = d.incoming || [];
    state.outgoing = d.outgoing || [];
    setConn("online");
    if (d.game) {
      if (d.game.status === "active") startOnlineGame(d.game, { resume: true });
    } else if (state.game && state.game.mode === "online" && !state.game.over) {
      finishOnline(null, "abandoned_both", true);
    }
    renderLobby();
    loadPlayers();
  });
  on("challenge", (c) => {
    state.incoming = state.incoming.filter((x) => x.id !== c.id).concat([c]);
    renderLobby();
    renderBanner();
  });
  on("challenge_sent", (c) => {
    state.outgoing = state.outgoing.filter((x) => x.id !== c.id).concat([c]);
    renderLobby();
  });
  on("challenge_update", (u) => {
    const mineOut = state.outgoing.find((x) => x.id === u.id);
    state.incoming = state.incoming.filter((x) => x.id !== u.id);
    state.outgoing = state.outgoing.filter((x) => x.id !== u.id);
    if (mineOut && u.status === "declined") toast(mineOut.to.username + " declined your request.");
    if (mineOut && u.status === "expired") toast("Your request to " + mineOut.to.username + " timed out.");
    renderLobby();
    renderBanner();
  });
  on("game_start", (v) => { startOnlineGame(v, {}); });
  on("move", onServerMove);
  on("game_over", (d) => onServerGameOver(d));
  on("draw_offer", (d) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== d.gameId) return;
    g.drawOffer = d.from;
    if (d.from !== g.myColor) askDraw();
    renderGameInfo();
  });
  on("draw_declined", (d) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== d.gameId) return;
    g.drawOffer = null;
    toast("Draw offer declined.");
    renderGameInfo();
  });
  on("opponent_status", (d) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== d.gameId) return;
    g.opponentOnline = !!d.online;
    g.forfeitAt = d.forfeitAt || null;
    renderGameInfo();
  });
  es.onerror = () => {
    setConn("offline");
    if (es && es.readyState === EventSource.CLOSED) {
      es.close();
      es = null;
      retries++;
      if (retries > 6) { setConn("unavailable"); return; }
      retryTimer = setTimeout(connect, Math.min(15000, 1500 * retries));
    }
  };
}

function setConn(c) {
  state.conn = c;
  const el = $("cxConn");
  if (!el) return;
  el.className = "cx-conn " + (c === "online" ? "on" : c === "connecting" ? "" : "off");
  $("cxConnText").textContent = c === "online" ? "Online" : c === "connecting" ? "Connecting" : c === "unavailable" ? "Unavailable" : "Reconnecting";
  renderLobby();
}

function renderMenu() {
  const root = $("cxMenu");
  root.textContent = "";
  const pending = state.incoming.length;
  root.appendChild(h("div", { class: "cx-hero" }, [h("h1", { text: "Chess" }), h("p", { text: "Play the computer, or challenge someone who is online." })]));
  root.appendChild(h("div", { class: "cx-tabs" }, [
    h("button", { class: "cx-tab" + (state.tab === "computer" ? " on" : ""), id: "tabComputer", type: "button", onclick: () => { state.tab = "computer"; renderMenu(); } }, ["Computer"]),
    h("button", { class: "cx-tab" + (state.tab === "online" ? " on" : ""), id: "tabOnline", type: "button", onclick: () => { state.tab = "online"; renderMenu(); loadPlayers(); } }, ["Online", pending ? h("span", { class: "badge", text: String(pending) }) : null]),
  ]));
  const card = h("div", { class: "cx-card", id: "cxPanel" });
  root.appendChild(card);
  if (state.tab === "computer") renderComputerPanel(card);
  else renderOnlinePanel(card);
}

function renderComputerPanel(card) {
  card.appendChild(h("div", { class: "cx-h", text: "Difficulty" }));
  card.appendChild(h("div", { class: "cx-levels" }, LEVELS.map((l) => h("button", {
    type: "button", class: "cx-level" + (state.level === l.id ? " on" : ""), "data-level": l.id,
    onclick: () => { state.level = l.id; save("level", l.id); renderMenu(); },
  }, [h("div", { class: "lv " + l.id, text: l.mark }), h("div", {}, [h("b", { text: l.name }), h("span", { text: l.note })])]))));
  card.appendChild(h("div", { class: "cx-h", text: "You play as" }));
  card.appendChild(h("div", { class: "cx-chips" }, [["white", "White"], ["random", "Random"], ["black", "Black"]].map(([id, label]) => h("button", {
    type: "button", class: "cx-chip" + (state.color === id ? " on" : ""), "data-color": id,
    onclick: () => { state.color = id; save("color", id); renderMenu(); },
  }, [label]))));
  card.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxStartBot", onclick: startBotGame }, ["Start game"]));
}

function renderOnlinePanel(card) {
  card.id = "cxPanel";
  if (state.conn !== "online") {
    card.appendChild(h("div", { class: "cx-empty", id: "cxOffline", text: state.conn === "unavailable" ? "Online play is not available right now. You can still play the computer." : "Connecting to online play..." }));
    return;
  }
  if (state.incoming.length) {
    card.appendChild(h("div", { class: "cx-h", text: "Requests for you" }));
    for (const r of state.incoming) card.appendChild(requestRow(r));
  }
  if (state.outgoing.length) {
    card.appendChild(h("div", { class: "cx-h", text: "Waiting for an answer" }));
    for (const o of state.outgoing) {
      card.appendChild(h("div", { class: "cx-wait", "data-out": o.id }, [avatar(o.to), h("div", { class: "grow" }, [h("b", { text: o.to.name || o.to.username }), h("div", { class: "cx-sub", text: o.minutes + " min | waiting..." })]),
        h("button", { type: "button", class: "cx-btn ghost sm", onclick: () => api("/api/chess/challenge/" + encodeURIComponent(o.id) + "/cancel", {}).catch((e) => toast(e.message)) }, ["Cancel"])]));
    }
  }
  card.appendChild(h("div", { class: "cx-h", text: "Find a player" }));
  const input = h("input", { class: "cx-search", id: "cxSearch", type: "search", placeholder: "Search by name or username", autocomplete: "off", value: state.search });
  let t = null;
  input.addEventListener("input", () => { state.search = input.value; clearTimeout(t); t = setTimeout(loadPlayers, 280); });
  card.appendChild(input);
  card.appendChild(h("div", { class: "cx-players", id: "cxPlayers" }));
  paintPlayers();
}

function requestRow(r) {
  const left = Math.max(0, Math.round((r.expiresAt - serverNow()) / 1000));
  return h("div", { class: "cx-req", "data-req": r.id }, [avatar(r.from), h("div", { class: "cx-pinfo" }, [h("b", { text: r.from.name || r.from.username }), h("span", { text: "wants to play | " + r.minutes + " min | " + left + "s" })]),
    h("div", { class: "acts" }, [
      h("button", { type: "button", class: "cx-btn sm", "data-accept": r.id, onclick: () => respondChallenge(r, true) }, ["Accept"]),
      h("button", { type: "button", class: "cx-btn ghost sm", "data-decline": r.id, onclick: () => respondChallenge(r, false) }, ["Decline"]),
    ])]);
}

async function respondChallenge(r, accept) {
  if (accept && state.game && state.game.mode === "bot" && !state.game.over && state.game.chess.history().length) {
    if (!window.confirm("Leave your game against the computer?")) return;
  }
  try {
    await api("/api/chess/challenge/" + encodeURIComponent(r.id) + "/respond", { accept });
    state.incoming = state.incoming.filter((x) => x.id !== r.id);
    renderLobby();
    renderBanner();
  } catch (e) { toast(e.message); }
}

async function loadPlayers() {
  if (state.conn !== "online") return;
  try {
    const d = await api("/api/chess/online?q=" + encodeURIComponent(state.search.trim()));
    state.players = d.players || [];
    paintPlayers();
  } catch { /* the list just stays as it was */ }
}

function paintPlayers() {
  const box = $("cxPlayers");
  if (!box) return;
  box.textContent = "";
  if (!state.players.length) {
    box.appendChild(h("div", { class: "cx-empty", text: state.search.trim() ? "No players found." : "Nobody else is online right now. Share the page with a friend, or play the computer." }));
    return;
  }
  for (const p of state.players) {
    const waiting = state.outgoing.some((o) => o.to.uid === p.uid);
    const can = p.status === "available" && !waiting && !(state.game && !state.game.over);
    const label = p.status === "offline" ? "Offline" : p.status === "playing" ? "In a game" : "Online";
    box.appendChild(h("div", { class: "cx-player", "data-uid": p.uid }, [avatar(p, p.status), h("div", { class: "cx-pinfo" }, [h("b", { text: p.name || p.username }), h("span", { text: "@" + p.username + " | " + label })]),
      h("button", { type: "button", class: "cx-btn sm", "data-challenge": p.uid, disabled: can ? null : true, onclick: () => openChallengeSheet(p) }, [waiting ? "Sent" : "Challenge"])]));
  }
}

function openChallengeSheet(p) {
  let minutes = state.minutes, color = state.challengeColor;
  const timeRow = h("div", { class: "cx-chips", style: "justify-content:center;margin-top:12px" });
  const colorRow = h("div", { class: "cx-chips", style: "justify-content:center;margin-top:10px" });
  const paint = () => {
    timeRow.textContent = "";
    for (const m of TIMES) timeRow.appendChild(h("button", { type: "button", class: "cx-chip" + (minutes === m ? " on" : ""), "data-time": String(m), onclick: () => { minutes = m; paint(); } }, [m + " min"]));
    colorRow.textContent = "";
    for (const [id, label] of [["random", "Random"], ["white", "White"], ["black", "Black"]]) colorRow.appendChild(h("button", { type: "button", class: "cx-chip" + (color === id ? " on" : ""), "data-pick": id, onclick: () => { color = id; paint(); } }, [label]));
  };
  paint();
  const m = modal([
    h("h2", { text: "Challenge " + (p.name || p.username) }),
    h("p", { text: "They will see your request and can accept or decline." }),
    timeRow, colorRow,
    h("div", { class: "row" }, [
      h("button", { type: "button", class: "cx-btn ghost", onclick: () => m.close() }, ["Cancel"]),
      h("button", { type: "button", class: "cx-btn", id: "cxSend", onclick: async (e) => {
        e.target.disabled = true;
        try {
          await api("/api/chess/challenge", { toUid: p.uid, minutes, color });
          state.minutes = minutes; state.challengeColor = color; save("minutes", minutes); save("ccolor", color);
          m.close();
          toast("Request sent to " + (p.name || p.username) + ".");
        } catch (err) { e.target.disabled = false; toast(err.message); }
      } }, ["Send request"]),
    ]),
  ]);
}

function renderLobby() {
  if ($("cxMenu") && !$("cxMenu").hidden) {
    const focused = document.activeElement && document.activeElement.id === "cxSearch";
    const pos = focused ? document.activeElement.selectionStart : 0;
    renderMenu();
    if (focused && $("cxSearch")) { $("cxSearch").focus(); try { $("cxSearch").setSelectionRange(pos, pos); } catch { /* ignore */ } }
  }
}

function renderBanner() {
  let b = $("cxBanner");
  if (!b) { b = h("div", { id: "cxBanner", class: "cx-banner" }); document.body.appendChild(b); }
  b.textContent = "";
  const inGame = state.game && state.game.mode === "online" && !state.game.over;
  if (inGame) return;
  const onList = state.tab === "online" && $("cxMenu") && !$("cxMenu").hidden;
  if (onList) return;
  for (const r of state.incoming) b.appendChild(requestRow(r));
}

setInterval(() => {
  const now = serverNow();
  const gone = state.incoming.filter((r) => r.expiresAt <= now);
  if (gone.length) { state.incoming = state.incoming.filter((r) => r.expiresAt > now); renderLobby(); renderBanner(); }
  document.querySelectorAll("[data-req]").forEach((el) => {
    const r = state.incoming.find((x) => x.id === el.getAttribute("data-req"));
    const span = el.querySelector(".cx-pinfo span");
    if (r && span) span.textContent = "wants to play | " + r.minutes + " min | " + Math.max(0, Math.round((r.expiresAt - now) / 1000)) + "s";
  });
}, 1000);
setInterval(() => { if (!document.hidden && state.tab === "online" && !$("cxMenu").hidden) loadPlayers(); }, 12000);

let worker = null;
let workerBroken = false;
let botSeq = 0;
const botWaiting = new Map();

function getWorker() {
  if (workerBroken) return null;
  if (worker) return worker;
  try {
    worker = new Worker("/chess/chess-worker.js", { type: "module" });
    worker.onmessage = (e) => { const cb = botWaiting.get(e.data.id); if (cb) { botWaiting.delete(e.data.id); cb(e.data); } };
    worker.onerror = () => { workerBroken = true; worker = null; for (const [id, cb] of botWaiting) { botWaiting.delete(id); cb({ id, error: "worker" }); } };
  } catch { workerBroken = true; worker = null; }
  return worker;
}

function askBot(payload) {
  return new Promise((resolve) => {
    const id = ++botSeq;
    let done = false;
    const finish = (data) => { if (done) return; done = true; botWaiting.delete(id); resolve(data); };
    const fallback = async () => {
      try {
        const { chooseFromMoves } = await import("/chess/chess-bot.js");
        await new Promise((r) => setTimeout(r, 30));
        const r = chooseFromMoves(payload.startFen, payload.moves, payload.level);
        finish({ id, uci: r ? r.uci : null });
      } catch { finish({ id, uci: null }); }
    };
    const w = getWorker();
    if (!w) { fallback(); return; }
    botWaiting.set(id, (data) => (data.error ? fallback() : finish(data)));
    w.postMessage({ id, ...payload });
    setTimeout(() => { if (!done) fallback(); }, 15000);
  });
}

function startBotGame() {
  const color = state.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : state.color === "white" ? "w" : "b";
  const level = state.level;
  enterGame({
    mode: "bot", chess: new Chess(), myColor: color, flipped: color === "b", level,
    selected: null, targets: new Map(), legal: [], last: null, over: false, result: null, thinking: false, botToken: 0,
    opponent: { name: "Computer", username: level, photo: null, bot: true },
  });
  const g = state.game;
  if (g.chess.turnColor() !== g.myColor) botTurn();
}

function botTurn() {
  const g = state.game;
  if (!g || g.mode !== "bot" || g.over) return;
  const token = ++g.botToken;
  g.thinking = true;
  renderGameInfo();
  paintBoard();
  const started = Date.now();
  askBot({ startFen: g.chess.startFen, moves: g.chess.uciHistory(), level: g.level }).then((res) => {
    const wait = Math.max(0, 450 - (Date.now() - started));
    setTimeout(() => {
      if (state.game !== g || g.botToken !== token || g.over) return;
      g.thinking = false;
      if (!res.uci) { checkBotEnd(); return; }
      const info = g.chess.move({ from: res.uci.slice(0, 2), to: res.uci.slice(2, 4), promotion: res.uci[4] });
      if (!info) { renderGameInfo(); return; }
      afterMove(info);
      checkBotEnd();
    }, wait);
  });
}

function checkBotEnd() {
  const g = state.game;
  if (!g || g.mode !== "bot") return;
  const res = g.chess.result();
  if (!res.over) { renderGameInfo(); return; }
  g.over = true;
  g.result = { winner: res.winner, reason: res.reason };
  renderGameInfo();
  paintBoard();
  showResult();
}

function enterGame(g) {
  state.game = g;
  g.legal = g.chess.moves();
  $("cxMenu").hidden = true;
  $("cxGame").hidden = false;
  renderBanner();
  buildBoard();
  renderGameInfo();
  paintBoard();
  window.scrollTo(0, 0);
}

function leaveGame() {
  const g = state.game;
  if (g) g.botToken++;
  state.game = null;
  $("cxGame").hidden = true;
  $("cxMenu").hidden = false;
  renderMenu();
  renderBanner();
  if (state.tab === "online") loadPlayers();
}

let cells = {};
function buildBoard() {
  const g = state.game;
  const board = $("cxBoard");
  board.textContent = "";
  cells = {};
  for (let i = 0; i < 64; i++) {
    const r = Math.floor(i / 8), c = i % 8;
    const file = g.flipped ? 7 - c : c;
    const rank = g.flipped ? r + 1 : 8 - r;
    const name = FILES[file] + rank;
    const light = (file + rank) % 2 === 1;
    const el = h("div", { class: "cx-sq " + (light ? "l" : "d"), "data-sq": name });
    if (c === 0) el.appendChild(h("span", { class: "cx-co r", text: String(rank) }));
    if (r === 7) el.appendChild(h("span", { class: "cx-co f", text: FILES[file] }));
    board.appendChild(el);
    cells[name] = el;
  }
}

function paintBoard() {
  const g = state.game;
  if (!g) return;
  const grid = g.chess.grid();
  const kingCheck = g.chess.isCheck() ? findKing(grid, g.chess.turnColor()) : null;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const name = FILES[c] + (8 - r);
      const el = cells[name];
      const p = grid[r][c];
      el.querySelectorAll(".cx-pc").forEach((n) => n.remove());
      if (p) el.insertBefore(pieceSvg(p.color + p.type, "cx-pc"), el.firstChild);
      el.classList.toggle("last", !!(g.last && (g.last.from === name || g.last.to === name)));
      el.classList.toggle("sel", g.selected === name);
      el.classList.toggle("chk", kingCheck === name);
      const tg = g.selected && g.targets.has(name);
      el.classList.toggle("tgt", !!tg);
      el.classList.toggle("cap", !!(tg && (p || g.targets.get(name)[0].flags & 4)));
    }
  }
  const think = $("cxThink");
  if (think) think.hidden = !(g.mode === "bot" && g.thinking);
}

function findKing(grid, color) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = grid[r][c]; if (p && p.type === "k" && p.color === color) return FILES[c] + (8 - r); }
  return null;
}

function canMove() {
  const g = state.game;
  if (!g || g.over) return false;
  if (g.chess.turnColor() !== g.myColor) return false;
  if (g.mode === "bot") return !g.thinking;
  return !g.pending;
}

function select(sq) {
  const g = state.game;
  g.selected = sq;
  g.targets = new Map();
  for (const m of g.legal) if (m.from === sq) { const list = g.targets.get(m.to) || []; list.push(m); g.targets.set(m.to, list); }
  paintBoard();
}

function clearSelection() {
  const g = state.game;
  g.selected = null;
  g.targets = new Map();
  paintBoard();
}

function squareAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const sq = el && el.closest ? el.closest(".cx-sq") : null;
  return sq ? sq.getAttribute("data-sq") : null;
}

let drag = null;
function wireBoard() {
  const board = $("cxBoard");
  board.addEventListener("pointerdown", (e) => {
    const g = state.game;
    if (!g || e.button > 0) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq) return;
    if (!canMove()) return;
    if (g.selected && g.targets.has(sq)) { attemptMove(g.selected, sq); return; }
    const p = g.chess.pieceAt(sq);
    if (p && p.color === g.myColor) {
      select(sq);
      drag = { from: sq, x: e.clientX, y: e.clientY, started: false, id: e.pointerId, ghost: null, hover: null };
      try { board.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    } else if (g.selected) clearSelection();
  });
  board.addEventListener("pointermove", (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 7) return;
      drag.started = true;
      const p = state.game.chess.pieceAt(drag.from);
      drag.ghost = pieceSvg(p.color + p.type, "cx-ghost");
      document.body.appendChild(drag.ghost);
      const origin = cells[drag.from].querySelector(".cx-pc");
      if (origin) origin.classList.add("ghosted");
    }
    drag.ghost.style.left = e.clientX + "px";
    drag.ghost.style.top = e.clientY + "px";
    const over = squareAt(e.clientX, e.clientY);
    if (over !== drag.hover) {
      if (drag.hover && cells[drag.hover]) cells[drag.hover].classList.remove("hover");
      drag.hover = over;
      if (over && cells[over] && state.game.targets.has(over)) cells[over].classList.add("hover");
    }
  });
  const end = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag;
    drag = null;
    if (d.ghost) d.ghost.remove();
    if (d.hover && cells[d.hover]) cells[d.hover].classList.remove("hover");
    const origin = cells[d.from] && cells[d.from].querySelector(".cx-pc");
    if (origin) origin.classList.remove("ghosted");
    if (!d.started || e.type === "pointercancel") return;
    const to = squareAt(e.clientX, e.clientY);
    const g = state.game;
    if (g && to && g.targets.has(to)) attemptMove(d.from, to);
  };
  board.addEventListener("pointerup", end);
  board.addEventListener("pointercancel", end);
}

function attemptMove(from, to) {
  const g = state.game;
  const options = g.targets.get(to) || [];
  if (!options.length) return;
  if (options.some((m) => m.promotion)) {
    const color = g.myColor;
    const m = modal([
      h("h2", { text: "Promote to" }),
      h("div", { class: "cx-promo" }, ["q", "r", "b", "n"].map((t) => h("button", { type: "button", "data-promo": t, onclick: () => { m.close(); submitMove(from, to, t); } }, [pieceSvg(color + t)]))),
    ]);
    return;
  }
  submitMove(from, to, undefined);
}

function afterMove(info) {
  const g = state.game;
  g.last = { from: info.from, to: info.to };
  g.selected = null;
  g.targets = new Map();
  g.legal = g.chess.moves();
  paintBoard();
  renderGameInfo();
}

function submitMove(from, to, promotion) {
  const g = state.game;
  if (!canMove()) return;
  const info = g.chess.move({ from, to, promotion });
  if (!info) { clearSelection(); return; }
  afterMove(info);
  if (g.mode === "bot") {
    const res = g.chess.result();
    if (res.over) checkBotEnd();
    else botTurn();
    return;
  }
  g.pending = info.uci;
  api("/api/chess/game/" + encodeURIComponent(g.id) + "/move", { key: g.key, from, to, promotion }).catch((e) => {
    if (state.game !== g || g.over) return;
    g.chess.undo();
    g.pending = null;
    g.last = null;
    g.legal = g.chess.moves();
    paintBoard();
    renderGameInfo();
    toast(e.message);
    if (e.code === "illegal_move" || e.code === "not_your_turn") connect();   // fetch the real position
  });
}

function fmtClock(ms) {
  ms = Math.max(0, ms);
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return m + ":" + String(s % 60).padStart(2, "0");
}

function capturedOf(g) {
  const have = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  for (const row of g.chess.grid()) for (const p of row) if (p && have[p.color][p.type] !== undefined) have[p.color][p.type]++;
  const lost = { w: [], b: [] };
  let score = 0;
  for (const color of ["w", "b"]) {
    for (const t of ["q", "r", "b", "n", "p"]) {
      const n = Math.max(0, START_COUNT[t] - have[color][t]);
      for (let i = 0; i < n; i++) lost[color].push(t);
      score += (color === "w" ? -1 : 1) * n * VALUE[t];
    }
  }
  return { lost, score };    // lost.w = white pieces that were taken; score > 0 means white is ahead
}

function playerBar(who, color, name, p, id) {
  return h("div", { class: "cx-pbar", id }, [avatar(p), h("div", { class: "who" }, [h("b", { text: name }), h("div", { class: "cx-cap", "data-cap": color })]), h("div", { class: "cx-clk", id: id + "Clk", text: "" })]);
}

function renderGameInfo() {
  const g = state.game;
  if (!g) return;
  const oppColor = g.myColor === "w" ? "b" : "w";
  const top = $("cxTop"), bottom = $("cxBottom");
  top.textContent = ""; bottom.textContent = "";
  const oppName = g.mode === "bot" ? "Computer (" + LEVELS.find((l) => l.id === g.level).name + ")" : (g.opponent.name || g.opponent.username);
  const meName = state.me ? (state.me.name || state.me.username) + " (you)" : "You";
  top.appendChild(playerBar("opp", oppColor, oppName, g.opponent, "cxOpp"));
  bottom.appendChild(playerBar("me", g.myColor, meName, state.me || { name: "You" }, "cxMe"));
  const cap = capturedOf(g);
  const fill = (color, takerColor) => {
    const box = document.querySelector('[data-cap="' + takerColor + '"]');
    if (!box) return;
    const taken = cap.lost[color === "w" ? "b" : "w"];
    for (const t of taken) box.appendChild(pieceSvg((color === "w" ? "b" : "w") + t));
    const adv = takerColor === "w" ? cap.score : -cap.score;
    if (adv > 0) box.appendChild(h("em", { text: "+" + adv }));
  };
  fill("b", "w");
  fill("w", "b");
  const st = $("cxStatus");
  let text;
  if (g.over) text = resultText(g);
  else if (g.mode === "bot") text = g.thinking ? "Computer is thinking..." : g.chess.turnColor() === g.myColor ? (g.chess.isCheck() ? "Check! Your move" : "Your move") : "Computer's move";
  else text = g.chess.turnColor() === g.myColor ? (g.chess.isCheck() ? "Check! Your move" : "Your move") : "Waiting for " + (g.opponent.name || g.opponent.username);
  st.textContent = text;
  const note = $("cxNote");
  note.hidden = true;
  if (g.mode === "online" && !g.over) {
    if (!g.opponentOnline) { note.hidden = false; note.textContent = "Your opponent disconnected. They forfeit if they do not come back soon."; }
    else if (g.drawOffer && g.drawOffer === g.myColor) { note.hidden = false; note.textContent = "Draw offered. Waiting for an answer."; }
  }
  const mv = $("cxMoves");
  mv.textContent = "";
  const hist = g.chess.history();
  for (let i = 0; i < hist.length; i += 2) {
    mv.appendChild(h("span", { class: "n", text: i / 2 + 1 + "." }));
    mv.appendChild(h("span", { class: "m" + (i === hist.length - 1 ? " cur" : ""), text: hist[i] }));
    mv.appendChild(h("span", { class: "m" + (i + 1 === hist.length - 1 ? " cur" : ""), text: hist[i + 1] || "" }));
  }
  mv.scrollTop = mv.scrollHeight;
  const ctl = $("cxControls");
  ctl.textContent = "";
  ctl.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "cxFlip", onclick: () => { g.flipped = !g.flipped; buildBoard(); paintBoard(); } }, ["Flip"]));
  if (g.mode === "bot") {
    ctl.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "cxUndo", disabled: g.chess.history().length ? null : true, onclick: undoBot }, ["Undo"]));
  } else if (!g.over) {
    ctl.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "cxDraw", disabled: g.drawOffer ? true : null, onclick: offerDraw }, ["Offer draw"]));
  }
  if (!g.over) ctl.appendChild(h("button", { type: "button", class: "cx-btn danger sm", id: "cxResign", onclick: resign }, ["Resign"]));
  else {
    if (g.mode === "online") ctl.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxRematch", onclick: rematch }, ["Rematch"]));
    ctl.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxNew", onclick: leaveGame }, ["New game"]));
  }
  if (!g.over) ctl.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "cxMenuBtn", onclick: leaveAsk }, ["Menu"]));
  tickClocks();
}

function resultText(g) {
  const r = g.result || {};
  const you = g.myColor;
  if (r.winner == null) {
    const why = { stalemate: "stalemate", insufficient: "not enough pieces to win", repetition: "the same position three times", fifty: "the 50-move rule", agreement: "agreement", abandoned_both: "both players left", timeout_insufficient: "time ran out but the other side cannot win" }[r.reason] || r.reason;
    return "Draw by " + why;
  }
  const won = r.winner === you;
  const why = { checkmate: "checkmate", resign: won ? "your opponent resigned" : "you resigned", timeout: "time", abandoned: won ? "your opponent left" : "you left" }[r.reason] || r.reason;
  return (won ? "You won by " : "You lost by ") + why;
}

function showResult() {
  const g = state.game;
  if (!g) return;
  const r = g.result || {};
  const title = r.winner == null ? "Draw" : r.winner === g.myColor ? "You won!" : "You lost";
  const m = modal([
    h("h2", { id: "cxResultTitle", text: title }),
    h("p", { id: "cxResultText", text: resultText(g) }),
    h("div", { class: "row" }, [
      h("button", { type: "button", class: "cx-btn ghost", id: "cxResultClose", onclick: () => m.close() }, ["View board"]),
      h("button", { type: "button", class: "cx-btn", id: "cxResultNew", onclick: () => { m.close(); if (g.mode === "online") rematch(); else leaveGame(); } }, [g.mode === "online" ? "Rematch" : "New game"]),
    ]),
  ]);
}

function tickClocks() {
  const g = state.game;
  if (!g || g.mode !== "online") {
    const a = $("cxOppClk"), b = $("cxMeClk");
    if (a) a.style.display = "none";
    if (b) b.style.display = "none";
    return;
  }
  const turn = g.chess.turnColor();
  const elapsed = g.over ? 0 : serverNow() - g.clockAt;
  const left = (c) => (g.clocks[c] - (!g.over && turn === c ? elapsed : 0));
  const oppC = g.myColor === "w" ? "b" : "w";
  const paint = (id, c) => {
    const el = $(id);
    if (!el) return;
    const ms = left(c);
    el.textContent = fmtClock(ms);
    el.classList.toggle("run", !g.over && turn === c);
    el.classList.toggle("low", ms < 20000 && ms >= 0);
  };
  paint("cxOppClk", oppC);
  paint("cxMeClk", g.myColor);
}
setInterval(tickClocks, 250);

function undoBot() {
  const g = state.game;
  if (!g || g.mode !== "bot" || !g.chess.history().length) return;
  g.botToken++;
  g.thinking = false;
  g.over = false;
  g.result = null;
  let n = 0;
  while (n < 2 && g.chess.undo()) n++;
  if (g.chess.turnColor() !== g.myColor && g.chess.history().length) g.chess.undo();
  const u = g.chess.uciHistory();
  const lastUci = u[u.length - 1];
  g.last = lastUci ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) } : null;
  g.selected = null; g.targets = new Map();
  g.legal = g.chess.moves();
  paintBoard();
  renderGameInfo();
  if (g.chess.turnColor() !== g.myColor) botTurn();
}

function leaveAsk() {
  const g = state.game;
  if (g && g.mode === "bot" && !g.over && g.chess.history().length) {
    const m = modal([h("h2", { text: "Leave this game?" }), h("p", { text: "Your game against the computer will be lost." }), h("div", { class: "row" }, [
      h("button", { type: "button", class: "cx-btn ghost", onclick: () => m.close() }, ["Stay"]),
      h("button", { type: "button", class: "cx-btn danger", id: "cxLeaveYes", onclick: () => { m.close(); leaveGame(); } }, ["Leave"]),
    ])]);
    return;
  }
  if (g && g.mode === "online" && !g.over) { toast("Resign if you want to stop this game."); return; }
  leaveGame();
}

function resign() {
  const g = state.game;
  if (!g || g.over) return;
  const m = modal([h("h2", { text: "Resign?" }), h("p", { text: "You will lose this game." }), h("div", { class: "row" }, [
    h("button", { type: "button", class: "cx-btn ghost", onclick: () => m.close() }, ["Keep playing"]),
    h("button", { type: "button", class: "cx-btn danger", id: "cxResignYes", onclick: async () => {
      m.close();
      if (g.mode === "bot") { g.botToken++; g.thinking = false; g.over = true; g.result = { winner: g.myColor === "w" ? "b" : "w", reason: "resign" }; renderGameInfo(); paintBoard(); showResult(); return; }
      try { await api("/api/chess/game/" + encodeURIComponent(g.id) + "/resign", { key: g.key }); } catch (e) { toast(e.message); }
    } }, ["Resign"]),
  ])]);
}

function offerDraw() {
  const g = state.game;
  if (!g || g.mode !== "online" || g.over) return;
  api("/api/chess/game/" + encodeURIComponent(g.id) + "/draw", { key: g.key }).then(() => toast("Draw offered.")).catch((e) => toast(e.message));
}

function askDraw() {
  const g = state.game;
  const m = modal([h("h2", { text: "Draw offer" }), h("p", { text: (g.opponent.name || g.opponent.username) + " offers a draw." }), h("div", { class: "row" }, [
    h("button", { type: "button", class: "cx-btn ghost", id: "cxDrawNo", onclick: () => { m.close(); api("/api/chess/game/" + encodeURIComponent(g.id) + "/draw/respond", { key: g.key, accept: false }).catch(() => {}); } }, ["Decline"]),
    h("button", { type: "button", class: "cx-btn", id: "cxDrawYes", onclick: () => { m.close(); api("/api/chess/game/" + encodeURIComponent(g.id) + "/draw/respond", { key: g.key, accept: true }).catch((e) => toast(e.message)); } }, ["Accept"]),
  ])]);
  g.drawModal = m;
}

async function rematch() {
  const g = state.game;
  if (!g || g.mode !== "online") return;
  const opp = g.opponent;
  leaveGame();
  state.tab = "online";
  renderMenu();
  try {
    await api("/api/chess/challenge", { toUid: opp.uid, minutes: g.minutes, color: g.myColor === "w" ? "black" : "white" });
    toast("Rematch request sent to " + (opp.name || opp.username) + ".");
  } catch (e) { toast(e.message); }
}

function startOnlineGame(v, { resume }) {
  const chess = new Chess();
  let ok = true;
  for (const m of v.moves || []) if (!chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] })) { ok = false; break; }
  const board = ok && chess.fen().split(" ").slice(0, 4).join(" ") === v.fen.split(" ").slice(0, 4).join(" ") ? chess : new Chess(v.fen);
  if (state.game && state.game.mode === "bot") state.game.botToken++;
  if (state.game && state.game.drawModal) state.game.drawModal.close();
  const uci = (v.moves || []).length ? v.moves[v.moves.length - 1].uci : null;
  const g = {
    mode: "online", chess: board, myColor: v.color, flipped: v.color === "b", id: v.id, key: v.key,
    opponent: v.opponent, minutes: v.minutes, clocks: v.clocks, clockAt: Date.now() + state.offset - 0, pending: null,
    selected: null, targets: new Map(), legal: [], last: uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null,
    over: v.status === "over", result: v.result, opponentOnline: v.opponentOnline !== false, drawOffer: v.drawOffer, forfeitAt: null,
  };
  g.clockAt = v.serverTime || serverNow();
  if (v.serverTime) state.offset = v.serverTime - Date.now();
  const same = state.game && state.game.mode === "online" && state.game.id === v.id;
  enterGame(g);
  if (!resume || !same) toast(resume ? "Welcome back to your game." : "Game started. You are " + (v.color === "w" ? "White." : "Black."));
  const m = document.querySelectorAll(".cx-ov");
  m.forEach((x) => x.remove());
  renderBanner();
}

function onServerMove(ev) {
  const g = state.game;
  if (!g || g.mode !== "online" || g.id !== ev.gameId) return;
  if (ev.serverTime) state.offset = ev.serverTime - Date.now();
  const mine = ev.move.color === g.myColor;
  if (mine && g.pending === ev.move.uci) {
    g.pending = null;
  } else if (!mine) {
    const info = g.chess.move({ from: ev.move.from, to: ev.move.to, promotion: ev.move.promotion || undefined });
    if (!info) { connect(); return; }
    g.last = { from: ev.move.from, to: ev.move.to };
    g.selected = null; g.targets = new Map();
    g.legal = g.chess.moves();
  }
  g.clocks = ev.clocks;
  g.clockAt = ev.serverTime || serverNow();
  if (ev.drawOfferCleared) g.drawOffer = null;
  if (g.chess.fen().split(" ").slice(0, 4).join(" ") !== ev.fen.split(" ").slice(0, 4).join(" ")) { connect(); return; }
  paintBoard();
  renderGameInfo();
}

function onServerGameOver(d) {
  const g = state.game;
  if (!g || g.mode !== "online" || g.id !== d.gameId) return;
  finishOnline(d.winner, d.reason, false, d.clocks);
}

function finishOnline(winner, reason, silent, clocks) {
  const g = state.game;
  if (!g) return;
  g.over = true;
  g.result = { winner, reason };
  if (clocks) g.clocks = clocks;
  g.pending = null;
  if (g.drawModal) g.drawModal.close();
  renderGameInfo();
  paintBoard();
  if (!silent) showResult();
}

function init() {
  $("cxSymbols").innerHTML = pieceSymbols();
  wireBoard();
  renderMenu();
  connect();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !es && state.conn !== "unavailable") { retries = 0; connect(); }
  });
  window.addEventListener("beforeunload", (e) => {
    const g = state.game;
    if (g && g.mode === "online" && !g.over) { e.preventDefault(); e.returnValue = ""; }
  });
}
init();
window.__chess = { state, refresh: () => { const g = state.game; if (!g) return; g.selected = null; g.targets = new Map(); g.legal = g.chess.moves(); paintBoard(); renderGameInfo(); } };
