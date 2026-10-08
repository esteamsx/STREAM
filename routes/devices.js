import express from "express";
import { requireAuth, sessionSid, reissueSessionToken, SESSION_TTL_MS } from "../services/auth.js";
import { listUserBans } from "../services/device-bans.js";
import { getDeviceSession, listDevices, setTrusted, removeTrustedDevice, revokeDeviceSession } from "../services/device-sessions.js";

export const devicesRouter = express.Router();

function cookieOpts(maxAge) {
  return { httpOnly: true, secure: true, sameSite: "lax", maxAge };
}

devicesRouter.get("/api/devices", requireAuth, async (req, res) => {
  try {
    const sid = sessionSid(req.cookies?.session);
    const [data, bans] = await Promise.all([listDevices(req.uid, sid), listUserBans(req.uid).catch(() => [])]);
    const now = Date.now();
    data.history.forEach((row) => {
      const b = bans.find((x) => x.deviceId && row.deviceId && x.deviceId === row.deviceId);
      if (b) row.ban = { id: b.id, state: (b.expiresAt || 0) > now ? "banned" : "face_required", expiresAt: b.expiresAt };
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load devices." });
  }
});

devicesRouter.get("/api/devices/prompt", requireAuth, async (req, res) => {
  try {
    const sid = sessionSid(req.cookies?.session);
    const rec = sid ? await getDeviceSession(sid) : null;
    if (!rec || rec.uid !== req.uid || rec.revoked || rec.trustDecided) return res.json({ prompt: false });
    res.json({ prompt: true, device: { name: rec.name, os: rec.os, browser: rec.browser } });
  } catch {
    res.json({ prompt: false });
  }
});

devicesRouter.post("/api/devices/trust", requireAuth, async (req, res) => {
  try {
    const sid = sessionSid(req.cookies?.session);
    if (!sid) return res.status(400).json({ error: "Sign in again to manage this device." });
    const trusted = req.body?.trusted === true;
    const rec = await setTrusted(req.uid, sid, trusted);
    if (!rec) return res.status(404).json({ error: "Device session not found." });
    const fresh = reissueSessionToken(req.cookies.session, trusted);
    if (fresh) res.cookie("session", fresh.token, cookieOpts(trusted ? fresh.maxAge : SESSION_TTL_MS));
    res.json({ ok: true, trusted });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not update this device." });
  }
});

devicesRouter.delete("/api/devices/trusted/:deviceId", requireAuth, async (req, res) => {
  try {
    const deviceId = String(req.params.deviceId || "");
    if (!/^[a-f0-9]{32}$/.test(deviceId)) return res.status(400).json({ error: "Invalid device." });
    await removeTrustedDevice(req.uid, deviceId);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not remove this device." });
  }
});

devicesRouter.post("/api/devices/:sid/logout", requireAuth, async (req, res) => {
  try {
    const target = String(req.params.sid || "");
    if (target === sessionSid(req.cookies?.session)) return res.status(400).json({ error: "Use Log out to sign out of this device." });
    const rec = await getDeviceSession(target);
    if (!rec || rec.uid !== req.uid) return res.status(404).json({ error: "Session not found." });
    await revokeDeviceSession(target, "logout_remote");
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not sign out that device." });
  }
});
