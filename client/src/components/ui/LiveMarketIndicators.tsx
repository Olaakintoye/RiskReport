import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';
import { useLiveMarketData } from '../../hooks/useLiveMarketData';
import { MarketIndicator } from '../../types/marketData';

interface LiveMarketIndicatorsProps {
  compact?: boolean;
  showHeader?: boolean;
}

const LiveMarketIndicators: React.FC<LiveMarketIndicatorsProps> = ({
  compact = false,
  showHeader = true
}) => {
  // Use the live market data hook
  const {
    marketIndicators,
    isLoading,
    error,
    lastUpdated,
    isLive,
    toggleLiveUpdates,
    refresh
  } = useLiveMarketData({
    refreshInterval: 60000, // 1 minute
    autoStart: true
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [countdown, setCountdown] = useState(60);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pagerRef = useRef<PagerView>(null);

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

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Live market data error:', error);
    }
  }, [error]);

  // Countdown timer for next update
  useEffect(() => {
    if (isLive && lastUpdated) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 60; // Reset to 60 seconds
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isLive, lastUpdated]);

  // Reset countdown when new data arrives
  useEffect(() => {
    if (lastUpdated) {
      setCountdown(60);
    }
  }, [lastUpdated]);

  const getChangeColor = (change: number) => {
    return change >= 0 ? '#34C759' : '#FF3B30';
  };

  const formatValue = (indicator: MarketIndicator) => {
    const value = indicator.value;
    
    // Handle different asset types with appropriate formatting
    if (indicator.symbol.includes('USD') || indicator.symbol.includes('=')) {
      // Currencies and forex pairs - 4 decimal places
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 4, 
        maximumFractionDigits: 4 
      });
    } else if (indicator.symbol.includes('BTC') || indicator.symbol.includes('ETH') || indicator.symbol.includes('BNB') || indicator.symbol.includes('ADA') || indicator.symbol.includes('SOL') || indicator.symbol.includes('DOT')) {
      // Cryptocurrencies - 2 decimal places with commas
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    } else if (indicator.symbol.includes('^GSPC') || indicator.symbol.includes('^DJI') || indicator.symbol.includes('^IXIC') || indicator.symbol.includes('^RUT')) {
      // Major indices - 2 decimal places with commas
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    } else if (indicator.symbol.includes('AAPL') || indicator.symbol.includes('MSFT') || indicator.symbol.includes('GOOGL') || indicator.symbol.includes('AMZN') || indicator.symbol.includes('TSLA') || indicator.symbol.includes('NVDA')) {
      // Tech stocks - 2 decimal places with commas
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    } else if (indicator.symbol.includes('^TNX')) {
      // Treasury yields - 3 decimal places
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 3, 
        maximumFractionDigits: 3 
      });
    } else if (indicator.symbol.includes('^VIX')) {
      // VIX volatility - 2 decimal places
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    } else if (indicator.symbol.includes('GC=') || indicator.symbol.includes('SI=') || indicator.symbol.includes('CL=') || indicator.symbol.includes('BZ=') || indicator.symbol.includes('NG=') || indicator.symbol.includes('ZC=')) {
      // Commodities - 2 decimal places with commas
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    } else {
      // Default - 2 decimal places with commas
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
  };

  // Split indicators into sets of 6, handling dynamic data
  const marketSets = marketIndicators.length > 0 ? [
    marketIndicators.slice(0, 6),   // Traditional Markets & Volatility
    marketIndicators.slice(6, 12),  // Credit Risk & Market Stress
    marketIndicators.slice(12, 18), // Currencies & FX Risk
    marketIndicators.slice(18, 24), // Commodities & Inflation Risk
    marketIndicators.slice(24, 30), // Crypto & Alternative Assets
    marketIndicators.slice(30, 36)  // Sovereign Risk & Global Indicators
  ].filter(set => set.length > 0) : [];

  const setTitles = [
    'US Indices',
    'Major ETFs',
    'Tech Stocks',
    'Commodities',
    'Currencies',
    'Cryptocurrencies'
  ];

  const renderIndicatorSet = (indicators: MarketIndicator[]) => (
    <View style={styles.marketGrid}>
      {indicators.map(indicator => (
        <View key={indicator.symbol} style={styles.marketCard}>
          <Text style={styles.marketSymbol}>{indicator.symbol}</Text>
          <Text style={styles.marketName}>{indicator.name}</Text>
          <Text style={styles.marketPrice}>{formatValue(indicator)}</Text>
          <Text style={[
            styles.marketChange,
            { color: getChangeColor(indicator.change) }
          ]}>
            {indicator.change >= 0 ? '+' : ''}{indicator.changePercent.toLocaleString('en-US', { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}%
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <>
      {/* Section Header - matches dashboard structure exactly */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live Market Data</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
            <MaterialCommunityIcons name="refresh" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.seeAllButton} onPress={toggleLiveUpdates}>
            <View style={styles.liveIndicator}>
              <Animated.View 
                style={[
                  styles.liveDot, 
                  { transform: [{ scale: pulseAnim }] },
                  { backgroundColor: isLive ? '#34C759' : '#8E8E93' }
                ]} 
              />
              <Text style={styles.seeAllText}>{isLive ? 'LIVE' : 'PAUSED'}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Market Data Card with Pager */}
      <View style={styles.card}>
        {isLoading && marketIndicators.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Loading market data...</Text>
          </View>
        ) : error && marketIndicators.length === 0 ? (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={48} color="#ef4444" />
            <Text style={styles.errorText}>Failed to load market data</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : marketIndicators.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No market data available</Text>
          </View>
        ) : (
          <PagerView
            ref={pagerRef}
            style={styles.pagerView}
            initialPage={0}
            onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
          >
            {marketSets.map((set, index) => (
              <View key={index.toString()}>
                {renderIndicatorSet(set)}
              </View>
            ))}
          </PagerView>
        )}
        
        {/* Page Indicators - only show when there's data */}
        {marketSets.length > 0 && (
          <View style={styles.pageIndicators}>
            <View style={styles.indicatorContainer}>
              {marketSets.map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.pageIndicator, currentPage === index && styles.activeIndicator]} 
                />
              ))}
            </View>
            <View style={styles.pageInfo}>
              <Text style={styles.pageText}>
                {setTitles[currentPage] || 'Market Data'}
              </Text>
              {lastUpdated && (
                <Text style={styles.lastUpdatedText}>
                  Last: {lastUpdated.toLocaleTimeString()} | Next update in {countdown}s
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000000',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  pagerView: {
    height: 400,
  },
  marketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    paddingBottom: 8,
  },
  marketCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    height: 120,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'space-between',
  },
  marketSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  marketName: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 3,
  },
  marketPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  marketChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  indicatorContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  pageIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  activeIndicator: {
    backgroundColor: '#007AFF',
  },
  pageInfo: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pageText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  lastUpdatedText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400',
  },
  loadingContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  errorContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default LiveMarketIndicators; 