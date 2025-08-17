import { useState, useEffect, useCallback, useRef } from 'react';
import realMarketDataService from '../services/realMarketDataService';
import { MarketIndicator } from '../types/marketData';

export interface LiveMarketDataState {
  marketIndicators: MarketIndicator[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isLive: boolean;
}

export interface UseLiveMarketDataOptions {
  refreshInterval?: number; // in milliseconds (default: 60000 = 1 minute)
  autoStart?: boolean;
  symbols?: string[];
}

const DEFAULT_SYMBOLS = [
  // Major US Indices
  { symbol: '^GSPC', name: 'S&P 500' },
  { symbol: '^DJI', name: 'Dow Jones' },
  { symbol: '^IXIC', name: 'NASDAQ' },
  { symbol: '^VIX', name: 'VIX Volatility' },
  { symbol: '^RUT', name: 'Russell 2000' },
  { symbol: '^TNX', name: '10Y Treasury' },

  // Major ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' },
  { symbol: 'GLD', name: 'SPDR Gold Shares' },
  { symbol: 'SLV', name: 'iShares Silver Trust' },

  // Major Stocks
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },

  // Commodities
  { symbol: 'GC=F', name: 'Gold Futures' },
  { symbol: 'SI=F', name: 'Silver Futures' },
  { symbol: 'CL=F', name: 'Crude Oil WTI' },
  { symbol: 'BZ=F', name: 'Brent Crude Oil' },
  { symbol: 'NG=F', name: 'Natural Gas' },
  { symbol: 'ZC=F', name: 'Corn Futures' },

  // Currencies
  { symbol: 'EURUSD=X', name: 'EUR/USD' },
  { symbol: 'GBPUSD=X', name: 'GBP/USD' },
  { symbol: 'USDJPY=X', name: 'USD/JPY' },
  { symbol: 'USDCHF=X', name: 'USD/CHF' },
  { symbol: 'AUDUSD=X', name: 'AUD/USD' },
  { symbol: 'USDCAD=X', name: 'USD/CAD' },

  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin' },
  { symbol: 'ETH-USD', name: 'Ethereum' },
  { symbol: 'BNB-USD', name: 'Binance Coin' },
  { symbol: 'ADA-USD', name: 'Cardano' },
  { symbol: 'SOL-USD', name: 'Solana' },
  { symbol: 'DOT-USD', name: 'Polkadot' }
];

export const useLiveMarketData = (options: UseLiveMarketDataOptions = {}) => {
  const {
    refreshInterval = 60000, // 1 minute default
    autoStart = true,
    symbols = DEFAULT_SYMBOLS
  } = options;

  // Ensure symbols is always an array of objects with symbol and name properties
  const normalizedSymbols = useRef(symbols.map(s => 
    typeof s === 'string' ? { symbol: s, name: s } : s
  )).current;

  const [state, setState] = useState<LiveMarketDataState>({
    marketIndicators: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
    isLive: false
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get market indicators from real service - stable reference
  const getMarketIndicators = useRef(async (): Promise<MarketIndicator[]> => {
    return await realMarketDataService.getMarketIndicators();
  }).current;

  // Fetch market data from real service
  const fetchMarketData = useCallback(async () => {
    try {
      console.log('📡 Fetching real market data...');
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Get market indicators from real service
      const indicators = await getMarketIndicators();
      
      // Filter to requested symbols if specified
      const filteredIndicators = symbols.length > 0 ? 
        indicators.filter(indicator => 
          normalizedSymbols.some(s => s.symbol === indicator.symbol)
        ) : indicators;
      
      // Map to include the display names
      const indicatorsWithNames = filteredIndicators.map(indicator => {
        const symbolInfo = normalizedSymbols.find(s => s.symbol === indicator.symbol);
        return {
          ...indicator,
          name: symbolInfo?.name || indicator.name
        };
      });

      console.log('✅ Market data fetched successfully:', indicatorsWithNames.length, 'indicators');
      setState(prev => ({
        ...prev,
        marketIndicators: indicatorsWithNames,
        isLoading: false,
        lastUpdated: new Date(),
        error: null
      }));

    } catch (error) {
      console.error('Error fetching market data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market data'
      }));
    }
  }, []);

  // Start live updates
  const startLiveUpdates = useCallback(() => {
    if (state.isLive) return;

    console.log('🔄 Starting live updates with interval:', refreshInterval, 'ms');

    // Fetch initial data
    fetchMarketData();

    // Set up interval for live updates
    intervalRef.current = setInterval(() => {
      console.log('⏰ Interval triggered - fetching new data');
      fetchMarketData();
    }, refreshInterval);

    setState(prev => ({ ...prev, isLive: true }));
  }, [state.isLive]);

  // Stop live updates
  const stopLiveUpdates = useCallback(() => {
    if (intervalRef.current) {
      console.log('⏹️ Stopping live updates');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState(prev => ({ ...prev, isLive: false }));
  }, []);

  // Toggle live updates
  const toggleLiveUpdates = useCallback(() => {
    if (state.isLive) {
      stopLiveUpdates();
    } else {
      startLiveUpdates();
    }
  }, [state.isLive]);

  // Manual refresh
  const refresh = useCallback(() => {
    fetchMarketData();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    if (autoStart) {
      startLiveUpdates();
    }

    return () => {
      stopLiveUpdates();
    };
  }, [autoStart]);

  // Update refresh interval when it changes
  useEffect(() => {
    if (state.isLive && intervalRef.current) {
      stopLiveUpdates();
      startLiveUpdates();
    }
  }, [refreshInterval, state.isLive]);

  return {
    ...state,
    startLiveUpdates,
    stopLiveUpdates,
    toggleLiveUpdates,
    refresh,
    fetchMarketData
  };
};
