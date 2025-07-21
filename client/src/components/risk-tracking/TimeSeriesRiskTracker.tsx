import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

interface TimeSeriesRiskTrackerProps {
  portfolioId: string;
  timeframe?: '1m' | '3m' | '6m' | '1y' | 'ytd' | 'all';
  metricType?: 'var' | 'volatility' | 'drawdown' | 'sharpe';
}

interface TimeSeriesData {
  dates: string[];
  values: number[];
  thresholds?: number[];
}

const TimeSeriesRiskTracker: React.FC<TimeSeriesRiskTrackerProps> = ({ 
  portfolioId, 
  timeframe = '6m',
  metricType = 'var'
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData>({
    dates: [],
    values: [],
    thresholds: []
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>(timeframe);
  const [selectedMetric, setSelectedMetric] = useState<string>(metricType);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [thresholdStatus, setThresholdStatus] = useState<'ok' | 'warning' | 'alert'>('ok');

  useEffect(() => {
    loadTimeSeriesData();
  }, [portfolioId, selectedTimeframe, selectedMetric]);

  const loadTimeSeriesData = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, this would fetch data from an API or service
      // For now, we'll generate mock data
      const mockData = generateMockTimeSeriesData(selectedTimeframe, selectedMetric);
      
      setTimeSeriesData(mockData);
      setCurrentValue(mockData.values[mockData.values.length - 1]);
      
      // Calculate percent change from start
      const startValue = mockData.values[0];
      const endValue = mockData.values[mockData.values.length - 1];
      const percentChange = ((endValue - startValue) / startValue) * 100;
      setChangePercent(percentChange);
      
      // Set threshold status
      if (mockData.thresholds) {
        const threshold = mockData.thresholds[mockData.thresholds.length - 1];
        setThresholdStatus(
          endValue > threshold * 0.9 ? 'warning' : 
          endValue > threshold ? 'alert' : 'ok'
        );
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading time series data:', error);
      setIsLoading(false);
    }
  };

  const generateMockTimeSeriesData = (timeframe: string, metricType: string): TimeSeriesData => {
    // Generate realistic looking mock data based on timeframe and metric type
    let dates = [];
    let baseValues = [];
    let thresholds = [];
    
    const dataPoints = timeframe === '1m' ? 30 : 
                       timeframe === '3m' ? 90 : 
                       timeframe === '6m' ? 180 : 
                       timeframe === '1y' ? 250 : 180;
    
    // Generate dates going back from today
    const today = new Date();
    for (let i = dataPoints; i >= 0; i -= Math.floor(dataPoints / 10)) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      dates.push(`${pastDate.getMonth() + 1}/${pastDate.getDate()}`);
    }
    
    // Random walk simulation with an upward trend for values
    let baseValue = 0;
    
    // Set appropriate starting value based on metric
    if (metricType === 'var') baseValue = 4.5;
    else if (metricType === 'volatility') baseValue = 12;
    else if (metricType === 'drawdown') baseValue = 8;
    else if (metricType === 'sharpe') baseValue = 1.2;
    
    // Generate base values
    let currentValue = baseValue;
    for (let i = 0; i < dates.length; i++) {
      baseValues.push(currentValue);
      
      // Random walk with drift based on metric
      const volatility = metricType === 'volatility' ? 0.8 : 0.3;
      const random = (Math.random() - 0.48) * volatility;  // Slight upward bias
      
      if (metricType === 'sharpe') {
        // Sharpe should fluctuate around a baseline
        currentValue = currentValue + random;
        if (currentValue < 0.5) currentValue = 0.5 + Math.random() * 0.2;
        if (currentValue > 2.5) currentValue = 2.5 - Math.random() * 0.2;
      } else {
        // Other risk metrics generally increase over time
        currentValue = Math.max(0.5, currentValue + random);
      }
    }
    
    // Set appropriate thresholds
    if (metricType === 'var') thresholds = Array(dates.length).fill(7.5);
    else if (metricType === 'volatility') thresholds = Array(dates.length).fill(18);
    else if (metricType === 'drawdown') thresholds = Array(dates.length).fill(15);
    else if (metricType === 'sharpe') thresholds = Array(dates.length).fill(1.0);
    
    // Take samples to match the dates
    return {
      dates,
      values: baseValues,
      thresholds
    };
  };

  const getMetricLabel = (type: string) => {
    switch(type) {
      case 'var': return 'Value at Risk (95%)';
      case 'volatility': return 'Annualised Volatility';
      case 'drawdown': return 'Max Drawdown';
      case 'sharpe': return 'Sharpe Ratio';
      default: return 'Risk Metric';
    }
  };

  const getMetricSymbol = (type: string) => {
    switch(type) {
      case 'var': 
      case 'volatility': 
      case 'drawdown': 
        return '%';
      case 'sharpe':
        return '';
      default: 
        return '';
    }
  };

  const getMetricDescription = (type: string) => {
    switch(type) {
      case 'var': 
        return 'Potential loss at 95% confidence level over 1-day horizon';
      case 'volatility': 
        return 'Annualized standard deviation of daily returns';
      case 'drawdown': 
        return 'Maximum loss from peak to trough over the period';
      case 'sharpe':
        return 'Risk-adjusted return (excess return / volatility)';
      default: 
        return '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Loading risk time series...</Text>
      </View>
    );
  }

  const chartWidth = Dimensions.get('window').width - 32;
  
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '2',
      strokeWidth: '1',
      stroke: '#10b981'
    }
  };
  
  const formattedChartData = {
    labels: timeSeriesData.dates,
    datasets: [
      {
        data: timeSeriesData.values,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 2
      },
      ...(timeSeriesData.thresholds ? [{
        data: timeSeriesData.thresholds,
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity * 0.7})`,
        strokeWidth: 1,
        withDots: false
      }] : [])
    ],
    legend: timeSeriesData.thresholds ? ['Current', 'Threshold'] : ['Current']
  };

  return (
    <Card style={styles.card}>
      <Card.Title 
        title={`${getMetricLabel(selectedMetric)} Time Series`} 
        subtitle={getMetricDescription(selectedMetric)}
      />
      <Card.Content>
        <View style={styles.metricSelectorContainer}>
          <View style={styles.metricSelector}>
            <TouchableOpacity 
              style={[
                styles.metricButton, 
                selectedMetric === 'var' && styles.metricButtonActive
              ]}
              onPress={() => setSelectedMetric('var')}
            >
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'var' && styles.metricButtonTextActive
              ]}>
                VaR
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
            <TouchableOpacity 
              style={[
                styles.metricButton, 
                selectedMetric === 'sharpe' && styles.metricButtonActive
              ]}
              onPress={() => setSelectedMetric('sharpe')}
            >
              <Text style={[
                styles.metricButtonText,
                selectedMetric === 'sharpe' && styles.metricButtonTextActive
              ]}>
                Sharpe
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.summarySection}>
          <View style={styles.currentValueContainer}>
            <View style={styles.valueSection}>
              <Text style={styles.currentLabel}>Current</Text>
              <Text style={styles.currentValue}>
                {currentValue.toFixed(2)}{getMetricSymbol(selectedMetric)}
              </Text>
            </View>
            
            <View style={styles.valueSection}>
              <Text style={styles.changeLabel}>Change</Text>
              <Text style={[
                styles.changeValue,
                // For some metrics like volatility and drawdown, negative change is good
                selectedMetric === 'volatility' || selectedMetric === 'drawdown' || selectedMetric === 'var'
                  ? changePercent < 0 ? styles.positiveChange : styles.negativeChange
                  : changePercent > 0 ? styles.positiveChange : styles.negativeChange
              ]}>
                {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </Text>
            </View>
            
            <View style={styles.valueSection}>
              <Text style={styles.statusLabel}>Status</Text>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusIndicator,
                  thresholdStatus === 'ok' ? styles.statusOk :
                  thresholdStatus === 'warning' ? styles.statusWarning :
                  styles.statusAlert
                ]} />
                <Text style={styles.statusText}>
                  {thresholdStatus === 'ok' ? 'Within Limit' :
                   thresholdStatus === 'warning' ? 'Near Limit' :
                   'Exceeds Limit'}
                </Text>
              </View>
            </View>
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
            data={formattedChartData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={true}
            withDots={false}
            withShadow={false}
          />
        </View>
        
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.seriesLegend]} />
            <Text style={styles.legendText}>Current Value</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.thresholdLegend]} />
            <Text style={styles.legendText}>Risk Threshold</Text>
          </View>
        </View>
        
        <Text style={styles.dataNote}>
          {`Data shown for the past ${
            selectedTimeframe === '1m' ? 'month' : 
            selectedTimeframe === '3m' ? '3 months' : 
            selectedTimeframe === '6m' ? '6 months' : 
            selectedTimeframe === '1y' ? 'year' : 
            selectedTimeframe === 'ytd' ? 'year to date' : 'all available history'
          }`}
        </Text>
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
  metricSelectorContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  metricSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  metricButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  metricButtonActive: {
    backgroundColor: '#10b981',
  },
  metricButtonText: {
    fontSize: 13,
    color: '#64748b',
  },
  metricButtonTextActive: {
    color: '#ffffff',
    fontWeight: '500',
  },
  summarySection: {
    marginBottom: 20,
  },
  currentValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  valueSection: {
    alignItems: 'center',
  },
  currentLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
  },
  changeLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveChange: {
    color: '#10b981',
  },
  negativeChange: {
    color: '#ef4444',
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusOk: {
    backgroundColor: '#10b981',
  },
  statusWarning: {
    backgroundColor: '#f59e0b',
  },
  statusAlert: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 14,
    color: '#334155',
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
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  seriesLegend: {
    backgroundColor: '#10b981',
  },
  thresholdLegend: {
    backgroundColor: '#ef4444',
  },
  legendText: {
    fontSize: 12,
    color: '#64748b',
  },
  dataNote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default TimeSeriesRiskTracker; 