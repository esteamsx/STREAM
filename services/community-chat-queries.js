const MAX_PAGE_SIZE = 50;

function pageSize(value) {
  return Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(Number(value) || MAX_PAGE_SIZE)));
}

function makeCursor(message) {
  return message ? { at: Number(message.createdAt) || 0, id: String(message.id || "") } : null;
}

/**
 * Initial loads return the latest bounded page in ascending display order.
 * Incremental loads return only documents strictly after the opaque two-field
 * cursor, with a limit so a burst can be drained over successive polls.
 */
export async function fetchCommunityMessagePage(db, documentIdField, { limit = MAX_PAGE_SIZE, after = null } = {}) {
  const size = pageSize(limit);
  const afterAt = Number(after?.at);
  const afterId = String(after?.id || "");
  const hasCursor = Number.isFinite(afterAt) && afterId.length > 0 && afterId.length <= 200;
  let query;
  if (hasCursor) {
    query = db.collection("communityChat")
      .orderBy("createdAt", "asc")
      .orderBy(documentIdField, "asc")
      .startAfter(afterAt, afterId)
      .limit(size);
  } else {
    query = db.collection("communityChat").orderBy("createdAt", "desc").limit(size);
  }
  const snapshot = await query.get();
  let messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (!hasCursor) messages.reverse();
  const cursor = hasCursor && !messages.length ? { at: afterAt, id: afterId } : makeCursor(messages[messages.length - 1]);
  return { messages, cursor };
}
