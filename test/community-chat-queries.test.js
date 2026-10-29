import test from "node:test";
import assert from "node:assert/strict";
import { fetchCommunityMessagePage } from "../services/community-chat-queries.js";

class Snap {
  constructor(id, value) { this.id = id; this.value = value; }
  data() { return this.value; }
}

class Query {
  constructor(db, order = null, limit = 50, cursor = null) { Object.assign(this, { db, order, max: limit, cursor }); }
  orderBy(field, direction = "asc") { return new Query(this.db, [...(this.order || []), [field, direction]], this.max, this.cursor); }
  limit(max) { return new Query(this.db, this.order, max, this.cursor); }
  startAfter(...values) { return new Query(this.db, this.order, this.max, values); }
  async get() {
    this.db.queries += 1;
    const rows = [...this.db.messages].sort((a, b) => {
      const [field, direction] = this.order[0];
      const delta = (a.value[field] - b.value[field]) || a.id.localeCompare(b.id);
      return direction === "desc" ? -delta : delta;
    });
    let filtered = rows;
    if (this.cursor) {
      const [at, id] = this.cursor;
      filtered = rows.filter((row) => row.value.createdAt > at || (row.value.createdAt === at && row.id > id));
    }
    const docs = filtered.slice(0, this.max);
    this.db.docReads += docs.length;
    return { docs: docs.map((row) => new Snap(row.id, row.value)) };
  }
}

class FakeDb {
  constructor(messages) { this.messages = messages; this.queries = 0; this.docReads = 0; }
  collection(name) {
    assert.equal(name, "communityChat");
    return { orderBy: (field, direction) => new Query(this).orderBy(field, direction) };
  }
}

const makeMessage = (id, createdAt) => ({ id, value: { createdAt, uid: "u", text: id } });

test("initial chat fetch is capped at 50 and returns display order oldest to newest", async () => {
  const db = new FakeDb(Array.from({ length: 80 }, (_, i) => makeMessage(`m${String(i).padStart(3, "0")}`, i)));
  const page = await fetchCommunityMessagePage(db, "__name__");
  assert.equal(page.messages.length, 50);
  assert.equal(page.messages[0].id, "m030");
  assert.equal(page.messages.at(-1).id, "m079");
  assert.deepEqual(page.cursor, { at: 79, id: "m079" });
  assert.equal(db.docReads, 50);
});

test("incremental cursor returns only new messages, including document-ID tie breaks", async () => {
  const db = new FakeDb([
    makeMessage("a", 100), makeMessage("b", 100), makeMessage("c", 100),
    makeMessage("d", 101), makeMessage("e", 102),
  ]);
  const page = await fetchCommunityMessagePage(db, "__name__", { after: { at: 100, id: "b" } });
  assert.deepEqual(page.messages.map((message) => message.id), ["c", "d", "e"]);
  assert.deepEqual(page.cursor, { at: 102, id: "e" });
  assert.equal(db.queries, 1);
  assert.equal(db.docReads, 3, "only newly returned messages are read");
});

test("idle delta poll returns no old messages and preserves its cursor", async () => {
  const db = new FakeDb([makeMessage("a", 100), makeMessage("b", 101)]);
  const cursor = { at: 101, id: "b" };
  const page = await fetchCommunityMessagePage(db, "__name__", { after: cursor });
  assert.deepEqual(page.messages, []);
  assert.deepEqual(page.cursor, cursor);
  assert.equal(db.docReads, 0);
  assert.equal(db.queries, 1);
});
