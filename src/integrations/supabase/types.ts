export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      daily_checkins: {
        Row: {
          checkin_date: string;
          created_at: string;
          points_awarded: number;
          streak: number;
          wallet_address: string;
        };
        Insert: {
          checkin_date: string;
          created_at?: string;
          points_awarded?: number;
          streak?: number;
          wallet_address: string;
        };
        Update: {
          checkin_date?: string;
          created_at?: string;
          points_awarded?: number;
          streak?: number;
          wallet_address?: string;
        };
        Relationships: [];
      };
      page_events: {
        Row: {
          created_at: string;
          id: string;
          path: string;
          ref_code: string | null;
          referrer: string | null;
          session_id: string;
          visitor_hash: string | null;
          wallet_address: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          path: string;
          ref_code?: string | null;
          referrer?: string | null;
          session_id: string;
          visitor_hash?: string | null;
          wallet_address?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          path?: string;
          ref_code?: string | null;
          referrer?: string | null;
          session_id?: string;
          visitor_hash?: string | null;
          wallet_address?: string | null;
        };
        Relationships: [];
      };
      point_balances: {
        Row: {
          lifetime: number;
          total: number;
          updated_at: string;
          wallet_address: string;
        };
        Insert: {
          lifetime?: number;
          total?: number;
          updated_at?: string;
          wallet_address: string;
        };
        Update: {
          lifetime?: number;
          total?: number;
          updated_at?: string;
          wallet_address?: string;
        };
        Relationships: [];
      };
      point_events: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          metadata: Json;
          points: number;
          ref_key: string | null;
          wallet_address: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          metadata?: Json;
          points: number;
          ref_key?: string | null;
          wallet_address: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          metadata?: Json;
          points?: number;
          ref_key?: string | null;
          wallet_address?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          display_name: string | null;
          farcaster: string | null;
          twitter: string | null;
          updated_at: string;
          wallet_address: string;
          website: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          farcaster?: string | null;
          twitter?: string | null;
          updated_at?: string;
          wallet_address: string;
          website?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          display_name?: string | null;
          farcaster?: string | null;
          twitter?: string | null;
          updated_at?: string;
          wallet_address?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      quest_progress: {
        Row: {
          completed_at: string | null;
          progress: number;
          quest_id: string;
          updated_at: string;
          wallet_address: string;
        };
        Insert: {
          completed_at?: string | null;
          progress?: number;
          quest_id: string;
          updated_at?: string;
          wallet_address: string;
        };
        Update: {
          completed_at?: string | null;
          progress?: number;
          quest_id?: string;
          updated_at?: string;
          wallet_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quest_progress_quest_id_fkey";
            columns: ["quest_id"];
            isOneToOne: false;
            referencedRelation: "quests";
            referencedColumns: ["id"];
          },
        ];
      };
      quests: {
        Row: {
          active: boolean;
          created_at: string;
          description: string;
          ends_at: string | null;
          goal_count: number;
          goal_kind: string;
          id: string;
          points_reward: number;
          slug: string;
          starts_at: string | null;
          title: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description: string;
          ends_at?: string | null;
          goal_count?: number;
          goal_kind: string;
          id?: string;
          points_reward: number;
          slug: string;
          starts_at?: string | null;
          title: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string;
          ends_at?: string | null;
          goal_count?: number;
          goal_kind?: string;
          id?: string;
          points_reward?: number;
          slug?: string;
          starts_at?: string | null;
          title?: string;
        };
        Relationships: [];
      };
      referral_codes: {
        Row: {
          code: string;
          created_at: string;
          owner_wallet: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          owner_wallet: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          owner_wallet?: string;
        };
        Relationships: [];
      };
      referral_events: {
        Row: {
          code: string;
          coin_address: string | null;
          created_at: string;
          event_type: string;
          id: string;
          value_wei: number | null;
          visitor_hash: string | null;
          visitor_wallet: string | null;
        };
        Insert: {
          code: string;
          coin_address?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          value_wei?: number | null;
          visitor_hash?: string | null;
          visitor_wallet?: string | null;
        };
        Update: {
          code?: string;
          coin_address?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          value_wei?: number | null;
          visitor_hash?: string | null;
          visitor_wallet?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "referral_events_code_fkey";
            columns: ["code"];
            isOneToOne: false;
            referencedRelation: "referral_codes";
            referencedColumns: ["code"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
