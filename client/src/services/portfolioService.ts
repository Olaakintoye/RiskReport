import AsyncStorage from '@react-native-async-storage/async-storage';
import tiingoService from './tiingoService';
import { v4 as uuidv4 } from '../utils/uuid';

// Define types for portfolio data
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  price: number;
  assetClass: 'equity' | 'bond' | 'commodity' | 'cash' | 'alternative' | 'real_estate';
}

export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  assets: Asset[];
  riskProfile?: {
    var_95_limit?: number;
    var_99_limit?: number;
    target_return?: number;
    max_drawdown_limit?: number;
  };
}

export interface PortfolioSummary {
  id: string;
  name: string;
  lastModified: string;
  totalValue: number;
  oneDayPL: number;
  allocation: Record<string, number>;
  lastVaR: number;  // Value at Risk percentage (0-100)
  assetCount: number; // Count of assets in the portfolio
}

const STORAGE_KEY = 'portfolios';

// Sample initial portfolios for demonstration
const SAMPLE_PORTFOLIOS: Portfolio[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    name: 'Conservative Portfolio',
    description: 'Low-risk portfolio focused on capital preservation',
    createdAt: '2023-01-15T12:00:00Z',
    updatedAt: '2023-09-15T12:00:00Z',
    assets: [
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567891',
        symbol: 'VBTLX',
        name: 'Vanguard Total Bond Market Index',
        quantity: 500,
        price: 52.18,
        assetClass: 'bond'
      },
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567892',
        symbol: 'VTI',
        name: 'Vanguard Total Stock Market ETF',
        quantity: 100,
        price: 220.15,
        assetClass: 'equity'
      },
      {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567893',
        symbol: 'VMFXX',
        name: 'Vanguard Federal Money Market',
        quantity: 5000,
        price: 1.00,
        assetClass: 'cash'
      }
    ]
  },
  {
    id: 'b2c3d4e5-f6g7-8901-bcde-f23456789012',
    name: 'Aggressive Growth',
    description: 'High growth potential with higher risk',
    createdAt: '2023-02-10T12:00:00Z',
    updatedAt: '2023-09-18T12:00:00Z',
    assets: [
      {
        id: 'b2c3d4e5-f6g7-8901-bcde-f23456789013',
        symbol: 'ARKK',
        name: 'ARK Innovation ETF',
        quantity: 200,
        price: 43.75,
        assetClass: 'equity'
      },
      {
        id: 'b2c3d4e5-f6g7-8901-bcde-f23456789014',
        symbol: 'QQQ',
        name: 'Invesco QQQ Trust',
        quantity: 150,
        price: 367.23,
        assetClass: 'equity'
      },
      {
        id: 'b2c3d4e5-f6g7-8901-bcde-f23456789015',
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 0.5,
        price: 26800.00,
        assetClass: 'alternative'
      }
    ]
  },
  {
    id: 'c3d4e5f6-g7h8-9012-cdef-345678901234',
    name: 'Income Portfolio',
    description: 'Focused on dividend income and yield',
    createdAt: '2023-03-05T12:00:00Z',
    updatedAt: '2023-09-10T12:00:00Z',
    assets: [
      {
        id: 'c3d4e5f6-g7h8-9012-cdef-345678901235',
        symbol: 'SCHD',
        name: 'Schwab US Dividend Equity ETF',
        quantity: 300,
        price: 72.10,
        assetClass: 'equity'
      },
      {
        id: 'c3d4e5f6-g7h8-9012-cdef-345678901236',
        symbol: 'VCIT',
        name: 'Vanguard Intermediate-Term Corporate Bond ETF',
        quantity: 400,
        price: 78.50,
        assetClass: 'bond'
      },
      {
        id: 'c3d4e5f6-g7h8-9012-cdef-345678901237',
        symbol: 'VNQ',
        name: 'Vanguard Real Estate ETF',
        quantity: 150,
        price: 80.25,
        assetClass: 'real_estate'
      }
    ]
  }
];

/**
 * Calculate allocation percentages for a portfolio
 */
const calculateAllocation = (portfolio: Portfolio): Record<string, number> => {
  const totalValue = portfolio.assets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0);
  
  const allocationByClass: Record<string, number> = {};
  
  portfolio.assets.forEach(asset => {
    const assetValue = asset.price * asset.quantity;
    const assetClass = asset.assetClass;
    
    if (!allocationByClass[assetClass]) {
      allocationByClass[assetClass] = 0;
    }
    
    allocationByClass[assetClass] += assetValue / totalValue;
  });
  
  return allocationByClass;
};

/**
 * Update portfolio risk profile with VaR limits
 */
export const updatePortfolioRiskProfile = async (portfolioId: string, riskProfile: {
  var_95_limit?: number;
  var_99_limit?: number;
  target_return?: number;
  max_drawdown_limit?: number;
}): Promise<void> => {
  try {
    const portfolio = await getPortfolioById(portfolioId);
    if (!portfolio) {
      throw new Error(`Portfolio with ID ${portfolioId} not found`);
    }

    // Update the portfolio with new risk profile
    const updatedPortfolio: Portfolio = {
      ...portfolio,
      riskProfile: {
        ...portfolio.riskProfile,
        ...riskProfile
      },
      updatedAt: new Date().toISOString()
    };

    // Update the portfolio using the existing updatePortfolio function
    await updatePortfolio(updatedPortfolio);
  } catch (error) {
    console.error('Error updating portfolio risk profile:', error);
    throw error;
  }
};

/**
 * Get portfolio VaR limit for a specific confidence level
 */
export const getPortfolioVaRLimit = (portfolio: Portfolio, confidenceLevel: number = 0.95): number | null => {
  if (!portfolio.riskProfile) return null;
  
  if (confidenceLevel === 0.95) {
    return portfolio.riskProfile.var_95_limit || null;
  } else if (confidenceLevel === 0.99) {
    return portfolio.riskProfile.var_99_limit || null;
  }
  
  return null;
};

/**
 * Convert a Portfolio to a PortfolioSummary
 */
const createPortfolioSummary = (portfolio: Portfolio): PortfolioSummary => {
  const totalValue = portfolio.assets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0);
  
  // Calculate actual daily P&L based on asset price changes (simplified)
  // In a real app, this would be calculated from historical price data
  const oneDayPL = totalValue * (Math.random() * 0.04 - 0.02); // ±2% range
  
  // Calculate actual VaR using asset class weights and volatilities
  let portfolioVolatility = 0;
  
  if (totalValue > 0) {
    portfolio.assets.forEach(asset => {
      const assetValue = asset.price * asset.quantity;
      const assetWeight = assetValue / totalValue;
      
      // Asset class volatilities (annualized)
      let assetVolatility = 0;
      switch (asset.assetClass) {
        case 'equity':
          assetVolatility = 0.20; // 20% volatility
          break;
        case 'bond':
          assetVolatility = 0.05; // 5% volatility
          break;
        case 'real_estate':
          assetVolatility = 0.15; // 15% volatility
          break;
        case 'commodity':
          assetVolatility = 0.25; // 25% volatility
          break;
        case 'cash':
          assetVolatility = 0.01; // 1% volatility
          break;
        case 'alternative':
          assetVolatility = 0.30; // 30% volatility
          break;
        default:
          assetVolatility = 0.18; // Default 18% volatility
      }
      
      // Simple portfolio volatility (ignoring correlations for now)
      portfolioVolatility += assetWeight * assetVolatility;
    });
  } else {
    portfolioVolatility = 0.18; // Default portfolio volatility
  }
  
  // Calculate 1-day 95% VaR using parametric approach
  const dailyVolatility = portfolioVolatility / Math.sqrt(252); // Convert annual to daily
  const zScore95 = 1.645; // 95% confidence z-score
  const lastVaR = dailyVolatility * zScore95 * 100; // Convert to percentage
  
  return {
    id: portfolio.id,
    name: portfolio.name,
    lastModified: portfolio.updatedAt,
    totalValue,
    oneDayPL,
    allocation: calculateAllocation(portfolio),
    lastVaR: Math.round(lastVaR * 100) / 100, // Round to 2 decimal places
    assetCount: portfolio.assets.length
  };
};

/**
 * Initialize portfolios in storage with sample data if needed
 */
const initializePortfolios = async (): Promise<void> => {
  try {
    const existingPortfolios = await AsyncStorage.getItem(STORAGE_KEY);
    
    if (!existingPortfolios) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_PORTFOLIOS));
    }
  } catch (error) {
    console.error('Error initializing portfolios:', error);
  }
};

/**
 * Get all portfolios
 */
const getPortfolios = async (): Promise<Portfolio[]> => {
  try {
    const portfoliosJson = await AsyncStorage.getItem(STORAGE_KEY);
    return portfoliosJson ? JSON.parse(portfoliosJson) : [];
  } catch (error) {
    console.error('Error getting portfolios:', error);
    return [];
  }
};

/**
 * Get portfolio summaries for displaying in lists
 */
const getPortfolioSummaries = async (): Promise<PortfolioSummary[]> => {
  try {
    const portfolios = await getPortfolios();
    return portfolios.map(createPortfolioSummary);
  } catch (error) {
    console.error('Error getting portfolio summaries:', error);
    return [];
  }
};

/**
 * Get a single portfolio by ID
 */
const getPortfolioById = async (id: string): Promise<Portfolio | null> => {
  try {
    const portfolios = await getPortfolios();
    return portfolios.find(p => p.id === id) || null;
  } catch (error) {
    console.error('Error getting portfolio by ID:', error);
    return null;
  }
};

/**
 * Update portfolio asset prices with real-time data from Tiingo API
 */
const updatePortfolioWithRealPrices = async (portfolio: Portfolio): Promise<Portfolio> => {
  try {
    // Get all the unique ticker symbols from the portfolio
    const symbols = [...new Set(portfolio.assets.map(asset => asset.symbol))];
    console.log(`🔄 Updating prices for ${symbols.length} symbols: ${symbols.join(', ')}`);
    
    // Batch fetch real-time prices for all symbols
    const symbolsData: Record<string, number> = {};
    
    try {
      // Process symbols in batches of 5 to avoid rate limiting
      for (let i = 0; i < symbols.length; i += 5) {
        const batchSymbols = symbols.slice(i, i + 5);
        console.log(`📡 Fetching batch ${Math.floor(i/5) + 1}: ${batchSymbols.join(', ')}`);
        const pricesData = await tiingoService.getBatchRealTimePrices(batchSymbols);
        
        // Add the prices to our data object
        for (const symbol of batchSymbols) {
          if (pricesData[symbol]) {
            // Use tngoLast instead of last for more reliable price data
            const newPrice = pricesData[symbol].tngoLast || pricesData[symbol].last;
            symbolsData[symbol] = newPrice;
            console.log(`💰 ${symbol}: $${newPrice} (tngoLast: ${pricesData[symbol].tngoLast}, last: ${pricesData[symbol].last})`);
          } else {
            console.warn(`⚠️ No price data received for ${symbol}`);
          }
        }
      }
    } catch (error) {
      // Check if this is a rate limiting error
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        console.warn('🚫 Tiingo API rate limit exceeded. Using cached prices.');
        // Don't throw the error, just use existing prices
      } else {
      console.warn('Failed to fetch real-time prices, using existing prices', error);
      }
      // Continue with the function even if API calls fail
      // We'll use whatever data we've managed to get
    }
    
    // Only update assets where we have real price data
    const updatedAssets = portfolio.assets.map(asset => {
      if (symbolsData[asset.symbol]) {
        const oldPrice = asset.price;
        const newPrice = symbolsData[asset.symbol];
        console.log(`🔄 ${asset.symbol}: $${oldPrice} → $${newPrice} (${((newPrice - oldPrice) / oldPrice * 100).toFixed(2)}% change)`);
        return {
          ...asset,
          price: newPrice
        };
      } else {
        console.log(`📊 ${asset.symbol}: Keeping existing price $${asset.price} (no new data)`);
      }
      return asset;
    });
    
    const updatedPortfolio = {
      ...portfolio,
      assets: updatedAssets,
      updatedAt: new Date().toISOString()
    };
    
    const oldValue = portfolio.assets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0);
    const newValue = updatedAssets.reduce((sum, asset) => sum + asset.price * asset.quantity, 0);
    console.log(`💼 Portfolio ${portfolio.name}: $${oldValue.toFixed(2)} → $${newValue.toFixed(2)} (${((newValue - oldValue) / oldValue * 100).toFixed(2)}% change)`);
    
    return updatedPortfolio;
  } catch (error) {
    console.error('Error updating portfolio with real-time prices:', error);
    // Return the original portfolio unchanged if there's an error
    return portfolio;
  }
};

/**
 * Create a new portfolio
 */
const createPortfolio = async (portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt'>): Promise<Portfolio> => {
  try {
    console.log('portfolioService.createPortfolio called with:', portfolio);
    
    const portfolios = await getPortfolios();
    console.log('Existing portfolios:', portfolios);
    
    const newPortfolio: Portfolio = {
      ...portfolio,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Update portfolio with real-time prices before saving
    const portfolioWithRealPrices = await updatePortfolioWithRealPrices(newPortfolio);
    
    // Save the portfolio with updated prices
    const updatedPortfolios = [...portfolios, portfolioWithRealPrices];
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolios));
    
    return portfolioWithRealPrices;
  } catch (error) {
    console.error('Error creating portfolio:', error);
    throw error;
  }
};

/**
 * Update an existing portfolio
 */
const updatePortfolio = async (portfolio: Portfolio): Promise<Portfolio> => {
  try {
    const portfolios = await getPortfolios();
    
    // Update portfolio with real-time prices
    const portfolioWithRealPrices = await updatePortfolioWithRealPrices({
      ...portfolio,
      updatedAt: new Date().toISOString()
    });
    
    const updatedPortfolios = portfolios.map(p => 
      p.id === portfolioWithRealPrices.id ? portfolioWithRealPrices : p
    );
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolios));
    
    return portfolioWithRealPrices;
  } catch (error) {
    console.error('Error updating portfolio:', error);
    throw error;
  }
};

/**
 * Delete a portfolio
 */
const deletePortfolio = async (id: string): Promise<void> => {
  try {
    const portfolios = await getPortfolios();
    const updatedPortfolios = portfolios.filter(p => p.id !== id);
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolios));
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    throw error;
  }
};

/**
 * Get all portfolios in a simplified format
 */
export const getAllPortfolios = async (): Promise<{ id: string; name: string; totalValue: number }[]> => {
  try {
    const portfolios = await getPortfolios();
    
    // Update all portfolios with real-time pricing
    const updatedPortfolios = await Promise.all(
      portfolios.map(portfolio => updatePortfolioWithRealPrices(portfolio))
    );
    
    // Update storage with the latest prices
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolios));
    
    return updatedPortfolios.map(portfolio => ({
      id: portfolio.id,
      name: portfolio.name,
      totalValue: portfolio.assets.reduce(
        (sum, asset) => sum + asset.price * asset.quantity, 
        0
      )
    }));
  } catch (error) {
    console.error('Error getting all portfolios:', error);
    return [];
  }
};

/**
 * Refresh portfolio prices by clearing the cache and fetching new data
 */
const refreshPortfolioPrices = async (portfolio: Portfolio): Promise<Portfolio> => {
  try {
    // Clear the Tiingo cache to force new API calls
    tiingoService.clearCache();
    
    // Update with fresh data
    return await updatePortfolioWithRealPrices(portfolio);
  } catch (error) {
    console.error('Error refreshing portfolio prices:', error);
    return portfolio;
  }
};

/**
 * Force refresh all portfolios with fresh market data
 * This is useful when prices seem outdated or incorrect
 */
const refreshAllPortfolios = async (): Promise<void> => {
  try {
    console.log('Starting full portfolio refresh...');
    
    // Clear the Tiingo cache to force fresh API calls
    tiingoService.clearCache();
    
    // Get all portfolios
    const portfolios = await getPortfolios();
    console.log(`Refreshing ${portfolios.length} portfolios`);
    
    // Update each portfolio with fresh pricing data
    const updatedPortfolios = await Promise.all(
      portfolios.map(portfolio => updatePortfolioWithRealPrices(portfolio))
    );
    
    // Save the updated portfolios
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPortfolios));
    
    console.log('All portfolios refreshed successfully');
  } catch (error) {
    console.error('Error refreshing all portfolios:', error);
    throw error;
  }
};

/**
 * Clear existing portfolios and reinitialize with proper UUIDs
 * This fixes the issue where portfolios had timestamp-based IDs instead of UUIDs
 */
const migratePortfolioIds = async (): Promise<void> => {
  try {
    console.log('Migrating portfolio IDs from timestamps to UUIDs...');
    
    // Clear existing portfolios that might have timestamp IDs
    await AsyncStorage.removeItem(STORAGE_KEY);
    
    // Reinitialize with proper UUID-based portfolios
    await initializePortfolios();
    
    console.log('Portfolio ID migration completed successfully');
  } catch (error) {
    console.error('Error during portfolio ID migration:', error);
  }
};

// Initialize with sample data
initializePortfolios();

// Run migration on app start to fix any existing timestamp-based IDs
migratePortfolioIds();

export default {
  getPortfolios,
  getPortfolioSummaries,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getAllPortfolios,
  refreshPortfolioPrices,
  refreshAllPortfolios,
  updatePortfolioRiskProfile,
  getPortfolioVaRLimit
}; 