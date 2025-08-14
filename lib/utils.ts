import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { SUPPORTED_AUDIO_FORMATS, SUPPORTED_VIDEO_FORMATS, SUPPORTED_MEDIA_FORMATS, MAX_FILE_SIZE, MEDIA_TYPES, MediaType } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a timestamp (in seconds) to a readable date string
 */
export function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'N/A';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Formats duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Validates if a file is a supported audio format
 */
export function isValidAudioFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? SUPPORTED_AUDIO_FORMATS.includes(extension) : false;
}

/**
 * Validates if a file is a supported video format
 */
export function isValidVideoFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? SUPPORTED_VIDEO_FORMATS.includes(extension) : false;
}

/**
 * Validates if a file is a supported media format (audio or video)
 */
export function isValidMediaFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? SUPPORTED_MEDIA_FORMATS.includes(extension) : false;
}

/**
 * Determines the media type of a file (audio or video)
 */
export function getMediaType(file: File): MediaType | null {
  if (isValidAudioFile(file)) return MEDIA_TYPES.AUDIO;
  if (isValidVideoFile(file)) return MEDIA_TYPES.VIDEO;
  return null;
}

/**
 * Gets the appropriate MIME type for a file extension
 */
export function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  // Audio MIME types
  const audioMimeTypes: { [key: string]: string } = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4'
  };
  
  // Video MIME types
  const videoMimeTypes: { [key: string]: string } = {
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'webm': 'video/webm'
  };
  
  if (ext) {
    if (audioMimeTypes[ext]) return audioMimeTypes[ext];
    if (videoMimeTypes[ext]) return videoMimeTypes[ext];
  }
  
  return 'application/octet-stream';
}

/**
 * Validates if a file size is within limits
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

/**
 * Formats file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Safely extracts user display name from auth user object
 */
export function getUserDisplayName(user: any): string {
  if (!user) return 'Unknown User';
  return user.user_metadata?.full_name || 
         user.user_metadata?.name || 
         user.email?.split('@')[0] || 
         'User';
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Returns Tailwind classes for subscription plan badges so colors are consistent site-wide
 * Basic: grey, Pro: blue, Ultra: purple
 */
export function getPlanBadgeClasses(plan: string): string {
  switch (plan) {
    case 'Ultra':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
    case 'Pro':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
  }
}