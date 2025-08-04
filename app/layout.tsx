'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { usePreferences } from '@/hooks/usePreferences';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { preferences, loading } = usePreferences();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check for stored theme preference or user preferences from database
    const initializeTheme = () => {
      if (!loading && preferences) {
        // Use user preferences from database (this takes priority)
        if (preferences.dark_mode) {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
      } else {
        // No user preference, let CSS media query handle system preference
        document.documentElement.classList.remove('dark', 'light');
      }
    };

    initializeTheme();
  }, [preferences, loading]);

  // Prevent flash of incorrect theme
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                // Let the CSS media query handle initial theme detection
                // The React component will override this with user preferences when loaded
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (systemPrefersDark) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-surface-primary text-text-primary transition-all duration-300 ease-in-out`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}