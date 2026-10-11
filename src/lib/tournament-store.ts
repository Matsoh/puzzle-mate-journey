import { useSyncExternalStore } from "react";
import { migrateTournaments, type Tournament, type TournamentState } from "./tournament";

const KEY = "goblin-chess.tournament.v1";
const SERVER: TournamentState = { version: 1, current: null, list: [] };
let state = SERVER;
let loaded = false;
const listeners = new Set<() => void>();

const get = () => {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    try { const raw = localStorage.getItem(KEY); if (raw) state = migrateTournaments(JSON.parse(raw)); } catch { /* fresh */ }
  }
  return state;
};
function save(next: TournamentState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}
export function useTournaments(): TournamentState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, get, () => SERVER);
}
export function addTournament(t: Tournament) {
  const s = get();
  save({ ...s, current: t.id, list: [...s.list.map((x) => (x.id === s.current ? { ...x, archived: true } : x)), t] });
}
export function updateTournament(id: string, f: (t: Tournament) => Tournament) {
  const s = get();
  save({ ...s, list: s.list.map((t) => (t.id === id ? f(t) : t)) });
}
export function archiveCurrent() {
  const s = get();
  save({ ...s, current: null, list: s.list.map((t) => (t.id === s.current ? { ...t, archived: true } : t)) });
}
