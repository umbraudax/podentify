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
    <section id="how-it-works" className="py-24 bg-surface-primary">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-20" data-reveal>
          <h2 className="text-4xl lg:text-5xl font-bold text-text-primary mb-6">
            It&apos;s As Easy As 1, 2, 3.
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Transform your podcast workflow in minutes, not hours. Our streamlined process makes content amplification effortless.
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines */}
          <div className="hidden lg:block absolute top-10 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-primary/20 via-brand-secondary/20 to-success/20"></div>
          
          <div className="grid lg:grid-cols-3 gap-12 relative">
            {steps.map((step, index) => (
              <div key={index} className="text-center group" data-reveal data-reveal-delay={`${index * 120}`}>
                <div className="relative mb-8">
                  {/* Step Number */}
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold mb-6 transition-all duration-300 group-hover:scale-110 ${
                    step.color === 'blue' ? 'bg-brand-primary text-white' :
                    step.color === 'purple' ? 'bg-brand-secondary text-white' :
                    'bg-success text-white'
                  }`}>
                    {step.number}
                  </div>
                  
                  {/* Icon */}
                  <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                    step.color === 'blue' ? 'bg-brand-tertiary text-brand-primary' :
                    step.color === 'purple' ? 'bg-brand-secondary/10 text-brand-secondary' :
                    'bg-success/10 text-success'
                  }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-text-primary">{step.title}</h3>
                  <p className="text-text-secondary leading-relaxed max-w-sm mx-auto">{step.description}</p>
                </div>

                {/* Visual Enhancement */}
                <div className={`mt-8 p-6 rounded-2xl transition-all duration-300 group-hover:shadow-lg ${
                  step.color === 'blue' ? 'bg-brand-tertiary border border-brand-primary/20' :
                  step.color === 'purple' ? 'bg-brand-secondary/5 border border-brand-secondary/20' :
                  'bg-success/5 border border-success/20'
                }`}>
                  <div className="text-sm text-text-secondary mb-2">Example:</div>
                  <div className="text-sm font-medium text-text-primary">
                    {step.number === "01" && "episode_042.mp3 (45:30)"}
                    {step.number === "02" && "Processing... 95% complete"}
                    {step.number === "03" && "5 clips + show notes ready"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>


      </div>
    </section>
  );
}