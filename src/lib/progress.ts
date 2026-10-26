import { createSyncedStore } from "./cloud-sync";
import { dedupeCredits } from "./sync-merge";
import { dayKey, nextStreak } from "./rules";
import type { ImportedGame } from "./games-import";
import type { Notebook } from "./notebook";

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
  /** Games played/won per day (last two weeks) — drives "Dagens oppdrag". */
  dayStats: Record<string, { games: number; wins: number }>;
  /** Monsterboken: solved puzzles per tactical motif (Lichess theme id). */
  motifs: Record<string, number>;
  /** Gold coins — earned from the daily chest, spent in the avatar workshop. */
  coins: number;
  /** Day → coins won from that day's chest (also marks it as opened). */
  chests: Record<string, number>;
  /** Avatar workshop: chosen parts and owned paid parts. */
  avatar: Record<string, string>;
  avatarOwned: string[];
  avatarName: string;
  /** Chosen 3D skin id (public/skins), or null to show the built Avataaars avatar. */
  skin: string | null;
  /** Online accounts for importing real games. */
  accounts: { chesscom?: string; lichess?: string };
  /** Imported real games (newest first, capped) and which ones were reviewed. */
  importedGames: ImportedGame[];
  reviewedGames: string[];
  /** Mikes notatbok. */
  notebook: Notebook;
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
  dayStats: {},
  motifs: {},
  coins: 0,
  chests: {},
  avatar: {},
  avatarOwned: [],
  avatarName: "",
  skin: null,
  accounts: {},
  importedGames: [],
  reviewedGames: [],
  notebook: { entries: [], patterns: {} },
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
