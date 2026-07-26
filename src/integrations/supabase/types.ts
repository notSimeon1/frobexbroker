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
      admin_balance_logs: {
        Row: {
          action: string
          admin_id: string
          amount: number
          asset_symbol: string | null
          balance_type: string
          created_at: string
          fiat_value_usd: number | null
          id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          amount: number
          asset_symbol?: string | null
          balance_type: string
          created_at?: string
          fiat_value_usd?: number | null
          id?: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          amount?: number
          asset_symbol?: string | null
          balance_type?: string
          created_at?: string
          fiat_value_usd?: number | null
          id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: []
      }
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
      bank_deposit_methods: {
        Row: {
          account_name: string
          account_number: string | null
          bank_address: string | null
          created_at: string
          id: string
          is_active: boolean
          max_amount: number
          method_name: string
          method_type: string
          min_amount: number
          notes: string | null
          routing_number: string | null
          swift_code: string | null
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount?: number
          method_name: string
          method_type: string
          min_amount?: number
          notes?: string | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_amount?: number
          method_name?: string
          method_type?: string
          min_amount?: number
          notes?: string | null
          routing_number?: string | null
          swift_code?: string | null
          updated_at?: string
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
          bank_method_id: string | null
          created_at: string
          crypto_currency: string
          fiat_currency: string | null
          id: string
          payment_method: string
          receipt_url: string | null
          reviewed_at: string | null
          status: string
          tx_hash: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_method_id?: string | null
          created_at?: string
          crypto_currency?: string
          fiat_currency?: string | null
          id?: string
          payment_method?: string
          receipt_url?: string | null
          reviewed_at?: string | null
          status?: string
          tx_hash?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_method_id?: string | null
          created_at?: string
          crypto_currency?: string
          fiat_currency?: string | null
          id?: string
          payment_method?: string
          receipt_url?: string | null
          reviewed_at?: string | null
          status?: string
          tx_hash?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposits_bank_method_id_fkey"
            columns: ["bank_method_id"]
            isOneToOne: false
            referencedRelation: "bank_deposit_methods"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_balance: number
          account_mode: string
          ai_trading_enabled: boolean
          available_cash: number
          avatar_url: string | null
          chart_intensity: number
          chart_mode: string
          chart_seed: number
          created_at: string
          crypto_balances: Json | null
          demo_balance: number
          full_name: string | null
          id: string
          is_suspended: boolean
          kyc_status: string
          live_balance: number
          preferred_currency: string | null
          referral_code: string | null
          referred_by: string | null
          signals_lifetime: boolean | null
          signals_trial_expires_at: string | null
          signals_trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          account_balance?: number
          account_mode?: string
          ai_trading_enabled?: boolean
          available_cash?: number
          avatar_url?: string | null
          chart_intensity?: number
          chart_mode?: string
          chart_seed?: number
          created_at?: string
          crypto_balances?: Json | null
          demo_balance?: number
          full_name?: string | null
          id: string
          is_suspended?: boolean
          kyc_status?: string
          live_balance?: number
          preferred_currency?: string | null
          referral_code?: string | null
          referred_by?: string | null
          signals_lifetime?: boolean | null
          signals_trial_expires_at?: string | null
          signals_trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          account_balance?: number
          account_mode?: string
          ai_trading_enabled?: boolean
          available_cash?: number
          avatar_url?: string | null
          chart_intensity?: number
          chart_mode?: string
          chart_seed?: number
          created_at?: string
          crypto_balances?: Json | null
          demo_balance?: number
          full_name?: string | null
          id?: string
          is_suspended?: boolean
          kyc_status?: string
          live_balance?: number
          preferred_currency?: string | null
          referral_code?: string | null
          referred_by?: string | null
          signals_lifetime?: boolean | null
          signals_trial_expires_at?: string | null
          signals_trial_started_at?: string | null
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
      support_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          is_read: boolean
          sender: string
          thread_id: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender: string
          thread_id: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          status?: string
          subject?: string | null
          user_id?: string
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
          source_id: string | null
          source_table: string | null
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
          source_id?: string | null
          source_table?: string | null
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
          source_id?: string | null
          source_table?: string | null
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
          fee_wallet_address: string | null
          id: string
          payout_amount: number | null
          reviewed_at: string | null
          status: string
          tax_fee: number | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          crypto_currency?: string
          fee_wallet_address?: string | null
          id?: string
          payout_amount?: number | null
          reviewed_at?: string | null
          status?: string
          tax_fee?: number | null
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          crypto_currency?: string
          fee_wallet_address?: string | null
          id?: string
          payout_amount?: number | null
          reviewed_at?: string | null
          status?: string
          tax_fee?: number | null
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
      admin_adjust_crypto: {
        Args: {
          _action: string
          _amount: number
          _fiat_usd?: number
          _reason: string
          _symbol: string
          _target: string
        }
        Returns: undefined
      }
      admin_decide_deposit_atomic: {
        Args: { _deposit_id: string; _status: string }
        Returns: undefined
      }
      admin_decide_withdrawal_atomic: {
        Args: { _fee_wallet: string; _status: string; _withdrawal_id: string }
        Returns: undefined
      }
      admin_grant_admin: { Args: { _target: string }; Returns: undefined }
      admin_revoke_admin: { Args: { _target: string }; Returns: undefined }
      admin_set_signals_trial: {
        Args: { _days: number; _lifetime: boolean; _target: string }
        Returns: undefined
      }
      buy_asset_atomic: {
        Args: { _asset_id: string; _usd: number }
        Returns: undefined
      }
      close_position_atomic: {
        Args: { _close_price: number; _position_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_user: {
        Args: {
          _message: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      open_position_atomic: {
        Args: {
          _account_mode: string
          _asset: string
          _entry_price: number
          _leverage: number
          _margin: number
          _quantity: number
          _side: string
          _user_id: string
        }
        Returns: string
      }
      submit_kyc_pending: { Args: never; Returns: undefined }
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
