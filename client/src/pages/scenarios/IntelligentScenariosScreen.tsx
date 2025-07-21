import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import portfolioService, { Portfolio, PortfolioSummary } from '../../services/portfolioService';
import intelligentStressTestService, {
  IntelligentStressResults,
  PortfolioComposition,
  IntelligentStressConfig
} from '../../services/intelligentStressTestService';
import IntelligentStressTestDemo from '../../components/demo/IntelligentStressTestDemo';
import StressTestResultsPopup from '../../components/stress-test/StressTestResultsPopup';
import { StressTestResult, structuredStressTestService } from '../../services/structuredStressTestService';

const IntelligentScenariosScreen: React.FC = () => {
  const [portfolios, setPortfolios] = useState<PortfolioSummary[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [composition, setComposition] = useState<PortfolioComposition | null>(null);
  const [stressResults, setStressResults] = useState<IntelligentStressResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIntensity, setSelectedIntensity] = useState<'mild' | 'moderate' | 'severe' | 'extreme'>('moderate');
  const [showDemo, setShowDemo] = useState(false);
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [detailedResults, setDetailedResults] = useState<StressTestResult | null>(null);

  useEffect(() => {
    loadPortfolios();
  }, []);

  const loadPortfolios = async () => {
    try {
      const portfolioSummaries = await portfolioService.getPortfolioSummaries();
      setPortfolios(portfolioSummaries);
      
      if (portfolioSummaries.length > 0 && !selectedPortfolio) {
        const firstPortfolio = await portfolioService.getPortfolioById(portfolioSummaries[0].id);
        if (firstPortfolio) {
          setSelectedPortfolio(firstPortfolio);
          analyzePortfolio(firstPortfolio);
        }
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
      Alert.alert('Error', 'Failed to load portfolios');
    }
  };

  const analyzePortfolio = async (portfolio: Portfolio) => {
    try {
      const portfolioComposition = intelligentStressTestService.analyzePortfolioComposition(portfolio);
      setComposition(portfolioComposition);
    } catch (error) {
      console.error('Error analyzing portfolio:', error);
    }
  };

  const handlePortfolioSelect = async (portfolioId: string) => {
    try {
      const portfolio = await portfolioService.getPortfolioById(portfolioId);
      if (portfolio) {
        setSelectedPortfolio(portfolio);
        setStressResults(null); // Clear previous results
        await analyzePortfolio(portfolio);
      }
    } catch (error) {
      console.error('Error selecting portfolio:', error);
      Alert.alert('Error', 'Failed to load portfolio details');
    }
  };

  const runIntelligentStressTest = async () => {
    if (!selectedPortfolio) {
      Alert.alert('Error', 'Please select a portfolio first');
      return;
    }

    setLoading(true);
    try {
      const config: IntelligentStressConfig = {
        portfolio: selectedPortfolio,
        stressIntensity: selectedIntensity,
        timeHorizon: 1,
        confidenceLevel: 0.95
      };

      const results = await intelligentStressTestService.runIntelligentStressTest(config);
      setStressResults(results);

      // Show results summary
      const impactPercentage = ((results.stressedValue - results.originalValue) / results.originalValue * 100);
      const factorCount = Object.keys(results.factorContributions).length;
      
      Alert.alert(
        'Intelligent Stress Test Complete',
        `Portfolio Impact: ${impactPercentage.toFixed(2)}%\n` +
        `Factors Applied: ${factorCount} (relevant only)\n` +
        `Recommendations: ${results.recommendedActions.length}`
      );
    } catch (error) {
      console.error('Error running stress test:', error);
      Alert.alert('Error', 'Failed to run stress test');
    } finally {
      setLoading(false);
    }
  };

  const runStructuredStressTest = async () => {
    if (!selectedPortfolio) {
      Alert.alert('Error', 'Please select a portfolio first');
      return;
    }

    setLoading(true);
    try {
      // Use the structured stress test service with existing portfolio and scenario
      const results = await structuredStressTestService.runStressTest(
        'TMPL0006', // Use existing scenario ID
        selectedPortfolio.id,
        {
          confidenceLevel: 0.95,
          timeHorizon: 1
        }
      );
      
      setDetailedResults(results);
      setShowDetailedResults(true);
      
    } catch (error) {
      console.error('Error running structured stress test:', error);
      Alert.alert('Error', 'Failed to run structured stress test');
    } finally {
      setLoading(false);
    }
  };

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'mild': return '#10b981';
      case 'moderate': return '#f59e0b';
      case 'severe': return '#ef4444';
      case 'extreme': return '#991b1b';
      default: return '#64748b';
    }
  };

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Intelligent Stress Testing</Text>
          <Text style={styles.subtitle}>Portfolio-composition-aware risk analysis</Text>
        </View>
        <TouchableOpacity 
          style={styles.demoButton}
          onPress={() => setShowDemo(true)}
        >
          <MaterialCommunityIcons name="lightbulb-outline" size={20} color="#3b82f6" />
          <Text style={styles.demoButtonText}>Demo</Text>
        </TouchableOpacity>
      </View>

      {/* Portfolio Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Portfolio</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}>
          {portfolios.map((portfolio) => (
            <TouchableOpacity
              key={portfolio.id}
              style={[
                styles.portfolioCard,
                selectedPortfolio?.id === portfolio.id && styles.portfolioCardSelected
              ]}
              onPress={() => handlePortfolioSelect(portfolio.id)}
            >
              <Text style={styles.portfolioName}>{portfolio.name}</Text>
              <Text style={styles.portfolioValue}>{formatCurrency(portfolio.totalValue)}</Text>
              <Text style={styles.portfolioAssets}>{portfolio.assetCount} assets</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Portfolio Composition Analysis */}
      {composition && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Composition</Text>
          <View style={styles.compositionCard}>
            <View style={styles.compositionHeader}>
              <View style={styles.compositionMetric}>
                <Text style={styles.compositionLabel}>Total Value</Text>
                <Text style={styles.compositionValue}>{formatCurrency(composition.totalValue)}</Text>
              </View>
              <View style={styles.compositionMetric}>
                <Text style={styles.compositionLabel}>Concentration</Text>
                <Text style={[
                  styles.compositionValue,
                  { 
                    color: composition.concentrationLevel === 'high' ? '#ef4444' : 
                           composition.concentrationLevel === 'medium' ? '#f59e0b' : '#10b981' 
                  }
                ]}>
                  {composition.concentrationLevel.toUpperCase()}
                </Text>
              </View>
              <View style={styles.compositionMetric}>
                <Text style={styles.compositionLabel}>Asset Classes</Text>
                <Text style={styles.compositionValue}>{Object.keys(composition.assetClassWeights).length}</Text>
              </View>
            </View>
            
            {/* Asset Class Breakdown */}
            <View style={styles.assetClassSection}>
              <Text style={styles.subsectionTitle}>Asset Class Allocation</Text>
              {Object.entries(composition.assetClassWeights).map(([assetClass, weight]) => (
                <View key={assetClass} style={styles.assetClassRow}>
                  <View style={styles.assetClassInfo}>
                    <View style={[styles.assetClassDot, { backgroundColor: getAssetClassColor(assetClass) }]} />
                    <Text style={styles.assetClassName}>
                      {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.assetClassWeight}>{(weight * 100).toFixed(2)}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Stress Test Configuration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stress Test Configuration</Text>
        <View style={styles.configCard}>
          <Text style={styles.configLabel}>Stress Intensity</Text>
          <View style={styles.intensityButtons}>
            {(['mild', 'moderate', 'severe', 'extreme'] as const).map((intensity) => (
              <TouchableOpacity
                key={intensity}
                style={[
                  styles.intensityButton,
                  {
                    backgroundColor: selectedIntensity === intensity ? getIntensityColor(intensity) : '#f1f5f9',
                    borderColor: getIntensityColor(intensity)
                  }
                ]}
                onPress={() => setSelectedIntensity(intensity)}
              >
                <Text style={[
                  styles.intensityButtonText,
                  { color: selectedIntensity === intensity ? '#ffffff' : getIntensityColor(intensity) }
                ]}>
                  {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.runButton}
            onPress={runIntelligentStressTest}
            disabled={loading || !selectedPortfolio}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialCommunityIcons name="flask" size={20} color="#ffffff" />
                <Text style={styles.runButtonText}>Run Intelligent Stress Test</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.runButton, { backgroundColor: '#8b5cf6', marginTop: 12 }]}
            onPress={runStructuredStressTest}
            disabled={loading || !selectedPortfolio}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <MaterialCommunityIcons name="chart-line" size={20} color="#ffffff" />
                <Text style={styles.runButtonText}>View Detailed Asset Breakdown</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stress Test Results */}
      {stressResults && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intelligent Stress Test Results</Text>
          
          {/* Summary Card */}
          <View style={styles.resultsCard}>
            <View style={styles.resultsSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Impact</Text>
                <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
                  {formatPercentage(-stressResults.totalImpact)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Stressed Value</Text>
                <Text style={styles.summaryValue}>{formatCurrency(stressResults.stressedValue)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Relevant Factors</Text>
                <Text style={styles.summaryValue}>{Object.keys(stressResults.factorContributions).length}</Text>
              </View>
            </View>
          </View>

          {/* Factor Contributions */}
          <View style={styles.factorsCard}>
            <Text style={styles.subsectionTitle}>Factor Contributions</Text>
            {Object.entries(stressResults.factorContributions).map(([factorId, data]) => (
              <View key={factorId} style={styles.factorRow}>
                <View style={styles.factorInfo}>
                  <Text style={styles.factorName}>
                    {factorId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                  <Text style={styles.factorDescription}>{data.description}</Text>
                </View>
                <View style={styles.factorMetrics}>
                  <Text style={styles.factorRelevance}>Relevance: {data.relevance}%</Text>
                  <Text style={[styles.factorImpact, { color: '#ef4444' }]}>
                    {formatPercentage(-data.impact)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Asset Class Impacts */}
          <View style={styles.impactsCard}>
            <Text style={styles.subsectionTitle}>Impact by Asset Class</Text>
            {Object.entries(stressResults.assetClassImpacts).map(([assetClass, impact]) => (
              <View key={assetClass} style={styles.impactRow}>
                <View style={styles.assetClassInfo}>
                  <View style={[styles.assetClassDot, { backgroundColor: getAssetClassColor(assetClass) }]} />
                  <Text style={styles.assetClassName}>
                    {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)}
                  </Text>
                </View>
                <Text style={[styles.impactValue, { color: impact < 0 ? '#ef4444' : '#10b981' }]}>
                  {formatPercentage(impact)}
                </Text>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          {stressResults.recommendedActions.length > 0 && (
            <View style={styles.recommendationsCard}>
              <Text style={styles.subsectionTitle}>Recommended Actions</Text>
              {stressResults.recommendedActions.map((action, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <MaterialCommunityIcons name="lightbulb" size={16} color="#f59e0b" />
                  <Text style={styles.recommendationText}>{action}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Demo Modal */}
      <Modal visible={showDemo} animationType="slide" presentationStyle="pageSheet">
        <IntelligentStressTestDemo onClose={() => setShowDemo(false)} />
      </Modal>

      {/* Detailed Results Popup */}
      <StressTestResultsPopup
        visible={showDetailedResults}
        onClose={() => setShowDetailedResults(false)}
        results={detailedResults}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  portfolioScroll: {
    flexDirection: 'row',
  },
  portfolioCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 160,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  portfolioCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  portfolioName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  portfolioValue: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  portfolioAssets: {
    fontSize: 12,
    color: '#94a3b8',
  },
  compositionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compositionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  compositionMetric: {
    flex: 1,
    alignItems: 'center',
  },
  compositionLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  compositionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  assetClassSection: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  assetClassRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  assetClassInfo: {
    flexDirection: 'row',
    alignItems: 'center',
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
  assetClassWeight: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  configCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 12,
  },
  intensityButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  intensityButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  runButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  resultsSummary: {
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
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  factorsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  factorInfo: {
    flex: 2,
  },
  factorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  factorDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  factorMetrics: {
    flex: 1,
    alignItems: 'flex-end',
  },
  factorRelevance: {
    fontSize: 12,
    color: '#3b82f6',
    marginBottom: 2,
  },
  factorImpact: {
    fontSize: 14,
    fontWeight: '500',
  },
  impactsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  impactValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  recommendationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    gap: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
});

export default IntelligentScenariosScreen; 