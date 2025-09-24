import React from 'react';
import { useAuth } from './hooks/use-auth';

export default function AppWeb() {
  const { user } = useAuth();

  if (!user) {
    // For web, redirect to auth page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth';
    }
    return <div>Redirecting to login...</div>;
  }

  // For web, redirect to dashboard
  if (typeof window !== 'undefined') {
    window.location.href = '/dashboard';
  }
  return <div>Redirecting to dashboard...</div>;
}
