import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader2 } from 'lucide-react';

interface MediaPlayerProps {
  src: string;
  mediaType: 'audio' | 'video';
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  currentTime?: number;
  duration?: number;
}

export interface MediaPlayerRef {
  play: () => Promise<void>;
  pause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  toggleMute: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
  mediaElement: HTMLVideoElement | HTMLAudioElement | null;
}

export const MediaPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(({
  src,
  mediaType,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  onError,
  currentTime = 0,
  duration = 0
}, ref) => {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Format time helper
  const formatTime = (time: number): string => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Media event handlers
  const handleTimeUpdate = () => {
    if (mediaRef.current && onTimeUpdate) {
      onTimeUpdate(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current && onLoadedMetadata) {
      onLoadedMetadata(mediaRef.current.duration);
      setIsLoaded(true);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onEnded) onEnded();
  };

  const handleError = () => {
    const errorMessage = `Failed to load ${mediaType}. Please try again.`;
    setError(errorMessage);
    if (onError) onError(errorMessage);
  };

  const handleCanPlay = () => {
    setIsLoaded(true);
  };

  // Control handlers
  const togglePlayPause = () => {
    if (!mediaRef.current || !isLoaded) return;

    if (isPlaying) {
      mediaRef.current.pause();
      setIsPlaying(false);
    } else {
      mediaRef.current.play();
      setIsPlaying(true);
    }
  };

  const skipBackward = () => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, mediaRef.current.currentTime - 15);
    }
  };

  const skipForward = () => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.min(duration, mediaRef.current.currentTime + 15);
    }
  };

  const jumpToTime = (time: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(false);
    if (mediaRef.current) {
      mediaRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      if (isMuted) {
        mediaRef.current.volume = volume;
        setIsMuted(false);
      } else {
        mediaRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    play: async () => {
      if (mediaRef.current) {
        await mediaRef.current.play();
        setIsPlaying(true);
      }
    },
    pause: () => {
      if (mediaRef.current) {
        mediaRef.current.pause();
        setIsPlaying(false);
      }
    },
    seekTo: (time: number) => {
      if (mediaRef.current) {
        mediaRef.current.currentTime = time;
      }
    },
    setVolume: (newVolume: number) => {
      setVolume(newVolume);
      setIsMuted(false);
      if (mediaRef.current) {
        mediaRef.current.volume = newVolume;
      }
    },
    setPlaybackRate: (rate: number) => {
      setPlaybackRate(rate);
      if (mediaRef.current) {
        mediaRef.current.playbackRate = rate;
      }
    },
    toggleMute: () => {
      if (mediaRef.current) {
        if (isMuted) {
          mediaRef.current.volume = volume;
          setIsMuted(false);
        } else {
          mediaRef.current.volume = 0;
          setIsMuted(true);
        }
      }
    },
    getCurrentTime: () => mediaRef.current?.currentTime || 0,
    getDuration: () => mediaRef.current?.duration || 0,
    isPlaying: () => isPlaying,
    mediaElement: mediaRef.current
  }), [isPlaying, volume, isMuted, playbackRate]);

  // Update media element when src changes
  useEffect(() => {
    if (mediaRef.current) {
      setIsLoaded(false);
      setError(null);
      setIsPlaying(false);
    }
  }, [src]);

  const mediaProps = {
    ref: mediaRef as any,
    src,
    onTimeUpdate: handleTimeUpdate,
    onLoadedMetadata: handleLoadedMetadata,
    onEnded: handleEnded,
    onError: handleError,
    onCanPlay: handleCanPlay,
    preload: "metadata" as const,
    crossOrigin: "anonymous" as const,
    controls: false, // We'll use custom controls
  };

  return (
    <Card className="bg-surface-primary border-border shadow-xl">
      <CardContent className="p-8">
        {/* Media Element */}
        {mediaType === 'video' ? (
          <div className="relative mb-6">
            <video
              {...mediaProps}
              className="w-full h-auto rounded-lg shadow-lg max-h-96"
              style={{ aspectRatio: '16/9' }}
            />
            {/* Video overlay controls will be handled by custom controls below */}
          </div>
        ) : (
          <>
            <audio {...mediaProps} />
            {/* Waveform Visualization for Audio */}
            <div className="w-full h-24 bg-gradient-to-r from-brand-tertiary/30 to-brand-secondary/30 rounded-lg mb-6 flex items-center justify-center">
              <div className="flex items-center space-x-1">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 bg-gradient-to-t from-brand-primary to-brand-secondary rounded-full transition-all duration-150 ${
                      isPlaying ? 'animate-pulse' : ''
                    }`}
                    style={{
                      height: `${Math.random() * 60 + 20}px`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div 
            className="w-full h-2 bg-surface-secondary rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              jumpToTime(percent * duration);
            }}
          >
            <div 
              className="h-2 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-full transition-all duration-200"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between text-sm text-text-tertiary">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={skipBackward}
            className="rounded-full w-12 h-12"
            disabled={!isLoaded}
          >
            <SkipBack className="w-5 h-5" />
          </Button>
          
          <Button 
            onClick={togglePlayPause} 
            size="lg"
            className="rounded-full w-16 h-16 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-90 border-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200 hover:shadow-xl"
            disabled={!isLoaded && !error}
          >
            {!isLoaded && !error ? (
              <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
            ) : isPlaying ? (
              <div className="flex items-center justify-center space-x-1">
                <div className="w-[3px] h-[16px] bg-primary-foreground rounded-sm drop-shadow-md"></div>
                <div className="w-[3px] h-[16px] bg-primary-foreground rounded-sm drop-shadow-md"></div>
              </div>
            ) : (
              <div className="w-0 h-0 border-l-[12px] border-l-primary-foreground border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1 drop-shadow-md"></div>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={skipForward}
            className="rounded-full w-12 h-12"
            disabled={!isLoaded}
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-center text-error text-sm mb-4">
            {error}
          </div>
        )}

        {/* Volume Control */}
        <div className="flex items-center space-x-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="p-2"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="flex-1 h-2 bg-surface-secondary rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Playback Speed */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-secondary">Speed</span>
          <div className="flex space-x-1">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <Button
                key={rate}
                variant={playbackRate === rate ? "default" : "ghost"}
                size="sm"
                onClick={() => changePlaybackRate(rate)}
                className="text-xs px-2 py-1 h-8"
              >
                {rate}x
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

MediaPlayer.displayName = 'MediaPlayer'; 