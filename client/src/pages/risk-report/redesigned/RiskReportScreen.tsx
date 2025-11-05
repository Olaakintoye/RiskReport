import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  Platform,
  Animated,
  Modal,
  TextInput
} from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import axios from 'axios';
import http, { healthCheck, postWithRetry } from '../../../lib/http';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../../../navigation-types';
import { LineChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';

// Import services and types
import portfolioService, { Portfolio, PortfolioSummary } from '../../../services/portfolioService';
import riskService, { VaRParams, VaRResults, GreeksResults, RiskMetrics, getLastVaRAnalysis } from '../../../services/riskService';
import intelligentStressTestService, { PortfolioComposition } from '../../../services/intelligentStressTestService';
import * as notificationService from '../../../services/notificationService';
import { AlertHistoryItem } from '../../../services/notificationService';

// Define route type for navigation params
type RiskReportScreenRouteProp = RouteProp<RootStackParamList, 'Var'>;

// Import spacing constants
import SPACING from '../../../constants/spacing';

// Import components
import PortfolioSelector from './components/PortfolioSelector';
import RiskOverview from './components/RiskOverview';
import VaRAnalysisCard from './components/VaRAnalysisCard';
import TimeSeriesCard from './components/TimeSeriesCard';
import BenchmarkCard from './components/BenchmarkCard';
import PositionRiskCard from './components/PositionRiskCard';
import MetricsCard from './components/MetricsCard';
import ExportToolsCard from './components/ExportToolsCard';
import BacktestCard from './components/BacktestCard';
import RiskTracker from './components/RiskTracker';
import PortfolioRiskSettings from '../../../components/ui/PortfolioRiskSettings';

// Constants
import API_BASE from '../../../config/api';
const DEFAULT_VAR_PARAMS: VaRParams = { 
  confidenceLevel: 0.95, 
  timeHorizon: 1, 
  numSimulations: 10000,
  lookbackPeriod: 5 // Default 5-year lookback
};
const { width } = Dimensions.get('window');
const CONFIDENCE_LEVELS = [0.90, 0.95, 0.99];
const TIME_HORIZONS = [1, 5, 10, 20];
const LOOKBACK_PERIODS = [1, 3, 5, 10]; // Available lookback periods in years

// Portfolio Composition Card Component
interface PortfolioCompositionCardProps {
  composition: PortfolioComposition | null;
  onViewMore?: () => void;
}

const PortfolioCompositionCard: React.FC<PortfolioCompositionCardProps> = ({ composition, onViewMore }) => {
  const getAssetClassColor = (assetClass: string) => {
    const colors: Record<string, string> = {
      equity: '#3b82f6',
      bond: '#10b981',
      cash: '#f59e0b',
      commodity: '#ef4444',
      real_estate: '#8b5cf6',
      alternative: '#6366f1',
      crypto: '#ec4899'
    };
    return colors[assetClass] || '#64748b';
  };

  const getConcentrationColor = (level: string) => {
    switch (level) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#64748b';
    }
  };

  if (!composition) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Portfolio Composition</Text>
          <MaterialCommunityIcons name="chart-pie" size={24} color="#007AFF" />
        </View>
        <View style={styles.compositionPlaceholder}>
          <MaterialCommunityIcons name="chart-donut" size={48} color="#c7c7cc" />
          <Text style={styles.placeholderText}>No composition data available</Text>
        </View>
      </View>
    );
  }

  const sortedAssetClasses = Object.entries(composition.assetClassWeights)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 4); // Show top 4 asset classes

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Portfolio Composition</Text>
        <TouchableOpacity onPress={onViewMore}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#000000" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.compositionContent}>
        {/* Summary Metrics */}
        <View style={styles.compositionSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={styles.summaryValue}>
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(composition.totalValue)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Asset Classes</Text>
            <Text style={styles.summaryValue}>{Object.keys(composition.assetClassWeights).length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Concentration</Text>
            <Text style={[styles.summaryValue, { color: getConcentrationColor(composition.concentrationLevel) }]}>
              {composition.concentrationLevel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Asset Class Breakdown */}
        <View style={styles.assetClassBreakdown}>
          <Text style={styles.subsectionTitle}>Asset Allocation</Text>
          {sortedAssetClasses.map(([assetClass, weight]) => (
            <View key={assetClass} style={styles.assetClassRow}>
              <View style={styles.assetClassInfo}>
                <View style={[styles.assetClassDot, { backgroundColor: getAssetClassColor(assetClass) }]} />
                <Text style={styles.assetClassName}>
                  {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)}
                </Text>
              </View>
              <View style={styles.assetClassMetrics}>
                <Text style={styles.assetClassWeight}>{(weight * 100).toFixed(2)}%</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { 
                    width: `${weight * 100}%`, 
                    backgroundColor: getAssetClassColor(assetClass) 
                  }]} />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Intelligent Insights */}
        <View style={styles.intelligentInsights}>
          <Text style={styles.subsectionTitle}>Smart Risk Insights</Text>
          {composition.dominantAssetClasses.length > 0 && (
            <View style={styles.insightItem}>
              <MaterialCommunityIcons name="lightbulb" size={16} color="#f59e0b" />
              <Text style={styles.insightText}>
                Dominant exposure: {composition.dominantAssetClasses.map(ac => 
                  ac.charAt(0).toUpperCase() + ac.slice(1)).join(', ')}
              </Text>
            </View>
          )}
          {composition.concentrationLevel === 'high' && (
            <View style={styles.insightItem}>
              <MaterialCommunityIcons name="alert" size={16} color="#ef4444" />
              <Text style={styles.insightText}>
                High concentration risk detected - consider diversification
              </Text>
            </View>
          )}
          {!composition.crossAssetExposure && (
            <View style={styles.insightItem}>
              <MaterialCommunityIcons name="information" size={16} color="#3b82f6" />
              <Text style={styles.insightText}>
                Single asset class focus - stress tests will be targeted
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

type VarAnalysisModalProps = {
  visible: boolean;
  onClose: () => void;
  onRun: (confidence: number, horizon: number, numSimulations: number, lookbackPeriod: number) => void;
  defaultConfidence?: number;
  defaultHorizon?: number;
  defaultSimulations?: number;
  defaultLookbackPeriod?: number;
};

const VarAnalysisModal: React.FC<VarAnalysisModalProps> = ({ 
  visible, 
  onClose, 
  onRun, 
  defaultConfidence, 
  defaultHorizon, 
  defaultSimulations,
  defaultLookbackPeriod
}) => {
  const [confidence, setConfidence] = useState<number>(defaultConfidence || 0.95);
  const [horizon, setHorizon] = useState<number>(defaultHorizon || 1);
  const [simulations, setSimulations] = useState<string>(defaultSimulations ? String(defaultSimulations) : '10000');
  const [lookbackPeriod, setLookbackPeriod] = useState<number>(defaultLookbackPeriod || 5);

  useEffect(() => {
    setConfidence(defaultConfidence || 0.95);
    setHorizon(defaultHorizon || 1);
    setSimulations(defaultSimulations ? String(defaultSimulations) : '10000');
    setLookbackPeriod(defaultLookbackPeriod || 5);
  }, [defaultConfidence, defaultHorizon, defaultSimulations, defaultLookbackPeriod, visible]);

  const handleSimulationsChange = (text: string) => /^\d*$/.test(text) && setSimulations(text);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#23272f' }}>Run VaR Analysis</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
          </View>
          
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#23272f', marginTop: 8 }}>Confidence Level</Text>
          <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Higher confidence levels provide more conservative risk estimates</Text>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {CONFIDENCE_LEVELS.map(level => (
              <TouchableOpacity key={level} 
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, 
                marginHorizontal: 4, backgroundColor: confidence === level ? '#000000' : '#f8fafc', alignItems: 'center' }}
                onPress={() => setConfidence(level)}>
                <Text style={{ color: confidence === level ? '#fff' : '#000000', fontWeight: '600', fontSize: 15 }}>{Math.round(level * 100)}%</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#23272f', marginTop: 20 }}>Time Horizon</Text>
          <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Number of days to project potential losses</Text>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {TIME_HORIZONS.map(days => (
              <TouchableOpacity key={days}
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, 
                marginHorizontal: 4, backgroundColor: horizon === days ? '#000000' : '#f8fafc', alignItems: 'center' }}
                onPress={() => setHorizon(days)}>
                <Text style={{ color: horizon === days ? '#fff' : '#000000', fontWeight: '600', fontSize: 15 }}>{days} day{days > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#23272f', marginTop: 20 }}>Lookback Period</Text>
          <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Historical data timeframe used for analysis</Text>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {LOOKBACK_PERIODS.map(years => (
              <TouchableOpacity key={years}
                style={{ flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, 
                marginHorizontal: 4, backgroundColor: lookbackPeriod === years ? '#000000' : '#f8fafc', alignItems: 'center' }}
                onPress={() => setLookbackPeriod(years)}>
                <Text style={{ color: lookbackPeriod === years ? '#fff' : '#000000', fontWeight: '600', fontSize: 15 }}>{years} year{years > 1 ? 's' : ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#23272f', marginTop: 20 }}>Number of Simulations</Text>
          <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>Monte Carlo model only</Text>
          <TextInput style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingVertical: 10, 
            paddingHorizontal: 12, fontSize: 15, color: '#23272f', backgroundColor: '#f8fafc', marginBottom: 8 }}
            keyboardType="numeric" value={simulations} onChangeText={handleSimulationsChange}
            placeholder="10000" maxLength={7} />
          
          <View style={{ backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginTop: 8, marginBottom: 16 }}>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              This analysis will run three VaR models: Parametric, Historical, and Monte Carlo simulation. Results will show the potential loss at your selected confidence level over the specified time horizon using {lookbackPeriod} years of historical data.
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <TouchableOpacity style={{ paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, marginRight: 8 }} onPress={onClose}>
              <Text style={{ color: '#273c75', fontWeight: '600', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#000000', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 }}
              onPress={() => onRun(confidence, horizon, Math.max(1, parseInt(simulations) || 10000), lookbackPeriod)}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Run Analysis</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const RiskReportScreen: React.FC = () => {
  // Get route params for portfolio ID
  const route = useRoute<RiskReportScreenRouteProp>();
  const navigationPortfolioId = route.params?.portfolioId;

  // State
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [selectedPortfolioSummary, setSelectedPortfolioSummary] = useState<PortfolioSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [varResults, setVarResults] = useState<{
    parametric: VaRResults | null;
    historical: VaRResults | null;
    monteCarlo: VaRResults | null;
  }>({
    parametric: null,
    historical: null,
    monteCarlo: null,
  });
  const [activeVarChart, setActiveVarChart] = useState<string>('parametric');
  const [greeks, setGreeks] = useState<GreeksResults | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [runningPythonAnalysis, setRunningPythonAnalysis] = useState(false);
  const [showDetailView, setShowDetailView] = useState<string | null>(null);
  const scrollY = new Animated.Value(0);
  const [varModalVisible, setVarModalVisible] = useState(false);
  const [analysisConfidence, setAnalysisConfidence] = useState(DEFAULT_VAR_PARAMS.confidenceLevel);
  const [analysisHorizon, setAnalysisHorizon] = useState(DEFAULT_VAR_PARAMS.timeHorizon);
  const [analysisSimulations, setAnalysisSimulations] = useState(DEFAULT_VAR_PARAMS.numSimulations);
  const [analysisLookbackPeriod, setAnalysisLookbackPeriod] = useState(DEFAULT_VAR_PARAMS.lookbackPeriod || 5);
  const [lookbackPeriod, setLookbackPeriod] = useState(DEFAULT_VAR_PARAMS.lookbackPeriod || 5);
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);
  const [portfolioComposition, setPortfolioComposition] = useState<PortfolioComposition | null>(null);
  const [hasLoadedLastAnalysis, setHasLoadedLastAnalysis] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // Load last VaR analysis for a portfolio
  const loadLastVaRAnalysis = async (portfolioId: string) => {
    try {
      console.log('[VaR] Loading last analysis for portfolio:', portfolioId);
      const lastAnalysis = await getLastVaRAnalysis(portfolioId);
      
      if (lastAnalysis && lastAnalysis.hasAnalysis) {
        console.log('[VaR] Found previous VaR analysis in database, loading results');
        setVarResults({
          parametric: lastAnalysis.parametric,
          historical: lastAnalysis.historical,
          monteCarlo: lastAnalysis.monteCarlo
        });
        setHasLoadedLastAnalysis(true);
        
        // Force chart refresh to show the loaded data
        setChartRefreshTrigger(Date.now());
      } else {
        console.log('[VaR] No previous VaR analysis found in database');
        
        // Set all VaR results to null - no analysis exists
        setVarResults({
          parametric: null,
          historical: null,
          monteCarlo: null
        });
        setHasLoadedLastAnalysis(false);
      }
    } catch (error) {
      console.error('[VaR] Error loading last analysis:', error);
      
      // On error, assume no analysis exists
      setVarResults({
        parametric: null,
        historical: null,
        monteCarlo: null
      });
      setHasLoadedLastAnalysis(false);
    }
  };

  // Load data function
  const loadData = async () => {
    try {
      setLoading(true);
      const portfolioSummaries = await portfolioService.getPortfolioSummaries();
      setPortfolios(portfolioSummaries);
      
      // Prioritize navigation portfolio ID if provided
      let targetPortfolioId = null;
      let targetPortfolioSummary = null;
      
      if (navigationPortfolioId && portfolioSummaries.length > 0) {
        // Find the portfolio matching the navigation parameter
        targetPortfolioSummary = portfolioSummaries.find(p => p.id === navigationPortfolioId);
        if (targetPortfolioSummary) {
          targetPortfolioId = navigationPortfolioId;
          console.log('Using portfolio from navigation:', targetPortfolioSummary.name);
        }
      }
      
      // Fall back to first portfolio if no navigation portfolio or not found
      if (!targetPortfolioSummary && portfolioSummaries.length > 0) {
        targetPortfolioSummary = portfolioSummaries[0];
        targetPortfolioId = portfolioSummaries[0].id;
        console.log('Using first available portfolio:', targetPortfolioSummary.name);
      }
      
      if (targetPortfolioSummary && targetPortfolioId) {
        setSelectedPortfolioSummary(targetPortfolioSummary);
        const portfolio = await portfolioService.getPortfolioById(targetPortfolioId);
        if (portfolio) {
          setSelectedPortfolio(portfolio);
          await calculateRiskMetrics(portfolio);
          
          // Analyze portfolio composition for intelligent insights
          try {
            const composition = intelligentStressTestService.analyzePortfolioComposition(portfolio);
            setPortfolioComposition(composition);
          } catch (error) {
            console.error('Error analyzing portfolio composition:', error);
            setPortfolioComposition(null);
          }
          
          // Load last VaR analysis for this portfolio
          await loadLastVaRAnalysis(targetPortfolioId);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load portfolio data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load data on component mount
  useEffect(() => { loadData(); }, []);
  
  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const loadPortfolios = async () => {
        try {
          const portfolioSummaries = await portfolioService.getPortfolioSummaries();
          setPortfolios(portfolioSummaries);
          
          if (!selectedPortfolioSummary && portfolioSummaries.length > 0) {
            setSelectedPortfolioSummary(portfolioSummaries[0]);
            const portfolio = await portfolioService.getPortfolioById(portfolioSummaries[0].id);
            if (portfolio) {
              setSelectedPortfolio(portfolio);
              await calculateRiskMetrics(portfolio);
            }
          }
        } catch (error) {
          console.error('Error reloading portfolios on focus:', error);
        }
      };
      
      loadPortfolios();
    }, [selectedPortfolioSummary])
  );
  
  // Calculate risk metrics for the selected portfolio
  const calculateRiskMetrics = async (portfolio: Portfolio) => {
    try {
      console.log('[RiskMetrics] Loading risk metrics for portfolio');
      
      // IMPORTANT: Do NOT run client-side VaR calculations here!
      // VaR values should ONLY come from database via loadLastVaRAnalysis()
      // This prevents showing calculated values before user runs analysis
      
      // Calculate Greeks (if needed for display)
      setGreeks(riskService.calculateGreeks(portfolio));
      
      // Calculate risk metrics (now returns null for metrics without analysis)
      // This will return null values until Python backend analysis is run
      const metrics = await riskService.calculateRiskMetrics(portfolio, true);
      setRiskMetrics(metrics);
      
      console.log('[RiskMetrics] Risk metrics loaded:', {
        hasMetrics: !!metrics,
        volatility: metrics?.volatility,
        sharpe: metrics?.sharpeRatio
      });
    } catch (error) {
      console.error('[RiskMetrics] Error calculating risk metrics:', error);
    }
  };
  
  // Handle portfolio change
  const handlePortfolioChange = async (portfolioId: string) => {
    try {
      setLoading(true);
      const summary = portfolios.find(p => p.id === portfolioId) || null;
      setSelectedPortfolioSummary(summary);
      
      const portfolio = await portfolioService.getPortfolioById(portfolioId);
      if (portfolio) {
        setSelectedPortfolio(portfolio);
        await calculateRiskMetrics(portfolio);
        
        // Analyze portfolio composition for intelligent insights
        try {
          const composition = intelligentStressTestService.analyzePortfolioComposition(portfolio);
          setPortfolioComposition(composition);
        } catch (error) {
          console.error('Error analyzing portfolio composition:', error);
          setPortfolioComposition(null);
        }
        
        // Load last VaR analysis for the newly selected portfolio
        await loadLastVaRAnalysis(portfolioId);
      }
    } catch (error) {
      console.error('Error changing portfolio:', error);
      Alert.alert('Error', 'Failed to load portfolio data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const portfolioSummaries = await portfolioService.getPortfolioSummaries();
      setPortfolios(portfolioSummaries);
      
      if (selectedPortfolio) {
        // Log current prices before refresh
        console.log('Current portfolio prices before refresh:');
        selectedPortfolio.assets.forEach(asset => {
          console.log(`${asset.symbol}: $${asset.price}`);
        });
        
        // Use the new refresh method to get fresh data
        const refreshedPortfolio = await portfolioService.refreshPortfolioPrices(selectedPortfolio);
        
        // Log new prices after refresh
        console.log('Updated portfolio prices after refresh:');
        refreshedPortfolio.assets.forEach(asset => {
          console.log(`${asset.symbol}: $${asset.price}`);
        });
        
        setSelectedPortfolio(refreshedPortfolio);
        await calculateRiskMetrics(refreshedPortfolio);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Modified runPythonVarAnalysis to accept lookbackPeriod
  const runPythonVarAnalysis = async (
    confidenceLevel = analysisConfidence,
    timeHorizon = analysisHorizon,
    numSimulations = analysisSimulations,
    lookbackPeriod = analysisLookbackPeriod
  ) => {
    if (!selectedPortfolio) {
      Alert.alert('Error', 'Please select a portfolio first');
      return;
    }
    
    // We're running a fresh analysis; ensure UI does not treat this as a "previous analysis" state
    setHasLoadedLastAnalysis(false);

    // Store original portfolio value to maintain consistency
    const originalPortfolioValue = selectedPortfolio.assets.reduce(
      (sum, asset) => sum + asset.price * asset.quantity, 
      0
    );
    
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      setRunningPythonAnalysis(true);
      console.log('Running Python VaR analysis for portfolio:', selectedPortfolio.name);
      console.log('API Base URL:', API_BASE);
      
      // First, test server connectivity via shared client
      console.log('🔍 Testing server connectivity...');
      try {
        const hc = await healthCheck(5000);
        console.log('✅ Server health check passed:', hc.data?.status || 'ok');
      } catch (healthError: any) {
        console.error('❌ Server health check failed:', healthError.message);
        throw new Error(`Server is not accessible at ${API_BASE}. Please check if the server is running.`);
      }
      
      // Create an array of all methods to run
      const varMethods = ['parametric', 'historical', 'monte-carlo'];
      const results: Record<string, VaRResults> = {};
      let anyServerSuccess = false;
      
      // Create VaR params with the requested parameters (for fallback calculations)
      const varParams: VaRParams = {
        confidenceLevel,
        timeHorizon,
        numSimulations,
        lookbackPeriod
      };
      
      // Process each method in sequence
      for (const method of varMethods) {
        try {
          const requestData = {
            params: {
              confidenceLevel: confidenceLevel.toString(),
              timeHorizon: timeHorizon.toString(),
              numSimulations: numSimulations.toString(),
              lookbackPeriod: lookbackPeriod.toString(),
              varMethod: method
            },
            portfolio: {
              id: selectedPortfolio.id,
              name: selectedPortfolio.name,
              assets: selectedPortfolio.assets.map(asset => ({
                symbol: asset.symbol, name: asset.name, quantity: asset.quantity, 
                price: asset.price, assetClass: asset.assetClass
              }))
            }
          };
          
            console.log(`Sending request to ${API_BASE}/api/run-var for method: ${method}`);
            console.log('Request data:', JSON.stringify(requestData, null, 2));
          
          // Set timeout to 120 seconds for Python computation (generous for mobile networks)
          const axiosConfig = {
            timeout: 120000, // 120 seconds timeout (generous for mobile networks)
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            // Add retry and network resilience for mobile
            validateStatus: (status) => status < 500, // Don't throw on 4xx errors
            maxRedirects: 3,
            // Enable request body compression
            decompress: true
          };
          
          // Make API call using shared client with retry
          const response = await postWithRetry<any>(`/api/run-var`, requestData, {
            timeout: 120000,
            retries: 2
          });
          
          console.log(`Response received for ${method}:`, response?.success ? 200 : 'non-200');
          
          if (response.success) {
            console.log(`Analysis successful for ${method}, processing results`);
            console.log('Raw response data:', response);
            console.log('Results data:', response.results);
            console.log('Confidence level:', confidenceLevel, 'Type:', typeof confidenceLevel);
            
            // Process server results
            // Server JSON uses numeric keys for var_results; also returns top-level var/cvar and percentages
            const confidenceKey = confidenceLevel.toString();
            const vr = response.results?.var_results || {};
            const vrForKey = vr[confidenceKey] || vr[String(parseFloat(confidenceKey))] || vr[parseFloat(confidenceKey)] || {};
            const pythonResults: VaRResults = {
              portfolioValue: originalPortfolioValue, // Use stored original value
              varValue: Number(response.results?.var ?? vrForKey.var ?? 0),
              varPercentage: Number(response.results?.var_percentage ?? response.results?.varPercentage ?? vrForKey.var_pct ?? 0),
              cvarValue: Number(response.results?.cvar ?? vrForKey.cvar ?? 0),
              cvarPercentage: Number(response.results?.cvar_percentage ?? response.results?.cvarPercentage ?? vrForKey.cvar_pct ?? 0),
              chartImageUrl: response.chartBase64 
                ? `data:image/png;base64,${response.chartBase64}` 
                : (response.chartUrl || undefined),
              parameters: {
                confidenceLevel: confidenceLevel.toString(),
                timeHorizon: timeHorizon,
                lookbackPeriod: lookbackPeriod,
                varMethod: method,
                distribution: method === 'historical' ? 'historical' : 'normal',
                runTimestamp: new Date().toISOString(),
                ...(method === 'monte-carlo' && { numSimulations: numSimulations })
              },
              lastUpdated: new Date(),
              executionTime: {
                start: response.startTime || Date.now(),
                end: response.endTime || Date.now(),
                duration: (response.endTime || Date.now()) - (response.startTime || Date.now())
              }
            };
            
            console.log('Processed results for', method, ':', {
              varValue: pythonResults.varValue,
              varPercentage: pythonResults.varPercentage,
              cvarValue: pythonResults.cvarValue,
              cvarPercentage: pythonResults.cvarPercentage,
              chartImageUrl: pythonResults.chartImageUrl
            });
            
            // Store the result for this method
            results[method] = pythonResults;
            anyServerSuccess = true;
          } else {
            throw new Error(response.error || `Failed to run Python ${method} VaR analysis`);
          }
        } catch (methodError: any) {
          console.error(`Error running Python ${method} VaR analysis:`, methodError);
          console.error('Method error details:', {
            message: methodError?.message,
            response: methodError?.response?.data,
            status: methodError?.response?.status,
            code: methodError?.code,
            timeout: methodError?.code === 'ECONNABORTED' ? 'YES' : 'NO'
          });
          
          // If this is a timeout error, provide helpful debugging info
          if (methodError.code === 'ECONNABORTED' && methodError.message.includes('timeout')) {
            console.log(`⏰ TIMEOUT DETAILS for ${method}:`);
            console.log(`- API Base: ${API_BASE}`);
            console.log(`- Timeout setting: 120 seconds`);
            console.log(`- Backend should complete in ~3 seconds`);
            console.log(`- This suggests a network connectivity issue`);
            console.log(`- Try: Check if server is running on port 3000`);
            console.log(`- Try: Test API manually with: curl ${API_BASE}/api/status`);
          }
          
          // Instead of fallback, show specific error for this method
          throw new Error(`Failed to run Python ${method} VaR analysis: ${methodError.message || 'Unknown error'}`);
        }
      }
      
      // Update all three VAR models with the calculated results
      setVarResults(prev => ({
        ...prev,
        parametric: results['parametric'],
        historical: results['historical'],
        monteCarlo: results['monte-carlo']
      }));
      
      if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Show success message
      Alert.alert('Analysis Complete', '', [{ text: 'OK' }]);
      
      // Force chart refresh to show the latest generated chart
      setChartRefreshTrigger(Date.now());
      
      // Charts are already generated by the main VaR analysis above
      // No need for separate chart generation as it causes URL conflicts
      
    } catch (error: any) {
      console.error('Error in overall VaR analysis process:', error);
      
      if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Map common network errors to user-friendly guidance
      let message = `Error: ${error.message}`;
      if (error.message?.includes('Network Error')) {
        message = 'Network error: Unable to reach the VaR server. Ensure your device and the server are on the same network and the API is running.';
      } else if (error.response?.status >= 500) {
        message = 'Server error: The VaR server encountered an issue. Please try again shortly.';
      } else if (error.code === 'ECONNABORTED') {
        message = 'Timeout: The analysis took too long. Try again with fewer simulations or check server load.';
      }
      Alert.alert('VaR Analysis Failed', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => runPythonVarAnalysis(confidenceLevel, timeHorizon, numSimulations, lookbackPeriod) }
      ]);
    } finally {
      setRunningPythonAnalysis(false);
    }
  };

  // Note: Chart generation is now handled directly by the main VaR analysis
  // No separate chart generation needed as it was causing URL conflicts

  // Handle showing detailed view
  const handleShowDetailView = (viewName: string) => {
    setShowDetailView(viewName);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle close detailed view
  const handleCloseDetailView = () => {
    setShowDetailView(null);
    if (Platform.OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading risk report...</Text>
      </View>
    );
  }

  // Render detailed view
  if (showDetailView) {
    const detailViews: Record<string, React.ReactNode> = {
      varAnalysis: <VaRAnalysisCard 
                     parametricVaR={varResults.parametric} 
                     historicalVaR={varResults.historical} 
                     monteCarloVaR={varResults.monteCarlo}
                     activeVarChart={activeVarChart} 
                     setActiveVarChart={setActiveVarChart} 
                     detailed={true}
                     lookbackPeriod={lookbackPeriod}
                     apiUrl={API_BASE}
                     forceRefresh={chartRefreshTrigger}
                     onRunAnalysis={() => setVarModalVisible(true)}
                     runningPythonAnalysis={runningPythonAnalysis} />,
      timeSeries: <TimeSeriesCard portfolioId={selectedPortfolioSummary?.id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'} detailed={true} riskMetrics={riskMetrics} varResults={varResults.parametric} />,
      benchmark: <BenchmarkCard portfolioId={selectedPortfolioSummary?.id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'} detailed={true} />,
      positionRisk: <PositionRiskCard portfolioId={selectedPortfolioSummary?.id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'} detailed={true}
                     onDrillDown={(symbol) => Alert.alert(`Position Details: ${symbol}`, 
                       `Detailed risk analysis for ${symbol} will be displayed here.`)} />,
    };
    
    const titles: Record<string, string> = {
      varAnalysis: 'Value at Risk Analysis',
      timeSeries: 'Risk Tracking',
      benchmark: 'Benchmark Comparison',
      positionRisk: 'Position Risk Analysis'
    };
    
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleCloseDetailView}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{titles[showDetailView]}</Text>
        </View>
        {detailViews[showDetailView]}
      </View>
    );
  }

  // Render main content
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header with blur effect on scroll */}
      <Animated.View style={[
        styles.headerContainer,
        { shadowOpacity: scrollY.interpolate({inputRange: [0, 20], outputRange: [0, 0.3], extrapolate: 'clamp'}) }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={styles.appTitle}>Risk Report</Text>
          <TouchableOpacity 
            style={styles.refreshPricesButton}
            onPress={async () => {
              setRefreshing(true);
              try {
                if (selectedPortfolio) {
                  // Clear cache and fetch fresh prices
                  const refreshedPortfolio = await portfolioService.refreshPortfolioPrices(selectedPortfolio);
                  setSelectedPortfolio(refreshedPortfolio);
                  await calculateRiskMetrics(refreshedPortfolio);
                  Alert.alert('Prices Updated', 'Portfolio has been updated with real-time market data.', [{ text: 'OK' }]);
                }
              } catch (error) {
                console.error('Error refreshing prices:', error);
                Alert.alert('Update Failed', 'Unable to refresh prices. Please try again.', [{ text: 'OK' }]);
              } finally {
                setRefreshing(false);
              }
            }}
            disabled={refreshing}
          >
            <Ionicons name={refreshing ? "sync" : "refresh"} size={20} color="#007AFF" style={refreshing ? { opacity: 0.5 } : undefined} />
          </TouchableOpacity>
        </View>
        <PortfolioSelector portfolios={portfolios} selectedPortfolioId={selectedPortfolioSummary?.id || ''}
          onSelectPortfolio={handlePortfolioChange} />
      </Animated.View>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Risk Overview */}
        <RiskOverview
          riskMetrics={riskMetrics}
          parametricVaR={varResults.parametric}
          selectedPortfolioSummary={selectedPortfolioSummary}
          runningPythonAnalysis={runningPythonAnalysis}
          runPythonVarAnalysis={runPythonVarAnalysis}
          onRunAnalysis={() => setVarModalVisible(true)}
        />

        {/* Portfolio Composition Analysis */}
        <PortfolioCompositionCard 
          composition={portfolioComposition}
          onViewMore={() => Alert.alert('Coming Soon', 'Detailed portfolio composition analysis will be available soon.')}
        />

        {/* Value Risk Analysis */}
        <VaRAnalysisCard
          parametricVaR={varResults.parametric}
          historicalVaR={varResults.historical}
          monteCarloVaR={varResults.monteCarlo}
          activeVarChart={activeVarChart}
          setActiveVarChart={setActiveVarChart}
          apiUrl={API_BASE}
          forceRefresh={chartRefreshTrigger}
          onRunAnalysis={() => setVarModalVisible(true)}
          runningPythonAnalysis={runningPythonAnalysis}
          hasLoadedLastAnalysis={hasLoadedLastAnalysis}
          selectedPortfolioName={selectedPortfolioSummary?.name}
        />

        {/* Portfolio Risk Analysis */}
        <PositionRiskCard
          portfolioId={selectedPortfolioSummary?.id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'}
          onViewMore={() => handleShowDetailView('positionRisk')}
          onDrillDown={(symbol) => Alert.alert(`Position Details: ${symbol}`, `Detailed risk analysis for ${symbol} will be displayed here.`)}
          overallVarPercentage={
            activeVarChart === 'parametric' ? varResults.parametric?.varPercentage :
            activeVarChart === 'historical' ? varResults.historical?.varPercentage :
            activeVarChart === 'montecarlo' ? varResults.monteCarlo?.varPercentage : undefined
          }
          overallVarValue={
            activeVarChart === 'parametric' ? varResults.parametric?.varValue :
            activeVarChart === 'historical' ? varResults.historical?.varValue :
            activeVarChart === 'montecarlo' ? varResults.monteCarlo?.varValue : undefined
          }
        />

        {/* Risk Tracking Graph Section */}
        {selectedPortfolioSummary && (
          <TimeSeriesCard
            portfolioId={selectedPortfolioSummary.id}
            onViewMore={() => handleShowDetailView('timeSeries')}
            riskMetrics={riskMetrics}
            varResults={varResults.parametric}
          />
        )}

        {/* Risk Monitoring */}
        <RiskTracker
          riskMetrics={riskMetrics}
          varResults={varResults.parametric}
          portfolioValue={selectedPortfolioSummary?.totalValue || 0}
          portfolioId={selectedPortfolioSummary?.id}
          onEditThresholds={() => setSettingsModalVisible(true)}
        />

        {/* Backtesting (before Benchmark Comparison) */}
        <BacktestCard portfolio={selectedPortfolio} />

        {/* Benchmark Comparison */}
        <BenchmarkCard
          portfolioId={selectedPortfolioSummary?.id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'}
          onViewMore={() => handleShowDetailView('benchmark')}
        />

        {/* Export Tools */}
        <ExportToolsCard
          portfolioId={selectedPortfolioSummary?.id || 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'}
          reportType="risk-report"
          titlePrefix={`Risk Report - ${selectedPortfolioSummary?.name || 'Portfolio'}`}
        />
      </ScrollView>

      {/* VarAnalysisModal */}
      <VarAnalysisModal
        visible={varModalVisible}
        onClose={() => setVarModalVisible(false)}
        onRun={(confidence, horizon, numSimulations, lookbackPeriod) => {
          setVarModalVisible(false);
          setAnalysisConfidence(confidence);
          setAnalysisHorizon(horizon);
          setAnalysisSimulations(numSimulations);
          setAnalysisLookbackPeriod(lookbackPeriod);
          runPythonVarAnalysis(confidence, horizon, numSimulations, lookbackPeriod);
        }}
        defaultConfidence={analysisConfidence}
        defaultHorizon={analysisHorizon}
        defaultSimulations={analysisSimulations}
        defaultLookbackPeriod={analysisLookbackPeriod}
      />

      {/* Risk Settings Modal */}
      {selectedPortfolioSummary && (
        <PortfolioRiskSettings
          visible={settingsModalVisible}
          onClose={() => setSettingsModalVisible(false)}
          portfolioId={selectedPortfolioSummary.id}
          portfolioName={selectedPortfolioSummary.name}
          onUpdate={async () => {
            // reload selected portfolio to sync riskProfile locally
            if (selectedPortfolioSummary?.id) {
              const p = await portfolioService.getPortfolioById(selectedPortfolioSummary.id);
              if (p) setSelectedPortfolio(p);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  headerContainer: {
    backgroundColor: 'rgba(245, 245, 247, 0.98)', paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 10, paddingHorizontal: SPACING.screenPadding, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3, zIndex: 100,
  },
  appTitle: { fontSize: 28, fontWeight: '700', color: '#000', marginBottom: SPACING.md },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.screenPadding, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F7' },
  loadingText: { marginTop: SPACING.md, fontSize: 16, color: '#8E8E93' },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: 15, paddingHorizontal: SPACING.screenPadding, backgroundColor: '#F5F5F7',
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backButtonText: { fontSize: 17, color: '#007AFF', marginLeft: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#000', textAlign: 'center', marginRight: 40 },
  contentContainer: { paddingBottom: 40 },
  refreshPricesButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  // Portfolio Composition Card Styles
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: SPACING.screenPadding,
    marginVertical: SPACING.sm,
    borderRadius: 12,
    padding: SPACING.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  compositionPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  placeholderText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  compositionContent: {
    gap: SPACING.md,
  },
  compositionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  assetClassBreakdown: {
    gap: SPACING.sm,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: SPACING.sm,
  },
  assetClassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  assetClassInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assetClassDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  assetClassName: {
    fontSize: 14,
    color: '#334155',
  },
  assetClassMetrics: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  assetClassWeight: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  intelligentInsights: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  insightText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
});

export default RiskReportScreen; 