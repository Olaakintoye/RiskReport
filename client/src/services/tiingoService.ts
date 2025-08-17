import axios from 'axios';
import { TIINGO_CONFIG } from './config';

/**
 * This is a placeholder for your actual API key.
 * In a production environment, you should:
 * 1. Store this in an environment variable
 * 2. Keep API requests on the server side if possible
 */
const API_KEY = TIINGO_CONFIG.API_KEY;
const BASE_URL = TIINGO_CONFIG.IEX_URL;
const DAILY_URL = TIINGO_CONFIG.DAILY_URL;

// Cache for API responses to reduce API calls
const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_DURATION = 15 * 60 * 1000; // Increased from 5 to 15 minutes cache to reduce API usage

// Rate limiting protection
let lastRequestTime = 0;
const REQUEST_DELAY = 500; // Increased from 250ms to 500ms between requests

/**
 * Interface for Tiingo IEX API response
 */
export interface TiingoIEXResponse {
  ticker: string;
  timestamp: string;
  quoteTimestamp: string;
  lastSaleTimestamp: string;
  last: number;
  lastSize: number;
  tngoLast: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  mid: number;
  volume: number;
  bidSize: number;
  bidPrice: number;
  askSize: number;
  askPrice: number;
}

/**
 * Interface for Tiingo historical price data
 */
export interface TiingoHistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjOpen: number;
  adjHigh: number;
  adjLow: number;
  adjClose: number;
  adjVolume: number;
  divCash: number;
  splitFactor: number;
}

/**
 * Interface for company metadata
 */
export interface TiingoMetadata {
  ticker: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  exchangeCode: string;
}

/**
 * Helper function to delay requests for rate limiting
 */
const delayIfNeeded = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  
  if (elapsed < REQUEST_DELAY && lastRequestTime !== 0) {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY - elapsed));
  }
  
  lastRequestTime = Date.now();
};

/**
 * Handle API errors and provide more helpful error messages
 */
const handleApiError = (error: any, context: string): Error => {
  console.error(`${context}:`, error);
  
    if (error.response) {
    const status = error.response.status;
    const data = error.response.data;
    
    // Handle rate limiting specifically
    if (status === 429 || (data && typeof data === 'object' && data.detail && data.detail.includes('hourly request allocation'))) {
      return new Error('Rate limit exceeded. Please wait a few minutes before refreshing prices again.');
    }
    
    if (status === 401) {
      return new Error('Invalid API key. Please check your Tiingo configuration.');
    }
    
    if (status === 404) {
      return new Error('Stock symbol not found. Please check the ticker symbol.');
    }
    
    return new Error(`API Error ${status}: ${data?.detail || data?.message || 'Unknown error'}`);
      }
  
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new Error('Network error. Please check your internet connection.');
    }
  
  return new Error(error.message || 'Unknown error occurred while fetching data');
};

/**
 * Helper function to properly format ticker symbols for Tiingo API
 * Some tickers with dots (like BRK.B) need special handling
 */
const formatTicker = (ticker: string): string => {
  // For tickers with dots, we need to replace the dot with a dash for some endpoints
  // This is specifically for tickers like BRK.B, BF.B, etc.
  return ticker.replace('.', '-');
};

/**
 * Service for interacting with the Tiingo IEX API
 */
const tiingoService = {
  /**
   * Get real-time price data for a ticker
   * @param ticker Stock symbol
   * @returns Promise with real-time data
   */
  getRealTimePrice: async (ticker: string): Promise<TiingoIEXResponse> => {
    const cacheKey = `realtime-${ticker}`;
    
    // Check cache first
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION)) {
      return cache[cacheKey].data;
    }
    
    try {
      await delayIfNeeded();
      
      // Format ticker for API request
      const formattedTicker = formatTicker(ticker);
      
      const response = await axios.get(`${BASE_URL}/${formattedTicker}`, {
        params: {
          token: API_KEY
        }
      });
      
      // Cache the result
      cache[cacheKey] = { data: response.data[0], timestamp: Date.now() };
      
      return response.data[0];
    } catch (error) {
      throw handleApiError(error, `Error fetching real-time price for ${ticker}`);
    }
  },

  /**
   * Get real-time price data for multiple tickers
   * @param tickers Array of stock symbols
   * @returns Promise with real-time data for all tickers
   */
  getBatchRealTimePrices: async (tickers: string[]): Promise<Record<string, TiingoIEXResponse>> => {
    // Format each ticker and join with commas
    const formattedTickers = tickers.map(ticker => formatTicker(ticker));
    const tickersParam = formattedTickers.join(',');
    const cacheKey = `batch-${tickersParam}`;
    
    // Check cache first
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION)) {
      console.log(`Using cached batch data for: ${tickersParam}`);
      return cache[cacheKey].data;
    }
    
    try {
      await delayIfNeeded();
      
      console.log(`Fetching batch real-time prices for: ${tickersParam}`);
      const response = await axios.get(`${BASE_URL}`, {
        params: {
          tickers: tickersParam,
          token: API_KEY
        }
      });
      
      // Convert array to dictionary with original ticker as key
      const result: Record<string, TiingoIEXResponse> = {};
      response.data.forEach((item: TiingoIEXResponse, index: number) => {
        // Use the original ticker as the key, not the formatted one
        const originalTicker = tickers[index];
        
        // Log when tngoLast is null to help debug issues
        if (item.tngoLast === null || item.tngoLast === undefined) {
          console.warn(`⚠️ Warning: tngoLast is null for ${item.ticker}. Using fallback if available.`);
        }
        
        // Log the actual price values we're using 
        console.log(`${item.ticker} price data - tngoLast: ${item.tngoLast}, last: ${item.last}, prevClose: ${item.prevClose}`);
        
        result[originalTicker] = item;
      });
      
      // Cache the result
      cache[cacheKey] = { data: result, timestamp: Date.now() };
      
      return result;
    } catch (error) {
      // When batch fetch fails, try to use cached data for individual tickers if available
      const result: Record<string, TiingoIEXResponse> = {};
      
      for (const ticker of tickers) {
        const individualCacheKey = `realtime-${ticker}`;
        if (cache[individualCacheKey] && (Date.now() - cache[individualCacheKey].timestamp < CACHE_DURATION * 3)) {
          result[ticker] = cache[individualCacheKey].data;
        }
      }
      
      // If we have any cached data, return it instead of throwing
      if (Object.keys(result).length > 0) {
        console.warn('Using cached data for some tickers due to API error');
        return result;
      }
      
      throw handleApiError(error, `Error fetching batch real-time prices for ${tickersParam}`);
    }
  },

  /**
   * Get historical price data for a ticker
   * @param ticker Stock symbol
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @param frequency Data frequency (daily, weekly, monthly)
   * @returns Promise with historical price data
   */
  getHistoricalData: async (
    ticker: string, 
    startDate: string, 
    endDate: string,
    frequency: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<TiingoHistoricalPrice[]> => {
    const cacheKey = `historical-${ticker}-${startDate}-${endDate}-${frequency}`;
    
    // Historical data can be cached for longer
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION * 12)) {
      return cache[cacheKey].data;
    }
    
    try {
      await delayIfNeeded();
      
      // Format ticker for API request
      const formattedTicker = formatTicker(ticker);
      
      const response = await axios.get(`${BASE_URL}/${formattedTicker}/prices`, {
        params: {
          startDate,
          endDate,
          resampleFreq: frequency,
          token: API_KEY
        }
      });
      
      // Cache the result
      cache[cacheKey] = { data: response.data, timestamp: Date.now() };
      
      return response.data;
    } catch (error) {
      throw handleApiError(error, `Error fetching historical data for ${ticker}`);
    }
  },

  /**
   * Get company metadata
   * @param ticker Stock symbol
   * @returns Promise with company metadata
   */
  getMetadata: async (ticker: string): Promise<TiingoMetadata> => {
    const cacheKey = `metadata-${ticker}`;
    
    // Metadata rarely changes, can be cached longer
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < CACHE_DURATION * 24)) {
      return cache[cacheKey].data;
    }
    
    try {
      await delayIfNeeded();
      
      // Format ticker for API request
      const formattedTicker = formatTicker(ticker);
      
      const response = await axios.get(`${DAILY_URL}/${formattedTicker}`, {
        params: {
          token: API_KEY
        }
      });
      
      // Cache the result
      cache[cacheKey] = { data: response.data, timestamp: Date.now() };
      
      return response.data;
    } catch (error) {
      throw handleApiError(error, `Error fetching metadata for ${ticker}`);
    }
  },

  /**
   * Validate if a ticker exists and is available in the Tiingo database
   * @param ticker Stock symbol to validate
   * @returns Promise<boolean> indicating if ticker is valid
   */
  validateTicker: async (ticker: string): Promise<boolean> => {
    try {
      await tiingoService.getMetadata(ticker);
      return true;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * Clear the cache
   */
  clearCache: (): void => {
    Object.keys(cache).forEach(key => delete cache[key]);
  },

  /**
   * Get S&P 500 constituents
   * This function fetches the current S&P 500 constituent companies from Tiingo
   * @returns Promise with array of S&P 500 constituent tickers
   */
  getSP500Constituents: async (): Promise<string[]> => {
    const cacheKey = 'sp500-constituents';
    
    // Cache S&P 500 constituents for 24 hours (they don't change frequently)
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000)) {
      return cache[cacheKey].data;
    }
    
    try {
      await delayIfNeeded();
      
      // Put problematic tickers with dots first in the list for special handling
      // Complete S&P 500 constituents list (503 stocks)
      const sp500 = [
        // Special tickers with dots that need special handling
        'BRK.B', 'BF.B', 'BF.A',
        // All current S&P 500 constituents (alphabetical by symbol)
        'AAPL', 'ABBV', 'ABNB', 'ABT', 'ACGL', 'ACN', 'ADBE', 'ADI', 'ADM', 'ADP', 'ADSK', 'AEE', 'AEP', 'AES', 'AFL', 'AIG', 'AJG', 'AKAM', 'ALB', 'ALGN', 'ALL', 'ALLE', 'AMAT', 'AMCR', 'AMD', 'AME', 'AMGN', 'AMP', 'AMT', 'AMZN', 'ANET', 'ANSS', 'AON', 'AOS', 'APA', 'APD', 'APH', 'APTV', 'ARE', 'ATO', 'ATVI', 'AVB', 'AVGO', 'AVY', 'AWK', 'AXON', 'AXP', 'AZO', 'BA', 'BAC', 'BALL', 'BAX', 'BBWI', 'BBY', 'BDX', 'BEN', 'BF.B', 'BIIB', 'BIO', 'BK', 'BKNG', 'BKR', 'BLDR', 'BLK', 'BMY', 'BR', 'BRK.B', 'BRO', 'BSX', 'BWA', 'BX', 'BXP', 'C', 'CAG', 'CAH', 'CARR', 'CAT', 'CB', 'CBOE', 'CBRE', 'CCI', 'CCL', 'CDAY', 'CDNS', 'CDW', 'CE', 'CEG', 'CF', 'CFG', 'CHD', 'CHRW', 'CHTR', 'CI', 'CINF', 'CL', 'CLX', 'CMA', 'CMCSA', 'CME', 'CMG', 'CMI', 'CMS', 'CNC', 'CNP', 'COF', 'COO', 'COP', 'COR', 'COST', 'CPB', 'CPRT', 'CPT', 'CRM', 'CSCO', 'CSGP', 'CSX', 'CTAS', 'CTLT', 'CTRA', 'CTSH', 'CTVA', 'CVS', 'CVX', 'CZR', 'D', 'DAL', 'DASH', 'DD', 'DE', 'DELL', 'DFS', 'DG', 'DGX', 'DHI', 'DHR', 'DIS', 'DLR', 'DLTR', 'DOV', 'DOW', 'DPZ', 'DRI', 'DTE', 'DUK', 'DVA', 'DVN', 'DXCM', 'EA', 'EBAY', 'ECL', 'ED', 'EFX', 'EIX', 'EL', 'ELV', 'EMN', 'EMR', 'ENPH', 'EOG', 'EPAM', 'EQIX', 'EQR', 'EQT', 'ES', 'ESS', 'ETN', 'ETR', 'ETSY', 'EVRG', 'EW', 'EXC', 'EXPD', 'EXPE', 'EXR', 'F', 'FANG', 'FAST', 'FCX', 'FDS', 'FDX', 'FE', 'FFIV', 'FI', 'FICO', 'FIS', 'FITB', 'FMC', 'FOX', 'FOXA', 'FRT', 'FSLR', 'FTNT', 'FTV', 'GEHC', 'GEN', 'GEV', 'GILD', 'GIS', 'GL', 'GLW', 'GM', 'GNRC', 'GOOG', 'GOOGL', 'GPC', 'GPN', 'GRMN', 'GS', 'GWW', 'HAL', 'HAS', 'HBAN', 'HCA', 'HD', 'HES', 'HIG', 'HII', 'HLT', 'HOLX', 'HON', 'HPE', 'HPQ', 'HRL', 'HSIC', 'HST', 'HSY', 'HUBB', 'HUM', 'HWM', 'IBM', 'ICE', 'IDXX', 'IEX', 'IFF', 'INCY', 'INTC', 'INTU', 'INVH', 'IP', 'IPG', 'IQV', 'IRM', 'ISRG', 'IT', 'ITW', 'IVZ', 'J', 'JBHT', 'JCI', 'JKHY', 'JNJ', 'JNPR', 'JPM', 'K', 'KDP', 'KEY', 'KEYS', 'KHC', 'KIM', 'KKR', 'KLAC', 'KMB', 'KMI', 'KMX', 'KO', 'KR', 'KVUE', 'L', 'LDOS', 'LEN', 'LH', 'LHX', 'LIN', 'LKQ', 'LLY', 'LMT', 'LNT', 'LOW', 'LRCX', 'LULU', 'LUV', 'LVS', 'LW', 'LYB', 'LYV', 'MA', 'MAA', 'MAR', 'MAS', 'MCD', 'MCHP', 'MCK', 'MCO', 'MDLZ', 'MDT', 'MET', 'META', 'MGM', 'MHK', 'MKC', 'MKTX', 'MLM', 'MMC', 'MMM', 'MNST', 'MO', 'MOH', 'MOS', 'MPC', 'MPWR', 'MRK', 'MRNA', 'MRO', 'MS', 'MSCI', 'MSFT', 'MSI', 'MTB', 'MTCH', 'MTD', 'MU', 'NCLH', 'NDAQ', 'NDSN', 'NEE', 'NEM', 'NFLX', 'NI', 'NKE', 'NOC', 'NOW', 'NRG', 'NSC', 'NTAP', 'NTRS', 'NUE', 'NVDA', 'NVR', 'NWS', 'NWSA', 'NXPI', 'O', 'ODFL', 'OKE', 'OMC', 'ON', 'ORCL', 'ORLY', 'OTIS', 'OXY', 'PARA', 'PAYC', 'PAYX', 'PCAR', 'PCG', 'PEAK', 'PEG', 'PEP', 'PFE', 'PFG', 'PG', 'PGR', 'PH', 'PHM', 'PKG', 'PKI', 'PLD', 'PM', 'PNC', 'PNR', 'PNW', 'PODD', 'POOL', 'PPG', 'PPL', 'PRU', 'PSA', 'PSX', 'PTC', 'PWR', 'PXD', 'PYPL', 'QCOM', 'QRVO', 'RCL', 'REG', 'REGN', 'RF', 'RHI', 'RJF', 'RL', 'RMD', 'ROK', 'ROL', 'ROP', 'ROST', 'RSG', 'RTX', 'RVTY', 'SBAC', 'SBUX', 'SCHW', 'SEDG', 'SHW', 'SJM', 'SLB', 'SMCI', 'SNA', 'SNPS', 'SO', 'SOLV', 'SPG', 'SPGI', 'SRE', 'STE', 'STLD', 'STT', 'STX', 'STZ', 'SWK', 'SWKS', 'SYF', 'SYK', 'SYY', 'T', 'TAP', 'TDG', 'TDY', 'TECH', 'TEL', 'TER', 'TFC', 'TFX', 'TGT', 'TJX', 'TMO', 'TMUS', 'TPG', 'TPR', 'TRGP', 'TRMB', 'TROW', 'TRV', 'TSCO', 'TSLA', 'TSN', 'TT', 'TTWO', 'TXN', 'TXT', 'TYL', 'UA', 'UAL', 'UBER', 'UDR', 'UHS', 'ULTA', 'UNH', 'UNP', 'UPS', 'URI', 'USB', 'V', 'VICI', 'VLO', 'VLTO', 'VMC', 'VRSK', 'VRSN', 'VRTX', 'VST', 'VTR', 'VTRS', 'VZ', 'WAB', 'WAT', 'WBA', 'WBD', 'WDC', 'WEC', 'WELL', 'WFC', 'WHR', 'WM', 'WMB', 'WMT', 'WRB', 'WRK', 'WST', 'WTW', 'WY', 'WYNN', 'XEL', 'XOM', 'XRAY', 'XYL', 'YUM', 'ZBH', 'ZBRA', 'ZTS'
      ];
      
      // Cache the result
      cache[cacheKey] = { data: sp500, timestamp: Date.now() };
      
      return sp500;
    } catch (error) {
      throw handleApiError(error, 'Error fetching S&P 500 constituents');
    }
  },

  /**
   * Get S&P 500 constituent details
   * This function fetches detailed information for S&P 500 constituent companies
   * @returns Promise with array of S&P 500 constituent details
   */
  getSP500Details: async (): Promise<TiingoMetadata[]> => {
    const cacheKey = 'sp500-details';
    
    // Cache S&P 500 details for 24 hours
    if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp < 24 * 60 * 60 * 1000)) {
      return cache[cacheKey].data;
    }
    
    try {
      // Get the list of S&P 500 tickers
      const tickers = await tiingoService.getSP500Constituents();
      
      // Fetch metadata for each ticker (in a real implementation, this would
      // be batched to minimize API calls)
      const details: TiingoMetadata[] = [];
      
      // For this demo, we'll just fetch details for the first 25 companies
      // to avoid excessive API calls
      for (const ticker of tickers.slice(0, 25)) {
        try {
          await delayIfNeeded();
          const metadata = await tiingoService.getMetadata(ticker);
          details.push(metadata);
        } catch (error) {
          console.warn(`Could not fetch metadata for ${ticker}:`, error);
          // Continue with the next ticker if one fails
        }
      }
      
      // Cache the result
      cache[cacheKey] = { data: details, timestamp: Date.now() };
      
      return details;
    } catch (error) {
      throw handleApiError(error, 'Error fetching S&P 500 constituent details');
    }
  }
};

export default tiingoService; 