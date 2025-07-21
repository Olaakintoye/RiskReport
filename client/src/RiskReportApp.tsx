import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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

// Import services
import { initializeAllServices } from './services/initServices';
import { useState } from 'react';

// Import state persistence
import { ScreenStateProvider } from './hooks/use-screen-state';

// Create tab navigator
const Tab = createBottomTabNavigator();

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
            <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                switch (route.name) {
                  case 'Dashboard':
                    iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                  case 'Portfolio':
                    return <Ionicons name="pie-chart-outline" size={size} color={color} />;
                  case 'Risk Report':
                    iconName = focused ? 'chart-line' : 'chart-line-variant';
                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                  case 'Scenarios':
                    iconName = focused ? 'test-tube' : 'test-tube-empty';
                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                  case 'Settings':
                    iconName = focused ? 'cog' : 'cog-outline';
                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                  default:
                    iconName = 'help-circle-outline';
                    return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
                }
              },
              tabBarActiveTintColor: '#007AFF',
              tabBarInactiveTintColor: '#8E8E93',
              headerShown: false,
              tabBarStyle: {
                backgroundColor: '#FFFFFF',
                borderTopWidth: 1,
                borderTopColor: 'rgba(0,0,0,0.1)',
                elevation: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                height: 84,
                paddingBottom: 20,
                paddingTop: 8,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '500',
                marginTop: 4,
              },
              tabBarIconStyle: {
                marginTop: 4,
              },
            })}
          >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Portfolio" component={PortfolioScreen} />
            <Tab.Screen name="Risk Report" component={RiskReportScreen} />
            <Tab.Screen name="Scenarios" component={ScenariosScreen} />
            <Tab.Screen name="Settings" component={SettingsNavigator} />
          </Tab.Navigator>
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