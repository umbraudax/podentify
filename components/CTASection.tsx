'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AuthModal from '@/components/AuthModal';

export default function CTASection() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user } = useAuth();

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
      <section className="py-24 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 relative">
        <div className="text-center space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Headlines */}
          <div className="space-y-6">
            <h2 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
              Stop the Grind.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Start Growing.
              </span>
            </h2>
            
            <p className="text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Join creators who are already amplifying their reach with Podtentify. Transform your podcast workflow today.
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto my-16">
            <div className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-white mb-2">10x</div>
              <div className="text-blue-200">Faster Content Creation</div>
            </div>
            <div className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-white mb-2">5+</div>
              <div className="text-blue-200">Social Clips Per Episode</div>
            </div>
            <div className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-white mb-2">24/7</div>
              <div className="text-blue-200">AI-Powered Processing</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 px-10 py-4 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:-translate-y-1 group"
              onClick={handleGetStarted}
            >
              {user ? 'Go to Dashboard' : 'Get Started for Free'}
              <ArrowRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-10 py-4 text-xl font-bold rounded-2xl transition-all duration-300"
            >
              Watch 2-Min Demo
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 space-y-4">
            <p className="text-blue-200 text-sm">
              ✓ No credit card required  ✓ 7-day free trial  ✓ Cancel anytime
            </p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="text-white/70 text-sm">Trusted by 1000+ creators</div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="text-white/70 text-sm">SOC 2 Compliant</div>
              <div className="w-px h-4 bg-white/30"></div>
              <div className="text-white/70 text-sm">99.9% Uptime</div>
            </div>
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