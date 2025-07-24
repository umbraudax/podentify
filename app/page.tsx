import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ProblemSolutionSection from '@/components/ProblemSolutionSection';
import ShowNotesFeature from '@/components/ShowNotesFeature';
import SocialSnippetsFeature from '@/components/SocialSnippetsFeature';
import HowItWorksSection from '@/components/HowItWorksSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <ProblemSolutionSection />
      <ShowNotesFeature />
      <SocialSnippetsFeature />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </main>
  );
}