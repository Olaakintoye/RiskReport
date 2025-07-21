import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface RiskMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
  unit: string;
}

interface MarketIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface RealTimeRiskDashboardProps {
  portfolioId: string;
  onAlert: (alert: any) => void;
}

const RealTimeRiskDashboard: React.FC<RealTimeRiskDashboardProps> = ({
  portfolioId,
  onAlert
}) => {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetric[]>([
    {
      id: 'var_95',
      name: 'VaR (95%)',
      value: 3.2,
      change: 0.1,
      threshold: 5.0,
      status: 'normal',
      unit: '%'
    },
    {
      id: 'var_99',
      name: 'VaR (99%)',
      value: 4.8,
      change: 0.2,
      threshold: 7.5,
      status: 'normal',
      unit: '%'
    },
    {
      id: 'volatility',
      name: 'Portfolio Vol',
      value: 18.5,
      change: 1.2,
      threshold: 25.0,
      status: 'normal',
      unit: '%'
    },
    {
      id: 'correlation',
      name: 'Avg Correlation',
      value: 0.65,
      change: 0.05,
      threshold: 0.85,
      status: 'warning',
      unit: ''
    },
    {
      id: 'concentration',
      name: 'Concentration Risk',
      value: 15.2,
      change: -0.3,
      threshold: 20.0,
      status: 'normal',
      unit: '%'
    },
    {
      id: 'liquidity',
      name: 'Liquidity Score',
      value: 7.8,
      change: -0.1,
      threshold: 5.0,
      status: 'normal',
      unit: '/10'
    }
  ]);

  const [marketIndicators, setMarketIndicators] = useState<MarketIndicator[]>([
    { symbol: 'SPX', name: 'S&P 500', value: 4185.47, change: -12.34, changePercent: -0.29 },
    { symbol: 'VIX', name: 'Volatility Index', value: 18.45, change: 1.23, changePercent: 7.15 },
    { symbol: 'DXY', name: 'Dollar Index', value: 103.25, change: 0.15, changePercent: 0.15 },
    { symbol: 'TNX', name: '10Y Treasury', value: 4.35, change: 0.02, changePercent: 0.46 }
  ]);

  const [isLive, setIsLive] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for live indicator
  useEffect(() => {
    if (isLive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isLive, pulseAnim]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setRiskMetrics(prev => prev.map(metric => {
        const randomChange = (Math.random() - 0.5) * 0.2;
        const newValue = Math.max(0, metric.value + randomChange);
        const newStatus = newValue > metric.threshold ? 'critical' : 
                         newValue > metric.threshold * 0.8 ? 'warning' : 'normal';
        
        return {
          ...metric,
          value: parseFloat(newValue.toFixed(2)),
          change: parseFloat(randomChange.toFixed(2)),
          status: newStatus
        };
      }));

      setMarketIndicators(prev => prev.map(indicator => {
        const randomChange = (Math.random() - 0.5) * indicator.value * 0.01;
        const newValue = indicator.value + randomChange;
        const changePercent = (randomChange / indicator.value) * 100;
        
        return {
          ...indicator,
          value: parseFloat(newValue.toFixed(2)),
          change: parseFloat(randomChange.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2))
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'normal': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? '#ef4444' : '#10b981';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Risk Monitor</Text>
          <View style={styles.liveIndicator}>
            <Animated.View 
              style={[
                styles.liveDot, 
                { transform: [{ scale: pulseAnim }] },
                { backgroundColor: isLive ? '#10b981' : '#6b7280' }
              ]} 
            />
            <Text style={styles.liveText}>
              {isLive ? 'LIVE' : 'PAUSED'}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setIsLive(!isLive)}
        >
          <MaterialCommunityIcons 
            name={isLive ? "pause" : "play"} 
            size={20} 
            color="#3b82f6" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Risk Metrics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Risk Metrics</Text>
          <View style={styles.metricsGrid}>
            {riskMetrics.map(metric => (
              <View key={metric.id} style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricName}>{metric.name}</Text>
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(metric.status) }
                  ]} />
                </View>
                <Text style={styles.metricValue}>
                  {metric.value}{metric.unit}
                </Text>
                <View style={styles.metricChange}>
                  <MaterialCommunityIcons
                    name={metric.change >= 0 ? "trending-up" : "trending-down"}
                    size={14}
                    color={getChangeColor(metric.change)}
                  />
                  <Text style={[
                    styles.changeText,
                    { color: getChangeColor(metric.change) }
                  ]}>
                    {metric.change >= 0 ? '+' : ''}{metric.change}{metric.unit}
                  </Text>
                </View>
                <View style={styles.thresholdBar}>
                  <View 
                    style={[
                      styles.thresholdFill,
                      { 
                        width: `${Math.min(100, (metric.value / metric.threshold) * 100)}%`,
                        backgroundColor: getStatusColor(metric.status)
                      }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Market Indicators */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Market Indicators</Text>
          <View style={styles.indicatorsContainer}>
            {marketIndicators.map(indicator => (
              <View key={indicator.symbol} style={styles.indicatorCard}>
                <View style={styles.indicatorHeader}>
                  <Text style={styles.indicatorSymbol}>{indicator.symbol}</Text>
                  <Text style={styles.indicatorName}>{indicator.name}</Text>
                </View>
                <Text style={styles.indicatorValue}>
                  {indicator.value.toLocaleString()}
                </Text>
                <View style={styles.indicatorChange}>
                  <Text style={[
                    styles.changeValue,
                    { color: indicator.change >= 0 ? '#ef4444' : '#10b981' }
                  ]}>
                    {indicator.change >= 0 ? '+' : ''}{indicator.change.toFixed(2)}
                  </Text>
                  <Text style={[
                    styles.changePercent,
                    { color: indicator.changePercent >= 0 ? '#ef4444' : '#10b981' }
                  ]}>
                    ({indicator.changePercent >= 0 ? '+' : ''}{indicator.changePercent.toFixed(2)}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Risk Alerts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risk Alerts</Text>
          <View style={styles.alertsContainer}>
            {riskMetrics.filter(m => m.status !== 'normal').map(metric => (
              <View key={metric.id} style={[
                styles.alertCard,
                { borderLeftColor: getStatusColor(metric.status) }
              ]}>
                <View style={styles.alertHeader}>
                  <MaterialCommunityIcons
                    name={metric.status === 'critical' ? "alert-circle" : "alert"}
                    size={20}
                    color={getStatusColor(metric.status)}
                  />
                  <Text style={styles.alertTitle}>
                    {metric.status === 'critical' ? 'Critical' : 'Warning'}
                  </Text>
                  <Text style={styles.alertTime}>2m ago</Text>
                </View>
                <Text style={styles.alertMessage}>
                  {metric.name} has {metric.status === 'critical' ? 'exceeded' : 'approached'} 
                  threshold ({metric.threshold}{metric.unit})
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
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
    borderBottomColor: '#e5e7eb',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: (Dimensions.get('window').width - 56) / 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricName: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  metricChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  thresholdBar: {
    height: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  thresholdFill: {
    height: '100%',
    borderRadius: 2,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  indicatorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    width: (Dimensions.get('window').width - 56) / 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  indicatorHeader: {
    marginBottom: 8,
  },
  indicatorSymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  indicatorName: {
    fontSize: 12,
    color: '#6b7280',
  },
  indicatorValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  indicatorChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  changePercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  alertsContainer: {
    gap: 8,
  },
  alertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  alertTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  alertMessage: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});

export default RealTimeRiskDashboard; 