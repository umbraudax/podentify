import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import ProblemSolutionSection from '@/components/ProblemSolutionSection';
import ShowNotesFeature from '@/components/ShowNotesFeature';
import SocialSnippetsFeature from '@/components/SocialSnippetsFeature';
import HowItWorksSection from '@/components/HowItWorksSection';
import PricingSection from '@/components/PricingSection';
import Footer from '@/components/Footer';
import ScrollRevealProvider from '@/components/ScrollRevealProvider';
import ScrollToTopButton from '@/components/ScrollToTopButton';

export default function Home() {
  return (
    <main className="min-h-screen">
      <ScrollRevealProvider />
      <Header />
      <HeroSection />
      <ProblemSolutionSection />
      <ShowNotesFeature />
      <SocialSnippetsFeature />
      <HowItWorksSection />
      <PricingSection />
      <Footer />
      <ScrollToTopButton />
    </main>
  );
}