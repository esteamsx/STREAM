import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { proxyStream } from "./moviebox.js";

const ROOT = process.env.MOVIE_DOWNLOAD_DIR || path.join(process.cwd(), "data", "movie-downloads");
const MAX_ACTIVE_PER_USER = 3;
const MAX_JOB_BYTES = 5 * 1024 * 1024 * 1024;
const RETRIES = 5;
const jobs = new Map();
let ready = null;

function uidDir(uid) { return path.join(ROOT, crypto.createHash("sha256").update(String(uid)).digest("hex").slice(0, 32)); }
function metaPath(job) { return path.join(job.dir, "job.json"); }
function filePath(job) { return path.join(job.dir, "movie.part"); }
function publicJob(job) {
  return { id: job.id, subjectId: job.subjectId, slug: job.slug, se: job.se, ep: job.ep, filename: job.filename, resolution: job.resolution, status: job.status, bytes: job.bytes, total: job.total, progress: job.total ? Math.min(100, Math.round(job.bytes / job.total * 100)) : 0, error: job.error || null, createdAt: job.createdAt, updatedAt: job.updatedAt, completedAt: job.completedAt || null };
}
async function save(job) {
  job.updatedAt = Date.now();
  await fsp.writeFile(metaPath(job), JSON.stringify({ ...job, dir: undefined }, null, 2));
}
async function loadExisting() {
  await fsp.mkdir(ROOT, { recursive: true });
  const users = await fsp.readdir(ROOT, { withFileTypes: true }).catch(() => []);
  for (const user of users) {
    if (!user.isDirectory()) continue;
    const dir = path.join(ROOT, user.name);
    const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const data = JSON.parse(await fsp.readFile(path.join(dir, entry.name, "job.json"), "utf8"));
        const job = { ...data, dir: path.join(dir, entry.name), running: false, cancelRequested: false };
        const stat = await fsp.stat(filePath(job)).catch(() => ({ size: 0 }));
        job.bytes = stat.size;
        if (["running", "queued", "retrying"].includes(job.status)) job.status = "paused";
        jobs.set(job.id, job);
        await save(job);
        if (job.status === "paused") void startWorker(job);
      } catch {}
    }
  }
}
function ensureReady() { return ready || (ready = loadExisting()); }
function countActive(uid) { return [...jobs.values()].filter((j) => j.uid === uid && ["queued", "running", "retrying"].includes(j.status)).length; }
function cleanText(value, max = 180) { return String(value || "").replace(/[\u0000-\u001f]/g, "").slice(0, max); }
function parseSpec(input) {
  const subjectId = cleanText(input.subjectId, 120), slug = cleanText(input.slug, 180), resolution = cleanText(input.resolution || input.res, 8).replace(/p$/i, "");
  const se = cleanText(input.se, 12), ep = cleanText(input.ep, 12), filename = cleanText(input.filename, 140).replace(/[^\w .()\-]/g, "_");
  if (!subjectId || !slug || !/^\d+$/.test(resolution) || !/^[\w .()\-]+\.mp4$/i.test(filename)) throw Object.assign(new Error("That download selection is invalid."), { status: 400 });
  return { subjectId, slug, se, ep, resolution, filename };
}
async function startWorker(job) {
  if (job.running || ["completed", "canceled"].includes(job.status)) return;
  job.running = true; job.status = "running"; job.error = null; await save(job);
  try {
    for (let attempt = 0; attempt < RETRIES && !job.cancelRequested; attempt++) {
      try {
        const stat = await fsp.stat(filePath(job)).catch(() => ({ size: 0 }));
        let offset = stat.size;
        const range = offset ? `bytes=${offset}-` : undefined;
        const response = await proxyStream(job.subjectId, job.slug, job.se, job.ep, job.resolution, range);
        if (!response || (!response.ok && response.status !== 206)) throw Object.assign(new Error("The movie source rejected the download."), { status: response?.status || 502 });
        if (offset && response.status !== 206) { await fsp.truncate(filePath(job), 0); offset = 0; }
        const contentRange = String(response.headers.get("content-range") || "").match(/bytes\s+\d+-\d+\/(\d+)/i);
        const contentLength = Number(response.headers.get("content-length") || 0);
        job.total = contentRange ? Number(contentRange[1]) : (offset + contentLength || job.total || 0);
        job.bytes = offset;
        await save(job);
        if (!response.body) throw new Error("The movie source returned an empty file.");
        const reader = response.body.getReader();
        const out = fs.createWriteStream(filePath(job), { flags: offset ? "a" : "w" });
        try {
          for (;;) {
            if (job.cancelRequested) throw Object.assign(new Error("Download canceled."), { code: "canceled" });
            const part = await reader.read();
            if (part.done) break;
            if (part.value?.byteLength) {
              job.bytes += part.value.byteLength;
              if (job.bytes > MAX_JOB_BYTES) throw new Error("This download is too large for the server queue.");
              if (!out.write(Buffer.from(part.value))) await new Promise((resolve) => out.once("drain", resolve));
              if (job.bytes % (1024 * 1024) < part.value.byteLength) await save(job);
            }
          }
          await new Promise((resolve, reject) => { out.end(resolve); out.once("error", reject); });
        } finally { try { reader.releaseLock(); } catch {} }
        if (job.total && job.bytes < job.total) throw new Error("The source ended before the complete movie was received.");
        job.status = "completed"; job.completedAt = Date.now(); job.error = null; await save(job); return;
      } catch (error) {
        if (job.cancelRequested || error?.code === "canceled") { job.status = "canceled"; job.error = "Download canceled."; await save(job); return; }
        job.error = error?.message || "The download was interrupted.";
        if (attempt + 1 < RETRIES) { job.status = "retrying"; await save(job); await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt)); job.status = "running"; await save(job); }
      }
    }
    if (!job.cancelRequested) { job.status = "failed"; await save(job); }
  } finally { job.running = false; }
}
export async function createMovieDownload(uid, input) {
  await ensureReady();
  if (countActive(uid) >= MAX_ACTIVE_PER_USER) throw Object.assign(new Error("You can have up to three movie downloads at once."), { status: 429 });
  const spec = parseSpec(input), id = crypto.randomUUID(), dir = path.join(uidDir(uid), id);
  await fsp.mkdir(dir, { recursive: true });
  const job = { id, uid: String(uid), ...spec, dir, status: "queued", bytes: 0, total: 0, error: null, createdAt: Date.now(), updatedAt: Date.now(), running: false, cancelRequested: false };
  jobs.set(id, job); await save(job); void startWorker(job);
  return publicJob(job);
}
export async function listMovieDownloads(uid) { await ensureReady(); return [...jobs.values()].filter((job) => job.uid === String(uid) && job.status !== "canceled").sort((a, b) => b.createdAt - a.createdAt).map(publicJob); }
export async function getMovieDownload(uid, id) { await ensureReady(); const job = jobs.get(String(id)); return job && job.uid === String(uid) ? publicJob(job) : null; }
export async function retryMovieDownload(uid, id) { await ensureReady(); const job = jobs.get(String(id)); if (!job || job.uid !== String(uid)) return null; if (!["failed", "paused"].includes(job.status)) return publicJob(job); job.cancelRequested = false; job.error = null; void startWorker(job); return publicJob(job); }
export async function cancelMovieDownload(uid, id) { await ensureReady(); const job = jobs.get(String(id)); if (!job || job.uid !== String(uid)) return null; job.cancelRequested = true; if (!job.running) { job.status = "canceled"; await save(job); } return publicJob(job); }
function parseByteRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(value || "").trim());
  if (!match || (!match[1] && !match[2])) return null;
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isInteger(suffix) || suffix <= 0) return null;
    start = Math.max(0, size - suffix); end = size - 1;
  } else {
    start = Number(match[1]); end = match[2] ? Number(match[2]) : size - 1;
  }
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}
export async function streamMovieDownload(uid, id, res, rangeHeader) {
  await ensureReady(); const job = jobs.get(String(id));
  if (!job || job.uid !== String(uid)) return false;
  if (job.status !== "completed") return false;
  const stat = await fsp.stat(filePath(job)).catch(() => null); if (!stat) return false;
  const range = rangeHeader ? parseByteRange(rangeHeader, stat.size) : null;
  if (rangeHeader && !range) {
    res.status(416).set({ "Content-Range": `bytes */${stat.size}`, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store" }).end();
    return true;
  }
  const start = range ? range.start : 0, end = range ? range.end : stat.size - 1;
  res.status(range ? 206 : 200).set({
    "Content-Type": "video/mp4",
    "Content-Length": String(end - start + 1),
    "Content-Disposition": `attachment; filename="${job.filename}"`,
    "Cache-Control": "private, no-store",
    "Accept-Ranges": "bytes",
    ...(range ? { "Content-Range": `bytes ${start}-${end}/${stat.size}` } : {}),
  });
  await pipeline(fs.createReadStream(filePath(job), { start, end }), res).catch(() => {}); return true;
}
export async function purgeMovieDownloads() {
  await ensureReady(); const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const job of jobs.values()) if ((job.status === "completed" || job.status === "canceled" || job.status === "failed") && job.updatedAt < cutoff) { await fsp.rm(job.dir, { recursive: true, force: true }).catch(() => {}); jobs.delete(job.id); }
}

setInterval(() => { purgeMovieDownloads().catch(() => {}); }, 60 * 60 * 1000).unref();
