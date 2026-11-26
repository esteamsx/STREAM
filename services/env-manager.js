import crypto from "crypto";
import { db } from "../config/firebase.js";
import { encryptEnvValue, decryptEnvValue, parseEnvText, normalizeEnvName } from "./env-manager-core.js";

const COLLECTIONS = "envManagerCollections";
const PLANS = "envManagerPlans";
const AUDIT = "envManagerAudit";
const PROVIDERS = new Set(["heroku", "railway", "render"]);

function cleanName(name) {
  return normalizeEnvName(name);
}
function normalizeVariables(input) {
  const out = {};
  for (const [name, value] of Object.entries(input || {})) out[cleanName(name)] = String(value ?? "");
  return out;
}
function metadata(doc, data) {
  const vars = data.variables || {};
  return { id: doc.id, name: data.name, provider: data.provider || null, target: data.target || null, variableCount: Object.keys(vars).length, createdAt: data.createdAt || null, updatedAt: data.updatedAt || null, lastSyncedAt: data.lastSyncedAt || null, syncTargets: data.syncTargets || {} };
}
async function audit(uid, action, collectionId, details = {}) {
  await db.collection(AUDIT).add({ uid, action, collectionId, details, createdAt: Date.now() });
}

export async function listCollections(uid) {
  const snap = await db.collection(COLLECTIONS).where("ownerUid", "==", uid).get();
  return snap.docs.map((doc) => metadata(doc, doc.data())).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
export async function createCollection(uid, { name, provider, target, variables = {} }) {
  const safeName = String(name || "").trim().slice(0, 120);
  if (!safeName) throw new Error("Collection name is required.");
  if (provider && !PROVIDERS.has(provider)) throw new Error("Unsupported hosting provider.");
  const normalized = normalizeVariables(variables);
  const now = Date.now();
  const ref = db.collection(COLLECTIONS).doc();
  await ref.set({ ownerUid: uid, name: safeName, provider: provider || null, target: publicTarget(target), variables: Object.fromEntries(Object.entries(normalized).map(([k, v]) => [k, encryptEnvValue(v)])), createdAt: now, updatedAt: now, lastSyncedAt: null, syncTargets: {} });
  await audit(uid, "collection_created", ref.id, { variableCount: Object.keys(normalized).length });
  return metadata({ id: ref.id }, (await ref.get()).data());
}
async function getOwned(uid, id) {
  const doc = await db.collection(COLLECTIONS).doc(String(id || "")).get();
  if (!doc.exists || doc.data()?.ownerUid !== uid) throw Object.assign(new Error("ENV collection not found."), { status: 404 });
  return doc;
}
async function readVariables(doc) {
  const data = doc.data() || {};
  const out = {};
  for (const [name, encrypted] of Object.entries(data.variables || {})) out[name] = decryptEnvValue(encrypted);
  return out;
}
export async function getCollection(uid, id, { includeValues = false } = {}) {
  const doc = await getOwned(uid, id);
  const data = doc.data();
  const result = metadata(doc, data);
  result.variables = Object.keys(data.variables || {}).sort().map((name) => ({ name, masked: "••••••••", hasValue: decryptEnvValue(data.variables[name]).length > 0 }));
  if (includeValues) result.values = await readVariables(doc);
  return result;
}
export async function updateCollection(uid, id, patch = {}) {
  const doc = await getOwned(uid, id);
  const current = await readVariables(doc);
  let next = current;
  if (patch.mode === "replace") next = normalizeVariables(patch.variables || {});
  if (patch.mode === "merge") next = { ...current, ...normalizeVariables(patch.variables || {}) };
  if (patch.deleteNames) for (const name of patch.deleteNames) delete next[cleanName(name)];
  const updates = { updatedAt: Date.now(), variables: Object.fromEntries(Object.entries(next).map(([k, v]) => [k, encryptEnvValue(v)])) };
  if (patch.name !== undefined) updates.name = String(patch.name).trim().slice(0, 120) || doc.data().name;
  if (patch.provider !== undefined) updates.provider = PROVIDERS.has(patch.provider) ? patch.provider : null;
  if (patch.target !== undefined) updates.target = publicTarget(patch.target);
  await doc.ref.update(updates);
  await audit(uid, patch.mode === "replace" ? "collection_replaced" : "collection_updated", doc.id, { variableCount: Object.keys(next).length, deletedCount: patch.deleteNames?.length || 0 });
  return getCollection(uid, id);
}
export async function deleteCollection(uid, id) {
  const doc = await getOwned(uid, id);
  await doc.ref.delete();
  await audit(uid, "collection_deleted", doc.id);
}

async function providerRequest(provider, url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) } });
  if (!response.ok) throw Object.assign(new Error(`${provider} API request failed (${response.status}).`), { status: response.status, code: "env-manager/provider-failed" });
  if (response.status === 204) return null;
  return response.json();
}
function token(provider) {
  const names = { heroku: "HEROKU_API_TOKEN", railway: "RAILWAY_API_TOKEN", render: "RENDER_API_KEY" };
  const value = String(process.env[names[provider]] || "").trim();
  if (!value) throw Object.assign(new Error(`${provider} integration is not configured.`), { code: "env-manager/provider-not-configured" });
  return value;
}
function authHeaders(provider) { return provider === "heroku" ? { Authorization: `Bearer ${token(provider)}`, Accept: "application/vnd.heroku+json; version=3" } : { Authorization: `Bearer ${token(provider)}` }; }
function targetFor(provider, target) {
  if (!target || typeof target !== "object") throw new Error("A hosting target is required.");
  if (provider === "heroku" && !target.app) throw new Error("A Heroku app target is required.");
  if (provider === "render" && !target.serviceId) throw new Error("A Render service target is required.");
  if (provider === "railway" && (!target.projectId || !target.environmentId || !target.serviceId)) throw new Error("A Railway project, environment and service target are required.");
  return publicTarget(target);
}
async function herokuVars(target) { return providerRequest("Heroku", `https://api.heroku.com/apps/${encodeURIComponent(target.app)}/config-vars`, { headers: authHeaders("heroku") }); }
async function railwayQuery(query, variables) {
  const data = await providerRequest("Railway", "https://backboard.railway.com/graphql/v2", { method: "POST", headers: authHeaders("railway"), body: JSON.stringify({ query, variables }) });
  if (data?.errors?.length) throw new Error("Railway API request failed.");
  return data?.data;
}
async function railwayVars(target) { const data = await railwayQuery("query($projectId:String!,$environmentId:String!,$serviceId:String){variables(projectId:$projectId,environmentId:$environmentId,serviceId:$serviceId)}", target); return data?.variables || {}; }
async function renderVars(target) { const data = await providerRequest("Render", `https://api.render.com/v1/services/${encodeURIComponent(target.serviceId)}/env-vars?limit=100`, { headers: authHeaders("render") }); return Object.fromEntries((Array.isArray(data) ? data : []).map((item) => [item.key, item.value ?? ""])); }
async function providerVars(provider, target) { const safeTarget = targetFor(provider, target); if (provider === "heroku") return herokuVars(safeTarget); if (provider === "railway") return railwayVars(safeTarget); return renderVars(safeTarget); }
export async function listProviderTargets(provider) {
  if (!PROVIDERS.has(provider)) throw new Error("Unsupported hosting provider.");
  if (provider === "heroku") return (await providerRequest("Heroku", "https://api.heroku.com/apps", { headers: authHeaders(provider) })).map((app) => ({ id: app.name || app.id, name: app.name || app.id }));
  if (provider === "render") { const items = await providerRequest("Render", "https://api.render.com/v1/services?limit=100", { headers: authHeaders(provider) }); return (items || []).map((item) => ({ id: item.service?.id || item.id, name: item.service?.name || item.name })); }
  const projectsData = await railwayQuery("query { projects { edges { node { id name } } } }");
  const projects = projectsData?.projects?.edges?.map((edge) => edge.node).filter(Boolean) || [];
  const targets = [];
  for (const project of projects) {
    const detail = await railwayQuery("query($id:String!){project(id:$id){id name services{edges{node{id name}}} environments(isEphemeral:false){edges{node{id name}}}}}", { id: project.id });
    const item = detail?.project;
    for (const environment of item?.environments?.edges?.map((edge) => edge.node).filter(Boolean) || []) {
      for (const service of item?.services?.edges?.map((edge) => edge.node).filter(Boolean) || []) {
        targets.push({ projectId: item.id, projectName: item.name, environmentId: environment.id, environmentName: environment.name, serviceId: service.id, serviceName: service.name, name: `${item.name} / ${environment.name} / ${service.name}` });
      }
    }
  }
  return targets;
}
function diff(saved, remote) {
  const additions = [], changes = [], unchanged = [], removals = [];
  for (const [name, value] of Object.entries(saved)) { if (!(name in remote)) additions.push(name); else if (remote[name] === value) unchanged.push(name); else changes.push(name); }
  for (const name of Object.keys(remote)) if (!(name in saved)) removals.push(name);
  return { additions, changes, unchanged, removals, totalChanges: additions.length + changes.length + removals.length };
}
export async function compareCollection(uid, id, provider, target, { replace = false } = {}) {
  const doc = await getOwned(uid, id);
  const safeTarget = targetFor(provider, target);
  const saved = await readVariables(doc);
  const remote = await providerVars(provider, safeTarget);
  const comparison = diff(saved, remote);
  const planToken = crypto.randomBytes(24).toString("base64url");
  await db.collection(PLANS).doc(hash(planToken)).set({ ownerUid: uid, collectionId: id, provider, target: safeTarget, replace: !!replace, comparison, createdAt: Date.now(), expiresAt: Date.now() + 10 * 60 * 1000 });
  await audit(uid, "provider_compared", id, { provider, target: safeTarget, replace: !!replace });
  return { planToken, provider, target: safeTarget, comparison };
}
function hash(value) { return crypto.createHash("sha256").update(String(value), "utf8").digest("hex"); }
function publicTarget(target) { return Object.fromEntries(Object.entries(target || {}).filter(([key]) => /^(app|serviceId|projectId|environmentId|name)$/.test(key)).map(([key, value]) => [key, String(value).slice(0, 120)])); }
async function applyProvider(provider, target, saved, remote, replace) {
  if (provider === "heroku") {
    const payload = replace ? Object.fromEntries(Object.entries(saved)) : Object.fromEntries(Object.entries(saved).filter(([k, v]) => remote[k] !== v));
    if (replace) for (const key of Object.keys(remote)) if (!(key in saved)) payload[key] = null;
    return providerRequest("Heroku", `https://api.heroku.com/apps/${encodeURIComponent(target.app)}/config-vars`, { method: "PATCH", headers: authHeaders(provider), body: JSON.stringify(payload) });
  }
  if (provider === "railway") {
    const variables = replace ? saved : { ...remote, ...saved };
    await railwayQuery("mutation($input:VariableCollectionUpsertInput!){variableCollectionUpsert(input:$input)}", { input: { projectId: target.projectId, environmentId: target.environmentId, serviceId: target.serviceId, variables, replace: !!replace, skipDeploys: true } });
    return { ok: true };
  }
  const variables = replace ? saved : { ...remote, ...saved };
  return providerRequest("Render", `https://api.render.com/v1/services/${encodeURIComponent(target.serviceId)}/env-vars`, { method: "PUT", headers: authHeaders(provider), body: JSON.stringify(Object.entries(variables).map(([key, value]) => ({ key, value }))) });
}
export async function syncCollection(uid, planToken, { confirm, productionConfirm } = {}) {
  if (confirm !== true || productionConfirm !== true) throw Object.assign(new Error("Explicit synchronization approval is required."), { status: 400 });
  const ref = db.collection(PLANS).doc(hash(planToken));
  const planSnap = await ref.get();
  const plan = planSnap.data();
  if (!planSnap.exists || !plan || plan.ownerUid !== uid || plan.expiresAt <= Date.now()) throw Object.assign(new Error("Synchronization plan expired. Compare again."), { status: 400 });
  const doc = await getOwned(uid, plan.collectionId);
  const saved = await readVariables(doc);
  const remote = await providerVars(plan.provider, plan.target);
  await applyProvider(plan.provider, plan.target, saved, remote, !!plan.replace);
  const verified = await providerVars(plan.provider, plan.target);
  const check = diff(saved, verified);
  if (check.additions.length || check.changes.length || (plan.replace && check.removals.length)) throw new Error("Provider did not confirm the requested synchronization.");
  const now = Date.now();
  await doc.ref.update({ updatedAt: now, lastSyncedAt: now, [`syncTargets.${plan.provider}`]: { target: publicTarget(plan.target), at: now } });
  await ref.delete();
  await audit(uid, "provider_synchronized", plan.collectionId, { provider: plan.provider, target: publicTarget(plan.target), replace: !!plan.replace });
  return { ok: true, syncedAt: now, comparison: check };
}
