import express from "express";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import { requireAuth, sessionSid, reissueSessionToken, SESSION_TTL_MS, userHasFaceId, verifyLoginFace, issueCode, checkCode, getUserProfile } from "../services/auth.js";
import { listUserBans } from "../services/device-bans.js";
import { getDeviceSession, listDevices, setTrusted, removeTrustedDevice, removeTrustedDevices, setTrustedDevicesLabel, revokeDeviceSession } from "../services/device-sessions.js";

export const devicesRouter = express.Router();
const deviceOtpLimiter = new SimpleRateLimiter(5, 15 * 60 * 1000, (req) => req.uid).middleware();

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
    if (trusted && (await userHasFaceId(req.uid))) {
      const probe = req.body?.faceDescriptor;
      if (!probe) return res.status(403).json({ code: "device/face-required", error: "Face ID is required before trusting this device." });
      try {
        await verifyLoginFace(req.uid, probe);
      } catch {
        return res.status(403).json({ code: "device/face-mismatch", error: "That face does not match this account." });
      }
    }
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
  return res.status(410).json({ code: "OTP_REQUIRED", error: "Email verification is required before removing trusted devices." });
});

devicesRouter.post("/api/devices/trusted-group/name", requireAuth, async (req, res) => {
  try {
    const deviceIds = req.body?.deviceIds;
    const label = String(req.body?.label || "").trim();
    if (!Array.isArray(deviceIds) || !label || label.length > 48) return res.status(400).json({ error: "Enter a device name of 1 to 48 characters." });
    const ok = await setTrustedDevicesLabel(req.uid, deviceIds, label);
    if (!ok) return res.status(404).json({ error: "Those trusted device profiles could not be updated. Reload and try again." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not rename this device." });
  }
});

devicesRouter.post("/api/devices/trusted-group/remove/request", requireAuth, deviceOtpLimiter, async (req, res) => {
  try {
    const deviceIds = req.body?.deviceIds;
    if (!Array.isArray(deviceIds) || !deviceIds.length || deviceIds.length > 100 || deviceIds.some((id) => !/^[a-f0-9]{32}$/.test(String(id || "")))) return res.status(400).json({ error: "Invalid device group." });
    const profile = await getUserProfile(req.uid);
    if (!profile?.email) return res.status(400).json({ code: "EMAIL_REQUIRED", error: "Add and verify an email before removing trusted devices." });
    const purpose = "remove_trusted_devices";
    await issueCode(req.uid, profile.email, purpose);
    res.json({ ok: true, email: profile.email.replace(/(^.).*(@.*$)/, "$1••••$2") });
  } catch (err) {
    res.status(err.status || 400).json({ code: err.code || "DEVICE_OTP_REQUEST_FAILED", error: err.userFacing || err.message || "Could not send a verification code." });
  }
});
devicesRouter.post("/api/devices/trusted-group/remove/confirm", requireAuth, deviceOtpLimiter, async (req, res) => {
  try {
    const deviceIds = req.body?.deviceIds;
    if (!Array.isArray(deviceIds) || !deviceIds.length || deviceIds.length > 100 || deviceIds.some((id) => !/^[a-f0-9]{32}$/.test(String(id || "")))) return res.status(400).json({ error: "Invalid device group." });
    const result = await checkCode(req.uid, "remove_trusted_devices", req.body?.code);
    if (!result.ok) return res.status(400).json({ code: "OTP_INVALID", error: result.reason === "expired" ? "That code has expired. Request a new code." : "That verification code is not valid." });
    const ok = await removeTrustedDevices(req.uid, deviceIds);
    if (!ok) return res.status(404).json({ error: "Those trusted device profiles could not be removed. Reload and try again." });
    res.json({ ok: true });
  } catch (err) { res.status(400).json({ error: "Could not remove trust from this device group." }); }
});
devicesRouter.post("/api/devices/trusted-group/remove", requireAuth, async (req, res) => {
  return res.status(410).json({ code: "OTP_REQUIRED", error: "Email verification is required before removing trusted devices." });
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
