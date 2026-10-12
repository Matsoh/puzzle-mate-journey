/**
 * Pure three-way merge for two devices that changed the same saved store.
 * `base` = the last version both devices agreed on (last confirmed server copy).
 *
 * - additive counters (xp, games, ratings …): server + (local − base) — two
 *   independent gains/losses are both kept, nothing is lost or doubled
 * - other scalars: whoever changed it since base wins (local if both did)
 * - objects: merged key by key; a different string `day` → later day wins whole
 * - arrays: union without duplicates (sorted by `t` when every item has one)
 * - `credits` (event id → xp): see `dedupeCredits` — a credit earned on both
 *   devices for the same event id counts once
 */
const ADDITIVE = new Set(["xp", "games", "wins", "draws", "puzzlesSolved", "puzzlesTried", "rating", "puzzleRating"]);
const MAX = new Set(["bestStreak", "maxBeatenElo", "version"]);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function mergeState(base: unknown, server: unknown, local: unknown, key = ""): unknown {
  if (local === undefined) return server;
  if (server === undefined) return local;
  if (Array.isArray(server) && Array.isArray(local)) {
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const item of [...server, ...local]) {
      const id = JSON.stringify(item);
      if (!seen.has(id)) { seen.add(id); out.push(item); }
    }
    if (out.length && out.every((i) => isObj(i) && typeof i["t"] === "number")) {
      out.sort((a, b) => (a as { t: number }).t - (b as { t: number }).t);
    }
    return out;
  }
  if (isObj(server) && isObj(local)) {
    if (typeof server["day"] === "string" && typeof local["day"] === "string" && server["day"] !== local["day"]) {
      return server["day"] > local["day"] ? server : local;
    }
    const b = isObj(base) ? base : {};
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(server), ...Object.keys(local)])) out[k] = mergeState(b[k], server[k], local[k], k);
    return out;
  }
  if (typeof server === "number" && typeof local === "number") {
    if (MAX.has(key)) return Math.max(server, local);
    if (ADDITIVE.has(key)) return typeof base === "number" ? server + (local - base) : Math.max(server, local);
  }
  if (same(local, base)) return server;
  return local;
}

/**
 * Credits earned for the same event id on both devices since base were summed
 * twice by the additive xp rule — take one copy back out.
 */
export function dedupeCredits<T extends { xp: number; credits?: Record<string, number> }>(base: T | undefined, server: T, local: T, merged: T): T {
  const b = base?.credits ?? {};
  let extra = 0;
  for (const [id, xp] of Object.entries(local.credits ?? {})) {
    if (!(id in b) && server.credits && id in server.credits) extra += Math.min(xp, server.credits[id] ?? 0);
  }
  return extra ? { ...merged, xp: merged.xp - extra } : merged;
}
