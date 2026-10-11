import { useSyncExternalStore } from "react";
import { SESSION_XP, type CoachId, type SessionRecord } from "./trainer";
import { updateProgress } from "./progress";
import { emptyCoach, getItem, markSeen, pickNext, recordOutcome, type CoachState, type Outcome } from "./adaptive";

export type TrainerState = {
  version: 2;
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
export const emptyTrainer = (): TrainerState => ({ version: 2, coach: null, sessions: {}, coaches: { magnus: emptyCoach("magnus"), hikaru: emptyCoach("hikaru") }, daily: {}, drafts: {} });

/** Safe migration: v1 kept coach + sessions; v1 key is left untouched. */
export function migrate(raw: unknown): TrainerState {
  const base = emptyTrainer();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<TrainerState> & { version?: number };
  const out: TrainerState = { ...base, coach: r.coach === "magnus" || r.coach === "hikaru" ? r.coach : null, sessions: r.sessions && typeof r.sessions === "object" ? r.sessions : {} };
  if (r.version === 2) {
    out.daily = r.daily ?? {};
    out.drafts = r.drafts && typeof r.drafts === "object" ? r.drafts : {};
    for (const c of ["magnus", "hikaru"] as CoachId[]) if (r.coaches?.[c]) out.coaches[c] = { ...base.coaches[c], ...r.coaches[c] };
  }
  return out;
}

let state: TrainerState = emptyTrainer();
const SERVER = emptyTrainer();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(KEY_V1);
    if (raw) state = migrate(JSON.parse(raw));
  } catch { /* start fresh */ }
}
function save(next: TrainerState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}
const get = () => { load(); return state; };
export function useTrainer(): TrainerState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, get, () => SERVER);
}

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
  if (award) updateProgress((p) => ({ ...p, xp: p.xp + SESSION_XP }));
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
