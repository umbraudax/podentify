// Application constants
export const APP_NAME = 'Podtentify';
export const APP_DESCRIPTION = 'Your Podcast Content, Amplified';

// Limits and constraints
export const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
export const SUPPORTED_AUDIO_FORMATS = ['mp3', 'wav', 'm4a'];
export const FREE_PLAN_EPISODE_LIMIT = 3;
export const FREE_PLAN_CLIPS_PER_EPISODE = 2;

// URLs and endpoints
export const SUPPORT_EMAIL = 'hello@podtentify.com';
export const HELP_CENTER_URL = '#help';
export const CONTACT_URL = '#contact';

// Processing statuses
export const EPISODE_STATUS = {
  UPLOADING: 'uploading',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type EpisodeStatus = typeof EPISODE_STATUS[keyof typeof EPISODE_STATUS];