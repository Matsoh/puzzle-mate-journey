// Online play for family and club friends: profiles, friend codes, challenges,
// live games and chat on Supabase. Pure helpers live at the bottom (tested);
// everything that talks to the server is thin and typed.
import { Chess } from "chess.js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { isLocalDev } from "./cloud-sync";
import { expectedScore } from "./rules";
import type { Progress } from "./progress";
import { avatarOf, avatarName } from "./avatar";
import { levelFromXp } from "./rules";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Friendship = Database["public"]["Tables"]["friendships"]["Row"];
export type Challenge = Database["public"]["Tables"]["challenges"]["Row"];
export type LiveGame = Database["public"]["Tables"]["live_games"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["game_chat"]["Row"];

export const K_LIVE = 24;
export const TIME_CONTROLS = [
  { id: "3+2", label: "3 + 2", hint: "Lyn", initial: 180_000, inc: 2_000 },
  { id: "5+0", label: "5 + 0", hint: "Lyn", initial: 300_000, inc: 0 },
  { id: "10+0", label: "10 + 0", hint: "Hurtig", initial: 600_000, inc: 0 },
  { id: "15+10", label: "15 + 10", hint: "Hurtig", initial: 900_000, inc: 10_000 },
  { id: "30+0", label: "30 + 0", hint: "Klassisk", initial: 1_800_000, inc: 0 },
] as const;
export type TimeControlId = (typeof TIME_CONTROLS)[number]["id"];

/** True when online features can be used (never in the local dev mode without Supabase). */
export const onlineAvailable = () => !isLocalDev();

let me: string | null = null;
export function setOnlineUser(uid: string | null) { me = uid; }
export const myUserId = () => me;

// ---------- profiles ----------
export async function ensureProfile(name: string): Promise<Profile> {
  const { data, error } = await supabase.rpc("ensure_profile", { p_name: name });
  if (error) throw error;
  return data;
}

let lastProfilePush = "";
/** Mirror the public bits of progress to the profile, only when something changed. */
export async function syncProfile(p: Progress): Promise<void> {
  if (!me || !onlineAvailable()) return;
  const row = { name: avatarName(p), avatar: { ...avatarOf(p), skin3d: p.skin ?? null } as unknown as Json, rating: p.rating, level: levelFromXp(p.xp).level, streak: p.streak, games: p.games };
  const sig = JSON.stringify(row);
  if (sig === lastProfilePush) return;
  lastProfilePush = sig;
  const { error } = await supabase.from("profiles").update({ ...row, last_seen: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", me);
  if (error) lastProfilePush = "";
}

export async function fetchProfiles(ids: string[]): Promise<Record<string, Profile>> {
  if (!ids.length) return {};
  const { data, error } = await supabase.from("profiles").select("*").in("user_id", ids);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((p) => [p.user_id, p]));
}

// ---------- friends ----------
export async function listFriendships(): Promise<Friendship[]> {
  const { data, error } = await supabase.from("friendships").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function sendFriendRequest(code: string): Promise<Friendship> {
  const { data, error } = await supabase.rpc("send_friend_request", { p_code: code });
  if (error) throw new Error(friendlyError(error.message));
  return data;
}
export async function respondFriendRequest(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc("respond_friend_request", { p_id: id, p_accept: accept });
  if (error) throw error;
}
export async function removeFriend(id: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", id);
  if (error) throw error;
}

// ---------- challenges ----------
export async function listChallenges(): Promise<Challenge[]> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data, error } = await supabase.from("challenges").select("*").gte("created_at", since).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function createChallenge(to: string, tc: TimeControlId, color: "w" | "b" | "random"): Promise<Challenge> {
  const t = TIME_CONTROLS.find((x) => x.id === tc) ?? TIME_CONTROLS[2];
  const { data, error } = await supabase.rpc("create_challenge", { p_to: to, p_initial_ms: t.initial, p_inc_ms: t.inc, p_color: color });
  if (error) throw new Error(friendlyError(error.message));
  return data;
}
export async function answerChallenge(id: string, action: "accept" | "decline" | "cancel"): Promise<string | null> {
  const { data, error } = await supabase.rpc("answer_challenge", { p_id: id, p_action: action });
  if (error) throw new Error(friendlyError(error.message));
  return data ?? null;
}

// ---------- live games ----------
export async function fetchGame(id: string): Promise<LiveGame | null> {
  const { data, error } = await supabase.from("live_games").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
export async function myActiveGames(): Promise<LiveGame[]> {
  if (!me) return [];
  const { data, error } = await supabase.from("live_games").select("*").eq("status", "playing").or(`white.eq.${me},black.eq.${me}`).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function recentGamesFor(uid: string, limit = 20): Promise<LiveGame[]> {
  const { data, error } = await supabase.from("live_games").select("*").eq("status", "finished").or(`white.eq.${uid},black.eq.${uid}`).order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
export async function playMove(gameId: string, plies: number, uci: string, san: string, fen: string, end: { result: "w" | "b" | "d"; reason: string } | null): Promise<LiveGame> {
  const args = { p_game: gameId, p_uci: uci, p_san: san, p_fen: fen, p_plies: plies, ...(end ? { p_result: end.result, p_reason: end.reason } : {}) };
  const { data, error } = await supabase.rpc("play_move", args);
  if (error) throw error;
  return data;
}
export async function gameAction(gameId: string, action: "resign" | "offer_draw" | "accept_draw" | "claim_timeout" | "abort"): Promise<LiveGame> {
  const { data, error } = await supabase.rpc("game_action", { p_game: gameId, p_action: action });
  if (error) throw error;
  return data;
}

// ---------- chat ----------
export async function fetchChat(gameId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.from("game_chat").select("*").eq("game_id", gameId).order("id", { ascending: true }).limit(200);
  if (error) throw error;
  return data ?? [];
}
export async function sendChat(gameId: string, text: string): Promise<void> {
  if (!me) return;
  const t = text.trim().slice(0, 300);
  if (!t) return;
  const { error } = await supabase.from("game_chat").insert({ game_id: gameId, user_id: me, text: t });
  if (error) throw error;
}

// ---------- realtime ----------
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export function subscribeGame(gameId: string, onGame: (g: LiveGame) => void, onChat: (m: ChatMessage) => void): RealtimeChannel {
  return supabase
    .channel(`game:${gameId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_games", filter: `id=eq.${gameId}` }, (p) => onGame(p.new as Row<"live_games">))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_chat", filter: `game_id=eq.${gameId}` }, (p) => onChat(p.new as Row<"game_chat">))
    .subscribe();
}
/** Everything that can ping the user: incoming challenges, answered challenges, friend requests. */
export function subscribeInbox(onChange: () => void): RealtimeChannel {
  return supabase
    .channel("inbox")
    .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, onChange)
    .subscribe();
}
/** Presence: who is online right now (user ids). */
export function subscribePresence(onOnline: (ids: Set<string>) => void): RealtimeChannel {
  const ch = supabase.channel("online", { config: { presence: { key: me ?? "anon" } } });
  ch.on("presence", { event: "sync" }, () => onOnline(new Set(Object.keys(ch.presenceState()))))
    .subscribe(async (status) => { if (status === "SUBSCRIBED" && me) await ch.track({ at: Date.now() }); });
  return ch;
}
export function unsubscribe(ch: RealtimeChannel | null | undefined) { if (ch) void supabase.removeChannel(ch); }

// ---------- pure helpers ----------
export function friendlyError(msg: string): string {
  if (/unknown code/.test(msg)) return "Fant ingen spiller med den koden. Sjekk at den er skrevet riktig.";
  if (/own code/.test(msg)) return "Det er din egen kode.";
  if (/not friends/.test(msg)) return "Dere må være venner først.";
  if (/not approved/.test(msg)) return "Kontoen er ikke godkjent ennå.";
  if (/not pending/.test(msg)) return "Utfordringen er ikke åpen lenger.";
  return "Noe gikk galt. Prøv igjen.";
}

export function tcLabel(initialMs: number, incMs: number): string {
  return `${Math.round(initialMs / 60_000)} + ${Math.round(incMs / 1000)}`;
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 20) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.${Math.floor((Math.max(0, ms) % 1000) / 100)}`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Live clocks from the server row: the side to move is ticking since last_move_at (after both have moved once). */
export function liveClocks(g: Pick<LiveGame, "moves" | "white_ms" | "black_ms" | "last_move_at" | "status">, now: number, skewMs = 0): { w: number; b: number } {
  const plies = g.moves.length;
  if (g.status !== "playing" || plies < 2) return { w: g.white_ms, b: g.black_ms };
  const elapsed = Math.max(0, now - skewMs - new Date(g.last_move_at).getTime());
  return plies % 2 === 0 ? { w: g.white_ms - elapsed, b: g.black_ms } : { w: g.white_ms, b: g.black_ms - elapsed };
}

export function sideToMove(g: Pick<LiveGame, "moves">): "w" | "b" { return g.moves.length % 2 === 0 ? "w" : "b"; }
export function myColor(g: Pick<LiveGame, "white" | "black">, uid: string | null): "w" | "b" | null {
  return uid === g.white ? "w" : uid === g.black ? "b" : null;
}

/** Apply a UCI move with chess.js; returns the SAN, new FEN and (if it ends the game) the result. */
export function applyUci(fen: string, uci: string): { san: string; fen: string; end: { result: "w" | "b" | "d"; reason: string } | null } | null {
  const c = new Chess(fen);
  let m;
  try { m = c.move(uci.length > 4 ? { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4]! } : { from: uci.slice(0, 2), to: uci.slice(2, 4) }); } catch { return null; }
  if (!m) return null;
  let end: { result: "w" | "b" | "d"; reason: string } | null = null;
  if (c.isCheckmate()) end = { result: m.color, reason: "Sjakk matt." };
  else if (c.isStalemate()) end = { result: "d", reason: "Patt." };
  else if (c.isInsufficientMaterial()) end = { result: "d", reason: "For lite materiell." };
  else if (c.isThreefoldRepetition()) end = { result: "d", reason: "Trekkgjentakelse." };
  else if (c.isDraw()) end = { result: "d", reason: "Remis (50-trekksregelen)." };
  return { san: m.san, fen: c.fen(), end };
}

/** Rating change for a human game, both players K=24. */
export function liveRatingChange(mine: number, theirs: number, score: 0 | 0.5 | 1): number {
  return Math.round(K_LIVE * (score - expectedScore(mine, theirs)));
}

export function outcomeFor(g: Pick<LiveGame, "result">, color: "w" | "b"): "win" | "loss" | "draw" | null {
  if (!g.result) return null;
  if (g.result === "d") return "draw";
  return g.result === color ? "win" : "loss";
}
