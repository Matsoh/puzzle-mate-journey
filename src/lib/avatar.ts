// Monsterverkstedet — Tobias builds his own felt monster, Mike-style.
// Pure catalogue + rules; drawing lives in components/MonsterAvatar.tsx.
import type { Progress } from "./progress";

export type PartKey = "body" | "color" | "eyes" | "horns" | "mouth" | "extra";
export type PartOption = { id: string; name: string; cost: number };

export const PARTS: Record<PartKey, { label: string; options: PartOption[] }> = {
  body: { label: "Kropp", options: [
    { id: "box", name: "Kloss", cost: 0 }, { id: "round", name: "Rund", cost: 0 }, { id: "tall", name: "Høy", cost: 40 }, { id: "blob", name: "Klatt", cost: 60 },
  ] },
  color: { label: "Farge", options: [
    { id: "green", name: "Grønn", cost: 0 }, { id: "blue", name: "Blå", cost: 0 }, { id: "purple", name: "Lilla", cost: 30 }, { id: "orange", name: "Oransje", cost: 30 },
    { id: "pink", name: "Rosa", cost: 50 }, { id: "black", name: "Svart", cost: 80 }, { id: "gold", name: "Gull", cost: 200 },
  ] },
  eyes: { label: "Øyne", options: [
    { id: "one", name: "Ett", cost: 0 }, { id: "two", name: "To", cost: 0 }, { id: "three", name: "Tre", cost: 40 }, { id: "angry", name: "Sint", cost: 60 }, { id: "laser", name: "Laser", cost: 150 },
  ] },
  horns: { label: "Horn", options: [
    { id: "none", name: "Ingen", cost: 0 }, { id: "red", name: "Røde", cost: 0 }, { id: "blue", name: "Blå", cost: 30 }, { id: "curly", name: "Krøllete", cost: 70 }, { id: "crown", name: "Krone", cost: 250 },
  ] },
  mouth: { label: "Munn", options: [
    { id: "grin", name: "Glis", cost: 0 }, { id: "smile", name: "Smil", cost: 0 }, { id: "fangs", name: "Hoggtenner", cost: 50 }, { id: "tongue", name: "Tunge", cost: 50 }, { id: "zip", name: "Glidelås", cost: 90 },
  ] },
  extra: { label: "Ekstra", options: [
    { id: "none", name: "Ingenting", cost: 0 }, { id: "shades", name: "Solbriller", cost: 80 }, { id: "scarf", name: "Skjerf", cost: 60 }, { id: "bow", name: "Sløyfe", cost: 40 }, { id: "knight", name: "Springer", cost: 120 }, { id: "cape", name: "Kappe", cost: 180 },
  ] },
};

export const PART_KEYS = Object.keys(PARTS) as PartKey[];

export const DEFAULT_AVATAR: Record<PartKey, string> = { body: "box", color: "blue", eyes: "two", horns: "red", mouth: "smile", extra: "none" };

export const partId = (k: PartKey, id: string) => `${k}:${id}`;

export function avatarOf(p: Progress): Record<PartKey, string> {
  const a = { ...DEFAULT_AVATAR };
  for (const k of PART_KEYS) {
    const v = p.avatar?.[k];
    if (v && PARTS[k].options.some((o) => o.id === v)) a[k] = v;
  }
  return a;
}

export function owns(p: Progress, k: PartKey, id: string): boolean {
  const opt = PARTS[k].options.find((o) => o.id === id);
  return !!opt && (opt.cost === 0 || (p.avatarOwned ?? []).includes(partId(k, id)));
}

/** Pure: equip an owned part, or buy-and-equip if affordable. Null when not affordable. */
export function withPart(p: Progress, k: PartKey, id: string): Progress | null {
  const opt = PARTS[k].options.find((o) => o.id === id);
  if (!opt) return null;
  let next = p;
  if (!owns(p, k, id)) {
    if ((p.coins ?? 0) < opt.cost) return null;
    next = { ...p, coins: p.coins - opt.cost, avatarOwned: [...(p.avatarOwned ?? []), partId(k, id)] };
  }
  return { ...next, avatar: { ...(next.avatar ?? {}), [k]: id } };
}
