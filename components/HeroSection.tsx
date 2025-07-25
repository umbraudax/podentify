'use client';

import { useState, useEffect } from 'react';
import { Play, Upload, Sparkles, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function HeroSection() {
  const [isAnimating, setIsAnimating] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      // Redirect to dashboard
      router.push('/dashboard');
    } else {
      router.push('/auth/signup');
    }
  };

  return (
    <>
      <section className="hero-gradient dark:bg-gradient-to-br dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen flex items-center justify-center px-4 py-20 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="gradient-text">Podtentify:</span>
                <br />
                <span className="text-gray-900 dark:text-gray-100">Your Podcast Content,</span>
                <br />
                <span className="text-gray-900 dark:text-gray-100">Amplified.</span>
              </h1>
              
              <h2 className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 font-medium max-w-2xl">
                Stop Transcribing. Start Amplifying. Podtentify Turns Your Audio into Instant Show Notes & Shareable Moments.
              </h2>
              
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                Leveraging AI, Podtentify automatically generates detailed show notes and extracts engaging, ready-to-share social media clips from your podcast episodes, saving you hours and boosting your reach.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                onClick={handleGetStarted}
              >
                {user ? 'Go to Dashboard' : 'Get Started for Free'}
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-gray-300 dark:border-gray-600 hover:border-blue-600 dark:hover:border-blue-400 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center space-x-6 pt-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">Trusted by content creators</p>
              <div className="flex items-center space-x-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-semibold"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">2,000+ creators</p>
              </div>
            </div>
          </div>

          {/* Right Column - Visual */}
          <div className="relative">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                <Sparkles className="w-12 h-12" />
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Upload Episode</span>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Processing...</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div 
                      className={`bg-blue-600 h-2 rounded-full transition-all duration-1000 ${
                        isAnimating ? 'w-3/4' : 'w-0'
                      }`}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Show Notes</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Auto-generated</p>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <Share2 className="w-6 h-6 text-purple-600 dark:text-purple-400 mb-2" />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Social Clips</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Ready to share</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -z-10 top-10 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-800/50 rounded-full blur-xl opacity-70 animate-pulse"></div>
            <div className="absolute -z-10 bottom-10 right-10 w-32 h-32 bg-purple-200 dark:bg-purple-800/50 rounded-full blur-xl opacity-70 animate-pulse delay-1000"></div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}