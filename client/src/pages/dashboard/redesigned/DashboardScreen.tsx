import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl,
  Animated,
  StatusBar,
  Platform,
  Modal,
  Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../../hooks/use-auth';

// Import state persistence
import { usePersistentState } from '../../../hooks/use-screen-state';

// Import services
import { getAllPortfolios, getPortfoliosWithPrices } from '../../../services/portfolioService';
import allocationService from '../../../services/allocationService';
import { calculatePortfolioRisk, getRiskBreakdown } from '../../../services/riskService';
import scenarioService from '../../../services/scenarioService';
import { getSecurityPrice } from '../../../services/marketDataService';
import riskTrackingService from '../../../services/riskTrackingService';

// Import components
import LiveMarketIndicators from '../../../components/ui/LiveMarketIndicators';
import ScenarioDetailsModal, { ScenarioRunData } from '../../../components/ui/ScenarioDetailsModal';
import PortfolioRiskSettings from '../../../components/ui/PortfolioRiskSettings';

// Define types
interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  assets?: Array<{
    symbol: string;
    name: string;
    quantity: number;
    price: number;
    sector?: string;
  }>;
}

interface RiskMetric {
  name: string;
  portfolioId: string;
  value: number;
  limit: number;
  unit: string;
  totalValue: number;
}

interface ScenarioResult {
  id: string;
  name: string;
  portfolioName: string;
  impactValue: number;
  runDate: string;
}

interface PerformanceData {
  portfolioId: string;
  portfolioName: string;
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  timeframe: string;
}

interface AssetAllocation {
  sector: string;
  percentage: number;
  value: number;
  color: string;
}

interface GeographicAllocation {
  region: string;
  percentage: number;
  value: number;
  color: string;
}

interface MarketCapAllocation {
  marketCap: string;
  percentage: number;
  value: number;
  color: string;
}

interface RiskInsight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  action?: string;
}

export default function DashboardScreen() {
  // Auth context
  const { user } = useAuth();
  
  // State variables
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [topRisks, setTopRisks] = useState<RiskMetric[]>([]);
  const [recentScenarios, setRecentScenarios] = useState<ScenarioResult[]>([]);
  const [riskBudgetUsage, setRiskBudgetUsage] = useState(0);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [assetAllocation, setAssetAllocation] = useState<AssetAllocation[]>([]);
  const [geographicAllocation, setGeographicAllocation] = useState<GeographicAllocation[]>([]);
  const [marketCapAllocation, setMarketCapAllocation] = useState<MarketCapAllocation[]>([]);
  const [allocationView, setAllocationView] = usePersistentState<'sector' | 'geographic' | 'marketCap'>('DashboardScreen', 'allocationView', 'sector');
  const [riskInsights, setRiskInsights] = useState<RiskInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [selectedPortfolioForSettings, setSelectedPortfolioForSettings] = useState<{ id: string; name: string } | null>(null);
  const [scenarioDetailsVisible, setScenarioDetailsVisible] = useState(false);
  const [selectedScenarioRun, setSelectedScenarioRun] = useState<ScenarioRunData | null>(null);
  const [scrollPosition, setScrollPosition] = usePersistentState<number>('DashboardScreen', 'scrollPosition', 0);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverContent, setPopoverContent] = useState<{ title: string; contributions: { portfolioName: string; value: number }[] } | null>(null);
  
  // Correlation Grid Enhanced State
  const [correlationTimePeriod, setCorrelationTimePeriod] = usePersistentState<'1M' | '3M' | '6M' | '1Y' | '3Y'>('DashboardScreen', 'correlationTimePeriod', '1Y');
  const [portfolioCorrelations, setPortfolioCorrelations] = useState<Record<string, number>>({});
  const [correlationInsights, setCorrelationInsights] = useState<string[]>([]);
  const [selectedCorrelationCell, setSelectedCorrelationCell] = useState<{i: number, j: number} | null>(null);
  const [correlationDetailModalVisible, setCorrelationDetailModalVisible] = useState(false);
  const [correlationTrendData, setCorrelationTrendData] = useState<Record<string, number[]>>({});
  const [correlationInfoModalVisible, setCorrelationInfoModalVisible] = useState(false);
  const navigation = useNavigation();
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const popoverAnchorRef = useRef<View | null>(null);
  
  // Animations
  const scrollY = new Animated.Value(0);
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  // Set greeting based on time of day and user name
  useEffect(() => {
    const currentHour = new Date().getHours();
    let timeBasedGreeting = '';
    
    if (currentHour < 12) {
      timeBasedGreeting = 'Good morning';
    } else if (currentHour < 18) {
      timeBasedGreeting = 'Good afternoon';
    } else {
      timeBasedGreeting = 'Good evening';
    }
    
    // Get user's first name for personalization
    const firstName = user?.fullName ? user.fullName.split(' ')[0] : null;
    const personalizedGreeting = firstName 
      ? `${timeBasedGreeting}, ${firstName}!`
      : timeBasedGreeting;
    
    setGreeting(personalizedGreeting);
  }, [user]);

  // Restore scroll position when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        if (scrollViewRef.current && scrollPosition > 0) {
          scrollViewRef.current.scrollTo({ y: scrollPosition, animated: false });
        }
      }, 100); // Small delay to ensure view is ready

      return () => clearTimeout(timer);
    }, [scrollPosition])
  );
  
  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load portfolio summaries for top-level cards
      const portfolioData = await getAllPortfolios();
      setPortfolios(portfolioData.slice(0, 3)); // Top 3 portfolios

      // Load full portfolios with assets for allocation calculations
      const fullPortfolios = await getPortfoliosWithPrices();
      
      // Calculate risk metrics for each portfolio
      const riskMetrics: RiskMetric[] = [];
      let totalRisk = 0;
      let totalLimit = 0;
      
      for (const portfolio of portfolioData) {
        const riskData = await calculatePortfolioRisk(portfolio.id);
  
        // Add key metrics to the list
        if (riskData.var) {
          riskMetrics.push({
            name: portfolio.name,
            portfolioId: portfolio.id,
            value: riskData.var,
            limit: riskData.varLimit || riskData.var * 1.5,
            unit: '%',
            totalValue: portfolio.totalValue
          });
          
          totalRisk += riskData.var;
          totalLimit += riskData.varLimit || riskData.var * 1.5;
        }
      }
      
      // Calculate overall risk budget usage
      setRiskBudgetUsage(totalRisk / totalLimit);
      
      // Sort risk metrics by usage percentage (highest usage first)
      riskMetrics.sort((a, b) => (b.value / b.limit) - (a.value / a.limit));
      setTopRisks(riskMetrics); // Show all portfolios
      
      // Get recent scenarios
      const scenarioResults = await scenarioService.getRecentScenarios();
      setRecentScenarios(scenarioResults.slice(0, 3)); // Top 3 recent scenarios
      
      // Load additional dashboard data
      const contributionPromise = allocationService.computeContributionBreakdown(fullPortfolios as any);
      await Promise.all([
        loadPerformanceData(portfolioData),
        loadAssetAllocation(fullPortfolios as any),
        loadGeographicAllocation(fullPortfolios as any),
        loadMarketCapAllocation(fullPortfolios as any),
        loadRiskInsights(portfolioData, riskMetrics),
        loadCorrelationData(portfolioData) // Load correlation data
      ]);
      const contributions = await contributionPromise;
      setContributionData(contributions);
      
      setIsLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  const [contributionData, setContributionData] = useState<{ 
    sectors: Record<string, { portfolioId: string; portfolioName: string; value: number }[]>;
    regions: Record<string, { portfolioId: string; portfolioName: string; value: number }[]>;
    marketCaps: Record<string, { portfolioId: string; portfolioName: string; value: number }[]>;
  } | null>(null);

  const openContributionPopover = (title: string, items: { portfolioName: string; value: number }[]) => {
    setPopoverContent({ title, contributions: items });
    setPopoverVisible(true);
  };

  // Load performance data
  const loadPerformanceData = async (portfolioData: Portfolio[]) => {
    try {
      const performanceResults: PerformanceData[] = [];
      
      for (const portfolio of portfolioData.slice(0, 3)) {
        // In a real app, you'd fetch historical data
        // For now, we'll use mock data with some realistic variations
        const mockPreviousValue = portfolio.totalValue * (0.95 + Math.random() * 0.1);
        const change = portfolio.totalValue - mockPreviousValue;
        const changePercent = (change / mockPreviousValue) * 100;
        
        performanceResults.push({
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          currentValue: portfolio.totalValue,
          previousValue: mockPreviousValue,
          change,
          changePercent,
          timeframe: '1M'
        });
      }
      
      setPerformanceData(performanceResults);
    } catch (error) {
      console.error('Error loading performance data:', error);
      setPerformanceData([]);
    }
  };

  // Load asset allocation
  const loadAssetAllocation = async (portfolioData: Portfolio[]) => {
    try {
      const allAgg = await allocationService.computeAllAggregations(portfolioData as any);
      const sectors = allAgg.sectors
        .map(s => ({ sector: s.name, percentage: s.percentage, value: s.value, color: s.color }))
        .sort((a, b) => b.percentage - a.percentage);
      setAssetAllocation(sectors.slice(0, 6));
    } catch (error) {
      console.error('Error loading asset allocation:', error);
      setAssetAllocation([]);
    }
  };

  // Load geographic allocation
  const loadGeographicAllocation = async (portfolioData: Portfolio[]) => {
    try {
      const allAgg = await allocationService.computeAllAggregations(portfolioData as any);
      const regions = allAgg.regions
        .map(r => ({ region: r.name, percentage: r.percentage, value: r.value, color: r.color }))
        .sort((a, b) => b.percentage - a.percentage);
      setGeographicAllocation(regions);
    } catch (error) {
      console.error('Error loading geographic allocation:', error);
      setGeographicAllocation([]);
    }
  };

  // Load market cap allocation
  const loadMarketCapAllocation = async (portfolioData: Portfolio[]) => {
    try {
      const allAgg = await allocationService.computeAllAggregations(portfolioData as any);
      const caps = allAgg.marketCaps
        .map(m => ({ marketCap: m.name, percentage: m.percentage, value: m.value, color: m.color }))
        .sort((a, b) => b.percentage - a.percentage);
      setMarketCapAllocation(caps);
    } catch (error) {
      console.error('Error loading market cap allocation:', error);
      setMarketCapAllocation([]);
    }
  };

  // Load risk insights
  const loadRiskInsights = async (portfolioData: Portfolio[], riskMetrics: RiskMetric[]) => {
    try {
      const insights: RiskInsight[] = [];
      
      // Analyze risk metrics for insights
      const highRiskPortfolios = riskMetrics.filter(risk => (risk.value / risk.limit) > 0.8);
      const moderateRiskPortfolios = riskMetrics.filter(risk => (risk.value / risk.limit) > 0.6 && (risk.value / risk.limit) <= 0.8);
      
      if (highRiskPortfolios.length > 0) {
        insights.push({
          type: 'warning',
          title: 'High Risk Alert',
          description: `${highRiskPortfolios.length} portfolio${highRiskPortfolios.length > 1 ? 's' : ''} approaching risk limits`,
          action: 'Review Risk Settings'
        });
      }
      
      if (moderateRiskPortfolios.length > 0) {
        insights.push({
          type: 'info',
          title: 'Moderate Risk Exposure',
          description: `${moderateRiskPortfolios.length} portfolio${moderateRiskPortfolios.length > 1 ? 's' : ''} at moderate risk levels`,
          action: 'Monitor Closely'
        });
      }
      
      // Diversification insight
      const topSectorPercentage = assetAllocation[0]?.percentage || 0;
      if (topSectorPercentage > 40) {
        insights.push({
          type: 'warning',
          title: 'Concentration Risk',
          description: `${topSectorPercentage.toFixed(2)}% exposure to ${assetAllocation[0]?.sector}`,
          action: 'Consider Diversification'
        });
      }
      
      setRiskInsights(insights.slice(0, 3)); // Top 3 insights
    } catch (error) {
      console.error('Error loading risk insights:', error);
      setRiskInsights([]);
    }
  };

  // Load data on component mount and when screen comes into focus
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Reload correlation data when time period changes
  useEffect(() => {
    if (portfolios.length > 0) {
      loadCorrelationData(portfolios);
    }
  }, [correlationTimePeriod]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    loadDashboardData();
  }, []);
  
  // Navigation functions
  const navigateToRiskReport = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    navigation.navigate('Risk Report' as never);
  };

  const navigateToPortfolio = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    navigation.navigate('Portfolio' as never);
  };
  
  const navigateToScenarios = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    navigation.navigate('Scenarios' as never);
  };

  // Handle scenario details modal
  const openScenarioDetails = (scenario: ScenarioResult) => {
    // Convert ScenarioResult to ScenarioRunData format
    const scenarioRunData: ScenarioRunData = {
      id: scenario.id,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      date: scenario.runDate.split(' ')[0] || new Date().toLocaleDateString(),
      time: scenario.runDate.split(' ')[1] || new Date().toLocaleTimeString(),
      portfolioId: 'unknown', // We don't have this in the current data
      portfolioName: scenario.portfolioName,
      portfolioValue: 1000000, // Mock value
      impact: scenario.impactValue,
      impactValue: scenario.impactValue * 10000, // Convert percentage to dollar amount
      assetClassImpacts: {
        equities: scenario.impactValue * 0.7,
        bonds: scenario.impactValue * 0.2,
        alternatives: scenario.impactValue * 0.1,
      },
      factorAttribution: {
        equity: scenario.impactValue * 5000,
        rates: scenario.impactValue * 2000,
        credit: scenario.impactValue * 1500,
        fx: scenario.impactValue * 1000,
        commodity: scenario.impactValue * 500,
      },
      greeksBefore: {
        delta: 0.65,
        gamma: 0.12,
        theta: -0.08,
        vega: 0.25,
        rho: 0.18,
      },
      greeksAfter: {
        delta: 0.65 + (scenario.impactValue * 0.01),
        gamma: 0.12 + (scenario.impactValue * 0.005),
        theta: -0.08 + (scenario.impactValue * 0.002),
        vega: 0.25 + (scenario.impactValue * 0.008),
        rho: 0.18 + (scenario.impactValue * 0.003),
      },
    };

    setSelectedScenarioRun(scenarioRunData);
    setScenarioDetailsVisible(true);
  };

  const closeScenarioDetails = () => {
    setScenarioDetailsVisible(false);
    setSelectedScenarioRun(null);
  };

  const handleRunScenarioAgain = (scenarioRun: ScenarioRunData) => {
    // Close modal and navigate to scenarios
    closeScenarioDetails();
    navigateToScenarios();
  };

  const openPortfolioSettings = (portfolioId: string, portfolioName: string) => {
    setSelectedPortfolioForSettings({ id: portfolioId, name: portfolioName });
    setSettingsModalVisible(true);
  };

  const closePortfolioSettings = () => {
    setSettingsModalVisible(false);
    setSelectedPortfolioForSettings(null);
  };

  const handleSettingsUpdate = () => {
    // Refresh dashboard data after settings update
    loadDashboardData();
  };

  // Helper functions
  const getMockSectorAllocation = (portfolioValue: number): Array<{name: string, value: number, color: string}> => {
    const sectors = [
      { name: 'Technology', percentage: 0.28, color: '#007AFF' },
      { name: 'Healthcare', percentage: 0.18, color: '#34C759' },
      { name: 'Financial Services', percentage: 0.15, color: '#FF9500' },
      { name: 'Consumer Cyclical', percentage: 0.12, color: '#FF3B30' },
      { name: 'Communication Services', percentage: 0.10, color: '#AF52DE' },
      { name: 'Industrials', percentage: 0.08, color: '#FF2D92' },
      { name: 'Consumer Defensive', percentage: 0.06, color: '#5AC8FA' },
      { name: 'Energy', percentage: 0.03, color: '#FFCC00' }
    ];
    
    return sectors.map(sector => ({
      name: sector.name,
      value: portfolioValue * sector.percentage,
      color: sector.color
    }));
  };

  const getMockGeographicAllocation = (portfolioValue: number): Array<{name: string, value: number, color: string}> => {
    const regions = [
      { name: 'United States', percentage: 0.55, color: '#007AFF' },
      { name: 'Europe', percentage: 0.18, color: '#34C759' },
      { name: 'Asia Pacific', percentage: 0.15, color: '#FF9500' },
      { name: 'Emerging Markets', percentage: 0.08, color: '#FF3B30' },
      { name: 'Canada', percentage: 0.04, color: '#AF52DE' }
    ];
    
    return regions.map(region => ({
      name: region.name,
      value: portfolioValue * region.percentage,
      color: region.color
    }));
  };

  const getMockMarketCapAllocation = (portfolioValue: number): Array<{name: string, value: number, color: string}> => {
    const marketCaps = [
      { name: 'Large Cap', percentage: 0.70, color: '#007AFF' },
      { name: 'Mid Cap', percentage: 0.20, color: '#34C759' },
      { name: 'Small Cap', percentage: 0.10, color: '#FF9500' }
    ];
    
    return marketCaps.map(cap => ({
      name: cap.name,
      value: portfolioValue * cap.percentage,
      color: cap.color
    }));
  };
  
  // Enhanced correlation matrix functions
  const getTopWorldIndices = () => {
    return [
      { symbol: 'SPX', name: 'S&P 500', region: 'US' },
      { symbol: 'FTSE', name: 'FTSE 100', region: 'UK' },
      { symbol: 'N225', name: 'Nikkei 225', region: 'Japan' },
      { symbol: 'DAX', name: 'DAX', region: 'Germany' },
      { symbol: 'CAC', name: 'CAC 40', region: 'France' },
      { symbol: 'HSI', name: 'Hang Seng', region: 'Hong Kong' }
    ];
  };

  // Time period based correlation matrices
  const getCorrelationMatrixByPeriod = (period: '1M' | '3M' | '6M' | '1Y' | '3Y') => {
    const matrices = {
      '1M': [
        [1.00, 0.71, 0.58, 0.75, 0.72, 0.64],
        [0.71, 1.00, 0.55, 0.68, 0.66, 0.61],
        [0.58, 0.55, 1.00, 0.51, 0.48, 0.77],
        [0.75, 0.68, 0.51, 1.00, 0.82, 0.56],
        [0.72, 0.66, 0.48, 0.82, 1.00, 0.54],
        [0.64, 0.61, 0.77, 0.56, 0.54, 1.00]
      ],
      '3M': [
        [1.00, 0.75, 0.62, 0.79, 0.76, 0.68],
        [0.75, 1.00, 0.59, 0.72, 0.70, 0.65],
        [0.62, 0.59, 1.00, 0.55, 0.52, 0.81],
        [0.79, 0.72, 0.55, 1.00, 0.86, 0.60],
        [0.76, 0.70, 0.52, 0.86, 1.00, 0.58],
        [0.68, 0.65, 0.81, 0.60, 0.58, 1.00]
      ],
      '6M': [
        [1.00, 0.76, 0.63, 0.80, 0.77, 0.69],
        [0.76, 1.00, 0.60, 0.73, 0.71, 0.66],
        [0.63, 0.60, 1.00, 0.56, 0.53, 0.82],
        [0.80, 0.73, 0.56, 1.00, 0.87, 0.61],
        [0.77, 0.71, 0.53, 0.87, 1.00, 0.59],
        [0.69, 0.66, 0.82, 0.61, 0.59, 1.00]
      ],
      '1Y': [
        [1.00, 0.78, 0.65, 0.82, 0.79, 0.71],
        [0.78, 1.00, 0.62, 0.75, 0.73, 0.68],
        [0.65, 0.62, 1.00, 0.58, 0.55, 0.84],
        [0.82, 0.75, 0.58, 1.00, 0.89, 0.63],
        [0.79, 0.73, 0.55, 0.89, 1.00, 0.61],
        [0.71, 0.68, 0.84, 0.63, 0.61, 1.00]
      ],
      '3Y': [
        [1.00, 0.82, 0.68, 0.85, 0.82, 0.74],
        [0.82, 1.00, 0.65, 0.78, 0.76, 0.71],
        [0.68, 0.65, 1.00, 0.61, 0.58, 0.87],
        [0.85, 0.78, 0.61, 1.00, 0.92, 0.66],
        [0.82, 0.76, 0.58, 0.92, 1.00, 0.64],
        [0.74, 0.71, 0.87, 0.66, 0.64, 1.00]
      ]
    };
    return matrices[period] || matrices['1Y'];
  };

  const getCorrelationValue = (i: number, j: number): number => {
    const matrix = getCorrelationMatrixByPeriod(correlationTimePeriod);
    return matrix[i][j];
  };

  const getCorrelationColor = (value: number): string => {
    if (value >= 0.85) return '#1E40AF'; // Deep Blue - Very strong positive
    if (value >= 0.7) return '#3B82F6'; // Blue - Strong positive
    if (value >= 0.55) return '#10B981'; // Green - Moderate positive
    if (value >= 0.4) return '#F59E0B'; // Amber - Weak positive
    if (value >= 0.2) return '#E5E7EB'; // Light Gray - Very weak positive
    if (value >= 0.0) return '#F3F4F6'; // Lighter Gray - Neutral
    if (value >= -0.2) return '#FEF3C7'; // Light Yellow - Very weak negative
    if (value >= -0.4) return '#FBBF24'; // Yellow - Weak negative
    if (value >= -0.55) return '#F97316'; // Orange - Moderate negative
    if (value >= -0.7) return '#DC2626'; // Red - Strong negative
    return '#991B1B'; // Dark Red - Very strong negative
  };

  const getCorrelationTextColor = (value: number): string => {
    // Use white text for darker backgrounds, black for lighter ones
    if (value >= 0.85 || value <= -0.55) return '#FFFFFF'; // White for dark backgrounds
    if (value >= 0.2 && value <= 0.4) return '#000000'; // Black for light backgrounds
    return '#000000'; // Black for most other cases
  };

  const getCorrelationInterpretation = (value: number): string => {
    if (value >= 0.9) return 'Very strong positive correlation - these indices move almost identically. Diversification benefits are minimal.';
    if (value >= 0.7) return 'Strong positive correlation - these indices generally move in the same direction with high consistency.';
    if (value >= 0.5) return 'Moderate positive correlation - these indices show some tendency to move together but with meaningful differences.';
    if (value >= 0.3) return 'Weak positive correlation - these indices occasionally move together but often diverge significantly.';
    if (value >= 0.1) return 'Very weak positive correlation - these indices show minimal relationship in their movements.';
    if (value >= -0.1) return 'No meaningful correlation - these indices move independently of each other.';
    if (value >= -0.3) return 'Weak negative correlation - these indices occasionally move in opposite directions.';
    if (value >= -0.5) return 'Moderate negative correlation - these indices often move in opposite directions, providing diversification benefits.';
    if (value >= -0.7) return 'Strong negative correlation - these indices consistently move in opposite directions, excellent for diversification.';
    return 'Very strong negative correlation - these indices move almost perfectly in opposite directions, providing maximum diversification benefits.';
  };

  // Calculate portfolio correlations with world indices
  const calculatePortfolioCorrelations = async (portfolioData: Portfolio[]) => {
    const correlations: Record<string, number> = {};
    const indices = getTopWorldIndices();
    
    for (const portfolio of portfolioData) {
      // Mock calculation based on portfolio composition
      let portfolioCorrelation = 0;
      let totalValue = 0;
      
      if (portfolio.assets) {
        for (const asset of portfolio.assets) {
          const assetValue = asset.price * asset.quantity;
          totalValue += assetValue;
          
          // Estimate correlation based on asset class and geography
          let assetCorrelation = 0.65; // Default correlation
          
          if (asset.sector === 'Technology') assetCorrelation = 0.78;
          else if (asset.sector === 'Healthcare') assetCorrelation = 0.62;
          else if (asset.sector === 'Financial Services') assetCorrelation = 0.71;
          
          portfolioCorrelation += assetCorrelation * assetValue;
        }
        
        portfolioCorrelation = totalValue > 0 ? portfolioCorrelation / totalValue : 0.65;
      }
      
      correlations[portfolio.id] = portfolioCorrelation;
    }
    
    return correlations;
  };

  // Generate correlation insights
  const generateCorrelationInsights = (matrix: number[][], portfolioCorr: Record<string, number>) => {
    const insights: string[] = [];
    const indices = getTopWorldIndices();
    
    // Find highest correlation pair
    let maxCorr = 0;
    let maxPair = '';
    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        if (matrix[i][j] > maxCorr && i !== j) {
          maxCorr = matrix[i][j];
          maxPair = `${indices[i].symbol} and ${indices[j].symbol}`;
        }
      }
    }
    
    if (maxCorr > 0.85) {
      insights.push(`High correlation (${maxCorr.toFixed(2)}) between ${maxPair} indicates limited diversification benefit`);
    }
    
    // Portfolio specific insights
    const avgPortfolioCorr = Object.values(portfolioCorr).reduce((a, b) => a + b, 0) / Object.values(portfolioCorr).length;
    if (avgPortfolioCorr > 0.8) {
      insights.push('Your portfolios show high correlation with global indices - consider alternative assets');
    } else if (avgPortfolioCorr < 0.5) {
      insights.push('Your portfolios show good diversification relative to major indices');
    }
    
    // Time period specific insights
    if (correlationTimePeriod === '1M') {
      insights.push('Short-term correlations can be more volatile due to market sentiment');
    } else if (correlationTimePeriod === '3Y') {
      insights.push('Long-term correlations show structural market relationships');
    }
    
    return insights;
  };

  // Generate trend data for mini charts
  const generateTrendData = (baseCorr: number): number[] => {
    const data: number[] = [];
    let current = baseCorr;
    
    for (let i = 0; i < 30; i++) {
      current += (Math.random() - 0.5) * 0.1;
      current = Math.max(0, Math.min(1, current)); // Clamp between 0 and 1
      data.push(current);
    }
    
    return data;
  };

  // Event handlers for interactive features
  const handleCorrelationCellPress = (i: number, j: number) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    setSelectedCorrelationCell({ i, j });
    setCorrelationDetailModalVisible(true);
  };

  const handleTimePeriodChange = (period: '1M' | '3M' | '6M' | '1Y' | '3Y') => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    setCorrelationTimePeriod(period);
    // Reload correlation data with new period
    loadCorrelationData(portfolios);
  };

  const closeCorrelationDetailModal = () => {
    setCorrelationDetailModalVisible(false);
    setSelectedCorrelationCell(null);
  };

  const openCorrelationInfoModal = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    setCorrelationInfoModalVisible(true);
  };

  const closeCorrelationInfoModal = () => {
    setCorrelationInfoModalVisible(false);
  };

  // Mini Chart Component
  const MiniChart = ({ data, width = 50, height = 20 }: { data: number[], width?: number, height?: number }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue;
    
    const pathData = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    
    return (
      <Svg width={width} height={height} style={{ marginLeft: 8 }}>
        <Path
          d={pathData}
          stroke="#10B981"
          strokeWidth="1.5"
          fill="none"
        />
      </Svg>
    );
  };

  // Load correlation data including portfolio analysis
  const loadCorrelationData = async (portfolioData: Portfolio[]) => {
    try {
      const portfolioCorr = await calculatePortfolioCorrelations(portfolioData);
      setPortfolioCorrelations(portfolioCorr);
      
      const matrix = getCorrelationMatrixByPeriod(correlationTimePeriod);
      const insights = generateCorrelationInsights(matrix, portfolioCorr);
      setCorrelationInsights(insights);
      
      // Generate trend data for each index pair
      const trendData: Record<string, number[]> = {};
      const indices = getTopWorldIndices();
      indices.forEach((index, i) => {
        trendData[index.symbol] = generateTrendData(matrix[i][i]);
      });
      setCorrelationTrendData(trendData);
      
    } catch (error) {
      console.error('Error loading correlation data:', error);
      setCorrelationInsights(['Unable to load correlation insights']);
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="chart-timeline-variant" size={48} color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Animated header */}
      <Animated.View style={[styles.animatedHeader, { opacity: headerOpacity }]}>
        <BlurView intensity={90} tint="light" style={styles.blurView}>
          <Text style={styles.headerTitle}>Risk Dashboard</Text>
        </BlurView>
      </Animated.View>
      
      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { 
            useNativeDriver: false,
            listener: (event: any) => {
              setScrollPosition(event.nativeEvent.contentOffset.y);
            }
          }
        )}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#007AFF" 
          />
        }
      >
        {/* Header with greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.headerTitle}>Risk Dashboard</Text>
          </View>
          {popoverContent && popoverVisible && (
            <Modal transparent visible={popoverVisible} animationType="fade" onRequestClose={() => setPopoverVisible(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '90%', maxWidth: 360 }}>
                  <Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 8 }}>{popoverContent.title} — Top Contributors</Text>
                  {popoverContent.contributions.map((c, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 }}>
                      <Text style={{ color: '#334155' }}>{c.portfolioName}</Text>
                      <Text style={{ color: '#334155' }}>${Math.round(c.value).toLocaleString()}</Text>
                    </View>
                  ))}
                  <TouchableOpacity style={{ marginTop: 12, alignSelf: 'flex-end' }} onPress={() => setPopoverVisible(false)}>
                    <Text style={{ color: '#3b82f6', fontWeight: '600' }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}
        </View>

        {/* Live Market Indicators */}
        <LiveMarketIndicators />

        {/* Risk Budget Usage Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Risk Budget Usage</Text>
          <TouchableOpacity onPress={navigateToRiskReport} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* Risk Budget Usage & Portfolio Breakdown */}
        <View style={styles.card}>
          
          {/* Overall Risk Budget Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gauge}>
              <View 
                style={[
                  styles.gaugeProgress,
                  { 
                    width: `${riskBudgetUsage * 100}%`,
                    backgroundColor: '#000000' // Changed to black
                  }
                ]} 
              />
            </View>
            <View style={styles.gaugeLabels}>
              <View style={styles.gaugeLabel}>
                <Text style={styles.gaugeLabelText}>{(riskBudgetUsage * 100).toFixed(1)}%</Text>
                <Text style={styles.gaugeLabelSubtext}>Used</Text>
              </View>
              <View style={styles.gaugeLabel}>
                <Text style={styles.gaugeLabelText}>{((1 - riskBudgetUsage) * 100).toFixed(1)}%</Text>
                <Text style={styles.gaugeLabelSubtext}>Available</Text>
              </View>
            </View>
          </View>

          {/* Portfolio Risk Breakdown */}
          {topRisks.length > 0 && (
            <View style={styles.portfolioBreakdownContainer}>
              <Text style={styles.portfolioBreakdownTitle}>Portfolio Breakdown</Text>
              {topRisks.map((risk, index) => (
                <View key={risk.portfolioId} style={[styles.riskMetricItem, index < topRisks.length - 1 && styles.riskMetricItemBorder]}>
                  <View style={styles.riskMetricHeader}>
                    <Text style={styles.riskMetricName}>{risk.name}</Text>
                    <View style={styles.riskMetricActions}>
                      <View style={styles.riskMetricValue}>
                        <Text style={[
                          styles.riskMetricValueText,
                          risk.value > risk.limit * 0.8 ? styles.highRiskText : 
                          risk.value > risk.limit * 0.6 ? styles.mediumRiskText : styles.lowRiskText
                        ]}>
                          {risk.value.toFixed(2)}{risk.unit}
                        </Text>
                        <Text style={styles.riskMetricLimitText}>/ {risk.limit.toFixed(0)}{risk.unit}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.settingsButton}
                        onPress={() => openPortfolioSettings(risk.portfolioId, risk.name)}
                      >
                        <Ionicons name="settings-outline" size={16} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.riskBarContainer}>
                    <View style={styles.riskBarBackground}>
                      <View 
                        style={[
                          styles.riskBarFill,
                          { 
                            width: `${Math.min((risk.value / risk.limit) * 100, 100)}%`,
                            backgroundColor: '#000000' // Changed to black
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  <Text style={styles.portfolioValue}>Portfolio Value: ${risk.totalValue.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Performance Overview Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>1M</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {performanceData.map((performance, index) => (
            <TouchableOpacity 
              key={performance.portfolioId} 
              style={[styles.performanceItem, index < performanceData.length - 1 && styles.performanceItemBorder]}
              activeOpacity={0.7}
            >
              <View style={styles.performanceInfo}>
                <Text style={styles.performanceName}>{performance.portfolioName}</Text>
                <Text style={styles.performanceValue}>
                  ${performance.currentValue.toLocaleString()}
                </Text>
              </View>
              <View style={styles.performanceChange}>
                <Text style={[
                  styles.performanceChangeValue,
                  performance.changePercent >= 0 ? styles.positiveChange : styles.negativeChange
                ]}>
                  {performance.changePercent >= 0 ? '+' : ''}{performance.changePercent.toFixed(2)}%
                </Text>
                <Text style={[
                  styles.performanceChangeAmount,
                  performance.changePercent >= 0 ? styles.positiveChange : styles.negativeChange
                ]}>
                  {performance.change >= 0 ? '+' : ''}${performance.change.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Risk Insights Section */}
        {riskInsights.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Risk Insights</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>More</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              {riskInsights.map((insight, index) => (
                <View 
                  key={index} 
                  style={[styles.insightItem, index < riskInsights.length - 1 && styles.insightItemBorder]}
                >
                  <View style={[
                    styles.insightIndicator,
                    insight.type === 'warning' ? styles.warningInsight :
                    insight.type === 'success' ? styles.successInsight : styles.infoInsight
                  ]}>
                    <Ionicons 
                      name={
                        insight.type === 'warning' ? 'warning' :
                        insight.type === 'success' ? 'checkmark-circle' : 'information-circle'
                      } 
                      size={16} 
                      color="#FFF" 
                    />
                  </View>
                  <View style={styles.insightContent}>
                    <Text style={styles.insightTitle}>{insight.title}</Text>
                    <Text style={styles.insightDescription}>{insight.description}</Text>
                  </View>
                  {insight.action && (
                    <TouchableOpacity style={styles.insightAction}>
                      <Text style={styles.insightActionText}>{insight.action}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Asset Allocation Section */}
        {(assetAllocation.length > 0 || geographicAllocation.length > 0 || marketCapAllocation.length > 0) && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Asset Allocation</Text>
              <TouchableOpacity style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>Details</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              {/* Toggle between Sector, Geographic, and Market Cap */}
              <View style={styles.allocationToggle}>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    allocationView === 'sector' && styles.activeToggleButton
                  ]}
                  onPress={() => setAllocationView('sector')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    allocationView === 'sector' && styles.activeToggleButtonText
                  ]}>
                    Sectors
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton,
                    allocationView === 'geographic' && styles.activeToggleButton
                  ]}
                  onPress={() => setAllocationView('geographic')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    allocationView === 'geographic' && styles.activeToggleButtonText
                  ]}>
                    Geography
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton,
                    allocationView === 'marketCap' && styles.activeToggleButton
                  ]}
                  onPress={() => setAllocationView('marketCap')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    allocationView === 'marketCap' && styles.activeToggleButtonText
                  ]}>
                    Market Cap
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Render based on selected view */}
              {allocationView === 'sector' && (
                <>
                  {assetAllocation.map((allocation, index) => (
                    <View 
                      key={allocation.sector} 
                      style={[styles.allocationItem, index < assetAllocation.length - 1 && styles.allocationItemBorder]}
                      onStartShouldSetResponder={() => true}
                      onResponderGrant={() => {
                        if (!contributionData) return;
                        const list = (contributionData.sectors[allocation.sector] || []).slice(0, 5);
                        openContributionPopover(allocation.sector, list.map(i => ({ portfolioName: i.portfolioName, value: i.value })));
                      }}
                    >
                      <View style={styles.allocationInfo}>
                        <View style={[styles.allocationColorDot, { backgroundColor: allocation.color }]} />
                        <Text style={styles.allocationSector}>{allocation.sector}</Text>
                      </View>
                      <View style={styles.allocationValues}>
                        <Text style={styles.allocationPercentage}>{allocation.percentage.toFixed(2)}%</Text>
                        <Text style={styles.allocationValue}>${allocation.value.toLocaleString()}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {allocationView === 'geographic' && (
                <>
                  {geographicAllocation.map((allocation, index) => (
                    <View 
                      key={allocation.region} 
                      style={[styles.allocationItem, index < geographicAllocation.length - 1 && styles.allocationItemBorder]}
                      onStartShouldSetResponder={() => true}
                      onResponderGrant={() => {
                        if (!contributionData) return;
                        const list = (contributionData.regions[allocation.region] || []).slice(0, 5);
                        openContributionPopover(allocation.region, list.map(i => ({ portfolioName: i.portfolioName, value: i.value })));
                      }}
                    >
                      <View style={styles.allocationInfo}>
                        <View style={[styles.allocationColorDot, { backgroundColor: allocation.color }]} />
                        <Text style={styles.allocationSector}>{allocation.region}</Text>
                      </View>
                      <View style={styles.allocationValues}>
                        <Text style={styles.allocationPercentage}>{allocation.percentage.toFixed(2)}%</Text>
                        <Text style={styles.allocationValue}>${allocation.value.toLocaleString()}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {allocationView === 'marketCap' && (
                <>
                  {marketCapAllocation.map((allocation, index) => (
                    <View 
                      key={allocation.marketCap} 
                      style={[styles.allocationItem, index < marketCapAllocation.length - 1 && styles.allocationItemBorder]}
                      onStartShouldSetResponder={() => true}
                      onResponderGrant={() => {
                        if (!contributionData) return;
                        const list = (contributionData.marketCaps[allocation.marketCap] || []).slice(0, 5);
                        openContributionPopover(allocation.marketCap, list.map(i => ({ portfolioName: i.portfolioName, value: i.value })));
                      }}
                    >
                      <View style={styles.allocationInfo}>
                        <View style={[styles.allocationColorDot, { backgroundColor: allocation.color }]} />
                        <Text style={styles.allocationSector}>{allocation.marketCap}</Text>
                      </View>
                      <View style={styles.allocationValues}>
                        <Text style={styles.allocationPercentage}>{allocation.percentage.toFixed(2)}%</Text>
                        <Text style={styles.allocationValue}>${allocation.value.toLocaleString()}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          </>
        )}

        {/* Recent Scenarios Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Scenarios</Text>
          <TouchableOpacity onPress={navigateToScenarios} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Run more</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {recentScenarios.map((scenario, index) => (
            <TouchableOpacity 
              key={scenario.id} 
              style={[styles.scenarioItem, index < recentScenarios.length - 1 && styles.scenarioItemBorder]}
              onPress={() => openScenarioDetails(scenario)}
              activeOpacity={0.7}
            >
              <View style={styles.scenarioIconContainer}>
                <View style={[
                  styles.scenarioIcon,
                  scenario.impactValue < 0 ? styles.negativeScenarioIcon : styles.positiveScenarioIcon
                ]}>
                  <Ionicons 
                    name={scenario.impactValue < 0 ? "arrow-down" : "arrow-up"} 
                    size={16} 
                    color="#FFF" 
                  />
                </View>
              </View>
              <View style={styles.scenarioContent}>
                <Text style={styles.scenarioName}>{scenario.name}</Text>
                <Text style={styles.scenarioPortfolio}>{scenario.portfolioName}</Text>
              </View>
              <View style={styles.scenarioImpactContainer}>
                <Text style={[
                  styles.scenarioImpactValue,
                  scenario.impactValue < 0 ? styles.negativeImpact : styles.positiveImpact
                ]}>
                  {scenario.impactValue > 0 ? '+' : ''}{scenario.impactValue.toFixed(2)}%
                </Text>
                <Text style={styles.scenarioDate}>{scenario.runDate}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Risk Alerts Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Risk Alerts</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <TouchableOpacity style={[styles.alertItem, styles.alertItemBorder]} activeOpacity={0.7}>
            <View style={[styles.alertIndicator, styles.warningAlert]} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>VaR Threshold Approaching</Text>
              <Text style={styles.alertDescription}>Global Equity Fund is at 85% of VaR limit</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.alertItem, styles.alertItemBorder]} activeOpacity={0.7}>
            <View style={[styles.alertIndicator, styles.criticalAlert]} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Sector Concentration</Text>
              <Text style={styles.alertDescription}>Technology exposure exceeds 30% in Aggressive Growth</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.alertItem} activeOpacity={0.7}>
            <View style={[styles.alertIndicator, styles.infoAlert]} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>New Scenario Available</Text>
              <Text style={styles.alertDescription}>Fed Rate Hike (75bps) scenario is ready for analysis</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Market Index Correlation Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Market Index Correlation Grid</Text>
          <TouchableOpacity style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Details</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {/* Time Period Selector */}
          <View style={styles.timePeriodSelector}>
            {(['1M', '3M', '6M', '1Y', '3Y'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.timePeriodButton,
                  correlationTimePeriod === period && styles.activeTimePeriodButton
                ]}
                onPress={() => handleTimePeriodChange(period)}
              >
                <Text style={[
                  styles.timePeriodButtonText,
                  correlationTimePeriod === period && styles.activeTimePeriodButtonText
                ]}>
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Portfolio Impact Analysis */}
          {Object.keys(portfolioCorrelations).length > 0 && (
            <View style={styles.portfolioImpactSection}>
              <View style={styles.portfolioImpactTitleContainer}>
                <Text style={styles.portfolioImpactTitle}>Your Portfolio Correlations</Text>
                <TouchableOpacity onPress={openCorrelationInfoModal} style={styles.correlationInfoButton}>
                  <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              {portfolios.slice(0, 2).map((portfolio) => (
                <View key={portfolio.id} style={styles.portfolioCorrelationItem}>
                  <Text style={styles.portfolioCorrelationName}>{portfolio.name}</Text>
                  <View style={styles.portfolioCorrelationValue}>
                    <Text style={[
                      styles.portfolioCorrelationText,
                      { color: portfolioCorrelations[portfolio.id] > 0.8 ? '#FF3B30' : 
                               portfolioCorrelations[portfolio.id] > 0.6 ? '#FF9500' : '#10B981' }
                    ]}>
                      {portfolioCorrelations[portfolio.id]?.toFixed(2) || 'N/A'}
                    </Text>
                    <Text style={styles.portfolioCorrelationLabel}>avg correlation</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Correlation Matrix Grid */}
          <View style={styles.correlationGrid}>
            {/* Header row */}
            <View style={styles.correlationRow}>
              <View style={styles.correlationCell}>
                <Text style={styles.correlationHeaderText}>Index</Text>
              </View>
              {getTopWorldIndices().map((index, i) => (
                <View key={i} style={styles.correlationCell}>
                  <Text style={styles.correlationHeaderText}>{index.symbol}</Text>
                  <MiniChart data={correlationTrendData[index.symbol]} width={30} height={12} />
                </View>
              ))}
            </View>
            
            {/* Data rows */}
            {getTopWorldIndices().map((rowIndex, i) => (
              <View key={i} style={styles.correlationRow}>
                <View style={styles.correlationCell}>
                  <Text style={styles.correlationIndexText}>{rowIndex.symbol}</Text>
                </View>
                {getTopWorldIndices().map((colIndex, j) => (
                  <TouchableOpacity
                    key={j}
                    style={[styles.correlationCell, { backgroundColor: getCorrelationColor(getCorrelationValue(i, j)) }]}
                    onPress={() => handleCorrelationCellPress(i, j)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.correlationValueText, { color: getCorrelationTextColor(getCorrelationValue(i, j)) }]}>
                      {getCorrelationValue(i, j).toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
          
          {/* Actionable Insights */}
          {correlationInsights.length > 0 && (
            <View style={styles.correlationInsightsSection}>
              <Text style={styles.correlationInsightsTitle}>Market Insights</Text>
              {correlationInsights.map((insight, index) => (
                <View key={index} style={styles.correlationInsightItem}>
                  <Ionicons name="bulb" size={16} color="#FF9500" />
                  <Text style={styles.correlationInsightText}>{insight}</Text>
                </View>
              ))}
            </View>
          )}
          

        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </Animated.ScrollView>
      
      {/* Portfolio Risk Settings Modal */}
      {selectedPortfolioForSettings && (
        <PortfolioRiskSettings
          visible={settingsModalVisible}
          onClose={closePortfolioSettings}
          portfolioId={selectedPortfolioForSettings.id}
          portfolioName={selectedPortfolioForSettings.name}
          onUpdate={handleSettingsUpdate}
        />
      )}

      {/* Scenario Details Modal */}
      <ScenarioDetailsModal
        visible={scenarioDetailsVisible}
        scenarioRun={selectedScenarioRun}
        onClose={closeScenarioDetails}
        onRunAgain={handleRunScenarioAgain}
      />

      {/* Correlation Detail Modal */}
      <Modal
        visible={correlationDetailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCorrelationDetailModal}
      >
        <View style={styles.correlationDetailModal}>
          <View style={styles.correlationDetailHeader}>
            <TouchableOpacity onPress={closeCorrelationDetailModal} style={styles.correlationDetailCloseButton}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
            <Text style={styles.correlationDetailTitle}>Correlation Details</Text>
          </View>
          
          {selectedCorrelationCell && (
            <View style={styles.correlationDetailContent}>
              <View style={styles.correlationDetailSection}>
                <Text style={styles.correlationDetailSectionTitle}>Index Pair</Text>
                <Text style={styles.correlationDetailIndexPair}>
                  {getTopWorldIndices()[selectedCorrelationCell.i].name} vs {getTopWorldIndices()[selectedCorrelationCell.j].name}
                </Text>
              </View>
              
              <View style={styles.correlationDetailSection}>
                <Text style={styles.correlationDetailSectionTitle}>Correlation Value</Text>
                <Text style={[
                  styles.correlationDetailValue,
                  { color: getCorrelationColor(getCorrelationValue(selectedCorrelationCell.i, selectedCorrelationCell.j)) }
                ]}>
                  {getCorrelationValue(selectedCorrelationCell.i, selectedCorrelationCell.j).toFixed(3)}
                </Text>
              </View>
              
              <View style={styles.correlationDetailSection}>
                <Text style={styles.correlationDetailSectionTitle}>Interpretation</Text>
                <Text style={styles.correlationDetailInterpretation}>
                  {getCorrelationInterpretation(getCorrelationValue(selectedCorrelationCell.i, selectedCorrelationCell.j))}
                </Text>
              </View>
              
              <View style={styles.correlationDetailSection}>
                <Text style={styles.correlationDetailSectionTitle}>30-Day Trend</Text>
                <View style={styles.correlationDetailChartContainer}>
                  <MiniChart 
                    data={correlationTrendData[getTopWorldIndices()[selectedCorrelationCell.i].symbol]} 
                    width={250} 
                    height={80} 
                  />
                </View>
              </View>
              
              <View style={styles.correlationDetailSection}>
                <Text style={styles.correlationDetailSectionTitle}>Regional Context</Text>
                <Text style={styles.correlationDetailContext}>
                  {getTopWorldIndices()[selectedCorrelationCell.i].region} and {getTopWorldIndices()[selectedCorrelationCell.j].region} markets
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Correlation Info Modal */}
      <Modal
        visible={correlationInfoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCorrelationInfoModal}
      >
        <View style={styles.correlationInfoModal}>
          <View style={styles.correlationInfoHeader}>
            <TouchableOpacity onPress={closeCorrelationInfoModal} style={styles.correlationInfoCloseButton}>
              <Ionicons name="close" size={24} color="#8E8E93" />
            </TouchableOpacity>
            <Text style={styles.correlationInfoTitle}>Portfolio Correlation Guide</Text>
          </View>
          
          <ScrollView style={styles.correlationInfoContent} showsVerticalScrollIndicator={false}>
            {/* What is Correlation */}
            <View style={styles.correlationInfoSection}>
              <Text style={styles.correlationInfoSectionTitle}>What is Portfolio Correlation?</Text>
              <Text style={styles.correlationInfoText}>
                Portfolio correlation measures how closely your portfolio moves with major global market indices. 
                A higher correlation means your portfolio tends to move in the same direction as these markets, 
                while lower correlation indicates more independent performance.
              </Text>
            </View>

            {/* Correlation Ranges */}
            <View style={styles.correlationInfoSection}>
              <Text style={styles.correlationInfoSectionTitle}>Understanding the Numbers</Text>
              <View style={styles.correlationRangeItem}>
                <Text style={styles.correlationRangeLabel}>0.80 - 1.00 (High)</Text>
                <Text style={styles.correlationRangeDescription}>Your portfolio moves very similarly to global markets. Limited diversification benefit.</Text>
              </View>
              <View style={styles.correlationRangeItem}>
                <Text style={styles.correlationRangeLabel}>0.60 - 0.80 (Moderate)</Text>
                <Text style={styles.correlationRangeDescription}>Good balance between market exposure and diversification.</Text>
              </View>
              <View style={styles.correlationRangeItem}>
                <Text style={styles.correlationRangeLabel}>0.00 - 0.60 (Low)</Text>
                <Text style={styles.correlationRangeDescription}>Excellent diversification - your portfolio moves more independently.</Text>
              </View>
            </View>

            {/* Color Code Legend */}
            <View style={styles.correlationInfoSection}>
              <Text style={styles.correlationInfoSectionTitle}>Color Code Reference</Text>
              
              {/* Positive Correlations */}
              <View style={styles.correlationColorSection}>
                <Text style={styles.correlationColorSectionTitle}>Positive Correlations</Text>
                <View style={styles.correlationColorItem}>
                  <View style={[styles.correlationColorDot, { backgroundColor: '#1E40AF' }]} />
                  <Text style={styles.correlationColorText}>Very Strong (0.85+)</Text>
                </View>
                <View style={styles.correlationColorItem}>
                  <View style={[styles.correlationColorDot, { backgroundColor: '#3B82F6' }]} />
                  <Text style={styles.correlationColorText}>Strong (0.70-0.85)</Text>
                </View>
                <View style={styles.correlationColorItem}>
                  <View style={[styles.correlationColorDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.correlationColorText}>Moderate (0.55-0.70)</Text>
                </View>
                <View style={styles.correlationColorItem}>
                  <View style={[styles.correlationColorDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.correlationColorText}>Weak (0.40-0.55)</Text>
                </View>
              </View>

              {/* Neutral & Negative */}
              <View style={styles.correlationColorSection}>
                <Text style={styles.correlationColorSectionTitle}>Neutral & Negative</Text>
                <View style={styles.correlationColorItem}>
                  <View style={[styles.correlationColorDot, { backgroundColor: '#E5E7EB' }]} />
                  <Text style={styles.correlationColorText}>Very Weak (0.20-0.40)</Text>
                </View>
                <View style={styles.correlationColorItem}>
                  <View style={[styles.correlationColorDot, { backgroundColor: '#F97316' }]} />
                  <Text style={styles.correlationColorText}>Moderate Negative</Text>
                </View>
                <View style={styles.correlationColorItem}>
                  <View style={[styles.correlationColorDot, { backgroundColor: '#DC2626' }]} />
                  <Text style={styles.correlationColorText}>Strong Negative</Text>
                </View>
              </View>
            </View>

            {/* Investment Implications */}
            <View style={styles.correlationInfoSection}>
              <Text style={styles.correlationInfoSectionTitle}>Investment Implications</Text>
              <View style={styles.correlationImplicationItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.correlationImplicationText}>Lower correlation = Better diversification</Text>
              </View>
              <View style={styles.correlationImplicationItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.correlationImplicationText}>High correlation during market stress is normal</Text>
              </View>
              <View style={styles.correlationImplicationItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.correlationImplicationText}>Consider alternative assets if correlation is too high</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  blurView: {
    height: Platform.OS === 'ios' ? 90 : 60,
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  gaugeContainer: {
    marginTop: 8,
  },
  gauge: {
    height: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    overflow: 'hidden',
  },
  gaugeProgress: {
    height: '100%',
    borderRadius: 6,
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gaugeLabel: {
    alignItems: 'center',
  },
  gaugeLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  gaugeLabelSubtext: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  seeAllButton: {
    padding: 4,
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  portfolioCardsContainer: {
    paddingHorizontal: 16,
  },
  portfolioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  portfolioCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  portfolioCardName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  portfolioCardValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  riskMetricItem: {
    paddingVertical: 12,
  },
  riskMetricItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  riskMetricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riskMetricName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    flex: 1,
  },
  riskMetricValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  riskMetricValueText: {
    fontSize: 15,
    fontWeight: '600',
  },
  riskMetricLimitText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 2,
  },
  highRiskText: {
    color: '#FF3B30',
  },
  mediumRiskText: {
    color: '#FF9500',
  },
  lowRiskText: {
    color: '#007AFF',
  },
  riskBarContainer: {
    width: '100%',
  },
  riskBarBackground: {
    height: 6,
    backgroundColor: '#F2F2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  riskBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scenarioItem: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scenarioItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  scenarioIconContainer: {
    marginRight: 12,
  },
  scenarioIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positiveScenarioIcon: {
    backgroundColor: '#34C759',
  },
  negativeScenarioIcon: {
    backgroundColor: '#FF3B30',
  },
  scenarioContent: {
    flex: 1,
  },
  scenarioName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  scenarioPortfolio: {
    fontSize: 13,
    color: '#8E8E93',
  },
  scenarioImpactContainer: {
    alignItems: 'flex-end',
  },
  scenarioImpactValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  positiveImpact: {
    color: '#34C759',
  },
  negativeImpact: {
    color: '#FF3B30',
  },
  scenarioDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  alertItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  alertIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  criticalAlert: {
    backgroundColor: '#FF3B30',
  },
  warningAlert: {
    backgroundColor: '#FF9500',
  },
  infoAlert: {
    backgroundColor: '#007AFF',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    color: '#8E8E93',
  },
  bottomSpacing: {
    height: 32,
  },
  portfolioBreakdownContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  portfolioBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  riskMetricActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    marginLeft: 8,
    padding: 4,
  },
  portfolioValue: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  performanceItem: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  performanceInfo: {
    flex: 1,
  },
  performanceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 2,
  },
  performanceValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  performanceChange: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  performanceChangeValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  positiveChange: {
    color: '#34C759',
  },
  negativeChange: {
    color: '#FF3B30',
  },
  performanceChangeAmount: {
    fontSize: 13,
    color: '#8E8E93',
  },
  marketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 8,
  },
  marketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  marketSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  marketName: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  marketPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  marketChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  insightItem: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  insightIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningInsight: {
    backgroundColor: '#FF9500',
  },
  successInsight: {
    backgroundColor: '#34C759',
  },
  infoInsight: {
    backgroundColor: '#007AFF',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  insightDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  insightAction: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  insightActionText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  allocationItem: {
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  allocationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  allocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  allocationColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  allocationSector: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  allocationValues: {
    alignItems: 'flex-end',
  },
  allocationPercentage: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  allocationValue: {
    fontSize: 13,
    color: '#8E8E93',
  },
  allocationToggle: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeToggleButtonText: {
    color: '#000000',
    fontWeight: '600',
  },
  correlationGrid: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
    marginBottom: 16,
  },
  correlationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  correlationCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    minWidth: 45,
  },
  correlationHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
  },
  correlationIndexText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
  },
  correlationValueText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timePeriodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTimePeriodButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  timePeriodButtonText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeTimePeriodButtonText: {
    color: '#000000',
    fontWeight: '600',
  },
  portfolioImpactSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  portfolioImpactTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portfolioImpactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  correlationInfoButton: {
    padding: 4,
  },
  portfolioCorrelationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  portfolioCorrelationName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000000',
  },
  portfolioCorrelationValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  portfolioCorrelationText: {
    fontSize: 15,
    fontWeight: '600',
  },
  portfolioCorrelationLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  correlationInsightsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  correlationInsightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  correlationInsightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  correlationInsightText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 8,
  },
  correlationDetailModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  correlationDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  correlationDetailCloseButton: {
    padding: 8,
  },
  correlationDetailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  correlationDetailContent: {
    flex: 1,
  },
  correlationDetailSection: {
    marginBottom: 12,
  },
  correlationDetailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  correlationDetailIndexPair: {
    fontSize: 14,
    color: '#8E8E93',
  },
  correlationDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  correlationDetailInterpretation: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  correlationDetailChartContainer: {
    marginTop: 12,
  },
  correlationDetailContext: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  correlationInfoModal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  correlationInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  correlationInfoCloseButton: {
    padding: 8,
  },
  correlationInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  correlationInfoContent: {
    flex: 1,
    paddingHorizontal: 4,
  },
  correlationInfoSection: {
    marginBottom: 24,
  },
  correlationInfoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  correlationInfoText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  correlationRangeItem: {
    marginBottom: 12,
  },
  correlationRangeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  correlationRangeDescription: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
  },
  correlationColorSection: {
    marginBottom: 12,
  },
  correlationColorSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  correlationColorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  correlationColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  correlationColorText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  correlationImplicationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  correlationImplicationText: {
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 18,
    marginLeft: 6,
  },
}); 