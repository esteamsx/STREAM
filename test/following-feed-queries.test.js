import test from "node:test";
import assert from "node:assert/strict";
import { fetchVisibleFollowingPosts, FOLLOWING_FEED_QUERY_LIMITS } from "../services/following-feed-queries.js";

class Snapshot {
  constructor(id, value) { this.id = id; this.value = value; }
  data() { return this.value; }
}

class Query {
  constructor(db, collection, filters = [], order = null, max = Infinity, cursor = null, projection = null) {
    Object.assign(this, { db, collection, filters, order, max, cursor, projection });
  }
  clone(changes) { return new Query(this.db, this.collection, this.filters, this.order, this.max, this.cursor, this.projection, changes); }
  where(field, op, value) { return new Query(this.db, this.collection, [...this.filters, [field, op, value]], this.order, this.max, this.cursor, this.projection); }
  orderBy(field, direction = "asc") { return new Query(this.db, this.collection, this.filters, [field, direction], this.max, this.cursor, this.projection); }
  limit(max) { return new Query(this.db, this.collection, this.filters, this.order, max, this.cursor, this.projection); }
  startAfter(snapshot) { return new Query(this.db, this.collection, this.filters, this.order, this.max, snapshot, this.projection); }
  select(...fields) { return new Query(this.db, this.collection, this.filters, this.order, this.max, this.cursor, fields); }
  async get() {
    this.db.queryCount += 1;
    if (this.db.failOrderedQueries && this.order) {
      throw Object.assign(new Error("The query requires a composite index."), { code: "FAILED_PRECONDITION" });
    }
    const direction = this.order?.[1] === "desc" ? -1 : 1;
    let rows = this.db.posts.filter((row) => this.filters.every(([field, op, wanted]) => {
      const actual = row.value[field];
      if (op === "in") return wanted.includes(actual);
      if (op === "==") return actual === wanted;
      return false;
    })).sort((a, b) => direction * ((a.value[this.order?.[0]] || 0) - (b.value[this.order?.[0]] || 0)) || a.id.localeCompare(b.id));
    if (this.cursor) {
      const index = rows.findIndex((row) => row.id === this.cursor.id);
      rows = rows.slice(index + 1);
    }
    rows = rows.slice(0, this.max);
    this.db.docsRead += rows.length;
    this.db.projections.push(this.projection);
    return { docs: rows.map(({ id, value }) => new Snapshot(id, value)), size: rows.length, empty: !rows.length };
  }
}

class FakeDb {
  constructor(posts) { this.posts = posts; this.queryCount = 0; this.docsRead = 0; this.projections = []; this.failOrderedQueries = false; }
  collection(name) {
    assert.equal(name, "posts");
    return { where: (field, op, value) => new Query(this, name).where(field, op, value) };
  }
}

function makePost(id, uid, createdAt, visibility = "everyone") {
  return { id, value: { uid, createdAt, visibility, text: id, likedBy: [], commentsCount: 0, commentsEnabled: true } };
}

function shuffled(posts) { return [...posts].reverse(); }

test("following feed reads 20 candidates per UID chunk instead of 50 when newest posts are visible", async () => {
  const followed = Array.from({ length: 60 }, (_, i) => `u${String(i).padStart(2, "0")}`);
  const posts = [];
  for (let author = 0; author < followed.length; author++) {
    for (let n = 0; n < 2; n++) posts.push(makePost(`${followed[author]}-${n}`, followed[author], 1000 - author * 2 - n));
  }
  const db = new FakeDb(shuffled(posts));
  const result = await fetchVisibleFollowingPosts(db, followed, "viewer", { isFollowing: async () => false });
  assert.equal(result.length, 20);
  assert.deepEqual(result.map((post) => post.createdAt), [...result.map((post) => post.createdAt)].sort((a, b) => b - a));
  assert.equal(db.queryCount, 2);
  assert.equal(db.docsRead, 40);
  assert.equal(db.docsRead, 2 * FOLLOWING_FEED_QUERY_LIMITS.pageSize);
  assert.ok(db.projections.every((fields) => fields.includes("likedBy") && fields.includes("commentsCount")));
  assert.ok(db.docsRead < 2 * 50, "baseline old per-chunk cap is 100 returned post documents");
});

test("500-followee fixture reduces post documents from 840 to 340 in the common visible-post case", async () => {
  const followed = Array.from({ length: 500 }, (_, i) => `u${String(i).padStart(3, "0")}`);
  const posts = [];
  for (let author = 0; author < followed.length; author++) {
    for (let n = 0; n < 2; n++) posts.push(makePost(`${followed[author]}-${n}`, followed[author], 10000 - author * 2 - n));
  }
  const db = new FakeDb(shuffled(posts));
  const result = await fetchVisibleFollowingPosts(db, followed, "viewer", { isFollowing: async () => false });
  const oldBound = 16 * 50 + 40;
  assert.equal(result.length, 20);
  assert.equal(db.queryCount, 17);
  assert.equal(db.docsRead, 340);
  assert.equal(oldBound, 840);
  assert.equal(Math.round((1 - db.docsRead / oldBound) * 100), 60);
});

test("continues within the existing 50-post cap when newer posts are hidden by visibility", async () => {
  const followed = Array.from({ length: 30 }, (_, i) => `u${i}`);
  const posts = [];
  for (let i = 0; i < 20; i++) posts.push(makePost(`private-${i}`, followed[i], 200 - i, i < 10 ? "only_me" : "friends"));
  for (let i = 0; i < 20; i++) posts.push(makePost(`public-${i}`, followed[i], 100 - i, "everyone"));
  const db = new FakeDb(shuffled(posts));
  const result = await fetchVisibleFollowingPosts(db, followed, "viewer", { isFollowing: async () => false });
  assert.equal(result.length, 20);
  assert.ok(result.every((post) => post.visibility === "everyone"));
  assert.equal(db.docsRead, 40);
  assert.equal(db.queryCount, 2);
});

test("keeps relationship checks and global newest-first ordering across chunks", async () => {
  const followed = Array.from({ length: 31 }, (_, i) => `u${i}`);
  const posts = [];
  for (let i = 0; i < 30; i++) posts.push(makePost(`friend-${i}`, followed[i], 1000 - i, "friends"));
  for (let i = 0; i < 25; i++) posts.push(makePost(`public-${i}`, followed[i + 6], 900 - i, "everyone"));
  const db = new FakeDb(shuffled(posts));
  const checks = [];
  const result = await fetchVisibleFollowingPosts(db, followed, "viewer", {
    isFollowing: async (authorUid, viewerUid) => { checks.push([authorUid, viewerUid]); return authorUid === "u0"; },
  });
  assert.equal(result.length, 20);
  assert.ok(result.every((post) => post.visibility !== "friends" || post.uid === "u0"));
  assert.deepEqual(result.map((post) => post.createdAt), [...result.map((post) => post.createdAt)].sort((a, b) => b - a));
  assert.ok(checks.length <= new Set(posts.filter((p) => p.value.visibility === "friends").map((p) => p.value.uid)).size);
});

test("never scans more than 50 documents per followed-UID chunk", async () => {
  const followed = Array.from({ length: 30 }, (_, i) => `u${i}`);
  const posts = Array.from({ length: 80 }, (_, i) => makePost(`hidden-${String(i).padStart(3, "0")}`, followed[i % followed.length], 1000 - i, "only_me"));
  const db = new FakeDb(shuffled(posts));
  const result = await fetchVisibleFollowingPosts(db, followed, "viewer");
  assert.deepEqual(result, []);
  assert.equal(db.docsRead, 50);
  assert.ok(db.queryCount <= 3);
});

test("falls back to at most 50 posts per chunk when the composite index is unavailable", async () => {
  const followed = Array.from({ length: 30 }, (_, i) => `u${i}`);
  const posts = Array.from({ length: 120 }, (_, i) => makePost(`post-${String(i).padStart(3, "0")}`, followed[i % followed.length], 1000 - i));
  const db = new FakeDb(shuffled(posts));
  db.failOrderedQueries = true;
  const result = await fetchVisibleFollowingPosts(db, followed, "viewer");
  assert.equal(result.length, 20);
  assert.equal(db.docsRead, 50);
  assert.equal(db.queryCount, 2);
});
