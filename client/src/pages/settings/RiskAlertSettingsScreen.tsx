import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { v4 as uuidv4 } from '../../utils/uuid';

import * as notificationService from '../../services/notificationService';
import * as portfolioService from '../../services/portfolioService';
import { 
  RiskAlertThreshold, 
  AlertSettings, 
  DEFAULT_ALERT_SETTINGS,
  AlertSeverity,
  getMetricDisplayName
} from '../../services/notificationService';
import { Portfolio } from '../../services/portfolioService';

interface AlertSettingsState extends AlertSettings {}

interface AlertItemProps {
  alert: RiskAlertThreshold;
  onPress: (alert: RiskAlertThreshold) => void;
  onToggle: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ 
  alert, 
  onPress, 
  onToggle,
  onDelete
}) => {
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.INFO:
        return '#007AFF';
      case AlertSeverity.WARNING:
        return '#FF9500';
      case AlertSeverity.CRITICAL:
        return '#FF3B30';
      default:
        return '#007AFF';
    }
  };

  const color = getSeverityColor(alert.severity);
  
  return (
    <View style={styles.alertItem}>
      <TouchableOpacity 
        style={styles.alertItemContent}
        onPress={() => onPress(alert)}
        activeOpacity={0.7}
      >
        <View style={[styles.alertIndicator, { backgroundColor: color }]} />
        <View style={styles.alertDetails}>
          <Text style={styles.alertName}>{alert.name}</Text>
          <Text style={styles.alertMetric}>
            {getMetricDisplayName(alert.metricType)} {notificationService.getOperatorDisplaySymbol(alert.operator)} {alert.threshold.toFixed(2)}
          </Text>
          {alert.description && (
            <Text style={styles.alertDescription}>{alert.description}</Text>
          )}
        </View>
      </TouchableOpacity>
      
      <View style={styles.alertActions}>
        <Switch
          value={alert.enabled}
          onValueChange={(value) => onToggle(alert.id, value)}
          trackColor={{ false: '#e2e8f0', true: `${color}50` }}
          thumbColor={alert.enabled ? color : '#fff'}
          ios_backgroundColor="#e2e8f0"
          style={styles.alertSwitch}
        />
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(alert.id)}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Create a type for navigation to fix TypeScript errors
type NavigationProp = {
  navigate: (screen: string, params?: any) => void;
};

const RiskAlertSettingsScreen: React.FC = () => {
  const navigation = useNavigation() as NavigationProp;
  
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AlertSettingsState>(DEFAULT_ALERT_SETTINGS);
  const [thresholds, setThresholds] = useState<RiskAlertThreshold[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  
  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );
  
  // Load alert settings and thresholds
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load alert settings
      const savedSettings = await notificationService.getAlertSettings();
      setSettings(savedSettings);
      
      // Load alert thresholds
      const savedThresholds = await notificationService.getAlertThresholds();
      setThresholds(savedThresholds);
      
      // Load portfolios for selection
      const portfolioList = await portfolioService.getAllPortfolios();
      setPortfolios(portfolioList as unknown as Portfolio[]);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load alert settings:', error);
      Alert.alert('Error', 'Failed to load alert settings. Please try again.');
      setLoading(false);
    }
  };
  
  // Save alert settings
  const saveSettings = async () => {
    try {
      setLoading(true);
      
      const success = await notificationService.saveAlertSettings(settings);
      
      if (success) {
        Alert.alert('Success', 'Alert settings saved successfully!');
      } else {
        throw new Error('Failed to save alert settings');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to save alert settings:', error);
      Alert.alert('Error', 'Failed to save alert settings. Please try again.');
      setLoading(false);
    }
  };
  
  // Handle toggle of alert threshold enabled state
  const handleToggleAlert = async (id: string, value: boolean) => {
    try {
      const updatedThresholds = thresholds.map(threshold => {
        if (threshold.id === id) {
          return { ...threshold, enabled: value };
        }
        return threshold;
      });
      
      setThresholds(updatedThresholds);
      
      // Save the updated thresholds
      await notificationService.saveAlertThresholds(updatedThresholds);
      
      // Provide haptic feedback only if on iOS
      if (Platform && Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to toggle alert:', error);
      Alert.alert('Error', 'Failed to update alert. Please try again.');
    }
  };
  
  // Handle delete of alert threshold
  const handleDeleteAlert = (id: string) => {
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Filter out the deleted threshold
              const updatedThresholds = thresholds.filter(threshold => threshold.id !== id);
              
              // Update state
              setThresholds(updatedThresholds);
              
              // Save to storage
              await notificationService.saveAlertThresholds(updatedThresholds);
              
              // Provide haptic feedback
              if (Platform && Platform.OS === 'ios') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (error) {
              console.error('Failed to delete alert:', error);
              Alert.alert('Error', 'Failed to delete alert. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  // Handle edit of alert threshold
  const handleEditAlert = (alert: RiskAlertThreshold) => {
    navigation.navigate('EditRiskAlert', { alert, portfolios });
  };
  
  // Handle add new alert threshold
  const handleAddAlert = () => {
    // Create a new empty alert threshold
    const newAlert: RiskAlertThreshold = {
      id: uuidv4(),
      portfolioId: 'all',
      metricType: 'var',
      operator: '>',
      threshold: 5.0, // Default 5% VaR
      severity: AlertSeverity.WARNING,
      enabled: true,
      name: 'New Risk Alert',
    };
    
    navigation.navigate('EditRiskAlert', { alert: newAlert, portfolios, isNew: true });
  };
  
  // Handle viewing alert history
  const handleViewAlertHistory = () => {
    navigation.navigate('AlertHistory');
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Global Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Settings</Text>
        <View style={styles.sectionContent}>
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>Enable Risk Alerts</Text>
              <Text style={styles.settingsItemSubtitle}>Turn on/off all risk metric alerts</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(value) => setSettings({ ...settings, enabled: value })}
              trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
              thumbColor={settings.enabled ? '#10b981' : '#fff'}
              ios_backgroundColor="#e2e8f0"
            />
          </View>
          
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>In-App Notifications</Text>
              <Text style={styles.settingsItemSubtitle}>Show alerts within the app</Text>
            </View>
            <Switch
              value={settings.inAppNotifications}
              onValueChange={(value) => setSettings({ ...settings, inAppNotifications: value })}
              trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
              thumbColor={settings.inAppNotifications ? '#10b981' : '#fff'}
              ios_backgroundColor="#e2e8f0"
            />
          </View>
          
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>Push Notifications</Text>
              <Text style={styles.settingsItemSubtitle}>Send alerts to your device</Text>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(value) => setSettings({ ...settings, pushNotifications: value })}
              trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
              thumbColor={settings.pushNotifications ? '#10b981' : '#fff'}
              ios_backgroundColor="#e2e8f0"
            />
          </View>
          
          <View style={styles.settingsItem}>
            <View style={styles.settingsItemContent}>
              <Text style={styles.settingsItemTitle}>Email Notifications</Text>
              <Text style={styles.settingsItemSubtitle}>Send alerts via email</Text>
            </View>
            <Switch
              value={settings.emailNotifications}
              onValueChange={(value) => setSettings({ ...settings, emailNotifications: value })}
              trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
              thumbColor={settings.emailNotifications ? '#10b981' : '#fff'}
              ios_backgroundColor="#e2e8f0"
            />
          </View>
          
          {settings.emailNotifications && (
            <>
              <View style={styles.settingsItem}>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Email Frequency</Text>
                  <Text style={styles.settingsItemSubtitle}>How often to send email alerts</Text>
                </View>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={[
                      styles.frequencyOption,
                      settings.emailFrequency === 'immediate' && styles.frequencyOptionSelected
                    ]}
                    onPress={() => setSettings({ ...settings, emailFrequency: 'immediate' })}
                  >
                    <Text style={settings.emailFrequency === 'immediate' ? styles.frequencyTextSelected : styles.frequencyText}>
                      Immediate
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.frequencyOption,
                      settings.emailFrequency === 'daily' && styles.frequencyOptionSelected
                    ]}
                    onPress={() => setSettings({ ...settings, emailFrequency: 'daily' })}
                  >
                    <Text style={settings.emailFrequency === 'daily' ? styles.frequencyTextSelected : styles.frequencyText}>
                      Daily
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.frequencyOption,
                      settings.emailFrequency === 'weekly' && styles.frequencyOptionSelected
                    ]}
                    onPress={() => setSettings({ ...settings, emailFrequency: 'weekly' })}
                  >
                    <Text style={settings.emailFrequency === 'weekly' ? styles.frequencyTextSelected : styles.frequencyText}>
                      Weekly
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.settingsItem}>
                <View style={styles.settingsItemContent}>
                  <Text style={styles.settingsItemTitle}>Email Address</Text>
                  <Text style={styles.settingsItemSubtitle}>Where to send alert emails</Text>
                </View>
              </View>
              
              <TextInput
                style={styles.emailInput}
                value={settings.emailAddress}
                onChangeText={(text) => setSettings({ ...settings, emailAddress: text })}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          )}
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveSettings}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Alerts Section */}
      <View style={styles.section}>
        <View style={styles.alertsHeader}>
          <Text style={styles.sectionTitle}>Risk Alerts</Text>
          <View style={styles.alertsActions}>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={handleViewAlertHistory}
            >
              <MaterialCommunityIcons name="history" size={20} color="#007AFF" />
              <Text style={styles.historyButtonText}>History</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddAlert}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Add Alert</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.sectionContent}>
          {thresholds.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-off-outline" size={50} color="#94a3b8" />
              <Text style={styles.emptyStateText}>No risk alerts configured</Text>
              <Text style={styles.emptyStateSubtext}>Tap the Add Alert button to create your first alert</Text>
            </View>
          ) : (
            thresholds.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onPress={handleEditAlert}
                onToggle={handleToggleAlert}
                onDelete={handleDeleteAlert}
              />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    padding: 16,
    paddingBottom: 16,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 2,
  },
  settingsItemSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  pickerContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  frequencyOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  frequencyOptionSelected: {
    backgroundColor: '#007AFF',
  },
  frequencyText: {
    fontSize: 14,
    color: '#64748b',
  },
  frequencyTextSelected: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emailInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  alertsActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  historyButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  alertItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  alertDetails: {
    flex: 1,
  },
  alertName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  alertMetric: {
    fontSize: 14,
    color: '#64748b',
  },
  alertDescription: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  alertActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertSwitch: {
    marginRight: 8,
  },
  deleteButton: {
    padding: 8,
  },
});

export default RiskAlertSettingsScreen; 