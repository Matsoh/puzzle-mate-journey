// 3D "skins": ready-made portrait heads Tobias can pick instead of the built
// Avataaars avatar. 250 images under public/skins (a1–a125, b1–b125), each
// with an unlock rule so the collection grows with real play.
import type { Progress } from "./progress";
import { unlocked, unlockLabel, type Unlock } from "./avatar";
import { OPPONENTS } from "./opponents";

export type Skin = { id: string; unlock: Unlock };

const IDS: string[] = [...Array.from({ length: 125 }, (_, i) => `a${i + 1}`), ...Array.from({ length: 125 }, (_, i) => `b${i + 1}`)];

/** Deterministic shuffle so free/cheap/expensive skins are spread across looks. */
function order(): string[] {
  const arr = [...IDS];
  let s = 1337;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j]!, arr[i]!]; }
  return arr;
}

/** Hand-picked starters with variety (kids, caps, glasses, different looks). */
const FREE = ["a16", "a20", "a25", "a94", "b27", "b58", "a106", "b35", "a12", "b116", "a62", "b105"];

function buildSkins(): Skin[] {
  const rest = order().filter((id) => !FREE.includes(id));
  const out: Skin[] = FREE.map((id) => ({ id, unlock: { kind: "free" } }));
  const rules: Unlock[] = [];
  for (let i = 0; i < 60; i++) rules.push({ kind: "coins", cost: 30 + (i % 6) * 10 });
  for (let l = 2; l <= 12; l++) for (let k = 0; k < 5; k++) rules.push({ kind: "level", level: l });
  for (const d of [3, 5, 7, 10, 14, 21, 30]) for (let k = 0; k < 4; k++) rules.push({ kind: "streak", days: d });
  for (const o of OPPONENTS) for (let k = 0; k < 4; k++) rules.push({ kind: "beat", opp: o.id });
  for (const n of [3, 5, 10, 15, 20, 30, 40, 50, 75, 100]) for (let k = 0; k < 2; k++) rules.push({ kind: "wins", n });
  for (const n of [5, 10, 20, 35, 50, 75, 100, 150]) for (let k = 0; k < 2; k++) rules.push({ kind: "games", n });
  for (const c of [5, 10, 15, 20, 25, 30, 36]) for (let k = 0; k < 2; k++) rules.push({ kind: "motifs", count: c });
  for (const w of [1, 2, 3, 4, 6, 8, 10]) for (let k = 0; k < 2; k++) rules.push({ kind: "weeks", n: w });
  rest.forEach((id, i) => out.push({ id, unlock: rules[i % rules.length]! }));
  return out;
}

export const SKINS: Skin[] = buildSkins();
export const skinSrc = (id: string) => `/skins/${id}.png`;
export const isSkinId = (id: string | undefined | null): id is string => !!id && IDS.includes(id);

export function ownsSkin(p: Progress, id: string): boolean {
  const s = SKINS.find((x) => x.id === id);
  if (!s) return false;
  return unlocked(p, s.unlock, (p.avatarOwned ?? []).includes(`skin:${id}`));
}

/** Pure: equip a skin (buying it with coins if needed); null when locked/unaffordable. */
export function withSkin(p: Progress, id: string): Progress | null {
  const s = SKINS.find((x) => x.id === id);
  if (!s) return null;
  let next = p;
  if (!ownsSkin(p, id)) {
    if (s.unlock.kind !== "coins" || (p.coins ?? 0) < s.unlock.cost) return null;
    next = { ...p, coins: p.coins - s.unlock.cost, avatarOwned: [...(p.avatarOwned ?? []), `skin:${id}`] };
  }
  return { ...next, skin: id };
}
export const withoutSkin = (p: Progress): Progress => ({ ...p, skin: null });

export function skinSummary(p: Progress): { unlocked: number; total: number } {
  return { unlocked: SKINS.filter((s) => ownsSkin(p, s.id)).length, total: SKINS.length };
}
export { unlockLabel };
