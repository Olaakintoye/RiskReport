import { MarketIndicator } from '../types/marketData';

// Mock market data service that simulates real-time updates
// This can be easily replaced with real API calls when the endpoints are working

const MOCK_SYMBOLS = [
  // Traditional Markets & Volatility
  { symbol: 'SPX', name: 'S&P 500', basePrice: 4281.07, volatility: 0.02 },
  { symbol: 'VIX', name: 'Volatility Index', basePrice: 18.25, volatility: 0.15 },
  { symbol: 'DXY', name: 'Dollar Index', basePrice: 101.88, volatility: 0.005 },
  { symbol: 'TNX', name: '10Y Treasury', basePrice: 4.36, volatility: 0.08 },
  { symbol: 'GSPC', name: 'S&P 500 Futures', basePrice: 4202.59, volatility: 0.025 },
  { symbol: 'GOLD', name: 'Gold Spot', basePrice: 2022.13, volatility: 0.015 },
  
  // Credit Risk & Market Stress Indicators  
  { symbol: 'CDX.IG', name: 'IG Credit Spreads', basePrice: 85.25, volatility: 0.12 },
  { symbol: 'CDX.HY', name: 'HY Credit Spreads', basePrice: 425.50, volatility: 0.18 },
  { symbol: 'MOVE', name: 'Bond Volatility', basePrice: 112.45, volatility: 0.20 },
  { symbol: 'TED', name: 'TED Spread', basePrice: 0.32, volatility: 0.25 },
  { symbol: 'LIBOR', name: '3M USD LIBOR', basePrice: 5.45, volatility: 0.08 },
  { symbol: 'OIS', name: 'OIS Spread', basePrice: 0.15, volatility: 0.30 },

  // Currencies & FX Risk
  { symbol: 'EURUSD', name: 'EUR/USD', basePrice: 1.0845, volatility: 0.008 },
  { symbol: 'GBPUSD', name: 'GBP/USD', basePrice: 1.2634, volatility: 0.012 },
  { symbol: 'USDJPY', name: 'USD/JPY', basePrice: 149.85, volatility: 0.015 },
  { symbol: 'USDCHF', name: 'USD/CHF', basePrice: 0.8945, volatility: 0.010 },
  { symbol: 'AUDUSD', name: 'AUD/USD', basePrice: 0.6578, volatility: 0.018 },
  { symbol: 'USDCAD', name: 'USD/CAD', basePrice: 1.3625, volatility: 0.014 },

  // Commodities & Inflation Risk
  { symbol: 'WTI', name: 'WTI Crude Oil', basePrice: 73.45, volatility: 0.025 },
  { symbol: 'BRENT', name: 'Brent Crude', basePrice: 78.92, volatility: 0.028 },
  { symbol: 'NATGAS', name: 'Natural Gas', basePrice: 3.25, volatility: 0.035 },
  { symbol: 'SILVER', name: 'Silver Spot', basePrice: 24.87, volatility: 0.022 },
  { symbol: 'COPPER', name: 'Copper Futures', basePrice: 3.78, volatility: 0.020 },
  { symbol: 'WHEAT', name: 'Wheat Futures', basePrice: 625.50, volatility: 0.018 },

  // Crypto & Alternative Assets
  { symbol: 'BTC', name: 'Bitcoin', basePrice: 43256.78, volatility: 0.040 },
  { symbol: 'ETH', name: 'Ethereum', basePrice: 2456.89, volatility: 0.045 },
  { symbol: 'REIT', name: 'US REITs Index', basePrice: 2145.67, volatility: 0.025 },
  { symbol: 'TIPS', name: 'TIPS 10Y', basePrice: 1.85, volatility: 0.15 },
  { symbol: 'HYG', name: 'HY Bond ETF', basePrice: 78.45, volatility: 0.018 },
  { symbol: 'EMB', name: 'EM Bond ETF', basePrice: 85.67, volatility: 0.022 },

  // Sovereign Risk & Global Indicators
  { symbol: 'ITALY.10Y', name: 'Italy 10Y Yield', basePrice: 3.85, volatility: 0.12 },
  { symbol: 'SPAIN.10Y', name: 'Spain 10Y Yield', basePrice: 3.25, volatility: 0.10 },
  { symbol: 'BUND.10Y', name: 'German 10Y Yield', basePrice: 2.15, volatility: 0.08 },
  { symbol: 'JGB.10Y', name: 'Japan 10Y Yield', basePrice: 0.75, volatility: 0.15 },
  { symbol: 'GILT.10Y', name: 'UK 10Y Yield', basePrice: 4.12, volatility: 0.09 },
  { symbol: 'CHINA.10Y', name: 'China 10Y Yield', basePrice: 2.65, volatility: 0.11 }
];

class MockMarketDataService {
  private currentPrices: Map<string, number> = new Map();
  private previousPrices: Map<string, number> = new Map();

  constructor() {
    // Initialize with base prices
    MOCK_SYMBOLS.forEach(symbol => {
      this.currentPrices.set(symbol.symbol, symbol.basePrice);
      this.previousPrices.set(symbol.symbol, symbol.basePrice);
    });
  }

  /**
   * Generate realistic price movements based on volatility
   */
  private generatePriceMovement(basePrice: number, volatility: number): number {
    // Use a more realistic random walk with mean reversion
    const randomChange = (Math.random() - 0.5) * 2; // -1 to 1
    const volatilityFactor = volatility * basePrice;
    const movement = randomChange * volatilityFactor * 0.1; // Scale down for realistic movements
    
    return movement;
  }

  /**
   * Update all prices with realistic movements
   */
  private updatePrices(): void {
    MOCK_SYMBOLS.forEach(symbol => {
      const currentPrice = this.currentPrices.get(symbol.symbol) || symbol.basePrice;
      const movement = this.generatePriceMovement(currentPrice, symbol.volatility);
      
      // Store previous price
      this.previousPrices.set(symbol.symbol, currentPrice);
      
      // Update current price with movement
      const newPrice = Math.max(0.01, currentPrice + movement);
      this.currentPrices.set(symbol.symbol, newPrice);
    });
  }

  /**
   * Get current market indicators
   */
  async getMarketIndicators(): Promise<MarketIndicator[]> {
    // Update prices to simulate real-time movement
    this.updatePrices();
    
    return MOCK_SYMBOLS.map(symbol => {
      const currentPrice = this.currentPrices.get(symbol.symbol) || symbol.basePrice;
      const previousPrice = this.previousPrices.get(symbol.symbol) || symbol.basePrice;
      const change = currentPrice - previousPrice;
      const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
      
      return {
        symbol: symbol.symbol,
        name: symbol.name,
        value: parseFloat(currentPrice.toFixed(this.getDecimalPlaces(symbol.symbol))),
        change: parseFloat(change.toFixed(this.getDecimalPlaces(symbol.symbol))),
        changePercent: parseFloat(changePercent.toFixed(2)),
        timestamp: Date.now()
      };
    });
  }

  /**
   * Get specific symbols
   */
  async getQuotes(symbols: string[]): Promise<MarketIndicator[]> {
    const allIndicators = await this.getMarketIndicators();
    return allIndicators.filter(indicator => symbols.includes(indicator.symbol));
  }

  /**
   * Get single quote
   */
  async getQuote(symbol: string): Promise<MarketIndicator | null> {
    const quotes = await this.getQuotes([symbol]);
    return quotes[0] || null;
  }

  /**
   * Determine decimal places based on asset type
   */
  private getDecimalPlaces(symbol: string): number {
    if (symbol.includes('USD') || symbol.includes('.')) {
      return 4; // Currencies
    } else if (symbol === 'BTC' || symbol === 'ETH') {
      return 0; // Crypto
    } else if (symbol.includes('10Y') || symbol === 'TED' || symbol === 'OIS') {
      return 3; // Yields and spreads
    } else if (symbol === 'WHEAT') {
      return 0; // Commodities
    } else {
      return 2; // Default
    }
  }

  /**
   * Simulate network delay
   */
  private async simulateDelay(): Promise<void> {
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get market data with simulated network delay
   */
  async getMarketDataWithDelay(): Promise<MarketIndicator[]> {
    await this.simulateDelay();
    return this.getMarketIndicators();
  }
}

export default new MockMarketDataService();
