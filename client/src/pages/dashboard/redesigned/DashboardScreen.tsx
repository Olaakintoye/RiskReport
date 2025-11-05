import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  Alert,
  Pressable
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/use-auth';

// Import state persistence
import { usePersistentState } from '../../../hooks/use-screen-state';

// Import React Query hooks
import { usePortfolios, usePortfolioSummaries, usePortfoliosWithPrices } from '../../../hooks/usePortfolioData.ts';
import { useScenarios, useScenarioRuns } from '../../../hooks/useScenarioData.ts';

// Import services
import allocationService from '../../../services/allocationService';
import { calculatePortfolioRisk, getRiskBreakdown } from '../../../services/riskService';
import { getSecurityPrice } from '../../../services/marketDataService';
import riskTrackingService from '../../../services/riskTrackingService';
import yahooFinanceService from '../../../services/yahooFinanceService';

// Import components
import LiveMarketIndicators from '../../../components/ui/LiveMarketIndicators';
import ScenarioDetailsModal, { ScenarioRunData } from '../../../components/ui/ScenarioDetailsModal';
import PortfolioRiskSettings from '../../../components/ui/PortfolioRiskSettings';
import MarketContextCard from '../../../components/portfolio/MarketContextCard';

// Import Portfolio type from service
import type { Portfolio as PortfolioType } from '../../../services/portfolioService';

// Import spacing constants
import SPACING from '../../../constants/spacing';

// Define additional UI types
interface Portfolio extends Omit<PortfolioType, 'assets'> {
  totalValue: number;
  assets?: Array<{
    id: string;
    symbol: string;
    name: string;
    quantity: number;
    price: number;
    sector?: string;
    assetClass: 'equity' | 'bond' | 'commodity' | 'cash' | 'alternative' | 'real_estate';
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

interface AssetTypeAllocation {
  assetType: string;
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
  
  // React Query hooks for data fetching - optimized with sequential loading
  // Load portfolios first (critical data)
  const { data: portfolios = [], isLoading: portfoliosLoading, refetch: refetchPortfolios } = usePortfolios();
  
  // Load summaries only after portfolios are loaded
  const { data: portfolioSummaries = [], isLoading: summariesLoading } = usePortfolioSummaries();
  
  // Load full portfolios with prices after summaries (defer heavy API calls)
  const { data: fullPortfolios = [], isLoading: fullPortfoliosLoading } = usePortfoliosWithPrices();
  
  // Load scenarios and runs only when portfolios are available (non-critical data)
  const { data: scenarios = [], isLoading: scenariosLoading } = useScenarios();
  const { data: scenarioRuns = [], isLoading: runsLoading } = useScenarioRuns();

  // Type assertions for data with stable references
  const typedPortfolios = useMemo(() => portfolios as Portfolio[], [portfolios]);
  const typedFullPortfolios = useMemo(() => fullPortfolios as Portfolio[], [fullPortfolios]);
  const typedScenarioRuns = useMemo(() => scenarioRuns as any[], [scenarioRuns]);
  
  // State variables
  const [allocationView, setAllocationView] = usePersistentState<'sector' | 'geographic' | 'marketCap' | 'assetType'>('DashboardScreen', 'allocationView', 'sector');
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
  const [correlationMatrix, setCorrelationMatrix] = useState<number[][] | null>(null);
  const [indexSparklineData, setIndexSparklineData] = useState<Record<string, number[]>>({});
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current; // 0 closed, 1 open
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const popoverAnchorRef = useRef<View | null>(null);
  const portfoliosRef = useRef<Portfolio[]>([]);
  useEffect(() => { portfoliosRef.current = typedPortfolios; }, [typedPortfolios]);
  
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

  // Slide menu handlers
  const openMenu = () => {
    setMenuVisible(true);
    Animated.timing(menuAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setMenuVisible(false);
    });
  };

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
  
  // Memoized loading state - true if any critical data is loading
  const isLoading = useMemo(() => 
    portfoliosLoading || summariesLoading || fullPortfoliosLoading || scenariosLoading || runsLoading,
    [portfoliosLoading, summariesLoading, fullPortfoliosLoading, scenariosLoading, runsLoading]
  );

  // Memoized risk calculations - only recalculate when portfolios change
  const riskMetrics = useMemo(() => {
    if (!typedPortfolios.length) return [];
    
    const metrics: RiskMetric[] = [];
    let totalRisk = 0;
    let totalLimit = 0;
    
    typedPortfolios.forEach(portfolio => {
      // Use cached risk data if available, otherwise calculate
      const riskData = { var: 0.15, varLimit: 0.20 }; // Placeholder - would use actual risk service
      
      if (riskData.var) {
        metrics.push({
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
    });
    
    // Sort by usage percentage
    metrics.sort((a, b) => (b.value / b.limit) - (a.value / a.limit));
    return metrics;
  }, [typedPortfolios]);

  // Memoized risk budget usage
  const riskBudgetUsage = useMemo(() => {
    if (riskMetrics.length === 0) return 0;
    const totalRisk = riskMetrics.reduce((sum, metric) => sum + metric.value, 0);
    const totalLimit = riskMetrics.reduce((sum, metric) => sum + metric.limit, 0);
    return totalRisk / totalLimit;
  }, [riskMetrics]);

  // Memoized recent scenarios - only recalculate when scenario runs change
  const recentScenarios = useMemo(() => {
    console.log('Recent scenarios calculation - typedScenarioRuns:', typedScenarioRuns.length, 'runs');
    const scenarios = typedScenarioRuns.slice(0, 3).map((run: any) => ({
      id: run.id,
      name: run.scenarioName || 'Unknown Scenario',
      portfolioName: run.portfolioName || 'Unknown Portfolio',
      impactValue: run.impactValue || 0,
      runDate: run.runDate || new Date().toISOString(),
    }));
    console.log('Recent scenarios result:', scenarios.length, 'scenarios');
    return scenarios;
  }, [typedScenarioRuns]);

  // Memoized performance data - only recalculate when portfolios change
  const performanceData = useMemo(() => {
    return typedFullPortfolios.map((portfolio: Portfolio) => {
      // Calculate total value from assets
      const currentValue = portfolio.assets?.reduce((sum, asset) => {
        return sum + (asset.price * asset.quantity);
      }, 0) || 0;
      
      // Calculate previous value (from 1 day ago)
      // For now, we'll estimate it based on a small random change
      // In a real app, this would come from historical data
      const previousValue = currentValue * (0.98 + Math.random() * 0.04); // -2% to +2% change
      const change = currentValue - previousValue;
      const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;
      
      return {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        currentValue,
        previousValue,
        change,
        changePercent,
        timeframe: '1D'
      };
    });
  }, [typedFullPortfolios]);

  // State for allocation data
  const [allocationData, setAllocationData] = useState<{
    asset: AssetAllocation[];
    geographic: GeographicAllocation[];
    marketCap: MarketCapAllocation[];
    assetType: AssetTypeAllocation[];
  }>({
    asset: [],
    geographic: [],
    marketCap: [],
    assetType: []
  });

  // State for contribution data
  const [contributionData, setContributionData] = useState<{
    sectors: Record<string, { portfolioId: string; portfolioName: string; value: number }[]>;
    regions: Record<string, { portfolioId: string; portfolioName: string; value: number }[]>;
    marketCaps: Record<string, { portfolioId: string; portfolioName: string; value: number }[]>;
    assetTypes: Record<string, { portfolioId: string; portfolioName: string; value: number }[]>;
  } | null>(null);

  // Calculate allocation data when portfolios change
  useEffect(() => {
    // Only run if we have portfolios and they're not still loading
    if (fullPortfoliosLoading) return;
    
    if (!typedFullPortfolios.length) {
      setAllocationData({
        asset: [],
        geographic: [],
        marketCap: [],
        assetType: []
      });
      setContributionData(null);
      return;
    }

    let isMounted = true;

    // Calculate allocations
    allocationService.computeAllAggregations(typedFullPortfolios as PortfolioType[])
      .then(data => {
        if (!isMounted) return;
        setAllocationData({
          asset: data.sectors
            .map(s => ({ 
              sector: s.name, 
              percentage: s.percentage, 
              value: s.value, 
              color: s.color 
            }))
            .sort((a, b) => b.value - a.value), // Sort by value descending
          geographic: data.regions
            .map(r => ({ 
              region: r.name, 
              percentage: r.percentage, 
              value: r.value, 
              color: r.color 
            }))
            .sort((a, b) => b.value - a.value), // Sort by value descending
          marketCap: data.marketCaps
            .map(m => ({ 
              marketCap: m.name, 
              percentage: m.percentage, 
              value: m.value, 
              color: m.color 
            }))
            .sort((a, b) => b.value - a.value), // Sort by value descending
          assetType: data.assetTypes
            .map(a => ({ 
              assetType: a.name, 
              percentage: a.percentage, 
              value: a.value, 
              color: a.color 
            }))
            .sort((a, b) => b.value - a.value) // Sort by value descending
        });
      })
      .catch(err => console.error('Error computing allocations:', err));

    // Calculate contributions
    allocationService.computeContributionBreakdown(typedFullPortfolios as PortfolioType[])
      .then(data => {
        if (!isMounted) return;
        setContributionData(data);
      })
      .catch(err => console.error('Error computing contributions:', err));

    return () => {
      isMounted = false;
    };
  }, [typedFullPortfolios, fullPortfoliosLoading]);

  // Refresh function that refetches all data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPortfolios(),
        // Add other refetch calls here
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPortfolios]);

  const openContributionPopover = (title: string, items: { portfolioName: string; value: number }[]) => {
    setPopoverContent({ title, contributions: items });
    setPopoverVisible(true);
  };



  // Memoized risk insights - only recalculate when risk metrics change
  const riskInsights = useMemo(() => {
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
    const topSectorPercentage = allocationData.asset[0]?.percentage || 0;
    if (topSectorPercentage > 40) {
      insights.push({
        type: 'warning',
        title: 'Concentration Risk',
        description: `${topSectorPercentage.toFixed(2)}% exposure to ${allocationData.asset[0]?.sector}`,
        action: 'Consider Diversification'
      });
    }
    
    return insights.slice(0, 3); // Top 3 insights
  }, [riskMetrics, allocationData]);

  // Handle refresh with haptic feedback
  const onRefresh = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleRefresh();
  }, [handleRefresh]);
  
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
    console.log('openScenarioDetails called with scenario:', scenario);
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
        fx: scenario.impactValue * 1000,
        commodity: scenario.impactValue * 500,
      },
    };

    setSelectedScenarioRun(scenarioRunData);
    setScenarioDetailsVisible(true);
    console.log('Modal state set - visible: true, scenarioRun:', scenarioRunData.scenarioName);
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
    handleRefresh();
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
      { symbol: 'SPX', name: 'S&P 500', region: 'US', yahoo: '^GSPC' },
      { symbol: 'FTSE', name: 'FTSE 100', region: 'UK', yahoo: '^FTSE' },
      { symbol: 'N225', name: 'Nikkei 225', region: 'Japan', yahoo: '^N225' },
      { symbol: 'DAX', name: 'DAX', region: 'Germany', yahoo: '^GDAXI' },
      { symbol: 'CAC', name: 'CAC 40', region: 'France', yahoo: '^FCHI' },
      { symbol: 'HSI', name: 'Hang Seng', region: 'Hong Kong', yahoo: '^HSI' }
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
    if (correlationMatrix && correlationMatrix[i] && typeof correlationMatrix[i][j] === 'number') {
      return correlationMatrix[i][j];
    }
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

  // Normalize timestamp to UTC date key (YYYY-MM-DD)
  const toDateKey = (ts: number): string => {
    try {
      return new Date(ts).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  // Map UI period to Yahoo API parameters
  const mapPeriodToYahooParams = (period: '1M' | '3M' | '6M' | '1Y' | '3Y') => {
    switch (period) {
      case '1M':
        return { range: '1mo' as const, interval: '1d' as const };
      case '3M':
        return { range: '3mo' as const, interval: '1d' as const };
      case '6M':
        return { range: '6mo' as const, interval: '1d' as const };
      case '1Y':
        return { range: '1y' as const, interval: '1d' as const };
      case '3Y':
      default:
        return { range: '5y' as const, interval: '1wk' as const };
    }
  };

  // Pearson correlation of two aligned return series
  const pearson = (a: number[], b: number[]): number => {
    const n = Math.min(a.length, b.length);
    if (n < 2) return 0;
    let sumA = 0, sumB = 0;
    for (let i = 0; i < n; i++) { sumA += a[i]; sumB += b[i]; }
    const meanA = sumA / n;
    const meanB = sumB / n;
    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < n; i++) {
      const da = a[i] - meanA;
      const db = b[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }
    if (denA === 0 || denB === 0) return 0;
    return num / Math.sqrt(denA * denB);
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
    let cleaned = (data || []).filter(n => Number.isFinite(n));
    if (cleaned.length === 1) cleaned = [cleaned[0], cleaned[0]];
    if (cleaned.length < 2) return null;

    const maxValue = Math.max(...cleaned);
    const minValue = Math.min(...cleaned);
    const range = maxValue - minValue;

    const pathData = cleaned.map((value, index) => {
      const x = (index / (cleaned.length - 1)) * width;
      const y = range > 0
        ? height - ((value - minValue) / range) * height
        : height / 2; // flat line when no variance
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
      
      const indices = getTopWorldIndices();
      const { range, interval } = mapPeriodToYahooParams(correlationTimePeriod);

      const seriesBySymbol: Record<string, { timestamp: number; adjustedClose: number }[]> = {};
      await Promise.all(
        indices.map(async ({ yahoo, symbol }) => {
          const raw = await yahooFinanceService.getHistoricalData(yahoo, range, interval);
          const threeYearsAgo = Date.now() - (3 * 365 * 24 * 60 * 60 * 1000);
          const filtered = correlationTimePeriod === '3Y'
            ? raw.filter((p: any) => p.timestamp >= threeYearsAgo)
            : raw;
          seriesBySymbol[symbol] = filtered
            .filter((p: any) => typeof p.adjustedClose === 'number' && typeof p.timestamp === 'number')
            .map((p: any) => ({ timestamp: p.timestamp, adjustedClose: p.adjustedClose }));
        })
      );

      const symbolKeys = indices.map(i => i.symbol);
      // Build date->close maps per symbol using UTC date keys (align differing timezones/calendars)
      const dateToCloseBySymbol: Record<string, Map<string, number>> = {};
      for (const sym of symbolKeys) {
        const m = new Map<string, number>();
        for (const p of seriesBySymbol[sym]) {
          const k = toDateKey(p.timestamp);
          if (k && Number.isFinite(p.adjustedClose)) m.set(k, p.adjustedClose);
        }
        dateToCloseBySymbol[sym] = m;
      }

      // Build union of date keys across all series (then forward-fill to align)
      const unionDatesSet = symbolKeys.reduce((acc: Set<string>, sym) => {
        for (const k of dateToCloseBySymbol[sym].keys()) acc.add(k);
        return acc;
      }, new Set<string>());
      const sortedDates = Array.from(unionDatesSet).sort();

      // Build aligned closes per symbol using the common date sequence
      const closesBySymbol: Record<string, number[]> = {};
      for (const sym of symbolKeys) {
        const mapDateToClose = dateToCloseBySymbol[sym];
        const arr: number[] = [];
        let last: number | undefined = undefined;
        for (const d of sortedDates) {
          const v = mapDateToClose.get(d);
          if (typeof v === 'number' && Number.isFinite(v)) last = v;
          if (typeof last === 'number') arr.push(last);
        }
        closesBySymbol[sym] = arr;
      }

      const returnsBySymbol: Record<string, number[]> = {};
      for (const sym of symbolKeys) {
        const closes = closesBySymbol[sym];
        const rets: number[] = [];
        for (let k = 1; k < closes.length; k++) {
          const prev = closes[k - 1];
          const curr = closes[k];
          if (prev && curr) rets.push((curr - prev) / prev);
        }
        returnsBySymbol[sym] = rets;
      }

      const matrix: number[][] = symbolKeys.map(() => symbolKeys.map(() => 1));
      for (let i = 0; i < symbolKeys.length; i++) {
        for (let j = 0; j < symbolKeys.length; j++) {
          if (i === j) { matrix[i][j] = 1; continue; }
          const val = pearson(returnsBySymbol[symbolKeys[i]], returnsBySymbol[symbolKeys[j]]);
          matrix[i][j] = Number.isFinite(val) ? Math.max(-1, Math.min(1, val)) : 0;
        }
      }
      setCorrelationMatrix(matrix);

      const base = 'SPX';
      const baseR = returnsBySymbol[base] || [];
      const window = 20;
      const trendData: Record<string, number[]> = {};
      const priceSpark: Record<string, number[]> = {};
      for (const sym of symbolKeys) {
        const r = returnsBySymbol[sym] || [];
        const len = Math.min(baseR.length, r.length);
        const arr: number[] = [];
        if (len >= window) {
          for (let k = window; k <= len; k++) {
            const rc = pearson(baseR.slice(k - window, k), r.slice(k - window, k));
            arr.push(Number.isFinite(rc) ? Math.max(-1, Math.min(1, rc)) : 0);
          }
        } else if (len >= 2) {
          const rc = pearson(baseR.slice(0, len), r.slice(0, len));
          const val = Number.isFinite(rc) ? Math.max(-1, Math.min(1, rc)) : 0;
          arr.push(val, val); // ensure >= 2 points
        }
        trendData[sym] = arr.slice(-30);

        // normalized adjusted closes for sparkline
        const closes = closesBySymbol[sym] || [];
        if (closes.length >= 2) {
          const minC = Math.min(...closes);
          const maxC = Math.max(...closes);
          const rangeC = maxC - minC;
          priceSpark[sym] = rangeC > 0
            ? closes.map(c => (c - minC) / rangeC)
            : closes.map(() => 0.5);
        }
      }
      setCorrelationTrendData(trendData);
      setIndexSparklineData(priceSpark);

      const insights = generateCorrelationInsights(matrix, portfolioCorr);
      setCorrelationInsights(insights);

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
          <TouchableOpacity onPress={openMenu} style={styles.menuButtonOverlay}>
            <Ionicons name="menu" size={24} color="#000000" />
          </TouchableOpacity>
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
          <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#000000" />
          </TouchableOpacity>
          {popoverContent && popoverVisible && (
            <Modal transparent visible={popoverVisible} animationType="fade" onRequestClose={() => setPopoverVisible(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '90%', maxWidth: 360 }}>
                  <Text style={{ fontWeight: '600', fontSize: 16, marginBottom: 8 }}>{popoverContent.title} — Top Contributors</Text>
                  {popoverContent.contributions.map((c, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 }}>
                      <Text style={{ color: '#334155' }}>{c.portfolioName}</Text>
                      <Text style={{ color: '#334155' }}>${Math.round(c.value || 0).toLocaleString()}</Text>
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

        {/* Market Context Section */}
        <View style={styles.marketContextContainer}>
          <MarketContextCard 
            portfolioIds={typedPortfolios.map(p => p.id)}
            onNewsPress={(headline) => {
              Alert.alert('Market News', headline);
            }}
            onCorrelationPress={() => {
              Alert.alert('Correlations', 'Detailed correlation analysis coming soon');
            }}
          />
        </View>

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
          {riskMetrics.length > 0 && (
            <View style={styles.portfolioBreakdownContainer}>
              <Text style={styles.portfolioBreakdownTitle}>Portfolio Breakdown</Text>
              {riskMetrics.map((risk, index) => (
                <View key={risk.portfolioId} style={[styles.riskMetricItem, index < riskMetrics.length - 1 && styles.riskMetricItemBorder]}>
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
                  <Text style={styles.portfolioValue}>Portfolio Value: ${(risk.totalValue || 0).toLocaleString()}</Text>
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
                  ${(performance.currentValue || 0).toLocaleString()}
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
                  {performance.change >= 0 ? '+' : ''}${(Math.abs(performance.change) || 0).toLocaleString()}
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
                    Regions
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
                    Markets
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    allocationView === 'assetType' && styles.activeToggleButton
                  ]}
                  onPress={() => setAllocationView('assetType')}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    allocationView === 'assetType' && styles.activeToggleButtonText
                  ]}>
                    Asset
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Render based on selected view */}
              {allocationView === 'sector' && (
                <>
                  {allocationData.asset.map((allocation, index) => (
                    <Pressable 
                      key={allocation.sector} 
                      style={[styles.allocationItem, index < allocationData.asset.length - 1 && styles.allocationItemBorder]}
                      delayLongPress={500}
                      onLongPress={() => {
                        if (!contributionData) return;
                        const list = (contributionData.sectors[allocation.sector] || []).slice(0, 5);
                        openContributionPopover(allocation.sector, list.map((i: any) => ({ portfolioName: i.portfolioName, value: i.value })));
                      }}
                    >
                      <View style={styles.allocationInfo}>
                        <View style={[styles.allocationColorDot, { backgroundColor: allocation.color }]} />
                        <Text style={styles.allocationSector}>{allocation.sector}</Text>
                      </View>
                      <View style={styles.allocationValues}>
                        <Text style={styles.allocationPercentage}>{(allocation.percentage || 0).toFixed(2)}%</Text>
                        <Text style={styles.allocationValue}>${(allocation.value || 0).toLocaleString()}</Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              )}

              {allocationView === 'geographic' && (
                <>
                  {allocationData.geographic.map((allocation, index) => (
                    <Pressable 
                      key={allocation.region} 
                      style={[styles.allocationItem, index < allocationData.geographic.length - 1 && styles.allocationItemBorder]}
                      delayLongPress={500}
                      onLongPress={() => {
                        if (!contributionData) return;
                        const list = (contributionData.regions[allocation.region] || []).slice(0, 5);
                        openContributionPopover(allocation.region, list.map((i: any) => ({ portfolioName: i.portfolioName, value: i.value })));
                      }}
                    >
                      <View style={styles.allocationInfo}>
                        <View style={[styles.allocationColorDot, { backgroundColor: allocation.color }]} />
                        <Text style={styles.allocationSector}>{allocation.region}</Text>
                      </View>
                      <View style={styles.allocationValues}>
                        <Text style={styles.allocationPercentage}>{(allocation.percentage || 0).toFixed(2)}%</Text>
                        <Text style={styles.allocationValue}>${(allocation.value || 0).toLocaleString()}</Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              )}

              {allocationView === 'marketCap' && (
                <>
                  {allocationData.marketCap.map((allocation, index) => (
                    <Pressable 
                      key={allocation.marketCap} 
                      style={[styles.allocationItem, index < allocationData.marketCap.length - 1 && styles.allocationItemBorder]}
                      delayLongPress={500}
                      onLongPress={() => {
                        if (!contributionData) return;
                        const list = (contributionData.marketCaps[allocation.marketCap] || []).slice(0, 5);
                        openContributionPopover(allocation.marketCap, list.map((i: any) => ({ portfolioName: i.portfolioName, value: i.value })));
                      }}
                    >
                      <View style={styles.allocationInfo}>
                        <View style={[styles.allocationColorDot, { backgroundColor: allocation.color }]} />
                        <Text style={styles.allocationSector}>{allocation.marketCap}</Text>
                      </View>
                      <View style={styles.allocationValues}>
                        <Text style={styles.allocationPercentage}>{(allocation.percentage || 0).toFixed(2)}%</Text>
                        <Text style={styles.allocationValue}>${(allocation.value || 0).toLocaleString()}</Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              )}

              {allocationView === 'assetType' && (
                <>
                  {allocationData.assetType.map((allocation, index) => (
                    <Pressable 
                      key={allocation.assetType} 
                      style={[styles.allocationItem, index < allocationData.assetType.length - 1 && styles.allocationItemBorder]}
                      delayLongPress={500}
                      onLongPress={() => {
                        if (!contributionData) return;
                        const list = (contributionData.assetTypes?.[allocation.assetType] || []).slice(0, 5);
                        openContributionPopover(allocation.assetType, list.map((i: any) => ({ portfolioName: i.portfolioName, value: i.value })));
                      }}
                    >
                      <View style={styles.allocationInfo}>
                        <View style={[styles.allocationColorDot, { backgroundColor: allocation.color }]} />
                        <Text style={styles.allocationSector}>{allocation.assetType}</Text>
                      </View>
                      <View style={styles.allocationValues}>
                        <Text style={styles.allocationPercentage}>{(allocation.percentage || 0).toFixed(1)}%</Text>
                        <Text style={styles.allocationValue}>${(allocation.value || 0).toLocaleString()}</Text>
                      </View>
                    </Pressable>
                  ))}
                </>
              )}
        </View>

        {/* Recent Scenarios Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Stress Tests</Text>
          <TouchableOpacity onPress={navigateToScenarios} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Run stress test</Text>
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
              {typedPortfolios.slice(0, 2).map((portfolio: Portfolio) => (
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
                  <MiniChart data={indexSparklineData[index.symbol]} width={30} height={12} />
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

      {/* Slide-in Menu */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.menuModalRoot}>
          <TouchableOpacity style={styles.menuBackdrop} activeOpacity={1} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.menuSheet,
              { transform: [{ translateX: menuAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }] }
            ]}
          >
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={closeMenu} style={styles.menuCloseButton}>
                <Ionicons name="close" size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigation.navigate('Advisors' as never); }}>
              <Ionicons name="people-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Advisors</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigateToRiskReport(); }}>
              <Ionicons name="pulse-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Risk Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigateToPortfolio(); }}>
              <Ionicons name="briefcase-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Portfolio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); navigateToScenarios(); }}>
              <Ionicons name="flash-outline" size={20} color="#000" />
              <Text style={styles.menuItemText}>Scenarios</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

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
    paddingTop: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  loadingText: {
    marginTop: SPACING.sm,
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
  menuButtonOverlay: {
    position: 'absolute',
    right: 16,
    bottom: 10,
    padding: 6,
  },
  header: {
    paddingHorizontal: SPACING.screenPadding,
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
    paddingBottom: SPACING.sm,
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
  menuButton: {
    padding: 8,
  },
  card: {
    marginHorizontal: SPACING.screenPadding,
    marginBottom: SPACING.cardGap,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.cardPadding,
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
    marginBottom: SPACING.md,
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
    paddingHorizontal: SPACING.screenPadding,
    marginTop: SPACING.sectionTop,
    marginBottom: SPACING.sectionBottom,
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
    color: '#000000',
    fontWeight: '500',
  },
  portfolioCardsContainer: {
    paddingHorizontal: SPACING.screenPadding,
  },
  portfolioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: SPACING.cardPadding,
    marginBottom: SPACING.sm,
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
    marginBottom: SPACING.sm,
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
  menuModalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  menuSheet: {
    width: 260,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  menuCloseButton: {
    padding: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
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
  marketContextContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
}); 