import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ActivityIndicator } from 'react-native';
import { Card, Divider } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface BenchmarkComparisonProps {
  portfolioId: string;
  timeframe?: '1m' | '3m' | '6m' | '1y' | 'ytd' | 'all';
  metricType?: 'performance' | 'volatility' | 'drawdown';
}

interface ChartData {
  labels: string[];
  portfolioData: number[];
  benchmarkData: number[];
}

const BenchmarkComparison: React.FC<BenchmarkComparisonProps> = ({ 
  portfolioId, 
  timeframe = '3m',
  metricType = 'performance'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    portfolioData: [],
    benchmarkData: []
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(timeframe);
  const [selectedMetric, setSelectedMetric] = useState<string>(metricType);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [benchmarkName, setBenchmarkName] = useState('S&P 500');
  const [performanceSummary, setPerformanceSummary] = useState({
    portfolio: { value: 0, change: 0 },
    benchmark: { value: 0, change: 0 }
  });

  useEffect(() => {
    loadChartData();
  }, [portfolioId, selectedTimeframe, selectedMetric]);

  const loadChartData = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, this would fetch data from an API or service
      // For now, we'll generate mock data
      const mockData = generateMockData(selectedTimeframe, selectedMetric);
      
      setChartData(mockData.chartData);
      setPerformanceSummary(mockData.summary);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading chart data:', error);
      setIsLoading(false);
    }
  };

  const generateMockData = (timeframe: string, metricType: string) => {
    // Generate realistic looking mock data based on timeframe and metric type
    let labels = [];
    let portfolioData = [];
    let benchmarkData = [];
    
    // Generate different labels based on timeframe
    switch(timeframe) {
      case '1m':
        labels = ['Apr 1', 'Apr 8', 'Apr 15', 'Apr 22', 'Apr 29', 'May 1'];
        break;
      case '3m':
        labels = ['Feb', 'Mar', 'Apr', 'May'];
        break;
      case '6m':
        labels = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
        break;
      case '1y':
        labels = ['Jun', 'Aug', 'Oct', 'Dec', 'Feb', 'Apr'];
        break;
      case 'ytd':
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
        break;
      default:
        labels = ['2020', '2021', '2022', '2023', '2024'];
    }
    
    // Generate data based on metric type
    const baseData = metricType === 'performance' 
      ? [100, 102, 105, 103, 108, 112]
      : metricType === 'volatility'
      ? [12, 14, 11, 13, 10, 9]
      : [0, -3, -5, -2, -7, -4]; // drawdown
    
    // Make portfolio slightly better/worse than benchmark based on random factor
    const outperformFactor = Math.random() > 0.5 ? 1.1 : 0.9;
    
    portfolioData = baseData.slice(0, labels.length);
    benchmarkData = baseData.slice(0, labels.length).map(val => val * outperformFactor);
    
    // Calculate summary data
    const portfolioValue = portfolioData[portfolioData.length - 1];
    const portfolioStart = portfolioData[0];
    const portfolioChange = ((portfolioValue - portfolioStart) / portfolioStart) * 100;
    
    const benchmarkValue = benchmarkData[benchmarkData.length - 1];
    const benchmarkStart = benchmarkData[0];
    const benchmarkChange = ((benchmarkValue - benchmarkStart) / benchmarkStart) * 100;
    
    return {
      chartData: {
        labels,
        portfolioData,
        benchmarkData
      },
      summary: {
        portfolio: { 
          value: portfolioValue, 
          change: portfolioChange 
        },
        benchmark: { 
          value: benchmarkValue, 
          change: benchmarkChange 
        }
      }
    };
  };

  const getMetricLabel = (type: string) => {
    switch(type) {
      case 'performance': return 'Performance';
      case 'volatility': return 'Annualised Volatility';
      case 'drawdown': return 'Drawdown';
      default: return 'Value';
    }
  };

  const getMetricSymbol = (type: string) => {
    switch(type) {
      case 'performance': return '%';
      case 'volatility': return '%';
      case 'drawdown': return '%';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading benchmark comparison...</Text>
      </View>
    );
  }

  const chartWidth = Dimensions.get('window').width - 32;
  
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#10b981'
    }
  };
  
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        data: chartData.portfolioData,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2
      },
      ...(showBenchmark ? [{
        data: chartData.benchmarkData,
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2
      }] : [])
    ],
    legend: showBenchmark ? ['Portfolio', benchmarkName] : ['Portfolio']
  };

  return (
    <Card style={styles.card}>
      <Card.Title 
        title="Benchmark Comparison" 
        subtitle={`${getMetricLabel(selectedMetric)} vs ${benchmarkName}`}
      />
      <Card.Content>
        <View style={styles.controlRow}>
          <View style={styles.metricSelector}>
            <TouchableOpacity 
              style={[
                styles.metricButton, 
                selectedMetric === 'performance' && styles.metricButtonActive
              ]}
              onPress={() => setSelectedMetric('performance')}
            >
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'performance' && styles.metricButtonTextActive
              ]}>
                Performance
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.metricButton, 
                selectedMetric === 'volatility' && styles.metricButtonActive
              ]}
              onPress={() => setSelectedMetric('volatility')}
            >
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'volatility' && styles.metricButtonTextActive
              ]}>
                Annualised Volatility
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.metricButton, 
                selectedMetric === 'drawdown' && styles.metricButtonActive
              ]}
              onPress={() => setSelectedMetric('drawdown')}
            >
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'drawdown' && styles.metricButtonTextActive
              ]}>
                Drawdown
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.benchmarkToggle}>
            <Text style={styles.toggleLabel}>Show Benchmark</Text>
            <Switch
              value={showBenchmark}
              onValueChange={setShowBenchmark}
              thumbColor={showBenchmark ? '#10b981' : '#a1a1aa'}
              trackColor={{ false: '#d4d4d8', true: '#d1fae5' }}
            />
          </View>
        </View>
        
        <View style={styles.timeframeSelector}>
          {['1m', '3m', '6m', '1y', 'ytd', 'all'].map((tf) => (
            <TouchableOpacity
              key={tf}
              style={[
                styles.timeframeButton,
                selectedTimeframe === tf && styles.timeframeButtonActive
              ]}
              onPress={() => setSelectedTimeframe(tf)}
            >
              <Text style={[
                styles.timeframeButtonText,
                selectedTimeframe === tf && styles.timeframeButtonTextActive
              ]}>
                {tf.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.chartContainer}>
          <LineChart
            data={data}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withDots={true}
            withShadow={false}
          />
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.summaryContainer}>
          <View style={styles.summarySection}>
            <View style={styles.summaryHeader}>
              <View style={[styles.legendDot, styles.portfolioLegend]} />
              <Text style={styles.summaryTitle}>Your Portfolio</Text>
            </View>
            <View style={styles.summaryValueContainer}>
              <Text style={styles.summaryValue}>
                {performanceSummary.portfolio.value.toFixed(2)}
                {getMetricSymbol(selectedMetric)}
              </Text>
              <Text style={[
                styles.summaryChange,
                performanceSummary.portfolio.change >= 0 
                  ? styles.positiveChange 
                  : styles.negativeChange
              ]}>
                {performanceSummary.portfolio.change >= 0 ? '+' : ''}
                {performanceSummary.portfolio.change.toFixed(2)}%
              </Text>
            </View>
          </View>
          
          {showBenchmark && (
            <View style={styles.summarySection}>
              <View style={styles.summaryHeader}>
                <View style={[styles.legendDot, styles.benchmarkLegend]} />
                <Text style={styles.summaryTitle}>{benchmarkName}</Text>
              </View>
              <View style={styles.summaryValueContainer}>
                <Text style={styles.summaryValue}>
                  {performanceSummary.benchmark.value.toFixed(2)}
                  {getMetricSymbol(selectedMetric)}
                </Text>
                <Text style={[
                  styles.summaryChange,
                  performanceSummary.benchmark.change >= 0 
                    ? styles.positiveChange 
                    : styles.negativeChange
                ]}>
                  {performanceSummary.benchmark.change >= 0 ? '+' : ''}
                  {performanceSummary.benchmark.change.toFixed(2)}%
                </Text>
              </View>
            </View>
          )}
        </View>
        
        <View style={styles.diffContainer}>
          <Text style={styles.diffLabel}>Difference vs Benchmark:</Text>
          <Text style={[
            styles.diffValue,
            (performanceSummary.portfolio.change - performanceSummary.benchmark.change) >= 0
              ? styles.positiveChange
              : styles.negativeChange
          ]}>
            {(performanceSummary.portfolio.change - performanceSummary.benchmark.change) >= 0 ? '+' : ''}
            {(performanceSummary.portfolio.change - performanceSummary.benchmark.change).toFixed(2)}%
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#64748b',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  metricButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  metricButtonActive: {
    backgroundColor: '#10b981',
  },
  metricButtonText: {
    fontSize: 12,
    color: '#64748b',
  },
  metricButtonTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  benchmarkToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 6,
  },
  timeframeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeframeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  timeframeButtonActive: {
    backgroundColor: '#e2f5ee',
  },
  timeframeButtonText: {
    fontSize: 12,
    color: '#64748b',
  },
  timeframeButtonTextActive: {
    color: '#10b981',
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  divider: {
    marginVertical: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summarySection: {
    alignItems: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  portfolioLegend: {
    backgroundColor: '#10b981',
  },
  benchmarkLegend: {
    backgroundColor: '#3b82f6',
  },
  summaryTitle: {
    fontSize: 14,
    color: '#334155',
  },
  summaryValueContainer: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  summaryChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  positiveChange: {
    color: '#10b981',
  },
  negativeChange: {
    color: '#ef4444',
  },
  diffContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 8,
    borderRadius: 8,
  },
  diffLabel: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 6,
  },
  diffValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BenchmarkComparison; 