import { createSyncedStore } from "./cloud-sync";
import { dedupeCredits } from "./sync-merge";
import { dayKey, nextStreak } from "./rules";

export type RatingPoint = { t: number; game: number; puzzle: number };
export type DailyState = { day: string; ids: string[]; results: Record<string, "solved" | "failed"> };

export type Progress = {
  version: 1;
  xp: number;
  rating: number;
  puzzleRating: number;
  streak: number;
  bestStreak: number;
  lastDay: string | null;
  history: RatingPoint[];
  beaten: string[];
  maxBeatenElo: number;
  badges: string[];
  games: number;
  wins: number;
  draws: number;
  puzzlesSolved: number;
  puzzlesTried: number;
  seenPuzzles: string[];
  daily: DailyState | null;
  muted: boolean;
  /** One-time XP credits by event id, so the same event never pays twice (also across devices). */
  credits: Record<string, number>;
};

export const DEFAULT_PROGRESS: Progress = {
  version: 1,
  xp: 0,
  rating: 1550,
  puzzleRating: 1550,
  streak: 0,
  bestStreak: 0,
  lastDay: null,
  history: [],
  beaten: [],
  maxBeatenElo: 0,
  badges: [],
  games: 0,
  wins: 0,
  draws: 0,
  puzzlesSolved: 0,
  puzzlesTried: 0,
  seenPuzzles: [],
  daily: null,
  muted: false,
  credits: {},
};

// Old anonymous key — read only for the one-time import offer, never deleted.
const LEGACY_KEY = "sjakkstorm.progress.v1";

const store = createSyncedStore<Progress>({
  key: "progress",
  empty: () => DEFAULT_PROGRESS,
  migrate: (raw) => ({ ...DEFAULT_PROGRESS, ...(raw && typeof raw === "object" ? (raw as Partial<Progress>) : {}) }),
  legacyKeys: [LEGACY_KEY],
  reconcile: dedupeCredits,
  hasData: (p) => p.xp > 0 || p.games > 0 || p.puzzlesTried > 0 || p.history.length > 0,
});

export const getProgress = store.get;
export const updateProgress = store.set;
export const useProgress = store.use;

export const today = () => dayKey(new Date());

/** Mark today as an active training day (updates streak). */
export function markActive(p: Progress): Progress {
  const t = today();
  const streak = nextStreak(p.lastDay, t, p.streak);
  return { ...p, lastDay: t, streak, bestStreak: Math.max(p.bestStreak, streak) };
}

export function withHistoryPoint(p: Progress): Progress {
  const history = [...p.history, { t: Date.now(), game: p.rating, puzzle: p.puzzleRating }].slice(-300);
  return { ...p, history };
}

/** Pure: add XP for an event id only once. */
export function withCredit(p: Progress, id: string, xp: number): Progress {
  if (p.credits[id] !== undefined) return p;
  return { ...p, xp: p.xp + xp, credits: { ...p.credits, [id]: xp } };
}
