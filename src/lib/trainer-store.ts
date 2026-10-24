import { createSyncedStore } from "./cloud-sync";
import { SESSION_XP, type CoachId, type SessionRecord } from "./trainer";
import { updateProgress, withCredit } from "./progress";
import { emptyCoach, getItem, markSeen, pickNext, recordOutcome, type CoachState, type Outcome } from "./adaptive";

export type TrainerState = {
  version: 3;
  coach: CoachId | null;
  sessions: Record<string, SessionRecord>;
  coaches: Record<CoachId, CoachState>;
  /** Daily task id bound to `${day}:${coach}` so it never shifts. */
  daily: Record<string, string>;
  /** Reflection drafts per `${day}:${coach}`. */
  drafts: Record<string, string>;
};
const KEY_V1 = "goblin-chess.trainer.v1";
const KEY = "goblin-chess.trainer.v2";
export const emptyTrainer = (): TrainerState => ({ version: 3, coach: "mike", sessions: {}, coaches: { mike: emptyCoach("mike") }, daily: {}, drafts: {} });

/** Migration: v2 had two profiles (magnus/hikaru); their task history is merged into Mike's. */
export function migrate(raw: unknown): TrainerState {
  const base = emptyTrainer();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as { version?: number; sessions?: Record<string, SessionRecord>; daily?: Record<string, string>; drafts?: Record<string, string>; coaches?: Record<string, Partial<CoachState>> };
  const out: TrainerState = { ...base, sessions: r.sessions && typeof r.sessions === "object" ? r.sessions : {} };
  out.daily = r.daily ?? {};
  out.drafts = r.drafts && typeof r.drafts === "object" ? r.drafts : {};
  if (r.version === 3 && r.coaches?.["mike"]) out.coaches.mike = { ...base.coaches.mike, ...r.coaches["mike"] };
  else if (r.version === 2 && r.coaches) {
    const mike = base.coaches.mike;
    for (const old of Object.values(r.coaches)) {
      if (!old) continue;
      mike.levels = { ...mike.levels, ...(old.levels ?? {}) };
      mike.recent = { ...mike.recent, ...(old.recent ?? {}) };
      mike.items = { ...mike.items, ...(old.items ?? {}) };
      mike.seq = Math.max(mike.seq, old.seq ?? 0);
    }
  }
  return out;
}

const store = createSyncedStore<TrainerState>({
  key: "trainer",
  empty: emptyTrainer,
  migrate,
  legacyKeys: [KEY, KEY_V1],
  hasData: (t) => t.coach !== null || Object.keys(t.sessions).length > 0,
});
const get = store.get;
const save = (next: TrainerState) => store.set(() => next);
export const useTrainer = store.use;

export const sessionKey = (day: string, coach: CoachId) => `${day}:${coach}`;
const blank: SessionRecord = { exercise: false, reflection: "", done: false, xpGiven: false };

export function chooseCoach(coach: CoachId) { save({ ...get(), coach }); }

export function updateSession(day: string, coach: CoachId, patch: Partial<SessionRecord>) {
  const s = get();
  const k = sessionKey(day, coach);
  const rec = { ...blank, ...s.sessions[k], ...patch };
  let award = false;
  if (rec.done && !rec.xpGiven) { rec.xpGiven = true; award = true; }
  save({ ...s, sessions: { ...s.sessions, [k]: rec } });
  // XP only — never rating — and only the first time this session is completed.
  if (award) updateProgress((p) => withCredit(p, `session:${k}`, SESSION_XP));
}

export function setCoachState(coach: CoachId, f: (cs: CoachState) => CoachState) {
  const s = get();
  save({ ...s, coaches: { ...s.coaches, [coach]: f(s.coaches[coach]) } });
}

/** Records a real attempt. Adaptive tasks never give XP or change rating. */
export function recordAttempt(coach: CoachId, id: string, outcome: Outcome, hints: number, day: string) {
  const item = getItem(id); if (!item) return;
  setCoachState(coach, (cs) => recordOutcome(cs, item, outcome, hints, day));
}

/** Moves to the next task. `skip` = current task was left unsolved (counts as nothing). */
export function advance(coach: CoachId, day: string, skip: boolean): { exhausted: boolean } {
  let exhausted = false;
  setCoachState(coach, (cs0) => {
    const cs = skip && cs0.current ? markSeen(cs0, cs0.current, day) : cs0;
    const p = pickNext(cs, coach, day);
    if ("exhausted" in p) { exhausted = true; return cs; }
    return { ...cs, current: p.id, currentReview: p.review, trail: cs.current ? [...cs.trail, cs.current].slice(-30) : cs.trail };
  });
  return { exhausted };
}

export function setCurrent(coach: CoachId, id: string, review: boolean) {
  setCoachState(coach, (cs) => ({ ...cs, current: id, currentReview: review, trail: cs.current && cs.current !== id ? [...cs.trail, cs.current].slice(-30) : cs.trail }));
}

/** Daily task: chosen once per local date + profile with the adaptive engine, then fixed. */
export function ensureDaily(coach: CoachId, day: string): string | null {
  const s = get();
  const k = sessionKey(day, coach);
  if (s.daily[k]) return s.daily[k]!;
  const p = pickNext(s.coaches[coach], coach, day);
  if ("exhausted" in p) return null;
  save({ ...s, daily: { ...s.daily, [k]: p.id } });
  return p.id;
}

export function saveDraft(day: string, coach: CoachId, text: string) {
  const s = get();
  save({ ...s, drafts: { ...s.drafts, [sessionKey(day, coach)]: text.slice(0, 300) } });
}
