'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
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
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Episode, Transcript, TranscriptWord } from '@/lib/types';

export default function EpisodeProcessingPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const episodeId = params.id as string;
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [transcriptWords, setTranscriptWords] = useState<TranscriptWord[]>([]);
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
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number | null>(null);

  // Create authenticated audio URL
  const authenticatedAudioUrl = episode?.audio_url && session?.access_token 
    ? `${episode.audio_url}?token=${session.access_token}`
    : episode?.audio_url;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }
    
    if (episodeId && user) {
      fetchEpisodeData();
    }
  }, [episodeId, user, authLoading]);

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
  }, [currentTime, transcriptWords]);

  const fetchEpisodeData = async () => {
    try {
      // Fetch episode data with proper user verification
      const { data: episodeData, error: episodeError } = await supabase
        .from('episodes')
        .select('*')
        .eq('id', episodeId)
        .eq('user_id', user?.id)
        .single();

      if (episodeError) throw episodeError;
      setEpisode(episodeData);

      // Fetch transcript if it exists
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('episode_id', episodeId)
        .single();

      if (!transcriptError && transcriptData) {
        setTranscript(transcriptData);
        
        // Fetch transcript words if transcript is completed
        if (transcriptData.status === 'completed') {
          const { data: wordsData, error: wordsError } = await supabase
            .from('transcript_words')
            .select('*')
            .eq('transcript_id', transcriptData.id)
            .order('word_index');

          if (!wordsError && wordsData) {
            setTranscriptWords(wordsData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching episode data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Audio event handlers
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setAudioLoaded(true);
      setAudioError(null);
      console.log('Audio metadata loaded, duration:', audioRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAudioError = (e: any) => {
    console.error('Audio loading error:', e);
    console.error('Audio source:', authenticatedAudioUrl);
    console.error('Audio element:', audioRef.current);
    setAudioError('Failed to load audio file');
    setAudioLoaded(false);
  };

  const handleLoadStart = () => {
    console.log('Audio loading started for:', authenticatedAudioUrl);
    setAudioError(null);
  };

  // Audio player controls
  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
    }
  };

  const jumpToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.volume = newMuted ? 0 : volume;
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speaker?: string) => {
    if (!speaker) return 'text-gray-700 dark:text-gray-300';
    
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
    if (!speaker) return 'bg-gray-100 dark:bg-gray-800';
    
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading episode...</p>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Episode not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard')}
            className="mb-6 hover:bg-white/50 dark:hover:bg-gray-800/50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {episode.title}
              </h1>
              {episode.description && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                  {episode.description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(episode.created_at).toLocaleDateString()}</span>
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
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Modern Audio Player */}
          <div className="xl:col-span-1">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardContent className="p-8">
                                 {/* Audio Element */}
                 <audio
                   ref={audioRef}
                   src={authenticatedAudioUrl}
                   onTimeUpdate={handleTimeUpdate}
                   onLoadedMetadata={handleLoadedMetadata}
                   onEnded={handleEnded}
                   onError={handleAudioError}
                   onLoadStart={handleLoadStart}
                   onCanPlay={() => {
                     console.log('Audio can start playing');
                     setAudioLoaded(true);
                   }}
                   preload="metadata"
                   crossOrigin="use-credentials"
                 />

                {/* Waveform Visualization Placeholder */}
                <div className="w-full h-24 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg mb-6 flex items-center justify-center">
                  <div className="flex items-center space-x-1">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-full transition-all duration-150 ${
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

                                 {/* Progress Bar */}
                 <div className="space-y-2 mb-6">
                   <div 
                     className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full cursor-pointer"
                     onClick={(e) => {
                       const rect = e.currentTarget.getBoundingClientRect();
                       const percent = (e.clientX - rect.left) / rect.width;
                       jumpToTime(percent * duration);
                     }}
                   >
                     <div 
                       className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-200"
                       style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                     />
                   </div>
                   <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
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
                     disabled={!audioLoaded}
                   >
                     <SkipBack className="w-5 h-5" />
                   </Button>
                   
                   <Button 
                     onClick={togglePlayPause} 
                     size="lg"
                     className="rounded-full w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 border-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all duration-200 hover:shadow-xl"
                     disabled={!audioLoaded && !audioError}
                   >
                     {!audioLoaded && !audioError ? (
                       <Loader2 className="w-8 h-8 text-white animate-spin" />
                     ) : isPlaying ? (
                       <div className="flex items-center justify-center space-x-1">
                         <div className="w-[3px] h-[16px] bg-white rounded-sm drop-shadow-md"></div>
                         <div className="w-[3px] h-[16px] bg-white rounded-sm drop-shadow-md"></div>
                       </div>
                     ) : (
                       <div className="w-0 h-0 border-l-[12px] border-l-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent ml-1 drop-shadow-md"></div>
                     )}
                   </Button>
                   
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={skipForward}
                     className="rounded-full w-12 h-12"
                     disabled={!audioLoaded}
                   >
                     <SkipForward className="w-5 h-5" />
                   </Button>
                 </div>

                 {/* Audio Error Message */}
                 {audioError && (
                   <div className="text-center text-red-500 text-sm mb-4">
                     {audioError}
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
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Playback Speed */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Speed</span>
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
          </div>

          {/* Enhanced Transcript */}
          <div className="xl:col-span-2">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Interactive Transcript</span>
                  {transcript && transcript.confidence && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(transcript.confidence * 100)}% confidence
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!transcript ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Generating transcript...
                      </p>
                    </div>
                  </div>
                ) : transcript.status === 'processing' ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-500 dark:text-gray-400 mb-2">
                        Processing transcript...
                      </p>
                      <p className="text-sm text-gray-400">
                        This may take a few minutes
                      </p>
                    </div>
                  </div>
                ) : transcript.status === 'failed' ? (
                  <div className="text-center py-16">
                    <p className="text-red-500 mb-4">
                      Failed to generate transcript
                    </p>
                    <Button variant="outline">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Speaker Legend */}
                    {getUniqueSpeakers().length > 0 && (
                      <div className="flex flex-wrap gap-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
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
                                         ? `${getSpeakerBackgroundColor(word.speaker)} ring-2 ring-blue-400 dark:ring-blue-600 shadow-sm`
                                         : hoveredWordIndex === index 
                                           ? `${getSpeakerBackgroundColor(word.speaker)} shadow-sm`
                                           : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                     }`}
                                     onMouseEnter={() => setHoveredWordIndex(index)}
                                     onMouseLeave={() => setHoveredWordIndex(null)}
                                     onClick={() => jumpToTime(word.start_time)}
                                   >
                                     {word.word}
                                   </span>
                                 </TooltipTrigger>
                                 <TooltipContent className="bg-gray-900 text-white border-gray-700">
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
                             <p className="whitespace-pre-wrap text-lg leading-relaxed">
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
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Delete Episode
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
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
                  className="bg-red-600 hover:bg-red-700"
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