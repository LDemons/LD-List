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
      album: {
        Row: {
          id: number
          kind: Database["public"]["Enums"]["album_kind"]
          media_type: Database["public"]["Enums"]["media_type"]
          track_count: number | null
        }
        Insert: {
          id: number
          kind?: Database["public"]["Enums"]["album_kind"]
          media_type?: Database["public"]["Enums"]["media_type"]
          track_count?: number | null
        }
        Update: {
          id?: number
          kind?: Database["public"]["Enums"]["album_kind"]
          media_type?: Database["public"]["Enums"]["media_type"]
          track_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "album_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id", "type"]
          },
          {
            foreignKeyName: "album_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id", "type"]
          },
        ]
      }
      anime: {
        Row: {
          end_date: string | null
          episode_count: number | null
          format: Database["public"]["Enums"]["anime_format"] | null
          id: number
          media_type: Database["public"]["Enums"]["media_type"]
        }
        Insert: {
          end_date?: string | null
          episode_count?: number | null
          format?: Database["public"]["Enums"]["anime_format"] | null
          id: number
          media_type?: Database["public"]["Enums"]["media_type"]
        }
        Update: {
          end_date?: string | null
          episode_count?: number | null
          format?: Database["public"]["Enums"]["anime_format"] | null
          id?: number
          media_type?: Database["public"]["Enums"]["media_type"]
        }
        Relationships: [
          {
            foreignKeyName: "anime_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id", "type"]
          },
          {
            foreignKeyName: "anime_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id", "type"]
          },
        ]
      }
      creator: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      entry: {
        Row: {
          created_at: string
          finished_on: string | null
          id: number
          media_item_id: number
          notes: string | null
          rated_at: string | null
          score: number | null
          started_on: string | null
          status: Database["public"]["Enums"]["entry_status"]
          tie_order: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finished_on?: string | null
          id?: never
          media_item_id: number
          notes?: string | null
          rated_at?: string | null
          score?: number | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          tie_order?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          finished_on?: string | null
          id?: never
          media_item_id?: number
          notes?: string | null
          rated_at?: string | null
          score?: number | null
          started_on?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          tie_order?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id"]
          },
        ]
      }
      external_ref: {
        Row: {
          external_id: string
          fetched_at: string
          media_item_id: number
          provider: Database["public"]["Enums"]["external_provider"]
          raw: Json | null
        }
        Insert: {
          external_id: string
          fetched_at?: string
          media_item_id: number
          provider: Database["public"]["Enums"]["external_provider"]
          raw?: Json | null
        }
        Update: {
          external_id?: string
          fetched_at?: string
          media_item_id?: number
          provider?: Database["public"]["Enums"]["external_provider"]
          raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "external_ref_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_ref_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id"]
          },
        ]
      }
      film: {
        Row: {
          id: number
          media_type: Database["public"]["Enums"]["media_type"]
          runtime_minutes: number | null
        }
        Insert: {
          id: number
          media_type?: Database["public"]["Enums"]["media_type"]
          runtime_minutes?: number | null
        }
        Update: {
          id?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          runtime_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "film_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id", "type"]
          },
          {
            foreignKeyName: "film_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id", "type"]
          },
        ]
      }
      game: {
        Row: {
          id: number
          media_type: Database["public"]["Enums"]["media_type"]
          platforms: string[]
        }
        Insert: {
          id: number
          media_type?: Database["public"]["Enums"]["media_type"]
          platforms?: string[]
        }
        Update: {
          id?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          platforms?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "game_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id", "type"]
          },
          {
            foreignKeyName: "game_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id", "type"]
          },
        ]
      }
      genre: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: never
          name: string
        }
        Update: {
          id?: never
          name?: string
        }
        Relationships: []
      }
      media_credit: {
        Row: {
          creator_id: number
          media_item_id: number
          position: number
          role: Database["public"]["Enums"]["credit_role"]
        }
        Insert: {
          creator_id: number
          media_item_id: number
          position?: number
          role: Database["public"]["Enums"]["credit_role"]
        }
        Update: {
          creator_id?: number
          media_item_id?: number
          position?: number
          role?: Database["public"]["Enums"]["credit_role"]
        }
        Relationships: [
          {
            foreignKeyName: "media_credit_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_credit_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_credit_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id"]
          },
        ]
      }
      media_genre: {
        Row: {
          genre_id: number
          media_item_id: number
        }
        Insert: {
          genre_id: number
          media_item_id: number
        }
        Update: {
          genre_id?: number
          media_item_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "media_genre_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genre"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_genre_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_genre_media_item_id_fkey"
            columns: ["media_item_id"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id"]
          },
        ]
      }
      media_item: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          id: number
          original_title: string | null
          release_date: string | null
          synopsis: string | null
          title: string
          type: Database["public"]["Enums"]["media_type"]
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: never
          original_title?: string | null
          release_date?: string | null
          synopsis?: string | null
          title: string
          type: Database["public"]["Enums"]["media_type"]
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: never
          original_title?: string | null
          release_date?: string | null
          synopsis?: string | null
          title?: string
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string
        }
        Relationships: []
      }
      series: {
        Row: {
          end_date: string | null
          episode_count: number | null
          id: number
          media_type: Database["public"]["Enums"]["media_type"]
          season_count: number | null
        }
        Insert: {
          end_date?: string | null
          episode_count?: number | null
          id: number
          media_type?: Database["public"]["Enums"]["media_type"]
          season_count?: number | null
        }
        Update: {
          end_date?: string | null
          episode_count?: number | null
          id?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          season_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "series_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id", "type"]
          },
          {
            foreignKeyName: "series_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id", "type"]
          },
        ]
      }
      song: {
        Row: {
          album_id: number | null
          duration_seconds: number | null
          id: number
          media_type: Database["public"]["Enums"]["media_type"]
          track_number: number | null
        }
        Insert: {
          album_id?: number | null
          duration_seconds?: number | null
          id: number
          media_type?: Database["public"]["Enums"]["media_type"]
          track_number?: number | null
        }
        Update: {
          album_id?: number | null
          duration_seconds?: number | null
          id?: number
          media_type?: Database["public"]["Enums"]["media_type"]
          track_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "song_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "album"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "media_item"
            referencedColumns: ["id", "type"]
          },
          {
            foreignKeyName: "song_id_media_type_fkey"
            columns: ["id", "media_type"]
            isOneToOne: false
            referencedRelation: "ranking"
            referencedColumns: ["media_item_id", "type"]
          },
        ]
      }
    }
    Views: {
      ranking: {
        Row: {
          category_position: number | null
          cover_url: string | null
          entry_id: number | null
          global_position: number | null
          media_item_id: number | null
          release_date: string | null
          score: number | null
          tie_order: number | null
          title: string | null
          type: Database["public"]["Enums"]["media_type"] | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_media_item: { Args: { p_item: Json }; Returns: number }
      edge_rate_limit: { Args: { p_bucket: string }; Returns: undefined }
      reorder_tie_group: { Args: { p_entry_ids: number[] }; Returns: undefined }
    }
    Enums: {
      album_kind: "album" | "ep" | "single" | "compilation" | "live"
      anime_format: "tv" | "movie" | "ova" | "ona" | "special"
      credit_role:
        | "director"
        | "writer"
        | "creator"
        | "developer"
        | "publisher"
        | "studio"
        | "artist"
        | "composer"
      entry_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "on_hold"
        | "dropped"
      external_provider: "tmdb" | "igdb" | "anilist" | "musicbrainz"
      media_type: "film" | "series" | "game" | "anime" | "album" | "song"
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
    Enums: {
      album_kind: ["album", "ep", "single", "compilation", "live"],
      anime_format: ["tv", "movie", "ova", "ona", "special"],
      credit_role: [
        "director",
        "writer",
        "creator",
        "developer",
        "publisher",
        "studio",
        "artist",
        "composer",
      ],
      entry_status: [
        "planned",
        "in_progress",
        "completed",
        "on_hold",
        "dropped",
      ],
      external_provider: ["tmdb", "igdb", "anilist", "musicbrainz"],
      media_type: ["film", "series", "game", "anime", "album", "song"],
    },
  },
} as const
