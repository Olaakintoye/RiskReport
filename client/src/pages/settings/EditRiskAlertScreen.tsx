import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import * as Haptics from 'expo-haptics';

import * as notificationService from '../../services/notificationService';
import { 
  RiskAlertThreshold, 
  AlertSeverity,
  getMetricDisplayName
} from '../../services/notificationService';
import { Portfolio } from '../../services/portfolioService';

// Define the route params type
type EditRiskAlertRouteParams = {
  alert: RiskAlertThreshold;
  portfolios: Portfolio[];
  isNew?: boolean;
};

// Create a type for the route prop
type EditRiskAlertRouteProp = RouteProp<{ EditRiskAlert: EditRiskAlertRouteParams }, 'EditRiskAlert'>;

// Extend RiskAlertThreshold to allow for string threshold during editing
interface EditableRiskAlertThreshold extends Omit<RiskAlertThreshold, 'threshold'> {
  threshold: number | string;
}

const EditRiskAlertScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<EditRiskAlertRouteProp>();
  const { alert: initialAlert, portfolios, isNew = false } = route.params;
  
  const [alert, setAlert] = useState<EditableRiskAlertThreshold>(initialAlert);
  const [loading, setLoading] = useState(false);
  
  // Get available metric types for dropdown
  const getMetricTypes = (): string[] => {
    return [
      'var',
      'cvar',
      'volatility',
      'sharpeRatio',
      'sortinoRatio',
      'beta',
      'maxDrawdown',
      'downsideDeviation'
    ];
  };
  
  // Get comparison operators for dropdown
  const getOperators = (): string[] => {
    return ['>', '<', '==', '>=', '<='];
  };
  
  // Get severities for dropdown
  const getSeverities = (): AlertSeverity[] => {
    return [
      AlertSeverity.INFO,
      AlertSeverity.WARNING,
      AlertSeverity.CRITICAL
    ];
  };
  
  // Get severity display name
  const getSeverityDisplayName = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.INFO:
        return 'Info';
      case AlertSeverity.WARNING:
        return 'Warning';
      case AlertSeverity.CRITICAL:
        return 'Critical';
      default:
        return severity;
    }
  };
  
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
  
  // Handle save
  const handleSave = async () => {
    try {
      // Validate form
      if (!alert.name.trim()) {
        Alert.alert('Error', 'Alert name is required.');
        return;
      }
      
      // Convert threshold to number with proper decimal handling
      let thresholdValue: number;
      
      try {
        // Handle case where threshold might be a string during editing
        const thresholdStr = typeof alert.threshold === 'string' 
          ? alert.threshold 
          : alert.threshold.toString();
          
        thresholdValue = parseFloat(thresholdStr);
        
        // Check if value is a valid number
        if (isNaN(thresholdValue)) {
          Alert.alert('Error', 'Threshold must be a valid number.');
          return;
        }
        
        // Limit to 4 decimal places for precision
        thresholdValue = parseFloat(thresholdValue.toFixed(4));
      } catch (e) {
        Alert.alert('Error', 'Threshold must be a valid number.');
        return;
      }
      
      setLoading(true);
      
      // Update alert with final values and convert back to RiskAlertThreshold type
      const updatedAlert: RiskAlertThreshold = {
        ...alert,
        threshold: thresholdValue
      };
      
      // Save to storage
      const success = await notificationService.saveAlertThreshold(updatedAlert);
      
      if (success) {
        // Provide haptic feedback on success
        if (Platform && Platform.OS === 'ios') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Show success message and navigate back
        Alert.alert(
          'Success',
          isNew ? 'Alert created successfully!' : 'Alert updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error('Failed to save alert');
      }
    } catch (error) {
      console.error('Failed to save alert:', error);
      Alert.alert('Error', 'Failed to save alert. Please try again.');
    } finally {
      setLoading(false);
    }
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isNew ? 'Create New Alert' : 'Edit Alert'}
        </Text>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Alert Name</Text>
          <TextInput
            style={styles.textInput}
            value={alert.name}
            onChangeText={(text) => setAlert({ ...alert, name: text })}
            placeholder="Enter alert name"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            value={alert.description || ''}
            onChangeText={(text) => setAlert({ ...alert, description: text })}
            placeholder="Enter a description for this alert"
            multiline
            numberOfLines={3}
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Portfolio</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={alert.portfolioId}
              onValueChange={(value) => setAlert({ ...alert, portfolioId: value })}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label="All Portfolios" value="all" />
              {portfolios.map((portfolio) => (
                <Picker.Item key={portfolio.id} label={portfolio.name} value={portfolio.id} />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Risk Metric</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={alert.metricType}
              onValueChange={(value) => setAlert({ ...alert, metricType: value })}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {getMetricTypes().map((metricType) => (
                <Picker.Item 
                  key={metricType} 
                  label={getMetricDisplayName(metricType)} 
                  value={metricType} 
                />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Comparison</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={alert.operator}
              onValueChange={(value) => setAlert({ ...alert, operator: value })}
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              {getOperators().map((operator) => (
                <Picker.Item 
                  key={operator} 
                  label={notificationService.getOperatorDisplaySymbol(operator)} 
                  value={operator} 
                />
              ))}
            </Picker>
          </View>
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Threshold Value</Text>
          <TextInput
            style={styles.textInput}
            value={typeof alert.threshold === 'string' ? alert.threshold : alert.threshold.toString()}
            onChangeText={(text) => {
              // Allow decimal numbers with up to 4 decimal places
              if (text === '' || text === '.') {
                setAlert({ ...alert, threshold: text });
                return;
              }
              
              // Validate the input as a decimal number
              const regex = /^-?\d*\.?\d{0,4}$/;
              if (regex.test(text)) {
                setAlert({ ...alert, threshold: text });
              }
            }}
            placeholder="Enter threshold value"
            keyboardType="decimal-pad"
          />
        </View>
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Alert Severity</Text>
          <View style={styles.severityOptions}>
            {getSeverities().map((severity) => (
              <TouchableOpacity
                key={severity}
                style={[
                  styles.severityOption,
                  alert.severity === severity && {
                    backgroundColor: `${getSeverityColor(severity)}15`,
                    borderColor: getSeverityColor(severity),
                  },
                ]}
                onPress={() => setAlert({ ...alert, severity })}
              >
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(severity) }]} />
                <Text style={[
                  styles.severityText,
                  alert.severity === severity && { color: getSeverityColor(severity), fontWeight: '500' }
                ]}>
                  {getSeverityDisplayName(severity)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Alert</Text>
        </TouchableOpacity>
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
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  textAreaInput: {
    height: 80,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  picker: {
    height: 44,
    width: '100%',
  },
  pickerItem: {
    height: 44,
    fontSize: 16,
  },
  severityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  severityText: {
    fontSize: 14,
    color: '#64748b',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditRiskAlertScreen; 