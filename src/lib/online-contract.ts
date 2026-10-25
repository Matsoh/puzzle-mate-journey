// Expected online-play API contract, not a claim that its migration is applied.
// Keep generated database types faithful to the actual deployed database.
import type { Database, Json } from "@/integrations/supabase/types";

export type Profile = { user_id: string; name: string; friend_code: string; avatar: Json | null; rating: number; level: number; streak: number; games: number; last_seen: string; updated_at: string };
export type Friendship = { id: string; requester: string; addressee: string; status: string; created_at: string };
export type Challenge = { id: string; from_user: string; to_user: string; initial_ms: number; inc_ms: number; color: string; status: string; game_id: string | null; created_at: string };
export type LiveGame = { id: string; white: string; black: string; initial_ms: number; inc_ms: number; moves: string[]; sans: string[]; fen: string; status: string; result: string | null; reason: string | null; white_ms: number; black_ms: number; last_move_at: string; draw_offer: string | null; created_at: string; finished_at: string | null };
export type ChatMessage = { id: number; game_id: string; user_id: string; text: string; created_at: string };

type Table<Row, Required extends keyof Row> = { Row: Row; Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>; Update: Partial<Row>; Relationships: [] };
type Rpc<Args, Returns> = { Args: Args; Returns: Returns };

export type OnlineDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      profiles: Table<Profile, "user_id" | "friend_code">;
      friendships: Table<Friendship, "requester" | "addressee">;
      challenges: Table<Challenge, "from_user" | "to_user">;
      live_games: Table<LiveGame, "white" | "black" | "initial_ms" | "white_ms" | "black_ms">;
      game_chat: Table<ChatMessage, "game_id" | "user_id" | "text">;
    };
    Functions: Database["public"]["Functions"] & {
      ensure_profile: Rpc<{ p_name?: string | null }, Profile>;
      are_friends: Rpc<{ a: string; b: string }, boolean>;
      send_friend_request: Rpc<{ p_code: string }, Friendship>;
      respond_friend_request: Rpc<{ p_id: string; p_accept: boolean }, undefined>;
      create_challenge: Rpc<{ p_to: string; p_initial_ms: number; p_inc_ms: number; p_color: string }, Challenge>;
      answer_challenge: Rpc<{ p_id: string; p_action: string }, string | null>;
      play_move: Rpc<{ p_game: string; p_uci: string; p_san: string; p_fen: string; p_plies: number; p_result?: string | null; p_reason?: string | null }, LiveGame>;
      game_action: Rpc<{ p_game: string; p_action: string }, LiveGame>;
    };
  };
};