import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { UserPreferences, UserPreferencesInsert, UserPreferencesUpdate } from '@/lib/types';

export function usePreferences() {
  const { user, loading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  useEffect(() => {
    console.log('usePreferences: user state changed:', user ? `User ID: ${user.id}` : 'No user', '| authLoading:', authLoading);
    // If auth status is still loading, do not change theme or fallback yet
    if (authLoading) return;

    if (user) {
      // Optimistically apply cached theme for this user to avoid flash while DB loads
      try {
        const perUserKey = `user-theme:${user.id}`;
        const cachedUserTheme = localStorage.getItem(perUserKey);
        if (cachedUserTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
          // Keep global cache in sync for route transitions
          localStorage.setItem('darkMode', 'true');
          localStorage.setItem('theme', 'dark');
          document.cookie = `theme=dark; path=/; max-age=31536000; samesite=lax`;
        } else if (cachedUserTheme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
          localStorage.setItem('darkMode', 'false');
          localStorage.setItem('theme', 'light');
          document.cookie = `theme=light; path=/; max-age=31536000; samesite=lax`;
        }
      } catch {}
      fetchPreferences();
    } else {
      // For non-authenticated users, use localStorage (always default to light)
      loadFromLocalStorage();
    }
  }, [user, authLoading]);

  const loadFromLocalStorage = () => {
    try {
      // For unauthenticated users, ALWAYS default to light mode
      const emailNotifications = localStorage.getItem('emailNotifications') !== 'false'; // default to true
      
      setPreferences({
        user_id: 'local',
        dark_mode: false, // Always light mode for unauthenticated users
        email_notifications: emailNotifications,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setUseLocalStorage(true);
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalStorage = (darkMode: boolean, emailNotifications: boolean) => {
    try {
      localStorage.setItem('darkMode', darkMode.toString());
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
      localStorage.setItem('emailNotifications', emailNotifications.toString());
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no preferences exist for this user, create default ones
        if (error.code === 'PGRST116') {
          console.log('No preferences found for user, creating default preference');
          await createDefaultPreferences();
          return;
        }
        // If table doesn't exist, fall back to localStorage  
        else if (error.code === '42P01') {
          console.log('Database table not available, using localStorage fallback');
          setUseLocalStorage(true);
          loadFromLocalStorage();
          return;
        } else {
          throw error;
        }
      } else {
        // Convert database null values to match TypeScript interface
        const processedPreferences: UserPreferences = {
          user_id: data.user_id,
          dark_mode: data.dark_mode ?? false,
          email_notifications: data.email_notifications ?? true,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
        console.log('Loaded preferences from database:', processedPreferences);
        setPreferences(processedPreferences);
        setUseLocalStorage(false);
        
        // Validation-only: Only update DOM/cache if there is a mismatch
        try {
          const desiredTheme = processedPreferences.dark_mode ? 'dark' : 'light';
          const hasDark = document.documentElement.classList.contains('dark');
          const hasLight = document.documentElement.classList.contains('light');
          const currentTheme = hasDark ? 'dark' : (hasLight ? 'light' : null);
          const cachedTheme = localStorage.getItem('theme');

          const matchesDom = currentTheme === desiredTheme;
          const matchesCache = cachedTheme === desiredTheme;

          if (!matchesDom || !matchesCache) {
            // Update DOM to desired theme
            if (desiredTheme === 'dark') {
              document.documentElement.classList.add('dark');
              document.documentElement.classList.remove('light');
            } else {
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('light');
            }
            // Update caches to desired theme
            localStorage.setItem('darkMode', String(processedPreferences.dark_mode));
            localStorage.setItem('theme', desiredTheme);
            document.cookie = `theme=${desiredTheme}; path=/; max-age=31536000; samesite=lax`;
            if (user) {
              localStorage.setItem(`user-theme:${user.id}` as const, desiredTheme);
            }
          }
        } catch {}
      }
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      // Fallback to localStorage on any error
      setUseLocalStorage(true);
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!user) return;

    try {
      const defaultPrefs: UserPreferencesInsert = {
        user_id: user.id,
        dark_mode: false,
        email_notifications: true,
      };

      console.log('Creating default preferences for user:', user.id, defaultPrefs);

      const { data, error } = await supabase
        .from('user_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) throw error;
      // Convert database null values to match TypeScript interface
      const processedPreferences: UserPreferences = {
        user_id: data.user_id,
        dark_mode: data.dark_mode ?? false,
        email_notifications: data.email_notifications ?? true,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };
      console.log('Created default preferences:', processedPreferences);
      setPreferences(processedPreferences);
      
      // Validation-only: Only update DOM/cache if there is a mismatch
      try {
        const desiredTheme = processedPreferences.dark_mode ? 'dark' : 'light';
        const hasDark = document.documentElement.classList.contains('dark');
        const hasLight = document.documentElement.classList.contains('light');
        const currentTheme = hasDark ? 'dark' : (hasLight ? 'light' : null);
        const cachedTheme = localStorage.getItem('theme');

        const matchesDom = currentTheme === desiredTheme;
        const matchesCache = cachedTheme === desiredTheme;

        if (!matchesDom || !matchesCache) {
          if (desiredTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
          }
          localStorage.setItem('darkMode', String(processedPreferences.dark_mode));
          localStorage.setItem('theme', desiredTheme);
          document.cookie = `theme=${desiredTheme}; path=/; max-age=31536000; samesite=lax`;
          if (user) {
            localStorage.setItem(`user-theme:${user.id}` as const, desiredTheme);
          }
        }
      } catch {}
    } catch (err) {
      console.error('Error creating default preferences:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const updatePreferences = async (updates: UserPreferencesUpdate) => {
    if (!user || !preferences) return;

    if (useLocalStorage) {
      // Update localStorage directly
      const newPrefs = { ...preferences, ...updates, updated_at: new Date().toISOString() };
      setPreferences(newPrefs);
      saveToLocalStorage(newPrefs.dark_mode, newPrefs.email_notifications);
      return { data: newPrefs, error: null };
    }

    try {
      setError(null);

      const { data, error } = await supabase
        .from('user_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        // If database update fails, fall back to localStorage
        console.log('Database update failed, falling back to localStorage');
        const newPrefs = { ...preferences, ...updates, updated_at: new Date().toISOString() };
        setPreferences(newPrefs);
        saveToLocalStorage(newPrefs.dark_mode, newPrefs.email_notifications);
        setUseLocalStorage(true);
        return { data: newPrefs, error: null };
      }
      
      // Convert database null values to match TypeScript interface
      const processedPreferences: UserPreferences = {
        user_id: data.user_id,
        dark_mode: data.dark_mode ?? false,
        email_notifications: data.email_notifications ?? true,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString(),
      };
      setPreferences(processedPreferences);
      // Validation-only: Only update DOM/cache if there is a mismatch
      try {
        const desiredTheme = processedPreferences.dark_mode ? 'dark' : 'light';
        const hasDark = document.documentElement.classList.contains('dark');
        const hasLight = document.documentElement.classList.contains('light');
        const currentTheme = hasDark ? 'dark' : (hasLight ? 'light' : null);
        const cachedTheme = localStorage.getItem('theme');

        const matchesDom = currentTheme === desiredTheme;
        const matchesCache = cachedTheme === desiredTheme;

        if (!matchesDom || !matchesCache) {
          if (desiredTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.add('light');
            document.documentElement.classList.remove('dark');
          }
          localStorage.setItem('darkMode', String(processedPreferences.dark_mode));
          localStorage.setItem('theme', desiredTheme);
          document.cookie = `theme=${desiredTheme}; path=/; max-age=31536000; samesite=lax`;
          if (user) {
            localStorage.setItem(`user-theme:${user.id}` as const, desiredTheme);
          }
        }
      } catch {}
      return { data: processedPreferences, error: null };
    } catch (err) {
      console.error('Error updating preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Fallback to localStorage on error
      const newPrefs = { ...preferences, ...updates, updated_at: new Date().toISOString() };
      setPreferences(newPrefs);
      saveToLocalStorage(newPrefs.dark_mode, newPrefs.email_notifications);
      // Ensure class sync and per-user cache with cached value
      if (newPrefs.dark_mode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      try {
        if (user) {
          const themeStr = newPrefs.dark_mode ? 'dark' : 'light';
          localStorage.setItem(`user-theme:${user.id}` as const, themeStr);
          localStorage.setItem('theme', themeStr);
          localStorage.setItem('darkMode', String(newPrefs.dark_mode));
          document.cookie = `theme=${themeStr}; path=/; max-age=31536000; samesite=lax`;
        }
      } catch {}
      setUseLocalStorage(true);
      return { data: newPrefs, error: null };
    }
  };

  const toggleDarkMode = async () => {
    if (!preferences) return;

    const newDarkMode = !preferences.dark_mode;
    
    // Immediately update local state for instant UI response
    setPreferences(prev => prev ? { ...prev, dark_mode: newDarkMode } : null);
    
    // Apply theme immediately
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    // Cache immediately for future loads and route transitions
    try {
      const themeStr = newDarkMode ? 'dark' : 'light';
      localStorage.setItem('darkMode', String(newDarkMode));
       localStorage.setItem('theme', themeStr);
      document.cookie = `theme=${themeStr}; path=/; max-age=31536000; samesite=lax`;
      if (user) {
        localStorage.setItem(`user-theme:${user.id}` as const, themeStr);
      }
    } catch {}

    // Then update storage (database or localStorage)
    console.log('Saving dark mode preference:', newDarkMode, 'for user:', user?.id);
    const result = await updatePreferences({
      dark_mode: newDarkMode,
    });
    console.log('Save result:', result);

    // If update failed, revert the UI state (though with localStorage fallback this shouldn't happen)
    if (result?.error) {
      setPreferences(prev => prev ? { ...prev, dark_mode: !newDarkMode } : null);
      if (!newDarkMode) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }

    return result;
  };

  const toggleEmailNotifications = async () => {
    if (!preferences) return;

    const newEmailNotifications = !preferences.email_notifications;
    
    // Immediately update local state
    setPreferences(prev => prev ? { ...prev, email_notifications: newEmailNotifications } : null);

    // Then update storage
    const result = await updatePreferences({
      email_notifications: newEmailNotifications,
    });

    // If update failed, revert the UI state
    if (result?.error) {
      setPreferences(prev => prev ? { ...prev, email_notifications: !newEmailNotifications } : null);
    }

    return result;
  };

// resetToLightMode function removed to avoid circular dependency with useAuth

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    toggleDarkMode,
    toggleEmailNotifications,
    isDarkMode: preferences?.dark_mode ?? false,
    emailNotifications: preferences?.email_notifications ?? true,
  };
} 