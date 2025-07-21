import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PortfolioSummary } from '../../services/portfolioService';

interface EditPortfolioModalProps {
  visible: boolean;
  portfolio: PortfolioSummary;
  onClose: () => void;
  onSave: (id: string, name: string, portfolioType: string) => Promise<void>;
}

const portfolioTypes = [
  { id: 'equity', label: 'Equity' },
  { id: 'fixed_income', label: 'Fixed Income' },
  { id: 'multi_asset', label: 'Multi-asset' }
];

const EditPortfolioModal: React.FC<EditPortfolioModalProps> = ({
  visible,
  portfolio,
  onClose,
  onSave
}) => {
  const [name, setName] = useState(portfolio.name);
  const [selectedType, setSelectedType] = useState(
    // Try to determine current type from allocation
    Object.keys(portfolio.allocation)[0] || 'equity'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Portfolio name is required');
      return;
    }

    setError(null);
    setIsSaving(true);
    
    try {
      await onSave(portfolio.id, name.trim(), selectedType);
      onClose();
    } catch (error) {
      console.error('Error saving portfolio:', error);
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Portfolio</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Portfolio Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter portfolio name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Portfolio Type</Text>
              <View style={styles.typeOptions}>
                {portfolioTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      selectedType === type.id && styles.selectedTypeOption
                    ]}
                    onPress={() => setSelectedType(type.id)}
                  >
                    <Text 
                      style={[
                        styles.typeOptionText,
                        selectedType === type.id && styles.selectedTypeOptionText
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, isSaving && styles.disabledButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    padding: 5,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  typeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  selectedTypeOption: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  typeOptionText: {
    color: '#64748b',
    fontWeight: '500',
  },
  selectedTypeOptionText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
  },
});

export default EditPortfolioModal; 