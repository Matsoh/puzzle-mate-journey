import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory fake of the server table, scoped to one user (as RLS would do).
const db = vi.hoisted(() => ({ rows: new Map<string, { data: unknown; revision: number }>(), rpcCalls: [] as { p_user: string; p_key: string; p_expected: number }[], failRpc: false }));

vi.mock("@/integrations/supabase/client", () => {
  const rpc = vi.fn(async (_fn: string, a: { p_user: string; p_key: string; p_data: unknown; p_expected: number }) => {
    db.rpcCalls.push({ p_user: a.p_user, p_key: a.p_key, p_expected: a.p_expected });
    if (db.failRpc) return { data: null, error: new Error("network") };
    const row = db.rows.get(a.p_key);
    if (a.p_expected === 0) {
      if (row) return { data: null, error: null };
      db.rows.set(a.p_key, { data: a.p_data, revision: 1 });
      return { data: 1, error: null };
    }
    if (!row || row.revision !== a.p_expected) return { data: null, error: null };
    db.rows.set(a.p_key, { data: a.p_data, revision: row.revision + 1 });
    return { data: row.revision + 1, error: null };
  });
  const from = () => ({
    select: () => {
      const all = Promise.resolve({ data: [...db.rows].map(([store_key, r]) => ({ store_key, ...r })), error: null });
      return Object.assign(all, {
        eq: (_c: string, key: string) => ({ maybeSingle: async () => ({ data: db.rows.get(key) ?? null, error: null }) }),
      });
    },
  });
  return { supabase: { rpc, from, auth: { signOut: vi.fn(async () => ({ error: null })) } } };
});

import { activateUser, deactivate, importLegacy, legacySnapshot } from "./cloud-sync";
import { DEFAULT_PROGRESS, getProgress, updateProgress } from "./progress";

const flush = async (ms = 1000) => { await vi.advanceTimersByTimeAsync(ms); };

beforeEach(() => {
  vi.useFakeTimers();
  deactivate();
  db.rows.clear(); db.rpcCalls.length = 0; db.failRpc = false;
  localStorage.clear();
});

describe("cloud sync", () => {
  it("ignores edits before hydration, so defaults never overwrite cloud data", async () => {
    updateProgress((p) => ({ ...p, xp: 999 }));
    expect(getProgress().xp).toBe(0);
    db.rows.set("progress", { data: { ...DEFAULT_PROGRESS, xp: 300 }, revision: 4 });
    await activateUser("user-a");
    expect(getProgress().xp).toBe(300);
    expect(db.rpcCalls).toHaveLength(0);
  });

  it("merges a concurrent save from another device instead of overwriting it", async () => {
    db.rows.set("progress", { data: { ...DEFAULT_PROGRESS, xp: 100, games: 4 }, revision: 1 });
    await activateUser("user-a");
    // Another device saves first.
    db.rows.set("progress", { data: { ...DEFAULT_PROGRESS, xp: 115, games: 5 }, revision: 2 });
    updateProgress((p) => ({ ...p, xp: p.xp + 10, games: p.games + 1 }));
    await flush();
    expect(db.rows.get("progress")).toMatchObject({ revision: 3, data: { xp: 125, games: 6 } });
  });

  it("never sends old progress after logout", async () => {
    await activateUser("user-a");
    updateProgress((p) => ({ ...p, xp: 50 }));
    deactivate(); // logout before the debounce fires
    await flush(5000);
    expect(db.rpcCalls).toHaveLength(0);
    expect(getProgress().xp).toBe(0);
  });

  it("keeps unsynced edits on the device after a network error and shows them only to the same user", async () => {
    await activateUser("user-a");
    db.failRpc = true;
    updateProgress((p) => ({ ...p, xp: 40 }));
    await flush();
    deactivate();
    db.failRpc = false;
    await activateUser("user-b");
    expect(getProgress().xp).toBe(0);
    await activateUser("user-a");
    expect(getProgress().xp).toBe(40);
    await flush();
    expect(db.rpcCalls.every((c) => c.p_user === "user-a")).toBe(true);
  });

  it("import is idempotent and never overwrites existing cloud progress", async () => {
    localStorage.setItem("sjakkstorm.progress.v1", JSON.stringify({ ...DEFAULT_PROGRESS, xp: 70, games: 3 }));
    expect(Object.keys(legacySnapshot())).toEqual(["progress"]);
    await importLegacy("user-a");
    await importLegacy("user-a");
    expect(db.rows.get("progress")).toMatchObject({ revision: 1, data: { xp: 70 } });
    expect(getProgress().xp).toBe(70);
    // Old device data is kept as-is.
    expect(localStorage.getItem("sjakkstorm.progress.v1")).toContain('"xp":70');

    db.rows.set("progress", { data: { ...DEFAULT_PROGRESS, xp: 500 }, revision: 9 });
    await importLegacy("user-a");
    expect(db.rows.get("progress")).toMatchObject({ revision: 9, data: { xp: 500 } });
  });
});
