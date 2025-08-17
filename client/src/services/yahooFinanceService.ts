import axios from 'axios';

export interface YahooFinanceQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketPreviousClose: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketHigh: number;
  regularMarketLow: number;
  regularMarketVolume: number;
  regularMarketTime: number;
  shortName?: string;
  longName?: string;
  marketCap?: number;
  currency?: string;
  exchange?: string;
}

export interface YahooFinanceResponse {
  quoteResponse: {
    result: YahooFinanceQuote[];
    error: any;
  };
}

class YahooFinanceService {
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  /**
   * Get real-time quotes for multiple symbols
   */
  async getQuotes(symbols: string[]): Promise<YahooFinanceQuote[]> {
    try {
      // Yahoo Finance API has limitations on batch size, so we'll process in chunks
      const chunkSize = 50;
      const chunks = this.chunkArray(symbols, chunkSize);
      const allQuotes: YahooFinanceQuote[] = [];

      for (const chunk of chunks) {
        const symbolsParam = chunk.join(',');
        const url = `${this.baseUrl}/${symbolsParam}`;
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
          params: {
            interval: '1m',
            range: '1d',
            includePrePost: false,
            includeAdjustedClose: false,
            includeExtHoursData: false,
          },
          timeout: 10000,
        });

        if (response.data && response.data.chart && response.data.chart.result) {
          const result = response.data.chart.result[0];
          if (result.quotes && result.quotes.regularMarketPrice) {
            const quotes = result.quotes.regularMarketPrice.map((price: number, index: number) => {
              const meta = result.meta;
              const symbol = meta.symbols[index];
              const previousClose = meta.previousClose || price;
              const change = price - previousClose;
              const changePercent = previousClose ? (change / previousClose) * 100 : 0;

              return {
                symbol: symbol,
                regularMarketPrice: price,
                regularMarketPreviousClose: previousClose,
                regularMarketChange: change,
                regularMarketChangePercent: changePercent,
                regularMarketHigh: meta.regularMarketPrice || price,
                regularMarketLow: meta.regularMarketPrice || price,
                regularMarketVolume: 0, // Not available in this endpoint
                regularMarketTime: Date.now(),
                shortName: meta.shortName,
                longName: meta.longName,
                currency: meta.currency,
                exchange: meta.exchangeName,
              };
            });
            allQuotes.push(...quotes);
          }
        }

        // Add a small delay between chunks to avoid rate limiting
        if (chunks.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allQuotes;
    } catch (error) {
      console.error('Error fetching Yahoo Finance quotes:', error);
      throw error;
    }
  }

  /**
   * Get real-time quote for a single symbol
   */
  async getQuote(symbol: string): Promise<YahooFinanceQuote | null> {
    try {
      const quotes = await this.getQuotes([symbol]);
      return quotes[0] || null;
    } catch (error) {
      console.error(`Error fetching quote for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(
    symbol: string,
    range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | '10y' | 'ytd' | 'max' = '1mo',
    interval: '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo' = '1d'
  ) {
    try {
      const url = `${this.baseUrl}/${symbol}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
        params: {
          interval,
          range,
          includePrePost: false,
          includeAdjustedClose: true,
          includeExtHoursData: false,
        },
        timeout: 10000,
      });

      if (response.data && response.data.chart && response.data.chart.result) {
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        const adjClose = result.indicators.adjclose[0];

        return timestamps.map((timestamp: number, index: number) => ({
          timestamp: timestamp * 1000, // Convert to milliseconds
          open: quotes.open[index],
          high: quotes.high[index],
          low: quotes.low[index],
          close: quotes.close[index],
          volume: quotes.volume[index],
          adjustedClose: adjClose.adjclose[index],
        }));
      }

      return [];
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Search for symbols
   */
  async searchSymbols(query: string): Promise<Array<{ symbol: string; name: string; exchange: string }>> {
    try {
      const searchUrl = 'https://query1.finance.yahoo.com/v1/finance/search';
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
        },
        params: {
          query,
          quotesCount: 20,
          newsCount: 0,
          enableFuzzyQuery: false,
        },
        timeout: 10000,
      });

      if (response.data && response.data.quotes) {
        return response.data.quotes.map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          exchange: quote.exchange || 'Unknown',
        }));
      }

      return [];
    } catch (error) {
      console.error('Error searching symbols:', error);
      return [];
    }
  }

  /**
   * Get market indices data
   */
  async getMarketIndices(): Promise<YahooFinanceQuote[]> {
    const indices = [
      '^GSPC', // S&P 500
      '^DJI',  // Dow Jones
      '^IXIC', // NASDAQ
      '^VIX',  // VIX
      '^TNX',  // 10Y Treasury
      '^DXY',  // Dollar Index
      '^GOLD', // Gold
      '^WTI',  // WTI Crude
      'BTC-USD', // Bitcoin
      'ETH-USD', // Ethereum
    ];

    return this.getQuotes(indices);
  }

  /**
   * Get currency pairs data
   */
  async getCurrencyPairs(): Promise<YahooFinanceQuote[]> {
    const currencies = [
      'EURUSD=X',
      'GBPUSD=X',
      'USDJPY=X',
      'USDCHF=X',
      'AUDUSD=X',
      'USDCAD=X',
    ];

    return this.getQuotes(currencies);
  }

  /**
   * Get commodity data
   */
  async getCommodities(): Promise<YahooFinanceQuote[]> {
    const commodities = [
      'GC=F',   // Gold Futures
      'SI=F',   // Silver Futures
      'CL=F',   // Crude Oil Futures
      'NG=F',   // Natural Gas Futures
      'ZC=F',   // Corn Futures
      'ZW=F',   // Wheat Futures
    ];

    return this.getQuotes(commodities);
  }

  /**
   * Helper function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export default new YahooFinanceService();

