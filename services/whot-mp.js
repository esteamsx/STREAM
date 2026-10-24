import crypto from "crypto";

export const SUITS = ["circle", "cross", "triangle", "square", "star"];
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_GAMES = 2000;
const SPECIAL = new Set([1, 2, 5, 8, 14, 20]);

class HubError extends Error { constructor(code, message) { super(message || code); this.code = code; } }
const MESSAGES = {
  no_room: "That Whot room was not found.", room_full: "This Whot room is full.", not_host: "Only the host can start this room.", few_players: "At least 2 players are needed.",
  game_over: "This game is over.", not_your_turn: "It is not your turn.", bad_card: "That card cannot be played.", no_card: "That card is not in your hand.",
  choose_suit: "Choose a symbol for the Whot card.", bad_suit: "Choose a valid symbol.", no_game: "Whot game not found.", bad_key: "This game session is not valid.",
};
const err = (c) => new HubError(c, MESSAGES[c]);

function makeDeck() {
  const deck = [];
  for (const suit of SUITS.slice(0, 4)) for (let value = 1; value <= 14; value++) deck.push({ id: `${suit}-${value}`, suit, value });
  for (let value = 1; value <= 5; value++) deck.push({ id: `star-${value}`, suit: "star", value });
  deck.push({ id: "whot-20", suit: "whot", value: 20 });
  return deck;
}
function shuffle(a, random = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function publicCard(c) { return c ? { id: c.id, suit: c.suit, value: c.value } : null; }

export function createWhotHub({ presence, now = () => Date.now(), random = Math.random } = {}) {
  const games = new Map();
  const rooms = new Map();
  const voice = new Map();
  const emit = (uid, event, data) => presence.emit(uid, event, data);
  const profileOf = (uid, game) => presence.profileOf(uid) || game?.profiles?.[uid] || { uid, name: "Player", username: "" };
  const isOnline = (uid) => presence.isOnline(uid);
  const newCode = () => { let c; do c = Array.from({ length: 6 }, () => ROOM_ALPHABET[Math.floor(random() * ROOM_ALPHABET.length)]).join(""); while (rooms.has(c)); return c; };

  function player(game, uid) { return game.players.find((p) => p.uid === uid); }
  function top(game) { return game.discard[game.discard.length - 1]; }
  function view(game, uid, includeKey = false) {
    const me = player(game, uid);
    return { id: game.id, you: uid, status: game.status, room: game.room, turn: game.turn, currentSuit: game.currentSuit, pendingDraw: game.pendingDraw,
      top: publicCard(top(game)), deckCount: game.deck.length, players: game.players.map((p) => ({ uid: p.uid, ...profileOf(p.uid, game), count: p.hand.length, online: isOnline(p.uid), score: p.score, host: p.uid === game.room.host })),
      hand: me ? me.hand.map(publicCard) : [], result: game.result, seq: game.seq, key: includeKey && me ? me.key : undefined, log: game.log.slice(-14) };
  }
  function broadcast(game, event = "update") { game.seq++; for (const p of game.players) emit(p.uid, "whot_state", { event, ...view(game, p.uid) }); }
  function drawCard(game) {
    if (!game.deck.length && game.discard.length > 1) { const keep = game.discard.pop(); game.deck = shuffle(game.discard.splice(0), random); game.discard = [keep]; }
    return game.deck.pop() || null;
  }
  function nextIndex(game, steps = 1) { let i = game.players.findIndex((p) => p.uid === game.turn); for (let n = 0; n < steps; n++) i = (i + 1) % game.players.length; return i; }
  function advance(game, steps = 1) { game.turn = game.players[nextIndex(game, steps)].uid; }
  function createGame(hostUid) {
    if (games.size >= MAX_GAMES) throw new HubError("server_full", "The Whot server is full.");
    const game = { id: crypto.randomBytes(8).toString("hex"), status: "waiting", seq: 0, profiles: {}, players: [], deck: shuffle(makeDeck(), random), discard: [], turn: null, currentSuit: null, pendingDraw: 0, result: null, log: [], room: { code: newCode(), host: hostUid, max: 4 } };
    rooms.set(game.room.code, game.id); games.set(game.id, game); addPlayer(game, hostUid); return game;
  }
  function addPlayer(game, uid) {
    if (player(game, uid)) return player(game, uid);
    if (game.players.length >= game.room.max) throw err("room_full");
    const p = { uid, key: crypto.randomBytes(12).toString("hex"), hand: [], score: 0 };
    game.players.push(p); game.profiles[uid] = profileOf(uid, game);
    if (game.status === "waiting") for (let i = 0; i < 7; i++) p.hand.push(drawCard(game));
    return p;
  }
  function start(game, uid) {
    if (game.room.host !== uid) throw err("not_host");
    if (game.players.length < 2) throw err("few_players");
    while (game.discard.length === 0) { const c = drawCard(game); if (c && !SPECIAL.has(c.value) && c.value !== 20) { game.discard.push(c); game.currentSuit = c.suit; } else if (c) game.deck.unshift(c); }
    game.status = "active"; game.turn = game.players[0].uid; game.log.push(`${profileOf(uid, game).name || "Host"} started the game.`); broadcast(game, "started");
  }
  function getGame(uid, id, key) { const g = games.get(String(id)); const p = g && player(g, uid); if (!g || !p) throw err("no_game"); if (key && p.key !== key) throw err("bad_key"); return { game: g, me: p }; }
  function playable(game, card) { return !!card && (card.value === 20 || card.suit === game.currentSuit || card.value === top(game)?.value || (game.pendingDraw > 0 && (card.value === 2 || card.value === 5))); }
  function play(uid, id, key, cardId, suit) {
    const { game, me } = getGame(uid, id, key); if (game.status !== "active") throw err("game_over"); if (game.turn !== uid) throw err("not_your_turn");
    const at = me.hand.findIndex((c) => c.id === cardId); if (at < 0) throw err("no_card"); const card = me.hand[at]; if (!playable(game, card)) throw err("bad_card");
    if (card.value === 20 && !SUITS.includes(suit)) throw err("choose_suit");
    me.hand.splice(at, 1); game.discard.push(card); game.currentSuit = card.value === 20 ? suit : card.suit;
    if (card.value === 2) game.pendingDraw += 2; else if (card.value === 5) game.pendingDraw += 3; else if (game.pendingDraw) game.pendingDraw = 0;
    if (card.value === 14) for (const other of game.players) if (other.uid !== uid) { const market = drawCard(game); if (market) other.hand.push(market); }
    const effect = card.value === 1 ? "Hold on" : card.value === 2 ? `Pick ${game.pendingDraw}` : card.value === 5 ? `Pick ${game.pendingDraw}` : card.value === 8 ? "Suspension" : card.value === 14 ? "General market" : card.value === 20 ? `Whot → ${suit}` : "";
    game.log.push(`${profileOf(uid, game).name || "Player"} played ${card.suit} ${card.value}${effect ? ` · ${effect}` : ""}.`);
    if (!me.hand.length) { game.status = "over"; game.result = { winner: uid, scores: game.players.map((p) => ({ uid: p.uid, score: p.hand.reduce((s, c) => s + c.value, 0) })) }; broadcast(game, "over"); return view(game, uid, true); }
    const steps = card.value === 1 ? 0 : card.value === 8 ? 2 : 1; if (steps) advance(game, steps); broadcast(game, "played"); return view(game, uid, true);
  }
  function draw(uid, id, key) {
    const { game, me } = getGame(uid, id, key); if (game.status !== "active") throw err("game_over"); if (game.turn !== uid) throw err("not_your_turn");
    const amount = game.pendingDraw || 1; for (let i = 0; i < amount; i++) { const c = drawCard(game); if (c) me.hand.push(c); }
    game.log.push(`${profileOf(uid, game).name || "Player"} drew ${amount} card${amount === 1 ? "" : "s"}.`); game.pendingDraw = 0; advance(game); broadcast(game, "drew"); return view(game, uid, true);
  }
  function connect(uid) { const g = [...games.values()].find((x) => player(x, uid)); if (g) emit(uid, "whot_state", { event: "reconnect", ...view(g, uid) }); }
  function room(uid) { const g = createGame(uid); return { ...view(g, uid, true), key: player(g, uid).key }; }
  function join(uid, code) { const g = games.get(rooms.get(String(code || "").toUpperCase())); if (!g || g.status !== "waiting") throw err("no_room"); const p = addPlayer(g, uid); for (const seated of g.players) emit(seated.uid, "whot_room", view(g, seated.uid)); emit(uid, "whot_state", { event: "joined", ...view(g, uid, true) }); return { ...view(g, uid, true), key: p.key }; }
  function onSignal(uid, id, key, to, data) { const { game } = getGame(uid, id, key); if (!player(game, to) || !data || typeof data.kind !== "string") throw new HubError("bad_signal", "That voice signal was not valid."); emit(to, "whot_voice", { gameId: id, from: uid, data }); return { ok: true }; }
  function voiceJoin(uid, id, key) { const { game } = getGame(uid, id, key); const players = {}; game.players.forEach((p, i) => { players[i] = p.uid; }); const color = game.players.findIndex((p) => p.uid === uid); return { players, color, role: "player" }; }
  return { HubError, connect, room, join, start: (uid, id, key) => { const { game } = getGame(uid, id, key); start(game, uid); return view(game, uid, true); }, play, draw, view: (uid, id, key) => view(getGame(uid, id, key).game, uid, true), onSignal, voiceJoin, isBusy: (uid) => [...games.values()].some((g) => g.status === "active" && player(g, uid)), cleanup: () => { for (const [id, g] of games) if (g.status === "over" && now() - g.endedAt > 15 * 60 * 1000) { games.delete(id); rooms.delete(g.room.code); } } };
}
