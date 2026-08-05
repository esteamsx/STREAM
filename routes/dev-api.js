import express from "express";
import { requireApiKey } from "./api.js";
import { SimpleRateLimiter } from "../middleware/security-middleware.js";
import { extractTextFromImageUrl } from "../services/ocr.js";

const router = express.Router();

const ocrLimiter = new SimpleRateLimiter(20, 60 * 1000, (req) => req.apiKeyId || req.ip).middleware();

router.get("/api/v1/dev/ocr", requireApiKey, ocrLimiter, async (req, res) => {
  const url = String(req.query.url || "").trim();
  if (!url) return res.status(400).json({ error: "Missing url query parameter." });

  try {
    const result = await extractTextFromImageUrl(url);
    res.json({ text: result.text, confidence: result.confidence });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Could not extract text from that image." });
  }
});

export { router as devApiRouter };
