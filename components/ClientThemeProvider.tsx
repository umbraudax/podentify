'use client';

import { useEffect } from 'react';
import { usePreferences } from '@/hooks/usePreferences';
import { useAuth } from '@/hooks/useAuth';

type Props = { children: React.ReactNode };

export default function ClientThemeProvider({ children }: Props) {
  const { preferences, loading } = usePreferences();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const initializeTheme = () => {
      if (user && !authLoading && !loading && preferences) {
        const desiredTheme = preferences.dark_mode ? 'dark' : 'light';
        const hasDark = document.documentElement.classList.contains('dark');
        const hasLight = document.documentElement.classList.contains('light');
        const currentTheme = hasDark ? 'dark' : hasLight ? 'light' : null;
        if (currentTheme !== desiredTheme) {
          if (desiredTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          }
        }
      }
    };

    initializeTheme();
  }, [preferences, loading, user, authLoading]);

  return <>{children}</>;
}


