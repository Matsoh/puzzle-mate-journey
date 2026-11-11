import { createSyncedStore } from "./cloud-sync";
import { today } from "./progress";
import { emptyRivals, migrateRivals, tick, withChallenge, withDecline, withGame, withNotesRead, withRequestAnswer, withShadowWin, type Encounter, type Outcome, type RivalState } from "./rivals";

const store = createSyncedStore<RivalState>({
  key: "rivals",
  empty: emptyRivals,
  migrate: migrateRivals,
  legacyKeys: [],
  hasData: (s) => Object.keys(s.recs).length > 0 || s.shadow.length > 0 || s.encounters.length > 0,
});

export const useRivals = store.use;
export const getRivals = store.get;

/** Let the world move: a new day, a rematch from a friend, a new face on the map. */
export function rivalsTick(rating: number) {
  store.set((s) => tick(s, rating, today(), Date.now()));
}
/** From /parti when a game against a rival ends. */
export function recordRivalGame(rivalId: string, outcome: Outcome, elo: number, encId?: string | undefined) {
  store.set((s) => withGame(s, rivalId, outcome, elo, today(), Date.now(), encId));
}
export function answerRequest(rivalId: string, accept: boolean) {
  store.set((s) => withRequestAnswer(s, rivalId, accept, Date.now()));
}
export function declineEncounter(encId: string) {
  store.set((s) => withDecline(s, encId));
}
/** The player challenges a rival from Rivalboken; returns the encounter to play. */
export function challengeRival(rivalId: string, rating: number): Encounter | null {
  let enc: Encounter | null = null;
  store.set((s) => { const r = withChallenge(s, rivalId, rating, today(), Date.now()); enc = r.enc; return r.s; });
  return enc;
}
export function markNotesRead() {
  store.set(withNotesRead);
}
export function recordShadowWin(region: number) {
  store.set((s) => withShadowWin(s, region));
}
