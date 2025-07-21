import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '@/constants/colors';

export type ScenarioType = 'market_crash' | 'interest_rate' | 'currency' | 'sector' | 'custom';

export interface ScenarioParameter {
  id: string;
  name: string;
  value: number;
  description: string;
}

// Define scenario templates for reuse
export const scenarioTemplates = [
  {
    id: 'template_1',
    name: 'Market Crash',
    description: 'Simulates a severe market downturn similar to 2008 financial crisis',
    type: 'market_crash' as ScenarioType,
    parameters: [
      { id: 'param_1', name: 'Equity Markets', value: -35, description: 'Global equity markets decline' },
      { id: 'param_2', name: 'Credit Spreads', value: 150, description: 'Widening of credit spreads' },
      { id: 'param_3', name: 'Interest Rates', value: -75, description: 'Central bank rate cuts' }
    ]
  },
  {
    id: 'template_2',
    name: 'Inflation Surge',
    description: 'Rapid rise in inflation leading to central bank tightening',
    type: 'interest_rate' as ScenarioType,
    parameters: [
      { id: 'param_1', name: 'Interest Rates', value: 200, description: 'Significant rate hikes' },
      { id: 'param_2', name: 'Bond Yields', value: 150, description: 'Rising yields across the curve' },
      { id: 'param_3', name: 'Equity Markets', value: -15, description: 'Equity market correction' }
    ]
  },
  {
    id: 'template_3',
    name: 'Currency Crisis',
    description: 'Major currency devaluation and market stress',
    type: 'currency' as ScenarioType,
    parameters: [
      { id: 'param_1', name: 'Currency', value: -25, description: 'Local currency devaluation' },
      { id: 'param_2', name: 'Equity Markets', value: -20, description: 'Local equity market decline' },
      { id: 'param_3', name: 'Credit Spreads', value: 100, description: 'Widening of local credit spreads' }
    ]
  },
  {
    id: 'template_4',
    name: 'Lehman Brothers Collapse',
    description: 'Replicates the 2008 financial crisis triggered by Lehman Brothers bankruptcy on September 15, 2008',
    type: 'market_crash' as ScenarioType,
    parameters: [
      { id: 'param_1', name: 'Equity Markets', value: -39, description: 'S&P 500 decline similar to 2008 crisis (-38.49%)' },
      { id: 'param_2', name: 'Credit Spreads', value: 350, description: 'Massive credit spread widening (peak: 2068 bps)' },
      { id: 'param_3', name: 'Interest Rates', value: -200, description: 'Fed emergency rate cuts to near zero' },
      { id: 'param_4', name: 'Market Volatility', value: 180, description: 'VIX spike from extreme fear and uncertainty' },
      { id: 'param_5', name: 'Real Estate', value: -35, description: 'Housing market collapse (-27% home prices)' },
      { id: 'param_6', name: 'Banking Sector', value: -55, description: 'Financial sector devastation and bank failures' }
    ]
  },
  {
    id: 'template_5',
    name: 'COVID-19 Pandemic Crash',
    description: 'Simulates the March 2020 market crash caused by COVID-19 pandemic and global lockdowns',
    type: 'market_crash' as ScenarioType,
    parameters: [
      { id: 'param_1', name: 'Equity Markets', value: -34, description: 'Rapid 34% market decline in 4 weeks' },
      { id: 'param_2', name: 'Oil & Energy', value: -77, description: 'Crude petroleum sector collapse (-77%)' },
      { id: 'param_3', name: 'Market Volatility', value: 250, description: 'Extreme VIX levels and daily swings' },
      { id: 'param_4', name: 'Hospitality & Travel', value: -70, description: 'Airlines, hotels, cruise lines devastated' },
      { id: 'param_5', name: 'Interest Rates', value: -150, description: 'Emergency Fed rate cuts to 0%' },
      { id: 'param_6', name: 'Credit Spreads', value: 200, description: 'Flight to quality, corporate credit stress' },
      { id: 'param_7', name: 'Healthcare Sector', value: +26, description: 'Healthcare and medical device surge' }
    ]
  }
];

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  parameters: ScenarioParameter[];
  createdAt?: string;
  updatedAt?: string;
  results?: any;
  appliedPortfolioIds: string[];
}

interface CreateScenarioFormProps {
  visible: boolean;
  onSubmit: (scenario: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt' | 'results'>) => void;
  onCancel: () => void;
}

export default function CreateScenarioForm({ visible, onSubmit, onCancel }: CreateScenarioFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ScenarioType>('custom');
  const [parameters, setParameters] = useState<Omit<ScenarioParameter, 'id'>[]>([
    { name: 'Parameter 1', value: -10, description: '' }
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'custom' | 'template'>('custom');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) newErrors.name = 'Scenario name is required';
    if (parameters.length === 0) newErrors.parameters = 'At least one parameter is required';
    
    parameters.forEach((param, index) => {
      if (!param.name.trim()) {
        newErrors[`param_name_${index}`] = 'Parameter name is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = () => {
    if (activeTab === 'template' && selectedTemplate !== null) {
      // Use the selected template
      const template = scenarioTemplates[selectedTemplate];
      onSubmit({
        name: template.name,
        description: template.description,
        type: template.type,
        parameters: template.parameters,
        appliedPortfolioIds: []
      });
      return;
    }
    
    if (validate()) {
      // Create parameters with IDs
      const parametersWithIds: ScenarioParameter[] = parameters.map((param, index) => ({
        ...param,
        id: `param_${index + 1}`
      }));
      
      onSubmit({
        name,
        description,
        type,
        parameters: parametersWithIds,
        appliedPortfolioIds: []
      });
    }
  };
  
  const addParameter = () => {
    setParameters([
      ...parameters,
      { name: `Parameter ${parameters.length + 1}`, value: 0, description: '' }
    ]);
  };
  
  const updateParameter = (index: number, updates: Partial<Omit<ScenarioParameter, 'id'>>) => {
    const updatedParameters = [...parameters];
    updatedParameters[index] = { ...updatedParameters[index], ...updates };
    setParameters(updatedParameters);
  };
  
  const removeParameter = (index: number) => {
    if (parameters.length > 1) {
      setParameters(parameters.filter((_, i) => i !== index));
    }
  };
  
  const renderTemplateItem = ({ item, index }: { item: typeof scenarioTemplates[0], index: number }) => (
    <TouchableOpacity 
      style={[
        styles.templateItem,
        selectedTemplate === index && styles.selectedTemplateItem
      ]}
      onPress={() => setSelectedTemplate(index)}
    >
      <Text style={styles.templateName}>{item.name}</Text>
      <Text style={styles.templateDescription} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.templateParameters}>
        {item.parameters.slice(0, 2).map((param) => (
          <Text key={param.id} style={styles.templateParameterText}>
            • {param.name}: {param.value > 0 ? '+' : ''}{param.value}%
          </Text>
        ))}
        {item.parameters.length > 2 && (
          <Text style={styles.templateParameterText}>
            • {item.parameters.length - 2} more...
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Scenario</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[
                styles.tabButton,
                activeTab === 'custom' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('custom')}
            >
              <Text 
                style={[
                  styles.tabButtonText,
                  activeTab === 'custom' && styles.activeTabButtonText
                ]}
              >
                Custom Scenario
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.tabButton,
                activeTab === 'template' && styles.activeTabButton
              ]}
              onPress={() => setActiveTab('template')}
            >
              <Text 
                style={[
                  styles.tabButtonText,
                  activeTab === 'template' && styles.activeTabButtonText
                ]}
              >
                Use Template
              </Text>
            </TouchableOpacity>
          </View>
          
          {activeTab === 'custom' ? (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Scenario Name</Text>
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Market Crash Scenario"
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe the scenario and its assumptions"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.label}>Scenario Type</Text>
                <View style={styles.typeContainer}>
                  {(['market_crash', 'interest_rate', 'currency', 'sector', 'custom'] as ScenarioType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeButton,
                        type === t && styles.selectedTypeButton
                      ]}
                      onPress={() => setType(t)}
                    >
                      <Text 
                        style={[
                          styles.typeButtonText,
                          type === t && styles.selectedTypeButtonText
                        ]}
                      >
                        {t.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <View style={styles.parametersHeader}>
                  <Text style={styles.label}>Parameters</Text>
                  <TouchableOpacity 
                    style={styles.addParameterButton}
                    onPress={addParameter}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
                    <Text style={styles.addParameterText}>Add</Text>
                  </TouchableOpacity>
                </View>
                
                {errors.parameters ? <Text style={styles.errorText}>{errors.parameters}</Text> : null}
                
                {parameters.map((parameter, index) => (
                  <View key={index} style={styles.parameterContainer}>
                    <View style={styles.parameterHeader}>
                      <Text style={styles.parameterTitle}>Parameter {index + 1}</Text>
                      <TouchableOpacity 
                        style={styles.removeParameterButton}
                        onPress={() => removeParameter(index)}
                        disabled={parameters.length <= 1}
                      >
                        <MaterialCommunityIcons 
                          name="trash-can-outline" 
                          size={16} 
                          color={parameters.length <= 1 ? Colors.textSecondary : Colors.danger} 
                        />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.parameterFormGroup}>
                      <Text style={styles.parameterLabel}>Name</Text>
                      <TextInput
                        style={[
                          styles.parameterInput,
                          errors[`param_name_${index}`] ? styles.inputError : null
                        ]}
                        value={parameter.name}
                        onChangeText={(text) => updateParameter(index, { name: text })}
                        placeholder="e.g. Equity Markets"
                      />
                      {errors[`param_name_${index}`] ? 
                        <Text style={styles.errorText}>{errors[`param_name_${index}`]}</Text> : null}
                    </View>
                    
                    <View style={styles.parameterFormGroup}>
                      <Text style={styles.parameterLabel}>Value (%)</Text>
                      <TextInput
                        style={styles.parameterInput}
                        value={parameter.value.toString()}
                        onChangeText={(text) => {
                          const value = text === '' ? 0 : parseFloat(text);
                          if (!isNaN(value)) {
                            updateParameter(index, { value });
                          }
                        }}
                        placeholder="-10"
                        keyboardType="numeric"
                      />
                      <Text style={styles.helperText}>
                        Use negative values for declines, positive for increases
                      </Text>
                    </View>
                    
                    <View style={styles.parameterFormGroup}>
                      <Text style={styles.parameterLabel}>Description (Optional)</Text>
                      <TextInput
                        style={styles.parameterTextArea}
                        value={parameter.description}
                        onChangeText={(text) => updateParameter(index, { description: text })}
                        placeholder="e.g. Global equity markets decline"
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.templateContainer}>
              <Text style={styles.templateInstructions}>
                Select a predefined scenario template to quickly create a stress test
              </Text>
              
              <FlatList
                data={scenarioTemplates}
                keyExtractor={(_, index) => index.toString()}
                renderItem={renderTemplateItem}
                contentContainerStyle={styles.templateList}
              />
            </View>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.button, 
                styles.submitButton,
                activeTab === 'template' && selectedTemplate === null && styles.disabledButton
              ]} 
              onPress={handleSubmit}
              disabled={activeTab === 'template' && selectedTemplate === null}
            >
              <Text style={styles.submitButtonText}>Create Scenario</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.card,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeTabButtonText: {
    color: Colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    height: 100,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    marginTop: 4,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  selectedTypeButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  selectedTypeButtonText: {
    color: 'white',
  },
  parametersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addParameterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addParameterText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  parameterContainer: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  parameterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  parameterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  removeParameterButton: {
    padding: 4,
  },
  parameterFormGroup: {
    marginBottom: 12,
  },
  parameterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  parameterInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
  },
  parameterTextArea: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
    height: 60,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.7,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  templateContainer: {
    flex: 1,
    padding: 16,
  },
  templateInstructions: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  templateList: {
    paddingBottom: 16,
  },
  templateItem: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedTemplateItem: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  templateParameters: {
    marginTop: 8,
  },
  templateParameterText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 2,
  },
}); 