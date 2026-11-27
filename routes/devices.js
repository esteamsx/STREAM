import express from "express";
import { SimpleRateLimiter, requireSiteOrigin } from "../middleware/security-middleware.js";
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
devicesRouter.get("/api/devices/trust/face-required", requireAuth, async (req, res) => {
  try { res.set("Cache-Control", "no-store").json({ required: await userHasFaceId(req.uid) }); }
  catch { res.status(503).json({ error: "Could not check Face ID requirements." }); }
});
devicesRouter.post("/api/devices/trust/request", requireAuth, requireSiteOrigin, deviceOtpLimiter, async (req, res) => {
  try {
    const sid = sessionSid(req.cookies?.session);
    if (!sid) return res.status(400).json({ error: "Sign in again to manage this device." });
    if (typeof req.body?.trusted !== "boolean") return res.status(400).json({ error: "Choose whether to trust this device." });
    const rec = await getDeviceSession(sid);
    if (!rec || rec.uid !== req.uid || rec.revoked) return res.status(404).json({ error: "Device session not found." });
    const profile = await getUserProfile(req.uid);
    const email = String(profile?.email || "").trim().toLowerCase();
    if (!email) return res.status(403).json({ code: "EMAIL_REQUIRED", error: "Add an email address to your account before managing trusted devices." });
    await issueCode(req.uid, email, req.body.trusted ? "trust_device_add" : "trust_device_remove");
    res.set("Cache-Control", "no-store").json({ ok: true, email: email.replace(/(^.).*(@.*$)/, "$1••••$2"), resendInSeconds: 30 });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.userFacing || "Could not send a verification code." });
  }
});

devicesRouter.post("/api/devices/trust/confirm", requireAuth, requireSiteOrigin, deviceOtpLimiter, async (req, res) => {
  try {
    const sid = sessionSid(req.cookies?.session);
    const trusted = req.body?.trusted;
    if (!sid) return res.status(400).json({ error: "Sign in again to manage this device." });
    if (typeof trusted !== "boolean") return res.status(400).json({ error: "Choose whether to trust this device." });
    const rec = await getDeviceSession(sid);
    if (!rec || rec.uid !== req.uid || rec.revoked) return res.status(404).json({ error: "Device session not found." });
    const profile = await getUserProfile(req.uid);
    const email = String(profile?.email || "").trim().toLowerCase();
    if (!email) return res.status(403).json({ code: "EMAIL_REQUIRED", error: "Add an email address to your account before managing trusted devices." });
    const result = await checkCode(req.uid, trusted ? "trust_device_add" : "trust_device_remove", req.body?.code);
    if (!result.ok || String(result.email || "").trim().toLowerCase() !== email) {
      const messages = { expired: "That code has expired. Request a new one.", mismatch: "Incorrect verification code.", locked: "Too many incorrect attempts. Request a new code.", not_found: "That code has expired. Request a new one." };
      return res.status(400).json({ code: "OTP_INVALID", error: messages[result.reason] || "Invalid verification code." });
    }
    if (trusted && (await userHasFaceId(req.uid))) {
      const probe = req.body?.faceDescriptor;
      if (!probe) return res.status(403).json({ code: "device/face-required", error: "Face ID is required before trusting this device." });
      try {
        await verifyLoginFace(req.uid, probe);
      } catch {
        return res.status(403).json({ code: "device/face-mismatch", error: "That face does not match this account." });
      }
    }
    const updated = await setTrusted(req.uid, sid, trusted);
    if (!updated) return res.status(404).json({ error: "Device session not found." });
    const fresh = reissueSessionToken(req.cookies.session, trusted);
    if (fresh) res.cookie("session", fresh.token, cookieOpts(trusted ? fresh.maxAge : SESSION_TTL_MS));
    res.set("Cache-Control", "no-store").json({ ok: true, trusted });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.userFacing || "Could not update this device." });
  }
});

devicesRouter.post("/api/devices/trust", requireAuth, async (req, res) => {
  return res.status(410).json({ code: "OTP_REQUIRED", error: "Email verification is required before changing trusted-device status." });
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

devicesRouter.post("/api/devices/trusted-group/remove/request", requireAuth, requireSiteOrigin, deviceOtpLimiter, async (req, res) => {
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
devicesRouter.post("/api/devices/trusted-group/remove/confirm", requireAuth, requireSiteOrigin, deviceOtpLimiter, async (req, res) => {
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
