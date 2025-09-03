// Polyfills are loaded in App.tsx, no need to import here
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Your new Supabase project configuration
const supabaseUrl = 'https://qlyqxlzlxdqboxpxpdjp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFseXF4bHpseGRxYm94cHhwZGpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTkwNzMsImV4cCI6MjA2NTY5NTA3M30.lHXOj3_co_4GPLqPyFKr64jfz3V7qPYc6St7-SiNbaM';

console.log('Initializing Supabase client with URL:', supabaseUrl);
console.log('Using anon key:', supabaseAnonKey.substring(0, 10) + '...');

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-react-native',
    },
  },
});

// Test the connection - commented out for development to avoid network errors
// supabase.auth.getSession().then(({ data, error }) => {
//   if (error) {
//     console.error('Supabase connection test failed:', error);
//   } else {
//     console.log('Supabase connection test successful');
//   }
// });

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  isVerified: boolean;
}; 