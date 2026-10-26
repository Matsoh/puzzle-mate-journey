// Avatarverkstedet — Tobias builds his own 3D character (Zuri by Bright
// Kumedzro, MIT, vendored: Memoji-style heads generated from code). Parts unlock by playing: free basics,
// coins from the daily chest, levels, streaks, beaten opponents, motifs, wins.
import type { Progress } from "./progress";
import { levelFromXp } from "./rules";
import { OPPONENTS } from "./opponents";
import { collectionSummary } from "./collection";
import { schoolWeeks } from "./school";

export type PartKey = "style" | "skin" | "face" | "hair" | "hairColor" | "eyes" | "brows" | "mouth" | "beard" | "glasses" | "earrings" | "details" | "outfit" | "outfitColor" | "accessory" | "background";

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

/** [id, name] pairs → options: the first `freeCount` are free, the rest get RULES in order (offset spreads rule kinds across parts). */
function series(items: readonly (readonly [string, string])[], freeCount: number, offset = 0): PartOption[] {
  return items.map(([id, name], i) => (i < freeCount ? free(id, name) : { id, name, unlock: RULES[(i - freeCount + offset) % RULES.length]! }));
}

// Zuri by Bright Kumedzro (MIT, vendored under src/vendor/zuri): 3D Memoji-style heads generated from code, no image assets.
export const PARTS: Record<PartKey, { label: string; options: PartOption[] }> = {
  style: { label: "Stil", options: [free("masculine", "Gutt"), free("feminine", "Jente")] },
  skin: { label: "Hud", options: series([["13", "Lysest"], ["12", "Veldig lys"], ["11", "Lys"], ["10", "Lys beige"], ["9", "Beige"], ["8", "Gyllen"], ["7", "Karamell"], ["6", "Varm brun"], ["5", "Brun"], ["4", "Mørk brun"], ["3", "Dyp brun"], ["2", "Mørk"], ["1", "Veldig mørk"], ["0", "Mørkest"]], 14) },
  face: { label: "Ansikt", options: series([["oval", "Oval"], ["round", "Rund"], ["square", "Firkantet"], ["heart", "Hjerte"], ["long", "Lang"], ["diamond", "Diamant"]], 3, 0) },
  hair: { label: "Hår", options: series([["crop", "Kort"], ["buzz", "Snauklipt"], ["fade", "Fade"], ["curly", "Krøllete"], ["long", "Langt"], ["bob", "Bob"], ["none", "Barbert"], ["hightop", "High top"], ["afro", "Afro"], ["puffs", "Puffs"], ["bun", "Knute"], ["locs", "Locs"], ["braids", "Fletter"], ["cornrows", "Cornrows"], ["ponytail", "Hestehale"], ["headwrap", "Hodeplagg"]], 7, 3) },
  hairColor: { label: "Hårfarge", options: series([["black", "Svart"], ["espresso", "Espresso"], ["darkBrown", "Mørk brun"], ["brown", "Brun"], ["blonde", "Blond"], ["auburn", "Rødbrun"], ["ginger", "Rød"], ["platinum", "Platina"], ["grey", "Grå"], ["pink", "Rosa"], ["blue", "Blå"], ["purple", "Lilla"]], 5, 7) },
  eyes: { label: "Øyne", options: series([["darkBrown", "Mørk brun"], ["brown", "Brun"], ["blue", "Blå"], ["hazel", "Hassel"], ["green", "Grønn"], ["grey", "Grå"]], 3, 11) },
  brows: { label: "Bryn", options: series([["normal", "Vanlige"], ["thin", "Tynne"], ["thick", "Kraftige"], ["arched", "Buede"], ["flat", "Flate"]], 2, 14) },
  mouth: { label: "Uttrykk", options: series([["smile", "Smil"], ["neutral", "Nøytral"], ["grin", "Glis"], ["laugh", "Latter"], ["smirk", "Skjevt smil"], ["wink", "Blunk"], ["surprised", "Overrasket"]], 3, 17) },
  beard: { label: "Skjegg", options: series([["none", "Ingen"], ["stubble", "Stubb"], ["mustache", "Bart"], ["goatee", "Geitskjegg"], ["beard", "Helskjegg"]], 1, 21) },
  glasses: { label: "Briller", options: series([["none", "Ingen"], ["round", "Runde"], ["square", "Firkantede"]], 1, 24) },
  earrings: { label: "Ørepynt", options: series([["none", "Ingen"], ["studs", "Små"], ["hoops", "Ringer"]], 1, 27) },
  details: { label: "Detaljer", options: series([["none", "Ingen"], ["freckles", "Fregner"], ["blush", "Rødme"], ["both", "Fregner og rødme"]], 1, 30) },
  outfit: { label: "Klær", options: series([["tee", "T-skjorte"], ["hoodie", "Hettegenser"], ["vneck", "V-hals"], ["shirt", "Skjorte"], ["sweater", "Genser"], ["tank", "Singlet"], ["turtleneck", "Rullekrage"], ["denim", "Denimjakke"], ["cardigan", "Cardigan"], ["buttonup", "Knappeskjorte"], ["blazer", "Blazer"], ["suit", "Dress"], ["bowtie", "Sløyfe"], ["blouse", "Bluse"], ["wrap", "Omslagstopp"], ["kaftan", "Kaftan"], ["kente", "Kente"], ["ankara", "Ankara"], ["agbada", "Agbada"], ["labcoat", "Labfrakk"], ["scrubs", "Sykehusdrakt"], ["chef", "Kokkejakke"]], 5, 33) },
  outfitColor: { label: "Klesfarge", options: series([["#2f5d8a", "Blå"], ["#1f2430", "Svart"], ["#f4f1ea", "Hvit"], ["#c8452f", "Rød"], ["#3f7a55", "Grønn"], ["#e8a33d", "Oransje"], ["#7a4bb0", "Lilla"], ["#e7709a", "Rosa"], ["#3a3a3a", "Mørk grå"], ["#9fb7c9", "Lyseblå"], ["#c9b48f", "Sand"], ["#1d6f6a", "Petrol"], ["#f2d24b", "Gul"], ["#8a2f45", "Vinrød"]], 5, 40) },
  accessory: { label: "Tilbehør", options: series([["none", "Ingen"], ["scarf", "Skjerf"], ["necklace", "Kjede"], ["headtie", "Gele"]], 1, 45) },
  background: { label: "Bakgrunn", options: series([["#cde2f7", "Lyseblå"], ["#cfe9d6", "Mint"], ["#ffe3a8", "Gul"], ["#ffd8cc", "Fersken"], ["#e2d6f6", "Lilla"], ["#f8d0e0", "Rosa"], ["#d3efe9", "Turkis"], ["#f3e3d0", "Sand"], ["#dfe8c4", "Lime"], ["#1e2a24", "Mørk grønn"], ["#2b2b2b", "Svart"], ["#f5c542", "Gull"]], 5, 48) },
};

export const PART_KEYS = Object.keys(PARTS) as PartKey[];

export const DEFAULT_AVATAR: Record<PartKey, string> = {
  style: "masculine", skin: "12", face: "oval", hair: "crop", hairColor: "darkBrown", eyes: "blue", brows: "normal", mouth: "smile",
  beard: "none", glasses: "none", earrings: "none", details: "none", outfit: "hoodie", outfitColor: "#2f5d8a", accessory: "none", background: "#cde2f7",
};

export const DEFAULT_NAME = "Tobias";
export const partId = (k: PartKey, id: string) => `${k}:${id}`;

/** Any stored/received record → a valid look (unknown parts and ids fall back to the default). */
export function normalizeLook(raw: Record<string, unknown> | null | undefined): Record<PartKey, string> {
  const a = { ...DEFAULT_AVATAR };
  for (const k of PART_KEYS) {
    const v = raw?.[k];
    if (typeof v === "string" && PARTS[k].options.some((o) => o.id === v)) a[k] = v;
  }
  return a;
}
export const avatarOf = (p: Progress): Record<PartKey, string> => normalizeLook(p.avatar);

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
