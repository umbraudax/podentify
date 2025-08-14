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
      const ua = typeof window !== 'undefined' ? navigator.userAgent || '' : '';
      const isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
      router.push(isMobile ? '/mobile-only' : '/dashboard');
    } else {
      router.push('/auth/signup');
    }
  };

  return (
    <>
      <section id="top" className="bg-surface-primary min-h-screen flex items-center justify-center px-4 py-20 pt-32 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8 animate-fade-in" data-reveal>
            <div className="space-y-6">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight break-words">
                <span className="gradient-text">Podentify:</span>
                <br />
                <span className="text-text-primary break-words">Your Podcast Content,</span>
                <br />
                <span className="text-text-primary break-words">Amplified.</span>
              </h1>
              
              <h2 className="text-base sm:text-xl lg:text-2xl text-text-secondary font-medium max-w-2xl break-words">
                Stop Transcribing. Start Amplifying. Podentify Turns Your Audio into Instant Show Notes & Shareable Moments.
              </h2>
              
              <p className="text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed break-words">
                Leveraging AI, Podentify automatically generates detailed show notes and extracts engaging, ready-to-share social media clips from your podcast episodes, saving you hours and boosting your reach.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-brand-primary hover:bg-brand-primary/90 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                onClick={handleGetStarted}
              >
                {user ? 'Go to Dashboard' : 'Get Started for Free'}
              </Button>
            </div>

            {/* Trust Indicator */}
            <p className="pt-8 text-sm text-text-tertiary">Trusted by over 1000+ content creators.</p>
          </div>

          {/* Right Column - Visual */}
          <div className="relative overflow-hidden" data-reveal data-reveal-delay="100">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 transform rotate-3 hover:rotate-0 transition-transform duration-500">
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
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
            <div className="absolute -z-10 top-10 left-10 w-20 h-20 bg-blue-200 dark:bg-blue-800/50 rounded-full blur-xl opacity-70 animate-pulse pointer-events-none"></div>
            <div className="absolute -z-10 bottom-10 right-10 w-32 h-32 bg-purple-200 dark:bg-purple-800/50 rounded-full blur-xl opacity-70 animate-pulse delay-1000 pointer-events-none"></div>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}