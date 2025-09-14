import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// Import screens
import PortfolioScreen from './pages/portfolio/PortfolioScreen';
import { RiskReportScreen } from './pages/risk-report/redesigned';
import ScenariosScreen from './pages/scenarios/ScenariosScreen';
import { DashboardScreen } from './pages/dashboard/redesigned';

// Import navigators
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

// Tabs component extracted for root stack usage
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Portfolio" component={PortfolioScreen} />
      <Tab.Screen name="Risk" component={RiskReportScreen} />
      <Tab.Screen name="Stress Test" component={ScenariosScreen} />
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
        await initializeAllServices();
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize services:', err);
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
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="MainTabs" component={MainTabs} />
              <RootStack.Screen name="Advisors" component={require('./pages/advisors/AdvisorsScreen').default} />
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