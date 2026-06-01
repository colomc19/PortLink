export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      alert_recipients: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          method: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          method?: string
          profile_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          method?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_recipients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          assignment_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          delivery_method: string | null
          delivery_status: Json | null
          device_id: string | null
          id: string
          message: string
          sailing_time: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          tier: string
          updated_at: string
          vessel_id: string
        }
        Insert: {
          assignment_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          delivery_method?: string | null
          delivery_status?: Json | null
          device_id?: string | null
          id?: string
          message: string
          sailing_time?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          tier: string
          updated_at?: string
          vessel_id: string
        }
        Update: {
          assignment_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          delivery_method?: string | null
          delivery_status?: Json | null
          device_id?: string | null
          id?: string
          message?: string
          sailing_time?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          tier?: string
          updated_at?: string
          vessel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "device_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      device_assignments: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string
          checked_out_by: string | null
          created_at: string
          device_id: string
          id: string
          status: string
          vessel_id: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string | null
          created_at?: string
          device_id: string
          id?: string
          status?: string
          vessel_id: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string | null
          created_at?: string
          device_id?: string
          id?: string
          status?: string
          vessel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_assignments_checked_in_by_fkey"
            columns: ["checked_in_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_assignments_checked_out_by_fkey"
            columns: ["checked_out_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_assignments_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_assignments_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          assigned_at: string | null
          created_at: string
          current_vessel_id: string | null
          device_number: number
          id: string
          label: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string
          current_vessel_id?: string | null
          device_number: number
          id?: string
          label: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          created_at?: string
          current_vessel_id?: string | null
          device_number?: number
          id?: string
          label?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_current_vessel_id_fkey"
            columns: ["current_vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_log: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          pilot_report_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          pilot_report_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          pilot_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_log_pilot_report_id_fkey"
            columns: ["pilot_report_id"]
            isOneToOne: false
            referencedRelation: "pilot_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_report_rows: {
        Row: {
          created_at: string
          id: string
          needs_review: boolean
          parsed_date: string | null
          parsed_status: string | null
          parsed_time: string | null
          parsed_time_end: string | null
          pilot_report_id: string
          raw_agent: string | null
          raw_date: string | null
          raw_notes: string | null
          raw_terminal: string | null
          raw_time_status: string | null
          raw_vessel_name: string
          review_reason: string | null
          section: string
          time_confidence: string
          vessel_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          needs_review?: boolean
          parsed_date?: string | null
          parsed_status?: string | null
          parsed_time?: string | null
          parsed_time_end?: string | null
          pilot_report_id: string
          raw_agent?: string | null
          raw_date?: string | null
          raw_notes?: string | null
          raw_terminal?: string | null
          raw_time_status?: string | null
          raw_vessel_name: string
          review_reason?: string | null
          section: string
          time_confidence?: string
          vessel_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          needs_review?: boolean
          parsed_date?: string | null
          parsed_status?: string | null
          parsed_time?: string | null
          parsed_time_end?: string | null
          pilot_report_id?: string
          raw_agent?: string | null
          raw_date?: string | null
          raw_notes?: string | null
          raw_terminal?: string | null
          raw_time_status?: string | null
          raw_vessel_name?: string
          review_reason?: string | null
          section?: string
          time_confidence?: string
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_report_rows_pilot_report_id_fkey"
            columns: ["pilot_report_id"]
            isOneToOne: false
            referencedRelation: "pilot_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pilot_report_rows_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_reports: {
        Row: {
          created_at: string
          id: string
          parse_errors: Json | null
          parse_status: string
          parsed_at: string | null
          raw_html: string
          raw_text: string | null
          received_at: string
          report_date: string | null
          row_count: number | null
          sender_email: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parse_errors?: Json | null
          parse_status?: string
          parsed_at?: string | null
          raw_html: string
          raw_text?: string | null
          received_at?: string
          report_date?: string | null
          row_count?: number | null
          sender_email?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parse_errors?: Json | null
          parse_status?: string
          parsed_at?: string | null
          raw_html?: string
          raw_text?: string | null
          received_at?: string
          report_date?: string | null
          row_count?: number | null
          sender_email?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          receives_alerts: boolean
          role: string
          updated_at: string
          view_preference: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          receives_alerts?: boolean
          role?: string
          updated_at?: string
          view_preference?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          receives_alerts?: boolean
          role?: string
          updated_at?: string
          view_preference?: string
        }
        Relationships: []
      }
      vessel_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          details: Json | null
          id: string
          source: string
          source_id: string | null
          status: string
          vessel_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          details?: Json | null
          id?: string
          source: string
          source_id?: string | null
          status: string
          vessel_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          details?: Json | null
          id?: string
          source?: string
          source_id?: string | null
          status?: string
          vessel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessel_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessel_status_history_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      vessels: {
        Row: {
          agent: string | null
          arrival_date: string | null
          arrival_time: string | null
          arrival_time_display: string | null
          created_at: string
          created_by: string | null
          has_manual_override: boolean
          id: string
          is_new: boolean
          name: string
          name_normalized: string
          needs_review: boolean
          new_since: string | null
          notes: string | null
          override_fields: Json | null
          review_reason: string | null
          sailing_date: string | null
          sailing_time: string | null
          sailing_time_confidence: string
          sailing_time_display: string | null
          sailing_time_end: string | null
          source: string
          status: string
          terminal: string | null
          updated_at: string
          updated_by: string | null
          visit_end: string | null
          visit_start: string | null
        }
        Insert: {
          agent?: string | null
          arrival_date?: string | null
          arrival_time?: string | null
          arrival_time_display?: string | null
          created_at?: string
          created_by?: string | null
          has_manual_override?: boolean
          id?: string
          is_new?: boolean
          name: string
          name_normalized: string
          needs_review?: boolean
          new_since?: string | null
          notes?: string | null
          override_fields?: Json | null
          review_reason?: string | null
          sailing_date?: string | null
          sailing_time?: string | null
          sailing_time_confidence?: string
          sailing_time_display?: string | null
          sailing_time_end?: string | null
          source?: string
          status?: string
          terminal?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_end?: string | null
          visit_start?: string | null
        }
        Update: {
          agent?: string | null
          arrival_date?: string | null
          arrival_time?: string | null
          arrival_time_display?: string | null
          created_at?: string
          created_by?: string | null
          has_manual_override?: boolean
          id?: string
          is_new?: boolean
          name?: string
          name_normalized?: string
          needs_review?: boolean
          new_since?: string | null
          notes?: string | null
          override_fields?: Json | null
          review_reason?: string | null
          sailing_date?: string | null
          sailing_time?: string | null
          sailing_time_confidence?: string
          sailing_time_display?: string | null
          sailing_time_end?: string | null
          source?: string
          status?: string
          terminal?: string | null
          updated_at?: string
          updated_by?: string | null
          visit_end?: string | null
          visit_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vessels_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessels_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      normalize_vessel_name: { Args: { name: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
