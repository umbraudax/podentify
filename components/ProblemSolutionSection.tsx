'use client';

import { Clock, Scissors, Search, Zap, Target, TrendingUp } from 'lucide-react';

export default function ProblemSolutionSection() {
  const problems = [
    {
      icon: Clock,
      title: "Time-Consuming Manual Work",
      description: "Manually writing show notes is a time sink that pulls you away from creating."
    },
    {
      icon: Scissors,
      title: "Tedious Clip Creation",
      description: "Identifying the perfect shareable moments for social media is a painstaking process."
    },
    {
      icon: Search,
      title: "Missing Discoverability",
      description: "Missing out on discoverability because your content isn't optimized for search engines."
    }
  ];

  const solutions = [
    {
      icon: Zap,
      title: "AI-Powered Automation",
      description: "Let artificial intelligence handle the heavy lifting while you focus on what you do best."
    },
    {
      icon: Target,
      title: "Smart Content Extraction",
      description: "Automatically identify and extract the most engaging moments from your episodes."
    },
    {
      icon: TrendingUp,
      title: "Optimized for Growth",
      description: "Get SEO-friendly content and social-ready clips that expand your reach."
    }
  ];

  return (
    <section id="features" className="py-16 sm:py-24 bg-surface-secondary">
      <div className="max-w-7xl mx-auto px-4">
        {/* Problem Section */}
        <div className="text-center mb-16 sm:mb-20" data-reveal>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary mb-4 sm:mb-6">
            Tired of Tedious Transcription & Manual Snipping?
          </h2>
          <p className="text-base sm:text-xl text-text-secondary max-w-3xl mx-auto">
            Creating quality podcast content is challenging enough without spending hours on post-production tasks.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-16 sm:mb-24">
          {problems.map((problem, index) => (
            <div key={index} className="group" data-reveal data-reveal-delay={`${index * 100}`}>
              <div className="bg-error/5 rounded-2xl p-6 sm:p-8 border border-error/10 group-hover:border-error/20 transition-all duration-300 h-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-error/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-error/20 transition-colors">
                  <problem.icon className="w-6 h-6 sm:w-7 sm:h-7 text-error" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-3 sm:mb-4">{problem.title}</h3>
                <p className="text-text-secondary leading-relaxed">{problem.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Solution Section */}
        <div className="text-center mb-16 sm:mb-20" data-reveal>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
                          <span className="gradient-text">Podentify:</span> Your AI-Powered Content Co-Pilot
          </h2>
          <p className="text-base sm:text-xl text-text-secondary max-w-3xl mx-auto">
            Transform your podcast workflow with intelligent automation that turns hours of work into minutes of review.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {solutions.map((solution, index) => (
            <div key={index} className="group" data-reveal data-reveal-delay={`${index * 100}`}>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:bg-gradient-to-br dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 sm:p-8 border border-blue-100 dark:border-gray-700 group-hover:border-blue-200 dark:group-hover:border-gray-600 transition-all duration-300 h-full group-hover:shadow-xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <solution.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-text-primary mb-3 sm:mb-4">{solution.title}</h3>
                <p className="text-text-secondary leading-relaxed">{solution.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}