'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Upload, FileAudio, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SubscriptionStatus from '@/components/dashboard/SubscriptionStatus';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);

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
    // TODO: Implement file upload logic
    console.log('Files to upload:', files);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => router.push('/account/settings')}
                variant="outline"
                className="border-gray-300 hover:border-blue-600"
              >
                <Settings className="w-4 h-4 mr-2" />
                Account Settings
              </Button>
              <Button 
                onClick={() => router.push('/')}
                variant="outline"
                className="border-gray-300 hover:border-blue-600"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-3 space-y-8">
            <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <span>Upload New Episode</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
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
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <FileAudio className="w-8 h-8 text-blue-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Drop your podcast file here
                      </h3>
                      <p className="text-gray-600 mb-4">
                        or click to browse your files
                      </p>
                      <p className="text-sm text-gray-500">
                        Supports MP3, WAV, M4A files up to 500MB
                      </p>
                    </div>
                    
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Episodes - Empty State */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Episodes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileAudio className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No episodes yet</h3>
                  <p className="text-gray-600 mb-6">Upload your first podcast episode to get started with AI-powered show notes and social clips.</p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Upload First Episode
                  </Button>
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