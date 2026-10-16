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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cdp_wallets: {
        Row: {
          cdp_account_name: string
          cdp_address: string
          created_at: string
          owner_wallet: string
        }
        Insert: {
          cdp_account_name: string
          cdp_address: string
          created_at?: string
          owner_wallet: string
        }
        Update: {
          cdp_account_name?: string
          cdp_address?: string
          created_at?: string
          owner_wallet?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          created_at: string
          points_awarded: number
          streak: number
          wallet_address: string
        }
        Insert: {
          checkin_date: string
          created_at?: string
          points_awarded?: number
          streak?: number
          wallet_address: string
        }
        Update: {
          checkin_date?: string
          created_at?: string
          points_awarded?: number
          streak?: number
          wallet_address?: string
        }
        Relationships: []
      }
      entitlement_grants: {
        Row: {
          created_at: string
          id: string
          kind: string
          source: string
          source_ref: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          source: string
          source_ref: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          source?: string
          source_ref?: string
          user_id?: string
        }
        Relationships: []
      }
      moonshot_days: {
        Row: {
          balance: number
          completed: number
          day: string
          finished_at: string | null
          pilot_id: string
          used: number
        }
        Insert: {
          balance?: number
          completed?: number
          day: string
          finished_at?: string | null
          pilot_id: string
          used?: number
        }
        Update: {
          balance?: number
          completed?: number
          day?: string
          finished_at?: string | null
          pilot_id?: string
          used?: number
        }
        Relationships: [
          {
            foreignKeyName: "moonshot_days_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "moonshot_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      moonshot_entitlements: {
        Row: {
          order_id: string
          pack: string
          pilot_id: string
        }
        Insert: {
          order_id: string
          pack: string
          pilot_id: string
        }
        Update: {
          order_id?: string
          pack?: string
          pilot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moonshot_entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "moonshot_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moonshot_entitlements_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "moonshot_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      moonshot_friends: {
        Row: {
          friend_id: string
          pilot_id: string
        }
        Insert: {
          friend_id: string
          pilot_id: string
        }
        Update: {
          friend_id?: string
          pilot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moonshot_friends_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "moonshot_pilots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moonshot_friends_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "moonshot_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      moonshot_limits: {
        Row: {
          count: number
          expires_ms: number
          key: string
        }
        Insert: {
          count: number
          expires_ms: number
          key: string
        }
        Update: {
          count?: number
          expires_ms?: number
          key?: string
        }
        Relationships: []
      }
      moonshot_nonces: {
        Row: {
          address: string
          browser_hash: string
          expires_at: string
          id: string
          message: string
        }
        Insert: {
          address: string
          browser_hash: string
          expires_at: string
          id: string
          message: string
        }
        Update: {
          address?: string
          browser_hash?: string
          expires_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      moonshot_orders: {
        Row: {
          created_ms: number
          expires_ms: number
          id: string
          payer: string
          pilot_id: string
          start_block: number
          status: string
          tx_hash: string | null
        }
        Insert: {
          created_ms: number
          expires_ms: number
          id: string
          payer: string
          pilot_id: string
          start_block: number
          status?: string
          tx_hash?: string | null
        }
        Update: {
          created_ms?: number
          expires_ms?: number
          id?: string
          payer?: string
          pilot_id?: string
          start_block?: number
          status?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moonshot_orders_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "moonshot_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      moonshot_pilots: {
        Row: {
          avatar: string | null
          created_at: string
          equipped: string
          fid: number | null
          id: string
          name: string
          wallet: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          equipped?: string
          fid?: number | null
          id: string
          name: string
          wallet?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          equipped?: string
          fid?: number | null
          id?: string
          name?: string
          wallet?: string | null
        }
        Relationships: []
      }
      moonshot_rounds: {
        Row: {
          auto: number | null
          commitment: string
          crash: number
          day: string
          id: string
          multiplier: number | null
          number: number
          payout: number
          pilot_id: string
          request_key: string
          secret: string
          settled_at: string | null
          start_ms: number
          status: string
        }
        Insert: {
          auto?: number | null
          commitment: string
          crash: number
          day: string
          id: string
          multiplier?: number | null
          number: number
          payout?: number
          pilot_id: string
          request_key: string
          secret: string
          settled_at?: string | null
          start_ms: number
          status?: string
        }
        Update: {
          auto?: number | null
          commitment?: string
          crash?: number
          day?: string
          id?: string
          multiplier?: number | null
          number?: number
          payout?: number
          pilot_id?: string
          request_key?: string
          secret?: string
          settled_at?: string | null
          start_ms?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "moonshot_rounds_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "moonshot_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      moonshot_sessions: {
        Row: {
          expires_at: string
          pilot_id: string
          token_hash: string
        }
        Insert: {
          expires_at: string
          pilot_id: string
          token_hash: string
        }
        Update: {
          expires_at?: string
          pilot_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "moonshot_sessions_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "moonshot_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      page_events: {
        Row: {
          created_at: string
          id: string
          path: string
          ref_code: string | null
          referrer: string | null
          session_id: string
          visitor_hash: string | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          ref_code?: string | null
          referrer?: string | null
          session_id: string
          visitor_hash?: string | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          ref_code?: string | null
          referrer?: string | null
          session_id?: string
          visitor_hash?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      point_balances: {
        Row: {
          lifetime: number
          total: number
          updated_at: string
          wallet_address: string
        }
        Insert: {
          lifetime?: number
          total?: number
          updated_at?: string
          wallet_address: string
        }
        Update: {
          lifetime?: number
          total?: number
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          created_at: string
          id: string
          kind: string
          metadata: Json
          points: number
          ref_key: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          points: number
          ref_key?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          points?: number
          ref_key?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      profile_contracts: {
        Row: {
          chain_id: number
          contract_address: string
          created_at: string
          verified_at: string
          wallet_address: string
        }
        Insert: {
          chain_id: number
          contract_address: string
          created_at?: string
          verified_at?: string
          wallet_address: string
        }
        Update: {
          chain_id?: number
          contract_address?: string
          created_at?: string
          verified_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          farcaster: string | null
          twitter: string | null
          updated_at: string
          wallet_address: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          farcaster?: string | null
          twitter?: string | null
          updated_at?: string
          wallet_address: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          farcaster?: string | null
          twitter?: string | null
          updated_at?: string
          wallet_address?: string
          website?: string | null
        }
        Relationships: []
      }
      quest_progress: {
        Row: {
          completed_at: string | null
          progress: number
          quest_id: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          completed_at?: string | null
          progress?: number
          quest_id: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          completed_at?: string | null
          progress?: number
          quest_id?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      quests: {
        Row: {
          active: boolean
          created_at: string
          description: string
          ends_at: string | null
          goal_count: number
          goal_kind: string
          id: string
          points_reward: number
          slug: string
          starts_at: string | null
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description: string
          ends_at?: string | null
          goal_count?: number
          goal_kind: string
          id?: string
          points_reward: number
          slug: string
          starts_at?: string | null
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          ends_at?: string | null
          goal_count?: number
          goal_kind?: string
          id?: string
          points_reward?: number
          slug?: string
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          owner_wallet: string
        }
        Insert: {
          code: string
          created_at?: string
          owner_wallet: string
        }
        Update: {
          code?: string
          created_at?: string
          owner_wallet?: string
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          code: string
          coin_address: string | null
          created_at: string
          event_type: string
          id: string
          value_wei: number | null
          visitor_hash: string | null
          visitor_wallet: string | null
        }
        Insert: {
          code: string
          coin_address?: string | null
          created_at?: string
          event_type: string
          id?: string
          value_wei?: number | null
          visitor_hash?: string | null
          visitor_wallet?: string | null
        }
        Update: {
          code?: string
          coin_address?: string | null
          created_at?: string
          event_type?: string
          id?: string
          value_wei?: number | null
          visitor_hash?: string | null
          visitor_wallet?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_events_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      resident_launches: {
        Row: {
          address: string | null
          chain_id: number
          collection: string
          created_at: string
          creator_address: string | null
          description: string
          featured: boolean
          image: string
          launch_date: string
          name: string
          slug: string
          tags: string[]
          ticker: string
          tx_hash: string | null
        }
        Insert: {
          address?: string | null
          chain_id?: number
          collection: string
          created_at?: string
          creator_address?: string | null
          description?: string
          featured?: boolean
          image?: string
          launch_date?: string
          name: string
          slug: string
          tags?: string[]
          ticker: string
          tx_hash?: string | null
        }
        Update: {
          address?: string | null
          chain_id?: number
          collection?: string
          created_at?: string
          creator_address?: string | null
          description?: string
          featured?: boolean
          image?: string
          launch_date?: string
          name?: string
          slug?: string
          tags?: string[]
          ticker?: string
          tx_hash?: string | null
        }
        Relationships: []
      }
      subscription_audit_log: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          environment: string
          event_type: string
          id: string
          new_price_id: string | null
          new_status: string | null
          previous_price_id: string | null
          previous_status: string | null
          raw_event: Json | null
          stripe_customer_id: string | null
          stripe_subscription_id: string
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          environment: string
          event_type: string
          id?: string
          new_price_id?: string | null
          new_status?: string | null
          previous_price_id?: string | null
          previous_status?: string | null
          raw_event?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id: string
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          environment?: string
          event_type?: string
          id?: string
          new_price_id?: string | null
          new_status?: string | null
          previous_price_id?: string | null
          previous_status?: string | null
          raw_event?: Json | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      usdc_payments: {
        Row: {
          amount_usdc: number
          block_number: number | null
          chain_id: number
          created_at: string
          from_address: string
          id: string
          plan: string
          to_address: string
          tx_hash: string
          user_id: string
          verified_at: string
        }
        Insert: {
          amount_usdc: number
          block_number?: number | null
          chain_id: number
          created_at?: string
          from_address: string
          id?: string
          plan: string
          to_address: string
          tx_hash: string
          user_id: string
          verified_at?: string
        }
        Update: {
          amount_usdc?: number
          block_number?: number | null
          chain_id?: number
          created_at?: string
          from_address?: string
          id?: string
          plan?: string
          to_address?: string
          tx_hash?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          booster_expires_at: string | null
          launch_credits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booster_expires_at?: string | null
          launch_credits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booster_expires_at?: string | null
          launch_credits?: number
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
      consume_launch_credit: { Args: { _user_id: string }; Returns: boolean }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      moonshot__crash: { Args: { p_secret: string }; Returns: number }
      moonshot__day: { Args: { p_ms: number }; Returns: string }
      moonshot__mult: {
        Args: { p_now: number; p_start: number }
        Returns: number
      }
      moonshot__now_ms: { Args: never; Returns: number }
      moonshot__settle: {
        Args: { p_cash: boolean; p_id: string; p_now: number }
        Returns: {
          auto: number | null
          commitment: string
          crash: number
          day: string
          id: string
          multiplier: number | null
          number: number
          payout: number
          pilot_id: string
          request_key: string
          secret: string
          settled_at: string | null
          start_ms: number
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "moonshot_rounds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      moonshot__view: {
        Args: {
          p_now: number
          r: Database["public"]["Tables"]["moonshot_rounds"]["Row"]
        }
        Returns: Json
      }
      moonshot_create_order: {
        Args: { p_payer: string; p_pilot: string; p_start_block: number }
        Returns: Json
      }
      moonshot_daily_state: { Args: { p_pilot: string }; Returns: Json }
      moonshot_farcaster_pilot: {
        Args: { p_avatar: string; p_fid: number; p_name: string }
        Returns: string
      }
      moonshot_hit_limit: {
        Args: { p_key: string; p_max: number }
        Returns: boolean
      }
      moonshot_leaderboard: {
        Args: {
          p_friends: boolean
          p_from: string
          p_pilot: string
          p_to: string
        }
        Returns: Json
      }
      moonshot_read_round: {
        Args: { p_cash: boolean; p_id: string; p_pilot: string }
        Returns: Json
      }
      moonshot_settle_payment: {
        Args: { p_hash: string; p_order: string; p_pilot: string }
        Returns: boolean
      }
      moonshot_start_round: {
        Args: { p_auto: number; p_key: string; p_pilot: string }
        Returns: Json
      }
      moonshot_wallet_pilot: {
        Args: { p_address: string; p_current: string }
        Returns: string
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
