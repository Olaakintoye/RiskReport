import React from 'react';
import { Stack } from 'expo-router';
import AuthScreen from '../pages/auth/AuthScreen';

export default function Auth() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Sign In',
          headerShown: false,
        }}
      />
      <AuthScreen />
    </>
  );
} 