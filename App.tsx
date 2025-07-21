import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import the main app with tab navigation
import RiskReportApp from './client/src/RiskReportApp';
import { ThemeProvider } from './client/src/lib/theme-provider';

// Import onboarding and auth
import OnboardingContainer from './client/src/components/onboarding/OnboardingContainer';
import { AuthProvider, useAuth } from './client/src/hooks/use-auth';

const queryClient = new QueryClient();

function AppContent() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const { user } = useAuth();

  // Reset onboarding when user logs out
  useEffect(() => {
    if (!user) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <SafeAreaProvider>
        {showOnboarding ? (
          <OnboardingContainer onComplete={handleOnboardingComplete} />
        ) : (
          <RiskReportApp />
        )}
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 