const FOLLOWING_UID_CHUNK_SIZE = 30;
const FEED_PAGE_SIZE = 20;
const FEED_SCAN_CAP_PER_CHUNK = 50;
let followingFeedIndexRetryAt = 0;
let followingFeedIndexWarningLogged = false;
const FEED_POST_FIELDS = [
  "uid", "visibility", "createdAt", "text", "imageDataUrl", "resharedFrom",
  "reshareEnabled", "linksEnabled", "reshareCount", "pinnedAt", "editedAt", "taggedUids",
  "likedBy", "commentsCount", "commentsEnabled", "bonusLikes", "moderationStatus",
];

function chunks(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Return the newest visible posts from followed users. Each `in` query is
 * bounded to at most 30 UIDs and each group scans at most 50 posts, matching
 * the old per-group safety cap. In the common case where those newest posts
 * are visible, only one page of 20 is read from each group.
 */
export async function fetchVisibleFollowingPosts(db, followingUids, viewerUid, {
  limit = 20,
  isFollowing = async () => false,
  batchSize = FEED_PAGE_SIZE,
  scanCapPerChunk = FEED_SCAN_CAP_PER_CHUNK,
} = {}) {
  const pageLimit = Math.max(1, Math.min(FEED_PAGE_SIZE, Math.floor(Number(limit) || FEED_PAGE_SIZE)));
  const pageSize = Math.max(1, Math.min(FEED_PAGE_SIZE, Math.floor(Number(batchSize) || FEED_PAGE_SIZE)));
  const scanCap = Math.max(pageSize, Math.min(FEED_SCAN_CAP_PER_CHUNK, Math.floor(Number(scanCapPerChunk) || FEED_SCAN_CAP_PER_CHUNK)));
  const groups = chunks([...new Set(followingUids.filter(Boolean))], FOLLOWING_UID_CHUNK_SIZE).map((uids) => ({
    uids,
    docs: [],
    last: null,
    scanned: 0,
    exhausted: false,
    visible: [],
  }));
  const relationshipCache = new Map();

  async function fetchNext(group) {
    const remaining = scanCap - group.scanned;
    if (group.exhausted || remaining <= 0) return;
    const take = Math.min(pageSize, remaining);
    if (Date.now() < followingFeedIndexRetryAt) {
      const fallback = await db.collection("posts").where("uid", "in", group.uids).limit(scanCap).select(...FEED_POST_FIELDS).get();
      group.docs = fallback.docs;
      group.scanned = fallback.docs.length;
      group.exhausted = true;
      return;
    }
    let query = db.collection("posts").where("uid", "in", group.uids).orderBy("createdAt", "desc");
    if (group.last) query = query.startAfter(group.last);
    query = query.limit(take).select(...FEED_POST_FIELDS);
    let snapshot;
    try {
      snapshot = await query.get();
    } catch (err) {
      const indexError = err?.code === 9 || err?.code === "FAILED_PRECONDITION" || /index/i.test(String(err?.message || ""));
      if (!indexError) throw err;
      followingFeedIndexRetryAt = Date.now() + 10 * 60 * 1000;
      if (!followingFeedIndexWarningLogged) {
        followingFeedIndexWarningLogged = true;
        console.warn("[quota] following-feed composite index is unavailable; using bounded legacy queries temporarily.");
      }
      const fallback = await db.collection("posts").where("uid", "in", group.uids).limit(scanCap).select(...FEED_POST_FIELDS).get();
      group.docs = fallback.docs;
      group.scanned = fallback.docs.length;
      group.exhausted = true;
      return;
    }
    group.scanned += snapshot.docs.length;
    group.docs.push(...snapshot.docs);
    if (snapshot.docs.length) group.last = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < take || group.scanned >= scanCap) group.exhausted = true;
  }

  async function postIsVisible(post) {
    if (post.moderationStatus && post.moderationStatus !== "allow") return false;
    const visibility = post.visibility || "everyone";
    if (visibility === "only_me") return false;
    if (visibility !== "friends") return true;
    if (!relationshipCache.has(post.uid)) {
      relationshipCache.set(post.uid, Promise.resolve(isFollowing(post.uid, viewerUid)));
    }
    return !!(await relationshipCache.get(post.uid));
  }

  if (groups.length) {
    await fetchNext(groups[0]);
    await Promise.all(groups.slice(1).map(fetchNext));
  }
  for (;;) {
  await Promise.all(groups.map(async (group) => {
      const visible = await Promise.all(group.docs.map(async (doc) => {
        const post = { id: doc.id, ...doc.data() };
        return await postIsVisible(post) ? post : null;
      }));
      group.visible = visible.filter(Boolean);
    }));

    const needingMore = groups.filter((group) => group.visible.length < pageLimit && !group.exhausted);
    if (!needingMore.length) break;
    await Promise.all(needingMore.map(fetchNext));
  }

  const visible = groups.flatMap((group) => group.visible);
  visible.sort((a, b) => (Number(b.createdAt) - Number(a.createdAt)) || String(a.id).localeCompare(String(b.id)));
  return visible.slice(0, pageLimit);
}

export const FOLLOWING_FEED_QUERY_LIMITS = Object.freeze({
  followedUidChunkSize: FOLLOWING_UID_CHUNK_SIZE,
  pageSize: FEED_PAGE_SIZE,
  maxScannedPostsPerChunk: FEED_SCAN_CAP_PER_CHUNK,
});
