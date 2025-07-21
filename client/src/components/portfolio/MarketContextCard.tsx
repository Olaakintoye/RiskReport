import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';

interface MarketData {
  indices: Array<{
    symbol: string;
    name: string;
    value: number;
    change: number;
    changePercent: number;
    sparkline: number[];
  }>;
  sectors: Array<{
    name: string;
    performance: number;
    relevance: number; // How relevant to user's portfolio
  }>;
  news: Array<{
    headline: string;
    impact: 'positive' | 'negative' | 'neutral';
    relevance: number;
    timestamp: string;
  }>;
  correlations: Array<{
    index: string;
    correlation: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

interface MarketContextCardProps {
  portfolioIds: string[];
  onNewsPress?: (headline: string) => void;
  onCorrelationPress?: () => void;
}

const MarketContextCard: React.FC<MarketContextCardProps> = ({
  portfolioIds,
  onNewsPress,
  onCorrelationPress
}) => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'indices' | 'sectors' | 'news'>('indices');

  useEffect(() => {
    loadMarketData();
  }, [portfolioIds]);

  const loadMarketData = async () => {
    setLoading(true);
    try {
      // Mock data - in real app, this would come from market data service
      const mockData: MarketData = {
        indices: [
          {
            symbol: 'SPX',
            name: 'S&P 500',
            value: 4567.89,
            change: 23.45,
            changePercent: 0.52,
            sparkline: [4540, 4550, 4545, 4560, 4555, 4570, 4568]
          },
          {
            symbol: 'DJI',
            name: 'Dow Jones',
            value: 34567.12,
            change: -45.67,
            changePercent: -0.13,
            sparkline: [34600, 34590, 34580, 34570, 34560, 34550, 34567]
          },
          {
            symbol: 'IXIC',
            name: 'Nasdaq',
            value: 14234.56,
            change: 78.90,
            changePercent: 0.56,
            sparkline: [14150, 14180, 14200, 14220, 14210, 14230, 14235]
          }
        ],
        sectors: [
          { name: 'Technology', performance: 1.2, relevance: 85 },
          { name: 'Healthcare', performance: 0.8, relevance: 60 },
          { name: 'Finance', performance: -0.3, relevance: 40 },
          { name: 'Energy', performance: 2.1, relevance: 20 },
          { name: 'Consumer Discretionary', performance: 0.5, relevance: 70 }
        ],
        news: [
          {
            headline: 'Fed signals potential rate cuts in Q2',
            impact: 'positive',
            relevance: 90,
            timestamp: '2h ago'
          },
          {
            headline: 'Tech earnings season shows mixed results',
            impact: 'neutral',
            relevance: 85,
            timestamp: '4h ago'
          },
          {
            headline: 'Oil prices surge on supply concerns',
            impact: 'negative',
            relevance: 25,
            timestamp: '6h ago'
          }
        ],
        correlations: [
          { index: 'SPX', correlation: 0.87, trend: 'up' },
          { index: 'QQQ', correlation: 0.72, trend: 'stable' },
          { index: 'IWM', correlation: 0.45, trend: 'down' }
        ]
      };
      
      setMarketData(mockData);
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
    const width = 50;
    const height = 20;
    const path = generateSparklinePath(data, width, height);
    
    return (
      <Svg width={width} height={height}>
        <Path
          d={path}
          stroke={isPositive ? '#10b981' : '#ef4444'}
          strokeWidth={1.5}
          fill="none"
        />
      </Svg>
    );
  };

  const renderIndices = () => {
    if (!marketData) return null;
    
    return (
      <View style={styles.indicesContainer}>
        {marketData.indices.map((index) => (
          <View key={index.symbol} style={styles.indexItem}>
            <View style={styles.indexHeader}>
              <View>
                <Text style={styles.indexSymbol}>{index.symbol}</Text>
                <Text style={styles.indexName}>{index.name}</Text>
              </View>
              {renderSparkline(index.sparkline, index.change >= 0)}
            </View>
            <View style={styles.indexData}>
              <Text style={styles.indexValue}>{formatCurrency(index.value)}</Text>
              <Text style={[
                styles.indexChange,
                index.change >= 0 ? styles.positiveChange : styles.negativeChange
              ]}>
                {formatPercentage(index.changePercent)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSectors = () => {
    if (!marketData) return null;
    
    return (
      <View style={styles.sectorsContainer}>
        {marketData.sectors.map((sector) => (
          <View key={sector.name} style={styles.sectorItem}>
            <View style={styles.sectorHeader}>
              <Text style={styles.sectorName}>{sector.name}</Text>
              <View style={styles.sectorRelevance}>
                <View style={[
                  styles.relevanceBar,
                  { width: `${sector.relevance}%` }
                ]} />
              </View>
            </View>
            <View style={styles.sectorPerformance}>
              <Text style={[
                styles.sectorPerformanceText,
                sector.performance >= 0 ? styles.positiveChange : styles.negativeChange
              ]}>
                {formatPercentage(sector.performance)}
              </Text>
              <Text style={styles.sectorRelevanceText}>
                {sector.relevance}% exposure
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderNews = () => {
    if (!marketData) return null;
    
    return (
      <View style={styles.newsContainer}>
        {marketData.news.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.newsItem}
            onPress={() => onNewsPress?.(item.headline)}
          >
            <View style={styles.newsHeader}>
              <MaterialCommunityIcons
                name={
                  item.impact === 'positive' ? 'trending-up' :
                  item.impact === 'negative' ? 'trending-down' : 'trending-neutral'
                }
                size={16}
                color={
                  item.impact === 'positive' ? '#10b981' :
                  item.impact === 'negative' ? '#ef4444' : '#64748b'
                }
              />
              <Text style={styles.newsTimestamp}>{item.timestamp}</Text>
              <View style={[
                styles.relevanceBadge,
                { opacity: item.relevance / 100 }
              ]}>
                <Text style={styles.relevanceBadgeText}>{item.relevance}%</Text>
              </View>
            </View>
            <Text style={styles.newsHeadline}>{item.headline}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading market data...</Text>
      </View>
    );
  }

  if (!marketData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Market Context</Text>
        <TouchableOpacity style={styles.correlationButton} onPress={onCorrelationPress}>
          <MaterialCommunityIcons name="chart-scatter-plot" size={16} color="#3b82f6" />
          <Text style={styles.correlationButtonText}>Correlations</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabsContainer}>
        {['indices', 'sectors', 'news'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.selectedTab
            ]}
            onPress={() => setSelectedTab(tab as any)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.selectedTabText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'indices' && renderIndices()}
        {selectedTab === 'sectors' && renderSectors()}
        {selectedTab === 'news' && renderNews()}
      </ScrollView>

      {/* Portfolio Correlations Summary */}
      <View style={styles.correlationsSummary}>
        <Text style={styles.correlationsTitle}>Portfolio Correlations</Text>
        <View style={styles.correlationsContainer}>
          {marketData.correlations.map((corr) => (
            <View key={corr.index} style={styles.correlationItem}>
              <Text style={styles.correlationIndex}>{corr.index}</Text>
              <View style={styles.correlationValue}>
                <Text style={styles.correlationNumber}>
                  {corr.correlation.toFixed(2)}
                </Text>
                <MaterialCommunityIcons
                  name={
                    corr.trend === 'up' ? 'trending-up' :
                    corr.trend === 'down' ? 'trending-down' : 'trending-neutral'
                  }
                  size={12}
                  color={
                    corr.trend === 'up' ? '#10b981' :
                    corr.trend === 'down' ? '#ef4444' : '#64748b'
                  }
                />
              </View>
            </View>
          ))}
        </View>
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
  correlationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  correlationButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
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
  tabText: {
    fontSize: 14,
    color: '#64748b',
  },
  selectedTabText: {
    color: '#1e293b',
    fontWeight: '600',
  },
  content: {
    maxHeight: 200,
  },
  indicesContainer: {
    gap: 12,
  },
  indexItem: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  indexHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  indexSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  indexName: {
    fontSize: 12,
    color: '#64748b',
  },
  indexData: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indexValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  indexChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  positiveChange: {
    color: '#10b981',
  },
  negativeChange: {
    color: '#ef4444',
  },
  sectorsContainer: {
    gap: 12,
  },
  sectorItem: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  sectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  sectorRelevance: {
    width: 60,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  relevanceBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  sectorPerformance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectorPerformanceText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectorRelevanceText: {
    fontSize: 12,
    color: '#64748b',
  },
  newsContainer: {
    gap: 12,
  },
  newsItem: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  newsTimestamp: {
    fontSize: 12,
    color: '#64748b',
  },
  relevanceBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  relevanceBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  newsHeadline: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  correlationsSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  correlationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  correlationsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  correlationItem: {
    alignItems: 'center',
  },
  correlationIndex: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  correlationValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  correlationNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});

export default MarketContextCard; 