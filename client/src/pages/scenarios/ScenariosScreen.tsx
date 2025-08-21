import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
  TextInput,
  Platform,
  TouchableWithoutFeedback,
  StatusBar
} from 'react-native';
import StressTestResultsPopup from '../../components/stress-test/StressTestResultsPopup';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// Import Slider from community as type-only import to avoid runtime issues
// @ts-ignore
import Slider from '@react-native-community/slider';
// Import Picker from community as type-only import to avoid runtime issues
// @ts-ignore
import { Picker } from '@react-native-picker/picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { Swipeable } from 'react-native-gesture-handler';
// Removed PagerView in favor of FlatList vertical scrolling

// Import services
import portfolioService, { Portfolio } from '../../services/portfolioService';
import scenarioService from '../../services/scenarioService';
import displayNameService from '../../services/displayNameService';

// Import components
import SectionHeader from '../../components/ui/SectionHeader';
import CreateScenarioForm, { Scenario as ScenarioFormData } from '../../components/ui/CreateScenarioForm';
import InteractiveScenarioBuilder from '../../components/ui/InteractiveScenarioBuilder';
import { SCENARIO_FACTORS, ScenarioFactor } from '../../components/ui/InteractiveScenarioBuilder';

// Import state persistence
import { usePersistentState, useSaveStateOnBlur, useRestoreStateOnFocus } from '../../hooks/use-screen-state';
import { usePortfolioDisplayName, useScenarioDisplayName } from '../../hooks/useDisplayNames';

// Import string utilities
import { createScenarioSymbol, safeTruncate, safeDisplayName } from '../../utils/stringUtils';

interface Scenario {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  factorChanges: {
    equity?: number;
    rates?: number;
    credit?: number;
    fx?: number;
    commodity?: number;
  };
  isCustom?: boolean;
  category?: string;
  autoCorrelation?: boolean;
}

interface ScenarioRun {
  id: string;
  scenarioId: string;
  scenarioName: string;
  date: string;
  time: string;
  portfolioId: string;
  portfolioName: string;
  portfolioValue: number;
  impact: number;  // Percentage impact
  impactValue: number; // Absolute impact in currency
  assetClassImpacts: Record<string, number>; // Impact by asset class
  factorAttribution: Record<string, number>; // Impact attribution by factor
  greeksBefore: GreeksResults;
  greeksAfter: GreeksResults;
}

interface GreeksResults {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
}

interface ScenarioFactorChanges {
  equity?: number;
  rates?: number;
  credit?: number;
  fx?: number;
  commodity?: number;
}

// Define historical events for overlay
const HISTORICAL_EVENTS = [
  { id: 'gfc', name: '2008 Global Financial Crisis', startDate: '2008-09-15', endDate: '2009-03-09', impact: -56.8 },
  { id: 'covid', name: 'COVID-19 Crash', startDate: '2020-02-19', endDate: '2020-03-23', impact: -33.9 },
  { id: 'dotcom', name: 'Dot-com Bubble Burst', startDate: '2000-03-10', endDate: '2002-10-09', impact: -49.1 },
  { id: 'black_monday', name: 'Black Monday (1987)', startDate: '1987-10-19', endDate: '1987-10-19', impact: -22.6 },
  { id: 'volmageddon', name: 'Volmageddon (2018)', startDate: '2018-02-05', endDate: '2018-02-08', impact: -10.2 }
];

// Define types for new features
interface ScenarioCategory {
  id: string;
  name: string;
  color: string;
}

interface HedgingSuggestion {
  id: string;
  name: string;
  symbol: string;
  description: string;
  expectedImpact: number; // Percentage reduction in risk
  cost: number; // Implementation cost
  type: 'option' | 'future' | 'swap' | 'etf';
}

interface HistoricalOverlay {
  event: typeof HISTORICAL_EVENTS[number];
  visible: boolean;
}

interface ScenarioLibraryProps {
  scenarios: Scenario[];
  categories: ScenarioCategory[];
  onSelectScenario: (scenario: Scenario) => void;
  onCreateScenario: () => void;
  onCategorize: (scenarioId: string, categoryId: string) => void;
  onDeleteScenario: (scenarioId: string) => void;
  onCloneScenario: (scenario: Scenario) => void;
}

interface RiskFactorSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  unit: string;
}

interface PortfolioCreationModalProps {
  visible: boolean;
  scenarioRun: ScenarioRun | null;
  onClose: () => void;
  onCreatePortfolio: (name: string, description: string) => void;
}

interface BatchAnalysisProps {
  visible: boolean;
  scenario: Scenario | null;
  portfolios: Portfolio[];
  selectedPortfolioIds: string[];
  onClose: () => void;
  onRunBatch: (portfolioIds: string[]) => void;
  onTogglePortfolio: (portfolioId: string) => void;
}

interface HedgingSuggestionProps {
  suggestion: HedgingSuggestion;
  onApply: (suggestion: HedgingSuggestion) => void;
}

interface RiskSensitivityPanelProps {
  visible: boolean;
  scenario: Scenario | null;
  portfolio: Portfolio | null;
  onClose: () => void;
  onFactorChange: (factor: keyof ScenarioFactorChanges, value: number) => void;
  onRunScenario: () => void;
}

interface PredefinedScenarioCardProps {
  scenario: Scenario;
  onPress: (scenario: Scenario) => void;
}

const PredefinedScenarioCard: React.FC<PredefinedScenarioCardProps> = ({ scenario, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.scenarioCard}
      onPress={() => onPress(scenario)}
    >
      <View style={[styles.scenarioIconContainer, { backgroundColor: scenario.color }]}>
        <MaterialCommunityIcons name={scenario.icon || "help-circle"} size={20} color="#fff" />
      </View>
      <View style={styles.scenarioContent}>
        <Text style={styles.scenarioName}>{safeDisplayName(scenario.name, 'Unnamed Scenario')}</Text>
        <Text style={styles.scenarioDescription}>{safeTruncate(scenario.description, 100, '...', 'No description available')}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
};

// Component for displaying scenario categories
const ScenarioCategoryPill: React.FC<{
  category: ScenarioCategory;
  isSelected: boolean;
  onPress: (category: ScenarioCategory) => void;
}> = ({ category, isSelected, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        { backgroundColor: isSelected ? category.color : 'transparent' },
        { borderColor: category.color }
      ]}
      onPress={() => onPress(category)}
    >
      <Text 
        style={[
          styles.categoryPillText,
          { color: isSelected ? '#fff' : category.color }
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );
};

// Component for scenario library with categories
const ScenarioLibrary: React.FC<ScenarioLibraryProps> = ({
  scenarios,
  categories,
  onSelectScenario,
  onCreateScenario,
  onCategorize,
  onDeleteScenario,
  onCloneScenario
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = usePersistentState<string | null>('ScenarioLibrary', 'selectedCategoryId', null);
  const [scenarioMenuVisible, setScenarioMenuVisible] = useState<string | null>(null);
  
  const filteredScenarios = selectedCategoryId
    ? scenarios.filter(s => s.category === selectedCategoryId)
    : scenarios;
  
  // Flat, vertically scrollable list; no paging
  

  
  return (
    <View style={styles.libraryContainer}>
      {/* Header with title */}
      <View style={styles.libraryHeader}>
        <Text style={styles.libraryTitle}>Scenario Library</Text>
      </View>
      
      {/* Category filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScrollView}
        contentContainerStyle={styles.categoriesContainer}
      >
        <ScenarioCategoryPill
          category={{ id: 'all', name: 'All Scenarios', color: '#64748b' }}
          isSelected={selectedCategoryId === null}
          onPress={() => {
            setSelectedCategoryId(null);
          }}
        />
        {categories.map(category => (
          <ScenarioCategoryPill
            key={category.id}
            category={category}
            isSelected={selectedCategoryId === category.id}
            onPress={() => {
              setSelectedCategoryId(category.id);
            }}
          />
        ))}
      </ScrollView>
      
      {/* Scenarios Grid - vertically scrollable with nested scrolling */}
      {/* Global backdrop for menu - positioned behind dropdown */}
      {scenarioMenuVisible && (
        <TouchableWithoutFeedback onPress={() => setScenarioMenuVisible(null)}>
          <View style={[styles.menuBackdrop, { pointerEvents: 'box-none' }]} />
        </TouchableWithoutFeedback>
      )}
      
      <View style={styles.scenariosGridContainer}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scenariosGrid}
        >
          {filteredScenarios.map((scenario, index) => (
            <TouchableOpacity
              key={scenario.id}
              style={styles.gridScenarioCard}
              activeOpacity={0.8}
              onPress={() => onSelectScenario(scenario)}
            >
              <View style={styles.gridScenarioTouchable}>
                <View style={styles.gridScenarioContent}>
                  <Text style={styles.gridScenarioSymbol}>
                    {createScenarioSymbol(scenario.name)}
                  </Text>
                  <Text style={styles.gridScenarioName}>{safeDisplayName(scenario.name, 'Unnamed Scenario')}</Text>
                  <Text style={styles.gridScenarioType}>
                    {safeTruncate(scenario.description, 50, '...', 'Stress Test Scenario')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.gridScenarioMenuButton}
                onPress={() => setScenarioMenuVisible(scenario.id)}
              >
                <MaterialCommunityIcons name="dots-vertical" size={16} color="#94a3b8" />
              </TouchableOpacity>

              {scenarioMenuVisible === scenario.id && (
                <View style={index % 2 === 1 ? styles.gridScenarioMenuLeft : styles.gridScenarioMenu}>
                  <TouchableOpacity 
                    style={styles.scenarioMenuItem}
                    onPress={() => {
                      setScenarioMenuVisible(null);
                      Alert.alert(
                        'Categorize Scenario',
                        'Select a category:',
                        [
                          {text: 'Cancel', style: 'cancel'},
                          ...categories.map(category => ({
                            text: category.name,
                            onPress: () => onCategorize(scenario.id, category.id)
                          }))
                        ]
                      );
                    }}
                  >
                    <MaterialCommunityIcons name="tag" size={16} color="#334155" />
                    <Text style={styles.scenarioMenuItemText}>Categorize</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.scenarioMenuItem}
                    onPress={() => {
                      setScenarioMenuVisible(null);
                      onCloneScenario(scenario);
                    }}
                  >
                    <MaterialCommunityIcons name="content-copy" size={16} color="#334155" />
                    <Text style={styles.scenarioMenuItemText}>Clone</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.scenarioMenuItem}
                    onPress={() => {
                      setScenarioMenuVisible(null);
                      Alert.alert(
                        'Delete Scenario',
                        `Are you sure you want to delete "${safeDisplayName(scenario.name, 'this scenario')}"? This cannot be undone.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { 
                            text: 'Delete', 
                            style: 'destructive',
                            onPress: () => onDeleteScenario(scenario.id)
                          }
                        ]
                      );
                    }}
                  >
                    <MaterialCommunityIcons name="delete" size={16} color="#ef4444" />
                    <Text style={[styles.scenarioMenuItemText, {color: '#ef4444'}]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <TouchableOpacity 
        style={styles.customScenarioButton}
        onPress={onCreateScenario}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Create Custom Scenario</Text>
      </TouchableOpacity>
    </View>
  );
};

interface ScenarioRunCardProps {
  run: ScenarioRun;
  onPress: (run: ScenarioRun) => void;
  onDelete: (runId: string) => void;
}

const ScenarioRunCard: React.FC<ScenarioRunCardProps> = ({ run, onPress, onDelete }) => {
  const swipeableRef = useRef<Swipeable>(null);
  
  // Fallback display names in case the run data still has IDs
  const { name: scenarioFallbackName } = useScenarioDisplayName(
    run.scenarioName === run.scenarioId ? run.scenarioId : null
  );
  const { name: portfolioFallbackName } = usePortfolioDisplayName(
    run.portfolioName === run.portfolioId ? run.portfolioId : null
  );
  
  // Use the run's name if it's not an ID, otherwise use the fallback
  const displayScenarioName = run.scenarioName === run.scenarioId ? 
    (scenarioFallbackName || run.scenarioName) : run.scenarioName;
  const displayPortfolioName = run.portfolioName === run.portfolioId ? 
    (portfolioFallbackName || run.portfolioName) : run.portfolioName;
  
  const renderRightActions = () => {
    return (
      <TouchableOpacity 
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          Alert.alert(
            'Delete Run',
            'Are you sure you want to delete this scenario run?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete', 
                style: 'destructive',
                onPress: () => onDelete(run.id)
              }
            ]
          );
        }}
      >
        <MaterialCommunityIcons name="delete" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      rightThreshold={40}
    >
      <TouchableOpacity 
        style={styles.runCard}
        onPress={() => onPress(run)}
      >
        <View style={styles.runHeader}>
          <Text style={styles.runScenarioName}>{displayScenarioName}</Text>
          <Text style={styles.runDate}>{run.date}, {run.time}</Text>
        </View>
        
        <View style={styles.portfolioInfo}>
          <Text style={styles.portfolioName}>Portfolio: {displayPortfolioName}</Text>
        </View>
        
        <View style={styles.impactContainer}>
          <View style={styles.impactLabelContainer}>
            <Text style={styles.impactLabel}>P&L Impact</Text>
            <Text style={[
              styles.impactPercentage,
              run.impact >= 0 ? styles.positiveImpact : styles.negativeImpact
            ]}>
              {run.impact >= 0 ? '+' : ''}{run.impact.toFixed(2)}%
            </Text>
          </View>
          
          {/* P&L Impact Bar */}
          <View style={styles.impactBarContainer}>
            <View 
              style={[
                styles.impactBar,
                run.impact >= 0 ? styles.positiveBar : styles.negativeBar,
                { width: `${Math.min(Math.abs(run.impact * 2), 100)}%` }
              ]} 
            />
          </View>
          
          <Text style={[
            styles.impactValue,
            run.impact >= 0 ? styles.positiveImpact : styles.negativeImpact
          ]}>
            {run.impact >= 0 ? '+' : ''}${Math.abs(run.impactValue).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

// Component for historical events overlay
const HistoricalEventsOverlay: React.FC<{
  visible: boolean;
  overlays: HistoricalOverlay[];
  onToggleOverlay: (eventId: string) => void;
  onClose: () => void;
}> = ({ visible, overlays, onToggleOverlay, onClose }) => {
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.eventsOverlayContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Historical Events Overlay</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.eventsDescription}>
            Compare your scenario with actual historical market events.
          </Text>
          
          <FlatList
            data={overlays}
            keyExtractor={(item) => item.event.id}
            renderItem={({ item }) => (
              <View style={styles.eventRow}>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventName}>{item.event.name}</Text>
                  <Text style={styles.eventDate}>
                    {item.event.startDate === item.event.endDate 
                      ? item.event.startDate
                      : `${item.event.startDate} - ${item.event.endDate}`
                    }
                  </Text>
                  <Text style={[
                    styles.eventImpact,
                    item.event.impact >= 0 ? styles.positiveImpact : styles.negativeImpact
                  ]}>
                    {item.event.impact.toFixed(1)}% market impact
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.overlayToggle,
                    item.visible ? styles.overlayToggleActive : {}
                  ]}
                  onPress={() => onToggleOverlay(item.event.id)}
                >
                  <Text style={[
                    styles.overlayToggleText,
                    item.visible ? styles.overlayToggleTextActive : {}
                  ]}>
                    {item.visible ? 'Visible' : 'Hidden'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
          
          <TouchableOpacity 
            style={styles.applyButton}
            onPress={onClose}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Component for hedging suggestions
const HedgingSuggestionCard: React.FC<HedgingSuggestionProps> = ({ suggestion, onApply }) => {
  return (
    <View style={styles.hedgingSuggestionCard}>
      <View style={styles.hedgingHeader}>
        <View style={styles.hedgingTypeTag}>
          <Text style={styles.hedgingTypeText}>
            {suggestion.type.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.hedgingSymbol}>{suggestion.symbol}</Text>
      </View>
      
      <Text style={styles.hedgingName}>{suggestion.name}</Text>
      <Text style={styles.hedgingSuggestionDescription}>{suggestion.description}</Text>
      
      <View style={styles.hedgingDetails}>
        <View style={styles.hedgingMetric}>
          <Text style={styles.hedgingMetricLabel}>Expected Impact</Text>
          <Text style={styles.hedgingMetricValue}>
            {suggestion.expectedImpact > 0 ? '+' : ''}
            {suggestion.expectedImpact.toFixed(1)}%
          </Text>
        </View>
        
        <View style={styles.hedgingMetric}>
          <Text style={styles.hedgingMetricLabel}>Cost</Text>
          <Text style={styles.hedgingMetricValue}>
            ${suggestion.cost.toLocaleString()}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.applyHedgeButton}
        onPress={() => onApply(suggestion)}
      >
        <Text style={styles.applyHedgeButtonText}>Apply Hedge</Text>
      </TouchableOpacity>
    </View>
  );
};

const HedgingSuggestions: React.FC<{
  visible: boolean;
  suggestions: HedgingSuggestion[];
  onApply: (suggestion: HedgingSuggestion) => void;
  onClose: () => void;
}> = ({ visible, suggestions, onApply, onClose }) => {
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.hedgingSuggestionsContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Hedging Suggestions</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.hedgingDescription}>
            Based on scenario results, here are suggested hedging strategies to mitigate risk.
          </Text>
          
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <HedgingSuggestionCard
                suggestion={item}
                onApply={onApply}
              />
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

// Component for portfolio creation from scenario results
const PortfolioCreationModal: React.FC<PortfolioCreationModalProps> = ({
  visible,
  scenarioRun,
  onClose,
  onCreatePortfolio
}) => {
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  
  const handleSubmit = () => {
    if (!portfolioName.trim()) {
      Alert.alert('Error', 'Portfolio name is required');
      return;
    }
    
    onCreatePortfolio(portfolioName, portfolioDescription);
    setPortfolioName('');
    setPortfolioDescription('');
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Hedged Portfolio</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          
          {scenarioRun && (
            <View style={styles.scenarioSummary}>
              <Text style={styles.scenarioSummaryTitle}>Based on scenario: {scenarioRun.scenarioName}</Text>
              <Text style={styles.scenarioSummaryText}>
                Portfolio: {scenarioRun.portfolioName}
              </Text>
              <Text style={[
                styles.scenarioSummaryImpact,
                scenarioRun.impact >= 0 ? styles.positiveImpact : styles.negativeImpact
              ]}>
                Impact: {scenarioRun.impact >= 0 ? '+' : ''}{scenarioRun.impact.toFixed(2)}%
              </Text>
            </View>
          )}
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Portfolio Name</Text>
            <TextInput
              style={styles.textInput}
              value={portfolioName}
              onChangeText={setPortfolioName}
              placeholder="Enter portfolio name"
              placeholderTextColor="#94a3b8"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={portfolioDescription}
              onChangeText={setPortfolioDescription}
              placeholder="Enter portfolio description"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
            />
          </View>
          
          <TouchableOpacity
            style={styles.createPortfolioButton}
            onPress={handleSubmit}
          >
            <Text style={styles.createPortfolioButtonText}>Create Portfolio</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Component for batch analysis
const BatchAnalysis: React.FC<BatchAnalysisProps> = ({
  visible,
  scenario,
  portfolios,
  selectedPortfolioIds,
  onClose,
  onRunBatch,
  onTogglePortfolio
}) => {
  const [selectAll, setSelectAll] = useState(false);
  
  useEffect(() => {
    if (selectAll) {
      // Select all portfolios
      portfolios.forEach(portfolio => {
        if (!selectedPortfolioIds.includes(portfolio.id)) {
          onTogglePortfolio(portfolio.id);
        }
      });
    } else if (selectedPortfolioIds.length === portfolios.length) {
      // Deselect all portfolios
      portfolios.forEach(portfolio => {
        onTogglePortfolio(portfolio.id);
      });
    }
  }, [selectAll]);
  
  const toggleSelectAll = () => {
    setSelectAll(!selectAll);
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.batchAnalysisContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Batch Analysis</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          
          {scenario && (
            <View style={styles.batchScenarioInfo}>
              <Text style={styles.batchScenarioName}>{safeDisplayName(scenario.name, 'Unnamed Scenario')}</Text>
              <Text style={styles.batchScenarioDescription}>{safeTruncate(scenario.description, 100, '...', 'No description available')}</Text>
            </View>
          )}
          
          <View style={styles.selectAllContainer}>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={toggleSelectAll}
            >
              <MaterialCommunityIcons
                name={selectAll ? "checkbox-marked" : "checkbox-blank-outline"}
                size={24}
                color={selectAll ? "#3b82f6" : "#64748b"}
              />
              <Text style={styles.selectAllText}>Select All Portfolios</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={portfolios}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.portfolioCheckItem}
                onPress={() => onTogglePortfolio(item.id)}
              >
                <MaterialCommunityIcons
                  name={selectedPortfolioIds.includes(item.id) ? "checkbox-marked" : "checkbox-blank-outline"}
                  size={24}
                  color={selectedPortfolioIds.includes(item.id) ? "#3b82f6" : "#64748b"}
                />
                <View style={styles.portfolioCheckInfo}>
                  <Text style={styles.portfolioCheckName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.portfolioCheckDescription} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
          
          <TouchableOpacity
            style={[
              styles.runBatchButton,
              selectedPortfolioIds.length === 0 ? styles.disabledButton : {}
            ]}
            onPress={() => onRunBatch(selectedPortfolioIds)}
            disabled={selectedPortfolioIds.length === 0}
          >
            <Text style={styles.runBatchButtonText}>
              Run Analysis on {selectedPortfolioIds.length} Portfolio{selectedPortfolioIds.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Component for risk factor sliders
const RiskFactorSlider: React.FC<RiskFactorSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit
}) => {
  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value > 0 ? '+' : ''}{value}{unit}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#3b82f6"
        maximumTrackTintColor="#e2e8f0"
        thumbTintColor="#3b82f6"
      />
      <View style={styles.sliderRange}>
        <Text style={styles.sliderRangeText}>{min}{unit}</Text>
        <Text style={styles.sliderRangeText}>{max}{unit}</Text>
      </View>
    </View>
  );
};

// Component for risk sensitivity panel
const RiskSensitivityPanel: React.FC<RiskSensitivityPanelProps> = ({
  visible,
  scenario,
  portfolio,
  onClose,
  onFactorChange,
  onRunScenario
}) => {
  if (!visible || !scenario) return null;
  
  // Default factor values from scenario
  const factorValues = scenario.factorChanges;
  
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sensitivityPanelContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Risk Factor Sensitivity</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#334155" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.panelScenarioInfo}>
            <Text style={styles.panelScenarioName}>
              {safeDisplayName(scenario.name, 'Unnamed Scenario')} {portfolio ? `/ ${portfolio.name}` : ''}
            </Text>
            <Text style={styles.panelScenarioDescription}>
              Adjust risk factors to see real-time impact
            </Text>
          </View>
          
          <ScrollView style={styles.factorSlidersContainer}>
            <RiskFactorSlider
              label="Equity Markets"
              value={factorValues.equity || 0}
              min={-50}
              max={50}
              step={1}
              onChange={(value) => onFactorChange('equity', value)}
              unit="%"
            />
            
            <RiskFactorSlider
              label="Interest Rates"
              value={factorValues.rates || 0}
              min={-300}
              max={300}
              step={5}
              onChange={(value) => onFactorChange('rates', value)}
              unit=" bps"
            />
            
            <RiskFactorSlider
              label="Credit Spreads"
              value={factorValues.credit || 0}
              min={-300}
              max={500}
              step={5}
              onChange={(value) => onFactorChange('credit', value)}
              unit=" bps"
            />
            
            <RiskFactorSlider
              label="FX Rates"
              value={factorValues.fx || 0}
              min={-30}
              max={30}
              step={1}
              onChange={(value) => onFactorChange('fx', value)}
              unit="%"
            />
            
            <RiskFactorSlider
              label="Commodity Prices"
              value={factorValues.commodity || 0}
              min={-50}
              max={50}
              step={1}
              onChange={(value) => onFactorChange('commodity', value)}
              unit="%"
            />
          </ScrollView>
          
          <TouchableOpacity
            style={styles.runSensitivityButton}
            onPress={onRunScenario}
          >
            <Text style={styles.runSensitivityButtonText}>Run Scenario</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// Export scenario results to PDF
const exportScenarioToPDF = async (scenarioRun: ScenarioRun): Promise<void> => {
  try {
    // Generate HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #334155; }
            h1 { color: #1e293b; font-size: 24px; margin-bottom: 10px; }
            h2 { color: #334155; font-size: 18px; margin-top: 20px; margin-bottom: 10px; }
            .date { color: #64748b; margin-bottom: 20px; }
            .portfolio { background-color: #f1f5f9; padding: 8px 12px; display: inline-block; border-radius: 4px; margin-bottom: 20px; }
            .impact { font-size: 20px; font-weight: bold; margin: 15px 0; }
            .positive { color: #10b981; }
            .negative { color: #ef4444; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th { background-color: #f1f5f9; text-align: left; padding: 12px; }
            td { padding: 12px; border-top: 1px solid #e2e8f0; }
            .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Scenario Analysis: ${scenarioRun.scenarioName}</h1>
          <div class="date">Generated on ${scenarioRun.date} at ${scenarioRun.time}</div>
          <div class="portfolio">Portfolio: ${scenarioRun.portfolioName}</div>
          
          <h2>Portfolio Impact</h2>
          <div class="impact ${scenarioRun.impact >= 0 ? 'positive' : 'negative'}">
            ${scenarioRun.impact >= 0 ? '+' : ''}${scenarioRun.impact.toFixed(2)}% 
            (${scenarioRun.impact >= 0 ? '+' : ''}$${Math.abs(scenarioRun.impactValue).toLocaleString()})
          </div>
          
          <h2>Impact by Asset Class</h2>
          <table>
            <tr>
              <th>Asset Class</th>
              <th>Impact (%)</th>
            </tr>
            ${Object.entries(scenarioRun.assetClassImpacts).map(([assetClass, impact]) => `
              <tr>
                <td>${assetClass.charAt(0).toUpperCase() + assetClass.slice(1)}</td>
                <td class="${impact >= 0 ? 'positive' : 'negative'}">
                  ${impact >= 0 ? '+' : ''}${impact.toFixed(2)}%
                </td>
              </tr>
            `).join('')}
          </table>
          
          <h2>Factor Attribution</h2>
          <table>
            <tr>
              <th>Factor</th>
              <th>Impact ($)</th>
            </tr>
            ${Object.entries(scenarioRun.factorAttribution).map(([factor, impact]) => `
              <tr>
                <td>${factor.charAt(0).toUpperCase() + factor.slice(1)}</td>
                <td class="${impact >= 0 ? 'positive' : 'negative'}">
                  ${impact >= 0 ? '+' : ''}$${Math.abs(impact).toLocaleString()}
                </td>
              </tr>
            `).join('')}
          </table>
          
          <h2>Greeks Change</h2>
          <table>
            <tr>
              <th>Greek</th>
              <th>Before</th>
              <th>After</th>
              <th>Change</th>
            </tr>
            <tr>
              <td>Delta</td>
              <td>${scenarioRun.greeksBefore.delta.toFixed(2)}</td>
              <td>${scenarioRun.greeksAfter.delta.toFixed(2)}</td>
              <td class="${scenarioRun.greeksAfter.delta - scenarioRun.greeksBefore.delta >= 0 ? 'positive' : 'negative'}">
                ${scenarioRun.greeksAfter.delta - scenarioRun.greeksBefore.delta >= 0 ? '+' : ''}
                ${(scenarioRun.greeksAfter.delta - scenarioRun.greeksBefore.delta).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td>Gamma</td>
              <td>${scenarioRun.greeksBefore.gamma.toFixed(2)}</td>
              <td>${scenarioRun.greeksAfter.gamma.toFixed(2)}</td>
              <td class="${scenarioRun.greeksAfter.gamma - scenarioRun.greeksBefore.gamma >= 0 ? 'positive' : 'negative'}">
                ${scenarioRun.greeksAfter.gamma - scenarioRun.greeksBefore.gamma >= 0 ? '+' : ''}
                ${(scenarioRun.greeksAfter.gamma - scenarioRun.greeksBefore.gamma).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td>Theta</td>
              <td>${scenarioRun.greeksBefore.theta.toFixed(2)}</td>
              <td>${scenarioRun.greeksAfter.theta.toFixed(2)}</td>
              <td class="${scenarioRun.greeksAfter.theta - scenarioRun.greeksBefore.theta >= 0 ? 'positive' : 'negative'}">
                ${scenarioRun.greeksAfter.theta - scenarioRun.greeksBefore.theta >= 0 ? '+' : ''}
                ${(scenarioRun.greeksAfter.theta - scenarioRun.greeksBefore.theta).toFixed(2)}
              </td>
            </tr>
            <tr>
              <td>Vega</td>
              <td>${scenarioRun.greeksBefore.vega.toFixed(2)}</td>
              <td>${scenarioRun.greeksAfter.vega.toFixed(2)}</td>
              <td class="${scenarioRun.greeksAfter.vega - scenarioRun.greeksBefore.vega >= 0 ? 'positive' : 'negative'}">
                ${scenarioRun.greeksAfter.vega - scenarioRun.greeksBefore.vega >= 0 ? '+' : ''}
                ${(scenarioRun.greeksAfter.vega - scenarioRun.greeksBefore.vega).toFixed(2)}
              </td>
            </tr>
          </table>
          
          <div class="footer">
            Generated by Risk Report App
          </div>
        </body>
      </html>
    `;
    
    // Generate PDF file
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    // Share the PDF
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${scenarioRun.scenarioName} Analysis`
      });
    } else {
      // For web or other platforms
      alert(`PDF generated and saved to: ${uri}`);
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    Alert.alert('Export Error', 'Failed to export scenario to PDF. Please try again.');
  }
};

const ScenariosScreen: React.FC = () => {
  // Add defensive check for React hooks
  if (!React || !useState) {
    console.error('React hooks not available');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // Basic state
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [scenarioRuns, setScenarioRuns] = useState<ScenarioRun[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedScenario, setSelectedScenario] = usePersistentState<Scenario | null>('ScenariosScreen', 'selectedScenario', null);
  const [selectedRun, setSelectedRun] = usePersistentState<ScenarioRun | null>('ScenariosScreen', 'selectedRun', null);
  const [showRunDetails, setShowRunDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New state for enhanced features
  const [scenarioCategories, setScenarioCategories] = useState<ScenarioCategory[]>([
    { id: 'crisis', name: 'Market Crisis', color: '#ef4444' },
    { id: 'rates', name: 'Rate Changes', color: '#f59e0b' },
    { id: 'policy', name: 'Policy Changes', color: '#10b981' },
    { id: 'sector', name: 'Sector-Specific', color: '#3b82f6' },
    { id: 'custom', name: 'Custom', color: '#8b5cf6' }
  ]);
  const [showPortfolioCreation, setShowPortfolioCreation] = useState(false);
  const [showBatchAnalysis, setShowBatchAnalysis] = useState(false);
  const [showRiskSensitivity, setShowRiskSensitivity] = useState(false);
  const [showHistoricalOverlay, setShowHistoricalOverlay] = useState(false);
  const [showHedgingSuggestions, setShowHedgingSuggestions] = useState(false);
  const [selectedPortfolioIds, setSelectedPortfolioIds] = useState<string[]>([]);
  const [currentFactorChanges, setCurrentFactorChanges] = useState<ScenarioFactorChanges>({
    equity: 0,
    rates: 0,
    credit: 0,
    fx: 0,
    commodity: 0
  });
  const [historicalOverlays, setHistoricalOverlays] = useState<HistoricalOverlay[]>(
    HISTORICAL_EVENTS.map(event => ({
      event,
      visible: false
    }))
  );
  const [hedgingSuggestions, setHedgingSuggestions] = useState<HedgingSuggestion[]>([
    {
      id: '1',
      name: 'S&P 500 Put Option',
      symbol: 'SPY P 400 DEC23',
      description: 'Purchase put options on S&P 500 to hedge against equity market downside',
      expectedImpact: 15.2,
      cost: 12500,
      type: 'option'
    },
    {
      id: '2',
      name: 'Treasury Future',
      symbol: 'TLT F DEC23',
      description: 'Long position in Treasury futures to hedge interest rate risk',
      expectedImpact: 8.5,
      cost: 8200,
      type: 'future'
    },
    {
      id: '3',
      name: 'VIX ETF',
      symbol: 'VXX',
      description: 'Volatility ETF to hedge market turbulence',
      expectedImpact: 12.0,
      cost: 15000,
      type: 'etf'
    },
    {
      id: '4',
      name: 'Credit Default Swap',
      symbol: 'CDX IG',
      description: 'Credit default swap to hedge corporate credit exposure',
      expectedImpact: 9.8,
      cost: 22000,
      type: 'swap'
    }
  ]);
  const [showCreateScenarioForm, setShowCreateScenarioForm] = useState(false);
  
  // Phase 1 Enhancement State
  const [showInteractiveBuilder, setShowInteractiveBuilder] = useState(false);
  const [showViewParameters, setShowViewParameters] = useState(false);
  const [viewParametersData, setViewParametersData] = useState<ScenarioFactorChanges | null>(null);
  
  // Add state for scenario options modal
  const [showScenarioOptions, setShowScenarioOptions] = useState(false);
  const [scenarioOptionsTarget, setScenarioOptionsTarget] = useState<Scenario | null>(null);
  
  // Add state for detailed asset breakdown popup
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [detailedResults, setDetailedResults] = useState<any>(null);
  
  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get data (service will handle initialization internally)
        const scenariosData = await scenarioService.getScenarios();
        const runsData = await scenarioService.getScenarioRuns();
        const portfoliosData = await portfolioService.getPortfolios();
        
        setScenarios(scenariosData);
        setScenarioRuns(runsData);
        setPortfolios(portfoliosData);
      } catch (error) {
        console.error('Error loading data:', error);
        Alert.alert('Error', 'Failed to load scenarios data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Handle scenario press
  const handleScenarioPress = (scenario: Scenario) => {
    setScenarioOptionsTarget(scenario);
    setShowScenarioOptions(true);
  };

  const handleCloneScenario = (scenario: Scenario) => {
    // Map the scenario's factor changes to the format expected by the Interactive Builder
    const factorValues: Record<string, number> = {};
    
    // Map the short keys to the full factor IDs
    const keyMap: Record<string, string> = {
      equity: 'equity_markets',
      rates: 'interest_rates',
      credit: 'credit_spreads',
      fx: 'currency',
      commodity: 'commodity_prices',
      inflation: 'inflation',
      volatility: 'volatility',
      real_estate: 'real_estate',
      liquidity_risk: 'liquidity_risk',
      emerging_markets: 'emerging_markets'
    };

    // Convert the scenario's factor changes to the builder's format
    Object.entries(scenario.factorChanges).forEach(([key, value]) => {
      const fullKey = keyMap[key] || key;
      factorValues[fullKey] = value;
    });

    // Set the initial values for the Interactive Builder
    setInitialBuilderValues({
      name: `${safeDisplayName(scenario.name, 'Unnamed Scenario')} (Clone)`,
      factors: factorValues,
      autoCorrelation: scenario.autoCorrelation || false
    });

    // Open the Interactive Builder
    setShowInteractiveBuilder(true);
  };

  // Add state for initial builder values
  const [initialBuilderValues, setInitialBuilderValues] = useState<{
    name: string;
    factors: Record<string, number>;
    autoCorrelation: boolean;
  } | null>(null);

  // Helper function to format Greeks changes with better UX
  const formatGreeksChange = (before: number, after: number, greekType: string) => {
    const difference = after - before;
    const absoluteDifference = Math.abs(difference);
    
    // Consider changes less than 0.01 as "no change"
    const isNoChange = absoluteDifference < 0.01;
    
    // Format large numbers better
    const formatNumber = (num: number) => {
      if (Math.abs(num) >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
      }
      return num.toFixed(2);
    };
    
    // Get Greek description
    const getGreekDescription = (greek: string) => {
      switch (greek.toLowerCase()) {
        case 'delta': return 'Price sensitivity to underlying movement';
        case 'gamma': return 'Rate of change of delta';
        case 'theta': return 'Time decay impact';
        case 'vega': return 'Volatility sensitivity';
        case 'rho': return 'Interest rate sensitivity';
        default: return '';
      }
    };
    
    return {
      before: formatNumber(before),
      after: formatNumber(after),
      difference: formatNumber(difference),
      isNoChange,
      isPositive: difference > 0,
      isNegative: difference < 0,
      description: getGreekDescription(greekType),
      impactLevel: absoluteDifference < 0.1 ? 'low' : absoluteDifference < 1 ? 'medium' : 'high'
    };
  };

  // Update handleOpenInteractiveBuilder to use initial values if present
  const handleOpenInteractiveBuilder = () => {
    setInitialBuilderValues(null); // Clear any previous values
    setShowInteractiveBuilder(true);
  };

  // Update handleSaveInteractiveScenario to handle cloned scenarios
  const handleSaveInteractiveScenario = async (scenarioData: any) => {
    try {
      setLoading(true);
      
      // Create a new custom scenario from the interactive builder
      const newScenario: Omit<ScenarioFormData, 'id' | 'createdAt' | 'updatedAt' | 'results'> = {
        name: scenarioData.name,
        description: `Interactive scenario: ${scenarioData.name}`,
        type: 'custom',
        parameters: [
          { id: 'equity', name: 'Equity Markets', value: scenarioData.factors.equity_markets || 0, description: 'Global equity market change' },
          { id: 'rates', name: 'Interest Rates', value: scenarioData.factors.interest_rates || 0, description: 'Interest rate change (bps)' },
          { id: 'credit', name: 'Credit Spreads', value: scenarioData.factors.credit_spreads || 0, description: 'Credit spread change (bps)' },
          { id: 'fx', name: 'Currency', value: scenarioData.factors.currency || 0, description: 'USD exchange rate change' },
          { id: 'commodity', name: 'Commodities', value: scenarioData.factors.commodity_prices || 0, description: 'Commodity price change' }
        ],
        appliedPortfolioIds: []
      };

      await handleScenarioFormSubmit(newScenario);
    } catch (error) {
      console.error('Error saving interactive scenario:', error);
      Alert.alert('Error', 'Failed to save scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle running a scenario - UPDATED to use fresh portfolio data
  const handleRunScenario = async (scenarioId: string, portfolioId: string) => {
    try {
      setLoading(true);
      
      console.log('🔄 Running scenario with fresh portfolio data...');
      console.log('Scenario ID:', scenarioId);
      console.log('Portfolio ID:', portfolioId);
      
      // Run the scenario with fresh portfolio data
      const result = await scenarioService.runScenarioWithFreshData(scenarioId, portfolioId);
      
      // Refresh scenario runs
      const updatedRuns = await scenarioService.getScenarioRuns();
      setScenarioRuns(updatedRuns);
      
      // Show the result
      setSelectedRun(result);
      setShowRunDetails(true);
      
      console.log('✅ Scenario completed with fresh data!');
      console.log('Total Impact:', result.impact.toFixed(2) + '%');
    } catch (error) {
      console.error('Error running scenario:', error);
      Alert.alert('Error', 'Failed to run scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle scenario run press
  const handleRunPress = async (run: ScenarioRun) => {
    setSelectedRun(run);
    setShowRunDetails(true);
  };
  
  // Handle batch analysis run
  const handleRunBatchAnalysis = async (portfolioIds: string[]) => {
    if (!selectedScenario || portfolioIds.length === 0) return;
    
    try {
      setLoading(true);
      setShowBatchAnalysis(false);
      
      // Run scenario on each selected portfolio
      const batchResults = [];
      
      for (const portfolioId of portfolioIds) {
        // Run the scenario with fresh portfolio data
        const result = await scenarioService.runScenarioWithFreshData(selectedScenario.id, portfolioId);
        batchResults.push(result);
      }
      
      // Refresh scenario runs
      const updatedRuns = await scenarioService.getScenarioRuns();
      setScenarioRuns(updatedRuns);
      
      // Show batch results summary
      Alert.alert(
        'Batch Analysis Complete',
        `Completed analysis on ${batchResults.length} portfolios.`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Error running batch analysis:', error);
      Alert.alert('Error', 'Failed to complete batch analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle toggle portfolio selection for batch analysis
  const handleTogglePortfolio = (portfolioId: string) => {
    setSelectedPortfolioIds(prev => {
      if (prev.includes(portfolioId)) {
        return prev.filter(id => id !== portfolioId);
      } else {
        return [...prev, portfolioId];
      }
    });
  };
  
  // Handle factor change in sensitivity analysis
  const handleFactorChange = (factor: keyof ScenarioFactorChanges, value: number) => {
    setCurrentFactorChanges(prev => ({
      ...prev,
      [factor]: value
    }));
  };
  
  // Handle running scenario with modified factors
  const handleRunScenarioWithFactors = async () => {
    if (!selectedScenario) return;
    
    try {
      setLoading(true);
      setShowRiskSensitivity(false);
      
      // Create a temporary scenario with modified factors
      const tempScenario: Scenario = {
        ...selectedScenario,
        id: `temp_${Date.now()}`,
        name: `${safeDisplayName(selectedScenario.name, 'Unnamed Scenario')} (Modified)`,
        factorChanges: currentFactorChanges,
        isCustom: true
      };
      
      // Show portfolio selection dialog
      if (portfolios.length > 0) {
        Alert.alert(
          'Select Portfolio',
          `Run modified scenario on which portfolio?`,
          [
            { text: 'Cancel', style: 'cancel' },
            ...portfolios.map(portfolio => ({
              text: portfolio.name,
              onPress: async () => {
                // Run the scenario with fresh portfolio data
                const result = await scenarioService.runScenarioWithFreshData(tempScenario.id, portfolio.id);
                
                // Refresh scenario runs
                const updatedRuns = await scenarioService.getScenarioRuns();
                setScenarioRuns(updatedRuns);
                
                // Show the result
                setSelectedRun(result);
                setShowRunDetails(true);
              }
            }))
          ]
        );
      } else {
        Alert.alert('No Portfolios', 'Please create a portfolio first before running a scenario.');
      }
    } catch (error) {
      console.error('Error running scenario with modified factors:', error);
      Alert.alert('Error', 'Failed to run scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle creating a hedged portfolio from scenario results
  const handleCreateHedgedPortfolio = async (name: string, description: string) => {
    if (!selectedRun) return;
    
    try {
      setLoading(true);
      setShowPortfolioCreation(false);
      
      // Get the original portfolio
      const originalPortfolio = portfolios.find(p => p.id === selectedRun.portfolioId);
      
      if (!originalPortfolio) {
        throw new Error('Original portfolio not found');
      }
      
      // Create a new portfolio with modified assets (applying suggested hedges)
      const hedgedPortfolio = await portfolioService.createPortfolio({
        name,
        description,
        assets: [
          ...originalPortfolio.assets,
          // Add a sample hedge asset
          {
            id: `hedge_${Date.now()}`,
            symbol: 'SPY_PUT',
            name: 'S&P 500 Put Option',
            quantity: 10,
            price: 25.75,
            assetClass: 'equity'
          }
        ]
      });
      
      // Refresh portfolios
      const updatedPortfolios = await portfolioService.getPortfolios();
      setPortfolios(updatedPortfolios);
      
      Alert.alert(
        'Portfolio Created',
        `Successfully created hedged portfolio "${name}".`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating hedged portfolio:', error);
      Alert.alert('Error', 'Failed to create hedged portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle toggling historical event overlay
  const handleToggleHistoricalOverlay = (eventId: string) => {
    setHistoricalOverlays(prevOverlays => 
      prevOverlays.map(overlay => 
        overlay.event.id === eventId
          ? { ...overlay, visible: !overlay.visible }
          : overlay
      )
    );
  };
  
  // Handle applying a hedge suggestion
  const handleApplyHedge = (suggestion: HedgingSuggestion) => {
    setShowHedgingSuggestions(false);
    
    // Show portfolio creation modal to create a hedged portfolio
    setShowPortfolioCreation(true);
  };
  
  // Handle showing detailed asset breakdown popup
  const handleShowDetailedResults = async () => {
    if (!selectedRun) return;
    
    try {
      setLoading(true);
      
      // Debug: Log the selectedRun data
      console.log('🔍 Selected Run Data:', selectedRun);
      console.log('📊 Scenario ID:', selectedRun.scenarioId);
      console.log('💼 Portfolio ID:', selectedRun.portfolioId);
      
      // Validate that we have the required data
      if (!selectedRun.scenarioId || !selectedRun.portfolioId) {
        throw new Error('Missing scenario or portfolio ID');
      }
      
      // Map scenario IDs to API format
      const scenarioIdMapping: Record<string, string> = {
        '7': 'TMPL0006', // Market Decline -25%
        '1': 'TMPL0001', // 2008 Financial Crisis
        '2': 'TMPL0002', // Fed Rate Hike +100bps
        '3': 'TMPL0003', // Oil Price Shock +50%
        '4': 'TMPL0004', // Technology Sector Correction
        '5': 'TMPL0005', // COVID-19 Pandemic Crash
        '6': 'TMPL0006', // Market Decline -25% (alternative)
        '8': 'TMPL0007', // Credit Crisis +350bps
        '9': 'TMPL0008', // Geopolitical Shock
      };
      
      // Map portfolio IDs to API format
      const portfolioIdMapping: Record<string, string> = {
        // API portfolios (direct mapping)
        'income-portfolio': 'income-portfolio',
        'growth-portfolio': 'growth-portfolio',
        'balanced-portfolio': 'balanced-portfolio',
        
        // Frontend sample portfolios (map to closest API portfolio)
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890': 'income-portfolio', // Conservative Portfolio
        'b2c3d4e5-f6g7-8901-bcde-f23456789012': 'growth-portfolio', // Aggressive Growth
        'c3d4e5f6-g7h8-9012-cdef-345678901234': 'income-portfolio', // Income Portfolio
      };
      
      const apiScenarioId = scenarioIdMapping[selectedRun.scenarioId] || selectedRun.scenarioId;
      const apiPortfolioId = portfolioIdMapping[selectedRun.portfolioId] || 'income-portfolio'; // Default to income-portfolio if not found
      
      console.log('🔄 ID Mapping:');
      console.log('  Original Scenario ID:', selectedRun.scenarioId);
      console.log('  API Scenario ID:', apiScenarioId);
      console.log('  Original Portfolio ID:', selectedRun.portfolioId);
      console.log('  API Portfolio ID:', apiPortfolioId);
      
      const requestBody = {
        scenarioId: apiScenarioId,
        portfolioId: apiPortfolioId,
        options: {
          confidenceLevel: 0.95,
          timeHorizon: 1
        }
      };
      
      console.log('📤 Request Body:', requestBody);
      
      // Call the stress test API to get detailed results with asset breakdown
      // Use centralized API bases to resolve correct host/ports
      const { STRESS_BASE } = await import('../../config/api');
      let baseUrl = STRESS_BASE;
      console.log('📡 Using Stress API Base:', baseUrl);

      // Connectivity pre-check and base URL fallbacks
      const candidates: string[] = [];
      candidates.push(baseUrl);
      try {
        const Constants = (await import('expo-constants')).default as any;
        const host = Constants?.debuggerHost || Constants?.expoConfig?.hostUri;
        if (typeof host === 'string' && host.length > 0) {
          const ip = host.split(':')[0];
          if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
            candidates.push(`http://${ip}:3000`);
          }
        }
        const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra;
        if (extra?.stressBase && typeof extra.stressBase === 'string') {
          candidates.push(extra.stressBase);
        }
      } catch {}
      candidates.push('http://localhost:3000');
      console.log('🔎 Stress API Candidates:', candidates);

      let healthyBase: string | null = null;
      for (const cand of candidates) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
          const health = await fetch(`${cand}/api/status`, { method: 'GET', signal: controller.signal });
          clearTimeout(timeout);
          if ((health as any)?.ok) {
            healthyBase = cand;
            break;
          }
        } catch {}
      }
      if (healthyBase) {
        baseUrl = healthyBase;
      }
      console.log('✅ Stress API Selected Base:', baseUrl);

      // Helper with timeout
      const fetchWithTimeout = async (url: string, options: any, timeoutMs: number) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, { ...options, signal: controller.signal });
          return res;
        } finally {
          clearTimeout(id);
        }
      };

      let response: Response | null = null;
      const baseAttempts = Array.from(new Set([baseUrl, ...candidates]));
      let lastError: any = null;
      for (const base of baseAttempts) {
        try {
          console.log('🌐 Attempting stress run via:', base);
          response = await fetchWithTimeout(`${base}/api/stress-test/run`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          }, 10000);
          if (response.ok) {
            baseUrl = base;
            break;
          }
          console.log('⚠️ Non-OK response:', response.status, response.statusText);
        } catch (e) {
          console.warn('⚠️ Network attempt failed for base:', base, e);
          lastError = e;
          continue;
        }
      }

      if (!response) {
        throw lastError || new Error('No response from any stress API base');
      }

      console.log('📥 Response Status:', response.status);
      console.log('📥 Response OK:', response.ok);

      // If the mapped IDs fail, try with different portfolios as fallback (same selected base)
      if (!response.ok) {
        console.log('⚠️ Mapped IDs failed, trying with fallback portfolios...');
        const fallbackPortfolios = ['income-portfolio', 'growth-portfolio', 'balanced-portfolio'];
        for (const fallbackPortfolioId of fallbackPortfolios) {
          if (fallbackPortfolioId === apiPortfolioId) continue;
          console.log(`🔄 Trying fallback portfolio: ${fallbackPortfolioId}`);
          const fallbackRequestBody = {
            scenarioId: apiScenarioId,
            portfolioId: fallbackPortfolioId,
            options: { confidenceLevel: 0.95, timeHorizon: 1 }
          };
          try {
            response = await fetchWithTimeout(`${baseUrl}/api/stress-test/run`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fallbackRequestBody)
            }, 10000);
          } catch (e) {
            console.warn('⚠️ Fallback attempt failed:', e);
            continue;
          }
          console.log(`📥 Fallback Response (${fallbackPortfolioId}):`, response.status, response.ok);
          if (response.ok) {
            console.log(`✅ Success with fallback portfolio: ${fallbackPortfolioId}`);
            Alert.alert('Portfolio Not Found', `The original portfolio "${selectedRun.portfolioName}" was not found in the stress test system. Using "${fallbackPortfolioId}" as a substitute to show the asset breakdown.`, [{ text: 'OK' }]);
            break;
          }
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response Error:', errorText);
        throw new Error(`Failed to fetch detailed results: ${response.status} ${response.statusText}`);
      }
      
      const results = await response.json();
      console.log('✅ Results received:', results);
      
      setDetailedResults(results);
      setShowDetailedResults(true);
    } catch (error) {
      console.error('❌ Error fetching detailed results:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', `Failed to load detailed asset breakdown: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle categorizing a scenario
  const handleCategorizeScenario = async (scenarioId: string, categoryId: string) => {
    try {
      // Find the scenario
      const scenario = scenarios.find(s => s.id === scenarioId);
      
      if (!scenario) return;
      
      // Update the scenario with the new category
      const updatedScenario: Scenario = {
        ...scenario,
        category: categoryId
      };
      
      // Save the updated scenario
      await scenarioService.updateScenario(updatedScenario.id, {
        name: updatedScenario.name,
        description: updatedScenario.description,
        factorChanges: {
          equity: updatedScenario.factorChanges.equity || 0,
          rates: updatedScenario.factorChanges.rates || 0,
          credit: updatedScenario.factorChanges.credit || 0,
          fx: updatedScenario.factorChanges.fx || 0,
          commodity: updatedScenario.factorChanges.commodity || 0
        },
        icon: updatedScenario.icon,
        color: updatedScenario.color
      });
      
      // Refresh scenarios
      const updatedScenarios = await scenarioService.getScenarios();
      setScenarios(updatedScenarios);
      
      Alert.alert('Success', 'Scenario categorized successfully.');
    } catch (error) {
      console.error('Error categorizing scenario:', error);
      Alert.alert('Error', 'Failed to categorize scenario. Please try again.');
    }
  };
  
  // Handle creating a custom scenario
  const handleCreateCustomScenario = () => {
    setShowInteractiveBuilder(true);
  };
  
  // Handle scenario creation from form
  const handleScenarioFormSubmit = async (scenarioData: Omit<ScenarioFormData, 'id' | 'createdAt' | 'updatedAt' | 'results'>) => {
    try {
      setLoading(true);
      
      // Convert scenario data to the format expected by the service
      const factorChanges = scenarioData.parameters.reduce((obj, param) => {
        // Map each parameter to a factor change
        // This is a simplification - in a real app, you'd have a more sophisticated mapping
        const key = param.name.toLowerCase().replace(/\s+/g, '_');
        return { ...obj, [key]: param.value };
      }, {
        equity: 0,
        rates: 0,
        credit: 0,
        fx: 0,
        commodity: 0
      });
      
      // Create the scenario
      const newScenario = await scenarioService.createScenario(
        scenarioData.name,
        scenarioData.description,
        factorChanges,
        {
          icon: 'flask-outline',  // Default icon for custom scenarios
          color: '#8b5cf6'        // Default color for custom scenarios
        }
      );
      
      // Refresh scenarios
      const updatedScenarios = await scenarioService.getScenarios();
      setScenarios(updatedScenarios);
      
      // Close the form
      setShowCreateScenarioForm(false);
      
      // Show success message
      Alert.alert('Success', 'Custom scenario created successfully!');
    } catch (error) {
      console.error('Error creating scenario:', error);
      Alert.alert('Error', 'Failed to create custom scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle exporting scenario results
  const handleExportScenario = () => {
    if (!selectedRun) return;
    
    Alert.alert(
      'Export Results',
      'Choose export format:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'PDF Report', 
          onPress: () => exportScenarioToPDF(selectedRun)
        },
        { 
          text: 'CSV Data',
          onPress: () => {
            Alert.alert('CSV Export', 'CSV export would be implemented here.');
          }
        }
      ]
    );
  };
  
  // Handle deleting a specific scenario run
  const handleDeleteRun = async (runId: string) => {
    try {
      setLoading(true);
      
      // Delete the scenario run
      await scenarioService.deleteScenarioRun(runId);
      
      // Update the list
      const updatedRuns = await scenarioService.getScenarioRuns();
      setScenarioRuns(updatedRuns);
      
      // Show success message
      Alert.alert('Success', 'Scenario run has been deleted.');
    } catch (error) {
      console.error('Error deleting scenario run:', error);
      Alert.alert('Error', 'Failed to delete scenario run. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle clearing scenario run history
  const handleClearHistory = () => {
    if (scenarioRuns.length === 0) return;
    
    Alert.alert(
      'Clear Run History',
      'Are you sure you want to clear all scenario run history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Clear scenario runs
              await scenarioService.clearScenarioRuns();
              
              // Update state
              setScenarioRuns([]);
              
              Alert.alert('Success', 'Scenario run history has been cleared.');
            } catch (error) {
              console.error('Error clearing scenario runs:', error);
              Alert.alert('Error', 'Failed to clear scenario run history. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Handle deleting a scenario
  const handleDeleteScenario = async (scenarioId: string) => {
    try {
      setLoading(true);
      
      // Delete the scenario
      await scenarioService.deleteScenario(scenarioId);
      
      // Refresh scenarios
      const updatedScenarios = await scenarioService.getScenarios();
      setScenarios(updatedScenarios);
      
      // Show success message
      Alert.alert('Success', 'Scenario has been deleted successfully.');
    } catch (error) {
      console.error('Error deleting scenario:', error);
      Alert.alert('Error', 'Failed to delete scenario. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading scenarios...</Text>
      </View>
    );
  }
  
  // Render run details view
  if (showRunDetails && selectedRun) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowRunDetails(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#334155" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scenario Run Details</Text>
          
          <TouchableOpacity 
            style={styles.headerAction}
            onPress={handleExportScenario}
          >
            <MaterialCommunityIcons name="export" size={24} color="#334155" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>{selectedRun.scenarioName}</Text>
            <Text style={styles.detailsDate}>Run on {selectedRun.date} at {selectedRun.time}</Text>
            <View style={styles.detailsPortfolioTag}>
              <Text style={styles.detailsPortfolioTagText}>Portfolio: {selectedRun.portfolioName}</Text>
            </View>
          </View>
          
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>Portfolio Impact</Text>
            <View style={styles.impactDetailRow}>
              <Text style={styles.impactDetailLabel}>P&L Impact:</Text>
              <Text style={[
                styles.impactDetailValue,
                selectedRun.impact >= 0 ? styles.positiveImpact : styles.negativeImpact
              ]}>
                {selectedRun.impact >= 0 ? '+' : ''}{selectedRun.impact.toFixed(2)}% 
                ({selectedRun.impact >= 0 ? '+' : ''}${Math.abs(selectedRun.impactValue).toLocaleString()})
              </Text>
            </View>
          </View>
          
          <View style={styles.detailsCard}>
            <View style={styles.detailsCardHeader}>
              <Text style={styles.detailsCardTitle}>Impact by Asset Class</Text>
              <TouchableOpacity 
                style={styles.overlayButton}
                onPress={() => setShowHistoricalOverlay(true)}
              >
                <Text style={styles.overlayButtonText}>Historical Overlay</Text>
              </TouchableOpacity>
            </View>
            
            {Object.keys(selectedRun.assetClassImpacts).length > 0 ? (
              <View style={styles.assetClassTable}>
                {Object.entries(selectedRun.assetClassImpacts).map(([assetClass, impact]) => (
                  <View key={assetClass} style={styles.assetClassRow}>
                    <Text style={styles.assetClassName}>
                      {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)}
                    </Text>
                    <Text style={[
                      styles.assetClassImpact,
                      impact >= 0 ? styles.positiveImpact : styles.negativeImpact
                    ]}>
                      {impact >= 0 ? '+' : ''}{impact.toFixed(2)}%
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Image
                source={{ uri: 'https://miro.medium.com/v2/resize:fit:1400/1*l_QoPs5-eZepLAoaGEdo6Q.png' }}
                style={styles.barChartImage}
                resizeMode="contain"
              />
            )}
          </View>
          
          <View style={styles.detailsCard}>
            <Text style={styles.detailsCardTitle}>Factor Attribution</Text>
            <View style={styles.factorTable}>
              <View style={styles.factorTableHeader}>
                <Text style={styles.factorHeaderCell}>Factor</Text>
                <Text style={styles.factorHeaderCell}>Impact</Text>
              </View>
              {Object.entries(selectedRun.factorAttribution).map(([factor, impact]) => (
                <View key={factor} style={styles.factorTableRow}>
                  <Text style={styles.factorCell}>{factor.charAt(0).toUpperCase() + factor.slice(1)}</Text>
                  <Text style={[
                    styles.factorCell, 
                    impact >= 0 ? styles.positiveImpact : styles.negativeImpact
                  ]}>
                    {impact >= 0 ? '+' : ''}${Math.abs(impact).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.detailsCard}>
            <View style={styles.detailsCardHeader}>
              <Text style={styles.detailsCardTitle}>Greeks Analysis</Text>
              <View style={styles.greeksHeaderInfo}>
                <MaterialCommunityIcons name="information-outline" size={16} color="#64748b" />
                <Text style={styles.greeksHeaderText}>Risk sensitivities</Text>
              </View>
            </View>
            
            <View style={styles.enhancedGreeksContainer}>
              {[
                { key: 'delta', label: 'Delta (Δ)', before: selectedRun.greeksBefore.delta, after: selectedRun.greeksAfter.delta },
                { key: 'gamma', label: 'Gamma (Γ)', before: selectedRun.greeksBefore.gamma, after: selectedRun.greeksAfter.gamma },
                { key: 'theta', label: 'Theta (Θ)', before: selectedRun.greeksBefore.theta, after: selectedRun.greeksAfter.theta },
                { key: 'vega', label: 'Vega (ν)', before: selectedRun.greeksBefore.vega, after: selectedRun.greeksAfter.vega },
              ].map((greek) => {
                const change = formatGreeksChange(greek.before, greek.after, greek.key);
                return (
                  <View key={greek.key} style={styles.enhancedGreekRow}>
                    <View style={styles.greekRowHeader}>
                      <Text style={styles.greekName}>{greek.label}</Text>
                      <View style={styles.greekChangeContainer}>
                        {change.isNoChange ? (
                          <View style={styles.noChangeIndicator}>
                            <MaterialCommunityIcons name="minus" size={14} color="#64748b" />
                            <Text style={styles.noChangeText}>No Change</Text>
                          </View>
                        ) : (
                          <View style={styles.changeIndicator}>
                            <MaterialCommunityIcons 
                              name={change.isPositive ? "trending-up" : "trending-down"} 
                              size={14} 
                              color={change.isPositive ? "#10b981" : "#ef4444"} 
                            />
                            <Text style={[
                              styles.changeText,
                              change.isPositive ? styles.positiveChange : styles.negativeChange
                            ]}>
                              {change.isPositive ? '+' : ''}{change.difference}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.greekValueRow}>
                      <Text style={styles.greekValue}>{change.before}</Text>
                      <MaterialCommunityIcons name="arrow-right" size={16} color="#94a3b8" />
                      <Text style={styles.greekValue}>{change.after}</Text>
                    </View>
                    
                    <Text style={styles.greekDescription}>{change.description}</Text>
                    
                    {!change.isNoChange && (
                      <View style={styles.impactIndicator}>
                        <View style={[
                          styles.greeksImpactBar,
                          change.impactLevel === 'high' ? styles.impactHigh : 
                          change.impactLevel === 'medium' ? styles.impactMedium : 
                          styles.impactLow
                        ]}>
                          <View style={[
                            styles.greeksImpactBarFill,
                            { 
                              width: `${Math.min(100, (Math.abs(greek.after - greek.before) / 10) * 100)}%`,
                              backgroundColor: change.isPositive ? "#10b981" : "#ef4444"
                            }
                          ]} />
                        </View>
                        <Text style={styles.greeksImpactLabel}>
                          {change.impactLevel.charAt(0).toUpperCase() + change.impactLevel.slice(1)} Impact
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
          
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={styles.runAgainButton}
              onPress={() => {
                setShowRunDetails(false);
                const scenario = scenarios.find(s => s.id === selectedRun.scenarioId);
                if (scenario) {
                  // Run with the portfolio ID directly
                  handleRunScenario(scenario.id, selectedRun.portfolioId);
                }
              }}
            >
              <Text style={styles.runAgainButtonText}>Run This Scenario Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.hedgingButton}
              onPress={() => setShowHedgingSuggestions(true)}
            >
              <Text style={styles.hedgingButtonText}>View Hedging Suggestions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.createPortfolioButton}
              onPress={() => setShowPortfolioCreation(true)}
            >
              <Text style={styles.createPortfolioButtonText}>Create Hedged Portfolio</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cloneButton}
              onPress={() => {
                // In a real app, this would navigate to a scenario editor
                Alert.alert('Clone Scenario', 'This would allow you to clone and modify this scenario.');
              }}
            >
              <Text style={styles.cloneButtonText}>Clone & Modify Scenario</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.assetBreakdownButton}
              onPress={handleShowDetailedResults}
              disabled={loading}
            >
              <MaterialCommunityIcons name="chart-box-outline" size={20} color="#ffffff" />
              <Text style={styles.assetBreakdownButtonText}>View Detailed Asset Breakdown</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        {/* New modals */}
        <HistoricalEventsOverlay
          visible={showHistoricalOverlay}
          overlays={historicalOverlays}
          onToggleOverlay={handleToggleHistoricalOverlay}
          onClose={() => setShowHistoricalOverlay(false)}
        />
        
        <HedgingSuggestions
          visible={showHedgingSuggestions}
          suggestions={hedgingSuggestions}
          onApply={handleApplyHedge}
          onClose={() => setShowHedgingSuggestions(false)}
        />
        
        <PortfolioCreationModal
          visible={showPortfolioCreation}
          scenarioRun={selectedRun}
          onClose={() => setShowPortfolioCreation(false)}
          onCreatePortfolio={handleCreateHedgedPortfolio}
        />
        
        {/* Render StressTestResultsPopup with complete isolation */}
        {(() => {
          try {
            if (showDetailedResults === true && React.isValidElement) {
              return (
                <StressTestResultsPopup
                  visible={true}
                  onClose={() => {
                    try {
                      setShowDetailedResults(false);
                    } catch (error) {
                      console.error('Error closing popup:', error);
                    }
                  }}
                  results={detailedResults}
                />
              );
            }
            return null;
          } catch (error) {
            console.error('Error rendering StressTestResultsPopup:', error);
            setShowDetailedResults(false);
            return null;
          }
        })()}
      </View>
    );
  }
  
  // Render main screen
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with matching Risk Report design */}
      <View style={styles.headerContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.appTitle}>Scenarios</Text>
        </View>
      </View>
      
      <ScrollView style={styles.content} nestedScrollEnabled>
        <View style={styles.section}>
          <SectionHeader 
            title="Scenario Library"
            subtitle="Market shock templates and custom scenarios"
          />
          
          <ScenarioLibrary
            scenarios={scenarios}
            categories={scenarioCategories}
            onSelectScenario={handleScenarioPress}
            onCreateScenario={handleOpenInteractiveBuilder}
            onCategorize={handleCategorizeScenario}
            onDeleteScenario={handleDeleteScenario}
            onCloneScenario={handleCloneScenario}
          />
        </View>
        
        <View style={styles.section}>
          <SectionHeader 
            title="Scenario Run History"
            subtitle="Review past scenario analyses"
          />
          
          {scenarioRuns.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="history" size={48} color="#94a3b8" />
              <Text style={styles.emptyStateText}>No scenario runs yet</Text>
              <Text style={styles.emptyStateSubtext}>Run a scenario to see results here</Text>
            </View>
          ) : (
            <>
              {scenarioRuns.map(run => (
                <ScenarioRunCard
                  key={run.id}
                  run={run}
                  onPress={handleRunPress}
                  onDelete={handleDeleteRun}
                />
              ))}
              
              <TouchableOpacity 
                style={styles.clearHistoryButton}
                onPress={handleClearHistory}
              >
                <MaterialCommunityIcons name="delete-sweep" size={18} color="#ef4444" style={styles.buttonIcon} />
                <Text style={styles.clearHistoryButtonText}>Clear History</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        
        {/* Batch Analysis Modal */}
        <BatchAnalysis
          visible={showBatchAnalysis}
          scenario={selectedScenario}
          portfolios={portfolios}
          selectedPortfolioIds={selectedPortfolioIds}
          onClose={() => setShowBatchAnalysis(false)}
          onRunBatch={handleRunBatchAnalysis}
          onTogglePortfolio={handleTogglePortfolio}
        />
        
        {/* Risk Sensitivity Panel */}
        <RiskSensitivityPanel
          visible={showRiskSensitivity}
          scenario={selectedScenario}
          portfolio={selectedPortfolioIds.length > 0 
            ? portfolios.find(p => p.id === selectedPortfolioIds[0]) || null 
            : null}
          onClose={() => setShowRiskSensitivity(false)}
          onFactorChange={handleFactorChange}
          onRunScenario={handleRunScenarioWithFactors}
        />
      </ScrollView>
      
      {/* Create Scenario Form Modal */}
      <CreateScenarioForm
        visible={showCreateScenarioForm}
        onSubmit={handleScenarioFormSubmit}
        onCancel={() => setShowCreateScenarioForm(false)}
      />
      
      {/* Phase 1 Enhancement Components */}
      {showInteractiveBuilder && (
      <InteractiveScenarioBuilder
        visible={showInteractiveBuilder}
          onClose={() => {
            setShowInteractiveBuilder(false);
            setInitialBuilderValues(null);
          }}
        onSaveScenario={handleSaveInteractiveScenario}
        portfolios={portfolios}
          initialValues={initialBuilderValues || undefined}
        />
      )}
      

      
      {/* Other modals */}
      {/* ... existing modals ... */}
      {/* View Parameters Modal */}
      {showViewParameters && (
        <Modal
          visible={showViewParameters}
          transparent
          animationType="slide"
          onRequestClose={() => setShowViewParameters(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Scenario Parameters</Text>
                <TouchableOpacity onPress={() => setShowViewParameters(false)}>
                  <Ionicons name="close" size={24} color="#334155" />
              </TouchableOpacity>
            </View>
              <ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text style={{ color: '#334155', fontWeight: '500' }}>Auto-correlation</Text>
                  <Text style={{ color: '#64748b' }}>{selectedScenario && selectedScenario.autoCorrelation ? 'On' : 'Off'}</Text>
                </View>
                {(() => {
                  const parametersWithValues = SCENARIO_FACTORS.filter((factor: ScenarioFactor) => {
                    // Map scenario.factorChanges keys to SCENARIO_FACTORS ids
                    const keyMap: Record<string, string> = {
                      equity: 'equity_markets',
                      rates: 'interest_rates',
                      credit: 'credit_spreads',
                      fx: 'currency',
                      commodity: 'commodity_prices',
                      inflation: 'inflation',
                      volatility: 'volatility',
                      real_estate: 'real_estate',
                      liquidity_risk: 'liquidity_risk',
                      emerging_markets: 'emerging_markets',
                    };
                    // Try both the id and the mapped key
                    let value = 0;
                    if (viewParametersData) {
                      // Try to find the value by id or by mapped key
                      value =
                        viewParametersData[factor.id as keyof typeof viewParametersData] ??
                        viewParametersData[
                          Object.keys(keyMap).find(k => keyMap[k] === factor.id) as keyof typeof viewParametersData
                        ] ?? 0;
                    }
                    // Only show parameters that have non-zero values
                    return value !== 0;
                  });

                  if (parametersWithValues.length === 0) {
                    return (
                      <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                        <Ionicons name="information-circle-outline" size={48} color="#94a3b8" />
                        <Text style={{ color: '#64748b', fontSize: 16, marginTop: 12, textAlign: 'center' }}>
                          No scenario parameters with values found
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 4, textAlign: 'center' }}>
                          This scenario has no risk factor changes defined
                        </Text>
                      </View>
                    );
                  }

                  return parametersWithValues.map((factor: ScenarioFactor) => {
                    // Map scenario.factorChanges keys to SCENARIO_FACTORS ids
                    const keyMap: Record<string, string> = {
                      equity: 'equity_markets',
                      rates: 'interest_rates',
                      credit: 'credit_spreads',
                      fx: 'currency',
                      commodity: 'commodity_prices',
                      inflation: 'inflation',
                      volatility: 'volatility',
                      real_estate: 'real_estate',
                      liquidity_risk: 'liquidity_risk',
                      emerging_markets: 'emerging_markets',
                    };
                    // Try both the id and the mapped key
                    let value = 0;
                    if (viewParametersData) {
                      // Try to find the value by id or by mapped key
                      value =
                        viewParametersData[factor.id as keyof typeof viewParametersData] ??
                        viewParametersData[
                          Object.keys(keyMap).find(k => keyMap[k] === factor.id) as keyof typeof viewParametersData
                        ] ?? 0;
                    }
                    const sign = value >= 0 ? '+' : '';
                    return (
                      <View key={factor.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text style={{ color: '#334155', fontWeight: '500' }}>{factor.name}</Text>
                        <Text style={{ color: '#64748b' }}>{`${sign}${Math.abs(value).toFixed(2)}${factor.unit}`}</Text>
                      </View>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      {showScenarioOptions && scenarioOptionsTarget && (
        <Modal
          visible={showScenarioOptions}
          transparent
          animationType="fade"
          onRequestClose={() => setShowScenarioOptions(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setShowScenarioOptions(false)}
          >
                         <View style={[styles.modalContainer, { marginTop: 'auto', marginBottom: 40 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Run Scenario</Text>
                <TouchableOpacity onPress={() => setShowScenarioOptions(false)}>
                  <Ionicons name="close" size={24} color="#334155" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{ paddingVertical: 16 }}
                onPress={() => {
                  setShowScenarioOptions(false);
                  if (portfolios.length === 0) {
                    Alert.alert('No Portfolios', 'Please create a portfolio first before running a scenario.');
                    return;
                  }
                  if (portfolios.length === 1) {
                    handleRunScenario(scenarioOptionsTarget.id, portfolios[0].id);
                  } else {
                    Alert.alert(
                      'Select Portfolio',
                      'Choose a portfolio to run this scenario on:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        ...portfolios.map(portfolio => ({
                          text: portfolio.name,
                          onPress: () => handleRunScenario(scenarioOptionsTarget.id, portfolio.id)
                        }))
                      ]
                    );
                  }
                }}
              >
                <Text style={{ color: '#334155', fontSize: 16 }}>Run on Single Portfolio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 16 }}
                onPress={() => {
                  setShowScenarioOptions(false);
                  if (portfolios.length === 0) {
                    Alert.alert('No Portfolios', 'Please create a portfolio first before running batch analysis.');
                    return;
                  }
                  setSelectedPortfolioIds([]);
                  setShowBatchAnalysis(true);
                }}
              >
                <Text style={{ color: '#334155', fontSize: 16 }}>Run Batch Analysis</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ paddingVertical: 16 }}
                onPress={() => {
                  setShowScenarioOptions(false);
                  setViewParametersData(scenarioOptionsTarget.factorChanges);
                  setShowViewParameters(true);
                }}
              >
                <Text style={{ color: '#334155', fontSize: 16 }}>View Parameters</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  headerContainer: {
    backgroundColor: 'rgba(245, 245, 247, 0.98)', 
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 10, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowRadius: 6, 
    elevation: 3, 
    zIndex: 100,
  },
  appTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#000', 
    marginBottom: 16 
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
  },
  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  scenarioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 12,
  },
  scenarioIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scenarioContent: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  customScenarioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  runCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  runScenarioName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
  },
  runDate: {
    fontSize: 14,
    color: '#94a3b8',
  },
  portfolioInfo: {
    marginBottom: 12,
  },
  portfolioName: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  impactContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  impactLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  impactLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  impactPercentage: {
    fontSize: 16,
    fontWeight: '600',
  },
  impactBarContainer: {
    height: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  impactBar: {
    height: '100%',
    borderRadius: 6,
  },
  positiveBar: {
    backgroundColor: '#10b981',
  },
  negativeBar: {
    backgroundColor: '#ef4444',
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  positiveImpact: {
    color: '#10b981',
  },
  negativeImpact: {
    color: '#ef4444',
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  detailsHeader: {
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  detailsDate: {
    fontSize: 14,
    color: '#94a3b8',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  overlayButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  overlayButtonText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  impactDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactDetailLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  impactDetailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  barChartImage: {
    height: 200,
    width: '100%',
  },
  assetClassTable: {
    marginTop: 8,
  },
  assetClassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  assetClassName: {
    fontSize: 14,
    color: '#334155',
  },
  assetClassImpact: {
    fontSize: 14,
    fontWeight: '600',
  },
  factorTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  factorTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  factorHeaderCell: {
    flex: 1,
    fontWeight: '600',
    color: '#64748b',
    fontSize: 14,
  },
  factorTableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  factorCell: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  greeksTable: {
    marginTop: 8,
  },
  greeksTableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  greeksLabel: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  greeksValue: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
  },
  greeksChange: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  actionButtonsContainer: {
    marginBottom: 24,
  },
  runAgainButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  runAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  hedgingButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  hedgingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  createPortfolioButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  createPortfolioButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  cloneButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  cloneButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
  },
  assetBreakdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  assetBreakdownButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  detailsPortfolioTag: {
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  detailsPortfolioTagText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  clearHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  clearHistoryButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // New Styles for Enhanced Features
  
  // Category Styles
  libraryContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  categoriesScrollView: {
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  categoryPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scenariosListContainer: {
    marginBottom: 12,
  },
  scenarioItemWithMenu: {
    position: 'relative',
    marginBottom: 12,
  },
  scenarioMenuButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  scenarioMenu: {
    position: 'absolute',
    right: 8,
    top: 44,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 99,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  scenarioMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 16,
  },
  scenarioMenuItemText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 8,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  
  // Scenario Summary in Portfolio Creation Modal
  scenarioSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  scenarioSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  scenarioSummaryText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  scenarioSummaryImpact: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Form Styles
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#334155',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // Historical Events Overlay
  eventsOverlayContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  eventsDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  eventImpact: {
    fontSize: 14,
    fontWeight: '600',
  },
  overlayToggle: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  overlayToggleActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  overlayToggleText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  overlayToggleTextActive: {
    color: '#fff',
  },
  
  // Batch Analysis
  batchAnalysisContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  batchScenarioInfo: {
    marginBottom: 16,
  },
  batchScenarioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  batchScenarioDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  selectAllContainer: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectAllText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    marginLeft: 8,
  },
  portfolioCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  portfolioCheckInfo: {
    flex: 1,
    marginLeft: 12,
  },
  portfolioCheckName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  portfolioCheckDescription: {
    fontSize: 14,
    color: '#94a3b8',
  },
  runBatchButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
  },
  runBatchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Risk Sensitivity Panel
  sensitivityPanelContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  panelScenarioInfo: {
    marginBottom: 16,
  },
  panelScenarioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  panelScenarioDescription: {
    fontSize: 14,
    color: '#64748b',
  },
  factorSlidersContainer: {
    marginBottom: 16,
    maxHeight: 350,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  slider: {
    height: 40,
    width: '100%',
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderRangeText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  runSensitivityButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  runSensitivityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Hedging Suggestions
  hedgingSuggestionsContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  hedgingDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  hedgingSuggestionDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  hedgingSuggestionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  hedgingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hedgingTypeTag: {
    backgroundColor: '#3b82f6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  hedgingTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  hedgingSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  hedgingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  hedgingDetails: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  hedgingMetric: {
    flex: 1,
  },
  hedgingMetricLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  hedgingMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  applyHedgeButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  applyHedgeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    width: 80,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    marginLeft: 16,
  },

  enhancementGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  enhancementCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  enhancementIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: '#f3f4f6',
  },
  enhancementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  enhancementDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  enhancementFeatures: {
    marginTop: 8,
  },
  enhancementFeature: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 500,
  },
  
  // New Grid Layout Styles
  libraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  libraryTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
  },
  scenariosGridContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    overflow: 'visible',
    maxHeight: undefined,
  },
  scenariosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  gridScenarioCard: {
    width: '47%',
    height: 110,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  gridScenarioTouchable: {
    flex: 1,
    padding: 12,
  },
  gridScenarioContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  gridScenarioSymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  gridScenarioName: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 14,
  },
  gridScenarioType: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 'auto',
    lineHeight: 12,
  },
  gridScenarioMenuButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  gridScenarioMenu: {
    position: 'absolute',
    top: 32,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    maxWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1500,
  },
  gridScenarioMenuLeft: {
    position: 'absolute',
    top: 32,
    left: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    maxWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1500,
  },
  gridScenarioMenuTopRight: {
    position: 'absolute',
    bottom: 32,
    right: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    maxWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1500,
  },
  gridScenarioMenuTopLeft: {
    position: 'absolute',
    bottom: 32,
    left: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 120,
    maxWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1500,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginHorizontal: 16,
    marginBottom: 2,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  activePageIndicator: {
    backgroundColor: '#007AFF',
  },
  pageText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  greeksHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeksHeaderText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 4,
  },
  enhancedGreeksContainer: {
    marginBottom: 16,
  },
  enhancedGreekRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  greekRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greekName: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '600',
  },
  greekChangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  positiveChange: {
    color: '#10b981',
  },
  negativeChange: {
    color: '#ef4444',
  },
  noChangeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  noChangeText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  greekValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  greekValue: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    marginHorizontal: 8,
  },
  greekDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
  },
  impactIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  greeksImpactBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginRight: 12,
    overflow: 'hidden',
  },
  greeksImpactLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    minWidth: 80,
  },
  greeksImpactBarFill: {
    height: 6,
    borderRadius: 3,
  },
  impactHigh: {
    backgroundColor: '#ef4444',
  },
  impactMedium: {
    backgroundColor: '#f59e0b',
  },
  impactLow: {
    backgroundColor: '#10b981',
  },
});



export default ScenariosScreen; 