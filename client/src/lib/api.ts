import { supabase } from './supabase';
import { Database } from '@/types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Investment = Database['public']['Tables']['investments']['Row'];
type Transaction = Database['public']['Tables']['transactions']['Row'];

// Profile API
export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const updateProfile = async (
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Investments API
export const getInvestments = async (userId: string): Promise<Investment[]> => {
  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createInvestment = async (
  investment: Omit<Investment, 'id' | 'created_at' | 'updated_at'>
): Promise<Investment> => {
  const { data, error } = await supabase
    .from('investments')
    .insert(investment)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateInvestment = async (
  investmentId: string,
  updates: Partial<Investment>
): Promise<Investment> => {
  const { data, error } = await supabase
    .from('investments')
    .update(updates)
    .eq('id', investmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Transactions API
export const getTransactions = async (
  investmentId: string
): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('investment_id', investmentId)
    .order('transaction_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const createTransaction = async (
  transaction: Omit<Transaction, 'id' | 'created_at'>
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Auth API
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}; 