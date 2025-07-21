import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { format, formatDistanceToNow } from 'date-fns';

import * as notificationService from '../../services/notificationService';
import { 
  AlertHistoryItem, 
  AlertSeverity,
  getMetricDisplayName
} from '../../services/notificationService';

interface AlertItemProps {
  alert: AlertHistoryItem;
  onPress: (alert: AlertHistoryItem) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onPress }) => {
  // Get severity color
  const getSeverityColor = (severity: AlertSeverity): string => {
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

  // Format date for display
  const formatDate = (timestamp: number): string => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <TouchableOpacity 
      style={[
        styles.alertItem,
        alert.read ? styles.alertItemRead : {}
      ]} 
      onPress={() => onPress(alert)}
      activeOpacity={0.7}
    >
      <View style={[styles.alertIndicator, { backgroundColor: getSeverityColor(alert.severity) }]} />
      
      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <Text style={styles.alertType}>{alert.severity.toUpperCase()}</Text>
          <Text style={styles.alertTime}>{formatDate(alert.timestamp)}</Text>
        </View>
        
        <Text style={styles.alertTitle}>
          {getMetricDisplayName(alert.metricType)} {notificationService.getOperatorDisplaySymbol(alert.metricType === 'var' || alert.metricType === 'volatility' ? '>' : '<')} {alert.threshold.toFixed(2)}
        </Text>
        
        <Text style={styles.alertDescription}>
          Portfolio: {alert.portfolioName} - Value: {alert.metricValue.toFixed(2)}
        </Text>
      </View>
      
      {!alert.read && (
        <View style={styles.unreadIndicator} />
      )}
    </TouchableOpacity>
  );
};

const AlertHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<AlertHistoryItem[]>([]);
  
  // Load alert history when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAlertHistory();
    }, [])
  );
  
  // Load alert history
  const loadAlertHistory = async () => {
    try {
      setLoading(true);
      
      const history = await notificationService.getAlertHistory();
      setAlerts(history);
      
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Failed to load alert history:', error);
      Alert.alert('Error', 'Failed to load alert history. Please try again.');
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadAlertHistory();
  };
  
  // Handle clear all alerts
  const handleClearAll = () => {
    Alert.alert(
      'Clear Alert History',
      'Are you sure you want to clear all alerts? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await notificationService.clearAlertHistory();
              
              if (success) {
                setAlerts([]);
                
                // Provide haptic feedback
                if (Platform.OS === 'ios') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } else {
                throw new Error('Failed to clear alert history');
              }
            } catch (error) {
              console.error('Failed to clear alert history:', error);
              Alert.alert('Error', 'Failed to clear alert history. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      // Update all alerts to read in state
      const updatedAlerts = alerts.map(alert => ({
        ...alert,
        read: true
      }));
      
      setAlerts(updatedAlerts);
      
      // Save to storage
      await notificationService.saveAlertHistory(updatedAlerts);
      
      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
      Alert.alert('Error', 'Failed to mark all alerts as read. Please try again.');
    }
  };
  
  // Handle press on alert item
  const handleAlertPress = async (alert: AlertHistoryItem) => {
    try {
      if (!alert.read) {
        // Mark as read in state
        const updatedAlerts = alerts.map(a => {
          if (a.id === alert.id) {
            return { ...a, read: true };
          }
          return a;
        });
        
        setAlerts(updatedAlerts);
        
        // Mark as read in storage
        await notificationService.markAlertAsRead(alert.id);
      }
      
      // Show alert details
      Alert.alert(
        `${alert.severity.toUpperCase()} ALERT`,
        `Portfolio: ${alert.portfolioName}\n` +
        `Metric: ${getMetricDisplayName(alert.metricType)}\n` +
        `Value: ${alert.metricValue.toFixed(2)}\n` +
        `Threshold: ${alert.threshold.toFixed(2)}\n` +
        `Date: ${format(new Date(alert.timestamp), 'PPpp')}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to handle alert press:', error);
    }
  };
  
  // Render empty state
  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="bell-check-outline" size={50} color="#94a3b8" />
        <Text style={styles.emptyStateText}>No alerts in history</Text>
        <Text style={styles.emptyStateSubtext}>
          Alerts will appear here when your risk metrics cross the thresholds you've set
        </Text>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alert History</Text>
        
        <View style={styles.headerActions}>
          {alerts.length > 0 && (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleMarkAllAsRead}
              >
                <MaterialCommunityIcons name="eye-check" size={20} color="#007AFF" />
                <Text style={styles.headerButtonText}>Mark All Read</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.headerButton, styles.clearButton]}
                onPress={handleClearAll}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF3B30" />
                <Text style={[styles.headerButtonText, styles.clearButtonText]}>Clear All</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      
      <FlatList
        data={alerts}
        renderItem={({ item }) => (
          <AlertItem
            alert={item}
            onPress={handleAlertPress}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#E1F0FF',
    marginLeft: 8,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 4,
  },
  clearButton: {
    backgroundColor: '#FEE2E2',
  },
  clearButtonText: {
    color: '#FF3B30',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertItemRead: {
    opacity: 0.7,
  },
  alertIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  alertTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
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
    lineHeight: 20,
  },
});

export default AlertHistoryScreen; 