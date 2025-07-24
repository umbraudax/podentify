import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Podtentify - Your Podcast Content, Amplified',
  description: 'Stop Transcribing. Start Amplifying. Podtentify turns your audio into instant show notes & shareable moments using AI.',
  keywords: 'podcast, show notes, AI transcription, social media clips, podcast promotion',
  openGraph: {
    title: 'Podtentify - Your Podcast Content, Amplified',
    description: 'Stop Transcribing. Start Amplifying. Podtentify turns your audio into instant show notes & shareable moments using AI.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}