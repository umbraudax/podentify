import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import ClientThemeProvider from '@/components/ClientThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Podentify',
    template: '%s - Podentify',
  },
  icons: {
    icon: '/podentify-logo.png',
  },
};

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
                // Temporarily disable transitions to prevent flicker
                document.documentElement.classList.add('no-theme-transition');

                // Prefer explicit theme cookie, then localStorage 'theme', then legacy 'darkMode'
                var cookieMatch = document.cookie.match(/(?:^|; )theme=([^;]*)/);
                var cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
                var storedTheme = null;
                try { storedTheme = localStorage.getItem('theme'); } catch (e) {}
                var legacyDark = null;
                try { legacyDark = localStorage.getItem('darkMode'); } catch (e) {}
                var theme = cookieTheme || storedTheme || (legacyDark === 'true' ? 'dark' : 'light');
                document.documentElement.classList.remove('dark','light');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  // Default to light for signed-out or unknown
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }

                // Re-enable transitions on next frame
                requestAnimationFrame(function() {
                  document.documentElement.classList.remove('no-theme-transition');
                });
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-surface-primary text-text-primary transition-all duration-300 ease-in-out`}>
        <ClientThemeProvider>
          {children}
        </ClientThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}