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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_class: string
          created_at: string
          current_price: number
          daily_change_percent: number
          id: string
          name: string
          ticker: string
        }
        Insert: {
          asset_class: string
          created_at?: string
          current_price: number
          daily_change_percent?: number
          id?: string
          name: string
          ticker: string
        }
        Update: {
          asset_class?: string
          created_at?: string
          current_price?: number
          daily_change_percent?: number
          id?: string
          name?: string
          ticker?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          crypto_currency: string
          id: string
          reviewed_at: string | null
          status: string
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          crypto_currency?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          crypto_currency?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          admin_note: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          document_type: string
          document_url: string
          full_name: string
          id: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_type: string
          document_url: string
          full_name: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_type?: string
          document_url?: string
          full_name?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      live_positions: {
        Row: {
          account_mode: string
          asset: string
          close_price: number | null
          closed_at: string | null
          entry_price: number
          id: string
          leverage: number
          margin: number
          opened_at: string
          pnl: number
          quantity: number
          side: string
          status: string
          user_id: string
        }
        Insert: {
          account_mode?: string
          asset: string
          close_price?: number | null
          closed_at?: string | null
          entry_price: number
          id?: string
          leverage?: number
          margin: number
          opened_at?: string
          pnl?: number
          quantity: number
          side: string
          status?: string
          user_id: string
        }
        Update: {
          account_mode?: string
          asset?: string
          close_price?: number | null
          closed_at?: string | null
          entry_price?: number
          id?: string
          leverage?: number
          margin?: number
          opened_at?: string
          pnl?: number
          quantity?: number
          side?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      market_news: {
        Row: {
          body: string | null
          created_at: string
          id: string
          impact: string
          source: string | null
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          impact?: string
          source?: string | null
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          impact?: string
          source?: string | null
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_balance: number
          account_mode: string
          available_cash: number
          avatar_url: string | null
          chart_intensity: number
          chart_mode: string
          chart_seed: number
          created_at: string
          demo_balance: number
          full_name: string | null
          id: string
          is_suspended: boolean
          kyc_status: string
          live_balance: number
          referral_code: string | null
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          account_balance?: number
          account_mode?: string
          available_cash?: number
          avatar_url?: string | null
          chart_intensity?: number
          chart_mode?: string
          chart_seed?: number
          created_at?: string
          demo_balance?: number
          full_name?: string | null
          id: string
          is_suspended?: boolean
          kyc_status?: string
          live_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          account_balance?: number
          account_mode?: string
          available_cash?: number
          avatar_url?: string | null
          chart_intensity?: number
          chart_mode?: string
          chart_seed?: number
          created_at?: string
          demo_balance?: number
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          kyc_status?: string
          live_balance?: number
          referral_code?: string | null
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_earnings: {
        Row: {
          amount: number
          created_at: string
          deposit_id: string | null
          id: string
          referred_user_id: string
          referrer_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          deposit_id?: string | null
          id?: string
          referred_user_id: string
          referrer_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          deposit_id?: string | null
          id?: string
          referred_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          asset_id: string | null
          asset_name: string | null
          created_at: string
          id: string
          quantity: number | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_id?: string | null
          asset_name?: string | null
          created_at?: string
          id?: string
          quantity?: number | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string | null
          asset_name?: string | null
          created_at?: string
          id?: string
          quantity?: number | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_investments: {
        Row: {
          asset_id: string
          average_buy_price: number
          created_at: string
          id: string
          quantity: number
          user_id: string
        }
        Insert: {
          asset_id: string
          average_buy_price: number
          created_at?: string
          id?: string
          quantity: number
          user_id: string
        }
        Update: {
          asset_id?: string
          average_buy_price?: number
          created_at?: string
          id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_investments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          crypto_currency: string
          id: string
          reviewed_at: string | null
          status: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          crypto_currency?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          crypto_currency?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
