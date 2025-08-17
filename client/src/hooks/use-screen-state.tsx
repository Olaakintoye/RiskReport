import React, { createContext, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

interface ScreenState {
  [screenName: string]: {
    [key: string]: any;
  };
}

interface ScreenStateContextType {
  getScreenState: (screenName: string) => any;
  setScreenState: (screenName: string, state: any) => void;
  clearScreenState: (screenName: string) => void;
  clearAllScreenState: () => void;
}

const ScreenStateContext = createContext<ScreenStateContextType | undefined>(undefined);

const SCREEN_STATE_STORAGE_KEY = 'screen_state_persistence';

export function ScreenStateProvider({ children }: { children: React.ReactNode }) {
  // Add defensive check for React hooks
  if (!React || !useState || !useEffect) {
    console.error('React hooks not available in ScreenStateProvider');
    return (
      <View style={{ flex: 1 }}>
        {children}
      </View>
    );
  }

  const [screenStates, setScreenStates] = useState<ScreenState>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
  }, []);

  const loadPersistedState = async () => {
    try {
      const persistedState = await AsyncStorage.getItem(SCREEN_STATE_STORAGE_KEY);
      if (persistedState) {
        setScreenStates(JSON.parse(persistedState));
      }
    } catch (error) {
      console.error('Failed to load persisted screen state:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveStateToStorage = async (newStates: ScreenState) => {
    try {
      await AsyncStorage.setItem(SCREEN_STATE_STORAGE_KEY, JSON.stringify(newStates));
    } catch (error) {
      console.error('Failed to save screen state:', error);
    }
  };

  const getScreenState = (screenName: string) => {
    return screenStates[screenName] || {};
  };

  const setScreenState = (screenName: string, state: any) => {
    const newStates = {
      ...screenStates,
      [screenName]: {
        ...screenStates[screenName],
        ...state,
      },
    };
    setScreenStates(newStates);
    saveStateToStorage(newStates);
  };

  const clearScreenState = (screenName: string) => {
    const newStates = { ...screenStates };
    delete newStates[screenName];
    setScreenStates(newStates);
    saveStateToStorage(newStates);
  };

  const clearAllScreenState = async () => {
    setScreenStates({});
    try {
      await AsyncStorage.removeItem(SCREEN_STATE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear all screen state:', error);
    }
  };

  if (!isLoaded) {
    // Don't return null as it breaks the component tree
    // Instead, provide a basic context while loading
    return (
      <ScreenStateContext.Provider
        value={{
          getScreenState: () => ({}),
          setScreenState: () => {},
          clearScreenState: () => {},
          clearAllScreenState: async () => {},
        }}
      >
        {children}
      </ScreenStateContext.Provider>
    );
  }

  return (
    <ScreenStateContext.Provider
      value={{
        getScreenState,
        setScreenState,
        clearScreenState,
        clearAllScreenState,
      }}
    >
      {children}
    </ScreenStateContext.Provider>
  );
}

export function useScreenState(screenName: string) {
  const context = useContext(ScreenStateContext);
  if (context === undefined) {
    throw new Error('useScreenState must be used within a ScreenStateProvider');
  }

  const { getScreenState, setScreenState } = context;

  return {
    screenState: getScreenState(screenName),
    setScreenState: (state: any) => setScreenState(screenName, state),
    clearScreenState: () => context.clearScreenState(screenName),
  };
}

// Hook for automatic state persistence during navigation
export function usePersistentState<T>(
  screenName: string, 
  stateKey: string, 
  initialValue: T
): [T, (value: T) => void] {
  const { screenState, setScreenState } = useScreenState(screenName);
  const [state, setState] = useState<T>(screenState[stateKey] ?? initialValue);

  // Update local state when screen state changes
  useEffect(() => {
    if (screenState[stateKey] !== undefined) {
      setState(screenState[stateKey]);
    }
  }, [screenState, stateKey]);

  const updateState = (newValue: T) => {
    setState(newValue);
    setScreenState({ [stateKey]: newValue });
  };

  return [state, updateState];
}

// Hook for restoring state when screen comes into focus
export function useRestoreStateOnFocus(
  screenName: string,
  restoreCallback: (state: any) => void
) {
  const { screenState } = useScreenState(screenName);

  useFocusEffect(
    React.useCallback(() => {
      // Restore state when screen comes into focus
      if (Object.keys(screenState).length > 0) {
        restoreCallback(screenState);
      }
    }, [screenState, restoreCallback])
  );
}

// Hook for saving state when screen loses focus
export function useSaveStateOnBlur(
  screenName: string,
  getCurrentState: () => any
) {
  const { setScreenState } = useScreenState(screenName);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Save current state when screen loses focus
        const currentState = getCurrentState();
        if (currentState && Object.keys(currentState).length > 0) {
          setScreenState(currentState);
        }
      };
    }, [setScreenState, getCurrentState])
  );
} 