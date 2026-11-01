import { createSyncedStore } from "./cloud-sync";
import { advance, emptyTourState, migrateTourState, newTour, summary, withMyResult, type Outcome, type Tier, type TourState } from "./tour";
import type { TimeControl } from "@/components/GameSetup";

const store = createSyncedStore<TourState>({
  key: "tour",
  empty: emptyTourState,
  migrate: migrateTourState,
  legacyKeys: [],
  hasData: (s) => s.current !== null || s.history.length > 0,
});

export const useTour = store.use;
export const getTour = store.get;

export function startTour(tier: Tier, tc: TimeControl, me: { name: string; elo: number; portrait?: string | null }) {
  const now = Date.now();
  store.set((s) => ({ ...s, current: newTour(tier, tc, me, (now ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0, now) }));
}
/** From /parti when my tournament game ends. Ignored when the ids do not match the running tournament. */
export function recordTourResult(id: string, round: number, outcome: Outcome, myMs: number) {
  store.set((s) => (s.current && s.current.id === id ? { ...s, current: withMyResult(s.current, round, outcome, myMs, Date.now()) } : s));
}
export function advanceTour() {
  store.set((s) => (s.current ? { ...s, current: advance(s.current, Date.now()) } : s));
}
/** Close a finished tournament: move it into the history. */
export function closeTour() {
  store.set((s) => (s.current && s.current.finishedAt ? { ...s, current: null, history: [...s.history, summary(s.current)].slice(-50) } : s));
}
/** Give up on an unfinished tournament (no prize, no history). */
export function abandonTour() {
  store.set((s) => ({ ...s, current: null }));
}
