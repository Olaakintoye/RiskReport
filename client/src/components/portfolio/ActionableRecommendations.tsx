import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import portfolioService, { suggestTrimConcentration, suggestAddHedge } from '../../services/portfolioService';

interface Recommendation {
  id: string;
  type: 'rebalance' | 'tax_harvest' | 'dividend' | 'optimization' | 'risk_alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: {
    expected: string;
    confidence: number;
  };
  action: {
    label: string;
    details: string;
  };
  deadline?: string;
  value?: number;
}

interface ActionableRecommendationsProps {
  portfolioIds: string[];
  onRecommendationPress?: (recommendation: Recommendation) => void;
  onDismiss?: (recommendationId: string) => void;
}

const ActionableRecommendations: React.FC<ActionableRecommendationsProps> = (props) => {
  const { portfolioIds = [], onRecommendationPress, onDismiss } = props;
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Ensure portfolioIds is always an array for downstream logic
  const safePortfolioIds = Array.isArray(portfolioIds) ? portfolioIds : [];

  useEffect(() => {
    loadRecommendations();
  }, [safePortfolioIds.length]);

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, this would come from AI service
      const mockRecommendations: Recommendation[] = [
        {
          id: '1',
          type: 'rebalance',
          priority: 'high',
          title: 'Rebalance Growth Portfolio',
          description: 'Your Growth Portfolio has drifted 8% from target allocation. Tech stocks are overweight by 12%.',
          impact: {
            expected: 'Reduce risk by 15%, maintain expected returns',
            confidence: 85
          },
          action: {
            label: 'Rebalance Now',
            details: 'Sell $2,340 AAPL, Buy $1,200 VTI, $1,140 VXUS'
          },
          deadline: '3 days',
          value: 2340
        },
        {
          id: '2',
          type: 'tax_harvest',
          priority: 'medium',
          title: 'Tax Loss Harvesting Opportunity',
          description: 'TSLA position is down 12%. Harvest loss and reinvest in similar asset to maintain exposure.',
          impact: {
            expected: 'Save $890 in taxes',
            confidence: 92
          },
          action: {
            label: 'Harvest Loss',
            details: 'Sell TSLA (-$2,100), Buy QQQ (+$2,100)'
          },
          deadline: '14 days',
          value: 890
        },
        {
          id: '3',
          type: 'dividend',
          priority: 'low',
          title: 'Upcoming Dividend Payments',
          description: 'You have $1,250 in dividends coming this month from MSFT, AAPL, and VTI.',
          impact: {
            expected: 'Reinvest for compound growth',
            confidence: 100
          },
          action: {
            label: 'Setup Auto-Reinvest',
            details: 'Enable DRIP for all dividend-paying positions'
          },
          deadline: '5 days',
          value: 1250
        },
        {
          id: '4',
          type: 'optimization',
          priority: 'medium',
          title: 'Optimize for Tax Efficiency',
          description: 'Move tax-inefficient bonds to IRA and growth stocks to taxable account.',
          impact: {
            expected: 'Save $340/year in taxes',
            confidence: 78
          },
          action: {
            label: 'Review Asset Location',
            details: 'Analyze tax-advantaged placement across accounts'
          },
          value: 340
        },
        {
          id: '5',
          type: 'risk_alert',
          priority: 'high',
          title: 'High Concentration Risk',
          description: 'Single stock (AAPL) represents 18% of total portfolio. Consider diversifying.',
          impact: {
            expected: 'Reduce concentration risk by 40%',
            confidence: 95
          },
          action: {
            label: 'Diversify Holdings',
            details: 'Sell 25% of AAPL, invest in broad market ETFs'
          },
          deadline: '7 days',
          value: 0
        }
      ];
      
      setRecommendations(mockRecommendations);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'rebalance':
        return 'scale';
      case 'tax_harvest':
        return 'cash';
      case 'dividend':
        return 'cash';
      case 'optimization':
        return 'tune';
      case 'risk_alert':
        return 'alert-circle';
      default:
        return 'lightbulb';
    }
  };

  const getRecommendationColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'rebalance':
        return '#3b82f6';
      case 'tax_harvest':
        return '#10b981';
      case 'dividend':
        return '#8b5cf6';
      case 'optimization':
        return '#f59e0b';
      case 'risk_alert':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  const getPriorityColor = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleRecommendationPress = (recommendation: Recommendation) => {
    Alert.alert(
      recommendation.title,
      recommendation.action.details,
      [
        { text: 'Later', style: 'cancel' },
        { text: 'Dismiss', style: 'destructive', onPress: () => handleDismiss(recommendation.id) },
        { text: 'Take Action', onPress: () => onRecommendationPress?.(recommendation) }
      ]
    );
  };

  const handleDismiss = (recommendationId: string) => {
    setRecommendations(prev => prev.filter(r => r.id !== recommendationId));
    onDismiss?.(recommendationId);
  };

  const handleQuickApply = async (recommendation: Recommendation) => {
    try {
      const targetPortfolioId = portfolioIds?.[0];
      if (!targetPortfolioId) {
        Alert.alert('No Portfolio', 'Please create or select a portfolio first.');
        return;
      }
      const portfolio = await portfolioService.getPortfolioById(targetPortfolioId);
      if (!portfolio) {
        Alert.alert('Not Found', 'Unable to load the selected portfolio.');
        return;
      }

      if (recommendation.type === 'rebalance' || recommendation.type === 'risk_alert') {
        const { updatedPortfolio, changes } = suggestTrimConcentration(portfolio, { maxWeight: 0.15, trimFraction: 0.25 });
        await portfolioService.updatePortfolio(updatedPortfolio);
        Alert.alert('Rebalanced', `Applied ${changes.length} trim action(s) to reduce concentration.`);
      } else if (recommendation.type === 'optimization') {
        const { updatedPortfolio, changes } = suggestAddHedge(portfolio, { symbol: 'TLT', hedgeWeight: 0.05 });
        await portfolioService.updatePortfolio(updatedPortfolio);
        Alert.alert('Hedge Added', `Applied ${changes.length} hedge action(s) to improve risk profile.`);
      } else {
        Alert.alert('Action Not Automated', 'This recommendation requires manual review.');
      }
    } catch (error: any) {
      console.error('Quick apply failed', error);
      Alert.alert('Failed', error?.message || 'Could not apply the recommendation.');
    }
  };

  const filteredRecommendations = recommendations.filter(
    r => selectedPriority === 'all' || r.priority === selectedPriority
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Generating recommendations...</Text>
      </View>
    );
  }

  if (recommendations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="check-circle" size={48} color="#10b981" />
        <Text style={styles.emptyTitle}>All Good!</Text>
        <Text style={styles.emptyDescription}>
          Your portfolios are well-optimized. Check back later for new recommendations.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recommendations</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <MaterialCommunityIcons name="cog" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Priority:</Text>
        <View style={styles.filterButtons}>
          {['all', 'high', 'medium', 'low'].map((priority) => {
            return (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterButton,
                selectedPriority === priority && styles.selectedFilterButton
              ]}
              onPress={() => setSelectedPriority(priority as any)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedPriority === priority && styles.selectedFilterButtonText
              ]}>
                {priority === 'all' ? 'All' : priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low'}
              </Text>
            </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView style={styles.recommendationsContainer} showsVerticalScrollIndicator={false}>
        {filteredRecommendations.map((recommendation) => {
          return (
          <TouchableOpacity
            key={recommendation.id}
            style={styles.recommendationItem}
            onPress={() => handleRecommendationPress(recommendation)}
          >
            <View style={styles.recommendationHeader}>
              <View style={styles.recommendationIconContainer}>
                <MaterialCommunityIcons
                  name={getRecommendationIcon(recommendation.type)}
                  size={20}
                  color={getRecommendationColor(recommendation.type)}
                />
              </View>
              <View style={styles.recommendationTitleContainer}>
                <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
                <View style={styles.recommendationMeta}>
                  <View style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor(recommendation.priority) }
                  ]}>
                    <Text style={styles.priorityText}>{recommendation.priority}</Text>
                  </View>
                  {recommendation.deadline && (
                    <Text style={styles.deadlineText}>Due in {recommendation.deadline}</Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => handleDismiss(recommendation.id)}
              >
                <MaterialCommunityIcons name="close" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.recommendationDescription}>
              {recommendation.description}
            </Text>

            <View style={styles.recommendationFooter}>
              <View style={styles.impactContainer}>
                <Text style={styles.impactLabel}>Expected Impact:</Text>
                <Text style={styles.impactText}>{recommendation.impact.expected}</Text>
                {Number(recommendation.value) > 0 ? (
                  <Text style={styles.impactValue}>
                    {formatCurrency(recommendation.value as number)}
                  </Text>
                ) : null}
              </View>
              <View style={styles.confidenceContainer}>
                <Text style={styles.confidenceLabel}>Confidence:</Text>
                <View style={styles.confidenceBar}>
                  <View style={[
                    styles.confidenceBarFill,
                    { width: (recommendation.impact.confidence + '%') as any }
                  ]} />
                </View>
                <Text style={styles.confidenceText}>{recommendation.impact.confidence}%</Text>
              </View>
            </View>

            <View style={styles.actionContainer}>
              <Text style={styles.actionLabel}>Action:</Text>
              <Text style={styles.actionText}>{recommendation.action.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#64748b" />
            </View>

            <View style={styles.quickActionsRow}>
              {(recommendation.type === 'rebalance' || recommendation.type === 'risk_alert' || recommendation.type === 'optimization') && (
                <TouchableOpacity style={styles.quickActionButton} onPress={() => handleQuickApply(recommendation)}>
                  <MaterialCommunityIcons name="lightning-bolt" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.quickActionText}>One‑Tap Fix</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  quickActionsRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-end'
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#273c75',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  quickActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  settingsButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectedFilterButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#64748b',
  },
  selectedFilterButtonText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  recommendationsContainer: {
    maxHeight: 400,
  },
  recommendationItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recommendationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendationTitleContainer: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  deadlineText: {
    fontSize: 12,
    color: '#64748b',
  },
  dismissButton: {
    padding: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 16,
  },
  recommendationFooter: {
    marginBottom: 12,
  },
  impactContainer: {
    marginBottom: 8,
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  impactText: {
    fontSize: 14,
    color: '#1e293b',
  },
  impactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  confidenceBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginRight: 8,
  },
});

export default ActionableRecommendations; 