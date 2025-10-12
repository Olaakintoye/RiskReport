/**
 * Calculation Explanation Modal
 * 
 * A reusable modal component that displays detailed explanations for stress test
 * calculations, helping users understand how results are computed.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalculationExplanation } from '../../services/calculationExplanationService';

interface CalculationExplanationModalProps {
  visible: boolean;
  explanation: CalculationExplanation | null;
  onClose: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const CalculationExplanationModal: React.FC<CalculationExplanationModalProps> = ({
  visible,
  explanation,
  onClose
}) => {
  console.log('CalculationExplanationModal rendered with visible:', visible, 'explanation:', explanation);
  
  if (!explanation) {
    console.log('No explanation provided, returning null');
    return null;
  }

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{explanation.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Debug Info */}
            <View style={{backgroundColor: '#ffebee', padding: 10, marginBottom: 10, borderRadius: 5}}>
              <Text style={{color: 'red', fontSize: 12, fontWeight: 'bold'}}>DEBUG INFO:</Text>
              <Text style={{color: 'red', fontSize: 10}}>Title: {explanation.title}</Text>
              <Text style={{color: 'red', fontSize: 10}}>Summary: {explanation.summary.substring(0, 50)}...</Text>
              <Text style={{color: 'red', fontSize: 10}}>Formula: {explanation.formula}</Text>
            </View>
            
            {/* Summary */}
            <View style={styles.section}>
              <Text style={styles.summary}>{explanation.summary}</Text>
              <Text style={{color: 'red', fontSize: 12}}>DEBUG: Summary should be visible</Text>
            </View>

            {/* Formula */}
            <View style={styles.section}>
              <View style={styles.formulaSection}>
                <Text style={styles.formulaLabel}>Formula:</Text>
                <View style={styles.formulaContainer}>
                  <Text style={styles.formula}>{explanation.formula}</Text>
                </View>
                <Text style={{color: 'red', fontSize: 12}}>DEBUG: Formula should be visible</Text>
              </View>
            </View>

            {/* Example */}
            <View style={styles.section}>
              <View style={styles.exampleSection}>
                <Text style={styles.exampleLabel}>Example:</Text>
                <View style={styles.exampleContainer}>
                  <Text style={styles.example}>{explanation.example}</Text>
                </View>
              </View>
            </View>

            {/* Factors Breakdown */}
            {explanation.factors && explanation.factors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.factorsLabel}>Breakdown:</Text>
                <View style={styles.factorsContainer}>
                  {explanation.factors.map((factor, index) => (
                    <View key={index} style={styles.factorRow}>
                      <Text style={styles.factorBullet}>•</Text>
                      <Text style={styles.factor}>{factor}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.gotItButton}>
              <Text style={styles.gotItButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    minHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 20,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    color: '#374151',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  formulaSection: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  formulaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  formulaContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d97706',
  },
  formula: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#92400e',
    textAlign: 'center',
  },
  exampleSection: {
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 8,
  },
  exampleContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#059669',
  },
  example: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#065f46',
    textAlign: 'center',
  },
  factorsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  factorsContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  factorBullet: {
    fontSize: 16,
    color: '#3b82f6',
    marginRight: 8,
    marginTop: 2,
  },
  factor: {
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  gotItButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  gotItButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalculationExplanationModal;
