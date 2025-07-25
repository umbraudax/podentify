export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      episodes: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          audio_url: string
          duration: number | null
          status: "uploading" | "processing" | "completed" | "failed"
          show_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          audio_url: string
          duration?: number | null
          status?: "uploading" | "processing" | "completed" | "failed"
          show_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          audio_url?: string
          duration?: number | null
          status?: "uploading" | "processing" | "completed" | "failed"
          show_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      social_clips: {
        Row: {
          id: string
          episode_id: string
          title: string
          start_time: number
          end_time: number
          duration: number
          engagement_score: number | null
          clip_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          episode_id: string
          title: string
          start_time: number
          end_time: number
          duration: number
          engagement_score?: number | null
          clip_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          episode_id?: string
          title?: string
          start_time?: number
          end_time?: number
          duration?: number
          engagement_score?: number | null
          clip_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_clips_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          }
        ]
      }
      transcripts: {
        Row: {
          id: string
          episode_id: string
          full_text: string | null
          confidence: number | null
          status: "processing" | "completed" | "failed"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          episode_id: string
          full_text?: string | null
          confidence?: number | null
          status?: "processing" | "completed" | "failed"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          episode_id?: string
          full_text?: string | null
          confidence?: number | null
          status?: "processing" | "completed" | "failed"
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          }
        ]
      }
      transcript_words: {
        Row: {
          id: string
          transcript_id: string
          word: string
          start_time: number
          end_time: number
          confidence: number | null
          speaker: string | null
          word_index: number
          created_at: string
        }
        Insert: {
          id?: string
          transcript_id: string
          word: string
          start_time: number
          end_time: number
          confidence?: number | null
          speaker?: string | null
          word_index: number
          created_at?: string
        }
        Update: {
          id?: string
          transcript_id?: string
          word?: string
          start_time?: number
          end_time?: number
          confidence?: number | null
          speaker?: string | null
          word_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_words_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          }
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
      episode_status: "uploading" | "processing" | "completed" | "failed"
      transcript_status: "processing" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
