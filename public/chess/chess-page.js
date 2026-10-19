import { Chess } from "/chess/chess-engine.js";
import { pieceSymbols, pieceInner, PIECE_SETS } from "/chess/chess-pieces.js";
import { sound } from "/chess/chess-sound.js";
import { createVoice } from "/chess/chess-voice.js";

const GUEST_MATCH = /^\/chess\/guest\/([A-Za-z0-9_-]{6,40})\/?$/.exec(location.pathname);
const GUEST_TOKEN = GUEST_MATCH ? GUEST_MATCH[1] : null;
const BASE = GUEST_TOKEN ? "/api/chess/guest" : "/api/chess";
const SAVE_KEY = "cx_savedgame";
const BOT_IMG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#04141a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M32 10v7"/><circle cx="32" cy="8" r="2.4" fill="#04141a"/><rect x="12" y="17" width="40" height="30" rx="10"/><circle cx="24" cy="31" r="4.2" fill="#04141a"/><circle cx="40" cy="31" r="4.2" fill="#04141a"/><path d="M25 40h14"/><path d="M12 29H7M57 29h-5M24 47v6M40 47v6"/></svg>');
const TIME_LABELS = { 10: "10 minutes", 30: "30 minutes", 60: "1 hour", 180: "3 hours", 1440: "24 hours" };

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
  resuming: false,
  conn: "connecting",
  players: [],
  incoming: [],
  outgoing: [],
  search: "",
  offset: 0,
  game: null,
  links: null,
  guest: GUEST_TOKEN ? { token: GUEST_TOKEN, info: null, name: store("guestname", "") } : null,
  loadingPlayers: false,
};

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
  if (GUEST_TOKEN && url.startsWith("/api/chess/avatar/")) return "/api/chess/guest/avatar/" + encodeURIComponent(GUEST_TOKEN);
  return url;
}

function avatar(p, status) {
  const letter = (p && (p.name || p.username) || "?").trim().charAt(0).toUpperCase() || "?";
  const box = h("div", { class: "cx-av" });
  if (p && p.bot) {
    box.appendChild(h("img", { alt: "Computer", class: "bot", src: BOT_IMG }));
  } else if (p && p.photo) {
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

function busy(btn, on) {
  if (!btn) return;
  btn.classList.toggle("cx-busy", !!on);
  btn.disabled = !!on;
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
  es = new EventSource(BASE + "/stream");
  const on = (name, fn) => es.addEventListener(name, (e) => { state.lastEvent = Date.now(); let d = null; try { d = JSON.parse(e.data); } catch { return; } fn(d); });
  es.onopen = () => { state.lastEvent = Date.now(); };
  on("ping", () => {});
  on("timer", (d) => {
    const g = state.game;
    if (!g || g.mode !== "online" || g.id !== d.gameId) return;
    g.clocks = d.clocks; g.clockAt = d.serverTime || serverNow(); g.paused = !!d.paused;
    if (d.serverTime) state.offset = d.serverTime - Date.now();
    tickClocks();
  });

  on("hello", (d) => {
    retries = 0;
    state.me = d.me;
    applyTheme();
    state.resuming = false;
    state.guestWait = null;
    state.offset = (d.serverTime || Date.now()) - Date.now();
    state.incoming = d.incoming || [];
    state.outgoing = d.outgoing || [];
    setConn("online");
    if (state.game && state.game.mode === "bot") renderGameInfo();   // paint your picture on the bar
    if (d.game) {
      if (d.game.status === "active") startOnlineGame(d.game, { resume: true });
    } else if (state.game && state.game.mode === "online" && !state.game.over) {
      finishOnline(null, "abandoned_both", true);
    }
    if (!GUEST_TOKEN && d.spectate && !(state.game && state.game.id === d.spectate.id)) startSpectate(d.spectate);
    if (GUEST_TOKEN) { if (!state.game) refreshGuestInfo(); return; }
    renderLobby();
    loadPlayers();
    loadLinks();
  });
  on("guest_wait", (d) => { state.guestWait = (d && d.message) || "Waiting for the host."; renderGuest(); });
  on("challenge", (c) => {
    sound.ping();
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
  on("game_start", (v) => { sound.ping(); startOnlineGame(v, {}); });
  on("voice_peer", (d) => { const g = state.game; if (g && g.id === d.gameId) voice.onPeer(d); });
  on("voice_signal", (d) => { const g = state.game; if (g && g.id === d.gameId) voice.onSignal(d); });
  on("room_update", (d) => {
    const g = state.game;
    if (!g || g.id !== d.gameId) return;
    g.room = d.spectator ? { ...(g.room || {}), count: d.count, max: d.max, spectators: d.spectators, open: d.open } : d;
    paintVoice();
  });
  on("spectate_end", (d) => {
    const g = state.game;
    if (!g || !g.spectator || g.id !== d.gameId) return;
    toast(d.reason === "closed" ? "The host closed the room." : d.reason === "full" ? "The room limit was lowered." : "This game is over.");
    leaveGame();
  });
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
      if (retries > 6) { state.resuming = false; setConn("unavailable"); if (GUEST_TOKEN) refreshGuestInfo(); return; }
      retryTimer = setTimeout(connect, Math.min(15000, 1500 * retries));
    }
  };
}

function setConn(c) {
  state.conn = c;
  const el = $("cxConn");
  if (!el) return;
  el.className = "cx-conn " + (c === "online" ? "on" : c === "connecting" ? "" : "off");
  if (GUEST_TOKEN) renderGuest();
  $("cxConnText").textContent = c === "online" ? "Online" : c === "connecting" ? "Connecting" : c === "unavailable" ? "Unavailable" : "Reconnecting";
  renderLobby();
}

function renderMenu() {
  const root = $("cxMenu");
  root.textContent = "";
  if (state.resuming) {
    root.appendChild(h("div", { class: "cx-card" }, [h("div", { class: "cx-loading", id: "cxResuming" }, [h("span", { class: "cx-roll" }), "Getting your game back"])]));
    return;
  }
  const pending = state.incoming.length;
  root.appendChild(h("div", { class: "cx-hero" }, [h("h1", { text: "Chess" }), h("p", { text: "Play the computer, or challenge someone who is online." })]));
  root.appendChild(h("div", { class: "cx-tabs" }, [
    h("button", { class: "cx-tab" + (state.tab === "computer" ? " on" : ""), id: "tabComputer", type: "button", onclick: () => { state.tab = "computer"; renderMenu(); } }, [html("span", "", ICON.cpu).firstChild, "Computer"]),
    h("button", { class: "cx-tab" + (state.tab === "online" ? " on" : ""), id: "tabOnline", type: "button", onclick: () => { state.tab = "online"; renderMenu(); loadPlayers(); loadLinks(); } }, [html("span", "", ICON.users).firstChild, "Online", pending ? h("span", { class: "badge", text: String(pending) }) : null]),
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
  card.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxStartBot", onclick: (e) => { busy(e.currentTarget, true); setTimeout(startBotGame, 180); } }, ["Start game"]));
}

function renderOnlinePanel(card) {
  card.id = "cxPanel";
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
      card.appendChild(h("div", { class: "cx-wait", "data-out": o.id }, [avatar(o.to), h("div", { class: "grow" }, [h("b", { text: o.to.name || o.to.username }), h("div", { class: "cx-sub", text: o.minutes + " min | waiting..." })]),
        h("button", { type: "button", class: "cx-btn ghost sm", onclick: () => api("/api/chess/challenge/" + encodeURIComponent(o.id) + "/cancel", {}).catch((e) => toast(e.message)) }, ["Cancel"])]));
    }
  }
  const head = h("div", { class: "cx-h" });
  head.appendChild(h("span", { class: "cx-live", text: "Players online" }));
  card.appendChild(head);
  const input = h("input", { class: "cx-search", id: "cxSearch", type: "search", placeholder: "Search by name or username", autocomplete: "off", value: state.search });
  let t = null;
  input.addEventListener("input", () => { state.search = input.value; state.players = []; state.loadingPlayers = true; paintPlayers(); clearTimeout(t); t = setTimeout(loadPlayers, 280); });
  const wrap = h("div", { class: "cx-searchwrap" });
  wrap.insertAdjacentHTML("beforeend", ICON.search);
  wrap.appendChild(input);
  card.appendChild(wrap);
  card.appendChild(h("div", { class: "cx-players", id: "cxPlayers" }));
  paintPlayers();
  card.appendChild(watchBox());
  card.appendChild(guestBox());
}

const GUEST_VALID = [10, 30, 60, 180, 1440];
const gopt = {
  minutes: TIMES.includes(Number(store("gminutes"))) ? Number(store("gminutes")) : 10,
  valid: GUEST_VALID.includes(Number(store("gvalid"))) ? Number(store("gvalid")) : 60,
  color: ["white", "black", "random"].includes(store("gcolor")) ? store("gcolor") : "random",
};

function guestLinkUrl(token) { return location.origin + "/chess/guest/" + token; }

function leftText(ms) {
  const m = Math.max(0, Math.ceil(ms / 60000));
  if (m >= 120) return Math.round(m / 60) + " hours left";
  if (m >= 60) return "1 hour left";
  return m + " min left";
}

function guestBox() {
  const box = h("div", { class: "cx-guestbox", id: "cxGuestBox" });
  box.appendChild(h("div", { class: "cx-h", text: "Play with a guest" }));
  box.appendChild(h("div", { class: "cx-hint", text: "Make a link for someone who does not have an account. They can play you straight away. The link stops working when the game ends." }));
  const chips = (label, items, current, set) => {
    box.appendChild(h("div", { class: "cx-sub", style: "margin:10px 0 6px", text: label }));
    box.appendChild(h("div", { class: "cx-chips" }, items.map(([val, text]) => h("button", {
      type: "button", class: "cx-chip" + (current() === val ? " on" : ""), onclick: () => { set(val); renderMenu(); },
    }, [text]))));
  };
  box.appendChild(h("div", { class: "cx-rulebox" }, [h("b", { text: "60 seconds a move" }), h("span", { text: "A link nobody plays on stops working after 24 hours." })]));
  chips("You play as", [["random", "Random"], ["white", "White"], ["black", "Black"]], () => gopt.color, (v) => { gopt.color = v; save("gcolor", v); });
  box.appendChild(h("button", { type: "button", class: "cx-btn", id: "cxMakeLink", onclick: (e) => createLink(e.currentTarget) }, ["Create game link"]));
  if (state.links && state.links.length) {
    box.appendChild(h("div", { class: "cx-h", text: "Your active links" }));
    for (const l of state.links) {
      const url = guestLinkUrl(l.token);
      const playing = l.status === "playing";
      box.appendChild(h("div", { class: "cx-linkrow", "data-link": l.token }, [
        h("div", { class: "grow" }, [h("b", { text: "Guest game" }), h("span", { class: "cx-sub", text: playing ? "A guest is playing" : "Waiting for a guest | " + leftText(l.expiresAt - serverNow()) })]),
        h("div", { class: "acts" }, playing ? [] : [
          (() => { const sb = h("button", { type: "button", class: "cx-vbtn sm on", "data-copy": l.token, "aria-label": "Share game link", onclick: () => shareLink(url) }); sb.innerHTML = VI.share; return sb; })(),
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
    const d = await api("/api/chess/guest/links");
    state.links = d.links || [];
    if (state.tab === "online" && !$("cxMenu").hidden && !document.activeElement.matches("input")) renderMenu();
  } catch { /* the list just stays as it was */ }
}

async function createLink(btn) {
  busy(btn, true);
  try {
    const d = await api("/api/chess/guest/links", { color: gopt.color });
    state.links = [d.link].concat(state.links || []);
    renderMenu();
    shareLink(guestLinkUrl(d.link.token), true);
  } catch (e) { busy(btn, false); toast(e.message); }
}

async function shareLink(url, fresh) {
  if (navigator.share && !fresh) {
    try { await navigator.share({ title: "Play chess with me", text: "Play chess with me on ES TEAMS TV", url }); return; } catch (e) { if (e && e.name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(url); toast(fresh ? "Link created and copied. Send it to your guest." : "Link copied."); }
  catch { window.prompt("Copy this link", url); }
}

async function cancelLink(l, btn) {
  busy(btn, true);
  try {
    await api("/api/chess/guest/links/" + encodeURIComponent(l.token) + "/cancel", {});
    state.links = (state.links || []).filter((x) => x.token !== l.token);
    renderMenu();
  } catch (e) { busy(btn, false); toast(e.message); }
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
  state.loadingPlayers = true;
  paintPlayers();
  try {
    const d = await api("/api/chess/online?q=" + encodeURIComponent(state.search.trim()));
    state.players = d.players || [];
  } catch { /* the list just stays as it was */ }
  state.loadingPlayers = false;
  paintPlayers();
}

function playerName(p) {
  const b = h("b", {}, [h("span", { text: p.name || p.username, style: "overflow:hidden;text-overflow:ellipsis" })]);
  if (p.verified) b.insertAdjacentHTML("beforeend", ICON.tick);
  return b;
}

function paintPlayers() {
  const box = $("cxPlayers");
  if (!box) return;
  box.textContent = "";
  if (state.loadingPlayers && !state.players.length) {
    if (state.search.trim()) {
      box.appendChild(h("div", { class: "cx-loading" }, [h("span", { class: "cx-dots" }, [h("span"), h("span"), h("span")]), "Searching"]));
    } else {
      for (let i = 0; i < 3; i++) box.appendChild(h("div", { class: "cx-sk" }, [h("i"), h("div", { class: "l" }, [h("b"), h("b")])]));
    }
    return;
  }
  if (!state.players.length) {
    box.appendChild(h("div", { class: "cx-empty", text: state.search.trim() ? "No players found." : "Nobody else is online right now. Share the page with a friend, or play the computer." }));
    return;
  }
  for (const p of state.players) {
    const waiting = state.outgoing.some((o) => o.to.uid === p.uid);
    const can = p.status === "available" && !waiting && !(state.game && !state.game.over);
    const label = p.status === "offline" ? "Offline" : p.status === "playing" ? "In a game" : "Online";
    box.appendChild(h("div", { class: "cx-player", "data-uid": p.uid }, [avatar(p, p.status), h("div", { class: "cx-pinfo" }, [playerName(p), h("span", { text: "@" + p.username + " | " + label })]),
      h("button", { type: "button", class: "cx-btn pill", "data-challenge": p.uid, disabled: can ? null : true, onclick: () => openChallengeSheet(p) }, [waiting ? null : html("span", "", ICON.swords).firstChild, waiting ? "Sent" : "Challenge"])]));
  }
}

function openChallengeSheet(p) {
  let color = state.challengeColor;
  const colorRow = h("div", { class: "cx-chips", style: "justify-content:center;margin-top:12px" });
  const paint = () => {
    colorRow.textContent = "";
    for (const [id, label] of [["random", "Random"], ["white", "White"], ["black", "Black"]]) colorRow.appendChild(h("button", { type: "button", class: "cx-chip" + (color === id ? " on" : ""), "data-pick": id, onclick: () => { color = id; paint(); } }, [label]));
  };
  paint();
  const m = modal([
    h("h2", { text: "Challenge " + (p.name || p.username) }),
    h("p", { text: "They will see your request and can accept or decline." }),
    colorRow,
    h("div", { class: "cx-rulebox" }, [h("b", { text: "60 seconds a move" }), h("span", { text: "Each game lasts up to 40 minutes. If it is still undecided, the stronger position wins." })]),
    h("div", { class: "row" }, [
      h("button", { type: "button", class: "cx-btn ghost", onclick: () => m.close() }, ["Cancel"]),
      h("button", { type: "button", class: "cx-btn", id: "cxSend", onclick: async (e) => {
        const btn = e.currentTarget;
        busy(btn, true);
        try {
          await api("/api/chess/challenge", { toUid: p.uid, color });
          state.challengeColor = color; save("ccolor", color);
          m.close();
          toast("Request sent to " + (p.name || p.username) + ".");
        } catch (err) { busy(btn, false); toast(err.message); }
      } }, ["Send request"]),
    ]),
  ]);
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
    if (r && span) span.textContent = "wants to play | 60s a move | " + Math.max(0, Math.round((r.expiresAt - now) / 1000)) + "s";
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
    opponent: botOpponent(level),
    rewardToken: null, humanLog: [], blur: { count: 0, ms: 0, at: 0 }, undone: false, turnStart: Date.now(),
  });
  const g = state.game;
  if (level === "hard" && !GUEST_TOKEN) {
    api("/api/chess/bot/start", { level: "hard" }).then((d) => { if (state.game === g && d && d.token) { g.rewardToken = d.token; saveGame(); } }).catch(() => {});
  }
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
      g.turnStart = Date.now();
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

function saveGame() {
  const g = state.game;
  try {
    if (GUEST_TOKEN || !g || g.mode !== "bot" || g.over) { localStorage.removeItem(SAVE_KEY); return; }
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, mode: "bot", fen: g.chess.startFen, moves: g.chess.uciHistory(), color: g.myColor, level: g.level, flipped: !!g.flipped, rt: g.rewardToken || null, hl: g.humanLog || [], bl: g.blur ? { count: g.blur.count, ms: g.blur.ms } : { count: 0, ms: 0 }, un: !!g.undone, at: Date.now() }));
  } catch { /* storage full or private mode: the game just will not survive a reload */ }
}

function markOnline(id) {
  try { if (id) localStorage.setItem("cx_online", JSON.stringify({ id, at: Date.now() })); else localStorage.removeItem("cx_online"); } catch { /* ignore */ }
}

function hadOnlineGame() {
  try { const d = JSON.parse(localStorage.getItem("cx_online") || "null"); return !!(d && Date.now() - d.at < 20 * 60 * 1000); } catch { return false; }
}

function botOpponent(level) { return { name: "Computer", username: level, photo: null, bot: true }; }

function restoreBotGame() {
  if (GUEST_TOKEN) return false;
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { d = null; }
  if (!d || d.mode !== "bot" || !Array.isArray(d.moves) || !LEVELS.some((l) => l.id === d.level) || Date.now() - (d.at || 0) > 7 * 24 * 3600 * 1000) { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } return false; }
  try {
    const chess = new Chess(d.fen);
    for (const u of d.moves) if (!chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] })) throw new Error("bad move");
    if (chess.result().over) { localStorage.removeItem(SAVE_KEY); return false; }
    const last = d.moves[d.moves.length - 1];
    enterGame({
      mode: "bot", chess, myColor: d.color === "b" ? "b" : "w", flipped: !!d.flipped, level: d.level,
      selected: null, targets: new Map(), legal: [], last: last ? { from: last.slice(0, 2), to: last.slice(2, 4) } : null, over: false, result: null, thinking: false, botToken: 0,
      opponent: botOpponent(d.level),
      rewardToken: typeof d.rt === "string" ? d.rt : null, humanLog: Array.isArray(d.hl) ? d.hl.slice(-400) : [],
      blur: { count: Number(d.bl && d.bl.count) || 0, ms: Number(d.bl && d.bl.ms) || 0, at: 0 }, undone: !!d.un, turnStart: Date.now(),
    });
    toast("Welcome back to your game.");
    const g = state.game;
    if (g.chess.turnColor() !== g.myColor) botTurn();
    return true;
  } catch { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } return false; }
}

function enterGame(g) {
  state.game = g;
  g.legal = g.chess.moves();
  $("cxMenu").hidden = true;
  $("cxGuest").hidden = true;
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
  if (g && g.spectator) api("/api/chess/spectate/leave", {}).catch(() => {});
  voice.stop();
  roomUi = null;
  $("cxVoiceDock").hidden = true;
  $("cxVoiceDock").removeAttribute("data-key");
  state.game = null;
  saveGame();
  markOnline(null);
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
  if (!g || g.over || g.spectator) return false;
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

function playMoveSound(info) {
  const g = state.game;
  if (!g || !info) return;
  if (String(info.san || "").endsWith("#")) return;       // checkmate has its own tune
  if (g.chess.isCheck()) sound.check();                    // double click: the king is under attack
  else if (info.capture) sound.capture();
  else sound.move();
}

function afterMove(info) {
  const g = state.game;
  playMoveSound(info);
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
  if (g.mode === "bot" && g.humanLog) {
    g.humanLog.push(Math.max(0, Date.now() - (g.turnStart || Date.now())));
    if (g.humanLog.length > 400) g.humanLog.shift();
  }
  afterMove(info);
  if (g.mode === "bot") {
    const res = g.chess.result();
    if (res.over) checkBotEnd();
    else botTurn();
    return;
  }
  g.pending = info.uci;
  const sendMove = async (attempt) => {
    try { return await api(BASE + "/game/" + encodeURIComponent(g.id) + "/move", { key: g.key, from, to, promotion }); }
    catch (e) {
      if (!e.status && attempt < 2 && state.game === g && !g.over) { await new Promise((r) => setTimeout(r, 700 * (attempt + 1))); return sendMove(attempt + 1); }
      throw e;
    }
  };
  sendMove(0).catch((e) => {
    if (state.game !== g || g.over) return;
    if (!e.status) { toast("Connection problem. Checking that your move went through..."); resyncGame(true); return; }
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

function nameWithBadge(name, verified) {
  const b = h("b", { class: "cx-nm" }, [h("span", { text: name })]);
  if (verified) b.insertAdjacentHTML("beforeend", ICON.tick);
  return b;
}

function playerBar(who, color, name, p, id) {
  return h("div", { class: "cx-pbar", id }, [avatar(p), h("div", { class: "who" }, [nameWithBadge(name, !!(p && p.verified)), h("div", { class: "cx-cap", "data-cap": color })]), h("div", { class: "cx-clk", id: id + "Clk", text: "" })]);
}

function renderGameInfo() {
  const g = state.game;
  if (!g) return;
  const oppColor = g.myColor === "w" ? "b" : "w";
  const top = $("cxTop"), bottom = $("cxBottom");
  top.textContent = ""; bottom.textContent = "";
  const oppName = g.mode === "bot" ? "Computer (" + LEVELS.find((l) => l.id === g.level).name + ")" : (g.opponent.name || g.opponent.username);
  const meProfile = g.spectator ? g.meProfile : state.me;
  const meName = g.spectator ? (g.meProfile.name || g.meProfile.username) : state.me ? (state.me.name || state.me.username) + " (you)" : "You";
  saveGame();
  top.appendChild(playerBar("opp", oppColor, oppName, g.opponent, "cxOpp"));
  bottom.appendChild(playerBar("me", g.myColor, meName, meProfile || { name: "You" }, "cxMe"));
  if (!g.over) { const mine = g.chess.turnColor() === g.myColor; $("cxMe").classList.toggle("turn", mine); $("cxOpp").classList.toggle("turn", !mine); }
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
  else if (g.spectator) text = (g.chess.isCheck() ? "Check! " : "") + (g.chess.turnColor() === "w" ? "White" : "Black") + " to move";
  else if (g.mode === "bot") text = g.thinking ? "Computer is thinking..." : g.chess.turnColor() === g.myColor ? (g.chess.isCheck() ? "Check! Your move" : "Your move") : "Computer's move";
  else text = g.chess.turnColor() === g.myColor ? (g.chess.isCheck() ? "Check! Your move" : "Your move") : "Waiting for " + (g.opponent.name || g.opponent.username);
  st.textContent = text;
  const note = $("cxNote");
  note.hidden = true;
  if (g.mode === "online" && !g.over && !g.spectator) {
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
  ctl.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "cxFlip", onclick: () => {
    g.flipped = !g.flipped;
    if (g.spectator) { g.myColor = g.myColor === "w" ? "b" : "w"; const t = g.opponent; g.opponent = g.meProfile; g.meProfile = t; renderGameInfo(); }
    buildBoard(); paintBoard();
  } }, ["Flip"]));
  if (g.spectator) {
    ctl.appendChild(h("button", { type: "button", class: "cx-btn danger sm", id: "cxLeaveWatch", onclick: leaveGame }, ["Leave"]));
    tickClocks();
    paintVoice();
    return;
  }
  if (g.mode === "bot") {
    ctl.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "cxUndo", disabled: g.chess.history().length ? null : true, onclick: undoBot }, ["Undo"]));
  } else if (!g.over) {
    ctl.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "cxDraw", disabled: g.drawOffer ? true : null, onclick: offerDraw }, ["Offer draw"]));
  }
  if (!g.over) ctl.appendChild(h("button", { type: "button", class: "cx-btn danger sm", id: "cxResign", onclick: resign }, ["Resign"]));
  else {
    if (GUEST_TOKEN) ctl.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxNew", onclick: showGuestEnded }, ["Finish"]));
    else {
      if (g.mode === "online" && !(g.opponent && g.opponent.guest)) ctl.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxRematch", onclick: rematch }, ["Rematch"]));
      ctl.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxNew", onclick: leaveGame }, ["New game"]));
    }
  }
  if (!g.over && !GUEST_TOKEN) ctl.appendChild(h("button", { type: "button", class: "cx-btn ghost sm", id: "cxMenuBtn", onclick: leaveAsk }, ["Menu"]));
  tickClocks();
  paintVoice();
}

function resultText(g) {
  const r = g.result || {};
  if (g.spectator) {
    const why = { checkmate: "checkmate", resign: "resignation", timeout: "time", move_timeout: "a move taking over 60 seconds", adjudicated: "the better position when time ended", abandoned: "a player leaving", stalemate: "stalemate", agreement: "agreement", insufficient: "not enough pieces", repetition: "repetition", fifty: "the 50-move rule" }[r.reason] || r.reason;
    return r.winner == null ? "Draw by " + why : (r.winner === "w" ? "White" : "Black") + " won by " + why;
  }
  const you = g.myColor;
  if (r.winner == null) {
    const why = { stalemate: "stalemate", insufficient: "not enough pieces to win", repetition: "the same position three times", fifty: "the 50-move rule", agreement: "agreement", adjudicated: "an even position when the game time ended", abandoned_both: "both players left", timeout_insufficient: "time ran out but the other side cannot win" }[r.reason] || r.reason;
    return "Draw by " + why;
  }
  const won = r.winner === you;
  const why = { checkmate: "checkmate", resign: won ? "your opponent resigned" : "you resigned", timeout: "time", move_timeout: won ? "your opponent took longer than 60 seconds to move" : "taking longer than 60 seconds to move", adjudicated: won ? "a clearly better position when the game time ended" : "your opponent having a clearly better position when the game time ended", abandoned: won ? "your opponent left" : "you left" }[r.reason] || r.reason;
  return (won ? "You won by " : "You lost by ") + why;
}

async function claimBotReward(g, line) {
  line.hidden = false;
  line.replaceChildren(h("span", { class: "cx-roll" }), " Checking your game");
  try {
    const d = await api("/api/chess/bot/finish", {
      token: g.rewardToken, humanColor: g.myColor, moves: g.chess.uciHistory(),
      timings: g.humanLog || [], blurCount: g.blur ? g.blur.count : 0, blurMs: g.blur ? g.blur.ms : 0, undone: !!g.undone,
    });
    line.className = "cx-reward" + (d.rewarded ? " ok" : "");
    line.textContent = d.message || (d.rewarded ? "+1 coin!" : "");
    if (d.rewarded) sound.win();
  } catch (e) {
    line.className = "cx-reward";
    line.textContent = e.message || "Could not check this game.";
  }
}

function showResult() {
  const g = state.game;
  if (!g) return;
  const r = g.result || {};
  if (r.winner == null) sound.draw(); else sound.win();     // whoever wins, the winner tune plays
  const title = r.winner == null ? "Draw" : g.spectator ? (r.winner === "w" ? "White wins" : "Black wins") : r.winner === g.myColor ? "You won!" : "You lost";
  const canRematch = g.mode === "online" && !g.spectator && !GUEST_TOKEN && !(g.opponent && g.opponent.guest);
  const rewardLine = h("p", { id: "cxReward", class: "cx-reward", hidden: true });
  const m = modal([
    h("h2", { id: "cxResultTitle", text: title }),
    h("p", { id: "cxResultText", text: resultText(g) }),
    rewardLine,
    h("div", { class: "row" }, [
      h("button", { type: "button", class: "cx-btn ghost", id: "cxResultClose", onclick: () => m.close() }, ["View board"]),
      GUEST_TOKEN
        ? h("button", { type: "button", class: "cx-btn", id: "cxResultNew", onclick: () => { m.close(); showGuestEnded(); } }, ["Continue"])
        : h("button", { type: "button", class: "cx-btn", id: "cxResultNew", onclick: () => { m.close(); if (canRematch) rematch(); else leaveGame(); } }, [canRematch ? "Rematch" : "New game"]),
    ]),
  ]);
  if (g.mode === "bot" && g.level === "hard" && g.rewardToken && r.winner === g.myColor && !g.rewardAsked) {
    g.rewardAsked = true;
    claimBotReward(g, rewardLine);
  }
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
  const elapsed = g.over || g.paused ? 0 : serverNow() - g.clockAt;
  const left = (c) => (g.clocks[c] - (!g.over && turn === c ? elapsed : 0));
  const oppC = g.myColor === "w" ? "b" : "w";
  const paint = (id, c) => {
    const el = $(id);
    if (!el) return;
    const ms = left(c);
    el.textContent = fmtClock(ms);
    el.classList.toggle("run", !g.over && !g.paused && turn === c);
    el.classList.toggle("low", ms < 10000 && ms >= 0);
  };
  paint("cxOppClk", oppC);
  paint("cxMeClk", g.myColor);
  let ends = $("cxEnds");
  if (!ends) {
    const info = document.querySelector(".cx-info");
    if (info) { ends = h("div", { class: "cx-ends", id: "cxEnds" }); info.insertBefore(ends, info.querySelector(".cx-moves")); }
  }
  if (ends) {
    if (g.over || !g.endsAt) ends.textContent = "";
    else {
      const left = Math.max(0, g.endsAt - serverNow());
      ends.textContent = "60 seconds a move | game ends in " + fmtClock(left) + (left <= 0 ? " | judging the position" : "");
    }
  }
}
setInterval(tickClocks, 250);

function undoBot() {
  if (state.game) state.game.undone = true;
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
      try { await api(BASE + "/game/" + encodeURIComponent(g.id) + "/resign", { key: g.key }); } catch (e) { toast(e.message); }
    } }, ["Resign"]),
  ])]);
}

function offerDraw() {
  const g = state.game;
  if (!g || g.mode !== "online" || g.over) return;
  api(BASE + "/game/" + encodeURIComponent(g.id) + "/draw", { key: g.key }).then(() => toast("Draw offered.")).catch((e) => toast(e.message));
}

function askDraw() {
  const g = state.game;
  const m = modal([h("h2", { text: "Draw offer" }), h("p", { text: (g.opponent.name || g.opponent.username) + " offers a draw." }), h("div", { class: "row" }, [
    h("button", { type: "button", class: "cx-btn ghost", id: "cxDrawNo", onclick: () => { m.close(); api(BASE + "/game/" + encodeURIComponent(g.id) + "/draw/respond", { key: g.key, accept: false }).catch(() => {}); } }, ["Decline"]),
    h("button", { type: "button", class: "cx-btn", id: "cxDrawYes", onclick: () => { m.close(); api(BASE + "/game/" + encodeURIComponent(g.id) + "/draw/respond", { key: g.key, accept: true }).catch((e) => toast(e.message)); } }, ["Accept"]),
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
    await api("/api/chess/challenge", { toUid: opp.uid, color: g.myColor === "w" ? "black" : "white" });
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
    opponent: v.opponent, minutes: v.minutes, endsAt: v.endsAt, paused: !!v.paused, clocks: v.clocks, clockAt: Date.now() + state.offset - 0, pending: null,
    selected: null, targets: new Map(), legal: [], last: uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null,
    over: v.status === "over", result: v.result, opponentOnline: v.opponentOnline !== false, drawOffer: v.drawOffer, forfeitAt: null,
  };
  g.clockAt = v.serverTime || serverNow();
  if (v.serverTime) state.offset = v.serverTime - Date.now();
  const same = state.game && state.game.mode === "online" && state.game.id === v.id;
  markOnline(v.status === "over" ? null : v.id);
  enterGame(g);
  if (!resume || !same) toast(resume ? "Welcome back to your game." : "Game started. You are " + (v.color === "w" ? "White." : "Black."));
  if (v.status !== "over") { startVoiceFor(state.game); ackMove(state.game); }
  const m = document.querySelectorAll(".cx-ov");
  m.forEach((x) => x.remove());
  renderBanner();
}

function ackMove(g) {
  if (!g || g.mode !== "online" || g.spectator || g.over || !g.key) return;
  if (g.chess.turnColor() !== g.myColor) return;
  api(BASE + "/game/" + encodeURIComponent(g.id) + "/ack", { key: g.key, ply: g.chess.uciHistory().length }).catch(() => {});
}

async function resyncGame(loud) {
  const g = state.game;
  if (!g || g.mode !== "online" || g.over) return;
  try {
    const v = await api(BASE + "/game/" + encodeURIComponent(g.id) + "/state", { key: g.key });
    const cur = state.game;
    if (!cur || cur.id !== v.id) return;
    const localPlies = cur.chess.uciHistory().length;
    if (v.status === "over") { if (!cur.over) onServerGameOver({ gameId: v.id, winner: v.result && v.result.winner, reason: v.result && v.result.reason, clocks: v.clocks, fen: v.fen }); return; }
    if ((v.moves || []).length !== localPlies) {
      state.lastEvent = Date.now();
      if (cur.spectator) startSpectate(v, cur.roomCode); else startOnlineGame(v, { resume: true });
      toast(loud ? "Board updated." : "Your opponent had already played. Board updated.");
      sound.move();
    } else if (loud) toast("You are up to date.");
  } catch (e) {
    if (loud) toast("Could not reach the server. Check your internet.");
  }
}

function netWatch() {
  const g = state.game;
  let box = $("cxNet");
  if (!box) {
    const col = document.querySelector(".cx-boardcol");
    if (!col) return;
    box = h("div", { id: "cxNet", class: "cx-net", hidden: true });
    col.insertBefore(box, col.firstChild);
  }
  const hide = () => { if (!box.hidden) { box.hidden = true; box.textContent = ""; box.removeAttribute("data-msg"); } };
  if (!g || g.mode !== "online" || g.over) { hide(); return; }
  const silent = Date.now() - (state.lastEvent || Date.now());
  let msg = null;
  if (navigator.onLine === false) msg = "You are offline. Check your internet connection.";
  else if (state.conn !== "online") msg = "Reconnecting to the game...";
  else if (silent > 24000) msg = g.chess.turnColor() === g.myColor
    ? "No updates from the server. Check your internet, or refresh the page."
    : "No updates from the server yet. Your opponent may have moved. Check your internet, or refresh the page.";
  if (silent > 24000 && state.conn === "online" && Date.now() - (state.lastKick || 0) > 20000) { state.lastKick = Date.now(); connect(); }
  if (msg) {
    if (box.getAttribute("data-msg") !== msg) {
      box.setAttribute("data-msg", msg);
      box.textContent = "";
      box.appendChild(h("span", { class: "cx-roll" }));
      box.appendChild(h("span", { class: "t", text: msg }));
      box.appendChild(h("button", { type: "button", class: "cx-btn sm", id: "cxNetRefresh", onclick: (e) => { busy(e.currentTarget, true); resyncGame(true).finally(() => busy(e.currentTarget, false)); } }, ["Refresh"]));
    }
    box.hidden = false;
  } else hide();
  if (!msg && !g.spectator && g.chess.turnColor() !== g.myColor && Date.now() - (state.lastPoll || 0) > 5000) { state.lastPoll = Date.now(); resyncGame(false); }
  else if (!msg && g.spectator && Date.now() - (state.lastPoll || 0) > 8000) { state.lastPoll = Date.now(); resyncGame(false); }
}

function onServerMove(ev) {
  const g = state.game;
  if (!g || g.mode !== "online" || g.id !== ev.gameId) return;
  if (ev.serverTime) state.offset = ev.serverTime - Date.now();
  const mine = !g.spectator && ev.move.color === g.myColor;
  if (mine && g.pending === ev.move.uci) {
    g.pending = null;
  } else if (!mine) {
    const info = g.chess.move({ from: ev.move.from, to: ev.move.to, promotion: ev.move.promotion || undefined });
    if (!info) { connect(); return; }
    playMoveSound(info);
    g.last = { from: ev.move.from, to: ev.move.to };
    g.selected = null; g.targets = new Map();
    g.legal = g.chess.moves();
  }
  g.clocks = ev.clocks;
  g.clockAt = ev.serverTime || serverNow();
  g.paused = !!ev.paused;
  if (ev.drawOfferCleared) g.drawOffer = null;
  if (g.chess.fen().split(" ").slice(0, 4).join(" ") !== ev.fen.split(" ").slice(0, 4).join(" ")) { connect(); return; }
  paintBoard();
  renderGameInfo();
  ackMove(g);
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
  markOnline(null);
  g.result = { winner, reason };
  if (clocks) g.clocks = clocks;
  g.pending = null;
  if (g.drawModal) g.drawModal.close();
  renderGameInfo();
  paintBoard();
  if (!silent) showResult();
}

const ICON = {
  cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.2 3.2 0 010 6.2M18 14.3c2 .8 3 2.6 3 5.7"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  swords: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M9.5 6.5L21 18v3h-3L6.5 9.5M11 5L5 11M8 8L4 4M5 3L3 5"/></svg>',
  tick: '<svg viewBox="0 0 24 24" aria-label="Verified"><path fill="#00E0FF" d="M12 2l2.2 1.8 2.9-.6.9 2.8 2.8.9-.6 2.9L22 12l-1.8 2.2.6 2.9-2.8.9-.9 2.8-2.9-.6L12 22l-2.2-1.8-2.9.6-.9-2.8-2.8-.9.6-2.9L2 12l1.8-2.2-.6-2.9 2.8-.9.9-2.8 2.9.6z"/><path fill="none" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8.3 12.2l2.4 2.3 4.7-5.1"/></svg>',
};
const html = (tag, cls, markup) => { const el = h(tag, { class: cls }); el.innerHTML = markup; return el; };


const voice = createVoice({
  post: (path, body) => api(BASE + path, body),
  getIce: () => api(BASE + "/ice"),
  onChange: () => paintVoice(),
});
const VI = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
  micOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9v2a3 3 0 005 2.2M15 9.3V6a3 3 0 00-5.9-.8"/><path d="M5 11a7 7 0 0011.2 5.6M19 11a7 7 0 01-.6 2.8M12 18v3M3 3l18 18"/></svg>',
  spk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/></svg>',
  spkOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>',
  room: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9.5" r="2.3"/><path d="M16.5 14.2c2.6.2 4.5 2.1 4.5 5.3"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 012-2h9"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.9l7.6-4.3M8.2 13.1l7.6 4.3"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
};
let voiceRaf = 0;
let voiceLast = 0;
let roomUi = null;

function voiceAvailable() {
  const g = state.game;
  return !!(g && g.mode === "online" && g.id);
}

function startVoiceFor(g) {
  if (!g || g.mode !== "online" || !state.me) return;
  const myUid = state.me.uid;
  if (g.spectator) {
    voice.start({ gameId: g.id, key: null, uid: myUid, role: "spectator", color: null, players: { w: g.meProfile && g.meProfile.uid, b: g.opponent && g.opponent.uid } });
  } else {
    const opp = g.opponent && g.opponent.uid;
    voice.start({ gameId: g.id, key: g.key, uid: myUid, role: "player", color: g.myColor, players: g.myColor === "w" ? { w: myUid, b: opp } : { w: opp, b: myUid } });
  }
}

function paintVoice() {
  const dock = $("cxVoiceDock");
  if (!dock) return;
  if (!voiceAvailable() || state.game.over && !state.game.spectator) { dock.hidden = true; return; }
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
        try { await voice.setMic(!voice.micOn); }
        catch (e) { toast(e.message); }
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
    dock.appendChild(h("div", { class: "cx-vwrap" }, [room, h("span", { text: spectator ? "Room" : "Room" })]));
    if (vs.state === "connecting") dock.appendChild(h("div", { class: "cx-vstate" }, [h("span", { class: "cx-roll" }), " Connecting voice"]));
    else if (vs.state === "failed") dock.appendChild(h("div", { class: "cx-vstate cx-verr" }, [h("span", { text: vs.message || "Voice could not connect." }), h("button", { type: "button", class: "cx-btn sm", id: "cxVoiceRetry", onclick: () => { voice.retry(); toast("Trying voice again."); } }, ["Retry"])]));
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

function roomLink(code) { return location.origin + "/chess?watch=" + encodeURIComponent(code); }

async function shareText(text, url) {
  if (navigator.share) { try { await navigator.share({ title: "Watch my chess game", text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
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
    const d = await api(BASE + "/room/settings", { gameId: g.id, key: g.key, ...body });
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
      share.addEventListener("click", () => shareText("Watch my chess game. Room code " + room.code + (room.pinSet ? " (needs the PIN)" : ""), roomLink(room.code)));
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
        box.appendChild(h("div", { class: "cx-roomrow" }, [h("div", { class: "grow" }, [h("b", { text: "Spectator limit" }), h("small", { text: "How many people can watch at once" })]), h("div", { class: "cx-stepper" }, [minus, h("span", { text: String(room.max) }), plus])]));
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
    if (spectator) {
      for (const p of [g.meProfile, g.opponent]) if (p) row(p.uid, p.name || p.username, p.photo, "Player", true, p.verified);
    } else {
      const opp = g.opponent;
      row(meUid, (state.me && (state.me.name || state.me.username) || "You") + " (you)", state.me && state.me.photo, "Player", false, state.me && state.me.verified);
      if (opp) row(opp.uid, opp.name || opp.username, opp.photo, "Player", true, opp.verified);
    }
    for (const w of watchers) if (w.uid !== meUid) row(w.uid, w.name || w.username, w.photo, "Watching", false, w.verified);
    box.appendChild(people);
    box.appendChild(sw("Mute everyone", "Stops all voices on this phone", voice.mutedAll, (v) => { voice.muteAll(v); return Promise.resolve(); }, "cxMuteAll"));
    const more = h("details", { class: "cx-learn" }, [
      h("summary", { text: "Learn more" }),
      h("div", {}, [
        h("p", { text: "The two players can talk to each other with their microphones. Spectators can only listen." }),
        h("p", { text: "Voice goes straight between phones, so the site does not record it. Turn your mic on or off any time with the mic button." }),
        h("p", { text: "The host can let people watch with a room code, add a 4 digit PIN, and choose how many can watch." }),
        h("p", { text: "You can mute any voice just for yourself. Others will not know." }),
      ]),
    ]);
    box.appendChild(more);
  }
  roomUi = { box, draw };
  draw();
  if (!spectator && !(g.room && g.room.code)) {
    try { const d = await api(BASE + "/room", { gameId: g.id, key: g.key }); g.room = d; info = d; draw(); }
    catch (e) { toast(e.message); }
  }
}

function startSpectate(v, code) {
  const chess = new Chess();
  for (const m of v.moves || []) if (!chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] })) break;
  if (state.game && state.game.mode === "bot") state.game.botToken++;
  voice.stop();
  const uci = (v.moves || []).length ? v.moves[v.moves.length - 1].uci : null;
  if (v.serverTime) state.offset = v.serverTime - Date.now();
  const g = {
    mode: "online", spectator: true, chess, myColor: "w", flipped: false, id: v.id, key: null,
    opponent: v.players.b, meProfile: v.players.w, minutes: v.minutes, endsAt: v.endsAt, paused: !!v.paused, clocks: v.clocks, clockAt: v.serverTime || serverNow(), pending: null,
    selected: null, targets: new Map(), legal: [], last: uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null,
    over: v.status === "over", result: v.result, opponentOnline: true, drawOffer: null, forfeitAt: null,
    room: v.room || null, roomCode: code || (state.game && state.game.roomCode) || "",
  };
  enterGame(g);
  document.querySelectorAll(".cx-ov").forEach((x) => x.remove());
  toast("You are watching this game.");
  startVoiceFor(g);
  paintVoice();
}

async function watchRoom(code, pin, btn) {
  busy(btn, true);
  try {
    const d = await api("/api/chess/spectate", { code, pin: pin || undefined });
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
  wrap.appendChild(h("div", { class: "cx-hint", text: "Got a room code from a friend? Enter it to watch their game and listen in." }));
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
  return wrap;
}

const BOARD_THEMES = [
  { id: "es", name: "ES Glass", a: "#3d4d69", b: "#25314a", free: true },
  { id: "classic", name: "Classic", a: "#e9e2d0", b: "#6f8f72" },
  { id: "ocean", name: "Ocean", a: "#cfe3ee", b: "#4f7fa3" },
  { id: "royal", name: "Royal", a: "#d9cdf0", b: "#7357b5" },
  { id: "sunset", name: "Sunset", a: "#ffe3c4", b: "#d9774f" },
  { id: "wood", name: "Wood", a: "#e8c999", b: "#a8743f" },
  { id: "mono", name: "Mono", a: "#e6e6ea", b: "#8d8f99" },
  { id: "midnight", name: "Midnight", a: "#2a2f45", b: "#12151f" },
];
function isVerifiedMe() { return !!(state.me && state.me.verified); }
function activeTheme() {
  const board = store("board", "es");
  const pieces = store("pieces", "glass");
  const v = isVerifiedMe() && !GUEST_TOKEN;
  return {
    board: v && BOARD_THEMES.some((t) => t.id === board) ? board : "es",
    pieces: v && PIECE_SETS[pieces] ? pieces : "glass",
  };
}
function applyTheme() {
  const t = activeTheme();
  const sym = $("cxSymbols");
  if (sym && sym.getAttribute("data-set") !== t.pieces) { sym.innerHTML = pieceSymbols(t.pieces); sym.setAttribute("data-set", t.pieces); }
  const board = $("cxBoard");
  if (board) { if (t.board === "es") board.removeAttribute("data-board"); else board.setAttribute("data-board", t.board); }
}

function openSettings() {
  const verified = isVerifiedMe() && !GUEST_TOKEN;
  const cur = activeTheme();
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
    box.appendChild(h("div", { class: "cx-h", text: "Pieces" }));
    const pc = h("div", { class: "cx-pcs" });
    for (const [id, set] of Object.entries(PIECE_SETS)) {
      const locked = !verified && id !== "glass";
      const b = h("button", { type: "button", class: "cx-pcset" + (now.pieces === id ? " on" : "") + (locked ? " locked" : ""), "data-pieces": id });
      const row = h("div", { class: "pr" });
      row.innerHTML = '<svg viewBox="0 0 45 45">' + pieceInner("n", set.W) + '</svg><svg viewBox="0 0 45 45">' + pieceInner("n", set.B) + '</svg>';
      b.appendChild(row);
      b.appendChild(h("span", { text: set.name }));
      b.addEventListener("click", () => {
        if (locked) { toast("Verified members can change the pieces."); return; }
        save("pieces", id); applyTheme(); draw();
      });
      pc.appendChild(b);
    }
    box.appendChild(pc);
    if (!verified) {
      box.appendChild(h("div", { class: "cx-upsell" }, GUEST_TOKEN
        ? ["Board themes are for verified members."]
        : ["Board themes and piece styles are for ", h("b", { text: "verified members" }), ". ", h("a", { href: "/account" }, ["Get verified"]), " to unlock them."]));
    }
  };
  draw();
  modal([
    h("h2", { text: "Board settings" }),
    box,
    h("div", { class: "row" }, [h("button", { type: "button", class: "cx-btn", id: "cxSettingsDone", onclick: (e) => e.currentTarget.closest(".cx-ov").remove() }, ["Done"])]),
  ]);
}

const SPEAKER_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const SPEAKER_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';

function wireSound() {
  const b = $("cxSound");
  const paint = () => { b.classList.toggle("on", sound.isOn()); b.setAttribute("aria-pressed", String(sound.isOn())); b.innerHTML = sound.isOn() ? SPEAKER_ON : SPEAKER_OFF; };
  const flip = () => { sound.setOn(!sound.isOn()); paint(); };
  b.addEventListener("click", flip);
  b.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  paint();
  document.addEventListener("pointerdown", () => sound.unlock(), { once: true, capture: true });
}

async function loadMe() {
  if (GUEST_TOKEN) return;
  try {
    const d = await api("/api/chess/me");
    if (!state.me) { state.me = d.me; applyTheme(); if (state.game) renderGameInfo(); }
  } catch { /* the live connection sends the same details */ }
}

const KING_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M10 4h4"/><path d="M7 21h10M8 21l1-8M16 21l-1-8"/><path d="M6.5 13h11a2 2 0 000-4 3 3 0 00-5.5-1 3 3 0 00-5.5 1 2 2 0 000 4z"/></svg>';
const OUT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>';
function endedCard(title, text) {
  const btn = h("button", { type: "button", class: "cx-btn", id: "cxCreateGame", onclick: (e) => { busy(e.currentTarget, true); location.href = "/chess"; } });
  btn.innerHTML = 'CREATE GAME <span class="ico">' + OUT_ICON + "</span>";
  const ic = h("div", { class: "ic" }, []);
  ic.innerHTML = KING_ICON;
  return h("div", { class: "cx-card cx-ended", id: "cxEnded" }, [ic, h("h1", { text: title }), h("p", { text }), btn]);
}

const ENDED_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

function showGuestEnded() {
  if (!GUEST_TOKEN) return;
  const fin = state.game && state.game.over ? state.game.result : null;
  if (state.game) { state.game.botToken = (state.game.botToken || 0) + 1; state.game = null; }
  state.guest.info = fin ? { status: "finished", result: fin } : { status: "ended" };
  $("cxGame").hidden = true;
  renderGuest();
}

async function refreshGuestInfo() {
  try { state.guest.info = await api("/api/chess/guest/info/" + encodeURIComponent(GUEST_TOKEN)); }
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
  const ended = (title, text) => { root.appendChild(endedCard(title, text)); };
  if (info.status === "finished") {
    const r = info.result || {};
    const who = r.winner == null ? "The game ended in a draw." : (r.winner === "w" ? "White" : "Black") + " won the game.";
    ended("Game Finished", who + " This link expires 5 minutes after the game ends. Create your own game to play again.");
    return;
  }
  if (info.status === "ended" || info.status === "expired") {
    ended("Game Link Expired", "This game link is no longer active. Create your own game to play with friends.");
    return; }
  if (info.status === "error") {
    card([h("h2", { text: "Could not open the game" }), h("p", { class: "cx-hint", style: "margin-top:8px", text: info.error || "Check your connection and try again." }), h("button", { type: "button", class: "cx-btn", id: "cxGuestRetry", onclick: (e) => { busy(e.currentTarget, true); initGuest(); } }, ["Try again"])]);
    return;
  }
  if (info.status === "playing" && !info.you) { ended("This link is already in use", "Someone is already playing on this link. Create your own game to play."); return; }
  const host = info.host || {};
  const hostLine = h("div", { class: "cx-hostline" }, [avatar({ name: host.name || host.username, photo: host.photo })]);
  if (state.guest.joined) {
    const waiting = state.conn === "unavailable"
      ? [h("p", { class: "cx-hint", text: "Could not connect. Check your internet and try again." }), h("button", { type: "button", class: "cx-btn", id: "cxGuestReconnect", onclick: () => { retries = 0; connect(); } }, ["Reconnect"])]
      : state.guestWait
        ? [h("p", { class: "cx-hint", id: "cxGuestWait", text: state.guestWait }), h("button", { type: "button", class: "cx-btn", id: "cxGuestStart", onclick: async (e) => { const btn = e.currentTarget; busy(btn, true); try { await api("/api/chess/guest/start", {}); state.guestWait = null; renderGuest(); } catch (err) { busy(btn, false); state.guestWait = err.message; toast(err.message); } } }, ["Try again"])]
        : [h("div", { class: "cx-loading" }, [h("span", { class: "cx-roll" }), "Starting your game"])];
    card([hostLine, h("h2", { text: "Playing " + (host.name || host.username || "the host") }), ...waiting]);
    return;
  }
  const input = h("input", { class: "cx-field", id: "cxGuestName", type: "text", maxlength: "20", placeholder: "Your name", autocomplete: "off", value: keepName || "" });
  card([
    hostLine,
    h("h2", { text: (host.name || host.username || "Someone") + " invited you to play chess" }),
    h("p", { class: "cx-hint", style: "margin-top:8px", text: "60 seconds a move. No account needed. Pick a name and join." }),
    input,
    h("button", { type: "button", class: "cx-btn", id: "cxGuestJoin", onclick: (e) => joinGuest(e.currentTarget, input) }, ["Join game"]),
  ]);
}

async function joinGuest(btn, input) {
  const name = input.value.trim();
  if (name.length < 2) { toast("Enter a name (at least 2 letters)."); return; }
  busy(btn, true);
  try {
    await api("/api/chess/guest/join/" + encodeURIComponent(GUEST_TOKEN), { name });
    save("guestname", name);
    state.guest.name = name;
    state.guest.joined = true;
    state.guest.info.you = true;
    state.guest.info.status = "playing";
    renderGuest();
    retries = 0;
    connect();
  } catch (e) {
    busy(btn, false);
    toast(e.message);
    if (e.code === "ended" || e.code === "playing" || e.code === "expired") refreshGuestInfo();
  }
}

async function initGuest() {
  $("cxMenu").hidden = true;
  const back = $("cxBack");
  if (back) back.setAttribute("href", "/chess");
  renderGuest();
  try { state.guest.info = await api("/api/chess/guest/info/" + encodeURIComponent(GUEST_TOKEN)); }
  catch (e) { state.guest.info = { status: "error", error: e.message }; }
  if (state.guest.info.you && state.guest.info.status === "playing") { state.guest.joined = true; retries = 0; connect(); }
  renderGuest();
}

function init() {
  $("cxSymbols").innerHTML = pieceSymbols();
  wireBoard();
  wireSound();
  const cog = $("cxCog");
  if (cog) { cog.addEventListener("click", openSettings); cog.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSettings(); } }); }
  applyTheme();
  document.addEventListener("visibilitychange", () => {
    const bg = state.game;
    if (bg && bg.mode === "bot" && bg.blur && !bg.over) {
      if (document.hidden) { if (bg.chess.turnColor() === bg.myColor) { bg.blur.count++; bg.blur.at = Date.now(); } }
      else if (bg.blur.at) { bg.blur.ms += Date.now() - bg.blur.at; bg.blur.at = 0; }
    }
    if (document.hidden) { saveGame(); return; }
    if (GUEST_TOKEN && !state.guest.joined) return;
    if (!es || es.readyState === EventSource.CLOSED) { retries = 0; connect(); }
    const g = state.game;
    if (g && g.mode === "bot" && !g.over && g.chess.turnColor() !== g.myColor && !g.thinking) botTurn();
  });
  window.addEventListener("pagehide", saveGame);
  setInterval(netWatch, 1000);
  window.addEventListener("online", () => { retries = 0; connect(); setTimeout(() => resyncGame(false), 800); });
  window.addEventListener("offline", () => netWatch());
  window.addEventListener("beforeunload", (e) => {
    const g = state.game;
    if (g && g.mode === "online" && !g.over) { e.preventDefault(); e.returnValue = ""; }
  });
  if (GUEST_TOKEN) { initGuest(); return; }
  try { const w = new URLSearchParams(location.search).get("watch"); if (w) { state.watchCode = w.toUpperCase().slice(0, 6); state.tab = "online"; } } catch { /* ignore */ }
  state.resuming = hadOnlineGame();
  if (state.resuming) setTimeout(() => { if (state.resuming) { state.resuming = false; renderLobby(); } }, 12000);
  if (!restoreBotGame()) renderMenu();
  loadMe();
  connect();
}
init();
window.__chess = { state, voice, refresh: () => { const g = state.game; if (!g) return; g.selected = null; g.targets = new Map(); g.legal = g.chess.moves(); paintBoard(); renderGameInfo(); } };
