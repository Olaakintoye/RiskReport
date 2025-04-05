import { createClient } from '@supabase/supabase-js';
import { log } from './vite';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  log('Missing Supabase credentials in environment variables', 'error');
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions for Supabase operations
export const tables = {
  users: 'users',
  banks: 'banks',
  cdProducts: 'cd_products',
  investments: 'investments',
  transactions: 'transactions',
  notifications: 'notifications',
  userPreferences: 'user_preferences'
};

// Initialize Supabase tables
export async function initSupabaseTables() {
  log('Initializing Supabase tables', 'db');
  
  // This function would create the tables if they don't exist
  // For now, we're using Drizzle migrations to handle this
}

export function getSupabaseErrorMessage(error: any): string {
  return error?.message || 'Unknown Supabase error';
}

log('Supabase client initialized', 'db');