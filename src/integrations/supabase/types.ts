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
      challenges: {
        Row: {
          color: string
          created_at: string
          from_user: string
          game_id: string | null
          id: string
          inc_ms: number
          initial_ms: number
          status: string
          to_user: string
        }
        Insert: {
          color?: string
          created_at?: string
          from_user: string
          game_id?: string | null
          id?: string
          inc_ms?: number
          initial_ms?: number
          status?: string
          to_user: string
        }
        Update: {
          color?: string
          created_at?: string
          from_user?: string
          game_id?: string | null
          id?: string
          inc_ms?: number
          initial_ms?: number
          status?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "challenges_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee: string
          created_at: string
          id: string
          requester: string
          status: string
        }
        Insert: {
          addressee: string
          created_at?: string
          id?: string
          requester: string
          status?: string
        }
        Update: {
          addressee?: string
          created_at?: string
          id?: string
          requester?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_fkey"
            columns: ["addressee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "friendships_requester_fkey"
            columns: ["requester"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      game_chat: {
        Row: {
          created_at: string
          game_id: string
          id: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: never
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: never
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_chat_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "live_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_chat_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      live_games: {
        Row: {
          black: string
          black_ms: number
          created_at: string
          draw_offer: string | null
          fen: string
          finished_at: string | null
          id: string
          inc_ms: number
          initial_ms: number
          last_move_at: string
          moves: string[]
          reason: string | null
          result: string | null
          sans: string[]
          status: string
          white: string
          white_ms: number
        }
        Insert: {
          black: string
          black_ms: number
          created_at?: string
          draw_offer?: string | null
          fen?: string
          finished_at?: string | null
          id?: string
          inc_ms?: number
          initial_ms: number
          last_move_at?: string
          moves?: string[]
          reason?: string | null
          result?: string | null
          sans?: string[]
          status?: string
          white: string
          white_ms: number
        }
        Update: {
          black?: string
          black_ms?: number
          created_at?: string
          draw_offer?: string | null
          fen?: string
          finished_at?: string | null
          id?: string
          inc_ms?: number
          initial_ms?: number
          last_move_at?: string
          moves?: string[]
          reason?: string | null
          result?: string | null
          sans?: string[]
          status?: string
          white?: string
          white_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_games_black_fkey"
            columns: ["black"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "live_games_white_fkey"
            columns: ["white"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: Json | null
          beaten: number
          created_at: string
          draws: number
          flair: string | null
          friend_code: string
          games: number
          last_seen: string
          level: number
          name: string
          rating: number
          streak: number
          updated_at: string
          user_id: string
          username: string | null
          wins: number
          xp: number
        }
        Insert: {
          avatar?: Json | null
          beaten?: number
          created_at?: string
          draws?: number
          flair?: string | null
          friend_code: string
          games?: number
          last_seen?: string
          level?: number
          name?: string
          rating?: number
          streak?: number
          updated_at?: string
          user_id: string
          username?: string | null
          wins?: number
          xp?: number
        }
        Update: {
          avatar?: Json | null
          beaten?: number
          created_at?: string
          draws?: number
          flair?: string | null
          friend_code?: string
          games?: number
          last_seen?: string
          level?: number
          name?: string
          rating?: number
          streak?: number
          updated_at?: string
          user_id?: string
          username?: string | null
          wins?: number
          xp?: number
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
      answer_challenge: {
        Args: { p_action: string; p_id: string }
        Returns: string
      }
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      create_challenge: {
        Args: {
          p_color: string
          p_inc_ms: number
          p_initial_ms: number
          p_to: string
        }
        Returns: {
          color: string
          created_at: string
          from_user: string
          game_id: string | null
          id: string
          inc_ms: number
          initial_ms: number
          status: string
          to_user: string
        }
        SetofOptions: {
          from: "*"
          to: "challenges"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_profile: {
        Args: { p_name?: string }
        Returns: {
          avatar: Json | null
          beaten: number
          created_at: string
          draws: number
          flair: string | null
          friend_code: string
          games: number
          last_seen: string
          level: number
          name: string
          rating: number
          streak: number
          updated_at: string
          user_id: string
          username: string | null
          wins: number
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      game_action: {
        Args: { p_action: string; p_game: string }
        Returns: {
          black: string
          black_ms: number
          created_at: string
          draw_offer: string | null
          fen: string
          finished_at: string | null
          id: string
          inc_ms: number
          initial_ms: number
          last_move_at: string
          moves: string[]
          reason: string | null
          result: string | null
          sans: string[]
          status: string
          white: string
          white_ms: number
        }
        SetofOptions: {
          from: "*"
          to: "live_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gen_friend_code: { Args: never; Returns: string }
      is_approved_player: { Args: never; Returns: boolean }
      play_move: {
        Args: {
          p_fen: string
          p_game: string
          p_plies: number
          p_reason?: string
          p_result?: string
          p_san: string
          p_uci: string
        }
        Returns: {
          black: string
          black_ms: number
          created_at: string
          draw_offer: string | null
          fen: string
          finished_at: string | null
          id: string
          inc_ms: number
          initial_ms: number
          last_move_at: string
          moves: string[]
          reason: string | null
          result: string | null
          sans: string[]
          status: string
          white: string
          white_ms: number
        }
        SetofOptions: {
          from: "*"
          to: "live_games"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      respond_friend_request: {
        Args: { p_accept: boolean; p_id: string }
        Returns: undefined
      }
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
      send_friend_request: {
        Args: { p_code: string }
        Returns: {
          addressee: string
          created_at: string
          id: string
          requester: string
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "friendships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_username: {
        Args: { p_name: string }
        Returns: {
          avatar: Json | null
          beaten: number
          created_at: string
          draws: number
          flair: string | null
          friend_code: string
          games: number
          last_seen: string
          level: number
          name: string
          rating: number
          streak: number
          updated_at: string
          user_id: string
          username: string | null
          wins: number
          xp: number
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
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
