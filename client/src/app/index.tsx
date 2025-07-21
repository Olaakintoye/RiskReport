import React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/use-auth';

export default function Index() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href="/feed" />;
} 