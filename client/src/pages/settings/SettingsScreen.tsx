import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Switch,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  ActionSheetIOS,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import services and components
import { useAuth } from '../../hooks/use-auth';
import {
  DataFeedSettings,
  NotificationSettings,
  SecuritySettings,
  ExportSettings,
  AppearanceSettings,
  UserProfile,
  getDataFeedSettings,
  getNotificationSettings,
  getSecuritySettings,
  getExportSettings,
  getAppearanceSettings,
  getUserProfile,
  updateDataFeedSettings,
  updateNotificationSettings,
  updateSecuritySettings,
  updateExportSettings,
  updateAppearanceSettings,
  updateUserProfile,
  checkBiometricSupport,
  authenticateWithBiometrics,
  exportSettingsToFile,
  sendEmailReport,
  getAvailableLanguages,
  getCurrencies,
  resetAllSettings,
} from '../../services/settingsService';
import { UserProfileService } from '../../services/userProfileService';

import DataSourceModal from '../../components/settings/DataSourceModal';
import ProfileEditModal from '../../components/settings/ProfileEditModal';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
};

interface SettingsItemProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  loading?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ 
  icon, 
  iconColor = '#64748b', 
  title, 
  subtitle, 
  onPress,
  rightElement,
  loading = false
}) => {
  return (
    <TouchableOpacity 
      style={styles.settingsItem}
      onPress={onPress}
      disabled={!onPress || loading}
    >
      <View style={[styles.settingsItemIcon, { backgroundColor: `${iconColor}20` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingsItemContent}>
        <Text style={styles.settingsItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsItemSubtitle}>{subtitle}</Text>}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#94a3b8" />
      ) : rightElement ? (
        <View style={styles.settingsItemRight}>
          {rightElement}
        </View>
      ) : onPress ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
      ) : null}
    </TouchableOpacity>
  );
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  
  // State for settings
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dataFeedSettings, setDataFeedSettings] = useState<DataFeedSettings | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [exportSettings, setExportSettings] = useState<ExportSettings | null>(null);
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings | null>(null);
  
  // Modal states
  const [showDataSourceModal, setShowDataSourceModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [biometricInfo, setBiometricInfo] = useState<{ isAvailable: boolean; type: string }>({ isAvailable: false, type: 'None' });

  useEffect(() => {
    loadAllSettings();
    checkBiometrics();
  }, []);

  const loadAllSettings = async () => {
    try {
      const [
        enhancedProfile,
        dataFeed,
        notifications,
        security,
        exportData,
        appearance
      ] = await Promise.all([
        UserProfileService.getCurrentUserProfile(),
        getDataFeedSettings(),
        getNotificationSettings(),
        getSecuritySettings(),
        getExportSettings(),
        getAppearanceSettings(),
      ]);

      // Convert enhanced profile to basic profile for compatibility
      if (enhancedProfile) {
        const basicProfile: UserProfile = {
          id: enhancedProfile.id,
          name: enhancedProfile.full_name || '',
          username: enhancedProfile.username || undefined,
          email: enhancedProfile.email,
          profileImage: enhancedProfile.avatar_url || undefined,
        };
        setProfile(basicProfile);
      } else if (user) {
        // Create profile from auth user if none exists
        const newProfile: UserProfile = {
          id: user.id,
          name: user.fullName || '',
          email: user.email,
        };
        await updateUserProfile(newProfile);
        setProfile(newProfile);
      }

      setDataFeedSettings(dataFeed);
      setNotificationSettings(notifications);
      setSecuritySettings(security);
      setExportSettings(exportData);
      setAppearanceSettings(appearance);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkBiometrics = async () => {
    const info = await checkBiometricSupport();
    setBiometricInfo(info);
  };

  // Handlers for different settings
  const handleDataSourcePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDataSourceModal(true);
  };

  const handleApiConfigPress = () => {
    Alert.alert(
      'API Configuration',
      'Configure your API keys for different data providers',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Configure', onPress: () => setShowDataSourceModal(true) }
      ]
    );
  };

  const handleRefreshFrequencyPress = () => {
    if (!dataFeedSettings) return;
    
    const options = ['5 minutes', '15 minutes', '30 minutes', '1 hour'];
    const values = [5, 15, 30, 60];
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...options],
          cancelButtonIndex: 0,
          title: 'Select refresh frequency',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const newSettings = { ...dataFeedSettings, refreshFrequency: values[buttonIndex - 1] };
            setDataFeedSettings(newSettings);
            updateDataFeedSettings(newSettings);
          }
        }
      );
    } else {
      Alert.alert(
        'Refresh Frequency',
        'Select how often to refresh market data',
        [
          { text: 'Cancel', style: 'cancel' },
          ...options.map((option, index) => ({
            text: option,
            onPress: () => {
              const newSettings = { ...dataFeedSettings, refreshFrequency: values[index] };
              setDataFeedSettings(newSettings);
              updateDataFeedSettings(newSettings);
            }
          }))
        ]
      );
    }
  };

  const handleNotificationToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (!notificationSettings) return;
    
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    await updateNotificationSettings(newSettings);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (!securitySettings) return;

    if (value && biometricInfo.isAvailable) {
      const success = await authenticateWithBiometrics();
      if (!success) {
        Alert.alert('Authentication Failed', 'Please try again');
        return;
      }
    }

    const newSettings = { ...securitySettings, biometricEnabled: value };
    setSecuritySettings(newSettings);
    await updateSecuritySettings(newSettings);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'This will redirect you to change your password',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => console.log('Navigate to change password') }
      ]
    );
  };

  const handleTwoFactorAuth = () => {
    Alert.alert(
      'Two-Factor Authentication',
      securitySettings?.twoFactorEnabled ? 'Disable 2FA?' : 'Enable 2FA for enhanced security?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: securitySettings?.twoFactorEnabled ? 'Disable' : 'Enable',
          onPress: async () => {
            if (!securitySettings) return;
            const newSettings = { ...securitySettings, twoFactorEnabled: !securitySettings.twoFactorEnabled };
            setSecuritySettings(newSettings);
            await updateSecuritySettings(newSettings);
          }
        }
      ]
    );
  };

  const handleExportSettings = async () => {
    try {
      const success = await exportSettingsToFile();
      if (success) {
        Alert.alert('Success', 'Settings exported successfully');
      } else {
        Alert.alert('Error', 'Failed to export settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export settings');
    }
  };

  const handleExcelIntegration = () => {
    Alert.alert(
      'Excel Integration',
      'Connect with Microsoft Excel to export reports directly',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn More', onPress: () => console.log('Open Excel integration info') }
      ]
    );
  };

  const handleEmailReports = () => {
    Alert.alert(
      'Email Reports',
      'Configure automated email reports',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Configure', onPress: () => navigation.navigate('RiskAlertSettings' as never) }
      ]
    );
  };

  const handleDarkModeToggle = async (value: boolean) => {
    if (!appearanceSettings) return;
    
    const newSettings = { ...appearanceSettings, darkMode: value };
    setAppearanceSettings(newSettings);
    await updateAppearanceSettings(newSettings);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLanguagePress = () => {
    setShowLanguageModal(true);
  };

  const handleHelpSupport = () => {
    Alert.alert(
      'Help & Support',
      'Get help with Risk Report',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Contact Support', onPress: () => sendEmailReport('Support Request', 'I need help with...') },
        { text: 'User Guide', onPress: () => console.log('Open user guide') }
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About Risk Report',
      `Version 1.0.0\n\nA comprehensive portfolio risk analysis tool with VaR calculations, scenario testing, and real-time monitoring.\n\n© 2024 Risk Report, Inc.`,
      [{ text: 'OK' }]
    );
  };

  const handleTermsOfService = () => {
    Alert.alert(
      'Terms of Service',
      'View our terms of service',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Online', onPress: () => console.log('Open terms URL') }
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    Alert.alert(
      'Privacy Policy',
      'View our privacy policy',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Online', onPress: () => console.log('Open privacy URL') }
      ]
    );
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Clear onboarding state to force user back to auth screen
              await AsyncStorage.removeItem('hasSeenOnboarding');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset All Settings',
      'This will reset all settings to their default values. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllSettings();
              await loadAllSettings();
              Alert.alert('Success', 'All settings have been reset');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset settings');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileInfo}>
          <Image 
            source={{ 
              uri: profile?.profileImage || 'https://randomuser.me/api/portraits/men/32.jpg' 
            }} 
            style={styles.profileImage}
          />
          <View>
            <Text style={styles.profileName}>{profile?.name || user?.fullName || 'User'}</Text>
            {profile?.username && (
              <Text style={styles.profileUsername}>@{profile.username}</Text>
            )}
            <Text style={styles.profileEmail}>{profile?.email || user?.email || ''}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.editProfileButton}
          onPress={() => setShowProfileEditModal(true)}
        >
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      
      {/* Account Section */}
      <SettingsSection title="Account">
        <SettingsItem 
          icon="card"
          iconColor="#3b82f6"
          title="Subscription"
          subtitle="Manage your plan and billing"
          onPress={() => navigation.navigate('SubscriptionManagement' as never)}
        />
      </SettingsSection>
      
      {/* Data Feeds Section */}
      <SettingsSection title="Data Feeds">
        <SettingsItem 
          icon="database"
          iconColor="#3b82f6"
          title="Market Data Source"
          subtitle={`${dataFeedSettings?.marketDataSource === 'yahoo' ? 'Yahoo Finance (Free)' : 
                     dataFeedSettings?.marketDataSource === 'alpha_vantage' ? 'Alpha Vantage' :
                     dataFeedSettings?.marketDataSource === 'iex' ? 'IEX Cloud' : 'Polygon.io'}`}
          onPress={handleDataSourcePress}
        />
        <SettingsItem 
          icon="api"
          iconColor="#8b5cf6"
          title="API Configuration"
          subtitle="Configure API keys for data providers"
          onPress={handleApiConfigPress}
        />
        <SettingsItem 
          icon="refresh"
          iconColor="#10b981"
          title="Data Refresh Frequency"
          subtitle={`Every ${dataFeedSettings?.refreshFrequency} minutes`}
          onPress={handleRefreshFrequencyPress}
        />
      </SettingsSection>
      
      {/* Notifications Section */}
      <SettingsSection title="Notifications">
        <SettingsItem 
          icon="bell"
          iconColor="#f59e0b"
          title="Daily Report Notification"
          subtitle="Receive daily portfolio risk updates"
          rightElement={
            <Switch 
              value={notificationSettings?.dailyReportEnabled || false} 
              onValueChange={(value) => handleNotificationToggle('dailyReportEnabled', value)}
              trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
              thumbColor={notificationSettings?.dailyReportEnabled ? '#10b981' : '#fff'}
              ios_backgroundColor="#e2e8f0"
            />
          }
        />
        <SettingsItem 
          icon="bell-alert"
          iconColor="#ef4444"
          title="Threshold Alerts"
          subtitle="Get notified when risk metrics exceed thresholds"
          rightElement={
            <Switch 
              value={notificationSettings?.thresholdAlertsEnabled || false} 
              onValueChange={(value) => handleNotificationToggle('thresholdAlertsEnabled', value)}
              trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
              thumbColor={notificationSettings?.thresholdAlertsEnabled ? '#10b981' : '#fff'}
              ios_backgroundColor="#e2e8f0"
            />
          }
        />
        <SettingsItem 
          icon="bell-ring"
          iconColor="#f59e0b"
          title="Risk Alert Settings"
          subtitle="Configure risk metric alert thresholds"
          onPress={() => navigation.navigate('RiskAlertSettings' as never)}
        />
      </SettingsSection>
      
      {/* Security Section */}
      <SettingsSection title="Security">
        <SettingsItem 
          icon="lock"
          iconColor="#3b82f6"
          title="Change Password"
          onPress={handleChangePassword}
        />
        <SettingsItem 
          icon="fingerprint"
          iconColor="#10b981"
          title={`Biometric Authentication`}
          subtitle={biometricInfo.isAvailable ? `Use ${biometricInfo.type} for login` : 'Not available on this device'}
          rightElement={
            biometricInfo.isAvailable ? (
            <Switch 
                value={securitySettings?.biometricEnabled || false} 
                onValueChange={handleBiometricToggle}
              trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
                thumbColor={securitySettings?.biometricEnabled ? '#10b981' : '#fff'}
              ios_backgroundColor="#e2e8f0"
            />
            ) : undefined
          }
        />
        <SettingsItem 
          icon="shield-check"
          iconColor="#8b5cf6"
          title="Two-Factor Authentication"
          subtitle={securitySettings?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}
          onPress={handleTwoFactorAuth}
        />
      </SettingsSection>
      
      {/* Export & Integrations Section */}
      <SettingsSection title="Export & Integrations">
        <SettingsItem 
          icon="file-export"
          iconColor="#3b82f6"
          title="Export Settings"
          subtitle="PDF, CSV, or Excel formats"
          onPress={handleExportSettings}
        />
        <SettingsItem 
          icon="microsoft-excel"
          iconColor="#10b981"
          title="Excel Integration"
          subtitle="Link with your Excel workbooks"
          onPress={handleExcelIntegration}
        />
        <SettingsItem 
          icon="email"
          iconColor="#f59e0b"
          title="Email Reports"
          subtitle="Schedule automated email reports"
          onPress={handleEmailReports}
        />
      </SettingsSection>
      
      {/* Appearance Section */}
      <SettingsSection title="Appearance">
        <SettingsItem 
          icon="theme-light-dark"
          iconColor="#8b5cf6"
          title="Dark Mode"
          rightElement={
            <Switch 
              value={appearanceSettings?.darkMode || false} 
              onValueChange={handleDarkModeToggle}
              trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
              thumbColor={appearanceSettings?.darkMode ? '#10b981' : '#fff'}
              ios_backgroundColor="#e2e8f0"
            />
          }
        />
        <SettingsItem 
          icon="translate"
          iconColor="#3b82f6"
          title="Language"
          subtitle={getAvailableLanguages().find(lang => lang.code === appearanceSettings?.language)?.name || 'English (US)'}
          onPress={handleLanguagePress}
        />
      </SettingsSection>
      
      {/* About & Help Section */}
      <SettingsSection title="About & Help">
        <SettingsItem 
          icon="help-circle"
          iconColor="#3b82f6"
          title="Help & Support"
          onPress={handleHelpSupport}
        />
        <SettingsItem 
          icon="information"
          iconColor="#10b981"
          title="About Risk Report"
          subtitle="Version 1.0.0"
          onPress={handleAbout}
        />
        <SettingsItem 
          icon="file-document"
          iconColor="#64748b"
          title="Terms of Service"
          onPress={handleTermsOfService}
        />
        <SettingsItem 
          icon="shield"
          iconColor="#64748b"
          title="Privacy Policy"
          onPress={handlePrivacyPolicy}
        />
      </SettingsSection>

      {/* Advanced Section */}
      <SettingsSection title="Advanced">
        <SettingsItem 
          icon="restore"
          iconColor="#f59e0b"
          title="Reset All Settings"
          subtitle="Reset to default values"
          onPress={handleResetSettings}
        />
      </SettingsSection>
      
      {/* Logout button */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <MaterialCommunityIcons name="logout" size={20} color="#ef4444" style={styles.logoutIcon} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
      
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>Risk Report v1.0.0</Text>
        <Text style={styles.copyrightText}>© 2024 Risk Report, Inc.</Text>
      </View>

      {/* Modals */}
      <DataSourceModal 
        visible={showDataSourceModal}
        onClose={() => {
          setShowDataSourceModal(false);
          loadAllSettings(); // Reload settings after changes
        }}
      />

      <ProfileEditModal 
        visible={showProfileEditModal}
        onClose={() => {
          setShowProfileEditModal(false);
          loadAllSettings(); // Reload settings after changes
        }}
      />

      {/* Language Selection Modal */}
      <Modal visible={showLanguageModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {getAvailableLanguages().map((language) => (
              <TouchableOpacity
                key={language.code}
                style={[
                  styles.languageOption,
                  appearanceSettings?.language === language.code && styles.languageOptionSelected
                ]}
                onPress={async () => {
                  if (!appearanceSettings) return;
                  const newSettings = { ...appearanceSettings, language: language.code };
                  setAppearanceSettings(newSettings);
                  await updateAppearanceSettings(newSettings);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={[
                  styles.languageText,
                  appearanceSettings?.language === language.code && styles.languageTextSelected
                ]}>
                  {language.name}
                </Text>
                {appearanceSettings?.language === language.code && (
                  <MaterialCommunityIcons name="check" size={20} color="#10b981" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  profileSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748b',
  },
  editProfileButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  editProfileText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    padding: 16,
    paddingBottom: 8,
  },
  sectionContent: {
    paddingBottom: 8,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingsItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
  settingsItemRight: {
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  versionInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  versionText: {
    color: '#94a3b8',
    marginBottom: 4,
  },
  copyrightText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  languageOptionSelected: {
    borderWidth: 1,
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  languageText: {
    fontSize: 16,
    color: '#334155',
  },
  languageTextSelected: {
    color: '#10b981',
    fontWeight: '500',
  },
});

export default SettingsScreen; 