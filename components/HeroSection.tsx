'use client';

import { useState, useEffect } from 'react';
import { Play, Upload, Sparkles, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from '@/components/AuthModal';

export default function HeroSection() {
  const [isAnimating, setIsAnimating] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimating(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    if (user) {
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <>
      <section className="hero-gradient min-h-screen flex items-center justify-center px-4 py-20 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                <span className="gradient-text">Podtentify:</span>
                <br />
                <span className="text-gray-900">Your Podcast Content,</span>
                <br />
                <span className="text-gray-900">Amplified.</span>
              </h1>
              
              <h2 className="text-xl lg:text-2xl text-gray-600 font-medium max-w-2xl">
                Stop Transcribing. Start Amplifying. Podtentify Turns Your Audio into Instant Show Notes & Shareable Moments.
              </h2>
              
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
                Leveraging AI, Podtentify automatically generates detailed show notes and extracts engaging, ready-to-share social media clips from your podcast episodes, saving you hours and boosting your reach.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                onClick={handleGetStarted}
              >
                {user ? 'Go to Dashboard' : 'Get Started for Free'}
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-gray-300 hover:border-blue-600 px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            <p className="text-sm text-gray-500">
              Trusted by independent creators and growing podcasts
            </p>
          </div>

          {/* Right Column - Demo Animation */}
          <div className="relative animate-slide-up">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
              {/* Demo Steps */}
              <div className="space-y-6">
                {/* Step 1: Upload */}
                <div className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-500 ${isAnimating ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
                  <div className={`p-3 rounded-lg transition-all duration-500 ${isAnimating ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Upload Audio</h3>
                    <p className="text-sm text-gray-600">episode_042.mp3</p>
                  </div>
                </div>

                {/* Step 2: AI Processing */}
                <div className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-700 delay-500 ${isAnimating ? 'bg-purple-50 border-2 border-purple-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
                  <div className={`p-3 rounded-lg transition-all duration-700 delay-500 ${isAnimating ? 'bg-purple-600 text-white animate-pulse-slow' : 'bg-gray-300 text-gray-600'}`}>
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI Processing</h3>
                    <p className="text-sm text-gray-600">Analyzing content...</p>
                  </div>
                </div>

                {/* Step 3: Show Notes */}
                <div className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-900 delay-1000 ${isAnimating ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
                  <div className={`p-3 rounded-lg transition-all duration-900 delay-1000 ${isAnimating ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Show Notes Ready</h3>
                    <p className="text-sm text-gray-600">Complete with timestamps</p>
                  </div>
                </div>

                {/* Step 4: Social Clips */}
                <div className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-1100 delay-1500 ${isAnimating ? 'bg-orange-50 border-2 border-orange-200' : 'bg-gray-50 border-2 border-gray-200'}`}>
                  <div className={`p-3 rounded-lg transition-all duration-1100 delay-1500 ${isAnimating ? 'bg-orange-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    <Share2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Social Clips</h3>
                    <p className="text-sm text-gray-600">5 shareable moments found</p>
                  </div>
                </div>
              </div>

              {/* Visual Enhancement */}
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Processing Complete</span>
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600 font-medium">Ready to publish</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-600 rounded-full opacity-10 animate-float"></div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-purple-600 rounded-full opacity-10 animate-float" style={{ animationDelay: '2s' }}></div>
          </div>
        </div>
      </div>
      </section>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode="signup"
      />
    </>
  );
}