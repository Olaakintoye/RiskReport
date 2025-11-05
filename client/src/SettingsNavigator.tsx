import React, { Suspense, lazy } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

// Eager load main settings screen for quick access
import SettingsScreen from './pages/settings/SettingsScreen';

// Lazy load sub-screens for better performance
const RiskAlertSettingsScreen = lazy(() => import('./pages/settings/RiskAlertSettingsScreen'));
const EditRiskAlertScreen = lazy(() => import('./pages/settings/EditRiskAlertScreen'));
const AlertHistoryScreen = lazy(() => import('./pages/settings/AlertHistoryScreen'));
const SubscriptionManagementScreen = lazy(() => import('./pages/settings/SubscriptionManagementScreen'));

// Loading fallback for settings screens
function SettingsLoadingFallback() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

// Create a stack navigator
const Stack = createStackNavigator();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F5F5F7' },
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="RiskAlertSettings">
        {() => (
          <Suspense fallback={<SettingsLoadingFallback />}>
            <RiskAlertSettingsScreen />
          </Suspense>
        )}
      </Stack.Screen>
      <Stack.Screen name="EditRiskAlert">
        {() => (
          <Suspense fallback={<SettingsLoadingFallback />}>
            <EditRiskAlertScreen />
          </Suspense>
        )}
      </Stack.Screen>
      <Stack.Screen name="AlertHistory">
        {() => (
          <Suspense fallback={<SettingsLoadingFallback />}>
            <AlertHistoryScreen />
          </Suspense>
        )}
      </Stack.Screen>
      <Stack.Screen name="SubscriptionManagement">
        {() => (
          <Suspense fallback={<SettingsLoadingFallback />}>
            <SubscriptionManagementScreen />
          </Suspense>
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
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
}); 