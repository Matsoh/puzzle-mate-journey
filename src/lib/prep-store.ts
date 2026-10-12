import { createSyncedStore } from "./cloud-sync";
import { emptyPrep, migratePrep, type PrepState } from "./prep";

const store = createSyncedStore<PrepState>({
  key: "prep",
  empty: emptyPrep,
  migrate: migratePrep,
  legacyKeys: ["goblin-chess.prep.v1"],
  hasData: (p) => JSON.stringify(p) !== JSON.stringify(emptyPrep()),
});

export const updatePrep = store.set;
export const readPrep = store.get;
export const usePrep = store.use;
