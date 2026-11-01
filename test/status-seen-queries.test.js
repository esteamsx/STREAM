import test from "node:test";
import assert from "node:assert/strict";
import { fetchSeenStatusViews } from "../services/status-seen-queries.js";

class FakeQuery {
  constructor(db, filters = []) { this.db = db; this.filters = filters; }
  where(field, operator, value) { return new FakeQuery(this.db, [...this.filters, [field, operator, value]]); }
  select() { return this; }
  async get() {
    this.db.queryCalls++;
    if (this.db.failQuery) throw new Error("missing composite index");
    const rows = [...this.db.rows.values()].filter((row) => this.filters.every(([field, operator, value]) => {
      if (operator === "==") return row[field] === value;
      if (operator === "in") return value.includes(row[field]);
      return false;
    }));
    this.db.reads += rows.length || 1;
    return { docs: rows.map((row, i) => ({ id: String(i), data: () => row })) };
  }
}

class FakeDb {
  constructor(rows = [], failQuery = false) {
    this.rows = new Map(rows.map((row) => [`${row.statusId}_${row.viewerUid}`, row]));
    this.failQuery = failQuery;
    this.queryCalls = 0;
    this.reads = 0;
    this.lookupCalls = 0;
  }
  collection(name) {
    assert.equal(name, "statusViews");
    return {
      where: (field, operator, value) => new FakeQuery(this, [[field, operator, value]]),
      doc: (id) => ({ id }),
    };
  }
  async getAll(...refs) {
    this.lookupCalls += refs.length;
    this.reads += refs.length;
    return refs.map((ref) => {
      const row = this.rows.get(ref.id);
      const statusId = row?.statusId;
      return { id: ref.id, exists: !!row, data: () => row || { statusId } };
    });
  }
}

test("unseen statuses cost one empty query per 30 IDs instead of one document lookup each", async () => {
  const db = new FakeDb();
  const ids = Array.from({ length: 60 }, (_, i) => `s${i}`);
  const seen = await fetchSeenStatusViews(db, "viewer", ids);
  assert.equal(seen.size, 0);
  assert.equal(db.queryCalls, 2);
  assert.equal(db.reads, 2);
  assert.equal(db.lookupCalls, 0);
});

test("only existing status-view documents are returned and their hidden state is preserved", async () => {
  const db = new FakeDb([
    { statusId: "s1", viewerUid: "viewer", hidden: false },
    { statusId: "s41", viewerUid: "viewer", hidden: true },
  ]);
  const ids = Array.from({ length: 60 }, (_, i) => `s${i}`);
  const seen = await fetchSeenStatusViews(db, "viewer", ids);
  assert.deepEqual([...seen.entries()].sort(), [["s1", false], ["s41", true]]);
  assert.equal(db.reads, 2);
  assert.equal(db.lookupCalls, 0);
});

test("direct document lookups preserve behavior when the composite index is unavailable", async () => {
  const db = new FakeDb([{ statusId: "s2", viewerUid: "viewer", hidden: false }], true);
  const seen = await fetchSeenStatusViews(db, "viewer", ["s1", "s2", "s3"]);
  assert.equal(seen.get("s2"), false);
  assert.equal(seen.size, 1);
  assert.equal(db.lookupCalls, 3);
});
