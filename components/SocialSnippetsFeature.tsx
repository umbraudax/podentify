'use client';

import { useEffect, useState } from 'react';
import { Share2, TrendingUp, Zap, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SocialSnippetsFeature() {
  const [waveHeights, setWaveHeights] = useState<number[]>(() => Array.from({ length: 40 }, () => 24));

  useEffect(() => {
    // Generate heights on client only to avoid SSR/CSR mismatch
    const heights = Array.from({ length: 40 }, () => Math.random() * 32 + 8);
    setWaveHeights(heights);
  }, []);
  const benefits = [
    {
      icon: TrendingUp,
      title: "Maximize Reach",
      description: "Turn your long-form content into bite-sized, shareable assets"
    },
    {
      icon: Zap,
      title: "Effortless Promotion",
      description: "Get ready-to-post clips without complex audio editing"
    },
    {
      icon: Share2,
      title: "Engage New Audiences",
      description: "Attract listeners from social platforms directly to your episodes"
    }
  ];

  const clips = [
    {
      title: "AI Healthcare Revolution",
      duration: "0:45",
      timestamp: "03:45 - 04:30",
      engagement: "High Impact",
      color: "blue"
    },
    {
      title: "Ethical AI Discussion",
      duration: "0:52",
      timestamp: "12:20 - 13:12",
      engagement: "Viral Potential",
      color: "purple"
    },
    {
      title: "Future Predictions",
      duration: "0:38",
      timestamp: "28:15 - 28:53",
      engagement: "Thought-Provoking",
      color: "green"
    }
  ];

  return (
    <section className="py-24 bg-surface-secondary">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Visual Demo */}
          <div className="relative order-2 lg:order-1" data-reveal>
            <div className="bg-surface-secondary rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Header */}
              <div className="bg-surface-primary px-6 py-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-text-primary">Social Media Clips</h3>
                  <span className="text-sm text-text-secondary">5 clips found</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {clips.map((clip, index) => (
                  <div key={index} className="bg-surface-primary rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-text-primary">{clip.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        clip.color === 'blue' ? 'bg-brand-tertiary text-brand-primary' :
                        clip.color === 'purple' ? 'bg-brand-secondary/10 text-brand-secondary' :
                        'bg-success/10 text-success'
                      }`}>
                        {clip.engagement}
                      </span>
                    </div>
                    
                    {/* Waveform Visualization */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-1 h-12 bg-surface-secondary rounded-lg p-2">
                        {Array.from({ length: 40 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-1 rounded-full transition-all duration-300 ${
                              i >= 8 && i <= 25 ? 
                                clip.color === 'blue' ? 'bg-brand-primary' :
                                clip.color === 'purple' ? 'bg-brand-secondary' :
                                'bg-success'
                              : 'bg-text-tertiary'
                            }`}
                            style={{ 
                              height: `${waveHeights[i] ?? 24}px`,
                              opacity: i >= 8 && i <= 25 ? 1 : 0.3
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{clip.duration}</span> • {clip.timestamp}
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="h-8 px-3">
                          <Play className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                        <Button size="sm" className="h-8 px-3 bg-blue-600 hover:bg-blue-700">
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="text-center pt-4">
                  <Button variant="outline" className="w-full">
                    Generate More Clips
                  </Button>
                </div>
              </div>
            </div>

            {/* Floating Element */}
            <div className="absolute -bottom-4 -left-4 bg-purple-500 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg">
              Perfect for TikTok!
            </div>
          </div>

          {/* Right Column - Content */}
          <div className="space-y-8 order-1 lg:order-2" data-reveal data-reveal-delay="100">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold text-text-primary">
                Your Podcast&apos;s Best Moments, Ready to Share.
              </h2>
              
              <p className="text-xl text-text-secondary leading-relaxed">
                Never miss a viral moment. Podentify&apos;s AI identifies the most engaging, impactful segments of your audio, allowing you to easily preview and download perfectly timed clips for Twitter, Instagram Reels, TikTok, and more.
              </p>
            </div>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex space-x-4" data-reveal data-reveal-delay={`${index * 100}`}>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary text-lg">{benefit.title}</h3>
                    <p className="text-text-secondary">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              size="lg" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-xl"
            >
              Try Clip Generator
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}