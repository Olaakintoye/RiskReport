import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Portfolio, Asset } from '../../services/portfolioService';
import intelligentStressTestService, { 
  IntelligentStressResults, 
  PortfolioComposition,
  AssetClass 
} from '../../services/intelligentStressTestService';

interface DemoProps {
  onClose: () => void;
}

const IntelligentStressTestDemo: React.FC<DemoProps> = ({ onClose }) => {
  const [selectedPortfolio, setSelectedPortfolio] = useState<'equity' | 'bond' | 'balanced'>('equity');
  const [stressResults, setStressResults] = useState<IntelligentStressResults | null>(null);
  const [composition, setComposition] = useState<PortfolioComposition | null>(null);
  const [traditionalResults, setTraditionalResults] = useState<any>(null);

  // Create sample portfolios to demonstrate the concept
  const samplePortfolios = {
    equity: {
      id: 'equity-demo',
      name: 'Pure Equity Portfolio',
      assets: [
        { id: '1', symbol: 'AAPL', name: 'Apple Inc.', quantity: 100, price: 180, assetClass: 'equity' },
        { id: '2', symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 75, price: 420, assetClass: 'equity' },
        { id: '3', symbol: 'GOOGL', name: 'Alphabet Inc.', quantity: 25, price: 2800, assetClass: 'equity' },
        { id: '4', symbol: 'AMZN', name: 'Amazon.com Inc.', quantity: 30, price: 3500, assetClass: 'equity' }
      ]
    } as Portfolio,
    
    bond: {
      id: 'bond-demo',
      name: 'Pure Bond Portfolio', 
      assets: [
        { id: '1', symbol: 'AGG', name: 'iShares Core Aggregate Bond ETF', quantity: 1000, price: 105, assetClass: 'bond' },
        { id: '2', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', quantity: 800, price: 78, assetClass: 'bond' },
        { id: '3', symbol: 'VCIT', name: 'Vanguard Intermediate Corp Bond', quantity: 600, price: 85, assetClass: 'bond' },
        { id: '4', symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', quantity: 200, price: 95, assetClass: 'bond' }
      ]
    } as Portfolio,
    
    balanced: {
      id: 'balanced-demo',
      name: 'Balanced Portfolio',
      assets: [
        { id: '1', symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', quantity: 300, price: 220, assetClass: 'equity' },
        { id: '2', symbol: 'BND', name: 'Vanguard Total Bond Market ETF', quantity: 400, price: 78, assetClass: 'bond' },
        { id: '3', symbol: 'VNQ', name: 'Vanguard Real Estate ETF', quantity: 100, price: 80, assetClass: 'real_estate' },
        { id: '4', symbol: 'VTEB', name: 'Vanguard Tax-Exempt Bond ETF', quantity: 200, price: 52, assetClass: 'cash' }
      ]
    } as Portfolio
  };

  useEffect(() => {
    runStressTestComparison();
  }, [selectedPortfolio]);

  const runStressTestComparison = async () => {
    const portfolio = samplePortfolios[selectedPortfolio];
    
    // Analyze portfolio composition
    const portfolioComposition = intelligentStressTestService.analyzePortfolioComposition(portfolio);
    setComposition(portfolioComposition);
    
    // Run intelligent stress test
    const intelligentResults = await intelligentStressTestService.runIntelligentStressTest({
      portfolio,
      stressIntensity: 'moderate',
      timeHorizon: 1,
      confidenceLevel: 0.95
    });
    setStressResults(intelligentResults);
    
    // Simulate traditional stress test (applies all factors uniformly)
    const traditionalImpact = simulateTraditionalStressTest(portfolio);
    setTraditionalResults(traditionalImpact);
  };

  // Simulate how traditional stress testing would work (applying all factors)
  const simulateTraditionalStressTest = (portfolio: Portfolio) => {
    const totalValue = portfolio.assets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0);
    
    // Traditional approach: apply all market factors regardless of portfolio composition
    const traditionalFactors = {
      equity: -15,     // 15% equity decline
      rates: 100,      // 100bps rate increase  
      credit: 150,     // 150bps credit spread widening
      fx: -5,          // 5% FX decline
      commodity: -10   // 10% commodity decline
    };
    
    // Simple weighted average impact (doesn't consider portfolio composition intelligently)
    const totalTraditionalImpact = 8.5; // Rough average of all factors
    const stressedValue = totalValue * (1 - totalTraditionalImpact / 100);
    
    return {
      originalValue: totalValue,
      stressedValue,
      totalImpact: totalTraditionalImpact,
      appliedFactors: Object.keys(traditionalFactors).length,
      factorsUsed: 'All market factors applied uniformly'
    };
  };

  const getPortfolioTypeColor = (type: string) => {
    switch(type) {
      case 'equity': return '#3b82f6';
      case 'bond': return '#10b981'; 
      case 'balanced': return '#8b5cf6';
      default: return '#64748b';
    }
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
      <View style={styles.header}>
        <Text style={styles.title}>Intelligent Stress Testing Demo</Text>
        <Text style={styles.subtitle}>
          Comparing Traditional vs Portfolio-Composition-Aware Stress Testing
        </Text>
      </View>

      {/* Portfolio Selection */}
      <View style={styles.portfolioSelector}>
        <Text style={styles.sectionTitle}>Select Portfolio Type</Text>
        <View style={styles.portfolioButtons}>
          {Object.entries(samplePortfolios).map(([key, portfolio]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.portfolioButton,
                { 
                  backgroundColor: selectedPortfolio === key ? getPortfolioTypeColor(key) : '#f1f5f9',
                  borderColor: getPortfolioTypeColor(key)
                }
              ]}
              onPress={() => setSelectedPortfolio(key as any)}
            >
              <Text style={[
                styles.portfolioButtonText,
                { color: selectedPortfolio === key ? '#ffffff' : getPortfolioTypeColor(key) }
              ]}>
                {portfolio.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Portfolio Composition */}
      {composition && (
        <View style={styles.compositionSection}>
          <Text style={styles.sectionTitle}>Portfolio Composition Analysis</Text>
          <View style={styles.compositionGrid}>
            <View style={styles.compositionItem}>
              <Text style={styles.compositionLabel}>Total Value</Text>
              <Text style={styles.compositionValue}>{formatCurrency(composition.totalValue)}</Text>
            </View>
            <View style={styles.compositionItem}>
              <Text style={styles.compositionLabel}>Concentration</Text>
              <Text style={[styles.compositionValue, { 
                color: composition.concentrationLevel === 'high' ? '#ef4444' : 
                       composition.concentrationLevel === 'medium' ? '#f59e0b' : '#10b981' 
              }]}>
                {composition.concentrationLevel.toUpperCase()}
              </Text>
            </View>
            <View style={styles.compositionItem}>
              <Text style={styles.compositionLabel}>Asset Classes</Text>
              <Text style={styles.compositionValue}>{Object.keys(composition.assetClassWeights).length}</Text>
            </View>
            <View style={styles.compositionItem}>
              <Text style={styles.compositionLabel}>Cross-Asset</Text>
              <Text style={styles.compositionValue}>{composition.crossAssetExposure ? 'Yes' : 'No'}</Text>
            </View>
          </View>
          
          {/* Asset Class Breakdown */}
          <View style={styles.assetClassBreakdown}>
            <Text style={styles.subsectionTitle}>Asset Class Allocation</Text>
            {Object.entries(composition.assetClassWeights).map(([assetClass, weight]) => (
              <View key={assetClass} style={styles.allocationRow}>
                <Text style={styles.allocationLabel}>{assetClass.charAt(0).toUpperCase() + assetClass.slice(1)}</Text>
                <Text style={styles.allocationValue}>{(weight * 100).toFixed(2)}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Results Comparison */}
      {stressResults && traditionalResults && (
        <View style={styles.comparisonSection}>
          <Text style={styles.sectionTitle}>Stress Test Results Comparison</Text>
          
          {/* Traditional Approach */}
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>❌ Traditional Approach</Text>
            <Text style={styles.resultDescription}>
              Applies all market factors uniformly regardless of portfolio composition
            </Text>
            <View style={styles.resultMetrics}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Impact</Text>
                <Text style={[styles.metricValue, { color: '#ef4444' }]}>
                  {formatPercentage(-traditionalResults.totalImpact)}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Stressed Value</Text>
                <Text style={styles.metricValue}>{formatCurrency(traditionalResults.stressedValue)}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Factors Applied</Text>
                <Text style={styles.metricValue}>{traditionalResults.appliedFactors} (All)</Text>
              </View>
            </View>
          </View>

          {/* Intelligent Approach */}
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>✅ Intelligent Approach</Text>
            <Text style={styles.resultDescription}>
              Applies only relevant factors based on portfolio composition
            </Text>
            <View style={styles.resultMetrics}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Total Impact</Text>
                <Text style={[styles.metricValue, { color: '#ef4444' }]}>
                  {formatPercentage(-stressResults.totalImpact)}
                </Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Stressed Value</Text>
                <Text style={styles.metricValue}>{formatCurrency(stressResults.stressedValue)}</Text>
              </View>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Relevant Factors</Text>
                <Text style={styles.metricValue}>{Object.keys(stressResults.factorContributions).length}</Text>
              </View>
            </View>
          </View>

          {/* Factor Details */}
          <View style={styles.factorDetails}>
            <Text style={styles.subsectionTitle}>Intelligent Factor Selection</Text>
            {Object.entries(stressResults.factorContributions).map(([factorId, data]) => (
              <View key={factorId} style={styles.factorRow}>
                <View style={styles.factorInfo}>
                  <Text style={styles.factorName}>{factorId.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text style={styles.factorDescription}>{data.description}</Text>
                </View>
                <View style={styles.factorMetrics}>
                  <Text style={styles.factorRelevance}>Relevance: {data.relevance}%</Text>
                  <Text style={[styles.factorImpact, { color: '#ef4444' }]}>
                    Impact: {formatPercentage(-data.impact)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          {stressResults.recommendedActions.length > 0 && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.subsectionTitle}>Recommended Actions</Text>
              {stressResults.recommendedActions.map((action, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Text style={styles.recommendationText}>• {action}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Close Demo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
  },
  portfolioSelector: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  portfolioButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  portfolioButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  portfolioButtonText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  compositionSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  compositionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  compositionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
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
  assetClassBreakdown: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  allocationLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  allocationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  comparisonSection: {
    marginBottom: 24,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  resultDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  resultMetrics: {
    gap: 8,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  factorDetails: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  recommendationsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recommendationItem: {
    paddingVertical: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
});

export default IntelligentStressTestDemo; 