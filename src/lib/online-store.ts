// Small client-side store for everything social: friendships, challenges,
// profiles of people we know, who is online, and my games in progress.
import { useSyncExternalStore } from "react";
import { fetchProfiles, listChallenges, listFriendships, myActiveGames, myUserId, type Challenge, type Friendship, type LiveGame, type Profile } from "./online";

export type OnlineState = {
  ready: boolean;
  me: Profile | null;
  friendships: Friendship[];
  challenges: Challenge[];
  profiles: Record<string, Profile>;
  online: Set<string>;
  activeGames: LiveGame[];
  /** Ids of challenges already shown as a popup (so they only pop once). */
  seen: Set<string>;
  error: string | null;
};

let state: OnlineState = { ready: false, me: null, friendships: [], challenges: [], profiles: {}, online: new Set(), activeGames: [], seen: new Set(), error: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export function patchOnline(f: (s: OnlineState) => Partial<OnlineState>) { state = { ...state, ...f(state) }; emit(); }
export function useOnline(): OnlineState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => state);
}
export const getOnline = () => state;
export function resetOnline() { state = { ready: false, me: null, friendships: [], challenges: [], profiles: {}, online: new Set(), activeGames: [], seen: new Set(), error: null }; emit(); }

/** Reload friendships, open challenges, the profiles involved, and my games in progress. */
export async function refreshOnline(): Promise<void> {
  const me = myUserId();
  if (!me) return;
  try {
    const [friendships, challenges, activeGames] = await Promise.all([listFriendships(), listChallenges(), myActiveGames()]);
    const ids = new Set<string>();
    for (const f of friendships) { ids.add(f.requester); ids.add(f.addressee); }
    for (const c of challenges) { ids.add(c.from_user); ids.add(c.to_user); }
    for (const g of activeGames) { ids.add(g.white); ids.add(g.black); }
    ids.delete(me);
    const missing = [...ids].filter((id) => !state.profiles[id]);
    const fetched = missing.length ? await fetchProfiles(missing) : {};
    patchOnline((s) => ({ friendships, challenges, activeGames, profiles: { ...s.profiles, ...fetched }, error: null }));
  } catch {
    patchOnline(() => ({ error: "Fikk ikke hentet venner akkurat nå." }));
  }
}

export function markSeen(id: string) { patchOnline((s) => ({ seen: new Set([...s.seen, id]) })); }

// ---------- derived (pure) ----------
export type FriendView = { friendship: Friendship; userId: string; profile: Profile | undefined; online: boolean; pendingFromThem: boolean; pendingFromMe: boolean };
export function friendViews(s: Pick<OnlineState, "friendships" | "profiles" | "online">, me: string): FriendView[] {
  return s.friendships.map((f) => {
    const other = f.requester === me ? f.addressee : f.requester;
    return { friendship: f, userId: other, profile: s.profiles[other], online: s.online.has(other), pendingFromThem: f.status === "pending" && f.addressee === me, pendingFromMe: f.status === "pending" && f.requester === me };
  });
}
export const incomingChallenges = (s: Pick<OnlineState, "challenges">, me: string) => s.challenges.filter((c) => c.status === "pending" && c.to_user === me);
export const outgoingChallenges = (s: Pick<OnlineState, "challenges">, me: string) => s.challenges.filter((c) => c.status === "pending" && c.from_user === me);
export const displayName = (s: Pick<OnlineState, "profiles">, id: string) => s.profiles[id]?.name ?? "Venn";
