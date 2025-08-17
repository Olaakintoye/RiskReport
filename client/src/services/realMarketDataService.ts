import { MarketIndicator } from '../types/marketData';

// Real market data service using multiple free APIs
// This replaces the mock service with actual live data

// Correct ticker symbols for major market instruments
const REAL_SYMBOLS = [
  // Major US Indices
  { symbol: '^GSPC', name: 'S&P 500', type: 'index' },
  { symbol: '^DJI', name: 'Dow Jones', type: 'index' },
  { symbol: '^IXIC', name: 'NASDAQ', type: 'index' },
  { symbol: '^VIX', name: 'VIX Volatility', type: 'index' },
  { symbol: '^RUT', name: 'Russell 2000', type: 'index' },
  { symbol: '^TNX', name: '10Y Treasury', type: 'bond' },

  // Major ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', type: 'etf' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF', type: 'etf' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', type: 'etf' },
  { symbol: 'GLD', name: 'SPDR Gold Shares', type: 'commodity' },
  { symbol: 'SLV', name: 'iShares Silver Trust', type: 'commodity' },

  // Major Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock' },

  // Commodities
  { symbol: 'GC=F', name: 'Gold Futures', type: 'commodity' },
  { symbol: 'SI=F', name: 'Silver Futures', type: 'commodity' },
  { symbol: 'CL=F', name: 'Crude Oil WTI', type: 'commodity' },
  { symbol: 'BZ=F', name: 'Brent Crude Oil', type: 'commodity' },
  { symbol: 'NG=F', name: 'Natural Gas', type: 'commodity' },
  { symbol: 'ZC=F', name: 'Corn Futures', type: 'commodity' },

  // Currencies
  { symbol: 'EURUSD=X', name: 'EUR/USD', type: 'forex' },
  { symbol: 'GBPUSD=X', name: 'GBP/USD', type: 'forex' },
  { symbol: 'USDJPY=X', name: 'USD/JPY', type: 'forex' },
  { symbol: 'USDCHF=X', name: 'USD/CHF', type: 'forex' },
  { symbol: 'AUDUSD=X', name: 'AUD/USD', type: 'forex' },
  { symbol: 'USDCAD=X', name: 'USD/CAD', type: 'forex' },

  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', type: 'crypto' },
  { symbol: 'BNB-USD', name: 'Binance Coin', type: 'crypto' },
  { symbol: 'ADA-USD', name: 'Cardano', type: 'crypto' },
  { symbol: 'SOL-USD', name: 'Solana', type: 'crypto' },
  { symbol: 'DOT-USD', name: 'Polkadot', type: 'crypto' }
];

class RealMarketDataService {
  private apiKey: string | null = null;
  private baseUrl: string = 'https://query1.finance.yahoo.com/v8/finance/chart';

  constructor() {
    // Try to get API key from environment
    this.apiKey = process.env.REACT_APP_YAHOO_FINANCE_API_KEY || null;
  }

  /**
   * Fetch real-time data from Yahoo Finance
   */
  private async fetchYahooFinanceData(symbols: string[]): Promise<any[]> {
    try {
      const results = [];
      
      // Process symbols in batches to avoid rate limiting
      for (let i = 0; i < symbols.length; i += 10) {
        const batch = symbols.slice(i, i + 10);
        
        for (const symbol of batch) {
          try {
            const url = `${this.baseUrl}/${symbol}?interval=1m&range=1d`;
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              results.push({ symbol, data });
            } else {
              console.warn(`Failed to fetch ${symbol}: ${response.status}`);
            }

            // Add delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`Error fetching ${symbol}:`, error);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching Yahoo Finance data:', error);
      return [];
    }
  }

  /**
   * Parse Yahoo Finance response into MarketIndicator format
   */
  private parseYahooFinanceData(symbol: string, data: any): MarketIndicator | null {
    try {
      const result = data.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      const timestamp = result.timestamp?.[result.timestamp.length - 1];

      if (!meta || !quote) return null;

      const currentPrice = meta.regularMarketPrice;
      const previousClose = meta.previousClose;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: symbol,
        name: this.getSymbolName(symbol),
        value: currentPrice,
        change: change,
        changePercent: changePercent,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        volume: meta.regularMarketVolume,
        timestamp: timestamp ? timestamp * 1000 : Date.now()
      };
    } catch (error) {
      console.error(`Error parsing data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get human-readable name for symbol
   */
  private getSymbolName(symbol: string): string {
    const symbolInfo = REAL_SYMBOLS.find(s => s.symbol === symbol);
    return symbolInfo?.name || symbol;
  }

  /**
   * Get all market indicators with real data
   */
  async getMarketIndicators(): Promise<MarketIndicator[]> {
    try {
      console.log('📡 Fetching real market data from Yahoo Finance...');
      
      const symbols = REAL_SYMBOLS.map(s => s.symbol);
      const rawData = await this.fetchYahooFinanceData(symbols);
      
      const indicators: MarketIndicator[] = [];
      
      for (const { symbol, data } of rawData) {
        const indicator = this.parseYahooFinanceData(symbol, data);
        if (indicator) {
          indicators.push(indicator);
        }
      }

      console.log(`✅ Successfully fetched ${indicators.length} real market indicators`);
      return indicators;
    } catch (error) {
      console.error('❌ Error fetching real market data:', error);
      throw error;
    }
  }

  /**
   * Get specific symbols data
   */
  async getQuotes(symbols: string[]): Promise<MarketIndicator[]> {
    try {
      const rawData = await this.fetchYahooFinanceData(symbols);
      const indicators: MarketIndicator[] = [];
      
      for (const { symbol, data } of rawData) {
        const indicator = this.parseYahooFinanceData(symbol, data);
        if (indicator) {
          indicators.push(indicator);
        }
      }

      return indicators;
    } catch (error) {
      console.error('Error fetching quotes:', error);
      throw error;
    }
  }

  /**
   * Get single symbol data
   */
  async getQuote(symbol: string): Promise<MarketIndicator | null> {
    try {
      const rawData = await this.fetchYahooFinanceData([symbol]);
      if (rawData.length > 0) {
        return this.parseYahooFinanceData(symbol, rawData[0].data);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get available symbols
   */
  getAvailableSymbols(): typeof REAL_SYMBOLS {
    return REAL_SYMBOLS;
  }
}

export default new RealMarketDataService();

