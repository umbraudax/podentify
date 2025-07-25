'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { usePreferences } from '@/hooks/usePreferences';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDarkMode, loading } = usePreferences();

  useEffect(() => {
    // Ensure light mode is the default on initial load
    if (loading) {
      document.documentElement.classList.remove('dark');
    } else {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode, loading]);

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}