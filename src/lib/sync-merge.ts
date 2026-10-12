/**
 * Pure conflict merge for two devices that changed the same saved store.
 * Rules (never lose history, never double XP):
 * - objects: union of keys, merged recursively
 * - objects with a different string `day`: the later day wins whole (daily sets)
 * - arrays: union without duplicates; sorted by `t` when every item has a numeric t
 * - monotonic counters (xp, games, …): the larger value, never the sum
 * - other scalars: the local (newest edit) value
 */
const MONOTONIC = new Set(["xp", "games", "wins", "draws", "puzzlesSolved", "puzzlesTried", "bestStreak", "maxBeatenElo", "version"]);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function mergeState(server: unknown, local: unknown, key = ""): unknown {
  if (local === undefined) return server;
  if (server === undefined) return local;
  if (Array.isArray(server) && Array.isArray(local)) {
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const item of [...server, ...local]) {
      const id = JSON.stringify(item);
      if (!seen.has(id)) { seen.add(id); out.push(item); }
    }
    if (out.length && out.every((i) => isObj(i) && typeof i.t === "number")) {
      out.sort((a, b) => ((a as { t: number }).t - (b as { t: number }).t));
    }
    return out;
  }
  if (isObj(server) && isObj(local)) {
    if (typeof server.day === "string" && typeof local.day === "string" && server.day !== local.day) {
      return server.day > local.day ? server : local;
    }
    const out: Record<string, unknown> = {};
    for (const k of new Set([...Object.keys(server), ...Object.keys(local)])) out[k] = mergeState(server[k], local[k], k);
    return out;
  }
  if (typeof server === "number" && typeof local === "number" && MONOTONIC.has(key)) return Math.max(server, local);
  return local;
}
