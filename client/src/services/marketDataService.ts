import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tiingoService, { TiingoIEXResponse, TiingoMetadata } from './tiingoService';

export interface SecuritySearchResult {
  symbol: string;
  name: string;
  assetType: 'equity' | 'bond' | 'etf';
  exchange: string;
}

export interface SecurityPrice {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  timestamp: string;
}

export interface SecurityDetails {
  symbol: string;
  name: string;
  description?: string;
  sector?: string;
  industry?: string;
  assetClass: 'equity' | 'bond' | 'commodity' | 'cash' | 'alternative' | 'real_estate';
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  high52Week?: number;
  low52Week?: number;
  volume: number;
  avgVolume?: number;
}

/**
 * Search for securities by keyword (company name, symbol, etc.)
 */
export const searchSecurities = async (query: string): Promise<SecuritySearchResult[]> => {
  if (!query || query.length < 2) return [];
  
  try {
    // First check if this is a special ticker (like BRK.B) that needs special handling
    const upperQuery = query.toUpperCase();
    const specialTicker = getSpecialTickerInfo(upperQuery);
    
    if (specialTicker) {
      return [specialTicker];
    }
    
    // If not a special ticker, check if it's a valid ticker by trying to get metadata
    const isValidTicker = await tiingoService.validateTicker(upperQuery);
    
    if (isValidTicker) {
      const metadata = await tiingoService.getMetadata(upperQuery);
      return [{
        symbol: metadata.ticker,
        name: metadata.name,
        assetType: 'equity', // Default to equity, can be refined later
        exchange: metadata.exchangeCode
      }];
    }
    
    // If not a direct ticker match, fallback to mock search results for now
    // In a production app, you could implement a more sophisticated search
    return getMockSearchResults(query);
  } catch (error) {
    console.error('Error searching securities:', error);
    return getMockSearchResults(query);
  }
};

/**
 * Get current price and basic info for a security using Tiingo API
 */
export const getSecurityPrice = async (symbol: string): Promise<SecurityPrice> => {
  try {
    const realtimeData = await tiingoService.getRealTimePrice(symbol);
    
    // Use tngoLast instead of last for more reliable price data
    return {
      symbol,
      currentPrice: realtimeData.tngoLast || realtimeData.last,
      previousClose: realtimeData.prevClose,
      change: (realtimeData.tngoLast || realtimeData.last) - realtimeData.prevClose,
      changePercent: ((realtimeData.tngoLast || realtimeData.last) - realtimeData.prevClose) / realtimeData.prevClose,
      high: realtimeData.high,
      low: realtimeData.low,
      volume: realtimeData.volume,
      timestamp: realtimeData.timestamp
    };
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return getMockSecurityPrice(symbol);
  }
};

/**
 * Get detailed information about a security using Tiingo API
 */
export const getSecurityDetails = async (symbol: string): Promise<SecurityDetails> => {
  try {
    // Check if this is a special ticker that needs custom handling
    const specialTicker = getSpecialTickerInfo(symbol);
    
    if (specialTicker) {
      // For special tickers, we might need to use mock data
      // but we'll try to get real price data first
      try {
        const priceData = await tiingoService.getRealTimePrice(symbol);
        
        // Use tngoLast instead of last for more reliable price data
        const price = priceData.tngoLast || priceData.last;
        
        return {
          symbol: specialTicker.symbol,
          name: specialTicker.name,
          description: `${specialTicker.name} stock.`,
          sector: determineDefaultSector(symbol),
          industry: determineDefaultIndustry(symbol),
          assetClass: determineAssetClass(symbol),
          price: price,
          previousClose: priceData.prevClose,
          change: price - priceData.prevClose,
          changePercent: (price - priceData.prevClose) / priceData.prevClose,
          high: priceData.high,
          low: priceData.low,
          marketCap: undefined,
          peRatio: undefined,
          dividendYield: undefined,
          high52Week: undefined, 
          low52Week: undefined,
          volume: priceData.volume,
          avgVolume: undefined
        };
      } catch (priceError) {
        console.error(`Error fetching price data for special ticker ${symbol}:`, priceError);
        // Fall back to mock data
        return getMockSecurityDetails(symbol);
      }
    }
    
    // For normal tickers, proceed with standard API calls
    // Get real-time price data from Tiingo
    const priceData = await tiingoService.getRealTimePrice(symbol);
    
    // Get metadata from Tiingo
    const metadata = await tiingoService.getMetadata(symbol);
    
    // Log the API response for debugging
    console.log(`Tiingo API response for ${symbol}:`, JSON.stringify(priceData, null, 2));
    
    // Use tngoLast instead of last for more reliable price data
    const price = priceData.tngoLast || priceData.last;
    
    // Map the data to our SecurityDetails interface
    return {
      symbol,
      name: metadata.name,
      description: metadata.description,
      // We don't have sector/industry from Tiingo basic metadata, so generate these
      sector: determineDefaultSector(symbol),
      industry: determineDefaultIndustry(symbol),
      assetClass: determineAssetClass(symbol),
      price: price,
      previousClose: priceData.prevClose,
      change: price - priceData.prevClose,
      changePercent: (price - priceData.prevClose) / priceData.prevClose,
      high: priceData.high,
      low: priceData.low,
      // Some fields aren't available from basic Tiingo data
      marketCap: undefined,
      peRatio: undefined,
      dividendYield: undefined,
      high52Week: undefined, 
      low52Week: undefined,
      volume: priceData.volume,
      avgVolume: undefined
    };
  } catch (error) {
    console.error(`Error fetching details for ${symbol}:`, error);
    return getMockSecurityDetails(symbol);
  }
};

// Helper to determine asset class based on symbol and exchange patterns
function determineAssetClass(symbol: string): 'equity' | 'bond' | 'commodity' | 'cash' | 'alternative' | 'real_estate' {
  // Common bond ETF symbols
  const bondETFs = ['AGG', 'BND', 'LQD', 'TLT', 'HYG', 'MUB', 'GOVT', 'SHY', 'BSV', 'VCIT'];
  if (bondETFs.includes(symbol)) return 'bond';
  
  // Common real estate ETFs
  const realEstateETFs = ['VNQ', 'IYR', 'SCHH', 'XLRE'];
  if (realEstateETFs.includes(symbol)) return 'real_estate';
  
  // Common commodity ETFs/symbols
  const commoditySymbols = ['GLD', 'SLV', 'USO', 'BNO', 'DBC'];
  if (commoditySymbols.includes(symbol)) return 'commodity';
  
  // Default to equity for most symbols
  return 'equity';
}

// Helper function to determine a default sector for a symbol when not available from API
function determineDefaultSector(symbol: string): string {
  const sectorMap: Record<string, string> = {
    // Tech
    'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'META': 'Technology',
    // Financial
    'JPM': 'Financial Services', 'BAC': 'Financial Services', 'GS': 'Financial Services',
    // Healthcare
    'JNJ': 'Healthcare', 'PFE': 'Healthcare', 'UNH': 'Healthcare',
    // Energy
    'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy',
    // Consumer
    'AMZN': 'Consumer Cyclical', 'WMT': 'Consumer Defensive', 'PG': 'Consumer Defensive'
  };
  
  return sectorMap[symbol] || 'Unknown';
}

// Helper function to determine a default industry for a symbol when not available from API
function determineDefaultIndustry(symbol: string): string {
  const industryMap: Record<string, string> = {
    // Tech
    'AAPL': 'Consumer Electronics', 'MSFT': 'Software', 'GOOGL': 'Internet Services',
    // Financial
    'JPM': 'Banks', 'BAC': 'Banks', 'GS': 'Investment Banking',
    // Healthcare
    'JNJ': 'Pharmaceuticals', 'PFE': 'Pharmaceuticals', 'UNH': 'Healthcare Plans',
    // Energy
    'XOM': 'Oil & Gas', 'CVX': 'Oil & Gas', 'COP': 'Oil & Gas',
    // Consumer
    'AMZN': 'E-commerce', 'WMT': 'Retail', 'PG': 'Household Products'
  };
  
  return industryMap[symbol] || 'Unknown';
}

/**
 * Get a list of popular US equities
 */
export const getPopularEquities = (): SecuritySearchResult[] => {
  return [
    { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'equity', exchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', assetType: 'equity', exchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', assetType: 'equity', exchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', assetType: 'equity', exchange: 'NASDAQ' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', assetType: 'equity', exchange: 'NYSE' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', assetType: 'equity', exchange: 'NYSE' },
    { symbol: 'JNJ', name: 'Johnson & Johnson', assetType: 'equity', exchange: 'NYSE' },
    { symbol: 'V', name: 'Visa Inc.', assetType: 'equity', exchange: 'NYSE' },
    { symbol: 'PG', name: 'Procter & Gamble Co.', assetType: 'equity', exchange: 'NYSE' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc.', assetType: 'equity', exchange: 'NYSE' }
  ];
};

// Helper function to handle special tickers that may have issues with API lookups
export const getSpecialTickerInfo = (ticker: string): SecuritySearchResult | null => {
  const specialTickers: Record<string, SecuritySearchResult> = {
    'BRK.B': { 
      symbol: 'BRK.B', 
      name: 'Berkshire Hathaway Inc. Class B', 
      assetType: 'equity', 
      exchange: 'NYSE'
    },
    'BF.B': {
      symbol: 'BF.B',
      name: 'Brown-Forman Corporation Class B',
      assetType: 'equity',
      exchange: 'NYSE'
    },
    'BF.A': {
      symbol: 'BF.A',
      name: 'Brown-Forman Corporation Class A',
      assetType: 'equity',
      exchange: 'NYSE'
    }
  };

  return specialTickers[ticker] || null;
};

/**
 * Get list of S&P 500 constituents from Tiingo
 * @returns Promise with array of S&P 500 constituents as SecuritySearchResult objects
 */
export const getSP500Constituents = async (): Promise<SecuritySearchResult[]> => {
  try {
    // Check for cached SP500 data (stored locally to avoid excessive API calls)
    const cacheKey = 'sp500-constituents-data';
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        const cacheTime = parsedData.timestamp || 0;
        // Cache for 24 hours
        if (Date.now() - cacheTime < 24 * 60 * 60 * 1000) {
          console.log('Using cached S&P 500 constituents data');
          return parsedData.data;
        }
      }
    } catch (e) {
      console.error('Error reading cached S&P 500 data:', e);
    }
    
    // Get S&P 500 tickers from Tiingo service
    const tickers = await tiingoService.getSP500Constituents();
    
    // We'll process the tickers in batches to avoid making too many API calls at once
    const batchSize = 10;
    const results: SecuritySearchResult[] = [];
    const batches = Math.ceil(tickers.length / batchSize);
    
    console.log(`Processing ${tickers.length} S&P 500 constituents in ${batches} batches`);
    
    // Process first batch immediately to show some results quickly
    const firstBatchTickers = tickers.slice(0, batchSize);
    await processBatch(firstBatchTickers, results);
    
    // Process remaining batches
    if (tickers.length > batchSize) {
      // We'll continue loading the rest in the background
      setTimeout(async () => {
        for (let i = 1; i < batches; i++) {
          const start = i * batchSize;
          const end = Math.min(start + batchSize, tickers.length);
          const batchTickers = tickers.slice(start, end);
          
          await processBatch(batchTickers, results);
          
          // Update cache after each batch
          try {
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              data: results,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.error('Error caching S&P 500 data:', e);
          }
        }
        
        console.log(`Finished loading all ${results.length} S&P 500 constituents`);
      }, 100);
    }
    
    // Cache initial results
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        data: results,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Error caching S&P 500 data:', e);
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching S&P 500 constituents:', error);
    // Return popular equities as fallback
    return getPopularEquities();
  }
};

// Helper function to process a batch of tickers
async function processBatch(tickers: string[], results: SecuritySearchResult[]): Promise<void> {
  // Create a batch of promises to fetch metadata for each ticker
  const promises = tickers.map(async (ticker) => {
    // First check if this is a special ticker
    const specialTicker = getSpecialTickerInfo(ticker);
    if (specialTicker) {
      return specialTicker;
    }
    
    try {
      // Try to get metadata from Tiingo
      const metadata = await tiingoService.getMetadata(ticker);
      return {
        symbol: metadata.ticker,
        name: metadata.name,
        assetType: 'equity' as const,
        exchange: metadata.exchangeCode || 'US'
      };
    } catch (error) {
      console.warn(`Could not fetch metadata for ${ticker}:`, error);
      // If metadata fetch fails, create a basic entry
      return {
        symbol: ticker,
        name: ticker,
        assetType: 'equity' as const,
        exchange: 'US'
      };
    }
  });
  
  // Wait for all promises to resolve
  const batchResults = await Promise.all(promises);
  
  // Add results to the main array
  results.push(...batchResults);
}

/**
 * Get a list of popular US bond ETFs
 */
export const getPopularBonds = (): SecuritySearchResult[] => {
  return [
    { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', assetType: 'etf', exchange: 'NYSE' },
    { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetType: 'etf', exchange: 'NASDAQ' },
    { symbol: 'LQD', name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF', assetType: 'etf', exchange: 'NYSE' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', assetType: 'etf', exchange: 'NASDAQ' },
    { symbol: 'HYG', name: 'iShares iBoxx $ High Yield Corporate Bond ETF', assetType: 'etf', exchange: 'NYSE' },
    { symbol: 'MUB', name: 'iShares National Muni Bond ETF', assetType: 'etf', exchange: 'NYSE' },
    { symbol: 'GOVT', name: 'iShares U.S. Treasury Bond ETF', assetType: 'etf', exchange: 'NYSE' },
    { symbol: 'SHY', name: 'iShares 1-3 Year Treasury Bond ETF', assetType: 'etf', exchange: 'NASDAQ' },
    { symbol: 'BSV', name: 'Vanguard Short-Term Bond ETF', assetType: 'etf', exchange: 'NYSE' },
    { symbol: 'VCIT', name: 'Vanguard Intermediate-Term Corporate Bond ETF', assetType: 'etf', exchange: 'NASDAQ' }
  ];
};

// Helper functions for mock data when API fails
function getMockSearchResults(query: string): SecuritySearchResult[] {
  // Combine popular stocks and bonds
  const allSecurities = [...getPopularEquities(), ...getPopularBonds()];
  
  // Filter based on query
  return allSecurities.filter(security => 
    security.symbol.toLowerCase().includes(query.toLowerCase()) || 
    security.name.toLowerCase().includes(query.toLowerCase())
  );
}

function getMockSecurityPrice(symbol: string): SecurityPrice {
  // Generate realistic mock price data
  const basePrice = symbol.length * 10 + Math.random() * 100;
  const change = (Math.random() * 10) - 5; // Random change between -5 and +5
  const changePercent = change / basePrice;
  
  return {
    symbol,
    currentPrice: basePrice,
    previousClose: basePrice - change,
    change,
    changePercent,
    high: basePrice + Math.random() * 5,
    low: basePrice - Math.random() * 5,
    volume: Math.floor(Math.random() * 10000000),
    timestamp: new Date().toISOString()
  };
}

function getMockSecurityDetails(symbol: string): SecurityDetails {
  const price = getMockSecurityPrice(symbol);
  const isETF = getPopularBonds().some(bond => bond.symbol === symbol);
  
  // Find in our predefined lists
  const securityInfo = [...getPopularEquities(), ...getPopularBonds()].find(s => s.symbol === symbol);
  
  return {
    symbol,
    name: securityInfo?.name || `${symbol} Corporation`,
    description: `This is a mock description for ${symbol}.`,
    sector: isETF ? 'Fixed Income' : getRandomSector(),
    industry: isETF ? 'ETF' : getRandomIndustry(),
    assetClass: isETF ? 'bond' : 'equity',
    price: price.currentPrice,
    previousClose: price.previousClose,
    change: price.change,
    changePercent: price.changePercent,
    high: price.high,
    low: price.low,
    marketCap: Math.floor(Math.random() * 1000000000000),
    peRatio: Math.random() * 30 + 5,
    dividendYield: Math.random() * 5,
    high52Week: price.currentPrice * (1 + Math.random() * 0.3),
    low52Week: price.currentPrice * (1 - Math.random() * 0.3),
    volume: price.volume,
    avgVolume: Math.floor(Math.random() * 20000000)
  };
}

// Some random sectors for mock data
function getRandomSector(): string {
  const sectors = [
    'Technology',
    'Financial Services',
    'Healthcare',
    'Communication Services',
    'Consumer Cyclical',
    'Industrials',
    'Consumer Defensive',
    'Energy',
    'Utilities',
    'Basic Materials',
    'Real Estate'
  ];
  
  return sectors[Math.floor(Math.random() * sectors.length)];
}

// Some random industries for mock data
function getRandomIndustry(): string {
  const industries = [
    'Software',
    'Hardware',
    'Banks',
    'Insurance',
    'Biotechnology',
    'Pharmaceuticals',
    'Telecommunications',
    'Media',
    'Retail',
    'Manufacturing',
    'Food & Beverage',
    'Oil & Gas',
    'Electric Utilities',
    'Chemicals',
    'REITs'
  ];
  
  return industries[Math.floor(Math.random() * industries.length)];
}

export default {
  searchSecurities,
  getSecurityPrice,
  getSecurityDetails,
  getPopularEquities,
  getPopularBonds,
  getSP500Constituents
}; 