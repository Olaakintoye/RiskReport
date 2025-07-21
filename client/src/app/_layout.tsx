import React from 'react';
import { Stack } from 'expo-router';
import { useAuth } from '../hooks/use-auth';

export default function RootLayout() {
  const { user } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      {!user ? (
        <Stack.Screen
          name="auth"
          options={{
            title: 'Sign In',
          }}
        />
      ) : (
        <>
          <Stack.Screen
            name="index"
            options={{
              title: 'Home',
            }}
          />
          <Stack.Screen
            name="var"
            options={{
              title: 'Value at Risk',
            }}
          />
          <Stack.Screen
            name="upload"
            options={{
              title: 'Upload Video',
            }}
          />
        </>
      )}
    </Stack>
  );
} 