import { useApi } from './useApi';
import { signUp, signIn, signOut, getCurrentUser } from '@/lib/api';
import { User } from '@supabase/supabase-js';

export function useSignUp() {
  return useApi(signUp);
}

export function useSignIn() {
  return useApi(signIn);
}

export function useSignOut() {
  return useApi(signOut);
}

export function useCurrentUser() {
  return useApi(getCurrentUser);
}

export function useAuth() {
  const signUp = useSignUp();
  const signIn = useSignIn();
  const signOut = useSignOut();
  const currentUser = useCurrentUser();

  return {
    signUp,
    signIn,
    signOut,
    currentUser,
    isAuthenticated: !!currentUser.data,
  };
} 