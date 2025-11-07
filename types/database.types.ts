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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_id: string
          balances: Json
          created_at: string | null
          holder_category: string | null
          id: string
          iso_currency_code: string | null
          subtype: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          balances?: Json
          created_at?: string | null
          holder_category?: string | null
          id?: string
          iso_currency_code?: string | null
          subtype?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          balances?: Json
          created_at?: string | null
          holder_category?: string | null
          id?: string
          iso_currency_code?: string | null
          subtype?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      consent: {
        Row: {
          consent_status: boolean | null
          created_at: string | null
          granted_at: string | null
          id: string
          revoked_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          consent_status?: boolean | null
          created_at?: string | null
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          consent_status?: boolean | null
          created_at?: string | null
          granted_at?: string | null
          id?: string
          revoked_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          category: string | null
          content_text: string
          created_at: string | null
          id: string
          persona_target: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content_text: string
          created_at?: string | null
          id?: string
          persona_target?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content_text?: string
          created_at?: string | null
          id?: string
          persona_target?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      liabilities: {
        Row: {
          apr: number | null
          created_at: string | null
          id: string
          interest_rate: number | null
          last_balance: number | null
          last_payment: number | null
          min_payment: number | null
          next_due: string | null
          overdue: boolean | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apr?: number | null
          created_at?: string | null
          id?: string
          interest_rate?: number | null
          last_balance?: number | null
          last_payment?: number | null
          min_payment?: number | null
          next_due?: string | null
          overdue?: boolean | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          apr?: number | null
          created_at?: string | null
          id?: string
          interest_rate?: number | null
          last_balance?: number | null
          last_payment?: number | null
          min_payment?: number | null
          next_due?: string | null
          overdue?: boolean | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          action_type: string
          created_at: string | null
          decision_trace: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          decision_trace?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          decision_trace?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      personas: {
        Row: {
          assigned_at: string | null
          id: string
          persona_type: string
          rationale: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          persona_type: string
          rationale: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          persona_type?: string
          rationale?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          approved_by_operator: string | null
          content_id: string | null
          created_at: string | null
          id: string
          offer_data: Json | null
          rationale: string
          user_id: string
        }
        Insert: {
          approved_by_operator?: string | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          offer_data?: Json | null
          rationale: string
          user_id: string
        }
        Update: {
          approved_by_operator?: string | null
          content_id?: string | null
          created_at?: string | null
          id?: string
          offer_data?: Json | null
          rationale?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_approved_by_operator_fkey"
            columns: ["approved_by_operator"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          detected_at: string | null
          id: string
          signal_data: Json
          signal_type: string
          user_id: string
        }
        Insert: {
          detected_at?: string | null
          id?: string
          signal_data?: Json
          signal_type: string
          user_id: string
        }
        Update: {
          detected_at?: string | null
          id?: string
          signal_data?: Json
          signal_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          date: string
          id: string
          merchant_name: string | null
          payment_channel: string | null
          pending: boolean | null
          personal_finance_category: Json | null
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          date: string
          id?: string
          merchant_name?: string | null
          payment_channel?: string | null
          pending?: boolean | null
          personal_finance_category?: Json | null
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          date?: string
          id?: string
          merchant_name?: string | null
          payment_channel?: string | null
          pending?: boolean | null
          personal_finance_category?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          consent_status: boolean | null
          created_at: string | null
          demographics: Json | null
          fake_name: string
          id: string
          updated_at: string | null
        }
        Insert: {
          consent_status?: boolean | null
          created_at?: string | null
          demographics?: Json | null
          fake_name: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          consent_status?: boolean | null
          created_at?: string | null
          demographics?: Json | null
          fake_name?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const

