import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mergeState } from "./sync-merge";

/**
 * Personal progress lives on the server (table user_state, one row per store).
 * Each store keeps an in-memory copy, the last confirmed server copy (`base`)
 * and a per-user device cache so unsynced edits survive reload. Nothing is
 * readable or writable before an approved user has been hydrated.
 */
export type StoreDef<T> = {
  key: string; // server store_key
  empty: () => T;
  migrate: (raw: unknown) => T;
  /** Old anonymous localStorage keys (read-only; only used for the import offer). */
  legacyKeys: string[];
  hasData: (t: T) => boolean;
  /** Optional store-specific fix-up after the generic three-way merge. */
  reconcile?: (base: T | undefined, server: T, local: T, merged: T) => T;
};

type Store<T = unknown> = {
  def: StoreDef<T>;
  get: () => T;
  replace: (next: T) => void;
  base: T | undefined;
  rev: number;
  dirty: boolean;
  inflight: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  failures: number;
};

const stores: Store[] = [];
let uid: string | null = null;
let gen = 0;
let hydrated = false;

export type SyncStatus = "saved" | "saving" | "error";
let status: SyncStatus = "saved";
let merged = 0; // count of conflict merges, shown as a notice
const statusListeners = new Set<() => void>();
const emit = () => statusListeners.forEach((l) => l());
function recomputeStatus() {
  const next: SyncStatus = stores.some((s) => s.failures > 0) ? "error" : stores.some((s) => s.dirty || s.inflight) ? "saving" : "saved";
  if (next !== status) { status = next; emit(); }
}
const subStatus = (l: () => void) => { statusListeners.add(l); return () => { statusListeners.delete(l); }; };
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subStatus, () => status, () => "saved");
}
/** Number of times progress from another device was merged in this session. */
export function useMergeNotices(): number {
  return useSyncExternalStore(subStatus, () => merged, () => 0);
}
export function dismissMergeNotice() { merged = 0; emit(); }

const cacheKey = (u: string, key: string) => `goblin-chess.u.${u}.${key}`;
function writeCache(s: Store) {
  if (!uid) return;
  try { localStorage.setItem(cacheKey(uid, s.def.key), JSON.stringify({ rev: s.rev, dirty: s.dirty, data: s.get(), base: s.base })); } catch { /* storage blocked */ }
}
function readCache(u: string, key: string): { rev: number; dirty: boolean; data: unknown; base?: unknown } | null {
  try { const raw = localStorage.getItem(cacheKey(u, key)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function merge<T>(s: Store<T>, base: unknown, server: unknown, local: unknown): T {
  const m = s.def.migrate(mergeState(base, server, local));
  if (!s.def.reconcile) return m;
  return s.def.reconcile(base === undefined ? undefined : s.def.migrate(base), s.def.migrate(server), s.def.migrate(local), m);
}

export function createSyncedStore<T>(def: StoreDef<T>) {
  const SERVER = def.empty();
  let state: T = def.empty();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  const s: Store<T> = { def, get: () => state, replace: (n) => { state = n; notify(); }, base: undefined, rev: 0, dirty: false, inflight: false, timer: null, failures: 0 };
  stores.push(s as Store);
  return {
    get: () => state,
    /** Local edit. Ignored until an approved user is hydrated — defaults never overwrite cloud data. */
    set(f: (t: T) => T) {
      if (!hydrated || !uid) return;
      state = f(state);
      notify();
      s.dirty = true;
      writeCache(s as Store);
      schedule(s as Store, 800);
    },
    use(): T {
      return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => SERVER);
    },
  };
}

function schedule(s: Store, ms: number) {
  if (s.timer) clearTimeout(s.timer);
  const g = gen;
  s.timer = setTimeout(() => { s.timer = null; if (g === gen) void push(s, g); }, ms);
  recomputeStatus();
}

async function fetchRow(key: string) {
  const { data, error } = await supabase.from("user_state").select("data, revision").eq("store_key", key).maybeSingle();
  if (error) throw error;
  return data;
}

async function push(s: Store, g: number) {
  if (s.inflight || !s.dirty) return;
  const owner = uid;
  if (!owner) return;
  s.inflight = true;
  recomputeStatus();
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (g !== gen) return; // logged out / switched user: never send the old snapshot
      const snapshot = s.get();
      const { data: rev, error } = await supabase.rpc("save_user_state_for", { p_user: owner, p_key: s.def.key, p_data: snapshot as never, p_expected: s.rev });
      if (g !== gen) return;
      if (error) throw error;
      if (typeof rev === "number") {
        s.rev = rev;
        s.base = snapshot;
        if (s.get() === snapshot) s.dirty = false; // newer edits keep it dirty
        s.failures = 0;
        writeCache(s);
        if (s.dirty) schedule(s, 300);
        return;
      }
      // Conflict: another device saved first. Three-way merge — never overwrite blindly.
      const row = await fetchRow(s.def.key);
      if (g !== gen) return;
      if (row) {
        const base = s.rev === 0 ? s.def.empty() : s.base;
        s.replace(merge(s, base, row.data, s.get()));
        s.rev = row.revision;
        s.base = row.data;
        merged++; emit();
      } else s.rev = 0;
      writeCache(s);
    }
    throw new Error("conflict retries exhausted");
  } catch {
    if (g !== gen) return;
    s.failures++;
    writeCache(s);
    schedule(s, Math.min(60_000, 3000 * 2 ** (s.failures - 1)));
  } finally {
    if (g === gen) s.inflight = false;
    recomputeStatus();
  }
}

/** Retry all failed/pending saves now (button in the status). */
export function retrySync() {
  stores.forEach((s) => { if (s.dirty && !s.inflight) schedule(s, 0); });
}

/** Load the approved user's stores from the server. Throws on network error (fail closed). */
export async function activateUser(userId: string): Promise<{ cloudEmpty: boolean }> {
  deactivate();
  const g = gen;
  const { data, error } = await supabase.from("user_state").select("store_key, data, revision");
  if (error) throw error;
  if (g !== gen) throw new Error("stale");
  uid = userId;
  const rows = new Map((data ?? []).map((r) => [r.store_key, r]));
  for (const s of stores) {
    const row = rows.get(s.def.key);
    const cache = readCache(userId, s.def.key);
    s.failures = 0;
    if (row) {
      s.rev = row.revision;
      s.base = row.data;
      if (cache?.dirty) {
        // Unsynced edits from last visit: keep them, merged on top of what the server has now.
        s.replace(cache.rev === row.revision ? s.def.migrate(cache.data) : merge(s, cache.base, row.data, cache.data));
        s.dirty = true;
      } else { s.replace(s.def.migrate(row.data)); s.dirty = false; }
    } else {
      s.rev = 0;
      s.base = undefined;
      if (cache?.dirty) { s.replace(s.def.migrate(cache.data)); s.dirty = true; }
      else { s.replace(s.def.empty()); s.dirty = false; }
    }
    writeCache(s);
  }
  hydrated = true;
  stores.forEach((s) => { if (s.dirty) schedule(s, 200); });
  recomputeStatus();
  return { cloudEmpty: rows.size === 0 && stores.every((s) => !s.dirty) };
}

/** Logout / user switch: stop all saving and wipe active state from memory. Per-user caches stay isolated. */
export function deactivate() {
  gen++;
  hydrated = false;
  uid = null;
  merged = 0;
  for (const s of stores) {
    if (s.timer) clearTimeout(s.timer);
    s.timer = null; s.inflight = false; s.dirty = false; s.failures = 0; s.rev = 0; s.base = undefined;
    s.replace(s.def.empty());
  }
  try { sessionStorage.removeItem("goblin-chess.coach-win"); } catch { /* ignore */ }
  recomputeStatus();
  emit();
}

/** Signs out after local saving has been stopped, so no old progress is sent afterwards. */
export async function signOutSafely() {
  deactivate();
  await supabase.auth.signOut();
}

// ---------- One-time import of old anonymous device progress ----------

function readLegacy<T>(def: StoreDef<T>): T | null {
  for (const k of def.legacyKeys) {
    try { const raw = localStorage.getItem(k); if (raw) { const v = def.migrate(JSON.parse(raw)); return def.hasData(v) ? v : null; } } catch { /* corrupt */ }
  }
  return null;
}

export function legacySnapshot(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of stores) { const v = readLegacy(s.def); if (v) out[s.def.key] = v; }
  return out;
}

const decisionKey = (u: string) => `goblin-chess.u.${u}.import-decision`;
export function importDecided(u: string) { try { return !!localStorage.getItem(decisionKey(u)); } catch { return true; } }
export function decideImport(u: string, d: "imported" | "skipped") { try { localStorage.setItem(decisionKey(u), d); } catch { /* ignore */ } }

/** Idempotent: creates server rows only where none exist — existing cloud data always wins. Old keys are never deleted. */
export async function importLegacy(u: string): Promise<void> {
  const snap = legacySnapshot();
  try { localStorage.setItem(`goblin-chess.backup.${u}.${Date.now()}`, JSON.stringify(snap)); } catch { /* backup best effort; originals remain */ }
  for (const [key, data] of Object.entries(snap)) {
    const { error } = await supabase.rpc("save_user_state_for", { p_user: u, p_key: key, p_data: data as never, p_expected: 0 });
    if (error) throw error;
  }
  decideImport(u, "imported");
  await activateUser(u);
}
