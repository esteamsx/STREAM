const path = require("path");

const CHANNEL_REACTION_EMOJIS = ["🙏", "❤️", "👍", "🤭", "😲"];
const BAILEYS = "@whiskeysockets/baileys";

// Channels the bot is admin/subscribed to - new posts on these get an
// automatic reaction the moment they arrive, no manual link submission needed.
const AUTO_REACT_CHANNEL_INVITES = [
  "0029VatAyCwFy72JdZXFPm29",
  "0029VaoYmHz9MF98STZg4w1h",
];

let currentSock = null;
let attached = false;

function captureSocket() {
  let baileys;
  let resolved;
  try {
    resolved = require.resolve(BAILEYS);
    baileys = require(BAILEYS);
  } catch {
    return false;
  }

  const wrap = (original) =>
    function patched(...args) {
      const sock = original.apply(this, args);
      currentSock = sock;
      attachAutoReactListener(sock);
      return sock;
    };

  const targets = ["default", "makeWASocket"].filter((key) => typeof baileys[key] === "function");
  if (!targets.length) return false;

  const patchedByKey = new Map();
  for (const key of targets) patchedByKey.set(key, wrap(baileys[key]));

  let allApplied = true;
  for (const [key, patched] of patchedByKey) {
    try {
      baileys[key] = patched;
      if (baileys[key] === patched) continue;
      throw new Error("not writable");
    } catch {
      try {
        Object.defineProperty(baileys, key, { value: patched, configurable: true, writable: true });
        if (baileys[key] === patched) continue;
      } catch {
        allApplied = false;
      }
      allApplied = false;
    }
  }
  if (allApplied) return true;

  try {
    const entry = require.cache[resolved];
    if (!entry) return false;
    const clone = Object.create(Object.getPrototypeOf(baileys));
    for (const key of Reflect.ownKeys(baileys)) {
      if (patchedByKey.has(key)) continue;
      const desc = Object.getOwnPropertyDescriptor(baileys, key);
      if (desc) Object.defineProperty(clone, key, desc);
    }
    for (const [key, patched] of patchedByKey) {
      Object.defineProperty(clone, key, { value: patched, enumerable: true, configurable: true, writable: true });
    }
    entry.exports = clone;
    return require.cache[resolved].exports.default === patchedByKey.get("default");
  } catch {
    return false;
  }
}

const SOCKET_WAIT_MS = 8000;

function socketState() {
  if (!attached) {
    return "The command bridge could not attach to this bot build, so it cannot drive WhatsApp. Restart the bot, and if it persists the bot template changed how it loads Baileys.";
  }
  return "The bridge is attached but the bot has not opened its WhatsApp connection yet. Wait for it to show Connected, or restart it.";
}

async function requireSocket() {
  if (currentSock) return currentSock;
  const deadline = Date.now() + SOCKET_WAIT_MS;
  while (!currentSock && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  if (!currentSock) throw new Error(socketState());
  return currentSock;
}

function reply(id, payload) {
  process.stdout.write(`ES_TEAMS_CMD_RESULT ${JSON.stringify({ id, ...payload })}\n`);
}

function parseChannelLink(link) {
  const match = String(link || "").match(
    /^https:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]{8,64})(?:\/(\d{1,12}))?$/
  );
  if (!match) return null;
  return { invite: match[1], serverId: match[2] || null };
}

async function channelJidFor(sock, invite) {
  const meta = await sock.newsletterMetadata("invite", invite);
  const jid = meta && (meta.id || meta.jid);
  if (!jid) throw new Error("Could not resolve that channel.");
  return jid;
}

const autoReactJidToInvite = new Map();
const autoReactRecentIds = new Set();

function rememberReactedId(id) {
  autoReactRecentIds.add(id);
  if (autoReactRecentIds.size > 300) {
    const oldest = autoReactRecentIds.values().next().value;
    autoReactRecentIds.delete(oldest);
  }
}

async function resolveAutoReactChannels(sock) {
  for (const invite of AUTO_REACT_CHANNEL_INVITES) {
    const alreadyResolved = [...autoReactJidToInvite.values()].includes(invite);
    if (alreadyResolved) continue;
    try {
      const jid = await channelJidFor(sock, invite);
      autoReactJidToInvite.set(jid, invite);
    } catch (err) {
      console.error("[auto-react] could not resolve channel " + invite + ": " + err.message);
    }
  }
}

function attachAutoReactListener(sock) {
  try {
    if (!sock || sock.__autoReactAttached || !sock.ev || typeof sock.ev.on !== "function") return;
    sock.__autoReactAttached = true;
    resolveAutoReactChannels(sock).catch(() => {});

    sock.ev.on("messages.upsert", async (upsert) => {
      if (!upsert || upsert.type !== "notify" || typeof sock.newsletterReactMessage !== "function") return;
      for (const waMessage of upsert.messages || []) {
        try {
          const remoteJid = waMessage.key && waMessage.key.remoteJid;
          const serverId = waMessage.key && waMessage.key.id;
          if (!remoteJid || !serverId || !remoteJid.endsWith("@newsletter")) continue;

          if (!autoReactJidToInvite.has(remoteJid)) {
            await resolveAutoReactChannels(sock);
            if (!autoReactJidToInvite.has(remoteJid)) continue;
          }
          const dedupeKey = remoteJid + ":" + serverId;
          if (autoReactRecentIds.has(dedupeKey)) continue;
          rememberReactedId(dedupeKey);

          const emoji = CHANNEL_REACTION_EMOJIS[Math.floor(Math.random() * CHANNEL_REACTION_EMOJIS.length)];
          await sock.newsletterReactMessage(remoteJid, String(serverId), emoji);
          console.log("[auto-react] reacted " + emoji + " to new post " + serverId + " on " + autoReactJidToInvite.get(remoteJid));
        } catch (err) {
          console.error("[auto-react] failed on a new channel post:", err.message);
        }
      }
    });
  } catch (err) {
    console.error("[auto-react] could not attach listener:", err.message);
  }
}

async function runChannelReact(msg) {
  const sock = await requireSocket();
  if (typeof sock.newsletterReactMessage !== "function") {
    throw new Error("This bot build cannot react to channel posts.");
  }

  const parsed = parseChannelLink(msg.link);
  if (!parsed) throw new Error("That is not a valid WhatsApp channel post link.");
  if (!parsed.serverId) throw new Error("That link points at the channel, not a specific post.");

  const requested = Array.isArray(msg.emojis)
    ? msg.emojis.filter((e) => typeof e === "string" && e.trim()).map((e) => e.trim().slice(0, 8))
    : [];
  const pool = requested.length ? requested : CHANNEL_REACTION_EMOJIS;
  const emoji = pool[Math.floor(Math.random() * pool.length)];

  const jid = await channelJidFor(sock, parsed.invite);
  await sock.newsletterReactMessage(jid, String(parsed.serverId), emoji);
  return { emoji, emojis: [emoji] };
}

// The relayed ".chreact <link>" message gets deleted after this window as a
// cosmetic cleanup (so it doesn't clutter the chat). 12s was too aggressive -
// if the receiving bot's own connection is even briefly reconnecting or busy,
// the command message could vanish before it's read, and the reaction never
// runs at all. This is not time-critical, so it's fine to wait much longer.
const CLEANUP_DELAY_MS = 180000;
const REPLY_WATCH_MS = 300000;

function quotedIdOf(waMessage) {
  const content = waMessage && waMessage.message;
  if (!content) return null;
  for (const key of Object.keys(content)) {
    const ctx = content[key] && content[key].contextInfo;
    if (ctx && ctx.stanzaId) return ctx.stanzaId;
  }
  return null;
}

function deleteMessage(sock, jid, key) {
  if (!key) return Promise.resolve();
  return Promise.resolve()
    .then(() => sock.sendMessage(jid, { delete: key }))
    .catch(() => {});
}

function scheduleCleanup(sock, jid, key) {
  if (!key || !key.id) return;
  let done = false;
  const removeOwn = () => {
    if (done) return;
    done = true;
    deleteMessage(sock, jid, key);
  };
  const onUpsert = (upsert) => {
    for (const waMessage of (upsert && upsert.messages) || []) {
      const mKey = waMessage && waMessage.key;
      if (!mKey || mKey.remoteJid !== jid || mKey.id === key.id) continue;
      if (quotedIdOf(waMessage) !== key.id) continue;
      deleteMessage(sock, jid, mKey);
      removeOwn();
    }
  };
  try {
    sock.ev.on("messages.upsert", onUpsert);
  } catch {
    setTimeout(removeOwn, CLEANUP_DELAY_MS).unref?.();
    return;
  }
  setTimeout(removeOwn, CLEANUP_DELAY_MS).unref?.();
  setTimeout(() => {
    try { sock.ev.off("messages.upsert", onUpsert); } catch {}
  }, REPLY_WATCH_MS).unref?.();
}

function toJid(number) {
  const digits = String(number || "").replace(/\D/g, "");
  return digits ? `${digits}@s.whatsapp.net` : "";
}

async function runWaCheck(msg) {
  const sock = await requireSocket();
  const digits = String(msg.number || "").replace(/\D/g, "");
  if (!digits) throw new Error("No number provided.");
  const results = await sock.onWhatsApp(digits);
  const hit = Array.isArray(results) ? results.find((r) => r && r.exists) : null;
  return { exists: !!hit, jid: hit ? hit.jid : null };
}

async function runChannelRelay(msg) {
  const sock = await requireSocket();
  const parsed = parseChannelLink(msg.link);
  if (!parsed) throw new Error("That is not a valid WhatsApp channel post link.");
  if (!parsed.serverId) throw new Error("That link points at the channel, not a specific post.");

  const jid = toJid(msg.to);
  if (!jid) throw new Error("The bot has no paired number to send from.");

  const sent = await sock.sendMessage(jid, { text: `.chreact ${msg.link}` });
  scheduleCleanup(sock, jid, sent && sent.key);
  return { relayed: true };
}

async function dispatch(msg) {
  if (msg.cmd === "chreactRelay") return runChannelRelay(msg);
  if (msg.cmd === "chreact") return runChannelReact(msg);
  if (msg.cmd === "wacheck") return runWaCheck(msg);
  throw new Error(`Unknown command: ${msg.cmd}`);
}

function startCommandBridge() {
  let buffer = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    if (buffer.length > 200000) buffer = "";
    let cut;
    while ((cut = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      if (!line) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (!msg || msg.esteams !== "cmd" || !msg.id) continue;

      dispatch(msg)
        .then((extra) => reply(msg.id, { ok: true, ...(extra || {}) }))
        .catch((err) => reply(msg.id, { ok: false, error: err && err.message ? err.message : "Command failed." }));
    }
  });
  process.stdin.on("error", () => {});
  process.stdin.resume();
}

attached = captureSocket();
console.error(
  attached
    ? "ES TEAMS command bridge attached to Baileys."
    : "ES TEAMS command bridge could NOT attach to Baileys, remote commands will not work."
);
startCommandBridge();
require(path.join(__dirname, "index.js"));
