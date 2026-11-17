import test from "node:test";
import assert from "node:assert/strict";
import { groupCinexoraChannels, normalizeCinexoraChannel } from "../services/cinexora-live-tv.js";

test("Cinexora records are normalized to safe ids, names, groups, and HTTPS logos", () => {
  const channel = normalizeCinexoraChannel({
    id: "abc_123",
    name: "  BBC News  ",
    group: " News ",
    country: "uk@hd",
    logo: "https://cinexora.name.ng/api/logo?id=abc_123",
    stream: "https://not-used.example/unsafe-stream",
  });

  assert.deepEqual(channel, {
    id: "abc_123",
    name: "BBC News",
    group: "News",
    country: "uk@hd",
    logo: "https://cinexora.name.ng/api/logo?id=abc_123",
  });
  assert.equal(normalizeCinexoraChannel({ id: "bad/id", name: "BBC" }), null);
  assert.equal(normalizeCinexoraChannel({ id: "valid-id", name: "" }), null);
  assert.equal(normalizeCinexoraChannel({ id: "valid-id", name: "News", logo: "javascript:alert(1)" }).logo, null);
});

test("Cinexora channel groups preserve the provider category names and accurate counts", () => {
  const groups = groupCinexoraChannels([
    { id: "1", name: "BBC News", group: "News" },
    { id: "2", name: "Sky News", group: "News" },
    { id: "3", name: "Sports One", group: "Sports" },
  ]);

  assert.deepEqual(groups.map(({ category, count }) => ({ category, count })), [
    { category: "News", count: 2 },
    { category: "Sports", count: 1 },
  ]);
});
