'use client';

import { FileText, Clock, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShowNotesFeature() {
  const benefits = [
    {
      icon: Clock,
      title: "Save Hours",
      description: "Eliminate manual transcription and summarizing"
    },
    {
      icon: Search,
      title: "Boost Discoverability",
      description: "Get SEO-friendly text for every episode, making your podcast more searchable"
    },
    {
      icon: Eye,
      title: "Enhanced Listener Experience",
      description: "Provide valuable context and easy navigation for your audience"
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <span className="text-blue-600 font-semibold text-lg">Feature 1</span>
              </div>
              
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
                Intelligent Show Notes, Instantly.
              </h2>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                Podtentify listens to your entire episode and intelligently crafts comprehensive show notes. We go beyond simple transcription, providing you with a structured, easy-to-read summary, key discussion points, and precise timestamps.
              </p>
            </div>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-xl"
            >
              Try Show Notes Generator
            </Button>
          </div>

          {/* Right Column - Visual Demo */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 ml-4">Show Notes Editor</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Episode 42: The Future of AI</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">SEO Optimized</span>
                  </div>
                  <p className="text-sm text-gray-600">Generated in 2 minutes • 45:30 duration</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">📝 Summary</h4>
                    <p className="text-sm text-gray-700">In this episode, we explore the transformative potential of artificial intelligence across various industries, discussing both opportunities and challenges...</p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">🎯 Key Topics</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-sm text-gray-700 flex-1">AI in Healthcare Revolution</span>
                        <span className="text-xs text-blue-600 font-medium">03:45</span>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <span className="text-sm text-gray-700 flex-1">Ethical Considerations</span>
                        <span className="text-xs text-purple-600 font-medium">12:20</span>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-sm text-gray-700 flex-1">Future Predictions</span>
                        <span className="text-xs text-green-600 font-medium">28:15</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg">
              Ready to Publish!
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}