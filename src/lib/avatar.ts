// Avatarverkstedet — Tobias builds his own character (Adventurer by Lisa
// Wischofsky, CC BY 4.0, rendered with DiceBear, both vendored). Parts unlock by playing: free basics,
// coins from the daily chest, levels, streaks, beaten opponents, motifs, wins.
import type { Progress } from "./progress";
import { levelFromXp } from "./rules";
import { OPPONENTS } from "./opponents";
import { collectionSummary } from "./collection";
import { schoolWeeks } from "./school";

export type PartKey = "skin" | "hair" | "hairColor" | "eyes" | "eyebrows" | "mouth" | "glasses" | "earrings" | "features" | "background";

export type Unlock =
  | { kind: "free" }
  | { kind: "coins"; cost: number }
  | { kind: "level"; level: number }
  | { kind: "streak"; days: number }
  | { kind: "beat"; opp: string }
  | { kind: "motifs"; count: number }
  | { kind: "wins"; n: number }
  | { kind: "games"; n: number }
  | { kind: "weeks"; n: number };

export type PartOption = { id: string; name: string; unlock: Unlock };

const free = (id: string, name: string): PartOption => ({ id, name, unlock: { kind: "free" } });

/** Rules handed out in order to the non-free options of each part, so every part has cheap, medium and rare items. */
const RULES: Unlock[] = [
  { kind: "coins", cost: 30 }, { kind: "level", level: 2 }, { kind: "coins", cost: 40 }, { kind: "streak", days: 3 }, { kind: "level", level: 3 },
  { kind: "beat", opp: "pelle" }, { kind: "coins", cost: 50 }, { kind: "wins", n: 5 }, { kind: "level", level: 4 }, { kind: "games", n: 10 },
  { kind: "beat", opp: "kaos" }, { kind: "coins", cost: 60 }, { kind: "streak", days: 5 }, { kind: "motifs", count: 8 }, { kind: "level", level: 5 },
  { kind: "beat", opp: "mia" }, { kind: "weeks", n: 1 }, { kind: "coins", cost: 70 }, { kind: "wins", n: 15 }, { kind: "level", level: 6 },
  { kind: "beat", opp: "leo" }, { kind: "streak", days: 7 }, { kind: "games", n: 30 }, { kind: "coins", cost: 80 }, { kind: "level", level: 7 },
  { kind: "beat", opp: "pling" }, { kind: "motifs", count: 15 }, { kind: "weeks", n: 2 }, { kind: "wins", n: 30 }, { kind: "level", level: 8 },
  { kind: "beat", opp: "dina" }, { kind: "streak", days: 10 }, { kind: "coins", cost: 90 }, { kind: "games", n: 60 }, { kind: "level", level: 9 },
  { kind: "beat", opp: "sigurd" }, { kind: "motifs", count: 22 }, { kind: "weeks", n: 3 }, { kind: "wins", n: 50 }, { kind: "level", level: 10 },
  { kind: "beat", opp: "nora" }, { kind: "streak", days: 14 }, { kind: "coins", cost: 100 }, { kind: "games", n: 100 }, { kind: "level", level: 11 },
  { kind: "beat", opp: "ivar" }, { kind: "motifs", count: 30 }, { kind: "weeks", n: 5 }, { kind: "wins", n: 80 }, { kind: "level", level: 12 },
  { kind: "beat", opp: "storm" },
];

/** ids → options: the first `freeCount` are free, the rest get RULES in order (offset spreads rule kinds across parts). */
function series(ids: string[], label: (id: string, i: number) => string, freeCount: number, offset = 0): PartOption[] {
  return ids.map((id, i) => (i < freeCount ? free(id, label(id, i)) : { id, name: label(id, i), unlock: RULES[(i - freeCount + offset) % RULES.length]! }));
}
const pad = (n: number) => String(n).padStart(2, "0");
const variants = (n: number) => Array.from({ length: n }, (_, i) => `variant${pad(i + 1)}`);
const num = (id: string) => String(Number(id.replace(/\D/g, "")));

// Adventurer by Lisa Wischofsky (CC BY 4.0), rendered with DiceBear (MIT). Both vendored under src/vendor/dicebear.
export const PARTS: Record<PartKey, { label: string; options: PartOption[] }> = {
  skin: { label: "Hud", options: [free("f2d3b1", "Lys"), free("ecad80", "Beige"), free("9e5622", "Brun"), free("763900", "Mørk")] },
  hair: { label: "Hår", options: series([...Array.from({ length: 19 }, (_, i) => `short${pad(i + 1)}`), ...Array.from({ length: 26 }, (_, i) => `long${pad(i + 1)}`)], (id) => (id.startsWith("short") ? `Kort ${num(id)}` : `Langt ${num(id)}`), 8, 0) },
  hairColor: { label: "Hårfarge", options: series(["0e0e0e", "562306", "6a4e35", "796a45", "ac6511", "cb6820", "e5d7a3", "b9a05f", "ab2a18", "afafaf", "3eac2c", "85c2c6", "dba3be", "592454"], (id) => ({ "0e0e0e": "Svart", "562306": "Mørk brun", "6a4e35": "Brun", "796a45": "Askebrun", "ac6511": "Kastanje", "cb6820": "Rødbrun", "e5d7a3": "Blond", "b9a05f": "Mørk blond", "ab2a18": "Rød", "afafaf": "Grå", "3eac2c": "Grønn", "85c2c6": "Turkis", "dba3be": "Rosa", "592454": "Lilla" })[id] ?? id, 6, 3) },
  eyes: { label: "Øyne", options: series(variants(26), (_, i) => `Øyne ${i + 1}`, 6, 7) },
  eyebrows: { label: "Bryn", options: series(variants(15), (_, i) => `Bryn ${i + 1}`, 5, 11) },
  mouth: { label: "Munn", options: series(variants(30), (_, i) => `Munn ${i + 1}`, 6, 17) },
  glasses: { label: "Briller", options: [free("none", "Ingen"), ...series(variants(5), (_, i) => `Briller ${i + 1}`, 0, 23)] },
  earrings: { label: "Ørepynt", options: [free("none", "Ingen"), ...series(variants(6), (_, i) => `Ørepynt ${i + 1}`, 0, 29)] },
  features: { label: "Detaljer", options: [free("none", "Ingen"), ...series(["freckles", "blush", "birthmark", "mustache"], (id) => ({ freckles: "Fregner", blush: "Rødme", birthmark: "Føflekk", mustache: "Bart" })[id] ?? id, 1, 37)] },
  background: { label: "Bakgrunn", options: series(["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "a7ffc4", "ffffb1", "ff488e", "65c9ff", "25557c", "2b2b2b", "f5c542"], (id) => ({ b6e3f4: "Lyseblå", c0aede: "Lilla", d1d4f9: "Lavendel", ffd5dc: "Rosa", ffdfbf: "Fersken", a7ffc4: "Mint", ffffb1: "Gul", ff488e: "Magenta", "65c9ff": "Himmelblå", "25557c": "Marine", "2b2b2b": "Svart", f5c542: "Gull" })[id] ?? id, 5, 43) },
};

export const PART_KEYS = Object.keys(PARTS) as PartKey[];

export const DEFAULT_AVATAR: Record<PartKey, string> = {
  skin: "f2d3b1", hair: "short01", hairColor: "562306", eyes: "variant01", eyebrows: "variant01", mouth: "variant01",
  glasses: "none", earrings: "none", features: "none", background: "b6e3f4",
};

export const DEFAULT_NAME = "Tobias";
export const partId = (k: PartKey, id: string) => `${k}:${id}`;

export function avatarOf(p: Progress): Record<PartKey, string> {
  const a = { ...DEFAULT_AVATAR };
  for (const k of PART_KEYS) {
    const v = p.avatar?.[k];
    if (v && PARTS[k].options.some((o) => o.id === v)) a[k] = v;
  }
  return a;
}

export const avatarName = (p: Progress) => (p.avatarName ?? "").trim() || DEFAULT_NAME;

/** Human text for a lock, e.g. "Nivå 5" or "Slå Lynet Leo". */
export function unlockLabel(u: Unlock): string {
  switch (u.kind) {
    case "free": return "";
    case "coins": return `${u.cost} mynter`;
    case "level": return `Nivå ${u.level}`;
    case "streak": return `${u.days} dager på rad`;
    case "beat": return `Slå ${OPPONENTS.find((o) => o.id === u.opp)?.name.split(" ")[0] ?? u.opp}`;
    case "motifs": return `${u.count} motiver i Monsterboken`;
    case "wins": return `${u.n} seire`;
    case "games": return `${u.n} partier`;
    case "weeks": return u.n === 1 ? "Full skoleuke" : `${u.n} fulle skoleuker`;
  }
}

/** Whether the achievement behind a lock is met (coins: owned). Pure. */
export function unlocked(p: Progress, u: Unlock, owned: boolean): boolean {
  switch (u.kind) {
    case "free": return true;
    case "coins": return owned;
    case "level": return levelFromXp(p.xp).level >= u.level;
    case "streak": return p.bestStreak >= u.days;
    case "beat": return p.beaten.includes(u.opp);
    case "motifs": return collectionSummary(p).found >= u.count;
    case "wins": return p.wins >= u.n;
    case "games": return p.games >= u.n;
    case "weeks": return schoolWeeks(p) >= u.n;
  }
}

export function owns(p: Progress, k: PartKey, id: string): boolean {
  const opt = PARTS[k].options.find((o) => o.id === id);
  if (!opt) return false;
  return unlocked(p, opt.unlock, (p.avatarOwned ?? []).includes(partId(k, id)));
}

/** Pure: equip an unlocked part, buy-and-equip a coin part if affordable, else null. */
export function withPart(p: Progress, k: PartKey, id: string): Progress | null {
  const opt = PARTS[k].options.find((o) => o.id === id);
  if (!opt) return null;
  let next = p;
  if (!owns(p, k, id)) {
    if (opt.unlock.kind !== "coins" || (p.coins ?? 0) < opt.unlock.cost) return null;
    next = { ...p, coins: p.coins - opt.unlock.cost, avatarOwned: [...(p.avatarOwned ?? []), partId(k, id)] };
  }
  return { ...next, avatar: { ...(next.avatar ?? {}), [k]: id } };
}

/** Counts for the "unlocked X of Y" line. */
export function wardrobeSummary(p: Progress): { unlocked: number; total: number } {
  let u = 0, t = 0;
  for (const k of PART_KEYS) for (const o of PARTS[k].options) { t++; if (owns(p, k, o.id)) u++; }
  return { unlocked: u, total: t };
}

/** Next few things he could unlock — shown as goals. */
export function nextUnlocks(p: Progress, n = 3): { key: PartKey; option: PartOption }[] {
  const out: { key: PartKey; option: PartOption }[] = [];
  for (const k of PART_KEYS) for (const o of PARTS[k].options) if (o.unlock.kind !== "free" && o.unlock.kind !== "coins" && !owns(p, k, o.id)) out.push({ key: k, option: o });
  const lvl = levelFromXp(p.xp).level;
  const dist = (u: Unlock) => u.kind === "level" ? (u.level - lvl) * 10 : u.kind === "streak" ? (u.days - p.bestStreak) * 8 : u.kind === "beat" ? (OPPONENTS.findIndex((o) => o.id === u.opp) - p.beaten.length + 1) * 12 : u.kind === "wins" ? (u.n - p.wins) * 6 : u.kind === "games" ? (u.n - p.games) * 3 : u.kind === "motifs" ? (u.count - collectionSummary(p).found) * 4 : 99;
  return out.sort((a, b) => dist(a.option.unlock) - dist(b.option.unlock)).slice(0, n);
}
