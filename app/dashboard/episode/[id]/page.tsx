'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  RotateCcw, 
  SkipBack, 
  SkipForward,
  Loader2,
  ArrowLeft,
  Download,
  Share2,
  Waves,
  Clock,
  Users,
  Trash2,
  AlertCircle,
  User,
  LogOut,
  Settings,
  Coins
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Episode, Transcript, TranscriptWord, Chapter, SocialClip } from '@/lib/types';
import ChaptersSection from '@/components/dashboard/ChaptersSection';
import SocialClipsSection from '@/components/dashboard/SocialClipsSection';
import { MediaPlayer, MediaPlayerRef } from '@/components/MediaPlayer';
import { getUserDisplayName } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function EpisodeProcessingPage() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const { getSubscriptionPlan } = useSubscription();
  const { credits, loading: creditsLoading, getCreditStatus, refresh: refreshCredits } = useCredits();
  const router = useRouter();
  const params = useParams();
  const episodeId = params.id as string;
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [transcriptWords, setTranscriptWords] = useState<TranscriptWord[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [socialClips, setSocialClips] = useState<SocialClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [isGeneratingChapters, setIsGeneratingChapters] = useState(false);
  const [isGeneratingClips, setIsGeneratingClips] = useState(false);
  const [currentPreviewClip, setCurrentPreviewClip] = useState<string | null>(null);
  const [previewEndTime, setPreviewEndTime] = useState<number | null>(null);
  const [fetchRetryCount, setFetchRetryCount] = useState(0);
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);
  
  const mediaPlayerRef = useRef<MediaPlayerRef>(null);
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  // Signed media URL fetched from server
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);

  // Check if transcript is ready for generating chapters/clips
  const isTranscriptReady = transcript?.status === 'completed';

  useEffect(() => {
    // Fetch a short‑lived signed media URL when we have an episode and session
    const fetchSignedUrl = async () => {
      try {
        if (!episode?.id || !session?.access_token) return;
        const res = await fetch(`/api/media-url/${episode.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          console.error('Failed to fetch signed media URL');
          return;
        }
        const data = await res.json();
        setMediaUrl(data.url);
      } catch (e) {
        console.error('Error fetching signed media URL:', e);
      }
    };

    fetchSignedUrl();
  }, [episode?.id, session?.access_token]);

  useEffect(() => {
    console.log('🔄 Initial useEffect triggered:', {
      authLoading,
      hasUser: !!user,
      userId: user?.id,
      episodeId,
      currentTranscriptStatus: transcript?.status,
      sessionPresent: !!session
    });

    if (!authLoading && !user) {
      console.log('❌ No user, redirecting to home');
      router.push('/');
      return;
    }
    
    if (episodeId && user && session) {
      console.log('✅ Conditions met, fetching episode data');
      setLastFetchError(null);
      fetchEpisodeData();
    } else {
      console.log('⏸️ Conditions not met for fetching:', { 
        episodeId: !!episodeId, 
        user: !!user, 
        session: !!session,
        authLoading 
      });
    }
  }, [episodeId, user, authLoading, session]);

  // Retry mechanism for failed fetches
  useEffect(() => {
    if (lastFetchError && fetchRetryCount < 3) {
      console.log(`🔄 Retrying fetch due to error (attempt ${fetchRetryCount + 1}/3):`, lastFetchError);
      const retryTimeout = setTimeout(() => {
        setFetchRetryCount(prev => prev + 1);
        fetchEpisodeData();
      }, 2000 * (fetchRetryCount + 1)); // Exponential backoff

      return () => clearTimeout(retryTimeout);
    }
  }, [lastFetchError, fetchRetryCount]);

  // Polling effect for transcript updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // Only poll if transcript is processing
    if (transcript?.status === 'processing' || (episode?.status === 'processing' && !transcript)) {
      console.log('🔄 Starting polling for transcript updates...', {
        transcriptStatus: transcript?.status,
        episodeStatus: episode?.status,
        hasTranscript: !!transcript
      });
      intervalId = setInterval(() => {
        console.log('⏰ Polling interval fired - fetching updates...');
        fetchEpisodeData();
      }, 5000); // Poll every 5 seconds
    } else {
      console.log('⏹️ Stopping polling - transcript status:', transcript?.status, 'episode status:', episode?.status);
    }
    
    return () => {
      if (intervalId) {
        console.log('🧹 Cleaning up polling interval');
        clearInterval(intervalId);
      }
    };
  }, [transcript?.status, episode?.status]);

  useEffect(() => {
    // Update current word based on playback time
    if (transcriptWords.length > 0) {
      const currentWord = transcriptWords.find(
        (word, index) => 
          currentTime >= word.start_time && 
          currentTime <= word.end_time
      );
      
      if (currentWord) {
        const index = transcriptWords.findIndex(w => w.id === currentWord.id);
        setCurrentWordIndex(index);
      }
    }

    // Handle clip preview end time
    if (previewEndTime && currentTime >= previewEndTime) {
      setIsPlaying(false);
      setCurrentPreviewClip(null);
      setPreviewEndTime(null);
      if (mediaPlayerRef.current) {
        mediaPlayerRef.current.pause();
      }
    }
  }, [currentTime, transcriptWords, previewEndTime]);

  const fetchEpisodeData = async () => {
    if (!user?.id) {
      console.error('User not authenticated');
      setLastFetchError('User not authenticated');
      return;
    }

    if (!session?.access_token) {
      console.error('No session token available');
      setLastFetchError('No session available');
      return;
    }

    console.log('🔄 Fetching episode data for ID:', episodeId);

    try {
      // Fetch episode data with proper user verification
      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', episodeId)
        .eq('user_id', user.id)
        .single();

      if (episodeError) {
        console.error('Episode fetch error:', episodeError);
        setLastFetchError(`Episode fetch failed: ${episodeError.message}`);
        return;
      }

      console.log('📺 Episode data:', episodeData);
      setEpisode(episodeData);

      // Fetch transcript if it exists
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('episode_id', episodeId)
        .single();

      console.log('📝 Transcript query result:', { 
        transcriptData: transcriptData ? {
          id: transcriptData.id,
          status: transcriptData.status,
          full_text: transcriptData.full_text ? 'present' : 'null',
          confidence: transcriptData.confidence
        } : null, 
        transcriptError: transcriptError ? {
          code: transcriptError.code,
          message: transcriptError.message
        } : null
      });

      if (!transcriptError && transcriptData) {
        // Convert null values to undefined for TypeScript compatibility
        const processedTranscript: Transcript = {
          ...transcriptData,
          full_text: transcriptData.full_text ?? undefined,
          confidence: transcriptData.confidence ?? undefined,
          status: transcriptData.status as 'processing' | 'completed' | 'failed',
          created_at: transcriptData.created_at || new Date().toISOString(),
          updated_at: transcriptData.updated_at || new Date().toISOString(),
        };
        console.log('✅ Setting transcript state:', {
          id: processedTranscript.id,
          status: processedTranscript.status,
          hasFullText: !!processedTranscript.full_text
        });
        setTranscript(processedTranscript);
        
        // Fetch transcript words if transcript is completed
        if (transcriptData.status === 'completed') {
          console.log('🔤 Fetching transcript words for completed transcript...');
          const { data: wordsData, error: wordsError } = await supabase
            .from('transcript_words')
            .select('*')
            .eq('transcript_id', transcriptData.id)
            .order('word_index');

          console.log('🔤 Words query result:', { 
            wordCount: wordsData?.length || 0, 
            wordsError: wordsError ? {
              code: wordsError.code,
              message: wordsError.message
            } : null
          });

          if (!wordsError && wordsData) {
            // Convert null values to undefined for TypeScript compatibility
            const processedWords: TranscriptWord[] = wordsData.map(word => ({
              id: word.id,
              transcript_id: word.transcript_id,
              word: word.word,
              start_time: word.start_time,
              end_time: word.end_time,
              confidence: word.confidence ?? undefined,
              speaker: word.speaker ?? undefined,
              word_index: word.word_index,
              created_at: word.created_at || new Date().toISOString(),
            }));
            console.log('✅ Setting transcript words:', processedWords.length);
            setTranscriptWords(processedWords);
          } else {
            console.log('⚠️ No transcript words found or error occurred');
            setTranscriptWords([]);
          }
        } else {
          console.log('📝 Transcript not completed, clearing words');
          setTranscriptWords([]);
        }
      } else {
        console.log('❌ No transcript found or error occurred, clearing transcript state');
        setTranscript(null);
        setTranscriptWords([]);
      }

      // Fetch chapters
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('chapters')
        .select('*')
        .eq('episode_id', episodeId)
        .order('chapter_index');

      if (!chaptersError && chaptersData) {
        setChapters(chaptersData);
      }

      // Fetch social clips
      const { data: clipsData, error: clipsError } = await supabase
        .from('social_clips')
        .select('*')
        .eq('episode_id', episodeId)
        .order('engagement_score', { ascending: false });

      if (!clipsError && clipsData) {
        setSocialClips(clipsData);
      }

      // Success - clear error states
      setLastFetchError(null);
      setFetchRetryCount(0);

    } catch (error) {
      console.error('❌ Error fetching episode data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastFetchError(`Failed to fetch episode data: ${errorMessage}`);
      
      // Don't clear states on network errors, but log the issue
      console.log('Current states after error:', {
        hasEpisode: !!episode,
        hasTranscript: !!transcript,
        transcriptStatus: transcript?.status,
        wordCount: transcriptWords.length
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to download transcript in speaker-split format
  const downloadTranscript = () => {
    if (!transcript || !transcriptWords.length || !episode) {
      return;
    }

    // Group words by speaker and create formatted transcript
    let formattedTranscript = `Transcript: ${episode.title}\n`;
    formattedTranscript += `Generated: ${new Date().toLocaleDateString()}\n`;
    formattedTranscript += `Duration: ${episode.duration ? Math.floor(episode.duration / 60) + 'm ' + Math.floor(episode.duration % 60) + 's' : 'Unknown'}\n\n`;
    
    let currentSpeaker = '';
    let currentSentence = '';
    let sentenceStartTime = 0;
    
    transcriptWords.forEach((word, index) => {
      const speaker = word.speaker || 'Unknown Speaker';
      
      // If speaker changes, finalize previous sentence and start new one
      if (speaker !== currentSpeaker) {
        if (currentSentence.trim()) {
          const timeString = `[${formatTime(sentenceStartTime)}]`;
          formattedTranscript += `${currentSpeaker}: ${timeString} ${currentSentence.trim()}\n\n`;
        }
        currentSpeaker = speaker;
        currentSentence = word.word;
        sentenceStartTime = word.start_time;
      } else {
        currentSentence += ' ' + word.word;
      }
      
      // End sentence on punctuation
      if (word.word.match(/[.!?]$/)) {
        const timeString = `[${formatTime(sentenceStartTime)}]`;
        formattedTranscript += `${currentSpeaker}: ${timeString} ${currentSentence.trim()}\n\n`;
        currentSentence = '';
        sentenceStartTime = index < transcriptWords.length - 1 ? transcriptWords[index + 1].start_time : word.end_time;
      }
    });
    
    // Add final sentence if exists
    if (currentSentence.trim()) {
      const timeString = `[${formatTime(sentenceStartTime)}]`;
      formattedTranscript += `${currentSpeaker}: ${timeString} ${currentSentence.trim()}\n`;
    }

    // Create and download file
    const blob = new Blob([formattedTranscript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${episode.title || 'transcript'}-speaker-split.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Media event handlers
  const handleLoadedMetadata = (duration: number) => {
    setDuration(duration);
    setAudioLoaded(true);
    setAudioError(null);
    console.log('Media metadata loaded, duration:', duration);
  };

  const handleTimeUpdate = (currentTime: number) => {
    setCurrentTime(currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAudioError = (error: string) => {
    console.error('Media loading error:', error);
    console.error('Media source:', mediaUrl);
    setAudioError(error);
    setAudioLoaded(false);
  };

  // Media player controls
  const togglePlayPause = async () => {
    if (!mediaPlayerRef.current) return;
    
    try {
      if (isPlaying) {
        mediaPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        await mediaPlayerRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing media:', error);
    }
  };

  const skipBackward = () => {
    if (mediaPlayerRef.current) {
      const currentTime = mediaPlayerRef.current.getCurrentTime();
      mediaPlayerRef.current.seekTo(Math.max(0, currentTime - 10));
    }
  };

  const skipForward = () => {
    if (mediaPlayerRef.current) {
      const currentTime = mediaPlayerRef.current.getCurrentTime();
      mediaPlayerRef.current.seekTo(Math.min(duration, currentTime + 10));
    }
  };

  const jumpToTime = (time: number) => {
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.seekTo(time);
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.setVolume(newVolume);
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.toggleMute();
      setIsMuted(!isMuted);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (mediaPlayerRef.current) {
      mediaPlayerRef.current.setPlaybackRate(rate);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker?: string) => {
    if (!speaker) return 'text-text-secondary';
    
    const colors = [
      'text-blue-600 dark:text-blue-400',
      'text-green-600 dark:text-green-400', 
      'text-purple-600 dark:text-purple-400',
      'text-orange-600 dark:text-orange-400',
      'text-pink-600 dark:text-pink-400',
      'text-indigo-600 dark:text-indigo-400',
      'text-red-600 dark:text-red-400',
      'text-yellow-600 dark:text-yellow-400'
    ];
    
    const hash = speaker.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getSpeakerBackgroundColor = (speaker?: string) => {
    if (!speaker) return 'bg-surface-secondary';
    
    const colors = [
      'bg-blue-50 dark:bg-blue-900/20',
      'bg-green-50 dark:bg-green-900/20', 
      'bg-purple-50 dark:bg-purple-900/20',
      'bg-orange-50 dark:bg-orange-900/20',
      'bg-pink-50 dark:bg-pink-900/20',
      'bg-indigo-50 dark:bg-indigo-900/20',
      'bg-red-50 dark:bg-red-900/20',
      'bg-yellow-50 dark:bg-yellow-900/20'
    ];
    
    const hash = speaker.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getUniqueSpeakers = () => {
    const speakers = transcriptWords
      .map(word => word.speaker)
      .filter(Boolean)
      .filter((speaker, index, arr) => arr.indexOf(speaker) === index);
    return speakers;
  };

  const generateChapters = async () => {
    if (!episode || !session) return;
    
    setIsGeneratingChapters(true);
    try {
      const response = await fetch('/api/analyze/chapters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ episodeId: episode.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate chapters');
      }

      const result = await response.json();
      
      // Refresh data to get updated chapters
      await fetchEpisodeData();
    } catch (error) {
      console.error('Error generating chapters:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate chapters');
    } finally {
      setIsGeneratingChapters(false);
    }
  };

  const generateSocialClips = async (generateMore = false) => {
    if (!episode || !session) return;
    
    setIsGeneratingClips(true);
    try {
      const response = await fetch('/api/analyze/clips', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          episodeId: episode.id,
          generateMore 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate social clips');
      }

      const result = await response.json();
      
      if (generateMore) {
        // For additional clips, immediately refresh credits to show deduction
        refreshCredits();
        
        // Fetch only the latest clips and append them
        const { data: updatedClips, error: clipsError } = await supabase
          .from('social_clips')
          .select('*')
          .eq('episode_id', episode.id)
          .order('created_at', { ascending: false });

        if (!clipsError && updatedClips) {
          // Find clips that weren't in the previous list (newly generated ones)
          const existingClipIds = new Set(socialClips.map(clip => clip.id));
          const newClips = updatedClips.filter(clip => !existingClipIds.has(clip.id));
          
          // Append new clips to existing ones, sort by engagement score
          const combinedClips = [...socialClips, ...newClips]
            .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0));
          
          setSocialClips(combinedClips);
        }
      } else {
        // For initial generation, refresh all data as before
        await fetchEpisodeData();
      }
    } catch (error) {
      console.error('Error generating social clips:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate social clips');
    } finally {
      setIsGeneratingClips(false);
    }
  };

  const handlePreviewClip = (startTime: number, endTime: number) => {
    if (!mediaPlayerRef.current) return;
    
    // If currently playing the same clip, pause it
    if (currentPreviewClip && isPlaying && currentTime >= startTime && currentTime <= endTime) {
      setIsPlaying(false);
      setCurrentPreviewClip(null);
      setPreviewEndTime(null);
      mediaPlayerRef.current.pause();
      return;
    }
    
    // Start playing the clip
    mediaPlayerRef.current.seekTo(startTime);
    setCurrentPreviewClip(socialClips.find(clip => clip.start_time === startTime)?.id || null);
    setPreviewEndTime(endTime);
    mediaPlayerRef.current.play();
    setIsPlaying(true);
  };

  const handleDownloadClip = async (clipId: string, title: string) => {
    if (!session) return;
    
    try {
      const response = await fetch(`/api/clips/${clipId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download clip');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Set appropriate file extension based on media type
      const extension = episode?.media_type === 'video' ? '.mp4' : '.mp3';
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading clip:', error);
      alert('Failed to download clip');
    }
  };

  const handleDeleteEpisode = async () => {
    if (!episode) return;
    
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/episodes/${episode.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete episode');
      }

      // Redirect to dashboard after successful deletion
      router.push('/dashboard');
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete episode');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Credit status styling
  const getCreditStatusColor = () => {
    const status = getCreditStatus();
    switch (status) {
      case 'insufficient': return 'text-error';
      case 'low': return 'text-warning';
      default: return 'text-success';
    }
  };

  const getCreditStatusBg = () => {
    const status = getCreditStatus();
    switch (status) {
      case 'insufficient': return 'bg-error/10 border-error/20';
      case 'low': return 'bg-warning/10 border-warning/20';
      default: return 'bg-success/10 border-success/20';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-brand-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading episode...</p>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            Episode not found
          </h2>
          <p className="text-text-secondary mb-6">
            This episode doesn't exist or you don't have permission to access it.
          </p>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const userDisplayName = getUserDisplayName(user);
  const subscriptionPlan = getSubscriptionPlan();

  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <div className="bg-surface-primary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Clickable Logo */}
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-1 hover:opacity-80 transition-opacity"
              >
                <Image src="/podentify-logo.png" alt="Podentify logo" width={40} height={40} className="w-10 h-10" />
                <span className="text-xl font-bold text-text-primary">Podentify</span>
              </button>
            </div>
            <div className="flex items-center space-x-3">
              {/* Credits Display */}
              {user && !authLoading && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer ${getCreditStatusBg()}`}>
                        <Coins className={`w-4 h-4 ${getCreditStatusColor()}`} />
                        <div className="text-sm">
                          {creditsLoading ? (
                            <div className="flex items-center space-x-1">
                              <div className="w-4 h-4 border-2 border-border border-t-brand-primary rounded-full animate-spin"></div>
                              <span className="text-text-secondary">Loading...</span>
                            </div>
                          ) : credits ? (
                            <>
                              <span className={`font-semibold ${getCreditStatusColor()}`}>
                                {credits.current_credits}
                              </span>
                              <span className="text-text-secondary ml-1">
                                credits
                              </span>
                            </>
                          ) : (
                            <span className="text-text-secondary">--</span>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-1 text-sm">
                        {credits ? (
                          <>
                            <div className="flex justify-between">
                              <span>Current credits:</span>
                              <span className="font-semibold">{credits.current_credits}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Monthly allocation:</span>
                              <span>{credits.monthly_credits}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total used:</span>
                              <span>{credits.total_used_credits}</span>
                            </div>
                            <div className="border-t border-border pt-1 mt-2">
                              <p className="text-xs text-text-secondary">
                                1 credit = 1 minute of transcription
                              </p>
                            </div>
                          </>
                        ) : (
                          <p className="text-text-secondary">No credits data available.</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Return to Dashboard Button */}
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="border-border hover:border-brand-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 border-border hover:border-brand-primary">
                    <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-text-primary font-medium">{userDisplayName}</span>
                      {subscriptionPlan && (
                        <Badge variant="secondary" className="text-xs bg-brand-tertiary text-brand-primary">
                          {subscriptionPlan}
                        </Badge>
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push('/account/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Episode Title Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-text-primary mb-2">
                {episode.title}
              </h1>
              {episode.description && (
                <p className="text-lg text-text-secondary mb-4">
                  {episode.description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-sm text-text-tertiary">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{episode.created_at ? new Date(episode.created_at).toLocaleDateString() : 'Unknown date'}</span>
                </div>
                {episode.duration && (
                  <div className="flex items-center space-x-1">
                    <Waves className="w-4 h-4" />
                    <span>{Math.floor(episode.duration / 60)}m {Math.floor(episode.duration % 60)}s</span>
                  </div>
                )}
                {transcriptWords.length > 0 && getUniqueSpeakers().length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{getUniqueSpeakers().length} speakers</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={episode.status === 'completed' ? 'default' : 
                        episode.status === 'failed' ? 'destructive' : 'secondary'}
                className="text-sm px-3 py-1"
              >
                {episode.status}
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-error hover:text-error/90 hover:bg-error/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Media Player & Chapters */}
          <div className="xl:col-span-1 space-y-6">
            {/* Media Player */}
            {mediaUrl && (
              <MediaPlayer
                ref={mediaPlayerRef}
                src={mediaUrl}
                mediaType={episode?.media_type === 'video' ? 'video' : 'audio'}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onError={handleAudioError}
                currentTime={currentTime}
                duration={duration}
              />
            )}

            {/* Chapters Section */}
            <ChaptersSection
              chapters={chapters}
              currentTime={currentTime}
              onSeek={jumpToTime}
              onGenerateChapters={generateChapters}
              isGenerating={isGeneratingChapters}
              disabled={!isTranscriptReady}
            />
          </div>

          {/* Right Column - Transcript & Social Clips */}
          <div className="xl:col-span-2 space-y-6">
            {/* Transcript Section */}
            <Card className="bg-surface-primary border-border shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Transcript</span>
                  <div className="flex items-center space-x-2">
                    {transcript && transcript.confidence && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(transcript.confidence * 100)}% confidence
                      </Badge>
                    )}
                    {transcript?.status === 'completed' && transcriptWords.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={downloadTranscript}
                        className="text-brand-primary hover:text-brand-primary/90 hover:bg-brand-primary/10"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!transcript ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      {lastFetchError ? (
                        <>
                          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-error" />
                          <p className="text-error mb-2 font-semibold">
                            Connection Issue
                          </p>
                          <p className="text-sm text-text-tertiary mb-4">
                            {lastFetchError}
                          </p>
                          {fetchRetryCount < 3 ? (
                            <div className="mb-4">
                              <div className="flex items-center justify-center space-x-2 mb-2">
                                <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                                <span className="text-sm text-text-secondary">
                                  Retrying... (Attempt {fetchRetryCount + 1}/3)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setFetchRetryCount(0);
                                setLastFetchError(null);
                                fetchEpisodeData();
                              }}
                              className="px-4 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                            >
                              Try Again
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-brand-primary" />
                          <p className="text-text-secondary mb-2">
                            Generating transcript...
                          </p>
                          <p className="text-sm text-text-tertiary">
                            This usually takes 2-5 minutes
                          </p>
                          <button
                            onClick={fetchEpisodeData}
                            className="mt-4 px-4 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                          >
                            Check Status
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : transcript.status === 'processing' ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-brand-tertiary border-t-brand-primary rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-text-secondary mb-2">
                        Processing transcript...
                      </p>
                      <p className="text-sm text-text-tertiary mb-4">
                        This may take a few minutes. Page will auto-refresh.
                      </p>
                      <button
                        onClick={fetchEpisodeData}
                        className="px-4 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                      >
                        Refresh Now
                      </button>
                    </div>
                  </div>
                ) : transcript.status === 'failed' ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <AlertCircle className="w-16 h-16 text-error mx-auto mb-4" />
                      <p className="text-error mb-2 font-semibold">
                        Transcript generation failed
                      </p>
                      <p className="text-sm text-text-tertiary mb-4">
                        Please try uploading your file again or contact support.
                      </p>
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="px-4 py-2 text-sm bg-surface-tertiary text-text-primary rounded-lg hover:bg-surface-tertiary/80 transition-colors"
                      >
                        Back to Dashboard
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Speaker Legend */}
                    {getUniqueSpeakers().length > 0 && (
                      <div className="flex flex-wrap gap-2 p-4 bg-surface-secondary rounded-lg">
                        <span className="text-sm font-medium text-text-primary mr-2">
                          Speakers:
                        </span>
                        {getUniqueSpeakers().map((speaker) => (
                          <div
                            key={speaker}
                            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${getSpeakerBackgroundColor(speaker)} ${getSpeakerColor(speaker)}`}
                          >
                            <div className={`w-2 h-2 rounded-full ${getSpeakerColor(speaker)?.replace('text-', 'bg-')}`} />
                            <span>{speaker}</span>
                          </div>
                        ))}
                      </div>
                    )}

                                         {/* Transcript Words */}
                     <div className="space-y-1 max-h-96 overflow-y-auto">
                       <TooltipProvider>
                         {transcriptWords.length > 0 ? (
                           <div className="leading-relaxed text-lg">
                             {transcriptWords.map((word, index) => (
                               <Tooltip key={word.id}>
                                 <TooltipTrigger asChild>
                                   <span
                                     className={`inline-block px-1 py-0.5 mx-0.5 rounded cursor-pointer transition-all duration-200 ${getSpeakerColor(word.speaker)} ${
                                       currentWordIndex === index 
                                         ? `${getSpeakerBackgroundColor(word.speaker)} ring-2 ring-brand-primary shadow-sm`
                                         : hoveredWordIndex === index 
                                           ? `${getSpeakerBackgroundColor(word.speaker)} shadow-sm`
                                           : 'hover:bg-surface-secondary'
                                     }`}
                                     onMouseEnter={() => setHoveredWordIndex(index)}
                                     onMouseLeave={() => setHoveredWordIndex(null)}
                                     onClick={() => jumpToTime(word.start_time)}
                                   >
                                     {word.word}
                                   </span>
                                 </TooltipTrigger>
                                 <TooltipContent className="bg-surface-tertiary text-text-primary border-border">
                                   <div className="text-center">
                                     <div className="font-medium">
                                       {word.speaker || 'Unknown Speaker'}
                                     </div>
                                     <div className="text-sm opacity-90">
                                       {formatTime(word.start_time)} - {formatTime(word.end_time)}
                                     </div>
                                     {word.confidence && (
                                       <div className="text-xs opacity-75">
                                         {Math.round(word.confidence * 100)}% confidence
                                       </div>
                                     )}
                                   </div>
                                 </TooltipContent>
                               </Tooltip>
                             ))}
                           </div>
                         ) : (
                           <div className="prose dark:prose-invert max-w-none">
                             <p className="whitespace-pre-wrap text-lg leading-relaxed text-text-primary">
                               {transcript.full_text}
                             </p>
                           </div>
                         )}
                       </TooltipProvider>
                     </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Clips Section */}
            <SocialClipsSection
              clips={socialClips}
              transcriptWords={transcriptWords}
              onPreview={handlePreviewClip}
              onDownload={handleDownloadClip}
              onGenerateClips={() => generateSocialClips(false)}
              onGenerateMoreClips={() => generateSocialClips(true)}
              isGenerating={isGeneratingClips}
              isPlaying={isPlaying}
              currentTime={currentTime}
              currentPreviewClip={currentPreviewClip}
              disabled={!isTranscriptReady}
            />
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-50">
            <div className="bg-surface-primary rounded-lg p-6 max-w-md w-full border border-border">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                Delete Episode
              </h3>
              <p className="text-text-secondary mb-6">
                Are you sure you want to delete "{episode?.title}"? This action cannot be undone and will permanently remove the episode, transcript, and audio file.
              </p>
              <div className="flex space-x-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteEpisode}
                  disabled={isDeleting}
                  className="bg-error hover:bg-error/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 