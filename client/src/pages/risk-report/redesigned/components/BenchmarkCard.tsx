import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart, LineChart } from 'react-native-chart-kit';

// Mock data service (replace with actual implementation)
const fetchBenchmarkData = async (portfolioId: string) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 700));

  // Mock data for demonstration purposes
  return {
    comparisonDate: '2024-05-01',
    benchmarks: [
      {
        name: 'S&P 500',
        portfolioValue: 3.8,
        benchmarkValue: 2.9,
        difference: 0.9
      },
      {
        name: 'Nasdaq',
        portfolioValue: 3.8,
        benchmarkValue: 3.2,
        difference: 0.6
      },
      {
        name: 'DJIA',
        portfolioValue: 3.8,
        benchmarkValue: 4.1,
        difference: -0.3
      },
      {
        name: '60/40 Blend',
        portfolioValue: 3.8,
        benchmarkValue: 3.7,
        difference: 0.1
      }
    ]
  };
};

interface BenchmarkCardProps {
  portfolioId: string;
  onViewMore?: () => void;
  detailed?: boolean;
}

const benchmarkInfo = {
  title: 'Benchmark Comparison',
  description: 'Benchmark comparison helps you understand how your portfolio is performing relative to major market indices or blended benchmarks. Outperforming a benchmark means your portfolio is doing better than the market standard, while underperforming means it is lagging behind.',
  details: 'Common benchmarks include the S&P 500, Nasdaq, and 60/40 stock/bond blends. Comparing risk-adjusted returns (like Sharpe ratio) gives a fuller picture than raw returns alone.'
};

const TIME_PERIODS = ['1M', '3M', '6M', '1Y', 'ALL'];

const BenchmarkCard: React.FC<BenchmarkCardProps> = ({
  portfolioId,
  onViewMore,
  detailed = false
}) => {
  const [loading, setLoading] = useState(true);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [infoModal, setInfoModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('1Y');
  
  // Screen width for responsive chart
  const screenWidth = Dimensions.get('window').width - (detailed ? 32 : 64);
  
  useEffect(() => {
    const loadBenchmarkData = async () => {
      setLoading(true);
      try {
        const data = await fetchBenchmarkData(portfolioId);
        setBenchmarkData(data);
      } catch (error) {
        console.error('Error loading benchmark data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadBenchmarkData();
  }, [portfolioId, selectedPeriod]);
  
  if (loading) {
    return (
      <View style={[styles.container, detailed && styles.detailedContainer]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Benchmark Comparison</Text>
          <TouchableOpacity onPress={() => setInfoModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={20} color="#ADD8E6" />
          </TouchableOpacity>
          {onViewMore && !detailed && (
            <TouchableOpacity style={styles.viewMoreButton} onPress={onViewMore}>
              <Text style={styles.viewMoreText}>See Details</Text>
              <Ionicons name="chevron-forward" size={16} color="#000000" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading benchmark data...</Text>
        </View>
      </View>
    );
  }
  
  if (!benchmarkData) {
    return (
      <View style={[styles.container, detailed && styles.detailedContainer]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Benchmark Comparison</Text>
          <TouchableOpacity onPress={() => setInfoModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="information-circle-outline" size={20} color="#ADD8E6" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Failed to load benchmark data</Text>
        </View>
      </View>
    );
  }
  
  // Grouped bar chart data
  const chartData = {
    labels: benchmarkData.benchmarks.map((b: Benchmark) => b.name),
    datasets: [
      {
        data: benchmarkData.benchmarks.map((b: Benchmark) => b.portfolioValue),
        color: () => '#007AFF',
        label: 'Your Portfolio'
      },
      {
        data: benchmarkData.benchmarks.map((b: Benchmark) => b.benchmarkValue),
        color: () => '#8E8E93',
        label: 'Benchmark'
      }
    ],
    legend: ['Your Portfolio', 'Benchmark']
  };
  
  // Find best/worst performance
  type Benchmark = { name: string; portfolioValue: number; benchmarkValue: number; difference: number };
  const best = benchmarkData.benchmarks.reduce((a: Benchmark, b: Benchmark) => (a.difference > b.difference ? a : b));
  const worst = benchmarkData.benchmarks.reduce((a: Benchmark, b: Benchmark) => (a.difference < b.difference ? a : b));
  const outperformCount = benchmarkData.benchmarks.filter((b: Benchmark) => b.difference > 0).length;
  const underperformCount = benchmarkData.benchmarks.filter((b: Benchmark) => b.difference < 0).length;
  
  return (
    <View style={[styles.container, detailed && styles.detailedContainer]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Benchmark Comparison</Text>
        <TouchableOpacity onPress={() => setInfoModal(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="information-circle-outline" size={20} color="#ADD8E6" />
        </TouchableOpacity>
        {onViewMore && !detailed && (
          <TouchableOpacity style={styles.viewMoreButton} onPress={onViewMore}>
            <Text style={styles.viewMoreText}>See Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#000000" />
          </TouchableOpacity>
        )}
      </View>
      
      {detailed && (
        <View style={styles.periodSelector}>
          {TIME_PERIODS.map(period => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.activePeriodButton]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === period && styles.activePeriodButtonText]}>{period}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <ScrollView horizontal contentContainerStyle={{ minWidth: screenWidth }} showsHorizontalScrollIndicator={false}>
        <BarChart
          data={chartData}
          width={Math.max(screenWidth, 60 * chartData.labels.length + 60)}
          height={220}
          chartConfig={{
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            barPercentage: 0.45,
            decimalPlaces: 1,
            style: { borderRadius: 16 },
            propsForBackgroundLines: { stroke: 'rgba(0,0,0,0.05)' }
          }}
          fromZero
          showValuesOnTopOfBars
          withInnerLines={false}
          style={styles.chart}
          yAxisSuffix="%"
        />
      </ScrollView>
      
      {/* Summary Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Benchmark</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Portfolio</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Benchmark</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Diff</Text>
        </View>
        {benchmarkData.benchmarks.map((b: Benchmark, idx: number) => (
          <View key={b.name} style={[styles.tableRow, idx % 2 === 1 && styles.altRow]}> 
            <Text style={[styles.tableCell, { flex: 2 }]}>{b.name}</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{b.portfolioValue.toFixed(2)}%</Text>
            <Text style={[styles.tableCell, { flex: 1 }]}>{b.benchmarkValue.toFixed(2)}%</Text>
            <Text style={[styles.tableCell, { flex: 1, color: b.difference > 0 ? '#34C759' : b.difference < 0 ? '#FF3B30' : '#8E8E93' }]}> 
              {b.difference > 0 ? '▲' : b.difference < 0 ? '▼' : '–'} {Math.abs(b.difference).toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>
      
      {/* Performance Insights */}
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Performance Insights</Text>
        <Text style={styles.insightText}>
          Best relative performance: <Text style={{ color: '#34C759', fontWeight: '600' }}>{best.name} ({best.difference > 0 ? '+' : ''}{best.difference.toFixed(2)}%)</Text>{'\n'}
          Worst relative performance: <Text style={{ color: '#FF3B30', fontWeight: '600' }}>{worst.name} ({worst.difference > 0 ? '+' : ''}{worst.difference.toFixed(2)}%)</Text>{'\n'}
          {outperformCount > underperformCount
            ? `Your portfolio is outperforming ${outperformCount} out of ${benchmarkData.benchmarks.length} benchmarks.`
            : outperformCount === underperformCount
              ? 'Your portfolio is performing on par with most benchmarks.'
              : `Your portfolio is underperforming ${underperformCount} out of ${benchmarkData.benchmarks.length} benchmarks.`}
        </Text>
        <Text style={styles.insightText}>
          Risk-adjusted performance (Sharpe ratio) is higher than the benchmark for most periods. Consider both return and risk for a full picture.
        </Text>
      </View>
      
      {/* Info Modal */}
      <Modal
        visible={infoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 340 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#23272f' }}>{benchmarkInfo.title}</Text>
              <TouchableOpacity onPress={() => setInfoModal(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 15, color: '#23272f', marginBottom: 10 }}>{benchmarkInfo.description}</Text>
            <Text style={{ fontSize: 14, color: '#64748b', fontStyle: 'italic' }}>{benchmarkInfo.details}</Text>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  viewMoreText: {
    fontSize: 14,
    color: '#000000',
    marginRight: 4,
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
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F5F5F7',
    marginHorizontal: 4,
  },
  activePeriodButton: {
    backgroundColor: '#007AFF',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activePeriodButtonText: {
    color: '#FFFFFF',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
    paddingRight: 12,
  },
  tableContainer: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontWeight: '700',
    color: '#273c75',
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },
  altRow: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    fontSize: 13,
    color: '#23272f',
  },
  insightsContainer: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  insightsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#273c75',
    marginBottom: 6,
  },
  insightText: {
    fontSize: 13,
    color: '#23272f',
    marginBottom: 4,
  },
});

export default BenchmarkCard; 