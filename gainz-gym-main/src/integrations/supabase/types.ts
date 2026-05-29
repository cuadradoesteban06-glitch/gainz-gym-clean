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
      coach_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          created_at: string
          date: string
          notes: string
          pain_areas: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          notes?: string
          pain_areas?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          notes?: string
          pain_areas?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diets: {
        Row: {
          id: string
          user_id: string
          title: string
          goal: string
          calories: number
          protein_g: number
          carbs_g: number
          fat_g: number
          restrictions: Json
          meals: Json
          replacements: Json
          reasoning: string
          shopping_list: Json
          profile_snapshot: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          goal?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          restrictions?: Json
          meals?: Json
          replacements?: Json
          reasoning?: string
          shopping_list?: Json
          profile_snapshot?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          goal?: string
          calories?: number
          protein_g?: number
          carbs_g?: number
          fat_g?: number
          restrictions?: Json
          meals?: Json
          replacements?: Json
          reasoning?: string
          shopping_list?: Json
          profile_snapshot?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      diet_checkins: {
        Row: {
          id: string
          user_id: string
          diet_id: string
          date: string
          meals_completed: number
          meals_total: number
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          diet_id: string
          date: string
          meals_completed?: number
          meals_total?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          diet_id?: string
          date?: string
          meals_completed?: number
          meals_total?: number
          notes?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diet_checkins_diet_id_fkey"
            columns: ["diet_id"]
            isOneToOne: false
            referencedRelation: "diets"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_logs: {
        Row: {
          created_at: string
          date: string
          exercise_id: string
          exercise_name: string
          id: string
          is_pr: boolean
          muscle_group: string
          reps: number
          set_index: number
          user_id: string
          weight_kg: number | null
          workout_id: string | null
          workout_name: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          exercise_id: string
          exercise_name: string
          id?: string
          is_pr?: boolean
          muscle_group: string
          reps?: number
          set_index?: number
          user_id: string
          weight_kg?: number | null
          workout_id?: string | null
          workout_name?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          exercise_id?: string
          exercise_name?: string
          id?: string
          is_pr?: boolean
          muscle_group?: string
          reps?: number
          set_index?: number
          user_id?: string
          weight_kg?: number | null
          workout_id?: string | null
          workout_name?: string | null
        }
        Relationships: []
      }
      forge_states: {
        Row: {
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_overrides: {
        Row: {
          created_at: string
          date: string
          exercises: Json
          focus: string
          reasoning: string
          updated_at: string
          user_id: string
          workout_id: string
          workout_name: string
        }
        Insert: {
          created_at?: string
          date: string
          exercises?: Json
          focus?: string
          reasoning?: string
          updated_at?: string
          user_id: string
          workout_id: string
          workout_name: string
        }
        Update: {
          created_at?: string
          date?: string
          exercises?: Json
          focus?: string
          reasoning?: string
          updated_at?: string
          user_id?: string
          workout_id?: string
          workout_name?: string
        }
        Relationships: []
      }
      user_coach_profile: {
        Row: {
          injuries: Json
          notes: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          injuries?: Json
          notes?: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          injuries?: Json
          notes?: string
          preferences?: Json
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
