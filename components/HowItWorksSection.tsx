'use client';

import { Upload, Cog, CheckCircle } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      number: "01",
      icon: Upload,
      title: "Upload Your Episode",
      description: "Securely upload your audio file (MP3, WAV) or paste a link from your podcast host.",
      color: "blue"
    },
    {
      number: "02",
      icon: Cog,
      title: "AI Does the Heavy Lifting",
      description: "Our intelligent AI processes your audio, analyzing content, structure, and key moments.",
      color: "purple"
    },
    {
      number: "03",
      icon: CheckCircle,
      title: "Review & Publish",
      description: "Edit, customize, and download your optimized show notes and social media clips.",
      color: "green"
    }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-20">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            It&apos;s As Easy As 1, 2, 3.
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transform your podcast workflow in minutes, not hours. Our streamlined process makes content amplification effortless.
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 transform -translate-y-1/2"></div>
          
          <div className="grid lg:grid-cols-3 gap-12 relative">
            {steps.map((step, index) => (
              <div key={index} className="text-center group">
                <div className="relative mb-8">
                  {/* Step Number */}
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold mb-6 transition-all duration-300 group-hover:scale-110 ${
                    step.color === 'blue' ? 'bg-blue-600 text-white' :
                    step.color === 'purple' ? 'bg-purple-600 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                    step.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                    step.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-gray-900">{step.title}</h3>
                  <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">{step.description}</p>
                </div>

                {/* Visual Enhancement */}
                <div className={`mt-8 p-6 rounded-2xl transition-all duration-300 group-hover:shadow-lg ${
                  step.color === 'blue' ? 'bg-blue-50 border border-blue-100' :
                  step.color === 'purple' ? 'bg-purple-50 border border-purple-100' :
                  'bg-green-50 border border-green-100'
                }`}>
                  <div className="text-sm text-gray-600 mb-2">Example:</div>
                  <div className="text-sm font-medium text-gray-900">
                    {step.number === "01" && "episode_042.mp3 (45:30)"}
                    {step.number === "02" && "Processing... 95% complete"}
                    {step.number === "03" && "5 clips + show notes ready"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to streamline your podcast workflow?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of creators who save hours every week with Podtentify.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors">
                Start Free Trial
              </button>
              <button className="border-2 border-gray-300 hover:border-blue-600 text-gray-700 px-8 py-3 rounded-xl font-semibold transition-colors">
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}