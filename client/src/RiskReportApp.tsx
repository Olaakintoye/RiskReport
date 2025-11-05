import React, { useEffect, Suspense, lazy, useState as useReactState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, ActivityIndicator, InteractionManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { enableScreens } from 'react-native-screens';

// Enable native screen optimization for better performance
enableScreens(true);

// Store preloaded modules to prevent re-loading
const moduleCache: { [key: string]: any } = {};

// Lazy load screens with caching
const DashboardScreen = lazy(() => {
  if (moduleCache.Dashboard) return Promise.resolve(moduleCache.Dashboard);
  return import('./pages/dashboard/redesigned').then(module => {
    moduleCache.Dashboard = { default: module.DashboardScreen };
    return moduleCache.Dashboard;
  });
});

const PortfolioScreen = lazy(() => {
  if (moduleCache.Portfolio) return Promise.resolve(moduleCache.Portfolio);
  return import('./pages/portfolio/PortfolioScreen').then(module => {
    moduleCache.Portfolio = module;
    return module;
  });
});

const RiskReportScreen = lazy(() => {
  if (moduleCache.RiskReport) return Promise.resolve(moduleCache.RiskReport);
  return import('./pages/risk-report/redesigned').then(module => {
    moduleCache.RiskReport = { default: module.RiskReportScreen };
    return moduleCache.RiskReport;
  });
});

const ScenariosScreen = lazy(() => {
  if (moduleCache.Scenarios) return Promise.resolve(moduleCache.Scenarios);
  return import('./pages/scenarios/ScenariosScreen').then(module => {
    moduleCache.Scenarios = module;
    return module;
  });
});

const AdvisorsScreen = lazy(() => {
  if (moduleCache.Advisors) return Promise.resolve(moduleCache.Advisors);
  return import('./pages/advisors/AdvisorsScreen').then(module => {
    moduleCache.Advisors = module;
    return module;
  });
});

// Import navigators (keep settings eager for quick access)
import SettingsNavigator from './SettingsNavigator';

// Import custom components
import { CustomTabBar } from './components/ui/CustomTabBar';

// Import services
import { initializeAllServices } from './services/initServices';
import { useState } from 'react';

// Import state persistence
import { ScreenStateProvider } from './hooks/use-screen-state';

// Create navigators
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// Minimal loading fallback - nearly invisible for instant feel
// Only shows briefly on first load of each screen
function ScreenLoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      {/* Minimal spinner - smaller and less obtrusive */}
      <ActivityIndicator size="small" color="#007AFF" style={{ opacity: 0.6 }} />
    </View>
  );
}

// Preload all screens in background after app is interactive
function preloadScreens() {
  InteractionManager.runAfterInteractions(() => {
    // Preload in order of likely usage
    setTimeout(() => {
      import('./pages/dashboard/redesigned').catch(() => {});
      import('./pages/portfolio/PortfolioScreen').catch(() => {});
    }, 100);
    
    setTimeout(() => {
      import('./pages/risk-report/redesigned').catch(() => {});
      import('./pages/scenarios/ScenariosScreen').catch(() => {});
    }, 500);
    
    setTimeout(() => {
      import('./pages/advisors/AdvisorsScreen').catch(() => {});
    }, 1000);
  });
}

// Tabs component extracted for root stack usage
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      detachInactiveScreens={false}  // Keep screens mounted for instant switching
      screenOptions={{
        headerShown: false,
        lazy: false,                  // Load immediately for instant switching
        freezeOnBlur: true,           // Freeze inactive screens (saves CPU/memory)
      }}
    >
      <Tab.Screen name="Home">
        {() => (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <DashboardScreen />
          </Suspense>
        )}
      </Tab.Screen>
      <Tab.Screen name="Portfolio">
        {() => (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <PortfolioScreen />
          </Suspense>
        )}
      </Tab.Screen>
      <Tab.Screen name="Risk">
        {() => (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <RiskReportScreen />
          </Suspense>
        )}
      </Tab.Screen>
      <Tab.Screen name="Stress Test">
        {() => (
          <Suspense fallback={<ScreenLoadingFallback />}>
            <ScenariosScreen />
          </Suspense>
        )}
      </Tab.Screen>
      <Tab.Screen name="Profile" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}

export default function RiskReportApp() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Show UI immediately, initialize services in background
        setIsLoading(false);
        
        // Preload all screens in background for instant navigation
        preloadScreens();
        
        // Defer heavy service initialization until after interactions complete
        InteractionManager.runAfterInteractions(() => {
          initializeAllServices().catch(err => {
            console.error('Failed to initialize services:', err);
            // Don't block UI, just log error - services will retry on demand
          });
        });
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError('Failed to initialize app data. Please restart the app.');
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Show loading screen while initializing services
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Initializing app data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error screen if initialization failed
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Main app with tab navigation
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScreenStateProvider>
          <NavigationContainer>
            <RootStack.Navigator 
              screenOptions={{ 
                headerShown: false,
                cardStyle: { backgroundColor: '#F5F5F7' }
              }}
            >
              <RootStack.Screen name="MainTabs" component={MainTabs} />
              <RootStack.Screen name="Advisors">
                {() => (
                  <Suspense fallback={<ScreenLoadingFallback />}>
                    <AdvisorsScreen />
                  </Suspense>
                )}
              </RootStack.Screen>
            </RootStack.Navigator>
          </NavigationContainer>
        </ScreenStateProvider>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1C1C1E',
    textAlign: 'center',
  },
}); 