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
      characters: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          model: string
          name: string
          system_prompt: string
          updated_at: string
          voice_enabled: boolean
          voice_name: string
          image_model: string
          reference_image_url: string | null
          tts_model: string
          is_locked: boolean
          lock_pin: string | null
          notification_sound: string
          theme_color: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          model?: string
          name: string
          system_prompt?: string
          updated_at?: string
          voice_enabled?: boolean
          voice_name?: string
          image_model?: string
          reference_image_url?: string | null
          tts_model?: string
          is_locked?: boolean
          lock_pin?: string | null
          notification_sound?: string
          theme_color?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          model?: string
          name?: string
          system_prompt?: string
          updated_at?: string
          voice_enabled?: boolean
          voice_name?: string
          image_model?: string
          reference_image_url?: string | null
          tts_model?: string
          is_locked?: boolean
          lock_pin?: string | null
          notification_sound?: string
          theme_color?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          character_id: string
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string | null
        }
        Insert: {
          character_id: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
        }
        Update: {
          character_id?: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          media_url: string | null
          message_type: string
          role: string
          read_at: string | null
          reactions: string[] | null
          reply_to_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          media_url?: string | null
          message_type?: string
          role: string
          read_at?: string | null
          reactions?: string[] | null
          reply_to_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          media_url?: string | null
          message_type?: string
          role?: string
          read_at?: string | null
          reactions?: string[] | null
          reply_to_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          id: string
          name: string
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          character_id: string
          added_at: string
          model_override: string | null
        }
        Insert: {
          id?: string
          group_id: string
          character_id: string
          added_at?: string
          model_override?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          character_id?: string
          added_at?: string
          model_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          sender_type: string
          sender_character_id: string | null
          content: string
          target_character_id: string | null
          voice_url: string | null
          image_url: string | null
          created_at: string
          reply_to_id: string | null
          reactions: Record<string, string[]> | null
        }
        Insert: {
          id?: string
          group_id: string
          sender_type: string
          sender_character_id?: string | null
          content: string
          target_character_id?: string | null
          voice_url?: string | null
          image_url?: string | null
          created_at?: string
          reply_to_id?: string | null
          reactions?: Record<string, string[]> | null
        }
        Update: {
          id?: string
          group_id?: string
          sender_type?: string
          sender_character_id?: string | null
          content?: string
          target_character_id?: string | null
          voice_url?: string | null
          image_url?: string | null
          created_at?: string
          reply_to_id?: string | null
          reactions?: Record<string, string[]> | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_character_id_fkey"
            columns: ["sender_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_target_character_id_fkey"
            columns: ["target_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_memories: {
        Row: {
          id: string
          character_id: string
          memory_type: string
          content: string
          importance: number
          metadata: Json
          created_at: string
          last_accessed: string
        }
        Insert: {
          id?: string
          character_id: string
          memory_type?: string
          content: string
          importance?: number
          metadata?: Json
          created_at?: string
          last_accessed?: string
        }
        Update: {
          id?: string
          character_id?: string
          memory_type?: string
          content?: string
          importance?: number
          metadata?: Json
          created_at?: string
          last_accessed?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_memories_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
      }
      character_stories: {
        Row: {
          id: string
          character_id: string
          content: string
          mood: string
          created_at: string
          expires_at: string
          viewed: boolean
        }
        Insert: {
          id?: string
          character_id: string
          content: string
          mood?: string
          created_at?: string
          expires_at?: string
          viewed?: boolean
        }
        Update: {
          id?: string
          character_id?: string
          content?: string
          mood?: string
          created_at?: string
          expires_at?: string
          viewed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "character_stories_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
        ]
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
