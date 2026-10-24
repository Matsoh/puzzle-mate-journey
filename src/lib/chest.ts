// Skattekisten — variable-ratio reward (the mechanic behind loot drops and
// Pokémon Go eggs): clearing all three daily quests opens one chest. Most days
// pay a modest amount, some days a lot, rarely a jackpot. Pure + tested.
import type { Progress } from "./progress";
import type { ChestTier } from "./celebrate";

export type ChestRoll = { coins: number; tier: ChestTier };

/** Odds per tier and coin range. Streaks nudge the odds up a little. */
export const CHEST_TABLE: { tier: ChestTier; weight: number; min: number; max: number }[] = [
  { tier: "vanlig", weight: 70, min: 20, max: 40 },
  { tier: "stor", weight: 25, min: 60, max: 100 },
  { tier: "jackpot", weight: 5, min: 200, max: 300 },
];

/** Deterministic 0..1 from a seed, so a chest opened twice (two devices) pays the same. */
export function seededUnit(seed: string): number {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return (h % 100000) / 100000;
}

export function rollChest(seed: string, streak = 0): ChestRoll {
  const bonus = Math.min(10, Math.floor(streak / 3) * 2); // +2% big/jackpot odds per 3-day streak, max +10
  const table = CHEST_TABLE.map((r) => ({ ...r, weight: r.tier === "vanlig" ? r.weight - bonus : r.weight + bonus / 2 }));
  const total = table.reduce((s, r) => s + r.weight, 0);
  let u = seededUnit(seed + ":tier") * total;
  let row = table[0]!;
  for (const r of table) { if (u < r.weight) { row = r; break; } u -= r.weight; }
  const coins = row.min + Math.floor(seededUnit(seed + ":coins") * (row.max - row.min + 1));
  return { coins: Math.round(coins / 5) * 5, tier: row.tier };
}

export const chestOpened = (p: Progress, day: string) => (p.chests?.[day] ?? 0) > 0;

/** Pure: open today's chest once. A second call on the same day changes nothing. */
export function withChest(p: Progress, day: string, roll: ChestRoll): Progress {
  if (chestOpened(p, day)) return p;
  return { ...p, coins: (p.coins ?? 0) + roll.coins, chests: { ...(p.chests ?? {}), [day]: roll.coins } };
}

export function withCoinsSpent(p: Progress, amount: number): Progress | null {
  if ((p.coins ?? 0) < amount) return null;
  return { ...p, coins: p.coins - amount };
}
