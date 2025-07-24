import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      episodes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          audio_url: string;
          duration: number | null;
          status: 'uploading' | 'processing' | 'completed' | 'failed';
          show_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          audio_url: string;
          duration?: number | null;
          status?: 'uploading' | 'processing' | 'completed' | 'failed';
          show_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          audio_url?: string;
          duration?: number | null;
          status?: 'uploading' | 'processing' | 'completed' | 'failed';
          show_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      social_clips: {
        Row: {
          id: string;
          episode_id: string;
          title: string;
          start_time: number;
          end_time: number;
          duration: number;
          engagement_score: number | null;
          clip_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          episode_id: string;
          title: string;
          start_time: number;
          end_time: number;
          duration: number;
          engagement_score?: number | null;
          clip_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          episode_id?: string;
          title?: string;
          start_time?: number;
          end_time?: number;
          duration?: number;
          engagement_score?: number | null;
          clip_url?: string | null;
          created_at?: string;
        };
      };
    };
  };
};