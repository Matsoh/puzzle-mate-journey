export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      profiles: {
        Row: { user_id: string; name: string; friend_code: string; avatar: Json | null; rating: number; level: number; streak: number; games: number; last_seen: string; updated_at: string }
        Insert: { user_id: string; name?: string; friend_code: string; avatar?: Json | null; rating?: number; level?: number; streak?: number; games?: number; last_seen?: string; updated_at?: string }
        Update: { user_id?: string; name?: string; friend_code?: string; avatar?: Json | null; rating?: number; level?: number; streak?: number; games?: number; last_seen?: string; updated_at?: string }
        Relationships: []
      }
      friendships: {
        Row: { id: string; requester: string; addressee: string; status: string; created_at: string }
        Insert: { id?: string; requester: string; addressee: string; status?: string; created_at?: string }
        Update: { id?: string; requester?: string; addressee?: string; status?: string; created_at?: string }
        Relationships: []
      }
      challenges: {
        Row: { id: string; from_user: string; to_user: string; initial_ms: number; inc_ms: number; color: string; status: string; game_id: string | null; created_at: string }
        Insert: { id?: string; from_user: string; to_user: string; initial_ms?: number; inc_ms?: number; color?: string; status?: string; game_id?: string | null; created_at?: string }
        Update: { id?: string; from_user?: string; to_user?: string; initial_ms?: number; inc_ms?: number; color?: string; status?: string; game_id?: string | null; created_at?: string }
        Relationships: []
      }
      live_games: {
        Row: { id: string; white: string; black: string; initial_ms: number; inc_ms: number; moves: string[]; sans: string[]; fen: string; status: string; result: string | null; reason: string | null; white_ms: number; black_ms: number; last_move_at: string; draw_offer: string | null; created_at: string; finished_at: string | null }
        Insert: { id?: string; white: string; black: string; initial_ms: number; inc_ms?: number; moves?: string[]; sans?: string[]; fen?: string; status?: string; result?: string | null; reason?: string | null; white_ms: number; black_ms: number; last_move_at?: string; draw_offer?: string | null; created_at?: string; finished_at?: string | null }
        Update: { id?: string; white?: string; black?: string; initial_ms?: number; inc_ms?: number; moves?: string[]; sans?: string[]; fen?: string; status?: string; result?: string | null; reason?: string | null; white_ms?: number; black_ms?: number; last_move_at?: string; draw_offer?: string | null; created_at?: string; finished_at?: string | null }
        Relationships: []
      }
      game_chat: {
        Row: { id: number; game_id: string; user_id: string; text: string; created_at: string }
        Insert: { id?: never; game_id: string; user_id: string; text: string; created_at?: string }
        Update: { id?: never; game_id?: string; user_id?: string; text?: string; created_at?: string }
        Relationships: []
      }
      approved_players: {
        Row: {
          approved_at: string
          note: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string
          note?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_state: {
        Row: {
          data: Json
          revision: number
          store_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data: Json
          revision?: number
          store_key: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          data?: Json
          revision?: number
          store_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_approved_player: { Args: never; Returns: boolean }
      ensure_profile: { Args: { p_name?: string | null }; Returns: Database["public"]["Tables"]["profiles"]["Row"] }
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      send_friend_request: { Args: { p_code: string }; Returns: Database["public"]["Tables"]["friendships"]["Row"] }
      respond_friend_request: { Args: { p_id: string; p_accept: boolean }; Returns: undefined }
      create_challenge: { Args: { p_to: string; p_initial_ms: number; p_inc_ms: number; p_color: string }; Returns: Database["public"]["Tables"]["challenges"]["Row"] }
      answer_challenge: { Args: { p_id: string; p_action: string }; Returns: string | null }
      play_move: { Args: { p_game: string; p_uci: string; p_san: string; p_fen: string; p_plies: number; p_result?: string | null; p_reason?: string | null }; Returns: Database["public"]["Tables"]["live_games"]["Row"] }
      game_action: { Args: { p_game: string; p_action: string }; Returns: Database["public"]["Tables"]["live_games"]["Row"] }
      save_user_state: {
        Args: { p_data: Json; p_expected: number; p_key: string }
        Returns: number
      }
      save_user_state_for: {
        Args: {
          p_data: Json
          p_expected: number
          p_key: string
          p_user: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
