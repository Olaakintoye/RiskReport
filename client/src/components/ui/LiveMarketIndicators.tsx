import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';

interface MarketIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface LiveMarketIndicatorsProps {
  compact?: boolean;
  showHeader?: boolean;
}

const LiveMarketIndicators: React.FC<LiveMarketIndicatorsProps> = ({
  compact = false,
  showHeader = true
}) => {
  const [marketIndicators, setMarketIndicators] = useState<MarketIndicator[]>([
    // First set - Traditional Markets & Volatility
    { symbol: 'SPX', name: 'S&P 500', value: 4281.07, change: -19.32, changePercent: -0.45 },
    { symbol: 'VIX', name: 'Volatility Index', value: 18.25, change: -0.04, changePercent: -0.22 },
    { symbol: 'DXY', name: 'Dollar Index', value: 101.88, change: -0.07, changePercent: -0.07 },
    { symbol: 'TNX', name: '10Y Treasury', value: 4.36, change: 0.00, changePercent: 0.02 },
    { symbol: 'GSPC', name: 'S&P 500 Futures', value: 4202.59, change: 15.56, changePercent: 0.37 },
    { symbol: 'GOLD', name: 'Gold Spot', value: 2022.13, change: 2.55, changePercent: 0.13 },
    
    // Second set - Credit Risk & Market Stress Indicators  
    { symbol: 'CDX.IG', name: 'IG Credit Spreads', value: 85.25, change: 1.75, changePercent: 2.09 },
    { symbol: 'CDX.HY', name: 'HY Credit Spreads', value: 425.50, change: -8.25, changePercent: -1.90 },
    { symbol: 'MOVE', name: 'Bond Volatility', value: 112.45, change: 2.15, changePercent: 1.95 },
    { symbol: 'TED', name: 'TED Spread', value: 0.32, change: 0.02, changePercent: 6.67 },
    { symbol: 'LIBOR', name: '3M USD LIBOR', value: 5.45, change: 0.05, changePercent: 0.93 },
    { symbol: 'OIS', name: 'OIS Spread', value: 0.15, change: -0.01, changePercent: -6.25 },

    // Third set - Currencies & FX Risk
    { symbol: 'EURUSD', name: 'EUR/USD', value: 1.0845, change: 0.0012, changePercent: 0.11 },
    { symbol: 'GBPUSD', name: 'GBP/USD', value: 1.2634, change: -0.0023, changePercent: -0.18 },
    { symbol: 'USDJPY', name: 'USD/JPY', value: 149.85, change: 0.75, changePercent: 0.50 },
    { symbol: 'USDCHF', name: 'USD/CHF', value: 0.8945, change: -0.0015, changePercent: -0.17 },
    { symbol: 'AUDUSD', name: 'AUD/USD', value: 0.6578, change: 0.0025, changePercent: 0.38 },
    { symbol: 'USDCAD', name: 'USD/CAD', value: 1.3625, change: -0.0035, changePercent: -0.26 },

    // Fourth set - Commodities & Inflation Risk
    { symbol: 'WTI', name: 'WTI Crude Oil', value: 73.45, change: -0.85, changePercent: -1.14 },
    { symbol: 'BRENT', name: 'Brent Crude', value: 78.92, change: -0.67, changePercent: -0.84 },
    { symbol: 'NATGAS', name: 'Natural Gas', value: 3.25, change: 0.15, changePercent: 4.85 },
    { symbol: 'SILVER', name: 'Silver Spot', value: 24.87, change: 0.34, changePercent: 1.39 },
    { symbol: 'COPPER', name: 'Copper Futures', value: 3.78, change: -0.05, changePercent: -1.31 },
    { symbol: 'WHEAT', name: 'Wheat Futures', value: 625.50, change: 12.25, changePercent: 2.00 },

    // Fifth set - Crypto & Alternative Assets
    { symbol: 'BTC', name: 'Bitcoin', value: 43256.78, change: 1245.32, changePercent: 2.97 },
    { symbol: 'ETH', name: 'Ethereum', value: 2456.89, change: -85.45, changePercent: -3.36 },
    { symbol: 'REIT', name: 'US REITs Index', value: 2145.67, change: 15.23, changePercent: 0.71 },
    { symbol: 'TIPS', name: 'TIPS 10Y', value: 1.85, change: 0.03, changePercent: 1.65 },
    { symbol: 'HYG', name: 'HY Bond ETF', value: 78.45, change: -0.25, changePercent: -0.32 },
    { symbol: 'EMB', name: 'EM Bond ETF', value: 85.67, change: 0.45, changePercent: 0.53 },

    // Sixth set - Sovereign Risk & Global Indicators
    { symbol: 'ITALY.10Y', name: 'Italy 10Y Yield', value: 3.85, change: 0.08, changePercent: 2.12 },
    { symbol: 'SPAIN.10Y', name: 'Spain 10Y Yield', value: 3.25, change: 0.05, changePercent: 1.56 },
    { symbol: 'BUND.10Y', name: 'German 10Y Yield', value: 2.15, change: 0.02, changePercent: 0.94 },
    { symbol: 'JGB.10Y', name: 'Japan 10Y Yield', value: 0.75, change: 0.01, changePercent: 1.35 },
    { symbol: 'GILT.10Y', name: 'UK 10Y Yield', value: 4.12, change: -0.03, changePercent: -0.72 },
    { symbol: 'CHINA.10Y', name: 'China 10Y Yield', value: 2.65, change: -0.02, changePercent: -0.75 }
  ]);

  const [isLive, setIsLive] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
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

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setMarketIndicators(prev => prev.map(indicator => {
        let randomChange;
        
        // Different volatility for different asset types
        if (indicator.symbol === 'BTC' || indicator.symbol === 'ETH') {
          randomChange = (Math.random() - 0.5) * indicator.value * 0.025; // Higher volatility for crypto
        } else if (indicator.symbol.includes('USD') || indicator.symbol.includes('.')) {
          randomChange = (Math.random() - 0.5) * indicator.value * 0.001; // Lower volatility for currencies/FX
        } else if (indicator.symbol === 'WTI' || indicator.symbol === 'BRENT' || indicator.symbol === 'NATGAS') {
          randomChange = (Math.random() - 0.5) * indicator.value * 0.015; // Higher volatility for energy
        } else if (indicator.symbol.includes('CDX') || indicator.symbol === 'TED' || indicator.symbol === 'OIS') {
          randomChange = (Math.random() - 0.5) * indicator.value * 0.02; // Higher volatility for credit spreads
        } else if (indicator.symbol.includes('10Y') || indicator.symbol === 'TNX') {
          randomChange = (Math.random() - 0.5) * indicator.value * 0.008; // Medium volatility for bonds
        } else if (indicator.symbol === 'VIX' || indicator.symbol === 'MOVE') {
          randomChange = (Math.random() - 0.5) * indicator.value * 0.03; // Higher volatility for volatility indices
        } else if (indicator.symbol === 'WHEAT' || indicator.symbol === 'COPPER') {
          randomChange = (Math.random() - 0.5) * indicator.value * 0.012; // Medium volatility for commodities
        } else {
          randomChange = (Math.random() - 0.5) * indicator.value * 0.006; // Default volatility
        }
        
        const newValue = indicator.value + randomChange;
        const changePercent = (randomChange / indicator.value) * 100;
        
        // Dynamic decimal places based on asset type
        let decimals = 2;
        if (indicator.symbol.includes('USD') || indicator.symbol.includes('.')) {
          decimals = 4;
        } else if (indicator.symbol === 'BTC') {
          decimals = 0;
        } else if (indicator.symbol.includes('10Y') || indicator.symbol === 'TED' || indicator.symbol === 'OIS') {
          decimals = 3;
        }
        
        return {
          ...indicator,
          value: parseFloat(newValue.toFixed(decimals)),
          change: parseFloat(randomChange.toFixed(decimals)),
          changePercent: parseFloat(changePercent.toFixed(2))
        };
      }));
    }, 6000); // Update every 6 seconds for more dynamic feel

    return () => clearInterval(interval);
  }, [isLive]);

  const getChangeColor = (change: number) => {
    return change >= 0 ? '#34C759' : '#FF3B30';
  };

  const formatValue = (indicator: MarketIndicator) => {
    if (indicator.symbol.includes('USD') || indicator.symbol.includes('.')) {
      return indicator.value.toFixed(4);
    } else if (indicator.symbol === 'BTC') {
      return indicator.value.toLocaleString();
    } else if (indicator.symbol.includes('10Y') || indicator.symbol === 'TED' || indicator.symbol === 'OIS' || indicator.symbol === 'TIPS') {
      return indicator.value.toFixed(3);
    } else if (indicator.symbol === 'WHEAT') {
      return indicator.value.toFixed(0);
    } else {
      return indicator.value.toFixed(2);
    }
  };

  // Split indicators into six sets of 6
  const marketSets = [
    marketIndicators.slice(0, 6),   // Traditional Markets & Volatility
    marketIndicators.slice(6, 12),  // Credit Risk & Market Stress
    marketIndicators.slice(12, 18), // Currencies & FX Risk
    marketIndicators.slice(18, 24), // Commodities & Inflation Risk
    marketIndicators.slice(24, 30), // Crypto & Alternative Assets
    marketIndicators.slice(30, 36)  // Sovereign Risk & Global Indicators
  ];

  const setTitles = [
    'Traditional Markets',
    'Credit & Market Risk',
    'Currencies & FX',
    'Commodities & Inflation',
    'Crypto & Alternatives',
    'Sovereign & Global'
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
            {indicator.change >= 0 ? '+' : ''}{indicator.changePercent.toFixed(2)}%
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
        <View style={styles.seeAllButton}>
          <View style={styles.liveIndicator}>
            <Animated.View 
              style={[
                styles.liveDot, 
                { transform: [{ scale: pulseAnim }] },
                { backgroundColor: isLive ? '#34C759' : '#8E8E93' }
              ]} 
            />
            <Text style={styles.seeAllText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* Market Data Card with Pager */}
      <View style={styles.card}>
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
        
        {/* Page Indicators */}
        <View style={styles.pageIndicators}>
          <View style={styles.indicatorContainer}>
            {marketSets.map((_, index) => (
              <View 
                key={index} 
                style={[styles.pageIndicator, currentPage === index && styles.activeIndicator]} 
              />
            ))}
          </View>
          <Text style={styles.pageText}>
            {setTitles[currentPage] || 'Market Data'}
          </Text>
        </View>
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
  pageText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
});

export default LiveMarketIndicators; 