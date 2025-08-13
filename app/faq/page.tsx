export default function FAQPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">Frequently Asked Questions</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Do I need a credit card to try Podentify?</h2>
          <p className="text-text-secondary">No. You can get started without a credit card and explore core features.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">What file types are supported?</h2>
          <p className="text-text-secondary">We support common audio formats like MP3, WAV, and M4A.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Can I download clips?</h2>
          <p className="text-text-secondary">Yes. Export high-quality clips formatted for social platforms.</p>
        </div>
      </div>
    </main>
  );
}

