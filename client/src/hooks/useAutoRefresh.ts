import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAutoRefreshOptions {
  interval: number; // Refresh interval in milliseconds
  enabled?: boolean; // Whether auto-refresh is enabled
  onRefresh: () => Promise<void> | void; // Function to call for refresh
  respectMarketHours?: boolean; // Whether to only refresh during market hours
}

/**
 * Custom hook for automatic data refresh
 * Handles background/foreground state, market hours, and cleanup
 */
export const useAutoRefresh = ({
  interval,
  enabled = true,
  onRefresh,
  respectMarketHours = true
}: UseAutoRefreshOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onRefreshRef = useRef(onRefresh);
  const intervalRefValue = useRef(interval);
  const respectMarketHoursRef = useRef(respectMarketHours);
  
  // Update refs when props change
  useEffect(() => {
    onRefreshRef.current = onRefresh;
    intervalRefValue.current = interval;
    respectMarketHoursRef.current = respectMarketHours;
  }, [onRefresh, interval, respectMarketHours]);

  /**
   * Check if current time is within market hours (9:30 AM - 4:00 PM ET)
   * This is a simplified check - in production you'd want more sophisticated market hours logic
   */
  const isMarketHours = useCallback((): boolean => {
    if (!respectMarketHours) return true;

    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hours = easternTime.getHours();
    const minutes = easternTime.getMinutes();
    const dayOfWeek = easternTime.getDay();

    // Check if it's a weekday (Monday=1 to Friday=5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // Weekend
    }

    // Market hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
    const marketClose = 16 * 60; // 4:00 PM in minutes
    const currentTime = hours * 60 + minutes;

    return currentTime >= marketOpen && currentTime <= marketClose;
  }, [respectMarketHours]);

  /**
   * Start the auto-refresh interval
   */
  const startRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active' && (isMarketHours() || respectMarketHoursRef.current)) {
        onRefreshRef.current();
      }
    }, intervalRefValue.current);
  }, []);

  /**
   * Stop the auto-refresh interval
   */
  const stopRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Handle app state changes (foreground/background)
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    appStateRef.current = nextAppState;

    if (nextAppState === 'active') {
      // App came to foreground, trigger immediate refresh and restart interval
      if (isMarketHours() || respectMarketHoursRef.current) {
        onRefreshRef.current();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(() => {
        if (appStateRef.current === 'active' && (isMarketHours() || respectMarketHoursRef.current)) {
          onRefreshRef.current();
        }
      }, intervalRefValue.current);
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App went to background, stop refreshing to save battery and API calls
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isMarketHours]);

  useEffect(() => {
    if (!enabled) {
      stopRefresh();
      return;
    }

    // Initial refresh when component mounts
    if (isMarketHours() || respectMarketHoursRef.current) {
      onRefreshRef.current();
    }

    // Start auto-refresh interval
    startRefresh();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      stopRefresh();
      subscription?.remove();
    };
  }, [enabled, startRefresh, stopRefresh, handleAppStateChange, isMarketHours]);

  return {
    isMarketHours: isMarketHours(),
    stopRefresh,
    startRefresh
  };
};

export default useAutoRefresh;
