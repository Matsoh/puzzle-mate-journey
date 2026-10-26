// Flair: the little emoji next to the name, like on chess.com. Free ones to
// start, the rest earned – a cheap, visible brag.
import type { Progress } from "./progress";
import { unlocked, unlockLabel, type Unlock } from "./avatar";

export type Flair = { id: string; emoji: string; name: string; unlock: Unlock };

export const FLAIRS: Flair[] = [
  { id: "none", emoji: "", name: "Ingen", unlock: { kind: "free" } },
  { id: "knight", emoji: "♞", name: "Springer", unlock: { kind: "free" } },
  { id: "pawn", emoji: "♟", name: "Bonde", unlock: { kind: "free" } },
  { id: "star", emoji: "⭐", name: "Stjerne", unlock: { kind: "free" } },
  { id: "rocket", emoji: "🚀", name: "Rakett", unlock: { kind: "free" } },
  { id: "gamer", emoji: "🎮", name: "Gamer", unlock: { kind: "coins", cost: 30 } },
  { id: "pizza", emoji: "🍕", name: "Pizza", unlock: { kind: "coins", cost: 30 } },
  { id: "cat", emoji: "🐱", name: "Katt", unlock: { kind: "coins", cost: 40 } },
  { id: "shark", emoji: "🦈", name: "Hai", unlock: { kind: "coins", cost: 50 } },
  { id: "fire", emoji: "🔥", name: "Ild", unlock: { kind: "streak", days: 7 } },
  { id: "bolt", emoji: "⚡", name: "Lyn", unlock: { kind: "wins", n: 10 } },
  { id: "brain", emoji: "🧠", name: "Hjerne", unlock: { kind: "motifs", count: 10 } },
  { id: "grad", emoji: "🎓", name: "Skoleuke", unlock: { kind: "weeks", n: 1 } },
  { id: "medal", emoji: "🏅", name: "Medalje", unlock: { kind: "level", level: 5 } },
  { id: "trophy", emoji: "🏆", name: "Pokal", unlock: { kind: "wins", n: 50 } },
  { id: "dragon", emoji: "🐉", name: "Drage", unlock: { kind: "beat", opp: "ivar" } },
  { id: "ninja", emoji: "🥷", name: "Ninja", unlock: { kind: "beat", opp: "nora" } },
  { id: "alien", emoji: "👽", name: "ET", unlock: { kind: "beat", opp: "storm" } },
  { id: "crown", emoji: "👑", name: "Krone", unlock: { kind: "level", level: 10 } },
  { id: "diamond", emoji: "💎", name: "Diamant", unlock: { kind: "streak", days: 30 } },
];

export const flairOf = (id: string | null | undefined): Flair => FLAIRS.find((f) => f.id === id) ?? FLAIRS[0]!;
export const flairEmoji = (id: string | null | undefined) => flairOf(id).emoji;

export function ownsFlair(p: Progress, id: string): boolean {
  const f = FLAIRS.find((x) => x.id === id);
  return !!f && unlocked(p, f.unlock, (p.avatarOwned ?? []).includes(`flair:${id}`));
}
/** Pure: equip a flair (buying with coins if needed); null when locked/unaffordable. */
export function withFlair(p: Progress, id: string): Progress | null {
  const f = FLAIRS.find((x) => x.id === id);
  if (!f) return null;
  let next = p;
  if (!ownsFlair(p, id)) {
    if (f.unlock.kind !== "coins" || (p.coins ?? 0) < f.unlock.cost) return null;
    next = { ...p, coins: p.coins - f.unlock.cost, avatarOwned: [...(p.avatarOwned ?? []), `flair:${id}`] };
  }
  return { ...next, flair: id };
}
export { unlockLabel };

/** chess.com-style username rules, mirrored from the database check. */
export const USERNAME_RE = /^[a-z0-9_]{3,16}$/;
export const normalizeUsername = (s: string) => s.trim().toLowerCase().replace(/^@/, "");
