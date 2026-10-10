import { Router } from "express";
import crypto from "crypto";
import { db } from "../config/firebase.js";
import { sendSupportMessage, getSupportMessages } from "../services/auth.js";
import { clientIp } from "../services/client-ip.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";

const router = Router();

const VID_RE = /^[a-f0-9]{32}$/;
const COOKIE = "es_vid";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

const sendLimiter = new SimpleRateLimiter(8, 60 * 1000, (req) => clientIp(req)).middleware();
const readLimiter = new SimpleRateLimiter(60, 60 * 1000, (req) => clientIp(req)).middleware();
const newThreadHits = new Map();

function newThreadAllowed(ip) {
  const now = Date.now();
  const hits = (newThreadHits.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (hits.length >= 5) return false;
  hits.push(now);
  newThreadHits.set(ip, hits);
  return true;
}
setInterval(() => newThreadHits.clear(), 6 * 60 * 60 * 1000).unref();

function readVid(req) {
  const fromHeader = String(req.headers["x-visitor-id"] || "").toLowerCase();
  if (VID_RE.test(fromHeader)) return fromHeader;
  const fromCookie = String((req.cookies && req.cookies[COOKIE]) || "").toLowerCase();
  if (VID_RE.test(fromCookie)) return fromCookie;
  return null;
}

function setVidCookie(req, res, vid) {
  res.cookie(COOKIE, vid, { maxAge: THIRTY_DAYS, httpOnly: true, sameSite: "lax", secure: !!req.secure, path: "/" });
}

async function nextVisitorNumber() {
  const ref = db.collection("siteMeta").doc("visitorCounter");
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const n = (snap.exists ? snap.data().count || 0 : 0) + 1;
    tx.set(ref, { count: n }, { merge: true });
    return n;
  });
}

router.get("/api/visitor-support/messages", readLimiter, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const vid = readVid(req);
    if (!vid) return res.json({ messages: [], visitorId: null });
    const messages = await getSupportMessages(`visitor_${vid}`, false);
    res.json({ messages, visitorId: vid });
  } catch (err) {
    res.status(500).json({ error: "Could not load messages." });
  }
});

router.get("/api/visitor-support/unread", readLimiter, async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const vid = readVid(req);
    if (!vid) return res.json({ count: 0 });
    const snap = await db.collection("supportThreads").doc(`visitor_${vid}`).get();
    res.json({ count: snap.exists ? snap.data().unreadForUser || 0 : 0 });
  } catch {
    res.json({ count: 0 });
  }
});

router.post("/api/visitor-support/messages", sendLimiter, async (req, res) => {
  try {
    const ip = clientIp(req);
    let vid = readVid(req);
    const isNew = !vid;
    if (isNew) {
      if (!newThreadAllowed(ip)) return res.status(429).json({ error: "Too many requests. Please try again later." });
      vid = crypto.randomBytes(16).toString("hex");
    }
    const uid = `visitor_${vid}`;
    const reason = req.body?.reason === "private" ? "private-browsing" : "vpn";

    const message = await sendSupportMessage(uid, req.body?.text, false, null, null);

    const threadRef = db.collection("supportThreads").doc(uid);
    const threadSnap = await threadRef.get();
    const meta = { isVisitor: true, visitorIp: ip, visitorReason: reason, visitorUserAgent: String(req.headers["user-agent"] || "").slice(0, 200) };
    if (!threadSnap.exists || !threadSnap.data().visitorNumber) meta.visitorNumber = await nextVisitorNumber();
    await threadRef.set(meta, { merge: true });

    setVidCookie(req, res, vid);
    res.json({ message, visitorId: vid });
  } catch (err) {
    res.status(400).json({ error: err.message || "Could not send your message." });
  }
});

export { router as visitorSupportRouter };
