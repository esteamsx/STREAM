const STATUS_VIEW_QUERY_CHUNK_SIZE = 30;
const STATUS_VIEW_LOOKUP_CHUNK_SIZE = 300;
const STATUS_VIEW_QUERY_CONCURRENCY = 8;
const STATUS_VIEW_INDEX_RETRY_MS = 10 * 60 * 1000;
let queryUnavailableUntil = 0;

function chunks(values, size) {
  const result = [];
  for (let i = 0; i < values.length; i += size) result.push(values.slice(i, i + size));
  return result;
}

async function loadByDocumentId(db, viewerUid, statusIds) {
  const seen = new Map();
  for (let i = 0; i < statusIds.length; i += STATUS_VIEW_LOOKUP_CHUNK_SIZE) {
    const batch = statusIds.slice(i, i + STATUS_VIEW_LOOKUP_CHUNK_SIZE);
    const refs = batch.map((id) => db.collection("statusViews").doc(id + "_" + viewerUid));
    const snapshots = await db.getAll(...refs);
    snapshots.forEach((snapshot, index) => {
      if (snapshot.exists) seen.set(batch[index], !!(snapshot.data() || {}).hidden);
    });
  }
  return seen;
}

export async function fetchSeenStatusViews(db, viewerUid, statusIds) {
  const ids = [...new Set((statusIds || []).filter(Boolean))];
  const seen = new Map();
  if (!ids.length) return seen;
  if (Date.now() < queryUnavailableUntil) return loadByDocumentId(db, viewerUid, ids);

  const batches = chunks(ids, STATUS_VIEW_QUERY_CHUNK_SIZE);
  const readBatch = async (batch) => {
    const snapshot = await db.collection("statusViews")
      .where("viewerUid", "==", viewerUid)
      .where("statusId", "in", batch)
      .select("statusId", "hidden")
      .get();
    snapshot.docs.forEach((doc) => {
      const row = doc.data() || {};
      if (row.statusId) seen.set(row.statusId, !!row.hidden);
    });
  };

  try {
    await readBatch(batches[0]);
    for (let i = 1; i < batches.length; i += STATUS_VIEW_QUERY_CONCURRENCY) {
      await Promise.all(batches.slice(i, i + STATUS_VIEW_QUERY_CONCURRENCY).map(readBatch));
    }
    return seen;
  } catch (err) {
    queryUnavailableUntil = Date.now() + STATUS_VIEW_INDEX_RETRY_MS;
    return loadByDocumentId(db, viewerUid, ids);
  }
}
