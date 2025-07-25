import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/lib/supabase';
import { UserPreferences, UserPreferencesInsert, UserPreferencesUpdate } from '@/lib/types';

export function usePreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      // For non-authenticated users, use localStorage
      loadFromLocalStorage();
    }
  }, [user]);

  const loadFromLocalStorage = () => {
    try {
      const darkMode = localStorage.getItem('darkMode') === 'true';
      const emailNotifications = localStorage.getItem('emailNotifications') !== 'false'; // default to true
      
      setPreferences({
        user_id: 'local',
        dark_mode: darkMode,
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
        // If table doesn't exist or no preferences exist, fall back to localStorage
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log('Database table not available, using localStorage fallback');
          setUseLocalStorage(true);
          loadFromLocalStorage();
          return;
        } else {
          throw error;
        }
      } else {
        setPreferences(data);
        setUseLocalStorage(false);
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

      const { data, error } = await supabase
        .from('user_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) throw error;
      setPreferences(data);
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
      
      setPreferences(data);
      return { data, error: null };
    } catch (err) {
      console.error('Error updating preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Fallback to localStorage on error
      const newPrefs = { ...preferences, ...updates, updated_at: new Date().toISOString() };
      setPreferences(newPrefs);
      saveToLocalStorage(newPrefs.dark_mode, newPrefs.email_notifications);
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
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Then update storage (database or localStorage)
    const result = await updatePreferences({
      dark_mode: newDarkMode,
    });

    // If update failed, revert the UI state (though with localStorage fallback this shouldn't happen)
    if (result?.error) {
      setPreferences(prev => prev ? { ...prev, dark_mode: !newDarkMode } : null);
      if (!newDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
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