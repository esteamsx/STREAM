import crypto from "node:crypto";
import { db } from "../config/firebase.js";

const MAX_DESCRIPTION = 180;
const MAX_DETAILS = 2000;
const MAX_EVENTS_PER_RUN = 500;

function clean(value, max) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);
}

function safeDetails(details) {
  if (!details || typeof details !== "object") return null;
  const allowed = {};
  for (const [key, value] of Object.entries(details).slice(0, 20)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(key)) continue;
    if (typeof value === "number" || typeof value === "boolean") allowed[key] = value;
    else if (typeof value === "string") allowed[key] = clean(value, MAX_DETAILS);
  }
  return Object.keys(allowed).length ? allowed : null;
}

function safeError(error) {
  if (error?.userMessage) return clean(error.userMessage, 220);
  if (String(error?.code || "").startsWith("coarena_") || String(error?.code || "").startsWith("github_")) return "The connected service could not complete this operation.";
  return clean(error?.message || "The operation could not be completed.", 220);
}

export function createCodingActivity({ uid, conversationId, onEvent }) {
  const userId = String(uid);
  const conversation = clean(conversationId || "conversation-unknown", 120);
  const runId = crypto.randomUUID();
  let sequence = 0;
  let eventCount = 0;
  let startedAt = Date.now();
  let closed = false;
  let finishing = false;
  const operations = new Map();

  const persist = (event) => db.collection("coding_activity_runs").doc(runId).collection("events").doc(event.id).set({ ...event, uid: userId }, { merge: true }).catch((error) => {
    console.error(`[COD\\NG] activity persistence failed run=${runId} code=${error?.code || "unknown"}`);
  });

  const emit = async ({ type, status, description, operationId, details, error, durationMs }) => {
    if (closed || eventCount >= MAX_EVENTS_PER_RUN) return null;
    const timestamp = Date.now();
    const event = {
      id: `${runId}:${++sequence}`,
      runId,
      taskId: runId,
      conversationId: conversation,
      sequence,
      type: clean(type || "activity", 50),
      status: clean(status || "in_progress", 30),
      description: clean(description, MAX_DESCRIPTION),
      timestamp,
      ...(operationId ? { operationId: clean(operationId, 100) } : {}),
      ...(Number.isFinite(durationMs) ? { durationMs: Math.max(0, Math.round(durationMs)) } : {}),
      ...(safeDetails(details) ? { details: safeDetails(details) } : {}),
      ...(error ? { error: safeError(error) } : {}),
    };
    eventCount += 1;
    await persist(event);
    try { await onEvent?.(event); } catch (callbackError) { console.error(`[COD\\NG] activity delivery failed run=${runId} code=${callbackError?.code || "unknown"}`); }
    return event;
  };

  const operation = async (type, description, details, work) => {
    const operationId = crypto.randomUUID();
    const operationStarted = Date.now();
    operations.set(operationId, { type, description, startedAt: operationStarted });
    await emit({ type, status: "started", description, operationId, details });
    try {
      const result = await work(operationId);
      await emit({ type, status: "completed", description, operationId, details, durationMs: Date.now() - operationStarted });
      return result;
    } catch (error) {
      await emit({ type, status: "failed", description, operationId, details, durationMs: Date.now() - operationStarted, error });
      throw error;
    } finally {
      operations.delete(operationId);
    }
  };

  const finish = async (status = "completed", error = null) => {
    if (closed || finishing) return;
    finishing = true;
    const durationMs = Date.now() - startedAt;
    await emit({ type: "task", status, description: status === "completed" ? "Completed the request." : status === "cancelled" ? "Request cancelled." : "Request failed.", durationMs, error });
    closed = true;
    await db.collection("coding_activity_runs").doc(runId).set({ uid: userId, conversationId: conversation, runId, startedAt, finishedAt: Date.now(), status, durationMs, eventCount: sequence }, { merge: true }).catch((persistError) => console.error(`[COD\\NG] activity run persistence failed run=${runId} code=${persistError?.code || "unknown"}`));
  };

  const initialize = async () => {
    await db.collection("coding_activity_runs").doc(runId).set({ uid: userId, conversationId: conversation, runId, startedAt, status: "running", eventCount: 0 }, { merge: true }).catch((error) => console.error(`[COD\\NG] activity run initialization failed run=${runId} code=${error?.code || "unknown"}`));
    await emit({ type: "task", status: "started", description: "Analysing your request." });
  };

  return { runId, conversationId: conversation, initialize, emit, operation, finish, get startedAt() { return startedAt; } };
}

export async function getCodingActivity(uid, runId, after = 0) {
  const cleanRunId = String(runId || "");
  if (!/^[a-f0-9-]{20,100}$/i.test(cleanRunId)) return null;
  const run = await db.collection("coding_activity_runs").doc(cleanRunId).get();
  if (!run.exists || String(run.data()?.uid) !== String(uid)) return null;
  const snapshot = await db.collection("coding_activity_runs").doc(cleanRunId).collection("events").orderBy("sequence").get();
  const events = snapshot.docs.map((doc) => doc.data()).filter((event) => Number(event.sequence) > Number(after || 0));
  return { run: run.data(), events };
}
