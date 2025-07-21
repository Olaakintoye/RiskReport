import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { VaRResults, RiskMetrics } from '../../../../services/riskService';
import { PortfolioSummary, Portfolio } from '../../../../services/portfolioService';
import * as notificationService from '../../../../services/notificationService';

interface MetricItemProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  color: string;
  onPress?: () => void;
}

interface RiskOverviewProps {
  riskMetrics: RiskMetrics | null;
  parametricVaR: VaRResults | null;
  selectedPortfolioSummary: PortfolioSummary | null;
  runningPythonAnalysis: boolean;
  runPythonVarAnalysis: (confidenceLevel?: number, timeHorizon?: number, numSimulations?: number, lookbackPeriod?: number) => void;
  onRunAnalysis?: () => void;
}

const metricExplanations: Record<string, { title: string; description: string; formula: string }> = {
  'Value at Risk (95%)': {
    title: 'Value at Risk (VaR)',
    description: 'Estimates the maximum expected loss over a set period at a given confidence level.',
    formula: 'VaR = Z × σ × √T × Portfolio Value'
  },
  'Volatility': {
    title: 'Annualised Volatility',
    description: 'Measures the annualized standard deviation of daily returns.',
    formula: 'σ = stddev(daily returns) × √252'
  },
  'Sharpe Ratio': {
    title: 'Sharpe Ratio',
    description: 'Risk-adjusted return of the portfolio.',
    formula: 'Sharpe = (Portfolio Return − Risk-Free Rate) / Volatility'
  },
  'Beta': {
    title: 'Beta',
    description: 'Measures sensitivity to market movements.',
    formula: 'Beta = Covariance(Portfolio, Market) / Variance(Market)'
  }
};

const MetricItem: React.FC<MetricItemProps & { onInfo?: () => void }> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  onPress,
  onInfo
}) => {
  return (
    <TouchableOpacity
      style={styles.metricCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}> 
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        {onInfo && (
          <TouchableOpacity onPress={onInfo} style={{ marginLeft: 4 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={18} color="#ADD8E6" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    </TouchableOpacity>
  );
};

const RiskOverview: React.FC<RiskOverviewProps> = ({
  riskMetrics,
  parametricVaR,
  selectedPortfolioSummary,
  runningPythonAnalysis,
  runPythonVarAnalysis,
  onRunAnalysis
}) => {
  // Calculate VaR in dollar amount if we have the necessary data
  const varDollarAmount = parametricVaR && selectedPortfolioSummary
    ? ((selectedPortfolioSummary.totalValue * parametricVaR.varPercentage) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '0.00';

  // Check for risk alerts when risk metrics or VaR changes
  useEffect(() => {
    const checkRiskAlerts = async () => {
      if (riskMetrics && selectedPortfolioSummary && parametricVaR) {
        try {
          // Use a type assertion to create a simple portfolio object for the notification service
          const portfolioForAlerts = {
            id: selectedPortfolioSummary.id,
            name: selectedPortfolioSummary.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            assets: []
          } as Portfolio;
          
          // Check risk metrics against thresholds
          await notificationService.checkRiskMetrics(
            portfolioForAlerts,
            riskMetrics,
            parametricVaR
          );
        } catch (error) {
          console.error('Failed to check risk alerts:', error);
        }
      }
    };

    checkRiskAlerts();
  }, [riskMetrics, parametricVaR, selectedPortfolioSummary]);

  const [infoModal, setInfoModal] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Risk Overview</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricItem
          title="Value at Risk (95%)"
          value={`${parametricVaR?.varPercentage.toFixed(2) || '0.00'}%`}
          subtitle={`$${varDollarAmount}`}
          icon="trending-down"
          color="#FF3B30"
          onInfo={() => setInfoModal('Value at Risk (95%)')}
        />
        
        <MetricItem
          title="Annualised Volatility"
          value={`${riskMetrics?.volatility.toFixed(2) || '0.00'}%`}
          subtitle="Annualized"
          icon="pulse"
          color="#FF9500"
          onInfo={() => setInfoModal('Volatility')}
        />
        
        <MetricItem
          title="Sharpe Ratio"
          value={riskMetrics?.sharpeRatio.toFixed(2) || '0.00'}
          subtitle="Risk-Adjusted Return"
          icon="trending-up"
          color="#34C759"
          onInfo={() => setInfoModal('Sharpe Ratio')}
        />
        
        <MetricItem
          title="Beta"
          value={riskMetrics?.beta.toFixed(2) || '0.00'}
          subtitle="vs. Market"
          icon="analytics"
          color="#007AFF"
          onInfo={() => setInfoModal('Beta')}
        />
      </View>

      {/* Info Modal */}
      <Modal
        visible={!!infoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 340 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#23272f' }}>{infoModal && metricExplanations[infoModal]?.title}</Text>
              <TouchableOpacity onPress={() => setInfoModal(null)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 15, color: '#23272f', marginBottom: 10 }}>{infoModal && metricExplanations[infoModal]?.description}</Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontStyle: 'italic' }}>Calculation: {infoModal && metricExplanations[infoModal]?.formula}</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  metricSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
});

export default RiskOverview; 