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
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StressTestResult, structuredStressTestService } from '../../services/structuredStressTestService';
import displayNameService from '../../services/displayNameService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// ==========================================
// ASSET BREAKDOWN CARD COMPONENT
// ==========================================

interface AssetBreakdownCardProps {
  asset: any;
  rank: number;
  portfolioValue?: number;
}

const AssetBreakdownCard: React.FC<AssetBreakdownCardProps> = ({ asset, rank, portfolioValue }) => {
  const [expanded, setExpanded] = useState(false);
  
  // Early return if asset is undefined or invalid
  if (!asset || typeof asset !== 'object') {
    return (
      <View style={styles.assetBreakdownCard}>
        <Text style={styles.errorText}>Invalid asset data</Text>
      </View>
    );
  }
  
  const getAssetTypeColor = (assetType: string | undefined): string => {
    const colors: Record<string, string> = {
      equity: '#3b82f6',
      bond: '#10b981',
      cash: '#f59e0b',
      commodity: '#ef4444',
      alternative: '#8b5cf6',
      real_estate: '#0ea5e9',
      reit: '#0ea5e9',
    };
    if (!assetType) return '#64748b';
    return colors[assetType.toLowerCase()] || '#64748b';
  };

  // Safe derivations for display
  const displayTypeRaw = (asset?.assetType || asset?.assetClass || 'N/A');
  const displayType = typeof displayTypeRaw === 'string' ? displayTypeRaw : 'N/A';
  const computedWeight = typeof asset?.weight === 'number'
    ? asset.weight
    : (typeof asset?.current_value === 'number' && typeof portfolioValue === 'number' && portfolioValue > 0)
      ? (asset.current_value / portfolioValue)
      : 0;
  
  return (
    <View style={styles.assetBreakdownCard}>
      {/* Asset Header - ALWAYS VISIBLE */}
      <TouchableOpacity 
        style={styles.assetHeader} 
        onPress={() => setExpanded(!expanded)}
      >
        {/* Rank & Symbol */}
        <View style={styles.assetRankSection}>
          <View style={styles.rankBadge}>
            <Text style={styles.rankNumber}>#{rank}</Text>
          </View>
          <View style={styles.assetSymbolSection}>
            <Text style={styles.assetSymbol}>{asset?.symbol ?? 'N/A'}</Text>
            <Text style={styles.assetName} numberOfLines={1}>
              {asset?.name ?? 'Unknown Asset'}
            </Text>
          </View>
        </View>

        {/* Asset Type Badge */}
        <View style={styles.assetTypeSection}>
          <View style={[
            styles.assetTypeBadge,
            { backgroundColor: getAssetTypeColor((asset?.assetType || '').toString()) }
          ]}>
            <Text style={styles.assetTypeText}>
              {typeof displayType === 'string' ? displayType.toUpperCase() : 'UNKNOWN'}
            </Text>
          </View>
        </View>

        {/* Impact Summary - ALWAYS VISIBLE */}
        <View style={styles.impactSummary}>
          <Text style={[
            styles.impactValue,
            { color: (asset?.impact_value ?? 0) >= 0 ? '#10b981' : '#ef4444' }
          ]}>
            {structuredStressTestService.formatCurrency(asset?.impact_value ?? 0)}
          </Text>
          <Text style={[
            styles.impactPercent,
            { color: (asset?.impact_percent ?? 0) >= 0 ? '#10b981' : '#ef4444' }
          ]}>
            {structuredStressTestService.formatPercentage(asset?.impact_percent ?? 0)}
          </Text>
        </View>

        {/* Expand/Collapse Icon */}
        <MaterialCommunityIcons 
          name={expanded ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6b7280" 
        />
      </TouchableOpacity>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.expandedDetails}>
          {/* Asset Identification Section */}
          <View style={styles.identificationSection}>
            <Text style={styles.sectionTitle}>Asset Details</Text>
            <View style={styles.identificationGrid}>
              <View style={styles.identificationItem}>
                <Text style={styles.identificationLabel}>Asset Class</Text>
                <Text style={styles.identificationValue}>{asset?.assetClass ?? 'N/A'}</Text>
              </View>
              <View style={styles.identificationItem}>
                <Text style={styles.identificationLabel}>Sector</Text>
                <Text style={styles.identificationValue}>{asset?.sector ?? 'N/A'}</Text>
              </View>
              <View style={styles.identificationItem}>
                <Text style={styles.identificationLabel}>Quantity</Text>
                <Text style={styles.identificationValue}>{asset?.quantity != null ? asset.quantity.toLocaleString() : 'N/A'}</Text>
              </View>
              <View style={styles.identificationItem}>
                <Text style={styles.identificationLabel}>Portfolio Weight</Text>
                <Text style={styles.identificationValue}>{(computedWeight * 100).toFixed(1)}%</Text>
              </View>
            </View>
          </View>

          {/* Value Impact Section */}
          <View style={styles.valueImpactSection}>
            <Text style={styles.sectionTitle}>Value Impact</Text>
            <View style={styles.valueComparison}>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>Current Price</Text>
                <Text style={styles.valueAmount}>
                  {typeof asset?.price === 'number' ? `$${asset.price.toFixed(2)}` : 'N/A'}
                </Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>Current Value</Text>
                <Text style={styles.valueAmount}>
                  {structuredStressTestService.formatCurrency(asset?.current_value ?? 0)}
                </Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>Stressed Value</Text>
                <Text style={[
                  styles.valueAmount,
                  { color: (asset?.stressed_value ?? 0) >= (asset?.current_value ?? 0) ? '#10b981' : '#ef4444' }
                ]}>
                  {structuredStressTestService.formatCurrency(asset?.stressed_value ?? 0)}
                </Text>
              </View>
              <View style={styles.valueRow}>
                <Text style={styles.valueLabel}>Portfolio Contribution</Text>
                <Text style={[
                  styles.valueAmount,
                  { color: (asset?.contribution_to_portfolio ?? 0) >= 0 ? '#10b981' : '#ef4444' }
                ]}>
                  {structuredStressTestService.formatPercentage(asset?.contribution_to_portfolio ?? 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Factor Breakdown Section */}
          <View style={styles.factorBreakdownSection}>
            <Text style={styles.sectionTitle}>Factor Contributions</Text>
            <Text style={styles.sectionSubtitle}>
              How each risk factor contributed to this asset's stress impact
            </Text>
            {Object.entries(asset?.factor_contributions ?? {})
              .filter(([_, value]) => value != null && typeof value === 'number' && Math.abs(value) > 0.01)
              .map(([factor, value]) => (
                <View key={factor} style={styles.factorRow}>
                  <View style={styles.assetFactorHeader}>
                    <Text style={styles.factorName}>{typeof factor === 'string' ? factor.toUpperCase() : ''}</Text>
                    <Text style={[
                      styles.factorImpact,
                      { color: (value as number) >= 0 ? '#10b981' : '#ef4444' }
                    ]}>
                      {structuredStressTestService.formatPercentage(value as number ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.factorBar}>
                    <View style={[
                      styles.factorBarFill,
                      { 
                        width: `${Math.min(100, Math.abs(value as number ?? 0))}%`,
                        backgroundColor: (value as number ?? 0) >= 0 ? '#10b981' : '#ef4444'
                      }
                    ]} />
                  </View>
                </View>
              ))}
          </View>
        </View>
      )}
    </View>
  );
};

// ==========================================
// TYPES
// ==========================================

interface StressTestResultsPopupProps {
  visible?: boolean;
  onClose?: () => void;
  results?: StressTestResult | null;
  onRefresh?: () => void;
}

interface TabType {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

const StressTestResultsPopup: React.FC<StressTestResultsPopupProps> = React.memo((props) => {
  // Ultimate defensive prop handling to prevent any re-render issues
  if (!React || !useState || !useEffect) {
    console.error('React hooks not available in StressTestResultsPopup');
    return null;
  }

  if (!props || typeof props !== 'object') {
    console.error('StressTestResultsPopup: Invalid props received', props);
    return null; // Return null instead of JSX to prevent any rendering issues
  }

  // Early exit if not visible to prevent any rendering issues
  if (!props.visible) {
    return null;
  }

  const {
    visible = false,
    onClose = () => {},
    results = null,
    onRefresh,
  } = props;

  // Additional safety checks
  const isVisible = Boolean(visible);
  const safeOnClose = React.useCallback(() => {
    try {
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('Error in onClose:', error);
    }
  }, [onClose]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [displayNames, setDisplayNames] = useState<{
    scenarioName: string;
    portfolioName: string;
  }>({
    scenarioName: '',
    portfolioName: ''
  });

  // Load display names when results change
  useEffect(() => {
    const loadDisplayNames = async () => {
      if (results && results.metadata) {
        try {
          const scenarioName = await displayNameService.getScenarioDisplayName(results.metadata.scenarioId);
          const portfolioName = await displayNameService.getPortfolioDisplayName(results.metadata.portfolioId);
          
          setDisplayNames({
            scenarioName,
            portfolioName
          });
        } catch (error) {
          console.error('Error loading display names:', error);
          // Fallback to metadata names if display name service fails
          setDisplayNames({
            scenarioName: results.metadata?.scenarioName || results.metadata?.scenarioId || 'Unknown Scenario',
            portfolioName: results.metadata?.portfolioName || results.metadata?.portfolioId || 'Unknown Portfolio'
          });
        }
      }
    };

    // Use a timeout to prevent blocking the render cycle
    const timeoutId = setTimeout(loadDisplayNames, 0);
    return () => clearTimeout(timeoutId);
  }, [results]);

  const tabs: TabType[] = [
    { key: 'overview', title: 'Overview', icon: 'analytics' },
    { key: 'assets', title: 'Assets', icon: 'list' },
    { key: 'factors', title: 'Factors', icon: 'bar-chart' },
    { key: 'breakdown', title: 'Asset Breakdown', icon: 'pie-chart' },
    { key: 'risk', title: 'Risk', icon: 'warning' },
    { key: 'greeks', title: 'Greeks', icon: 'calculator' },
  ];

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const exportToPDF = async () => {
    try {
      Alert.alert('Export', 'PDF export feature coming soon!');
    } catch (error) {
      Alert.alert('Error', 'Failed to export PDF');
    }
  };

  // ==========================================
  // RENDER METHODS
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Ionicons name="analytics" size={24} color="#1f2937" />
        <Text style={styles.headerTitle}>Stress Test Results</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={exportToPDF} style={styles.headerButton}>
          <Ionicons name="download" size={20} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={styles.headerButton}>
          <Ionicons name="close" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? '#3b82f6' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderOverviewTab = () => {
    if (!results) return null;

    const impactColor = results.totalImpactPercent >= 0 ? '#10b981' : '#ef4444';
    const impactIcon = results.totalImpactPercent >= 0 ? 'trending-up' : 'trending-down';

    return (
      <ScrollView style={styles.tabContent}>
        {/* Portfolio Impact Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Portfolio Impact Summary</Text>
          <View style={styles.impactSummary}>
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Current Value</Text>
              <Text style={styles.impactValue}>
                {structuredStressTestService.formatCurrency(results.portfolioValue)}
              </Text>
            </View>
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Stressed Value</Text>
              <Text style={styles.impactValue}>
                {structuredStressTestService.formatCurrency(results.stressedValue)}
              </Text>
            </View>
            <View style={[styles.impactRow, styles.totalImpactRow]}>
              <Text style={styles.impactLabel}>Total Impact</Text>
              <View style={styles.impactValueContainer}>
                <Ionicons name={impactIcon} size={20} color={impactColor} />
                <Text style={[styles.impactValue, { color: impactColor }]}>
                  {structuredStressTestService.formatPercentage(results.totalImpactPercent)}
                </Text>
                <Text style={[styles.impactValue, { color: impactColor }]}>
                  ({structuredStressTestService.formatCurrency(results.totalImpact)})
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Scenario Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scenario Information</Text>
          <View style={styles.scenarioInfo}>
            <Text style={styles.scenarioName}>{displayNames.scenarioName}</Text>
            <Text style={styles.scenarioId}>ID: {results.metadata.scenarioId}</Text>
            <Text style={styles.portfolioName}>Portfolio: {displayNames.portfolioName}</Text>
            <Text style={styles.calculationTime}>
              Calculated: {new Date(results.metadata.calculationTime).toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Asset Class Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Asset Class Impact</Text>
          {Object.entries(results.assetClassImpacts).map(([assetClass, impact]) => (
            <View key={assetClass} style={styles.assetClassRow}>
              <View style={styles.assetClassHeader}>
                <Text style={styles.assetClassName}>{assetClass}</Text>
                <Text style={styles.assetClassWeight}>
                  {((impact.weight || 0) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.assetClassImpact}>
                <Text style={styles.assetClassValue}>
                  {structuredStressTestService.formatCurrency(impact.current_value)}
                </Text>
                <Text style={[
                  styles.assetClassPercent,
                  { color: impact.impact_percent >= 0 ? '#10b981' : '#ef4444' }
                ]}>
                  {structuredStressTestService.formatPercentage(impact.impact_percent)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Statistics</Text>
          <View style={styles.quickStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{results.metadata.assetsCount}</Text>
              <Text style={styles.statLabel}>Assets</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {((results.riskMetrics.concentration || 0) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Concentration</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {((results.riskMetrics.diversification || 0) * 100).toFixed(1)}%
              </Text>
              <Text style={styles.statLabel}>Diversification</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {((results.riskMetrics.coverage || 0) * 100).toFixed(0)}%
              </Text>
              <Text style={styles.statLabel}>Coverage</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderAssetsTab = () => {
    if (!results) return null;

    const topContributors = structuredStressTestService.getTopContributors(
      results.assetResults?.filter(asset => asset && typeof asset === 'object') || [], 
      10
    );

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Impact Contributors</Text>
          {topContributors.map((asset, index) => (
            <View key={asset.symbol} style={styles.assetRow}>
              <View style={styles.assetRowHeader}>
                <Text style={styles.assetRank}>#{index + 1}</Text>
                <View style={styles.assetInfo}>
                  <Text style={styles.assetSymbol}>{asset.symbol}</Text>
                  <Text style={styles.assetName}>{asset.name}</Text>
                </View>
                <View style={styles.assetTypeContainer}>
                  <View style={[
                    styles.assetTypeBadge,
                    { backgroundColor: structuredStressTestService.getAssetTypeColor((asset.assetType || '').toString()) }
                  ]}>
                    <Text style={styles.assetTypeText}>{typeof asset.assetType === 'string' ? asset.assetType.toUpperCase() : 'UNKNOWN'}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.assetMetrics}>
                <View style={styles.assetMetric}>
                  <Text style={styles.assetMetricLabel}>Weight</Text>
                  <Text style={styles.assetMetricValue}>{((asset.weight || 0) * 100).toFixed(1)}%</Text>
                </View>
                <View style={styles.assetMetric}>
                  <Text style={styles.assetMetricLabel}>Current Value</Text>
                  <Text style={styles.assetMetricValue}>
                    {structuredStressTestService.formatCurrency(asset.current_value)}
                  </Text>
                </View>
                <View style={styles.assetMetric}>
                  <Text style={styles.assetMetricLabel}>Impact</Text>
                  <Text style={[
                    styles.assetMetricValue,
                    { color: asset.impact_percent >= 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {structuredStressTestService.formatPercentage(asset.impact_percent)}
                  </Text>
                </View>
                <View style={styles.assetMetric}>
                  <Text style={styles.assetMetricLabel}>Contribution</Text>
                  <Text style={[
                    styles.assetMetricValue,
                    { color: asset.contribution_to_portfolio >= 0 ? '#10b981' : '#ef4444' }
                  ]}>
                    {structuredStressTestService.formatPercentage(asset.contribution_to_portfolio)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderFactorsTab = () => {
    if (!results) return null;

    const factorSummary = structuredStressTestService.calculateFactorImpactSummary(results.factorAttribution);

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Factor Attribution</Text>
          <Text style={styles.cardSubtitle}>
            Breakdown of portfolio impact by risk factors
          </Text>
          {factorSummary.map((factor) => (
            <View key={factor.factor} style={styles.factorAttributionRow}>
              <View style={styles.factorHeader}>
                <Text style={styles.factorName}>{typeof factor.factor === 'string' ? factor.factor.toUpperCase() : ''}</Text>
                <Text style={styles.factorPercentage}>{(factor.percentage || 0).toFixed(1)}%</Text>
              </View>
              <View style={styles.factorImpactContainer}>
                <View style={[
                  styles.factorImpactBar,
                  { 
                    width: `${factor.percentage}%`,
                    backgroundColor: factor.impact >= 0 ? '#10b981' : '#ef4444'
                  }
                ]} />
                <Text style={[
                  styles.factorImpactText,
                  { color: factor.impact >= 0 ? '#10b981' : '#ef4444' }
                ]}>
                  {structuredStressTestService.formatPercentage(factor.impact)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scenario Factors</Text>
          <Text style={styles.cardSubtitle}>
            Applied stress factors for this scenario
          </Text>
          {Object.entries(results.scenarioFactors).map(([factor, value]) => (
            <View key={factor} style={styles.scenarioFactorRow}>
              <Text style={styles.scenarioFactorName}>{typeof factor === 'string' ? factor.toUpperCase() : ''}</Text>
              <Text style={[
                styles.scenarioFactorValue,
                { color: value >= 0 ? '#10b981' : '#ef4444' }
              ]}>
                {factor === 'equity' || factor === 'commodity' || factor === 'fx' 
                  ? `${(value || 0) >= 0 ? '+' : ''}${(value || 0).toFixed(1)}%`
                  : `${(value || 0) >= 0 ? '+' : ''}${(value || 0).toFixed(0)}bps`
                }
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderAssetBreakdownTab = () => {
    if (!results) return null;

    return (
      <ScrollView style={styles.tabContent}>
        {/* Portfolio Stress Impact Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Portfolio Stress Impact Summary</Text>
          <Text style={styles.cardSubtitle}>
            How the stress scenario affected your entire portfolio
          </Text>
          <View style={styles.portfolioSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Assets</Text>
              <Text style={styles.summaryValue}>{results.assetResults?.length || 0}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Portfolio Value</Text>
              <Text style={styles.summaryValue}>
                {structuredStressTestService.formatCurrency(results.portfolioValue)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Impact</Text>
              <Text style={[
                styles.summaryValue,
                { color: results.totalImpactPercent >= 0 ? '#10b981' : '#ef4444' }
              ]}>
                {structuredStressTestService.formatCurrency(results.totalImpact)} 
                ({structuredStressTestService.formatPercentage(results.totalImpactPercent)})
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Assets with Impact</Text>
              <Text style={styles.summaryValue}>
                {results.assetResults?.filter(a => a && typeof a.impact_value === 'number' && Math.abs(a.impact_value) > 0.01).length || 0} of {results.assetResults?.length || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Individual Asset Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Individual Asset Impact Analysis</Text>
          <Text style={styles.cardSubtitle}>
            Detailed breakdown showing how each asset in your portfolio was affected by the stress scenario
          </Text>
          
          {(results.assetResults || [])
            .filter(asset => asset && typeof asset === 'object' && asset.symbol && typeof asset.impact_value === 'number')
            .sort((a, b) => Math.abs(b.impact_value || 0) - Math.abs(a.impact_value || 0))
            .map((asset, index) => (
              <AssetBreakdownCard key={asset.symbol || `asset-${index}`} asset={asset} rank={index + 1} portfolioValue={results.portfolioValue} />
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderRiskTab = () => {
    if (!results) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Risk Metrics</Text>
          <View style={styles.riskMetricRow}>
            <Text style={styles.riskMetricLabel}>Concentration Risk</Text>
            <Text style={styles.riskMetricValue}>
              {((results.riskMetrics.concentration || 0) * 100).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.riskMetricDescription}>
            Herfindahl-Hirschman Index measuring portfolio concentration
          </Text>

          <View style={styles.riskMetricRow}>
            <Text style={styles.riskMetricLabel}>Diversification Benefit</Text>
            <Text style={styles.riskMetricValue}>
              {((results.riskMetrics.diversification || 0) * 100).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.riskMetricDescription}>
            Benefit from portfolio diversification
          </Text>

          <View style={styles.riskMetricRow}>
            <Text style={styles.riskMetricLabel}>Stress Test Coverage</Text>
            <Text style={styles.riskMetricValue}>
              {((results.riskMetrics.coverage || 0) * 100).toFixed(0)}%
            </Text>
          </View>
          <Text style={styles.riskMetricDescription}>
            Percentage of assets with measurable stress impact
          </Text>

          <View style={styles.riskMetricRow}>
            <Text style={styles.riskMetricLabel}>Tail Risk</Text>
            <Text style={[
              styles.riskMetricValue,
              { color: (results.riskMetrics.tailRisk || 0) <= -5 ? '#ef4444' : '#6b7280' }
            ]}>
              {(results.riskMetrics.tailRisk || 0).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.riskMetricDescription}>
            5th percentile of asset impact distribution
          </Text>

          <View style={styles.riskMetricRow}>
            <Text style={styles.riskMetricLabel}>Volatility Impact</Text>
            <Text style={styles.riskMetricValue}>
              {((results.riskMetrics.volatilityImpact || 0) * 100).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.riskMetricDescription}>
            Additional impact from increased volatility
          </Text>
        </View>
      </ScrollView>
    );
  };

  const renderGreeksTab = () => {
    if (!results) return null;

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Portfolio Greeks</Text>
          <Text style={styles.cardSubtitle}>
            Sensitivity measures for portfolio risk management
          </Text>

          <View style={styles.greekRow}>
            <View style={styles.greekHeader}>
              <Text style={styles.greekName}>Delta (Δ)</Text>
              <Text style={styles.greekValue}>{(results.greeks.delta || 0).toFixed(3)}</Text>
            </View>
            <Text style={styles.greekDescription}>
              Sensitivity to equity market movements
            </Text>
          </View>

          <View style={styles.greekRow}>
            <View style={styles.greekHeader}>
              <Text style={styles.greekName}>Gamma (Γ)</Text>
              <Text style={styles.greekValue}>{(results.greeks.gamma || 0).toFixed(3)}</Text>
            </View>
            <Text style={styles.greekDescription}>
              Rate of change of delta
            </Text>
          </View>

          <View style={styles.greekRow}>
            <View style={styles.greekHeader}>
              <Text style={styles.greekName}>Theta (Θ)</Text>
              <Text style={styles.greekValue}>{(results.greeks.theta || 0).toFixed(3)}</Text>
            </View>
            <Text style={styles.greekDescription}>
              Time decay impact
            </Text>
          </View>

          <View style={styles.greekRow}>
            <View style={styles.greekHeader}>
              <Text style={styles.greekName}>Vega (ν)</Text>
              <Text style={styles.greekValue}>{(results.greeks.vega || 0).toFixed(3)}</Text>
            </View>
            <Text style={styles.greekDescription}>
              Sensitivity to volatility changes
            </Text>
          </View>

          <View style={styles.greekRow}>
            <View style={styles.greekHeader}>
              <Text style={styles.greekName}>Rho (ρ)</Text>
              <Text style={styles.greekValue}>{(results.greeks.rho || 0).toFixed(3)}</Text>
            </View>
            <Text style={styles.greekDescription}>
              Sensitivity to interest rate changes
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'assets':
        return renderAssetsTab();
      case 'factors':
        return renderFactorsTab();
      case 'breakdown':
        return renderAssetBreakdownTab();
      case 'risk':
        return renderRiskTab();
      case 'greeks':
        return renderGreeksTab();
      default:
        return renderOverviewTab();
    }
  };

  // ==========================================
  // MAIN RENDER
  // ==========================================

  if (!results) {
    return (
      <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          {renderHeader()}
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No stress test results available</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {renderHeader()}
        {renderTabs()}
        <View style={styles.content}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
});

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  impactSummary: {
    marginTop: 8,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  totalImpactRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  impactLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  impactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  impactValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scenarioInfo: {
    marginTop: 8,
  },
  scenarioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  scenarioId: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  portfolioName: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 4,
  },
  calculationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  assetClassRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  assetClassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assetClassName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  assetClassWeight: {
    fontSize: 12,
    color: '#6b7280',
  },
  assetClassImpact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetClassValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  assetClassPercent: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  assetRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  assetRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  assetRank: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 12,
    minWidth: 24,
  },
  assetInfo: {
    flex: 1,
  },
  assetSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  assetName: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  assetTypeContainer: {
    marginLeft: 8,
  },
  assetTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  assetTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  assetMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  assetMetric: {
    alignItems: 'center',
    flex: 1,
  },
  assetMetricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  assetMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  factorAttributionRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  factorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  factorPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  factorImpactContainer: {
    position: 'relative',
    height: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    overflow: 'hidden',
  },
  factorImpactBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 10,
  },
  factorImpactText: {
    position: 'absolute',
    right: 8,
    top: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  scenarioFactorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scenarioFactorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  scenarioFactorValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  riskMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  riskMetricLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  riskMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  riskMetricDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
    marginBottom: 12,
  },
  greekRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  greekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  greekName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  greekValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  greekDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  portfolioSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  assetBreakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  assetRankSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  rankNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  assetSymbolSection: {
    flex: 1,
  },
  assetTypeSection: {
    marginLeft: 12,
  },
  expandedDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  identificationSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  identificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  identificationItem: {
    width: '48%', // Two items per row
  },
  identificationLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  identificationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  valueImpactSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  valueComparison: {
    marginTop: 8,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  valueLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  factorBreakdownSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  factorRow: {
    marginBottom: 12,
  },
  factorImpact: {
    fontSize: 12,
    fontWeight: '600',
  },
  factorBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  impactPercent: {
    fontSize: 12,
    marginTop: 2,
  },
  assetFactorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
});

export default StressTestResultsPopup; 