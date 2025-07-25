import PricingSection from '@/components/PricingSection';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        {/* Back button */}
        <div className="max-w-7xl mx-auto mb-8">
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Pricing Section */}
        <PricingSection />
      </div>
    </div>
  );
}