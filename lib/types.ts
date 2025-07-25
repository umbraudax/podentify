import { Database } from './supabase';

// Database types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Episode = Database['public']['Tables']['episodes']['Row'];
export type SocialClip = Database['public']['Tables']['social_clips']['Row'];

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type EpisodeInsert = Database['public']['Tables']['episodes']['Insert'];
export type SocialClipInsert = Database['public']['Tables']['social_clips']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type EpisodeUpdate = Database['public']['Tables']['episodes']['Update'];
export type SocialClipUpdate = Database['public']['Tables']['social_clips']['Update'];

// User preferences types
export interface UserPreferences {
  user_id: string;
  dark_mode: boolean;
  email_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesInsert {
  user_id: string;
  dark_mode?: boolean;
  email_notifications?: boolean;
}

export interface UserPreferencesUpdate {
  dark_mode?: boolean;
  email_notifications?: boolean;
  updated_at?: string;
}

// Subscription types
export interface Subscription {
  customer_id: string;
  subscription_id: string | null;
  subscription_status: string;
  price_id: string | null;
  current_period_start: number | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

// Auth types
export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

// File upload types
export interface FileUploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}

// Transcript types
export interface Transcript {
  id: string;
  episode_id: string;
  full_text?: string;
  confidence?: number;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface TranscriptWord {
  id: string;
  transcript_id: string;
  word: string;
  start_time: number;
  end_time: number;
  confidence?: number;
  speaker?: string;
  word_index: number;
  created_at: string;
}

// AssemblyAI response types
export interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface AssemblyAITranscriptResponse {
  id: string;
  text: string;
  confidence: number;
  words: AssemblyAIWord[];
  utterances?: Array<{
    confidence: number;
    end: number;
    speaker: string;
    start: number;
    text: string;
    words: AssemblyAIWord[];
  }>;
}