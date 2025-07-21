import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MarketIndicator {
  symbol: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
}

interface CompactMarketTickerProps {
  showToggle?: boolean;
  autoScroll?: boolean;
  backgroundColor?: string;
}

const CompactMarketTicker: React.FC<CompactMarketTickerProps> = ({
  showToggle = false,
  autoScroll = true,
  backgroundColor = '#f8fafc'
}) => {
  const [marketIndicators, setMarketIndicators] = useState<MarketIndicator[]>([
    { symbol: 'SPX', name: 'S&P 500', value: 4185.47, change: -12.34, changePercent: -0.29 },
    { symbol: 'VIX', name: 'VIX', value: 18.45, change: 1.23, changePercent: 7.15 },
    { symbol: 'DXY', name: 'DXY', value: 103.25, change: 0.15, changePercent: 0.15 },
    { symbol: 'TNX', name: '10Y', value: 4.35, change: 0.02, changePercent: 0.46 },
    { symbol: 'GOLD', name: 'GOLD', value: 1985.40, change: 5.20, changePercent: 0.26 },
    { symbol: 'CRUDE', name: 'OIL', value: 82.45, change: -1.15, changePercent: -1.37 }
  ]);

  const [isLive, setIsLive] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  // Auto-scroll functionality
  useEffect(() => {
    if (!autoScroll || !isLive) return;

    const interval = setInterval(() => {
      scrollViewRef.current?.scrollTo({
        x: Math.random() * 200,
        animated: true
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [autoScroll, isLive]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setMarketIndicators(prev => prev.map(indicator => {
        const randomChange = (Math.random() - 0.5) * indicator.value * 0.005; // Smaller changes for ticker
        const newValue = indicator.value + randomChange;
        const changePercent = (randomChange / indicator.value) * 100;
        
        return {
          ...indicator,
          value: parseFloat(newValue.toFixed(2)),
          change: parseFloat(randomChange.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(2))
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isLive]);

  const getChangeColor = (change: number) => {
    return change >= 0 ? '#ef4444' : '#10b981';
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View style={styles.liveIndicator}>
          <Animated.View 
            style={[
              styles.liveDot, 
              { transform: [{ scale: pulseAnim }] },
              { backgroundColor: isLive ? '#10b981' : '#6b7280' }
            ]} 
          />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        
        {showToggle && (
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={() => setIsLive(!isLive)}
          >
            <MaterialCommunityIcons 
              name={isLive ? "pause" : "play"} 
              size={14} 
              color="#6b7280" 
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {marketIndicators.map((indicator, index) => (
          <View key={indicator.symbol} style={styles.indicatorItem}>
            <Text style={styles.symbol}>{indicator.symbol}</Text>
            <Text style={styles.value}>
              {indicator.value >= 1000 ? indicator.value.toLocaleString() : indicator.value.toFixed(2)}
            </Text>
            <View style={styles.changeContainer}>
              <MaterialCommunityIcons
                name={indicator.change >= 0 ? "trending-up" : "trending-down"}
                size={8}
                color={getChangeColor(indicator.change)}
                style={styles.changeIcon}
              />
              <Text style={[styles.change, { color: getChangeColor(indicator.change) }]}>
                {Math.abs(indicator.changePercent).toFixed(2)}%
              </Text>
            </View>
            {index < marketIndicators.length - 1 && <View style={styles.separator} />}
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.timestamp}>
        <Text style={styles.timestampText}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  toggleButton: {
    marginLeft: 8,
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  indicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  symbol: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    width: 32,
  },
  value: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 4,
    minWidth: 40,
    textAlign: 'right',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  changeIcon: {
    marginRight: 2,
  },
  change: {
    fontSize: 10,
    fontWeight: '500',
  },
  separator: {
    width: 1,
    height: 16,
    backgroundColor: '#e5e7eb',
    marginLeft: 12,
  },
  timestamp: {
    marginLeft: 8,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  timestampText: {
    fontSize: 9,
    color: '#9ca3af',
    fontWeight: '500',
  },
});

export default CompactMarketTicker; 