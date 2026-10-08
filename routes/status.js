import express from "express";
import { db } from "../config/firebase.js";
import {
  requireAuth,
  getUserProfile,
  addNotification,
  validateImageDataUrl,
  isVerificationActive,
  isAdminEmail,
} from "../services/auth.js";

export const statusRouter = express.Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_PER_USER = 15;
const MAX_TEXT = 700;
const MAX_CAPTION = 300;
const MAX_COMMENT = 300;
const MAX_COMMENTS_PER_USER_PER_STATUS = 30;
const MAX_IMAGE_CHARS = 900 * 1024;
const BG_COLORS = ["#128C7E", "#7c5cff", "#FF3B5C", "#0B84FF", "#E5890A", "#2E7D32", "#8E24AA", "#37474F"];

function cleanText(v, max) {
  return String(v == null ? "" : v).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

function displayName(u) {
  return ((u.firstName || "") + " " + (u.lastName || "")).trim() || (u.username ? "@" + u.username : "Someone");
}

function publicUser(uid, u) {
  if (!u) return { uid, username: "", firstName: "", lastName: "", photoURL: null, verified: false };
  return {
    uid,
    username: u.username || "",
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    photoURL: u.showProfilePhoto === false ? null : (u.photoURL || null),
    verified: isAdminEmail(u.email) || isVerificationActive(u),
  };
}

async function loadUsers(uids) {
  const unique = Array.from(new Set(uids.filter(Boolean)));
  const map = new Map();
  for (let i = 0; i < unique.length; i += 300) {
    const refs = unique.slice(i, i + 300).map((id) => db.collection("users").doc(id));
    if (!refs.length) continue;
    const snaps = await db.getAll(...refs);
    snaps.forEach((s) => { if (s.exists) map.set(s.id, publicUser(s.id, s.data())); });
  }
  return map;
}

async function activeStatusesOf(uid) {
  const now = Date.now();
  const snap = await db.collection("statuses").where("uid", "==", uid).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => (s.expiresAt || 0) > now)
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

async function seenIdSet(viewerUid, statusIds) {
  const seen = new Set();
  for (let i = 0; i < statusIds.length; i += 300) {
    const refs = statusIds.slice(i, i + 300).map((id) => db.collection("statusViews").doc(id + "_" + viewerUid));
    if (!refs.length) continue;
    const snaps = await db.getAll(...refs);
    snaps.forEach((s, idx) => { if (s.exists) seen.add(statusIds[i + idx]); });
  }
  return seen;
}

async function deleteStatusCascade(statusId) {
  const [views, comments] = await Promise.all([
    db.collection("statusViews").where("statusId", "==", statusId).get(),
    db.collection("statusComments").where("statusId", "==", statusId).get(),
  ]);
  const refs = [db.collection("statuses").doc(statusId), ...views.docs.map((d) => d.ref), ...comments.docs.map((d) => d.ref)];
  for (let i = 0; i < refs.length; i += 400) {
    const batch = db.batch();
    refs.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

statusRouter.get("/api/status/feed", requireAuth, async (req, res) => {
  try {
    const now = Date.now();
    const snap = await db.collection("statuses").where("expiresAt", ">", now).select("uid", "createdAt").limit(3000).get();
    const byUid = new Map();
    snap.docs.forEach((d) => {
      const s = d.data();
      const entry = byUid.get(s.uid) || { uid: s.uid, ids: [], latestAt: 0 };
      entry.ids.push(d.id);
      entry.latestAt = Math.max(entry.latestAt, s.createdAt || 0);
      byUid.set(s.uid, entry);
    });
    const allIds = [];
    byUid.forEach((e) => allIds.push(...e.ids));
    const seen = await seenIdSet(req.uid, allIds);

    const mineEntry = byUid.get(req.uid) || null;
    const others = Array.from(byUid.values())
      .filter((e) => e.uid !== req.uid)
      .map((e) => ({ uid: e.uid, count: e.ids.length, latestAt: e.latestAt, allSeen: e.ids.every((id) => seen.has(id)) }))
      .sort((a, b) => (a.allSeen === b.allSeen ? b.latestAt - a.latestAt : a.allSeen ? 1 : -1))
      .slice(0, 60);
    const users = await loadUsers(others.map((o) => o.uid));
    res.json({
      meUid: req.uid,
      mine: mineEntry ? { count: mineEntry.ids.length, latestAt: mineEntry.latestAt, allSeen: mineEntry.ids.every((id) => seen.has(id)) } : null,
      users: others.filter((o) => users.has(o.uid)).map((o) => ({ ...o, user: users.get(o.uid) })),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load status updates." });
  }
});

statusRouter.get("/api/status/unseen-count", requireAuth, async (req, res) => {
  try {
    const snap = await db.collection("statuses").where("expiresAt", ">", Date.now()).select("uid").limit(3000).get();
    const byUid = new Map();
    snap.docs.forEach((d) => {
      const u = d.data().uid;
      if (u === req.uid) return;
      if (!byUid.has(u)) byUid.set(u, []);
      byUid.get(u).push(d.id);
    });
    const all = [];
    byUid.forEach((ids) => all.push(...ids));
    const seen = await seenIdSet(req.uid, all);
    let count = 0;
    byUid.forEach((ids) => { if (!ids.every((id) => seen.has(id))) count++; });
    res.json({ count: Math.min(count, 99) });
  } catch (err) {
    res.json({ count: 0 });
  }
});

statusRouter.get("/api/status/summary/:uid", requireAuth, async (req, res) => {
  try {
    const list = await activeStatusesOf(String(req.params.uid || ""));
    if (!list.length) return res.json({ count: 0, allSeen: true });
    const seen = await seenIdSet(req.uid, list.map((s) => s.id));
    res.json({ count: list.length, allSeen: list.every((s) => seen.has(s.id)) });
  } catch (err) {
    res.json({ count: 0, allSeen: true });
  }
});

statusRouter.get("/api/status/user/:uid", requireAuth, async (req, res) => {
  try {
    const ownerUid = String(req.params.uid || "");
    const isOwner = ownerUid === req.uid;
    const list = await activeStatusesOf(ownerUid);
    if (!list.length) return res.status(404).json({ error: "No status to show." });
    const [users, seen] = await Promise.all([loadUsers([ownerUid]), seenIdSet(req.uid, list.map((s) => s.id))]);
    const statuses = [];
    for (const s of list) {
      const item = {
        id: s.id,
        type: s.type,
        text: s.text || "",
        caption: s.caption || "",
        imageDataUrl: s.imageDataUrl || null,
        bg: s.bg || BG_COLORS[0],
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        seen: seen.has(s.id),
      };
      if (isOwner) {
        const [v, c] = await Promise.all([
          db.collection("statusViews").where("statusId", "==", s.id).select("viewerUid").get(),
          db.collection("statusComments").where("statusId", "==", s.id).select().get(),
        ]);
        item.viewCount = v.docs.filter((x) => x.data().viewerUid !== ownerUid).length;
        item.commentCount = c.size;
      }
      statuses.push(item);
    }
    res.json({ user: users.get(ownerUid) || publicUser(ownerUid, null), isOwner, statuses });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load this status." });
  }
});

statusRouter.post("/api/status", requireAuth, async (req, res) => {
  try {
    const type = req.body?.type === "image" ? "image" : req.body?.type === "text" ? "text" : "";
    if (!type) return res.status(400).json({ error: "Status must be text or a photo. Videos are not supported yet." });

    const active = await activeStatusesOf(req.uid);
    if (active.length >= MAX_ACTIVE_PER_USER) {
      return res.status(429).json({ error: "You have too many active updates. Delete one or wait for them to expire." });
    }

    const now = Date.now();
    const doc = { uid: req.uid, type, text: "", caption: "", imageDataUrl: null, bg: BG_COLORS[0], createdAt: now, expiresAt: now + DAY_MS };
    if (type === "text") {
      doc.text = cleanText(req.body?.text, MAX_TEXT);
      if (!doc.text) return res.status(400).json({ error: "Write something first." });
      doc.bg = BG_COLORS.includes(req.body?.bg) ? req.body.bg : BG_COLORS[0];
    } else {
      const img = req.body?.imageDataUrl;
      if (!validateImageDataUrl(img, MAX_IMAGE_CHARS)) {
        return res.status(400).json({ error: "Please choose a valid photo (JPG, PNG or WebP)." });
      }
      doc.imageDataUrl = img;
      doc.caption = cleanText(req.body?.caption, MAX_CAPTION);
    }
    const ref = await db.collection("statuses").add(doc);
    res.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not post your status." });
  }
});

statusRouter.delete("/api/status/:id", requireAuth, async (req, res) => {
  try {
    const ref = db.collection("statuses").doc(String(req.params.id || ""));
    const snap = await ref.get();
    if (!snap.exists || snap.data().uid !== req.uid) return res.status(404).json({ error: "Status not found." });
    await deleteStatusCascade(ref.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not delete this status." });
  }
});

statusRouter.post("/api/status/:id/view", requireAuth, async (req, res) => {
  try {
    const statusId = String(req.params.id || "");
    const snap = await db.collection("statuses").doc(statusId).get();
    if (!snap.exists) return res.status(404).json({ error: "Status not found." });
    const s = snap.data();
    if ((s.expiresAt || 0) <= Date.now()) return res.status(404).json({ error: "Status expired." });
    const ref = db.collection("statusViews").doc(statusId + "_" + req.uid);
    const existing = await ref.get();
    if (!existing.exists) {
      await ref.set({ statusId, ownerUid: s.uid, viewerUid: req.uid, viewedAt: Date.now() });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: "Could not record view." });
  }
});

statusRouter.get("/api/status/:id/details", requireAuth, async (req, res) => {
  try {
    const statusId = String(req.params.id || "");
    const snap = await db.collection("statuses").doc(statusId).get();
    if (!snap.exists || snap.data().uid !== req.uid) return res.status(404).json({ error: "Status not found." });
    const [vSnap, cSnap] = await Promise.all([
      db.collection("statusViews").where("statusId", "==", statusId).get(),
      db.collection("statusComments").where("statusId", "==", statusId).get(),
    ]);
    const views = vSnap.docs.map((d) => d.data()).filter((v) => v.viewerUid !== req.uid).sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0));
    const comments = cSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const users = await loadUsers([...views.map((v) => v.viewerUid), ...comments.map((c) => c.uid)]);
    res.json({
      views: views.map((v) => ({ user: users.get(v.viewerUid) || publicUser(v.viewerUid, null), viewedAt: v.viewedAt })),
      comments: comments.map((c) => ({ id: c.id, text: c.text, createdAt: c.createdAt, user: users.get(c.uid) || publicUser(c.uid, null) })),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load details." });
  }
});

statusRouter.post("/api/status/:id/comments", requireAuth, async (req, res) => {
  try {
    const statusId = String(req.params.id || "");
    const text = cleanText(req.body?.text, MAX_COMMENT);
    if (!text) return res.status(400).json({ error: "Write a comment first." });
    const snap = await db.collection("statuses").doc(statusId).get();
    if (!snap.exists) return res.status(404).json({ error: "Status not found." });
    const s = snap.data();
    if ((s.expiresAt || 0) <= Date.now()) return res.status(404).json({ error: "This status has expired." });
    if (s.uid === req.uid) return res.status(400).json({ error: "You can't comment on your own status." });

    const mine = await db.collection("statusComments").where("statusId", "==", statusId).where("uid", "==", req.uid).select().get();
    if (mine.size >= MAX_COMMENTS_PER_USER_PER_STATUS) {
      return res.status(429).json({ error: "You've reached the comment limit for this status." });
    }
    await db.collection("statusComments").add({ statusId, ownerUid: s.uid, uid: req.uid, text, createdAt: Date.now() });

    const me = await getUserProfile(req.uid);
    await addNotification(s.uid, "status_comment", displayName(me || {}) + " commented on your status: " + (text.length > 60 ? text.slice(0, 57) + "..." : text), {
      statusId,
      commenterUid: req.uid,
      link: "/profile?status=mine",
    });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not send your comment." });
  }
});

async function purgeExpired() {
  try {
    const snap = await db.collection("statuses").where("expiresAt", "<", Date.now()).select().limit(100).get();
    for (const d of snap.docs) await deleteStatusCascade(d.id);
  } catch {
  }
}
setTimeout(purgeExpired, 60 * 1000).unref();
setInterval(purgeExpired, 60 * 60 * 1000).unref();
