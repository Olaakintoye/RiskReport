import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Localization from 'expo-localization';
import { Alert, Platform } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  DATA_FEED_SETTINGS: 'data_feed_settings',
  NOTIFICATION_SETTINGS: 'notification_settings',
  SECURITY_SETTINGS: 'security_settings',
  EXPORT_SETTINGS: 'export_settings',
  APPEARANCE_SETTINGS: 'appearance_settings',
  API_KEYS: 'api_keys',
};

// Interfaces
export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  profileImage?: string;
}

export interface DataFeedSettings {
  marketDataSource: 'yahoo' | 'alpha_vantage' | 'iex' | 'polygon';
  refreshFrequency: number; // minutes
  apiKeys: {
    alphaVantage?: string;
    iex?: string;
    polygon?: string;
  };
  enableRealTimeData: boolean;
  enableAfterHoursData: boolean;
}

export interface NotificationSettings {
  dailyReportEnabled: boolean;
  thresholdAlertsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  emailAddress: string;
  alertThresholds: {
    varThreshold: number;
    volatilityThreshold: number;
    drawdownThreshold: number;
  };
}

export interface SecuritySettings {
  biometricEnabled: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: number; // minutes
  requirePasswordChange: boolean;
  lastPasswordChange?: string;
}

export interface ExportSettings {
  defaultFormat: 'pdf' | 'csv' | 'excel';
  includeCharts: boolean;
  emailReportsEnabled: boolean;
  emailSchedule: 'daily' | 'weekly' | 'monthly';
  excelIntegrationEnabled: boolean;
}

export interface AppearanceSettings {
  darkMode: boolean;
  language: string;
  currency: string;
  dateFormat: string;
  numberFormat: string;
  chartTheme: 'light' | 'dark' | 'auto';
}

// Default settings
export const DEFAULT_DATA_FEED_SETTINGS: DataFeedSettings = {
  marketDataSource: 'yahoo',
  refreshFrequency: 15,
  apiKeys: {},
  enableRealTimeData: false,
  enableAfterHoursData: false,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  dailyReportEnabled: true,
  thresholdAlertsEnabled: true,
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: false,
  emailAddress: '',
  alertThresholds: {
    varThreshold: 5.0,
    volatilityThreshold: 25.0,
    drawdownThreshold: 10.0,
  },
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  biometricEnabled: false,
  twoFactorEnabled: false,
  sessionTimeout: 30,
  requirePasswordChange: false,
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  defaultFormat: 'pdf',
  includeCharts: true,
  emailReportsEnabled: false,
  emailSchedule: 'weekly',
  excelIntegrationEnabled: false,
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  darkMode: false,
  language: Localization.locale,
  currency: 'USD',
  dateFormat: 'MM/DD/YYYY',
  numberFormat: 'en-US',
  chartTheme: 'auto',
};

// User Profile Functions
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const profileJson = await AsyncStorage.getItem('user_profile');
    return profileJson ? JSON.parse(profileJson) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (profile: Partial<UserProfile>): Promise<boolean> => {
  try {
    const currentProfile = await getUserProfile();
    const updatedProfile = { ...currentProfile, ...profile };
    await AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
    return true;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

// Data Feed Settings
export const getDataFeedSettings = async (): Promise<DataFeedSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.DATA_FEED_SETTINGS);
    return settingsJson ? { ...DEFAULT_DATA_FEED_SETTINGS, ...JSON.parse(settingsJson) } : DEFAULT_DATA_FEED_SETTINGS;
  } catch (error) {
    console.error('Error getting data feed settings:', error);
    return DEFAULT_DATA_FEED_SETTINGS;
  }
};

export const updateDataFeedSettings = async (settings: Partial<DataFeedSettings>): Promise<boolean> => {
  try {
    const currentSettings = await getDataFeedSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.DATA_FEED_SETTINGS, JSON.stringify(updatedSettings));
    return true;
  } catch (error) {
    console.error('Error updating data feed settings:', error);
    return false;
  }
};

// Notification Settings
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
    return settingsJson ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(settingsJson) } : DEFAULT_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<boolean> => {
  try {
    const currentSettings = await getNotificationSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(updatedSettings));
    return true;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return false;
  }
};

// Security Settings
export const getSecuritySettings = async (): Promise<SecuritySettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS);
    return settingsJson ? { ...DEFAULT_SECURITY_SETTINGS, ...JSON.parse(settingsJson) } : DEFAULT_SECURITY_SETTINGS;
  } catch (error) {
    console.error('Error getting security settings:', error);
    return DEFAULT_SECURITY_SETTINGS;
  }
};

export const updateSecuritySettings = async (settings: Partial<SecuritySettings>): Promise<boolean> => {
  try {
    const currentSettings = await getSecuritySettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(updatedSettings));
    return true;
  } catch (error) {
    console.error('Error updating security settings:', error);
    return false;
  }
};

// Export Settings
export const getExportSettings = async (): Promise<ExportSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.EXPORT_SETTINGS);
    return settingsJson ? { ...DEFAULT_EXPORT_SETTINGS, ...JSON.parse(settingsJson) } : DEFAULT_EXPORT_SETTINGS;
  } catch (error) {
    console.error('Error getting export settings:', error);
    return DEFAULT_EXPORT_SETTINGS;
  }
};

export const updateExportSettings = async (settings: Partial<ExportSettings>): Promise<boolean> => {
  try {
    const currentSettings = await getExportSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.EXPORT_SETTINGS, JSON.stringify(updatedSettings));
    return true;
  } catch (error) {
    console.error('Error updating export settings:', error);
    return false;
  }
};

// Appearance Settings
export const getAppearanceSettings = async (): Promise<AppearanceSettings> => {
  try {
    const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.APPEARANCE_SETTINGS);
    return settingsJson ? { ...DEFAULT_APPEARANCE_SETTINGS, ...JSON.parse(settingsJson) } : DEFAULT_APPEARANCE_SETTINGS;
  } catch (error) {
    console.error('Error getting appearance settings:', error);
    return DEFAULT_APPEARANCE_SETTINGS;
  }
};

export const updateAppearanceSettings = async (settings: Partial<AppearanceSettings>): Promise<boolean> => {
  try {
    const currentSettings = await getAppearanceSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.APPEARANCE_SETTINGS, JSON.stringify(updatedSettings));
    return true;
  } catch (error) {
    console.error('Error updating appearance settings:', error);
    return false;
  }
};

// Biometric Authentication
export const checkBiometricSupport = async (): Promise<{ isAvailable: boolean; type: string }> => {
  try {
    const isAvailable = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    
    let type = 'None';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      type = Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      type = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    }
    
    return {
      isAvailable: isAvailable && isEnrolled,
      type
    };
  } catch (error) {
    console.error('Error checking biometric support:', error);
    return { isAvailable: false, type: 'None' };
  }
};

export const authenticateWithBiometrics = async (): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Risk Report',
      fallbackLabel: 'Use Password',
      cancelLabel: 'Cancel',
    });
    
    return result.success;
  } catch (error) {
    console.error('Error with biometric authentication:', error);
    return false;
  }
};

// API Key Management
export const saveApiKey = async (provider: string, apiKey: string): Promise<boolean> => {
  try {
    const apiKeysJson = await AsyncStorage.getItem(STORAGE_KEYS.API_KEYS);
    const apiKeys = apiKeysJson ? JSON.parse(apiKeysJson) : {};
    apiKeys[provider] = apiKey;
    await AsyncStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(apiKeys));
    return true;
  } catch (error) {
    console.error('Error saving API key:', error);
    return false;
  }
};

export const getApiKey = async (provider: string): Promise<string | null> => {
  try {
    const apiKeysJson = await AsyncStorage.getItem(STORAGE_KEYS.API_KEYS);
    const apiKeys = apiKeysJson ? JSON.parse(apiKeysJson) : {};
    return apiKeys[provider] || null;
  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
};

// Export Functions
export const exportSettingsToFile = async (): Promise<boolean> => {
  try {
    const allSettings = {
      dataFeed: await getDataFeedSettings(),
      notifications: await getNotificationSettings(),
      security: await getSecuritySettings(),
      export: await getExportSettings(),
      appearance: await getAppearanceSettings(),
      exportedAt: new Date().toISOString(),
    };
    
    const fileName = `risk-report-settings-${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = FileSystem.documentDirectory + fileName;
    
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(allSettings, null, 2));
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Export Settings',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error exporting settings:', error);
    return false;
  }
};

export const sendEmailReport = async (subject: string, body: string, attachments?: string[]): Promise<boolean> => {
  try {
    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Email Not Available', 'Email is not configured on this device.');
      return false;
    }
    
    const options: MailComposer.MailComposerOptions = {
      subject,
      body,
      isHtml: true,
    };
    
    if (attachments && attachments.length > 0) {
      options.attachments = attachments;
    }
    
    const result = await MailComposer.composeAsync(options);
    return result.status === MailComposer.MailComposerStatus.SENT;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

// Language and Localization
export const getAvailableLanguages = (): Array<{ code: string; name: string }> => {
  return [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'es-ES', name: 'Español' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'de-DE', name: 'Deutsch' },
    { code: 'it-IT', name: 'Italiano' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'ko-KR', name: '한국어' },
    { code: 'zh-CN', name: '中文 (简体)' },
  ];
};

export const getCurrencies = (): Array<{ code: string; name: string; symbol: string }> => {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  ];
};

// Reset Functions
export const resetAllSettings = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.DATA_FEED_SETTINGS,
      STORAGE_KEYS.NOTIFICATION_SETTINGS,
      STORAGE_KEYS.SECURITY_SETTINGS,
      STORAGE_KEYS.EXPORT_SETTINGS,
      STORAGE_KEYS.APPEARANCE_SETTINGS,
    ]);
    return true;
  } catch (error) {
    console.error('Error resetting settings:', error);
    return false;
  }
};

export const clearAllData = async (): Promise<boolean> => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
}; 