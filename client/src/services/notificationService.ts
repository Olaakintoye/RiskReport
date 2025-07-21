import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { RiskMetrics, VaRResults } from './riskService';
import { Portfolio } from './portfolioService';

// Alert threshold storage keys
const STORAGE_KEYS = {
  ALERT_THRESHOLDS: 'risk-alerts:thresholds',
  ALERT_HISTORY: 'risk-alerts:history',
  ALERT_SETTINGS: 'risk-alerts:settings',
};

// Alert severity levels
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// Alert notification settings
export interface AlertSettings {
  enabled: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  emailNotifications: boolean;
  emailFrequency: 'immediate' | 'daily' | 'weekly';
  emailAddress: string;
}

// Default alert settings
export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  pushNotifications: true,
  inAppNotifications: true,
  emailNotifications: false,
  emailFrequency: 'daily',
  emailAddress: '',
};

// Risk metrics alert threshold
export interface RiskAlertThreshold {
  id: string;
  portfolioId: string | 'all'; // 'all' for all portfolios
  metricType: keyof RiskMetrics | 'var' | 'cvar'; // The type of risk metric
  operator: '>' | '<' | '==' | '>=' | '<='; // Comparison operator
  threshold: number; // The threshold value
  severity: AlertSeverity;
  enabled: boolean;
  name: string; // User-friendly name for the alert
  description?: string; // Optional description
}

// Alert history item
export interface AlertHistoryItem {
  id: string;
  thresholdId: string;
  portfolioId: string;
  portfolioName: string;
  metricType: string;
  metricValue: number;
  threshold: number;
  severity: AlertSeverity;
  timestamp: number;
  read: boolean;
}

/**
 * Get all alert thresholds
 */
export const getAlertThresholds = async (): Promise<RiskAlertThreshold[]> => {
  try {
    const thresholdsJson = await AsyncStorage.getItem(STORAGE_KEYS.ALERT_THRESHOLDS);
    if (thresholdsJson) {
      return JSON.parse(thresholdsJson);
    }
    return [];
  } catch (error) {
    console.error('Failed to get alert thresholds:', error);
    return [];
  }
};

/**
 * Save alert thresholds
 */
export const saveAlertThresholds = async (thresholds: RiskAlertThreshold[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ALERT_THRESHOLDS, JSON.stringify(thresholds));
    return true;
  } catch (error) {
    console.error('Failed to save alert thresholds:', error);
    return false;
  }
};

/**
 * Add or update an alert threshold
 */
export const saveAlertThreshold = async (threshold: RiskAlertThreshold): Promise<boolean> => {
  try {
    const thresholds = await getAlertThresholds();
    const index = thresholds.findIndex(t => t.id === threshold.id);
    
    if (index >= 0) {
      thresholds[index] = threshold;
    } else {
      thresholds.push(threshold);
    }
    
    return await saveAlertThresholds(thresholds);
  } catch (error) {
    console.error('Failed to save alert threshold:', error);
    return false;
  }
};

/**
 * Delete an alert threshold
 */
export const deleteAlertThreshold = async (thresholdId: string): Promise<boolean> => {
  try {
    const thresholds = await getAlertThresholds();
    const filteredThresholds = thresholds.filter(t => t.id !== thresholdId);
    return await saveAlertThresholds(filteredThresholds);
  } catch (error) {
    console.error('Failed to delete alert threshold:', error);
    return false;
  }
};

/**
 * Get alert settings
 */
export const getAlertSettings = async (): Promise<AlertSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.ALERT_SETTINGS);
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
    return DEFAULT_ALERT_SETTINGS;
  } catch (error) {
    console.error('Failed to get alert settings:', error);
    return DEFAULT_ALERT_SETTINGS;
  }
};

/**
 * Save alert settings
 */
export const saveAlertSettings = async (settings: AlertSettings): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ALERT_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Failed to save alert settings:', error);
    return false;
  }
};

/**
 * Get alert history
 */
export const getAlertHistory = async (): Promise<AlertHistoryItem[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(STORAGE_KEYS.ALERT_HISTORY);
    if (historyJson) {
      return JSON.parse(historyJson);
    }
    return [];
  } catch (error) {
    console.error('Failed to get alert history:', error);
    return [];
  }
};

/**
 * Save alert history
 */
export const saveAlertHistory = async (history: AlertHistoryItem[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Failed to save alert history:', error);
    return false;
  }
};

/**
 * Add an alert to history
 */
export const addAlertToHistory = async (alert: AlertHistoryItem): Promise<boolean> => {
  try {
    const history = await getAlertHistory();
    history.unshift(alert); // Add to beginning of array
    
    // Limit history to 100 items
    if (history.length > 100) {
      history.pop();
    }
    
    return await saveAlertHistory(history);
  } catch (error) {
    console.error('Failed to add alert to history:', error);
    return false;
  }
};

/**
 * Mark alert as read
 */
export const markAlertAsRead = async (alertId: string): Promise<boolean> => {
  try {
    const history = await getAlertHistory();
    const updatedHistory = history.map(alert => {
      if (alert.id === alertId) {
        return { ...alert, read: true };
      }
      return alert;
    });
    
    return await saveAlertHistory(updatedHistory);
  } catch (error) {
    console.error('Failed to mark alert as read:', error);
    return false;
  }
};

/**
 * Clear all alerts
 */
export const clearAlertHistory = async (): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Failed to clear alert history:', error);
    return false;
  }
};

/**
 * Check metrics against thresholds and create alerts
 */
export const checkRiskMetrics = async (
  portfolio: Portfolio,
  riskMetrics: RiskMetrics,
  varResults?: VaRResults
): Promise<AlertHistoryItem[]> => {
  try {
    const [thresholds, settings] = await Promise.all([
      getAlertThresholds(),
      getAlertSettings(),
    ]);
    
    // If alerts are disabled, return empty array
    if (!settings.enabled) {
      return [];
    }
    
    const newAlerts: AlertHistoryItem[] = [];
    const timestamp = Date.now();
    
    // Filter for enabled thresholds that apply to this portfolio
    const applicableThresholds = thresholds.filter(t => 
      t.enabled && (t.portfolioId === 'all' || t.portfolioId === portfolio.id)
    );
    
    for (const threshold of applicableThresholds) {
      let metricValue: number | undefined;
      
      // Get the metric value based on the metric type
      if (threshold.metricType === 'var' && varResults) {
        metricValue = varResults.varPercentage;
      } else if (threshold.metricType === 'cvar' && varResults) {
        metricValue = varResults.cvarPercentage;
      } else if (threshold.metricType in riskMetrics) {
        metricValue = riskMetrics[threshold.metricType as keyof RiskMetrics];
      }
      
      // If we have a metric value, check against threshold
      if (metricValue !== undefined) {
        let thresholdBreached = false;
        
        // Check if threshold is breached based on operator
        switch (threshold.operator) {
          case '>':
            thresholdBreached = metricValue > threshold.threshold;
            break;
          case '<':
            thresholdBreached = metricValue < threshold.threshold;
            break;
          case '==':
            thresholdBreached = metricValue === threshold.threshold;
            break;
          case '>=':
            thresholdBreached = metricValue >= threshold.threshold;
            break;
          case '<=':
            thresholdBreached = metricValue <= threshold.threshold;
            break;
        }
        
        // If threshold is breached, create alert
        if (thresholdBreached) {
          const alertId = `alert-${threshold.id}-${timestamp}`;
          
          const newAlert: AlertHistoryItem = {
            id: alertId,
            thresholdId: threshold.id,
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
            metricType: threshold.metricType,
            metricValue,
            threshold: threshold.threshold,
            severity: threshold.severity,
            timestamp,
            read: false,
          };
          
          newAlerts.push(newAlert);
          
          // Add to history
          await addAlertToHistory(newAlert);
          
          // Show in-app notification if enabled
          if (settings.inAppNotifications) {
            const metricName = getMetricDisplayName(threshold.metricType);
            const operator = getOperatorDisplaySymbol(threshold.operator);
            
            Alert.alert(
              `${threshold.severity.toUpperCase()} ALERT: ${threshold.name}`,
              `${portfolio.name}: ${metricName} is ${metricValue.toFixed(2)} ${operator} ${threshold.threshold.toFixed(2)}`
            );
            
            // Haptic feedback for alerts on iOS
            if (Platform.OS === 'ios') {
              switch (threshold.severity) {
                case AlertSeverity.INFO:
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  break;
                case AlertSeverity.WARNING:
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  break;
                case AlertSeverity.CRITICAL:
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  break;
              }
            }
          }
          
          // Send push notification (would implement with a push notification service)
          if (settings.pushNotifications) {
            // Implementation would be added here when integrating with a push service
            console.log('Push notification would be sent here');
          }
          
          // Send email notification (would implement with backend email service)
          if (settings.emailNotifications && settings.emailAddress && settings.emailFrequency === 'immediate') {
            // Implementation would be added here when integrating with email service
            console.log('Email notification would be sent here');
          }
        }
      }
    }
    
    return newAlerts;
  } catch (error) {
    console.error('Failed to check risk metrics against thresholds:', error);
    return [];
  }
};

/**
 * Get unread alerts count
 */
export const getUnreadAlertsCount = async (): Promise<number> => {
  try {
    const history = await getAlertHistory();
    return history.filter(alert => !alert.read).length;
  } catch (error) {
    console.error('Failed to get unread alerts count:', error);
    return 0;
  }
};

/**
 * Get user-friendly display name for metric
 */
export const getMetricDisplayName = (metricType: string): string => {
  switch (metricType) {
    case 'var':
      return 'Value at Risk (95%)';
    case 'cvar':
      return 'Conditional VaR';
    case 'volatility':
      return 'Volatility';
    case 'sharpeRatio':
      return 'Sharpe Ratio';
    case 'sortinoRatio':
      return 'Sortino Ratio';
    case 'beta':
      return 'Beta';
    case 'maxDrawdown':
      return 'Max Drawdown';
    case 'downsideDeviation':
      return 'Downside Deviation';
    default:
      return metricType;
  }
};

/**
 * Get display symbol for operator
 */
export const getOperatorDisplaySymbol = (operator: string): string => {
  switch (operator) {
    case '>':
      return '>';
    case '<':
      return '<';
    case '==':
      return '=';
    case '>=':
      return '≥';
    case '<=':
      return '≤';
    default:
      return operator;
  }
}; 