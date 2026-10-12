import { createSyncedStore } from "./cloud-sync";
import { migrateTournaments, type Tournament, type TournamentState } from "./tournament";

const empty = (): TournamentState => ({ version: 1, current: null, list: [] });
const store = createSyncedStore<TournamentState>({
  key: "tournament",
  empty,
  migrate: migrateTournaments,
  legacyKeys: ["goblin-chess.tournament.v1"],
  hasData: (t) => t.list.length > 0,
});

export const useTournaments = store.use;
export function addTournament(t: Tournament) {
  store.set((s) => ({ ...s, current: t.id, list: [...s.list.map((x) => (x.id === s.current ? { ...x, archived: true } : x)), t] }));
}
export function updateTournament(id: string, f: (t: Tournament) => Tournament) {
  store.set((s) => ({ ...s, list: s.list.map((t) => (t.id === id ? f(t) : t)) }));
}
export function archiveCurrent() {
  store.set((s) => ({ ...s, current: null, list: s.list.map((t) => (t.id === s.current ? { ...t, archived: true } : t)) }));
}
