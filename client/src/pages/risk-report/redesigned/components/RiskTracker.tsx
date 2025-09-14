import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RiskMetrics, VaRResults } from '../../../../services/riskService';
import portfolioService from '../../../../services/portfolioService';
import riskTrackingService from '../../../../services/riskTrackingService';

interface RiskTrackerProps {
  riskMetrics: RiskMetrics | null;
  varResults: VaRResults | null;
  portfolioValue: number;
  portfolioId?: string;
  onViewMore?: () => void;
  onEditThresholds?: () => void;
}

interface RiskThreshold {
  metricName: string;
  thresholdValue: number;
  currentValue: number;
  unit: string;
  status: 'safe' | 'warning' | 'danger';
  description: string;
}

interface RiskScoreDetail {
  category: string;
  score: number;
  maxScore: number;
  description: string;
}

const { width } = Dimensions.get('window');

const RiskTracker: React.FC<RiskTrackerProps> = ({
  riskMetrics,
  varResults,
  portfolioValue,
  portfolioId,
  onViewMore,
  onEditThresholds
}) => {
  const [selectedTab, setSelectedTab] = useState<'thresholds' | 'score'>('thresholds');
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [customThresholds, setCustomThresholds] = useState<{
    var95?: number;
    volatility?: number;
    maxDrawdown?: number;
    sharpeMin?: number;
    sortinoMin?: number;
  }>({});
  const [latestDbMetrics, setLatestDbMetrics] = useState<{
    var95?: number | null;
    volatility?: number | null;
    sharpeRatio?: number | null;
    beta?: number | null;
    maxDrawdown?: number | null;
  } | null>(null);

  // Load user-defined thresholds from the portfolio risk profile
  useEffect(() => {
    let isActive = true;
    const loadThresholds = async () => {
      try {
        if (!portfolioId) return;
        const portfolio = await portfolioService.getPortfolioById(portfolioId);
        if (!portfolio || !isActive) return;
        const rp = portfolio.riskProfile || {};
        setCustomThresholds({
          var95: rp.var_95_limit,
          volatility: rp.volatility_limit,
          maxDrawdown: rp.max_drawdown_limit,
          sharpeMin: rp.sharpe_min,
          sortinoMin: rp.sortino_min,
        });
      } catch (e) {
        // best-effort; keep defaults
      }
    };
    loadThresholds();
    return () => { isActive = false; };
  }, [portfolioId]);

  // Load latest metrics from DB if available (VaR, vol, sharpe, beta, drawdown)
  useEffect(() => {
    let isActive = true;
    const loadLatest = async () => {
      try {
        if (!portfolioId) return;
        const latest = await riskTrackingService.getLatestRiskMetrics(portfolioId);
        if (!isActive) return;
        setLatestDbMetrics(latest);
      } catch (e) {
        // ignore; use provided metrics
      }
    };
    loadLatest();
    return () => { isActive = false; };
  }, [portfolioId]);

  // Select metric values prioritizing DB (real) data when available
  const effectiveMetrics = useMemo(() => {
    const rm = riskMetrics;
    const lm = latestDbMetrics;
    return {
      var95: lm?.var95 ?? varResults?.varPercentage ?? null,
      volatility: lm?.volatility ?? (rm ? rm.volatility : null),
      sharpeRatio: lm?.sharpeRatio ?? (rm ? rm.sharpeRatio : null),
      beta: lm?.beta ?? (rm ? rm.beta : null),
      maxDrawdown: lm?.maxDrawdown ?? (rm ? rm.maxDrawdown : null),
      sortinoRatio: rm ? rm.sortinoRatio : null,
    };
  }, [riskMetrics, latestDbMetrics, varResults]);

  // Calculate risk score (0-100) using threshold-aware, weighted model
  const calculateRiskScore = (): number => {
    const m = effectiveMetrics;
    if (!m || m.var95 == null || m.volatility == null || m.sharpeRatio == null || m.beta == null || m.maxDrawdown == null) {
      return 0;
    }

    // Thresholds with sensible defaults if user hasn't set
    const varLimit = customThresholds.var95 ?? 5.0; // %
    const volLimit = customThresholds.volatility ?? 20.0; // %
    const ddLimit = customThresholds.maxDrawdown ?? 15.0; // %
    const sharpeMin = customThresholds.sharpeMin ?? 1.0;
    const sortinoMin = customThresholds.sortinoMin ?? 1.0;

    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    // Component scores normalized to 0..1
    const varComponent = clamp01(1 - (m.var95 as number) / varLimit);
    const volComponent = clamp01(1 - (m.volatility as number) / volLimit);
    const ddComponent = clamp01(1 - (m.maxDrawdown as number) / ddLimit);
    const sharpeComponent = clamp01((m.sharpeRatio as number) / sharpeMin);
    const sortinoComponent = m.sortinoRatio != null ? clamp01((m.sortinoRatio as number) / sortinoMin) : 0.5;
    const betaComponent = clamp01(1 - Math.abs((m.beta as number) - 1.0) / 0.5); // full score within ±0.0; 0 at ±0.5

    // Weights sum to 100
    const weights = {
      var: 25,
      vol: 15,
      dd: 20,
      sharpe: 20,
      sortino: 10,
      beta: 10,
    };

    const weighted = (
      varComponent * weights.var +
      volComponent * weights.vol +
      ddComponent * weights.dd +
      sharpeComponent * weights.sharpe +
      sortinoComponent * weights.sortino +
      betaComponent * weights.beta
    ) / 100;

    return Math.round(clamp01(weighted) * 100);
  };

  // Determine risk level from score
  const getRiskLevel = (score: number): { text: string; color: string } => {
    if (score >= 80) return { text: 'Excellent', color: '#10b981' };
    if (score >= 65) return { text: 'Good', color: '#34d399' };
    if (score >= 50) return { text: 'Moderate', color: '#fbbf24' };
    if (score >= 35) return { text: 'Concerning', color: '#f59e0b' };
    return { text: 'High Risk', color: '#ef4444' };
  };

  // Generate risk thresholds (prefer user settings; fallback defaults)
  const getRiskThresholds = (): RiskThreshold[] => {
    if (!riskMetrics && !varResults) return [];
    const m = effectiveMetrics;
    const var95 = m.var95 ?? 0;
    const vol = m.volatility ?? 0;
    const dd = m.maxDrawdown ?? 0;
    const sharpe = m.sharpeRatio ?? 0;
    const sortino = m.sortinoRatio ?? 0;

    const varLimit = customThresholds.var95 ?? 5.0;
    const volLimit = customThresholds.volatility ?? 20.0;
    const ddLimit = customThresholds.maxDrawdown ?? 15.0;
    const sharpeMin = customThresholds.sharpeMin ?? 1.0;
    const sortinoMin = customThresholds.sortinoMin ?? 1.0;

    return [
      {
        metricName: 'Value at Risk (95%)',
        thresholdValue: varLimit,
        currentValue: var95,
        unit: '%',
        status: var95 > varLimit ? 'danger' : var95 > varLimit * 0.6 ? 'warning' : 'safe',
        description: 'Maximum expected 1-day loss at 95% confidence'
      },
      {
        metricName: 'Annualised Volatility',
        thresholdValue: volLimit,
        currentValue: vol,
        unit: '%',
        status: vol > volLimit ? 'danger' : vol > volLimit * 0.75 ? 'warning' : 'safe',
        description: 'Upper bound for annualized portfolio volatility'
      },
      {
        metricName: 'Max Drawdown',
        thresholdValue: ddLimit,
        currentValue: dd,
        unit: '%',
        status: dd > ddLimit ? 'danger' : dd > ddLimit * 0.66 ? 'warning' : 'safe',
        description: 'Largest peak-to-trough decline'
      },
      {
        metricName: 'Sharpe Ratio (min)',
        thresholdValue: sharpeMin,
        currentValue: sharpe,
        unit: '',
        status: sharpe < Math.min(0.5, sharpeMin * 0.5) ? 'danger' : sharpe < sharpeMin ? 'warning' : 'safe',
        description: 'Risk-adjusted return (higher is better)'
      },
      {
        metricName: 'Sortino Ratio (min)',
        thresholdValue: sortinoMin,
        currentValue: sortino,
        unit: '',
        status: sortino < Math.min(0.5, sortinoMin * 0.5) ? 'danger' : sortino < sortinoMin ? 'warning' : 'safe',
        description: 'Downside risk-adjusted return (higher is better)'
      }
    ];
  };

  // Get risk score details
  const getRiskScoreDetails = (): RiskScoreDetail[] => {
    if (!riskMetrics || !varResults) return [];

    return [
      {
        category: 'Downside Protection',
        score: Math.round(Math.max(0, 25 - (varResults.varPercentage * 2.5))),
        maxScore: 25,
        description: 'How well the portfolio is protected against losses'
      },
      {
        category: 'Volatility Management',
        score: Math.round(Math.max(0, 20 - (riskMetrics.volatility * 0.8))),
        maxScore: 20,
        description: 'How stable the portfolio returns are over time'
      },
      {
        category: 'Reward/Risk Efficiency',
        score: Math.round(Math.min(20, riskMetrics.sharpeRatio * 10)),
        maxScore: 20,
        description: 'How efficiently the portfolio generates returns for the risk taken'
      },
      {
        category: 'Market Correlation',
        score: Math.round(Math.max(0, 15 - (Math.abs(riskMetrics.beta - 1.0) * 10))),
        maxScore: 15,
        description: 'How well the portfolio balances market exposure'
      },
      {
        category: 'Drawdown Control',
        score: Math.round(Math.max(0, 20 - (riskMetrics.maxDrawdown * 0.8))),
        maxScore: 20,
        description: 'How well the portfolio limits significant declines'
      }
    ];
  };

  // Get risk recommendations
  const getRiskRecommendations = (): string[] => {
    if (!riskMetrics || !varResults) return [];
    
    const recommendations: string[] = [];
    
    if (varResults.varPercentage > 3.0) {
      recommendations.push('Consider reducing position sizes in high-volatility assets');
    }
    
    if (riskMetrics.volatility > 15.0) {
      recommendations.push('Add stabilizing assets like quality bonds or defensive stocks');
    }
    
    if (riskMetrics.sharpeRatio < 1.0) {
      recommendations.push('Rebalance portfolio to improve risk-adjusted returns');
    }
    
    if (Math.abs(riskMetrics.beta - 1.0) > 0.3) {
      if (riskMetrics.beta > 1.3) {
        recommendations.push('Portfolio has high market sensitivity, consider reducing equity exposure');
      } else if (riskMetrics.beta < 0.7) {
        recommendations.push('Portfolio has low market sensitivity, may underperform in bull markets');
      }
    }
    
    if (riskMetrics.maxDrawdown > 10.0) {
      recommendations.push('Implement stop-loss strategies to limit future drawdowns');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your portfolio risk profile is well balanced');
    }
    
    return recommendations;
  };

  const riskScore = calculateRiskScore();
  const riskLevel = getRiskLevel(riskScore);
  const thresholds = getRiskThresholds();
  const scoreDetails = getRiskScoreDetails();
  const recommendations = getRiskRecommendations();

  // Calculate risk gauge position
  const gaugePosition = (riskScore / 100) * (width - 80);

  // Calculate usage percentage for progress bar based on metric type
  const calculateUsagePercent = (threshold: RiskThreshold): number => {
    const current = threshold.currentValue || 0;
    const limit = threshold.thresholdValue || 1;
    
    // Debug logging for volatility
    if (threshold.metricName.includes('Volatility')) {
      console.log(`📊 Volatility Usage Debug:`, {
        metricName: threshold.metricName,
        currentValue: current,
        thresholdValue: limit,
        calculatedUsage: (current / limit) * 100,
        customThresholds: customThresholds
      });
    }
    
    // For metrics where lower is better (VaR, Volatility, Max Drawdown)
    if (threshold.metricName.includes('VaR') || 
        threshold.metricName.includes('Volatility') || 
        threshold.metricName.includes('Drawdown')) {
      // Show how much of the limit is used (0% = perfect, 100% = at limit)
      return Math.min(100, Math.max(0, (current / limit) * 100));
    }
    
    // For metrics where higher is better (Sharpe, Sortino ratios)
    if (threshold.metricName.includes('Sharpe') || 
        threshold.metricName.includes('Sortino')) {
      // For minimums: if we're above the minimum, show 100% (full bar = good)
      // If below minimum, show proportional fill
      if (current >= limit) {
        return 100; // Meeting or exceeding minimum = full green bar
      } else {
        return Math.max(0, (current / limit) * 100); // Below minimum = partial fill
      }
    }
    
    // Default case for other metrics
    return Math.min(100, Math.max(0, (current / limit) * 100));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Risk Monitoring</Text>
        {onEditThresholds && (
          <TouchableOpacity
            style={styles.viewMoreButton}
            onPress={onEditThresholds}
          >
            <Ionicons name="settings-outline" size={18} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Risk Score Summary */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreTitle}>Risk Resilience Score</Text>
          <View style={[styles.scoreBadge, { backgroundColor: `${riskLevel.color}20`, borderColor: riskLevel.color }]}>
            <Text style={[styles.scoreBadgeText, { color: riskLevel.color }]}>{riskLevel.text}</Text>
          </View>
        </View>
        
        <View style={styles.scoreValueContainer}>
          <Text style={styles.scoreValue}>{Math.round(riskScore)}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        
        {/* Risk gauge visualization */}
        <View style={styles.gaugeContainer}>
          <View style={styles.gaugeBackground}>
            <View style={styles.gaugeSegment1} />
            <View style={styles.gaugeSegment2} />
            <View style={styles.gaugeSegment3} />
            <View style={styles.gaugeSegment4} />
            <View style={styles.gaugeSegment5} />
          </View>
          <View style={[styles.gaugeIndicator, { left: gaugePosition }]}>
            <Ionicons name="caret-down" size={24} color="#333" />
          </View>
        </View>
      </View>
      
      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'thresholds' && styles.activeTab]}
          onPress={() => setSelectedTab('thresholds')}
        >
          <Text style={[styles.tabText, selectedTab === 'thresholds' && styles.activeTabText]}>Risk Thresholds</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'score' && styles.activeTab]}
          onPress={() => setSelectedTab('score')}
        >
          <Text style={[styles.tabText, selectedTab === 'score' && styles.activeTabText]}>Score Breakdown</Text>
        </TouchableOpacity>
      </View>
      
      {/* Risk Thresholds Section */}
      {selectedTab === 'thresholds' && (
        <ScrollView style={styles.thresholdsContainer}>
          {thresholds.map((threshold, index) => (
            <TouchableOpacity
              key={threshold.metricName}
              style={[
                styles.thresholdItem,
                index === thresholds.length - 1 && styles.lastThresholdItem,
                expandedMetric === threshold.metricName && styles.expandedThresholdItem
              ]}
              onPress={() => setExpandedMetric(
                expandedMetric === threshold.metricName ? null : threshold.metricName
              )}
            >
              <View style={styles.thresholdHeader}>
                <View style={styles.thresholdTitleContainer}>
                  <View style={[
                    styles.statusIndicator,
                    threshold.status === 'safe' ? styles.statusSafe :
                    threshold.status === 'warning' ? styles.statusWarning :
                    styles.statusDanger
                  ]} />
                  <Text style={styles.thresholdTitle}>{threshold.metricName}</Text>
                </View>
                <View style={styles.thresholdValues}>
                  <Text style={[
                    styles.currentValue,
                    threshold.status === 'safe' ? styles.textSafe :
                    threshold.status === 'warning' ? styles.textWarning :
                    styles.textDanger
                  ]}>
                    {threshold.currentValue.toFixed(2)}{threshold.unit}
                  </Text>
                  <Ionicons
                    name={expandedMetric === threshold.metricName ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#8E8E93"
                    style={styles.expandIcon}
                  />
                </View>
              </View>
              
              {expandedMetric === threshold.metricName && (
                <View style={styles.thresholdDetails}>
                  <Text style={styles.thresholdDescription}>{threshold.description}</Text>
                  
                  {/* Progress bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBackground}>
                      <View 
                        style={[
                          styles.progressFill,
                          threshold.status === 'safe' ? styles.progressSafe :
                          threshold.status === 'warning' ? styles.progressWarning :
                          styles.progressDanger,
                          { width: `${calculateUsagePercent(threshold)}%` }
                        ]} 
                      />
                    </View>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabelLeft}>0{threshold.unit}</Text>
                      <Text style={styles.progressLabelThreshold}>
                        Limit/Min: {threshold.thresholdValue}{threshold.unit}
                      </Text>
                      <Text style={styles.progressLabelRight}>
                        {calculateUsagePercent(threshold).toFixed(1)}% used
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.thresholdDescription}>
                    Thresholds come from Risk Settings. Adjust to your policy.
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      {/* Score Breakdown Section */}
      {selectedTab === 'score' && (
        <ScrollView style={styles.scoreBreakdownContainer}>
          {scoreDetails.map((detail, index) => (
            <View key={detail.category} style={styles.scoreDetailItem}>
              <View style={styles.scoreDetailHeader}>
                <Text style={styles.scoreDetailCategory}>{detail.category}</Text>
                <Text style={styles.scoreDetailValue}>{detail.score}/{detail.maxScore}</Text>
              </View>
              
              <View style={styles.scoreProgressContainer}>
                <View style={styles.scoreProgressBackground}>
                  <View 
                    style={[
                      styles.scoreProgressFill,
                      { width: `${(detail.score / detail.maxScore) * 100}%` }
                    ]} 
                  />
                </View>
              </View>
              
              <Text style={styles.scoreDetailDescription}>{detail.description}</Text>
            </View>
          ))}
          
          {/* Recommendations */}
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>Recommendations</Text>
            {recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Ionicons name="bulb-outline" size={18} color="#f59e0b" style={styles.recommendationIcon} />
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 4,
  },
  scoreCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  scoreBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000',
  },
  scoreMax: {
    fontSize: 18,
    color: '#9ca3af',
    marginLeft: 4,
  },
  gaugeContainer: {
    position: 'relative',
    height: 28,
    marginTop: 8,
  },
  gaugeBackground: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 10,
  },
  gaugeSegment1: {
    flex: 1,
    backgroundColor: '#ef4444',
  },
  gaugeSegment2: {
    flex: 1,
    backgroundColor: '#f59e0b',
  },
  gaugeSegment3: {
    flex: 1,
    backgroundColor: '#fbbf24',
  },
  gaugeSegment4: {
    flex: 1,
    backgroundColor: '#34d399',
  },
  gaugeSegment5: {
    flex: 1,
    backgroundColor: '#10b981',
  },
  gaugeIndicator: {
    position: 'absolute',
    top: -10,
    marginLeft: -12,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
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
    fontSize: 14,
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  thresholdsContainer: {
    maxHeight: 360,
  },
  thresholdItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 12,
  },
  lastThresholdItem: {
    borderBottomWidth: 0,
  },
  expandedThresholdItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  thresholdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusSafe: {
    backgroundColor: '#10b981',
  },
  statusWarning: {
    backgroundColor: '#f59e0b',
  },
  statusDanger: {
    backgroundColor: '#ef4444',
  },
  thresholdTitle: {
    fontSize: 15,
    color: '#4b5563',
    fontWeight: '500',
  },
  thresholdValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  textSafe: {
    color: '#10b981',
  },
  textWarning: {
    color: '#f59e0b',
  },
  textDanger: {
    color: '#ef4444',
  },
  expandIcon: {
    marginLeft: 4,
  },
  thresholdDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  thresholdDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressSafe: {
    backgroundColor: '#10b981',
  },
  progressWarning: {
    backgroundColor: '#f59e0b',
  },
  progressDanger: {
    backgroundColor: '#ef4444',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabelLeft: {
    fontSize: 12,
    color: '#9ca3af',
  },
  progressLabelThreshold: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressLabelRight: {
    fontSize: 12,
    color: '#9ca3af',
  },
  scoreBreakdownContainer: {
    maxHeight: 360,
  },
  scoreDetailItem: {
    marginBottom: 16,
  },
  scoreDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreDetailCategory: {
    fontSize: 15,
    color: '#4b5563',
    fontWeight: '500',
  },
  scoreDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  scoreProgressContainer: {
    marginBottom: 8,
  },
  scoreProgressBackground: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  scoreDetailDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  recommendationsContainer: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284c7',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  recommendationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});

export default RiskTracker; 