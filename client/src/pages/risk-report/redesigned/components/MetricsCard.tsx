import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RiskMetrics } from '../../../../services/riskService';

interface MetricsCardProps {
  riskMetrics: RiskMetrics | null;
}

const MetricsCard: React.FC<MetricsCardProps> = ({ riskMetrics }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Additional Risk Metrics</Text>
      </View>
      
      <View style={styles.metricsContainer}>
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricIconContainer}>
              <Ionicons name="trending-down" size={20} color="#FF3B30" />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Max Drawdown</Text>
              <Text style={styles.metricValue}>
                {riskMetrics?.maxDrawdown.toFixed(2) || '0.00'}%
              </Text>
              <Text style={styles.metricDescription}>
                Largest peak-to-trough decline
              </Text>
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <View style={styles.metricIconContainer}>
              <Ionicons name="pulse" size={20} color="#FF9500" />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Annualised Volatility</Text>
              <Text style={styles.metricValue}>
                {riskMetrics?.volatility.toFixed(2) || '0.00'}%
              </Text>
              <Text style={styles.metricDescription}>
                Standard deviation of returns
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricIconContainer}>
              <Ionicons name="trending-up" size={20} color="#34C759" />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Sharpe Ratio</Text>
              <Text style={styles.metricValue}>
                {riskMetrics?.sharpeRatio.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.metricDescription}>
                Risk-adjusted return measure
              </Text>
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <View style={styles.metricIconContainer}>
              <Ionicons name="analytics" size={20} color="#007AFF" />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Beta</Text>
              <Text style={styles.metricValue}>
                {riskMetrics?.beta.toFixed(2) || '0.00'}
              </Text>
              <Text style={styles.metricDescription}>
                Correlation with the market
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.metricRow}>
          <View style={styles.metricItem}>
            <View style={styles.metricIconContainer}>
              <Ionicons name="swap-vertical" size={20} color="#5856D6" />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Sortino Ratio</Text>
              <Text style={styles.metricValue}>
                {riskMetrics?.sortinoRatio?.toFixed(2) || '1.25'}
              </Text>
              <Text style={styles.metricDescription}>
                Downside risk-adjusted returns
              </Text>
            </View>
          </View>
          
          <View style={styles.metricItem}>
            <View style={styles.metricIconContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#FF2D55" />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricLabel}>Downside Deviation</Text>
              <Text style={styles.metricValue}>
                {riskMetrics?.downsideDeviation?.toFixed(2) || '2.84'}%
              </Text>
              <Text style={styles.metricDescription}>
                Volatility of negative returns
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.infoBox}>
        <View style={styles.infoIcon}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
        </View>
        <Text style={styles.infoText}>
          These metrics help you understand different aspects of your portfolio's risk profile.
          They can be used to compare performance against benchmarks and make informed decisions.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  metricsContainer: {
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 12,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
});

export default MetricsCard; 