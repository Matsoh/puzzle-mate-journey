// Avatarverkstedet — Tobias builds his own character (Avataaars by Pablo Stanley,
// rendered with DiceBear, both vendored). Parts unlock by playing: free basics,
// coins from the daily chest, levels, streaks, beaten opponents, motifs, wins.
import type { Progress } from "./progress";
import { levelFromXp } from "./rules";
import { OPPONENTS } from "./opponents";
import { collectionSummary } from "./collection";
import { schoolWeeks } from "./school";

export type PartKey = "skin" | "hair" | "hairColor" | "eyes" | "eyebrows" | "mouth" | "clothing" | "clothesColor" | "graphic" | "accessories" | "background";

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
const coins = (id: string, name: string, cost: number): PartOption => ({ id, name, unlock: { kind: "coins", cost } });
const level = (id: string, name: string, lvl: number): PartOption => ({ id, name, unlock: { kind: "level", level: lvl } });
const streak = (id: string, name: string, days: number): PartOption => ({ id, name, unlock: { kind: "streak", days } });
const beat = (id: string, name: string, opp: string): PartOption => ({ id, name, unlock: { kind: "beat", opp } });
const motifs = (id: string, name: string, count: number): PartOption => ({ id, name, unlock: { kind: "motifs", count } });
const wins = (id: string, name: string, n: number): PartOption => ({ id, name, unlock: { kind: "wins", n } });
const games = (id: string, name: string, n: number): PartOption => ({ id, name, unlock: { kind: "games", n } });
const weeks = (id: string, name: string, n: number): PartOption => ({ id, name, unlock: { kind: "weeks", n } });

export const PARTS: Record<PartKey, { label: string; options: PartOption[] }> = {
  skin: { label: "Hud", options: [free("ffdbb4", "Lys"), free("edb98a", "Beige"), free("f8d25c", "Gul"), free("fd9841", "Fersken"), free("d08b5b", "Brun"), free("ae5d29", "Mørk brun"), free("614335", "Mørk")] },
  hair: { label: "Hår", options: [
    free("shortFlat", "Kort flatt"), free("shortRound", "Kort rundt"), free("shortWaved", "Kort bølget"), free("theCaesar", "Cæsar"), free("sides", "Sider"), free("straight01", "Rett langt"), free("bob", "Bob"), free("curly", "Krøllete"),
    level("shortCurly", "Kort krøllete", 2), level("shaggy", "Bustete", 3), level("frizzle", "Krus", 3), level("shavedSides", "Barberte sider", 4), level("theCaesarAndSidePart", "Cæsar med skill", 4), level("fro", "Afro", 5), level("dreads01", "Dreads", 5), level("straightAndStrand", "Rett med lokk", 6), level("bun", "Knute", 6), level("shaggyMullet", "Mullet", 7), level("bigHair", "Stort hår", 8), level("miaWallace", "Mia", 8), level("frida", "Frida", 9), level("dreads", "Lange dreads", 10),
    free("hijab", "Hijab"), free("turban", "Turban"),
    beat("hat", "Hatt", "pelle"), streak("winterHat1", "Lue", 3), streak("winterHat02", "Lue med dusk", 5), beat("winterHat03", "Stripete lue", "mia"), beat("winterHat04", "Lue med brett", "sigurd"),
    weeks("froBand", "Afro med bånd", 1), weeks("dreads02", "Dreads deluxe", 2), weeks("longButNotTooLong", "Halvlangt", 3),
  ] },
  hairColor: { label: "Hårfarge", options: [free("2c1b18", "Svart"), free("4a312c", "Mørk brun"), free("724133", "Brun"), free("a55728", "Kastanje"), free("b58143", "Lys brun"), free("d6b370", "Blond"), free("ecdcbf", "Platina"), coins("c93305", "Rød", 20), coins("f59797", "Rosa", 40), coins("e8e1e1", "Sølv", 60)] },
  eyes: { label: "Øyne", options: [free("default", "Vanlige"), free("happy", "Glade"), free("wink", "Blunk"), free("side", "Sidelengs"), level("surprised", "Overrasket", 2), level("squint", "Myste", 3), level("hearts", "Hjerter", 4), beat("winkWacky", "Skrudd blunk", "kaos"), wins("eyeRoll", "Himler", 5), streak("xDizzy", "Svimmel", 7), free("closed", "Lukket")] },
  eyebrows: { label: "Bryn", options: [free("default", "Vanlige"), free("defaultNatural", "Naturlige"), free("raisedExcited", "Hevet"), level("upDown", "Opp-ned", 2), level("flatNatural", "Flate", 3), beat("angry", "Sinte", "leo"), beat("angryNatural", "Sinte naturlige", "leo"), coins("unibrowNatural", "Monobryn", 30), free("sadConcerned", "Bekymret"), level("frownNatural", "Rynket", 4), level("raisedExcitedNatural", "Hevet naturlige", 5), weeks("upDownNatural", "Skråbryn", 2)] },
  mouth: { label: "Munn", options: [free("smile", "Smil"), free("default", "Vanlig"), free("twinkle", "Glimt"), free("serious", "Alvorlig"), level("tongue", "Tunge", 3), coins("eating", "Spiser", 40), beat("grimace", "Grimase", "mia"), level("screamOpen", "Skrik", 5), level("disbelief", "Vantro", 4), wins("concerned", "Bekymret", 3), weeks("sad", "Trist", 1)] },
  clothing: { label: "Klær", options: [free("shirtCrewNeck", "T-skjorte"), free("hoodie", "Hettegenser"), free("shirtVNeck", "V-hals"), coins("shirtScoopNeck", "Rund hals", 30), level("graphicShirt", "T-skjorte med trykk", 3), level("overall", "Snekkerbukse", 4), coins("collarAndSweater", "Skjorte og genser", 60), beat("blazerAndShirt", "Blazer og skjorte", "pling"), beat("blazerAndSweater", "Blazer og genser", "dina")] },
  clothesColor: { label: "Farge på klær", options: [free("5199e4", "Blå"), free("262e33", "Svart"), free("e6e6e6", "Lys grå"), free("ff5c5c", "Rød"), free("a7ffc4", "Mint"), free("25557c", "Marine"), coins("ffffb1", "Gul", 20), coins("ff488e", "Rosa", 20), coins("b1e2ff", "Lyseblå", 20), coins("ffafb9", "Lys rosa", 20), coins("929598", "Grå", 20), coins("3c4f5c", "Stål", 20), coins("65c9ff", "Himmelblå", 20), coins("ffffff", "Hvit", 20)] },
  graphic: { label: "Trykk", options: [free("pizza", "Pizza"), free("bear", "Bjørn"), level("skullOutline", "Hodeskalle (strek)", 4), level("skull", "Hodeskalle", 6), streak("deer", "Hjort", 5), coins("bat", "Flaggermus", 50), motifs("diamond", "Diamant", 15), beat("hola", "Hola", "nora"), games("cumbia", "Cumbia", 20), weeks("resist", "Resist", 1)] },
  accessories: { label: "Tilbehør", options: [free("none", "Ingen"), level("prescription01", "Briller", 2), coins("round", "Runde briller", 60), level("prescription02", "Firkantede briller", 5), beat("wayfarers", "Wayfarers", "nora"), beat("sunglasses", "Solbriller", "ivar"), level("kurt", "Kurt-briller", 9), motifs("eyepatch", "Øyelapp", 10)] },
  background: { label: "Bakgrunn", options: [free("b1e2ff", "Lyseblå"), free("a7ffc4", "Mint"), free("ffffb1", "Gul"), free("ffdeb5", "Fersken"), free("e6e6e6", "Grå"), coins("ff488e", "Rosa", 30), coins("65c9ff", "Himmelblå", 30), coins("5199e4", "Blå", 30), level("ffafb9", "Lys rosa", 3), beat("25557c", "Marine", "storm")] },
};

export const PART_KEYS = Object.keys(PARTS) as PartKey[];

export const DEFAULT_AVATAR: Record<PartKey, string> = {
  skin: "ffdbb4", hair: "shortFlat", hairColor: "4a312c", eyes: "happy", eyebrows: "default", mouth: "smile",
  clothing: "hoodie", clothesColor: "5199e4", graphic: "pizza", accessories: "none", background: "b1e2ff",
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
