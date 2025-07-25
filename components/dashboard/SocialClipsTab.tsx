'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Play, 
  Download, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Loader2,
  Pause
} from 'lucide-react';
import { SocialClip, TranscriptWord } from '@/lib/types';

interface SocialClipsTabProps {
  clips: SocialClip[];
  transcriptWords: TranscriptWord[];
  onPreview: (startTime: number, endTime: number) => void;
  onDownload: (clipId: string, title: string) => void;
  onGenerateClips: () => void;
  onGenerateMoreClips?: () => void;
  isGenerating: boolean;
  isPlaying: boolean;
  currentTime: number;
  currentPreviewClip: string | null;
}

export default function SocialClipsTab({
  clips,
  transcriptWords,
  onPreview,
  onDownload,
  onGenerateClips,
  onGenerateMoreClips,
  isGenerating,
  isPlaying,
  currentTime,
  currentPreviewClip
}: SocialClipsTabProps) {
  const [hoveredClip, setHoveredClip] = useState<string | null>(null);
  const [downloadingClips, setDownloadingClips] = useState<Set<string>>(new Set());

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (score >= 40) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getEngagementLabel = (score: number) => {
    if (score >= 80) return 'High Impact';
    if (score >= 60) return 'Viral Potential';
    if (score >= 40) return 'Thought-Provoking';
    return 'Interesting';
  };

  const getClipTranscript = (clip: SocialClip) => {
    if (transcriptWords.length === 0) return '';
    
    const wordsInClip = transcriptWords.filter(
      word => word.start_time >= clip.start_time && word.end_time <= clip.end_time
    );
    
    return wordsInClip.map(word => word.word).join(' ');
  };

  const handleDownload = async (clipId: string, title: string) => {
    setDownloadingClips(prev => new Set(prev).add(clipId));
    try {
      await onDownload(clipId, title);
    } finally {
      setDownloadingClips(prev => {
        const newSet = new Set(prev);
        newSet.delete(clipId);
        return newSet;
      });
    }
  };

  const isClipCurrentlyPlaying = (clip: SocialClip) => {
    return currentPreviewClip === clip.id && 
           isPlaying && 
           currentTime >= clip.start_time && 
           currentTime <= clip.end_time;
  };

  if (clips.length === 0 && !isGenerating) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Social Clips Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Generate AI-powered viral clips perfect for TikTok, Instagram Reels, and Twitter
        </p>
        <Button 
          onClick={onGenerateClips}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate Social Clips
        </Button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Generating Social Clips
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          AI is identifying the most engaging moments from your content...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Social Media Clips
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {clips.length} clips found
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={onGenerateMoreClips || onGenerateClips}
          disabled={isGenerating}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate More
        </Button>
      </div>

      {/* Clips Grid */}
      <div className="space-y-4">
        {clips.map((clip) => {
          const isHovered = hoveredClip === clip.id;
          const isDownloading = downloadingClips.has(clip.id);
          const isCurrentlyPlaying = isClipCurrentlyPlaying(clip);
          const clipTranscript = getClipTranscript(clip);

          return (
            <TooltipProvider key={clip.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredClip(clip.id)}
                    onMouseLeave={() => setHoveredClip(null)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex-1 mr-4">
                        {clip.title}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-medium ${getEngagementColor(clip.engagement_score || 50)}`}
                      >
                        {getEngagementLabel(clip.engagement_score || 50)}
                      </Badge>
                    </div>
                    
                    {/* Waveform Visualization */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-1 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                        {Array.from({ length: 40 }).map((_, i) => {
                          const progress = (currentTime - clip.start_time) / (clip.end_time - clip.start_time);
                          const isActive = isCurrentlyPlaying && i / 40 <= progress;
                          
                          return (
                            <div 
                              key={i} 
                              className={`w-1 rounded-full transition-all duration-300 ${
                                isActive
                                  ? clip.engagement_score && clip.engagement_score >= 80 ? 'bg-green-500' :
                                    clip.engagement_score && clip.engagement_score >= 60 ? 'bg-blue-500' :
                                    'bg-purple-500'
                                  : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                              style={{ 
                                height: `${Math.random() * 32 + 8}px`,
                                opacity: isCurrentlyPlaying && isActive ? 1 : 0.6
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Time info */}
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">
                              {formatTime(clip.duration)}
                            </span>
                          </div>
                          <span>
                            {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(clip.start_time, clip.end_time);
                          }}
                        >
                          {isCurrentlyPlaying ? (
                            <Pause className="w-3 h-3 mr-1" />
                          ) : (
                            <Play className="w-3 h-3 mr-1" />
                          )}
                          Preview
                        </Button>
                        <Button 
                          size="sm" 
                          className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(clip.id, clip.title);
                          }}
                          disabled={isDownloading}
                        >
                          {isDownloading ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3 mr-1" />
                          )}
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-md">
                  <div>
                    <div className="font-medium mb-2">{clip.title}</div>
                    <div className="text-sm opacity-90 mb-2">
                      {formatTime(clip.start_time)} - {formatTime(clip.end_time)} 
                      ({formatTime(clip.duration)})
                    </div>
                    {clipTranscript && (
                      <div className="text-sm opacity-75 max-h-24 overflow-y-auto">
                        <strong>Transcript:</strong><br />
                        "{clipTranscript.substring(0, 200)}{clipTranscript.length > 200 ? '...' : ''}"
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      {/* Generate more button */}
      {clips.length > 0 && (
        <div className="text-center pt-4">
          <Button 
            variant="outline" 
            onClick={onGenerateMoreClips || onGenerateClips}
            disabled={isGenerating}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate More Clips
          </Button>
        </div>
      )}
    </div>
  );
} 