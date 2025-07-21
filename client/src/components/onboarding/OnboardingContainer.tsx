import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingSlideshow from './OnboardingSlideshow';
import AuthenticationScreen from './AuthenticationScreen';
import { useAuth } from '../../hooks/use-auth';

interface OnboardingContainerProps {
  onComplete: () => void;
}

export default function OnboardingContainer({ onComplete }: OnboardingContainerProps) {
  const [showSlideshow, setShowSlideshow] = useState(true);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    // If user is already authenticated, complete onboarding
    if (user && !loading) {
      onComplete();
    }
    // If user is logged out, reset to show authentication screen (not slideshow)
    else if (!user && !loading) {
      setShowSlideshow(false);
    }
  }, [user, loading]);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboardingValue = await AsyncStorage.getItem('hasSeenOnboarding');
      if (hasSeenOnboardingValue === 'true') {
        setHasSeenOnboarding(true);
        setShowSlideshow(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleSlideshowComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      setHasSeenOnboarding(true);
      setShowSlideshow(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      setShowSlideshow(false);
    }
  };

  const handleAuthSuccess = () => {
    onComplete();
  };

  const handleBackToSlideshow = () => {
    setShowSlideshow(true);
  };

  // Show slideshow if user hasn't seen it yet
  if (showSlideshow && !hasSeenOnboarding) {
    return (
      <OnboardingSlideshow onComplete={handleSlideshowComplete} />
    );
  }

  // Show authentication screen
  return (
    <AuthenticationScreen 
      onAuthSuccess={handleAuthSuccess}
      onBack={handleBackToSlideshow}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 