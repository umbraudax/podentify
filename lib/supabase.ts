import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl === 'your-supabase-project-url' || !supabaseUrl.startsWith('https://')) {
  throw new Error('Please set NEXT_PUBLIC_SUPABASE_URL in your .env.local file with a valid Supabase project URL');
}

if (!supabaseAnonKey || supabaseAnonKey === 'your-supabase-anon-key') {
  throw new Error('Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file with your Supabase anonymous key');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Database type is now imported from database.types.ts