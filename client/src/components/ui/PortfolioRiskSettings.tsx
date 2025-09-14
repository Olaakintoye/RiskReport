import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import portfolioService, { Portfolio } from '../../services/portfolioService';

interface PortfolioRiskSettingsProps {
  visible: boolean;
  onClose: () => void;
  portfolioId: string;
  portfolioName: string;
  onUpdate?: () => void;
}

const PortfolioRiskSettings: React.FC<PortfolioRiskSettingsProps> = ({
  visible,
  onClose,
  portfolioId,
  portfolioName,
  onUpdate
}) => {
  const [var95Limit, setVar95Limit] = useState('');
  const [var99Limit, setVar99Limit] = useState('');
  const [volLimit, setVolLimit] = useState('');
  const [ddLimit, setDdLimit] = useState('');
  const [sharpeMin, setSharpeMin] = useState('');
  const [sortinoMin, setSortinoMin] = useState('');
  const [loading, setLoading] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    if (visible) {
      loadPortfolioSettings();
    }
  }, [visible, portfolioId]);

  const loadPortfolioSettings = async () => {
    try {
      const portfolioData = await portfolioService.getPortfolioById(portfolioId);
      if (portfolioData) {
        setPortfolio(portfolioData);
        
        // Load existing risk profile settings
        const riskProfile = portfolioData.riskProfile;
        if (riskProfile) {
          setVar95Limit(riskProfile.var_95_limit?.toString() || '');
          setVar99Limit(riskProfile.var_99_limit?.toString() || '');
          setVolLimit(riskProfile.volatility_limit?.toString() || '');
          setDdLimit(riskProfile.max_drawdown_limit?.toString() || '');
          setSharpeMin(riskProfile.sharpe_min?.toString() || '');
          setSortinoMin(riskProfile.sortino_min?.toString() || '');
        }
      }
    } catch (error) {
      console.error('Error loading portfolio settings:', error);
      Alert.alert('Error', 'Failed to load portfolio settings');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validate inputs
      const var95 = var95Limit ? parseFloat(var95Limit) : undefined;
      const var99 = var99Limit ? parseFloat(var99Limit) : undefined;
      const vol = volLimit ? parseFloat(volLimit) : undefined;
      const dd = ddLimit ? parseFloat(ddLimit) : undefined;
      const sharpe = sharpeMin ? parseFloat(sharpeMin) : undefined;
      const sortino = sortinoMin ? parseFloat(sortinoMin) : undefined;

      // Basic validation
      if (var95 && (var95 <= 0 || var95 > 100)) {
        Alert.alert('Invalid Input', '95% VaR limit must be between 0 and 100');
        return;
      }
      
      if (var99 && (var99 <= 0 || var99 > 100)) {
        Alert.alert('Invalid Input', '99% VaR limit must be between 0 and 100');
        return;
      }

      if (vol && (vol <= 0 || vol > 200)) {
        Alert.alert('Invalid Input', 'Volatility limit must be between 0 and 200');
        return;
      }

      if (dd && (dd <= 0 || dd > 100)) {
        Alert.alert('Invalid Input', 'Max drawdown limit must be between 0 and 100');
        return;
      }

      if (sharpe && sharpe < -10) {
        Alert.alert('Invalid Input', 'Sharpe minimum looks invalid');
        return;
      }

      if (sortino && sortino < -10) {
        Alert.alert('Invalid Input', 'Sortino minimum looks invalid');
        return;
      }

      if (var95 && var99 && var99 <= var95) {
        Alert.alert('Invalid Input', '99% VaR limit should be higher than 95% VaR limit');
        return;
      }

      // Update portfolio risk profile
      await portfolioService.updatePortfolioRiskProfile(portfolioId, {
        var_95_limit: var95,
        var_99_limit: var99,
        volatility_limit: vol,
        max_drawdown_limit: dd,
        sharpe_min: sharpe,
        sortino_min: sortino
      });

      Alert.alert('Success', 'Portfolio risk settings updated successfully');
      onUpdate?.();
      onClose();
    } catch (error) {
      console.error('Error saving portfolio settings:', error);
      Alert.alert('Error', 'Failed to save portfolio settings');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset all risk limits to default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => {
          setVar95Limit('');
          setVar99Limit('');
          setVolLimit('');
          setDdLimit('');
          setSharpeMin('');
          setSortinoMin('');
        }}
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Risk Settings</Text>
          <TouchableOpacity onPress={resetToDefaults} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.portfolioName}>{portfolioName}</Text>
          <Text style={styles.description}>
            Set risk limits for this portfolio. Leave blank to use automatic limits (150% of current VaR).
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Value at Risk (VaR) Limits</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>95% Confidence VaR Limit (%)</Text>
              <TextInput
                style={styles.input}
                value={var95Limit}
                onChangeText={setVar95Limit}
                placeholder="e.g., 5.0"
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.hint}>
                Maximum acceptable 1-day loss at 95% confidence level
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>99% Confidence VaR Limit (%)</Text>
              <TextInput
                style={styles.input}
                value={var99Limit}
                onChangeText={setVar99Limit}
                placeholder="e.g., 7.5"
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.hint}>
                Maximum acceptable 1-day loss at 99% confidence level
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Volatility & Drawdown</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Annualized Volatility Limit (%)</Text>
              <TextInput
                style={styles.input}
                value={volLimit}
                onChangeText={setVolLimit}
                placeholder="e.g., 20.0"
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.hint}>Upper bound for annualized volatility</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Max Drawdown Limit (%)</Text>
              <TextInput
                style={styles.input}
                value={ddLimit}
                onChangeText={setDdLimit}
                placeholder="e.g., 15.0"
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.hint}>Maximum peak-to-trough decline tolerated</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk-Adjusted Return Floors</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sharpe Minimum</Text>
              <TextInput
                style={styles.input}
                value={sharpeMin}
                onChangeText={setSharpeMin}
                placeholder="e.g., 1.0"
                keyboardType="numeric"
                returnKeyType="next"
              />
              <Text style={styles.hint}>Alert if Sharpe falls below this level</Text>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sortino Minimum</Text>
              <TextInput
                style={styles.input}
                value={sortinoMin}
                onChangeText={setSortinoMin}
                placeholder="e.g., 1.0"
                keyboardType="numeric"
                returnKeyType="done"
              />
              <Text style={styles.hint}>Alert if Sortino falls below this level</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Text>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  portfolioName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default PortfolioRiskSettings; 