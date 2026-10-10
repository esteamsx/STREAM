import express from "express";
import { db } from "../config/firebase.js";
import { requireAuth, getUserProfile, isAdminEmail } from "../services/auth.js";

export const adminFacesRouter = express.Router();

async function requireAdmin(req, res, next) {
  try {
    const profile = req.userProfile || (await getUserProfile(req.uid));
    if (!profile || !isAdminEmail(profile.email)) return res.status(403).json({ error: "Not authorized." });
    next();
  } catch {
    res.status(403).json({ error: "Not authorized." });
  }
}

adminFacesRouter.get("/api/admin/face-ids", requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection("face_recognition_credentials").select("createdAt", "hasSnapshot").get();
    const rows = snap.docs.map((d) => ({ uid: d.id, createdAt: d.data().createdAt || 0, hasPhoto: !!d.data().hasSnapshot }));
    const users = new Map();
    for (let i = 0; i < rows.length; i += 300) {
      const refs = rows.slice(i, i + 300).map((r) => db.collection("users").doc(r.uid));
      if (!refs.length) continue;
      (await db.getAll(...refs)).forEach((s) => { if (s.exists) users.set(s.id, s.data()); });
    }
    const list = rows
      .map((r) => {
        const u = users.get(r.uid) || {};
        const name = ((u.firstName || "") + " " + (u.lastName || "")).trim();
        return { uid: r.uid, name: name || "Unnamed", username: u.username || "", enrolledAt: r.createdAt, hasPhoto: r.hasPhoto };
      })
      .sort((a, b) => b.enrolledAt - a.enrolledAt);
    res.json({ users: list });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load Face IDs." });
  }
});

adminFacesRouter.get("/api/admin/face-ids/:uid/photo", requireAuth, requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection("face_recognition_credentials").doc(String(req.params.uid || "")).get();
    if (!snap.exists) return res.status(404).json({ error: "Face Scan not found." });
    res.set("Cache-Control", "no-store").json({ snapshot: snap.data().snapshot || null });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Could not load the photo." });
  }
});
