// Celebration queue — anything worth a full-screen moment goes through here
// and the global <Celebrations/> overlay in AppShell plays it. Browser-safe,
// no React; the hook lives in the component.
import type { Badge } from "./badges";
import type { Motif } from "./collection";
import type { Progress } from "./progress";
import { levelFromXp } from "./rules";
import { levelTitle } from "./quests";
import { WEEK_COINS } from "./school";

export type Celebration =
  | { kind: "level"; level: number; title: string }
  | { kind: "badge"; badge: Badge }
  | { kind: "motif"; motifs: Motif[] }
  | { kind: "chest"; coins: number; tier: ChestTier }
  | { kind: "schoolday"; days: number }
  | { kind: "week"; coins: number; weeks: number }
  | { kind: "classup"; cls: number; name: string }
  | { kind: "tour"; place: number; tier: string; xp: number; coins: number };

export type ChestTier = "vanlig" | "stor" | "jackpot";

const queue: Celebration[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function celebrate(c: Celebration) { queue.push(c); emit(); }
export function announceDiscovery(motifs: Motif[]) { if (motifs.length) celebrate({ kind: "motif", motifs }); }

/** Compare before/after progress and queue level-ups and new badges. */
export function celebrateDiff(before: Progress, after: Progress) {
  const a = levelFromXp(before.xp).level, b = levelFromXp(after.xp).level;
  if (b > a) celebrate({ kind: "level", level: b, title: levelTitle(b) });
  // Mike Skolen: a finished school day, and the full-week prize.
  const newKeys = Object.keys(after.credits).filter((k) => before.credits[k] === undefined);
  const dayDone = newKeys.filter((k) => /^school:\d{4}-\d{2}-\d{2}:done$/.test(k)).length;
  const weeks = newKeys.filter((k) => k.startsWith("school:week:"));
  const passed = newKeys.find((k) => /^school:exam:\d+$/.test(k));
  if (passed) celebrate({ kind: "classup", cls: after.schoolClass, name: after.schoolClass > 7 ? "Uteksaminert!" : `${after.schoolClass}. klasse` });
  if (weeks.length) celebrate({ kind: "week", coins: WEEK_COINS, weeks: Object.keys(after.credits).filter((k) => k.startsWith("school:week:")).length });
  else if (dayDone) celebrate({ kind: "schoolday", days: Object.keys(after.credits).filter((k) => /^school:\d{4}-\d{2}-\d{2}:done$/.test(k)).length });
}
export function celebrateBadges(badges: Badge[]) { for (const b of badges) celebrate({ kind: "badge", badge: b }); }

export function peek(): Celebration | undefined { return queue[0]; }
export function shift() { queue.shift(); emit(); }
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function pending(): number { return queue.length; }
