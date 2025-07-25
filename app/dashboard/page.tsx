'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Upload, FileAudio, Plus, Settings, User, LogOut, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubscriptionStatus from '@/components/dashboard/SubscriptionStatus';
import { isValidAudioFile, isValidFileSize, formatFileSize, getUserDisplayName } from '@/lib/utils';
import { SUPPORTED_AUDIO_FORMATS, MAX_FILE_SIZE } from '@/lib/constants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
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

  const handleFiles = (files: FileList) => {
    setUploadError(null);
    
    const file = files[0];
    
    // Validate file type
    if (!isValidAudioFile(file)) {
      setUploadError(`Invalid file type. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(', ').toUpperCase()}`);
      return;
    }
    
    // Validate file size
    if (!isValidFileSize(file)) {
      setUploadError(`File too large. Maximum size: ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }
    
    // TODO: Implement actual file upload logic
    console.log('Valid file to upload:', {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userDisplayName = getUserDisplayName(user);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Clickable Logo */}
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Mic className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Podtentify</span>
              </button>
              <div className="border-l border-gray-300 dark:border-gray-600 h-8"></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Welcome back, {userDisplayName}!
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center space-x-2 border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-400">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{userDisplayName}</span>
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
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-3 space-y-8">
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-gray-900 dark:text-gray-100">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <span>Upload New Episode</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploadError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-800 dark:text-red-400 text-sm">{uploadError}</p>
                  </div>
                )}
                
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                      <FileAudio className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Drop your podcast file here
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        or click to browse your files
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        Supports {SUPPORTED_AUDIO_FORMATS.join(', ').toUpperCase()} files up to {formatFileSize(MAX_FILE_SIZE)}
                      </p>
                    </div>
                    
                    <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Episodes - Empty State */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">Recent Episodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileAudio className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No episodes yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">Upload your first podcast episode to get started with AI-powered show notes and social clips.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subscription Status Sidebar */}
          <div className="space-y-6">
            <SubscriptionStatus />
          </div>
        </div>
      </div>
    </div>
  );
}