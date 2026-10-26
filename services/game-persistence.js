const COLLECTION = "liveMultiplayerGames";

export function createGamePersistence(db, gameType) {
  if (!db) return null;
  const collection = db.collection(COLLECTION);
  const key = (id) => `${gameType}_${String(id)}`;
  const pending = new Set();
  return {
    async save(snapshot) {
      let request;
      request = collection.doc(key(snapshot.id)).set({ ...snapshot, gameType, updatedAt: Date.now() }).finally(() => pending.delete(request));
      pending.add(request);
      await request;
    },
    async remove(id) {
      await collection.doc(key(id)).delete();
    },
    async load() {
      const snap = await collection.where("gameType", "==", gameType).get();
      return snap.docs.map((doc) => doc.data()).filter((game) => game.status === "active");
    },
    async flush() {
      await Promise.allSettled([...pending]);
    },
  };
}

export function withoutTransientGameState(game, extra = {}) {
  return { ...game, ...extra, spectators: [], offSpec: [] };
}
