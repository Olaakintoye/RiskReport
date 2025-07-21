import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { DataFeedSettings, getDataFeedSettings, updateDataFeedSettings } from '../../services/settingsService';

interface DataSourceModalProps {
  visible: boolean;
  onClose: () => void;
}

const DataSourceModal: React.FC<DataSourceModalProps> = ({ visible, onClose }) => {
  const [settings, setSettings] = useState<DataFeedSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const currentSettings = await getDataFeedSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading data feed settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      const success = await updateDataFeedSettings(settings);
      if (success) {
        Alert.alert('Success', 'Data source settings saved successfully');
        onClose();
      } else {
        Alert.alert('Error', 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = (key: keyof DataFeedSettings, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateApiKey = (provider: string, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      apiKeys: { ...settings.apiKeys, [provider]: value }
    });
  };

  if (!settings) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Data Source Configuration</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#334155" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Market Data Source */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Market Data Provider</Text>
            
            {['yahoo', 'alpha_vantage', 'iex', 'polygon'].map((source) => (
              <TouchableOpacity
                key={source}
                style={[
                  styles.sourceOption,
                  settings.marketDataSource === source && styles.sourceOptionSelected
                ]}
                onPress={() => updateSetting('marketDataSource', source)}
              >
                <View style={styles.sourceInfo}>
                  <Text style={[
                    styles.sourceName,
                    settings.marketDataSource === source && styles.sourceNameSelected
                  ]}>
                    {source === 'yahoo' && 'Yahoo Finance (Free)'}
                    {source === 'alpha_vantage' && 'Alpha Vantage'}
                    {source === 'iex' && 'IEX Cloud'}
                    {source === 'polygon' && 'Polygon.io'}
                  </Text>
                  <Text style={styles.sourceDescription}>
                    {source === 'yahoo' && 'Free tier with 15-minute delayed data'}
                    {source === 'alpha_vantage' && 'Real-time data with API key required'}
                    {source === 'iex' && 'Real-time data with API key required'}
                    {source === 'polygon' && 'Professional-grade real-time data'}
                  </Text>
                </View>
                {settings.marketDataSource === source && (
                  <MaterialCommunityIcons name="check-circle" size={20} color="#10b981" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* API Keys */}
          {settings.marketDataSource !== 'yahoo' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>API Configuration</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  {settings.marketDataSource === 'alpha_vantage' && 'Alpha Vantage API Key'}
                  {settings.marketDataSource === 'iex' && 'IEX Cloud API Key'}
                  {settings.marketDataSource === 'polygon' && 'Polygon.io API Key'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={settings.apiKeys[settings.marketDataSource as keyof typeof settings.apiKeys] || ''}
                  onChangeText={(value) => updateApiKey(settings.marketDataSource, value)}
                  placeholder="Enter your API key"
                  secureTextEntry
                />
                <Text style={styles.inputHint}>
                  Get your API key from the provider's website
                </Text>
              </View>
            </View>
          )}

          {/* Refresh Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Refresh</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Refresh Frequency</Text>
              <View style={styles.frequencyContainer}>
                {[5, 15, 30, 60].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.frequencyOption,
                      settings.refreshFrequency === minutes && styles.frequencyOptionSelected
                    ]}
                    onPress={() => updateSetting('refreshFrequency', minutes)}
                  >
                    <Text style={[
                      styles.frequencyText,
                      settings.refreshFrequency === minutes && styles.frequencyTextSelected
                    ]}>
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Real-time Data</Text>
                <Text style={styles.settingDescription}>
                  Enable real-time market data updates
                </Text>
              </View>
              <Switch
                value={settings.enableRealTimeData}
                onValueChange={(value) => updateSetting('enableRealTimeData', value)}
                trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
                thumbColor={settings.enableRealTimeData ? '#10b981' : '#fff'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>After-hours Data</Text>
                <Text style={styles.settingDescription}>
                  Include pre-market and after-hours trading data
                </Text>
              </View>
              <Switch
                value={settings.enableAfterHoursData}
                onValueChange={(value) => updateSetting('enableAfterHoursData', value)}
                trackColor={{ false: '#e2e8f0', true: '#10b98180' }}
                thumbColor={settings.enableAfterHoursData ? '#10b981' : '#fff'}
              />
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  sourceOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  sourceInfo: {
    flex: 1,
  },
  sourceName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  sourceNameSelected: {
    color: '#10b981',
  },
  sourceDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  inputHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  frequencyContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  frequencyOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  frequencyOptionSelected: {
    backgroundColor: '#10b981',
  },
  frequencyText: {
    fontSize: 14,
    color: '#64748b',
  },
  frequencyTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DataSourceModal; 