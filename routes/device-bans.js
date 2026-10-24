import express from "express";
import { db } from "../config/firebase.js";
import {
  requireAuth,
  getUserProfile,
  addNotification,
  getAdminUid,
  isAdminEmail,
  userHasFaceId,
  verifyLoginFace,
  sessionSid,
  adminBanUser,
} from "../services/auth.js";
import { getDeviceSession, revokeSessionsForDevice, isTrustedDevice } from "../services/device-sessions.js";
import { removeInspectBlock } from "../services/inspect-guard.js";
import {
  BAN_MS,
  banState,
  findBansForLogin,
  findAccountsMatchingBan,
  createUserBan,
  markFaceMismatch,
  removeUserBan,
  listAllBans,
  listBlacklist,
  blacklistFromBan,
  removeBlacklist,
} from "../services/device-bans.js";

export const deviceBansRouter = express.Router();

function who(p) {
  return ((p && ((p.firstName || "") + " " + (p.lastName || "")).trim()) || (p && p.username ? "@" + p.username : "") || "A user");
}

function describe(d) {
  return [d.name, d.browser, d.ip].filter(Boolean).join(" \u00b7 ");
}

async function notifyAdmin(message) {
  try {
    const adminUid = await getAdminUid();
    if (adminUid) await addNotification(adminUid, "device_ban_admin", message, { link: "/admin" });
  } catch (err) {
    console.error("[device-bans] admin notify failed:", err.message);
  }
}

export async function enforceLoginDevice(req, uid) {
  const bans = await findBansForLogin(uid, req);
  const deviceId = req.cookies?.es_did;
  const alreadyTrusted = await isTrustedDevice(uid, deviceId);
  if (!bans.length && alreadyTrusted) return null;
  if (!bans.length) {
    if (!(await userHasFaceId(uid))) return null;
    const probe = req.body?.faceDescriptor;
    if (!probe) {
      return { status: 403, body: { code: "device/face-required", error: "Face ID is required to sign in from this device." } };
    }
    try {
      await verifyLoginFace(uid, probe);
      req.deviceFaceVerified = true;
      return null;
    } catch {
      return { status: 403, body: { code: "device/face-mismatch", error: "That face does not match this account." } };
    }
  }
  const now = Date.now();
  const active = bans.filter((b) => banState(b, now) === "banned").sort((a, b) => b.expiresAt - a.expiresAt)[0];
  if (active) {
    const hours = Math.max(1, Math.ceil((active.expiresAt - now) / 3600000));
    return { status: 403, body: { code: "device/banned", error: `This device is blocked from this account for another ${hours} hour${hours === 1 ? "" : "s"}.` } };
  }
  const ban = bans[0];
  const probe = req.body?.faceDescriptor;
  if (!probe) {
    return { status: 403, body: { code: "device/face-required", error: "Face ID is required to sign in from this device." } };
  }
  try {
    await verifyLoginFace(uid, probe);
    req.deviceFaceVerified = true;
    return null;
  } catch (err) {
    if (err && err.code === "claim/face-mismatch") {
      const updated = await markFaceMismatch(ban);
      const profile = await getUserProfile(uid);
      const text = `${describe(updated)}`;
      addNotification(uid, "device_ban", `A sign-in attempt from a blocked device (${text}) failed Face ID. That device is blocked again for 72 hours.`, {}).catch(() => {});
      notifyAdmin(`${who(profile)} (@${profile?.username || "user"}): a blocked device (${text}) failed Face ID and was blocked again for 72 hours. Review it in the admin page.`);
      return { status: 403, body: { code: "device/banned", error: "That face does not match this account. This device is blocked for 72 hours." } };
    }
    return { status: 403, body: { code: "device/banned", error: "Face ID could not be verified for this device." } };
  }
}

deviceBansRouter.post("/api/devices/:sid/ban", requireAuth, async (req, res) => {
  try {
    if (!(await userHasFaceId(req.uid))) {
      return res.status(400).json({ code: "face-id-not-set", error: "Set up Face ID on your account first. It's needed to let a blocked device back in." });
    }
    const target = String(req.params.sid || "");
    if (target === sessionSid(req.cookies?.session)) {
      return res.status(400).json({ error: "You can't block the device you're using right now." });
    }
    const rec = await getDeviceSession(target);
    if (!rec || rec.uid !== req.uid) return res.status(404).json({ error: "Device not found." });
    if (rec.deviceId && rec.deviceId === (req.cookies?.es_did || "")) {
      return res.status(400).json({ error: "That is the device you're using right now." });
    }

    const ban = await createUserBan(req.uid, rec, "user");
    await revokeSessionsForDevice(req.uid, rec.deviceId, "device_banned");

    const profile = await getUserProfile(req.uid);
    const text = describe(rec);
    addNotification(req.uid, "device_ban", `You blocked a device (${text}) from your account for 72 hours. After that it must pass your Face ID every time it tries to sign in.`, {}).catch(() => {});
    notifyAdmin(`${who(profile)} (@${profile?.username || "user"}) blocked a device: ${text}. You can blacklist it permanently from the admin page.`);
    res.json({ ok: true, banId: ban.id, expiresAt: ban.expiresAt });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not block that device." });
  }
});

deviceBansRouter.delete("/api/devices/bans/:id", requireAuth, async (req, res) => {
  try {
    const ok = await removeUserBan(req.uid, String(req.params.id || ""));
    if (!ok) return res.status(404).json({ error: "Block not found." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not remove that block." });
  }
});

async function requireAdmin(req, res, next) {
  try {
    const profile = req.userProfile || (await getUserProfile(req.uid));
    if (!profile || !isAdminEmail(profile.email)) return res.status(403).json({ error: "Not authorized." });
    next();
  } catch {
    res.status(403).json({ error: "Not authorized." });
  }
}

deviceBansRouter.get("/api/admin/device-bans", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [bans, blacklist] = await Promise.all([listAllBans(), listBlacklist()]);
    const uids = Array.from(new Set(bans.map((b) => b.uid)));
    const users = new Map();
    for (let i = 0; i < uids.length; i += 300) {
      const refs = uids.slice(i, i + 300).map((u) => db.collection("users").doc(u));
      if (!refs.length) continue;
      (await db.getAll(...refs)).forEach((s) => { if (s.exists) users.set(s.id, s.data()); });
    }
    const now = Date.now();
    res.json({
      bans: bans.map((b) => {
        const u = users.get(b.uid) || {};
        const bl = blacklist.find((e) => (e.fp && e.fp === b.fp) || (e.deviceId && e.deviceId === b.deviceId));
        return {
          id: b.id, uid: b.uid, username: u.username || "", email: u.email || "",
          name: b.name, model: b.model, browser: b.browser, os: b.os, ip: b.ip,
          createdAt: b.createdAt, updatedAt: b.updatedAt, expiresAt: b.expiresAt,
          strikes: b.strikes || 0, state: banState(b, now), source: b.source || "",
          blacklistId: bl ? bl.id : null,
        };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load flagged devices." });
  }
});

deviceBansRouter.post("/api/admin/device-bans/:id/remove", requireAuth, requireAdmin, async (req, res) => {
  try {
    const ref = db.collection("deviceBans").doc(String(req.params.id || ""));
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "Device block not found." });
    const ban = snap.data() || {};
    await Promise.all([ref.delete(), removeInspectBlock(ban)]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not remove that device block." });
  }
});

deviceBansRouter.post("/api/admin/device-bans/:id/ban-matches", requireAuth, requireAdmin, async (req, res) => {
  try {
    const found = await findAccountsMatchingBan(String(req.params.id || ""));
    if (!found) return res.status(404).json({ error: "Flagged device not found." });
    const banned = [];
    for (let i = 0; i < found.uids.length; i += 300) {
      const refs = found.uids.slice(i, i + 300).map((u) => db.collection("users").doc(u));
      const snaps = refs.length ? await db.getAll(...refs) : [];
      for (const s of snaps) {
        if (!s.exists) continue;
        const u = s.data();
        if (isAdminEmail(u.email) || u.banned) continue;
        try {
          await adminBanUser(s.id);
          banned.push({ uid: s.id, username: u.username || "", name: [u.firstName, u.lastName].filter(Boolean).join(" ") });
        } catch (e) { console.error("[device-bans] could not ban", s.id, e && e.message); }
      }
    }
    res.json({ ok: true, banned });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not check for matching accounts." });
  }
});

deviceBansRouter.post("/api/admin/device-bans/:id/blacklist", requireAuth, requireAdmin, async (req, res) => {
  try {
    const entry = await blacklistFromBan(String(req.params.id || ""), req.uid);
    if (!entry) return res.status(404).json({ error: "Flagged device not found." });
    res.json({ ok: true, blacklistId: entry.id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not blacklist that device." });
  }
});

deviceBansRouter.post("/api/admin/device-blacklist/:id/remove", requireAuth, requireAdmin, async (req, res) => {
  try {
    await removeBlacklist(String(req.params.id || ""));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not unban that device." });
  }
});
