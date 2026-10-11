// Pure game-progress rules (no browser APIs) — easy to unit test.

export const XP = {
  puzzleSolved: 15,
  puzzleFailed: 3,
  dailyAllDone: 30,
  gameWin: 50,
  gameDraw: 25,
  gameLoss: 10,
  bossWinBonus: 50,
} as const;

export const K_GAME = 24;
export const K_PUZZLE = 20;

export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + Math.pow(10, (opponent - rating) / 400));
}

/** score: 1 = win, 0.5 = draw, 0 = loss */
export function newRating(rating: number, opponent: number, score: number, k: number): number {
  return Math.round(rating + k * (score - expectedScore(rating, opponent)));
}

/** XP needed to go from level n to n+1 */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rest = xp;
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, needed: xpForLevel(level) };
}

export function dayKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function previousDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

/** Streak after being active on `today`. */
export function nextStreak(lastDay: string | null, today: string, streak: number): number {
  if (lastDay === today) return Math.max(1, streak);
  if (lastDay && lastDay === previousDay(today)) return streak + 1;
  return 1;
}

/** Streak to display (0 if a day was missed). */
export function liveStreak(lastDay: string | null, today: string, streak: number): number {
  if (!lastDay) return 0;
  if (lastDay === today || lastDay === previousDay(today)) return streak;
  return 0;
}
