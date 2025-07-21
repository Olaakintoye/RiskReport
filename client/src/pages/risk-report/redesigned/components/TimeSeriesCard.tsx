import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { RiskMetrics, VaRResults } from '../../../../services/riskService';
import { riskTrackingService } from '../../../../services/riskTrackingService';

// Mock data service (replace with actual implementation)
const fetchRiskTimeSeriesData = async (portfolioId: string, metric: MetricType, timeFrame: TimeFrame) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock data for demonstration purposes - different data for each metric
  const generateTimeSeriesData = (metric: MetricType, timeFrame: TimeFrame) => {
    const getLabels = () => {
      switch (timeFrame) {
        case '1m': return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        case '3m': return ['Month 1', 'Month 2', 'Month 3'];
        case '6m': return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        case '1y': return ['Q1', 'Q2', 'Q3', 'Q4'];
        case 'all': return ['2020', '2021', '2022', '2023', '2024'];
        default: return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      }
    };

    const getData = () => {
      switch (metric) {
        case 'var':
          switch (timeFrame) {
            case '1m': return [1.8, 2.1, 1.9, 1.7];
            case '3m': return [2.2, 1.9, 1.8];
            case '6m': return [3.2, 3.5, 3.1, 3.7, 3.3, 1.8];
            case '1y': return [2.8, 3.2, 2.9, 1.9];
            case 'all': return [4.1, 3.8, 4.5, 3.2, 2.1];
            default: return [3.2, 3.5, 3.1, 3.7, 3.3, 1.8];
          }
        case 'volatility':
          switch (timeFrame) {
            case '1m': return [16.2, 17.1, 16.8, 15.9];
            case '3m': return [17.4, 16.2, 15.8];
            case '6m': return [18.4, 17.9, 18.8, 19.2, 18.7, 16.2];
            case '1y': return [19.1, 18.5, 17.8, 16.8];
            case 'all': return [22.3, 19.8, 21.1, 18.4, 17.2];
            default: return [18.4, 17.9, 18.8, 19.2, 18.7, 16.2];
          }
        case 'sharpe':
          switch (timeFrame) {
            case '1m': return [1.12, 1.18, 1.15, 1.22];
            case '3m': return [1.08, 1.15, 1.21];
            case '6m': return [0.95, 1.02, 0.98, 1.05, 1.12, 1.28];
            case '1y': return [0.92, 1.08, 1.15, 1.24];
            case 'all': return [0.78, 0.95, 0.88, 1.12, 1.31];
            default: return [0.95, 1.02, 0.98, 1.05, 1.12, 1.28];
          }
        case 'beta':
          switch (timeFrame) {
            case '1m': return [0.82, 0.85, 0.83, 0.80];
            case '3m': return [0.88, 0.84, 0.81];
            case '6m': return [0.92, 0.89, 0.91, 0.94, 0.88, 0.82];
            case '1y': return [0.95, 0.91, 0.87, 0.83];
            case 'all': return [1.08, 0.98, 1.02, 0.89, 0.85];
            default: return [0.92, 0.89, 0.91, 0.94, 0.88, 0.82];
          }
      }
    };

    return {
      labels: getLabels(),
      datasets: [
        {
          label: getMetricConfig(metric).label,
          data: getData(),
          color: () => getMetricConfig(metric).color,
        }
      ]
    };
  };

  return generateTimeSeriesData(metric, timeFrame);
};

// Helper function needed outside component
const getMetricConfig = (metric: MetricType) => {
  switch (metric) {
    case 'var':
      return {
        label: 'Value at Risk',
        color: '#FF3B30',
        suffix: '%',
        description: 'Potential loss at 95% confidence level'
      };
    case 'volatility':
      return {
        label: 'Volatility',
        color: '#FF9500',
        suffix: '%',
        description: 'Annualized standard deviation'
      };
    case 'sharpe':
      return {
        label: 'Sharpe Ratio',
        color: '#34C759',
        suffix: '',
        description: 'Risk-adjusted return'
      };
    case 'beta':
      return {
        label: 'Beta',
        color: '#007AFF',
        suffix: '',
        description: 'Market sensitivity'
      };
  }
};

interface TimeSeriesCardProps {
  portfolioId: string;
  onViewMore?: () => void;
  detailed?: boolean;
  riskMetrics?: RiskMetrics | null;
  varResults?: VaRResults | null;
}

type MetricType = 'var' | 'volatility' | 'sharpe' | 'beta';
type TimeFrame = '1m' | '3m' | '6m' | '1y' | 'all';

const TimeSeriesCard: React.FC<TimeSeriesCardProps> = ({
  portfolioId,
  onViewMore,
  detailed = false,
  riskMetrics,
  varResults
}) => {
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('var');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('6m');
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null);
  
  const screenWidth = Dimensions.get('window').width - (detailed ? 32 : 64);
  
  useEffect(() => {
    loadTimeSeriesData();
  }, [portfolioId, selectedTimeFrame, selectedMetric]);

  const loadTimeSeriesData = async () => {
    setLoading(true);
    try {
      // Try to fetch real data from database first
              // Map metric types to match the service
        const metricTypeMap: Record<MetricType, 'var' | 'volatility' | 'sharpe_ratio' | 'beta'> = {
          'var': 'var',
          'volatility': 'volatility', 
          'sharpe': 'sharpe_ratio',
          'beta': 'beta'
        };
        
        const data = await riskTrackingService.getTimeSeriesData(
          portfolioId, 
          metricTypeMap[selectedMetric], 
          selectedTimeFrame
        );
      setTimeSeriesData(data);
    } catch (error) {
      console.error('Error loading time series data:', error);
      // Fallback to mock data if real data fails
      const mockData = await fetchRiskTimeSeriesData(portfolioId, selectedMetric, selectedTimeFrame);
      setTimeSeriesData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentValue = () => {
    if (!riskMetrics || !varResults) return null;
    
    switch (selectedMetric) {
      case 'var':
        return varResults.varPercentage;
      case 'volatility':
        return riskMetrics.volatility;
      case 'sharpe':
        return riskMetrics.sharpeRatio;
      case 'beta':
        return riskMetrics.beta;
    }
  };

  const getChangePercentage = () => {
    if (!timeSeriesData) return 0;
    const values = timeSeriesData.datasets[0].data;
    const startValue = values[0];
    const endValue = values[values.length - 1];
    return ((endValue - startValue) / startValue) * 100;
  };

  const getMetricInsights = () => {
    if (!timeSeriesData) return [];
    
    const values = timeSeriesData.datasets[0].data;
    const currentValue = values[values.length - 1];
    const changePercentage = getChangePercentage();
    const trend = changePercentage >= 0 ? 'increased' : 'decreased';
    const isGoodTrend = (selectedMetric === 'sharpe' && changePercentage > 0) || 
                       (selectedMetric !== 'sharpe' && selectedMetric !== 'beta' && changePercentage < 0) ||
                       (selectedMetric === 'beta' && Math.abs(currentValue - 1.0) < Math.abs(values[0] - 1.0));

    const insights = [
      {
        icon: changePercentage >= 0 ? "trending-up" : "trending-down",
        color: isGoodTrend ? "#34C759" : "#FF3B30",
        text: `${metricConfig.label} has ${trend} by ${Math.abs(changePercentage).toFixed(2)}% over the selected ${selectedTimeFrame} period.`
      }
    ];

    // Add specific insights based on metric
    switch (selectedMetric) {
      case 'var':
        if (currentValue < 2.0) {
          insights.push({
            icon: "checkmark-circle",
            color: "#34C759",
            text: "Your portfolio's risk level is within acceptable limits. VaR below 2% indicates good risk control."
          });
        } else if (currentValue > 5.0) {
          insights.push({
            icon: "warning",
            color: "#FF9500",
            text: "VaR above 5% suggests elevated risk. Consider diversification or position sizing adjustments."
          });
        }
        break;
      case 'volatility':
        if (currentValue < 15.0) {
          insights.push({
            icon: "checkmark-circle",
            color: "#34C759",
            text: "Low volatility indicates stable returns. Your portfolio shows good consistency."
          });
        } else if (currentValue > 25.0) {
          insights.push({
            icon: "alert-circle",
            color: "#FF3B30",
            text: "High volatility detected. Consider adding more stable assets to reduce fluctuations."
          });
        }
        break;
      case 'sharpe':
        if (currentValue > 1.5) {
          insights.push({
            icon: "star",
            color: "#34C759",
            text: "Excellent risk-adjusted returns! Your portfolio efficiently generates returns for the risk taken."
          });
        } else if (currentValue < 0.5) {
          insights.push({
            icon: "warning",
            color: "#FF9500",
            text: "Low Sharpe ratio suggests poor risk-adjusted returns. Review your investment strategy."
          });
        }
        break;
      case 'beta':
        if (currentValue > 1.2) {
          insights.push({
            icon: "trending-up",
            color: "#FF9500",
            text: "High beta indicates strong market sensitivity. Expect amplified market movements."
          });
        } else if (currentValue < 0.8) {
          insights.push({
            icon: "shield",
            color: "#34C759",
            text: "Low beta provides defensive characteristics. Your portfolio is less sensitive to market swings."
          });
        } else {
          insights.push({
            icon: "analytics",
            color: "#007AFF",
            text: "Beta near 1.0 indicates market-like behavior. Your portfolio moves similarly to the broader market."
          });
        }
        break;
    }

    return insights;
  };

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => getMetricConfig(selectedMetric).color,
    strokeWidth: 3,
    decimalPlaces: selectedMetric === 'sharpe' || selectedMetric === 'beta' ? 2 : 1,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, detailed && styles.detailedContainer]}>
        {!detailed && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Risk Tracking</Text>
            {onViewMore && (
              <TouchableOpacity style={styles.viewMoreButton} onPress={onViewMore}>
                <Text style={styles.viewMoreText}>See Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading risk data...</Text>
        </View>
      </View>
    );
  }

  const metricConfig = getMetricConfig(selectedMetric);
  const currentValue = getCurrentValue();
  const changePercentage = getChangePercentage();

  return (
    <View style={[styles.container, detailed && styles.detailedContainer]}>
      {!detailed && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Risk Tracking</Text>
          {onViewMore && (
            <TouchableOpacity style={styles.viewMoreButton} onPress={onViewMore}>
              <Text style={styles.viewMoreText}>See Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.metricSelector}>
        {(['var', 'volatility', 'sharpe', 'beta'] as MetricType[]).map((metric) => (
          <TouchableOpacity
            key={metric}
            style={[
              styles.metricButton,
              selectedMetric === metric && styles.metricButtonActive
            ]}
            onPress={() => setSelectedMetric(metric)}
          >
            <Text 
              style={[
                styles.metricButtonText,
                selectedMetric === metric && styles.metricButtonTextActive
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              {getMetricConfig(metric).label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.currentValueContainer}>
          <Text style={styles.currentValueLabel}>Current Value</Text>
          <Text style={[styles.currentValue, { color: metricConfig.color }]}>
            {currentValue?.toFixed(2)}{metricConfig.suffix}
          </Text>
        </View>
        <View style={styles.changeContainer}>
          <Text style={styles.changeLabel}>Change</Text>
          <Text style={[
            styles.changeValue,
            changePercentage >= 0 ? styles.positiveChange : styles.negativeChange
          ]}>
            {changePercentage >= 0 ? '+' : ''}{changePercentage.toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={styles.timeFrameSelector}>
        {(['1m', '3m', '6m', '1y', 'all'] as TimeFrame[]).map((timeFrame) => (
          <TouchableOpacity
            key={timeFrame}
            style={[
              styles.timeFrameButton,
              selectedTimeFrame === timeFrame && styles.timeFrameButtonActive
            ]}
            onPress={() => setSelectedTimeFrame(timeFrame)}
          >
            <Text style={[
              styles.timeFrameButtonText,
              selectedTimeFrame === timeFrame && styles.timeFrameButtonTextActive
            ]}>
              {timeFrame.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>
            {metricConfig.label} Trend - {selectedTimeFrame.toUpperCase()}
          </Text>
          <Text style={styles.chartSubtitle}>
            {metricConfig.description}
          </Text>
        </View>
        <LineChart
          data={timeSeriesData}
          width={screenWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          fromZero={selectedMetric === 'var' || selectedMetric === 'volatility'}
          yAxisSuffix={metricConfig.suffix}
          yAxisInterval={1}
          withInnerLines={false}
          withOuterLines={true}
          withDots={true}
          withShadow={false}
          segments={4}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          renderDotContent={({ x, y, index }) => (
            <View
              key={index}
              style={{
                position: 'absolute',
                left: x - 20,
                top: y - 25,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderWidth: 1,
                borderColor: metricConfig.color,
                minWidth: 40,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: metricConfig.color,
                  textAlign: 'center',
                }}
              >
                {timeSeriesData.datasets[0].data[index].toFixed(
                  selectedMetric === 'sharpe' || selectedMetric === 'beta' ? 2 : 1
                )}{metricConfig.suffix}
              </Text>
            </View>
          )}
        />
      </View>

      {detailed && (
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Risk Insights</Text>
          <ScrollView style={styles.insightsScroll}>
            {getMetricInsights().map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Ionicons 
                  name={insight.icon as any} 
                  size={20} 
                  color={insight.color} 
                  style={styles.insightIcon} 
                />
                <Text style={styles.insightText}>
                  {insight.text}
                </Text>
              </View>
            ))}
            <View style={styles.insightItem}>
              <Ionicons name="information-circle" size={20} color="#007AFF" style={styles.insightIcon} />
              <Text style={styles.insightText}>
                {metricConfig.description}
              </Text>
            </View>
          </ScrollView>
        </View>
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
  detailedContainer: {
    flex: 1,
    borderRadius: 0,
    marginVertical: 0,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
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
  metricSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F5F5F7',
    borderRadius: 8,
    padding: 4,
  },
  metricButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  metricButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  metricButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
    textAlign: 'center',
  },
  metricButtonTextActive: {
    color: '#000',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  currentValueContainer: {
    flex: 1,
  },
  currentValueLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  changeContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  changeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  positiveChange: {
    color: '#34C759',
  },
  negativeChange: {
    color: '#FF3B30',
  },
  timeFrameSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeFrameButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
  },
  timeFrameButtonActive: {
    backgroundColor: '#007AFF',
  },
  timeFrameButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  timeFrameButtonTextActive: {
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chartHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
  chart: {
    borderRadius: 12,
    paddingRight: 12,
  },
  loadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  insightsContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: 16,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  insightsScroll: {
    maxHeight: 200,
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  insightIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
});

export default TimeSeriesCard; 