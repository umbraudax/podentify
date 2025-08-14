'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Upload, FileAudio, Plus, Settings, User, LogOut, Clock, Play, Trash2, MoreVertical, Coins, Video } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Episode } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { useCredits } from '@/hooks/useCredits';
import { isValidMediaFile, isValidFileSize, formatFileSize, getUserDisplayName, getPlanBadgeClasses } from '@/lib/utils';
import { SUPPORTED_AUDIO_FORMATS, MAX_FILE_SIZE } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';


export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { getSubscriptionPlan } = useSubscription();
  const { credits, loading: creditsLoading, getCreditStatus, refresh: refreshCredits } = useCredits();
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(true);
  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (user) {
      fetchRecentEpisodes();
    }
  }, [user, authLoading, router]);

  const fetchRecentEpisodes = async () => {
    if (!user?.id) {
      console.error('User not authenticated');
      return;
    }

    try {
      const { data: episodes, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentEpisodes(episodes || []);
      
      // Refresh credits when fetching episodes to ensure they're up to date
      refreshCredits();
    } catch (error) {
      console.error('Error fetching episodes:', error);
    } finally {
      setEpisodesLoading(false);
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/episodes/${episodeId}`, {
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

      // Remove the episode from the local state
      setRecentEpisodes(prev => prev.filter(ep => ep.id !== episodeId));
      
    } catch (error) {
      console.error('Delete error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete episode');
    } finally {
      setIsDeleting(false);
      setDeleteEpisodeId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    setUploadError(null);
    
    const file = files[0];
    
    // Validate file type
    if (!isValidMediaFile(file)) {
      setUploadError('Invalid file type. Supported formats: MP3, WAV, M4A, MP4, MOV, AVI, MKV, WEBM');
      return;
    }
    
    // Validate file size
    if (!isValidFileSize(file)) {
      setUploadError(`File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }
    
    try {
      // Get user session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setUploadError('Please sign in to upload files');
        return;
      }

      setIsUploading(true);

      // 1) Get signed upload URL
      const initRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to initialize upload');
      }

      const { objectKey, signedUrl, token, estimated_credits, mediaType } = await initRes.json();

      // 2) Upload file directly to Supabase Storage using the signed URL
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream',
          'x-upsert': 'false',
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text().catch(() => '');
        throw new Error(`Upload failed: ${uploadRes.status} ${text}`);
      }

      // 3) Finalize (create DB record and kick off processing)
      const finalizeRes = await fetch('/api/upload/finalize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectKey,
          originalName: file.name,
          title: file.name.replace(/\.[^/.]+$/, ''),
          mediaType,
          estimatedMinutes: estimated_credits,
        }),
      });

      if (!finalizeRes.ok) {
        const err = await finalizeRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to finalize upload');
      }

      const result = await finalizeRes.json();
      
      // Refresh episodes list
      fetchRecentEpisodes();
      refreshCredits();
      
      // Redirect to processing page
      router.push(`/dashboard/episode/${result.episode.id}`);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userDisplayName = getUserDisplayName(user);
  const subscriptionPlan = getSubscriptionPlan();

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
              <div className="border-l border-border h-8"></div>
              <div>
                <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
                <p className="text-text-secondary mt-1">
                  Welcome back, {userDisplayName}!
                </p>
              </div>
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

              {/* Profile Dropdown */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 border-border hover:border-brand-primary">
                    <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-text-primary font-medium">{userDisplayName}</span>
                      {subscriptionPlan && (
                        <Badge variant="secondary" className={`text-xs ${getPlanBadgeClasses(subscriptionPlan)}`}>
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

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">

          {/* Upload Section */}
          <div className="space-y-8">
            <Card className="border-2 border-dashed border-border hover:border-brand-primary transition-colors bg-surface-primary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-text-primary">
                  <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <span>Upload New Episode</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploadError && (
                  <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg">
                    <p className="text-error text-sm">{uploadError}</p>
                  </div>
                )}
                
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                    dragActive 
                      ? 'border-brand-primary bg-brand-tertiary' 
                      : 'border-border hover:border-brand-primary hover:bg-brand-tertiary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleChange}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-brand-tertiary rounded-full flex items-center justify-center mx-auto">
                      <FileAudio className="w-8 h-8 text-brand-primary" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        Drop your podcast file here
                      </h3>
                      <p className="text-text-secondary mb-4">
                        or click to browse your files
                      </p>
                      <p className="text-sm text-text-tertiary">
                        Supports audio (MP3, WAV, M4A) and video (MP4, MOV, AVI, MKV, WEBM) files up to {formatFileSize(MAX_FILE_SIZE)}
                      </p>
                    </div>
                    
                    <Button className="bg-brand-primary hover:bg-brand-primary/90" disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground/60 border-t-transparent"></div>
                          Uploading File
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Choose File
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Episodes */}
            <Card className="bg-surface-primary border-border">
              <CardHeader>
                <CardTitle className="text-text-primary">Episodes</CardTitle>
              </CardHeader>
              <CardContent>
                {episodesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mx-auto"></div>
                    <p className="text-text-secondary mt-2">Loading episodes...</p>
                  </div>
                ) : recentEpisodes.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-surface-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileAudio className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <h3 className="text-lg font-medium text-text-primary mb-2">No episodes yet</h3>
                    <p className="text-text-secondary">Upload your first podcast episode to get started with AI-powered show notes and social clips.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentEpisodes.map((episode) => (
                      <div
                        key={episode.id}
                        className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/episode/${episode.id}`)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-brand-tertiary rounded-lg flex items-center justify-center">
                            {episode.media_type === 'video' ? (
                              <Video className="w-5 h-5 text-purple-500" />
                            ) : episode.status === 'completed' ? (
                              <Play className="w-5 h-5 text-brand-primary" />
                            ) : (
                              <FileAudio className="w-5 h-5 text-brand-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-text-primary truncate">
                              {episode.title}
                            </h4>
                            <div className="flex items-center space-x-2 mt-1">
                              <Clock className="w-3 h-3 text-text-tertiary" />
                              <span className="text-xs text-text-secondary">
                                {episode.created_at ? new Date(episode.created_at).toLocaleDateString() : 'Unknown date'}
                              </span>
                              {episode.duration && (
                                <>
                                  <span className="text-text-tertiary">•</span>
                                  <span className="text-xs text-text-secondary">
                                    {Math.floor(episode.duration / 60)}m {Math.floor(episode.duration % 60)}s
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={episode.status === 'completed' ? 'default' : 
                                    episode.status === 'failed' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {episode.status}
                          </Badge>
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteEpisodeId(episode.id);
                                }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>


        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteEpisodeId && (
        <div className="fixed inset-0 bg-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-surface-primary rounded-lg p-6 max-w-md w-full border border-border">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Delete Episode
            </h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete this episode? This action cannot be undone and will permanently remove the episode, transcript, and audio file.
            </p>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteEpisodeId(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteEpisode(deleteEpisodeId)}
                disabled={isDeleting}
                className="bg-error hover:bg-error/90"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground/60 border-t-transparent"></div>
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
  );
}