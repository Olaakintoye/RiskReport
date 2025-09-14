import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import settings screens
import SettingsScreen from './pages/settings/SettingsScreen';
import RiskAlertSettingsScreen from './pages/settings/RiskAlertSettingsScreen';
import EditRiskAlertScreen from './pages/settings/EditRiskAlertScreen';
import AlertHistoryScreen from './pages/settings/AlertHistoryScreen';
import SubscriptionManagementScreen from './pages/settings/SubscriptionManagementScreen';

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
      <Stack.Screen name="RiskAlertSettings" component={RiskAlertSettingsScreen} />
      <Stack.Screen name="EditRiskAlert" component={EditRiskAlertScreen} />
      <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
      <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} />
    </Stack.Navigator>
  );
} 