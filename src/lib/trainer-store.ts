import { useSyncExternalStore } from "react";
import { SESSION_XP, type CoachId, type SessionRecord } from "./trainer";
import { updateProgress } from "./progress";

type TrainerState = { version: 1; coach: CoachId | null; sessions: Record<string, SessionRecord> };
const KEY = "goblin-chess.trainer.v1";
const EMPTY: TrainerState = { version: 1, coach: null, sessions: {} };
let state = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch { /* start fresh */ }
}
function save(next: TrainerState) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
  listeners.forEach((l) => l());
}
const get = () => { load(); return state; };
export function useTrainer(): TrainerState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, get, () => EMPTY);
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
