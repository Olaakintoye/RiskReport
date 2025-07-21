import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface RiskData {
  currentRisk: number; // 0-100 scale
  riskTolerance: number; // 0-100 scale
  var95: number;
  volatility: number;
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number;
  riskBreakdown: {
    assetClass: Record<string, number>;
    geographic: Record<string, number>;
    sector: Record<string, number>;
  };
  alerts: Array<{
    type: 'warning' | 'critical';
    message: string;
    actionable: boolean;
  }>;
}

interface RiskVisualizationProps {
  portfolioId: string;
  totalValue: number;
  onRiskDetailsPress?: () => void;
  onStressTestPress?: () => void;
}

const RiskVisualization: React.FC<RiskVisualizationProps> = ({
  portfolioId,
  totalValue,
  onRiskDetailsPress,
  onStressTestPress
}) => {
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBreakdown, setSelectedBreakdown] = useState<'assetClass' | 'geographic' | 'sector'>('assetClass');

  useEffect(() => {
    loadRiskData();
  }, [portfolioId]);

  const loadRiskData = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, this would come from risk service
      const mockData: RiskData = {
        currentRisk: 65,
        riskTolerance: 75,
        var95: 4.2,
        volatility: 18.5,
        beta: 0.85,
        sharpeRatio: 1.32,
        maxDrawdown: 15.3,
        riskBreakdown: {
          assetClass: {
            'Equity': 68,
            'Bonds': 22,
            'Cash': 8,
            'REITs': 2
          },
          geographic: {
            'US': 70,
            'Europe': 15,
            'Asia': 10,
            'Emerging': 5
          },
          sector: {
            'Technology': 25,
            'Healthcare': 15,
            'Finance': 20,
            'Consumer': 18,
            'Industrial': 12,
            'Other': 10
          }
        },
        alerts: [
          {
            type: 'warning',
            message: 'Portfolio volatility increased by 2.3% this week',
            actionable: true
          },
          {
            type: 'critical',
            message: 'VaR limit exceeded for Technology sector',
            actionable: true
          }
        ]
      };
      
      setRiskData(mockData);
    } catch (error) {
      console.error('Error loading risk data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderRiskGauge = (value: number, max: number, label: string, color: string) => {
    const percentage = (value / max) * 100;
    const strokeDasharray = `${percentage * 2.51}, 251`; // 251 is approximately the circumference
    
    return (
      <View style={styles.gaugeContainer}>
        <Svg width={80} height={80} style={styles.gauge}>
          <Defs>
            <LinearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#10b981" />
              <Stop offset="50%" stopColor="#f59e0b" />
              <Stop offset="100%" stopColor="#ef4444" />
            </LinearGradient>
          </Defs>
          
          {/* Background circle */}
          <Circle
            cx={40}
            cy={40}
            r={32}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={8}
            strokeDasharray="251, 251"
          />
          
          {/* Progress circle */}
          <Circle
            cx={40}
            cy={40}
            r={32}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
        </Svg>
        
        <View style={styles.gaugeCenter}>
          <Text style={styles.gaugeValue}>{value}</Text>
          <Text style={styles.gaugeLabel}>{label}</Text>
        </View>
      </View>
    );
  };

  const renderRiskBreakdown = () => {
    if (!riskData) return null;
    
    const data = riskData.riskBreakdown[selectedBreakdown];
    const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
    
    return (
      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownHeader}>
          <Text style={styles.breakdownTitle}>Risk Breakdown</Text>
          <View style={styles.breakdownTabs}>
            {['assetClass', 'geographic', 'sector'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.breakdownTab,
                  selectedBreakdown === tab && styles.selectedTab
                ]}
                onPress={() => setSelectedBreakdown(tab as any)}
              >
                <Text style={[
                  styles.breakdownTabText,
                  selectedBreakdown === tab && styles.selectedTabText
                ]}>
                  {tab === 'assetClass' ? 'Asset' : tab === 'geographic' ? 'Region' : 'Sector'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.breakdownBars}>
          {entries.map(([key, value], index) => (
            <View key={key} style={styles.breakdownItem}>
              <View style={styles.breakdownItemHeader}>
                <Text style={styles.breakdownItemLabel}>{key}</Text>
                <Text style={styles.breakdownItemValue}>{value}%</Text>
              </View>
              <View style={styles.breakdownBar}>
                <View 
                  style={[
                    styles.breakdownBarFill,
                    { 
                      width: `${value}%`,
                      backgroundColor: getRiskColor(value)
                    }
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const getRiskColor = (riskLevel: number): string => {
    if (riskLevel >= 80) return '#ef4444';
    if (riskLevel >= 60) return '#f59e0b';
    if (riskLevel >= 40) return '#eab308';
    return '#10b981';
  };

  const getRiskGaugeColor = (current: number, tolerance: number): string => {
    const ratio = current / tolerance;
    if (ratio >= 0.9) return '#ef4444';
    if (ratio >= 0.7) return '#f59e0b';
    return '#10b981';
  };

  const handleAlertPress = (alert: any) => {
    if (alert.actionable) {
      Alert.alert(
        'Risk Alert',
        alert.message,
        [
          { text: 'Dismiss', style: 'cancel' },
          { text: 'View Details', onPress: onRiskDetailsPress }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Analyzing risk metrics...</Text>
      </View>
    );
  }

  if (!riskData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Risk Analysis</Text>
        <TouchableOpacity style={styles.stressTestButton} onPress={onStressTestPress}>
          <MaterialCommunityIcons name="lightning-bolt" size={16} color="#3b82f6" />
          <Text style={styles.stressTestButtonText}>Stress Test</Text>
        </TouchableOpacity>
      </View>

      {/* Risk Alerts */}
      {riskData.alerts.length > 0 && (
        <View style={styles.alertsContainer}>
          {riskData.alerts.map((alert, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.alertItem,
                alert.type === 'critical' ? styles.criticalAlert : styles.warningAlert
              ]}
              onPress={() => handleAlertPress(alert)}
            >
              <MaterialCommunityIcons
                name={alert.type === 'critical' ? 'alert-circle' : 'alert'}
                size={16}
                color={alert.type === 'critical' ? '#ef4444' : '#f59e0b'}
              />
              <Text style={styles.alertText}>{alert.message}</Text>
              {alert.actionable && (
                <MaterialCommunityIcons name="chevron-right" size={16} color="#64748b" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Risk Gauges */}
      <View style={styles.gaugesContainer}>
        <View style={styles.mainGauge}>
          {renderRiskGauge(
            riskData.currentRisk,
            100,
            'Risk Level',
            getRiskGaugeColor(riskData.currentRisk, riskData.riskTolerance)
          )}
          <View style={styles.toleranceIndicator}>
            <Text style={styles.toleranceText}>
              Target: {riskData.riskTolerance}
            </Text>
            <View style={[
              styles.toleranceBar,
              { 
                backgroundColor: riskData.currentRisk <= riskData.riskTolerance 
                  ? '#10b981' 
                  : '#ef4444' 
              }
            ]} />
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{riskData.var95}%</Text>
            <Text style={styles.metricLabel}>VaR (95%)</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{riskData.volatility}%</Text>
            <Text style={styles.metricLabel}>Volatility</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{riskData.beta}</Text>
            <Text style={styles.metricLabel}>Beta</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{riskData.sharpeRatio}</Text>
            <Text style={styles.metricLabel}>Sharpe</Text>
          </View>
        </View>
      </View>

      {/* Risk Breakdown */}
      {renderRiskBreakdown()}
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
  stressTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stressTestButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  alertsContainer: {
    marginBottom: 16,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  criticalAlert: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  warningAlert: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  alertText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  gaugesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  mainGauge: {
    flex: 1,
    alignItems: 'center',
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gauge: {
    position: 'absolute',
  },
  gaugeCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  gaugeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  toleranceIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  toleranceText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  toleranceBar: {
    width: 60,
    height: 3,
    borderRadius: 2,
  },
  metricsGrid: {
    flex: 1,
    marginLeft: 16,
  },
  metricItem: {
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  breakdownContainer: {
    marginTop: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  breakdownTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  breakdownTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectedTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  breakdownTabText: {
    fontSize: 12,
    color: '#64748b',
  },
  selectedTabText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  breakdownBars: {
    marginTop: 8,
  },
  breakdownItem: {
    marginBottom: 12,
  },
  breakdownItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownItemLabel: {
    fontSize: 14,
    color: '#374151',
  },
  breakdownItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  breakdownBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

export default RiskVisualization; 