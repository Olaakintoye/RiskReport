import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

interface PerformanceData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
  sparklineData: number[];
}

interface PerformanceCardsProps {
  portfolioId: string;
  totalValue: number;
  onPeriodSelect?: (period: string) => void;
}

const PerformanceCards: React.FC<PerformanceCardsProps> = ({ 
  portfolioId, 
  totalValue, 
  onPeriodSelect 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('1D');
  const [loading, setLoading] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);

  useEffect(() => {
    loadPerformanceData();
  }, [portfolioId]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, this would come from a service
      const mockData: PerformanceData[] = [
        {
          period: '1D',
          value: totalValue,
          change: totalValue * 0.012,
          changePercent: 1.2,
          sparklineData: [98, 100, 102, 99, 101, 103, 100]
        },
        {
          period: '1W',
          value: totalValue,
          change: totalValue * 0.034,
          changePercent: 3.4,
          sparklineData: [95, 97, 99, 102, 98, 100, 103]
        },
        {
          period: '1M',
          value: totalValue,
          change: totalValue * 0.067,
          changePercent: 6.7,
          sparklineData: [90, 92, 95, 98, 96, 99, 103]
        },
        {
          period: '3M',
          value: totalValue,
          change: totalValue * 0.089,
          changePercent: 8.9,
          sparklineData: [85, 88, 92, 95, 93, 97, 103]
        },
        {
          period: '1Y',
          value: totalValue,
          change: totalValue * 0.156,
          changePercent: 15.6,
          sparklineData: [70, 75, 80, 85, 90, 95, 103]
        },
        {
          period: 'YTD',
          value: totalValue,
          change: totalValue * 0.123,
          changePercent: 12.3,
          sparklineData: [80, 85, 88, 92, 95, 98, 103]
        }
      ];
      
      setPerformanceData(mockData);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
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

  const formatPercentage = (value: number): string => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const generateSparklinePath = (data: number[], width: number, height: number): string => {
    if (data.length === 0) return '';
    
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  const renderSparkline = (data: number[], isPositive: boolean) => {
    const width = 60;
    const height = 20;
    const path = generateSparklinePath(data, width, height);
    
    return (
      <Svg width={width} height={height} style={styles.sparkline}>
        <Path
          d={path}
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
    );
  };

  const handlePeriodPress = (period: string) => {
    setSelectedPeriod(period);
    onPeriodSelect?.(period);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading performance data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance</Text>
        <TouchableOpacity style={styles.expandButton}>
          <MaterialCommunityIcons name="chart-line" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.cardsContainer}>
        {performanceData.map((item) => {
          const isSelected = selectedPeriod === item.period;
          const isPositive = item.change >= 0;
          
          return (
            <TouchableOpacity
              key={item.period}
              style={[
                styles.performanceCard,
                isSelected && styles.selectedCard
              ]}
              onPress={() => handlePeriodPress(item.period)}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.period, isSelected && styles.selectedText]}>
                  {item.period}
                </Text>
                {renderSparkline(item.sparklineData, isPositive)}
              </View>
              
              <Text style={[
                styles.changePercent,
                isPositive ? styles.positiveChange : styles.negativeChange,
                isSelected && styles.selectedText
              ]}>
                {formatPercentage(item.changePercent)}
              </Text>
              
              <Text style={[styles.changeValue, isSelected && styles.selectedText]}>
                {formatCurrency(Math.abs(item.change))}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  expandButton: {
    padding: 4,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedCard: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  period: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  selectedText: {
    color: '#fff',
  },
  sparkline: {
    opacity: 0.8,
  },
  changePercent: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  positiveChange: {
    color: '#10b981',
  },
  negativeChange: {
    color: '#ef4444',
  },
  changeValue: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default PerformanceCards; 