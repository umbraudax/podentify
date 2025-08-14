import Image from 'next/image';
import Link from 'next/link';

export default function MobileOnlyMessage() {
  return (
    <main className="min-h-screen bg-surface-secondary flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-surface-primary border border-border rounded-2xl p-8 text-center shadow-xl">
        <div className="flex items-center justify-center mb-6">
          <Image src="/podentify-logo.png" alt="Podentify logo" width={48} height={48} className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">Desktop Only</h1>
        <p className="text-text-secondary mb-6">
          The dashboard and content pages are optimized for desktop and are not available on mobile devices.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-medium px-4 py-3 rounded-lg transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}


