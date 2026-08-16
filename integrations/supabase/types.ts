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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          claim_id: string | null
          created_at: string
          detail: Json
          event: string
          id: string
          item_id: string | null
          school_id: string
        }
        Insert: {
          claim_id?: string | null
          created_at?: string
          detail?: Json
          event: string
          id?: string
          item_id?: string | null
          school_id: string
        }
        Update: {
          claim_id?: string | null
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          item_id?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      buildings: {
        Row: {
          code: string
          created_at: string
          floor_plans: Json
          h: number
          id: string
          name: string
          school_id: string
          sort_order: number
          w: number
          x: number
          y: number
        }
        Insert: {
          code: string
          created_at?: string
          floor_plans?: Json
          h?: number
          id?: string
          name: string
          school_id: string
          sort_order?: number
          w?: number
          x?: number
          y?: number
        }
        Update: {
          code?: string
          created_at?: string
          floor_plans?: Json
          h?: number
          id?: string
          name?: string
          school_id?: string
          sort_order?: number
          w?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "buildings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          claimant_id: string
          created_at: string
          id: string
          item_id: string
          message: string
          proof: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: Database["public"]["Enums"]["claim_state"]
          updated_at: string
        }
        Insert: {
          claimant_id: string
          created_at?: string
          id?: string
          item_id: string
          message?: string
          proof?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: Database["public"]["Enums"]["claim_state"]
          updated_at?: string
        }
        Update: {
          claimant_id?: string
          created_at?: string
          id?: string
          item_id?: string
          message?: string
          proof?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: Database["public"]["Enums"]["claim_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_embeddings: {
        Row: {
          created_at: string
          embedding: Json
          item_id: string
          model: string
          source_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          embedding: Json
          item_id: string
          model: string
          source_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          embedding?: Json
          item_id?: string
          model?: string
          source_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_embeddings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_images: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean
          item_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean
          item_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean
          item_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          building_code: string | null
          category: string
          color: string
          created_at: string
          description: string
          floor: string | null
          handover_point: string | null
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["item_kind"]
          legacy_image_key: string | null
          moderation_state: Database["public"]["Enums"]["moderation_state"]
          occurred_at: string
          reporter_id: string | null
          reporter_label: string | null
          room: string | null
          school_id: string
          status: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at: string
        }
        Insert: {
          building_code?: string | null
          category: string
          color: string
          created_at?: string
          description?: string
          floor?: string | null
          handover_point?: string | null
          id?: string
          is_demo?: boolean
          kind: Database["public"]["Enums"]["item_kind"]
          legacy_image_key?: string | null
          moderation_state?: Database["public"]["Enums"]["moderation_state"]
          occurred_at?: string
          reporter_id?: string | null
          reporter_label?: string | null
          room?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at?: string
        }
        Update: {
          building_code?: string | null
          category?: string
          color?: string
          created_at?: string
          description?: string
          floor?: string | null
          handover_point?: string | null
          id?: string
          is_demo?: boolean
          kind?: Database["public"]["Enums"]["item_kind"]
          legacy_image_key?: string | null
          moderation_state?: Database["public"]["Enums"]["moderation_state"]
          occurred_at?: string
          reporter_id?: string | null
          reporter_label?: string | null
          room?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["item_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          found_item_id: string
          id: string
          lost_item_id: string
          reasons: Json
          score: number
          state: Database["public"]["Enums"]["match_state"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          found_item_id: string
          id?: string
          lost_item_id: string
          reasons?: Json
          score?: number
          state?: Database["public"]["Enums"]["match_state"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          found_item_id?: string
          id?: string
          lost_item_id?: string
          reasons?: Json
          score?: number
          state?: Database["public"]["Enums"]["match_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_found_item_id_fkey"
            columns: ["found_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_lost_item_id_fkey"
            columns: ["lost_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_reports: {
        Row: {
          created_at: string
          id: string
          image_id: string | null
          item_id: string | null
          reason: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_id?: string | null
          item_id?: string | null
          reason: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_id?: string | null
          item_id?: string | null
          reason?: string
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_reports_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "item_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_reports_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          claim_id: string | null
          created_at: string
          id: string
          item_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          claim_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          claim_id?: string | null
          created_at?: string
          id?: string
          item_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_note: string | null
          created_at: string
          display_name: string
          grade: string | null
          id: string
          school_id: string
          updated_at: string
        }
        Insert: {
          contact_note?: string | null
          created_at?: string
          display_name?: string
          grade?: string | null
          id: string
          school_id?: string
          updated_at?: string
        }
        Update: {
          contact_note?: string | null
          created_at?: string
          display_name?: string
          grade?: string | null
          id?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_events: {
        Row: {
          bucket: string
          created_at: string
          id: string
          subject: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: string
          subject: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          subject?: string
        }
        Relationships: []
      }
      returns: {
        Row: {
          claim_id: string
          collected_at: string
          created_at: string
          handed_over_by: string | null
          id: string
          item_id: string
          notes: string | null
        }
        Insert: {
          claim_id: string
          collected_at?: string
          created_at?: string
          handed_over_by?: string | null
          id?: string
          item_id: string
          notes?: string | null
        }
        Update: {
          claim_id?: string
          collected_at?: string
          created_at?: string
          handed_over_by?: string | null
          id?: string
          item_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: true
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cancel_claim: {
        Args: { _claim_id: string }
        Returns: {
          claimant_id: string
          created_at: string
          id: string
          item_id: string
          message: string
          proof: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: Database["public"]["Enums"]["claim_state"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      moderate_item: {
        Args: { _action: string; _item_id: string; _note?: string }
        Returns: {
          building_code: string | null
          category: string
          color: string
          created_at: string
          description: string
          floor: string | null
          handover_point: string | null
          id: string
          is_demo: boolean
          kind: Database["public"]["Enums"]["item_kind"]
          legacy_image_key: string | null
          moderation_state: Database["public"]["Enums"]["moderation_state"]
          occurred_at: string
          reporter_id: string | null
          reporter_label: string | null
          room: string | null
          school_id: string
          status: Database["public"]["Enums"]["item_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_moderation_report: {
        Args: { _note?: string; _report_id: string; _status: string }
        Returns: {
          created_at: string
          id: string
          image_id: string | null
          item_id: string | null
          reason: string
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "moderation_reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_claim: {
        Args: {
          _claim_id: string
          _next: Database["public"]["Enums"]["claim_state"]
          _note?: string
        }
        Returns: {
          claimant_id: string
          created_at: string
          id: string
          item_id: string
          message: string
          proof: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          state: Database["public"]["Enums"]["claim_state"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "claims"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "student" | "staff" | "admin" | "moderator" | "school_admin"
      claim_state:
        | "pending"
        | "approved"
        | "rejected"
        | "collected"
        | "reviewing"
        | "cancelled"
        | "returned"
      item_kind: "lost" | "found"
      item_status: "open" | "matched" | "claimed" | "returned" | "archived"
      match_state: "suggested" | "confirmed" | "dismissed"
      moderation_state: "pending" | "approved" | "rejected"
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
      app_role: ["student", "staff", "admin", "moderator", "school_admin"],
      claim_state: [
        "pending",
        "approved",
        "rejected",
        "collected",
        "reviewing",
        "cancelled",
        "returned",
      ],
      item_kind: ["lost", "found"],
      item_status: ["open", "matched", "claimed", "returned", "archived"],
      match_state: ["suggested", "confirmed", "dismissed"],
      moderation_state: ["pending", "approved", "rejected"],
    },
  },
} as const
