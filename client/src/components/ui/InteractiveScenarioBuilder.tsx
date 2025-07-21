import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

export interface ScenarioFactor {
  id: string;
  name: string;
  category: 'macro' | 'market' | 'sector' | 'geopolitical';
  currentValue: number;
  minValue: number;
  maxValue: number;
  unit: string;
  description: string;
  historicalRange: { min: number; max: number; p95: number; p5: number };
  correlatedFactors: string[];
}

interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  category: 'crisis' | 'recession' | 'inflation' | 'geopolitical' | 'sector';
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  probability: number;
  factors: Record<string, number>;
  historicalAnalog?: string;
  timeframe: string;
}

interface InteractiveScenarioBuilderProps {
  visible: boolean;
  onClose: () => void;
  onSaveScenario: (scenario: any) => void;
  portfolios: any[];
  initialValues?: {
    name: string;
    factors: Record<string, number>;
    autoCorrelation: boolean;
  };
}

export const SCENARIO_FACTORS: ScenarioFactor[] = [
  // MACRO ECONOMIC FACTORS
  {
    id: 'interest_rates',
    name: 'Interest Rates',
    category: 'macro',
    currentValue: 0,
    minValue: -500,
    maxValue: 1000,
    unit: 'bps',
    description: 'Change in benchmark interest rates',
    historicalRange: { min: -400, max: 800, p95: 300, p5: -200 },
    correlatedFactors: ['inflation', 'currency', 'real_estate']
  },
  {
    id: 'inflation',
    name: 'Inflation Rate',
    category: 'macro',
    currentValue: 0,
    minValue: -5,
    maxValue: 15,
    unit: '%',
    description: 'Change in consumer price inflation',
    historicalRange: { min: -2, max: 12, p95: 8, p5: -1 },
    correlatedFactors: ['interest_rates', 'commodity_prices']
  },
  {
    id: 'gdp_growth',
    name: 'GDP Growth',
    category: 'macro',
    currentValue: 0,
    minValue: -800,
    maxValue: 400,
    unit: 'bps',
    description: 'Change in GDP growth rate',
    historicalRange: { min: -600, max: 300, p95: 200, p5: -400 },
    correlatedFactors: ['equity_markets', 'unemployment', 'credit_spreads']
  },
  {
    id: 'unemployment',
    name: 'Unemployment Rate',
    category: 'macro',
    currentValue: 0,
    minValue: -200,
    maxValue: 800,
    unit: 'bps',
    description: 'Change in unemployment rate',
    historicalRange: { min: -150, max: 600, p95: 400, p5: -100 },
    correlatedFactors: ['equity_markets', 'interest_rates']
  },
  {
    id: 'currency',
    name: 'USD Exchange Rate',
    category: 'macro',
    currentValue: 0,
    minValue: -40,
    maxValue: 40,
    unit: '%',
    description: 'Change in USD vs major currencies',
    historicalRange: { min: -30, max: 30, p95: 20, p5: -20 },
    correlatedFactors: ['interest_rates', 'commodity_prices', 'emerging_markets']
  },
  
  // MARKET RISK FACTORS
  {
    id: 'equity_markets',
    name: 'Global Equity Markets',
    category: 'market',
    currentValue: 0,
    minValue: -100,
    maxValue: 100,
    unit: '%',
    description: 'Change in global equity market indices',
    historicalRange: { min: -57, max: 35, p95: 25, p5: -35 },
    correlatedFactors: ['volatility', 'credit_spreads', 'real_estate', 'emerging_markets']
  },
  {
    id: 'credit_spreads',
    name: 'Credit Spreads',
    category: 'market',
    currentValue: 0,
    minValue: -100,
    maxValue: 800,
    unit: 'bps',
    description: 'Change in corporate credit spreads',
    historicalRange: { min: -50, max: 600, p95: 400, p5: -30 },
    correlatedFactors: ['equity_markets', 'volatility', 'liquidity_risk', 'real_estate']
  },
  {
    id: 'volatility',
    name: 'Market Volatility (VIX)',
    category: 'market',
    currentValue: 0,
    minValue: -50,
    maxValue: 300,
    unit: '%',
    description: 'Change in implied volatility',
    historicalRange: { min: -40, max: 250, p95: 150, p5: -30 },
    correlatedFactors: ['equity_markets', 'credit_spreads', 'liquidity_risk', 'emerging_markets']
  },
  {
    id: 'liquidity_risk',
    name: 'Market Liquidity',
    category: 'market',
    currentValue: 0,
    minValue: -80,
    maxValue: 50,
    unit: '%',
    description: 'Change in market liquidity conditions',
    historicalRange: { min: -70, max: 30, p95: 20, p5: -50 },
    correlatedFactors: ['volatility', 'credit_spreads']
  },
  {
    id: 'commodity_prices',
    name: 'Commodity Prices',
    category: 'market',
    currentValue: 0,
    minValue: -60,
    maxValue: 200,
    unit: '%',
    description: 'Change in broad commodity index',
    historicalRange: { min: -50, max: 150, p95: 80, p5: -40 },
    correlatedFactors: ['inflation', 'currency']
  },
  {
    id: 'counterparty_risk',
    name: 'Counterparty Risk',
    category: 'market',
    currentValue: 0,
    minValue: -50,
    maxValue: 500,
    unit: 'bps',
    description: 'Change in counterparty default risk',
    historicalRange: { min: -30, max: 400, p95: 250, p5: -20 },
    correlatedFactors: ['credit_spreads', 'liquidity_risk', 'volatility']
  },
  {
    id: 'operational_losses',
    name: 'Operational Risk',
    category: 'market',
    currentValue: 0,
    minValue: 0,
    maxValue: 1000,
    unit: 'bps',
    description: 'Operational risk losses and costs',
    historicalRange: { min: 0, max: 500, p95: 300, p5: 0 },
    correlatedFactors: ['cyber_risk', 'compliance_costs']
  },
  
  // SECTOR RISK FACTORS
  {
    id: 'real_estate',
    name: 'Real Estate Markets',
    category: 'sector',
    currentValue: 0,
    minValue: -50,
    maxValue: 100,
    unit: '%',
    description: 'Change in global real estate indices',
    historicalRange: { min: -40, max: 60, p95: 40, p5: -30 },
    correlatedFactors: ['interest_rates', 'credit_spreads']
  },
  
  // GEOPOLITICAL RISK FACTORS
  {
    id: 'emerging_markets',
    name: 'Emerging Markets',
    category: 'geopolitical',
    currentValue: 0,
    minValue: -80,
    maxValue: 120,
    unit: '%',
    description: 'Change in emerging market indices',
    historicalRange: { min: -60, max: 80, p95: 60, p5: -45 },
    correlatedFactors: ['currency', 'commodity_prices']
  },
  {
    id: 'cyber_risk',
    name: 'Cyber Security Risk',
    category: 'geopolitical',
    currentValue: 0,
    minValue: 0,
    maxValue: 800,
    unit: 'bps',
    description: 'Cyber attack and security breach risk',
    historicalRange: { min: 0, max: 400, p95: 200, p5: 0 },
    correlatedFactors: ['operational_losses', 'reputation_risk']
  },
  {
    id: 'compliance_costs',
    name: 'Regulatory Compliance',
    category: 'geopolitical',
    currentValue: 0,
    minValue: 0,
    maxValue: 500,
    unit: 'bps',
    description: 'Regulatory and compliance cost increases',
    historicalRange: { min: 0, max: 300, p95: 150, p5: 0 },
    correlatedFactors: ['operational_losses']
  },
  {
    id: 'reputation_risk',
    name: 'Reputation Risk',
    category: 'geopolitical',
    currentValue: 0,
    minValue: 0,
    maxValue: 300,
    unit: 'bps',
    description: 'Reputational damage and related costs',
    historicalRange: { min: 0, max: 200, p95: 100, p5: 0 },
    correlatedFactors: ['cyber_risk', 'operational_losses']
  }
];

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'financial_crisis',
    name: 'Financial Crisis',
    description: 'Severe banking and credit crisis similar to 2008',
    category: 'crisis',
    severity: 'extreme',
    probability: 0.05,
    factors: {
      equity_markets: -45,
      credit_spreads: 400,
      interest_rates: -200,
      volatility: 200,
      currency: -15,
      real_estate: -35,
      liquidity_risk: -60,
      emerging_markets: -55
    },
    historicalAnalog: '2008 Global Financial Crisis',
    timeframe: '12-18 months'
  },
  {
    id: 'stagflation',
    name: 'Stagflation Scenario',
    description: 'High inflation with economic stagnation',
    category: 'inflation',
    severity: 'severe',
    probability: 0.15,
    factors: {
      inflation: 8,
      interest_rates: 400,
      equity_markets: -20,
      commodity_prices: 60,
      currency: 10,
      real_estate: -15,
      emerging_markets: -25
    },
    historicalAnalog: '1970s Stagflation',
    timeframe: '24-36 months'
  },
  {
    id: 'tech_bubble_burst',
    name: 'Tech Bubble Burst',
    description: 'Major correction in technology valuations',
    category: 'sector',
    severity: 'moderate',
    probability: 0.25,
    factors: {
      equity_markets: -25,
      volatility: 100,
      credit_spreads: 150,
      interest_rates: -100
    },
    historicalAnalog: '2000 Dot-com Crash',
    timeframe: '6-12 months'
  },
  {
    id: 'geopolitical_shock',
    name: 'Geopolitical Crisis',
    description: 'Major geopolitical event affecting global markets',
    category: 'geopolitical',
    severity: 'severe',
    probability: 0.20,
    factors: {
      equity_markets: -30,
      volatility: 150,
      commodity_prices: 40,
      currency: -20,
      credit_spreads: 200,
      liquidity_risk: -40,
      emerging_markets: -45
    },
    historicalAnalog: 'Gulf War / 9/11',
    timeframe: '3-9 months'
  },
  {
    id: 'ccar_adverse',
    name: 'CCAR Adverse Scenario',
    description: 'Federal Reserve CCAR adverse economic conditions with moderate recession',
    category: 'recession',
    severity: 'moderate',
    probability: 0.30,
    factors: {
      equity_markets: -25,
      interest_rates: -100,
      credit_spreads: 200,
      volatility: 120,
      real_estate: -20,
      unemployment: 250,
      gdp_growth: -200,
      liquidity_risk: -30
    },
    historicalAnalog: 'Fed CCAR Adverse Scenario',
    timeframe: '9-12 months'
  },
  {
    id: 'ccar_severely_adverse',
    name: 'CCAR Severely Adverse Scenario',
    description: 'Federal Reserve CCAR severely adverse conditions with deep recession and financial stress',
    category: 'crisis',
    severity: 'extreme',
    probability: 0.10,
    factors: {
      equity_markets: -50,
      interest_rates: -150,
      credit_spreads: 400,
      volatility: 200,
      real_estate: -30,
      unemployment: 400,
      gdp_growth: -400,
      liquidity_risk: -50,
      emerging_markets: -40,
      currency: -25
    },
    historicalAnalog: 'Fed CCAR Severely Adverse Scenario',
    timeframe: '12-18 months'
  },
  {
    id: 'ccar_trading_shock',
    name: 'CCAR Trading Shock',
    description: 'Large trading losses from market stress and counterparty defaults',
    category: 'crisis',
    severity: 'severe',
    probability: 0.15,
    factors: {
      equity_markets: -35,
      credit_spreads: 300,
      volatility: 180,
      currency: -15,
      liquidity_risk: -45,
      counterparty_risk: 250,
      emerging_markets: -35
    },
    historicalAnalog: 'CCAR Trading Book Shock',
    timeframe: '6-9 months'
  },
  {
    id: 'ccar_operational_risk',
    name: 'CCAR Operational Risk Scenario',
    description: 'Operational risk losses including cyber attacks and compliance failures',
    category: 'crisis',
    severity: 'moderate',
    probability: 0.25,
    factors: {
      operational_losses: 300,
      cyber_risk: 200,
      compliance_costs: 150,
      reputation_risk: 100,
      liquidity_risk: -25,
      credit_spreads: 100
    },
    historicalAnalog: 'CCAR Operational Risk Component',
    timeframe: '12-24 months'
  },
  {
    id: 'lehman_collapse',
    name: 'Lehman Brothers Collapse',
    description: 'Replicates the 2008 financial crisis triggered by Lehman Brothers bankruptcy on September 15, 2008',
    category: 'crisis',
    severity: 'extreme',
    probability: 0.05,
    factors: {
      equity_markets: -39,
      credit_spreads: 350,
      interest_rates: -200,
      volatility: 180,
      real_estate: -35,
      liquidity_risk: -60,
      emerging_markets: -55,
      currency: -15,
      counterparty_risk: 400
    },
    historicalAnalog: '2008 Global Financial Crisis / Lehman Brothers Bankruptcy',
    timeframe: '18-24 months'
  },
  {
    id: 'covid_pandemic_crash',
    name: 'COVID-19 Pandemic Crash',
    description: 'Simulates the March 2020 market crash caused by COVID-19 pandemic and global lockdowns',
    category: 'crisis',
    severity: 'extreme',
    probability: 0.08,
    factors: {
      equity_markets: -34,
      volatility: 250,
      interest_rates: -150,
      credit_spreads: 200,
      commodity_prices: -77,
      emerging_markets: -45,
      liquidity_risk: -50,
      unemployment: 800,
      gdp_growth: -400,
      real_estate: -15
    },
    historicalAnalog: 'March 2020 COVID-19 Market Crash',
    timeframe: '6-12 months'
  }
];

const InteractiveScenarioBuilder: React.FC<InteractiveScenarioBuilderProps> = ({
  visible,
  onClose,
  onSaveScenario,
  portfolios,
  initialValues
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ScenarioTemplate | null>(null);
  const [factorValues, setFactorValues] = useState<Record<string, number>>({});
  const [scenarioName, setScenarioName] = useState('');
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');
  const [showCorrelations, setShowCorrelations] = useState(false);
  const [editingFactor, setEditingFactor] = useState<string | null>(null);
  const [tempInputValue, setTempInputValue] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedParameterCategory, setSelectedParameterCategory] = useState<string>('all');

  // Initialize factor values
  useEffect(() => {
    if (initialValues) {
      // If we have initial values (from cloning), use those
      setFactorValues(initialValues.factors);
      setScenarioName(initialValues.name);
      setShowCorrelations(initialValues.autoCorrelation);
      setActiveTab('custom'); // Switch to custom tab when cloning
    } else {
      // Otherwise initialize with zeros
    const initialValues: Record<string, number> = {};
    SCENARIO_FACTORS.forEach(factor => {
      initialValues[factor.id] = 0;
    });
    setFactorValues(initialValues);
      setScenarioName('');
      setShowCorrelations(false);
    }
  }, [initialValues, visible]);

  // Reset state when modal is closed
  useEffect(() => {
    if (!visible) {
      setSelectedTemplate(null);
      setEditingFactor(null);
      setTempInputValue('');
    }
  }, [visible]);

  // Apply template to factor values
  const applyTemplate = (template: ScenarioTemplate) => {
    setSelectedTemplate(template);
    setScenarioName(template.name);
    
    const newValues = { ...factorValues };
    Object.entries(template.factors).forEach(([factorId, value]) => {
      newValues[factorId] = value;
    });
    setFactorValues(newValues);
  };

  // Handle factor value change with correlation effects
  const handleFactorChange = (factorId: string, value: number) => {
    const factor = SCENARIO_FACTORS.find(f => f.id === factorId);
    if (!factor) return;

    const newValues = { ...factorValues, [factorId]: value };

    // Apply correlation effects (simplified)
    if (showCorrelations && factor.correlatedFactors.length > 0) {
      factor.correlatedFactors.forEach(correlatedId => {
        const correlatedFactor = SCENARIO_FACTORS.find(f => f.id === correlatedId);
        if (correlatedFactor) {
          // Simple correlation: 30% of the change
          const correlationEffect = value * 0.3;
          newValues[correlatedId] = Math.max(
            correlatedFactor.minValue,
            Math.min(correlatedFactor.maxValue, correlationEffect)
          );
        }
      });
    }

    setFactorValues(newValues);
  };

  // Handle direct input editing
  const handleFactorEdit = (factorId: string) => {
    setEditingFactor(factorId);
    setTempInputValue((factorValues[factorId] || 0).toString());
  };

  // Handle input value submission
  const handleInputSubmit = (factorId: string) => {
    const factor = SCENARIO_FACTORS.find(f => f.id === factorId);
    if (!factor) return;

    const numericValue = parseFloat(tempInputValue);
    
    if (isNaN(numericValue)) {
      Alert.alert('Invalid Input', 'Please enter a valid number');
      return;
    }

    // Clamp value within factor bounds
    const clampedValue = Math.max(factor.minValue, Math.min(factor.maxValue, numericValue));
    
    if (clampedValue !== numericValue) {
      Alert.alert(
        'Value Adjusted', 
        `Value has been adjusted to ${clampedValue}${factor.unit} to stay within valid range (${factor.minValue}${factor.unit} to ${factor.maxValue}${factor.unit})`
      );
    }

    handleFactorChange(factorId, clampedValue);
    setEditingFactor(null);
    setTempInputValue('');
  };

  // Handle input cancellation
  const handleInputCancel = () => {
    setEditingFactor(null);
    setTempInputValue('');
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'severe': return '#ef4444';
      case 'extreme': return '#7c2d12';
      default: return '#6b7280';
    }
  };

  // Get factor category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'macro': return '#3b82f6';
      case 'market': return '#ef4444';
      case 'sector': return '#10b981';
      case 'geopolitical': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  // Calculate scenario impact estimate
  const calculateImpactEstimate = () => {
    let totalImpact = 0;
    Object.entries(factorValues).forEach(([factorId, value]) => {
      const factor = SCENARIO_FACTORS.find(f => f.id === factorId);
      if (factor && factor.category === 'market') {
        totalImpact += value * 0.3; // Simplified impact calculation
      }
    });
    return totalImpact;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scenario Builder</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'templates' && styles.activeTab]}
            onPress={() => setActiveTab('templates')}
          >
            <Text style={[styles.tabText, activeTab === 'templates' && styles.activeTabText]}>
              Templates
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'custom' && styles.activeTab]}
            onPress={() => setActiveTab('custom')}
          >
            <Text style={[styles.tabText, activeTab === 'custom' && styles.activeTabText]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {activeTab === 'templates' ? (
            <View style={styles.templatesContainer}>
              <View style={styles.categorySelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === 'all' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === 'all' && styles.selectedCategoryButtonText
                    ]}>
                      All Scenarios
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === 'crisis' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedCategory('crisis')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === 'crisis' && styles.selectedCategoryButtonText
                    ]}>
                      Market Crisis
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === 'recession' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedCategory('recession')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === 'recession' && styles.selectedCategoryButtonText
                    ]}>
                      Recession
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === 'inflation' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedCategory('inflation')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === 'inflation' && styles.selectedCategoryButtonText
                    ]}>
                      Rate Changes
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === 'geopolitical' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedCategory('geopolitical')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === 'geopolitical' && styles.selectedCategoryButtonText
                    ]}>
                      Geopolitical
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedCategory === 'sector' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedCategory('sector')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedCategory === 'sector' && styles.selectedCategoryButtonText
                    ]}>
                      Sector
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
              
              {SCENARIO_TEMPLATES
                .filter(template => selectedCategory === 'all' || template.category === selectedCategory)
                .map(template => (
                <TouchableOpacity
                  key={template.id}
                  style={[
                    styles.templateCard,
                    selectedTemplate?.id === template.id && styles.selectedTemplateCard
                  ]}
                  onPress={() => applyTemplate(template)}
                >
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(template.severity) }
                    ]}>
                      <Text style={styles.severityText}>{template.severity}</Text>
                    </View>
                  </View>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                  <View style={styles.templateMeta}>
                    <Text style={styles.templateMetaText}>
                      Probability: {(template.probability * 100).toFixed(0)}%
                    </Text>
                    <Text style={styles.templateMetaText}>
                      Timeframe: {template.timeframe}
                    </Text>
                  </View>
                  {template.historicalAnalog && (
                    <Text style={styles.historicalAnalog}>
                      Historical Analog: {template.historicalAnalog}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.customContainer}>
              <View style={styles.controlsRow}>
              <View style={styles.correlationToggle}>
                <TouchableOpacity
                  style={styles.correlationButton}
                  onPress={() => setShowCorrelations(!showCorrelations)}
                >
                  <MaterialCommunityIcons
                    name={showCorrelations ? "toggle-switch" : "toggle-switch-off"}
                    size={24}
                    color={showCorrelations ? "#10b981" : "#6b7280"}
                  />
                  <Text style={styles.correlationText}>Auto-correlations</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    const resetValues: Record<string, number> = {};
                    SCENARIO_FACTORS.forEach(factor => {
                      resetValues[factor.id] = 0;
                    });
                    setFactorValues(resetValues);
                    setSelectedTemplate(null);
                  }}
                >
                  <MaterialCommunityIcons name="refresh" size={20} color="#ef4444" />
                  <Text style={styles.resetButtonText}>Reset All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.nameInputContainer}>
                <Text style={styles.nameInputLabel}>Scenario Name</Text>
                <TextInput
                  style={styles.nameInput}
                  value={scenarioName}
                  onChangeText={setScenarioName}
                  placeholder="Enter scenario name..."
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.instructionContainer}>
                <MaterialCommunityIcons name="information" size={16} color="#3b82f6" />
                <Text style={styles.instructionText}>
                  Tip: Tap any value to edit directly, or use sliders below
                </Text>
              </View>

              <View style={styles.categorySelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScrollView}>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedParameterCategory === 'all' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedParameterCategory('all')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedParameterCategory === 'all' && styles.selectedCategoryButtonText
                    ]}>
                      All Parameters
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedParameterCategory === 'macro' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedParameterCategory('macro')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedParameterCategory === 'macro' && styles.selectedCategoryButtonText
                    ]}>
                      Macro Economic
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedParameterCategory === 'market' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedParameterCategory('market')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedParameterCategory === 'market' && styles.selectedCategoryButtonText
                    ]}>
                      Market Risk
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedParameterCategory === 'sector' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedParameterCategory('sector')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedParameterCategory === 'sector' && styles.selectedCategoryButtonText
                    ]}>
                      Sector Risk
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      selectedParameterCategory === 'geopolitical' && styles.selectedCategoryButton
                    ]}
                    onPress={() => setSelectedParameterCategory('geopolitical')}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      selectedParameterCategory === 'geopolitical' && styles.selectedCategoryButtonText
                    ]}>
                      Geopolitical
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {SCENARIO_FACTORS
                .filter(factor => selectedParameterCategory === 'all' || factor.category === selectedParameterCategory)
                .map(factor => (
                <View key={factor.id} style={styles.factorContainer}>
                  <View style={styles.factorHeader}>
                    <View style={styles.factorInfo}>
                      <Text style={styles.factorName}>{factor.name}</Text>
                      <View style={[
                        styles.categoryBadge,
                        { backgroundColor: getCategoryColor(factor.category) }
                      ]}>
                        <Text style={styles.categoryText}>{factor.category}</Text>
                      </View>
                    </View>
                    <View style={styles.factorValueContainer}>
                      {editingFactor === factor.id ? (
                        <View style={styles.inputContainer}>
                          <TextInput
                            style={styles.factorInput}
                            value={tempInputValue}
                            onChangeText={setTempInputValue}
                            keyboardType="numbers-and-punctuation"
                            autoFocus
                            selectTextOnFocus
                            onSubmitEditing={() => handleInputSubmit(factor.id)}
                            onBlur={() => handleInputSubmit(factor.id)}
                            placeholder="0.0"
                            returnKeyType="done"
                            maxLength={10}
                          />
                          <Text style={styles.inputUnit}>{factor.unit}</Text>
                          <TouchableOpacity
                            style={styles.inputCancel}
                            onPress={handleInputCancel}
                          >
                            <Ionicons name="close" size={16} color="#6b7280" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.factorValueTouchable}
                          onPress={() => handleFactorEdit(factor.id)}
                        >
                    <Text style={styles.factorValue}>
                      {factorValues[factor.id]?.toFixed(1) || '0.0'}{factor.unit}
                    </Text>
                          <MaterialCommunityIcons 
                            name="pencil" 
                            size={14} 
                            color="#6b7280" 
                            style={styles.editIcon}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  <Text style={styles.factorDescription}>{factor.description}</Text>
                  
                  <View style={styles.sliderContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={factor.minValue}
                      maximumValue={factor.maxValue}
                      value={factorValues[factor.id] || 0}
                      onValueChange={(value) => handleFactorChange(factor.id, value)}
                      minimumTrackTintColor="#3b82f6"
                      maximumTrackTintColor="#e5e7eb"
                    />
                    <View style={styles.sliderLabels}>
                      <Text style={styles.sliderLabel}>{factor.minValue}{factor.unit}</Text>
                      <Text style={styles.sliderLabel}>{factor.maxValue}{factor.unit}</Text>
                    </View>
                  </View>

                  <View style={styles.historicalRange}>
                    <Text style={styles.rangeLabel}>Historical Range:</Text>
                    <Text style={styles.rangeText}>
                      95th: {factor.historicalRange.p95}{factor.unit} | 
                      5th: {factor.historicalRange.p5}{factor.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.impactEstimate}>
            <Text style={styles.impactLabel}>Estimated Portfolio Impact:</Text>
            <Text style={[
              styles.impactValue,
              { color: calculateImpactEstimate() >= 0 ? '#10b981' : '#ef4444' }
            ]}>
              {calculateImpactEstimate() >= 0 ? '+' : ''}{calculateImpactEstimate().toFixed(1)}%
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              if (!scenarioName.trim()) {
                Alert.alert('Error', 'Please enter a scenario name');
                return;
              }
              
              onSaveScenario({
                name: scenarioName,
                factors: factorValues,
                template: selectedTemplate,
                autoCorrelation: showCorrelations
              });
              onClose();
            }}
          >
            <Text style={styles.saveButtonText}>Save & Run Scenario</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  templatesContainer: {
    gap: 12,
  },
  templateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedTemplateCard: {
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  templateDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  templateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  templateMetaText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  historicalAnalog: {
    fontSize: 12,
    color: '#3b82f6',
    fontStyle: 'italic',
  },
  customContainer: {
    gap: 20,
  },
  correlationToggle: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
  },
  correlationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  correlationText: {
    fontSize: 16,
    color: '#374151',
  },
  factorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  factorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  factorValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factorValueTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factorValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  factorDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  sliderContainer: {
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  historicalRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  rangeText: {
    fontSize: 10,
    color: '#9ca3af',
  },
  footer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  impactEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  impactLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  impactValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  nameInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  nameInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 4,
  },
  factorInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: '#ffffff',
    width: 80,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  inputCancel: {
    padding: 8,
  },
  editIcon: {
    marginLeft: 8,
  },
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ef4444',
  },
  categorySelector: {
    marginBottom: 16,
  },
  categoryScrollView: {
    flexGrow: 0,
  },
  categoryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  selectedCategoryButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  selectedCategoryButtonText: {
    color: '#ffffff',
  },
});

export default InteractiveScenarioBuilder; 