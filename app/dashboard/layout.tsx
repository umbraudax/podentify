import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side mobile detection
  const userAgent = headers().get('user-agent') || '';
  const isMobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(userAgent);

  if (isMobile) {
    redirect('/mobile-only');
  }

  return <>{children}</>;
}


