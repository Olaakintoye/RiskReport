/**
 * Asset Classification Service
 * 
 * Hybrid approach for asset classification:
 * - Tier 1: Hardcoded database for common symbols (fast, accurate)
 * - Tier 2: Dynamic lookup via Tiingo metadata API
 * - Tier 3: Intelligent fallback based on patterns and heuristics
 */

import tiingoService from './tiingoService';

export interface AssetMetadata {
  symbol: string;
  sector: string;
  industry: string;
  marketCap: 'large' | 'mid' | 'small' | 'micro';
  geography: 'us' | 'international' | 'emerging';
  assetType: 'equity' | 'bond' | 'commodity' | 'real_estate' | 'alternative' | 'cash';
  duration?: number; // For bonds
  creditRating?: string; // For bonds
  underlyingIndex?: string; // For ETFs
  classificationSource: 'hardcoded' | 'api' | 'fallback';
}

// Session cache for classifications to minimize API calls
const classificationCache: Map<string, AssetMetadata> = new Map();

/**
 * TIER 1: Expanded Hardcoded Asset Classifications Database
 * 100+ common symbols with accurate metadata
 */
const HARDCODED_CLASSIFICATIONS: Record<string, Partial<AssetMetadata>> = {
  // ===== BROAD MARKET EQUITY ETFs =====
  'SPY': { sector: 'Broad Market', industry: 'Large Cap Equity', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'S&P 500' },
  'VOO': { sector: 'Broad Market', industry: 'Large Cap Equity', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'S&P 500' },
  'IVV': { sector: 'Broad Market', industry: 'Large Cap Equity', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'S&P 500' },
  'VTI': { sector: 'Broad Market', industry: 'Total Stock Market', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Total Stock Market' },
  'ITOT': { sector: 'Broad Market', industry: 'Total Stock Market', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Total Stock Market' },
  'SPTM': { sector: 'Broad Market', industry: 'Total Stock Market', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Total Stock Market' },
  
  // ===== GROWTH & TECHNOLOGY ETFs =====
  'QQQ': { sector: 'Technology', industry: 'Large Cap Growth', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'NASDAQ-100' },
  'QQQM': { sector: 'Technology', industry: 'Large Cap Growth', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'NASDAQ-100' },
  'VGT': { sector: 'Technology', industry: 'Technology Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Technology' },
  'XLK': { sector: 'Technology', industry: 'Technology Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Technology' },
  'VUG': { sector: 'Broad Market', industry: 'Large Cap Growth', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Growth' },
  'IWF': { sector: 'Broad Market', industry: 'Large Cap Growth', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Russell 1000 Growth' },
  
  // ===== VALUE & DIVIDEND ETFs =====
  'SCHD': { sector: 'Dividend', industry: 'Dividend ETF', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Dow Jones US Dividend 100' },
  'VYM': { sector: 'Dividend', industry: 'High Dividend Yield', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Dividend' },
  'DVY': { sector: 'Dividend', industry: 'Dividend ETF', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Dividend' },
  'VTV': { sector: 'Broad Market', industry: 'Large Cap Value', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Value' },
  'IWD': { sector: 'Broad Market', industry: 'Large Cap Value', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Russell 1000 Value' },
  
  // ===== SMALL & MID CAP ETFs =====
  'IWM': { sector: 'Broad Market', industry: 'Small Cap Equity', marketCap: 'small', geography: 'us', assetType: 'equity', underlyingIndex: 'Russell 2000' },
  'VB': { sector: 'Broad Market', industry: 'Small Cap Equity', marketCap: 'small', geography: 'us', assetType: 'equity', underlyingIndex: 'Small Cap' },
  'IJR': { sector: 'Broad Market', industry: 'Small Cap Equity', marketCap: 'small', geography: 'us', assetType: 'equity', underlyingIndex: 'S&P SmallCap 600' },
  'VO': { sector: 'Broad Market', industry: 'Mid Cap Equity', marketCap: 'mid', geography: 'us', assetType: 'equity', underlyingIndex: 'Mid Cap' },
  'IJH': { sector: 'Broad Market', industry: 'Mid Cap Equity', marketCap: 'mid', geography: 'us', assetType: 'equity', underlyingIndex: 'S&P MidCap 400' },
  'MDY': { sector: 'Broad Market', industry: 'Mid Cap Equity', marketCap: 'mid', geography: 'us', assetType: 'equity', underlyingIndex: 'S&P MidCap 400' },
  
  // ===== SECTOR ETFs =====
  'XLF': { sector: 'Financials', industry: 'Financial Services', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Financials' },
  'VFH': { sector: 'Financials', industry: 'Financial Services', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Financials' },
  'XLE': { sector: 'Energy', industry: 'Energy Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Energy' },
  'VDE': { sector: 'Energy', industry: 'Energy Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Energy' },
  'XLV': { sector: 'Healthcare', industry: 'Healthcare Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Healthcare' },
  'VHT': { sector: 'Healthcare', industry: 'Healthcare Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Healthcare' },
  'XLI': { sector: 'Industrials', industry: 'Industrial Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Industrials' },
  'VIS': { sector: 'Industrials', industry: 'Industrial Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Industrials' },
  'XLP': { sector: 'Consumer Staples', industry: 'Consumer Staples', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Consumer Staples' },
  'VDC': { sector: 'Consumer Staples', industry: 'Consumer Staples', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Consumer Staples' },
  'XLY': { sector: 'Consumer Discretionary', industry: 'Consumer Discretionary', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Consumer Discretionary' },
  'VCR': { sector: 'Consumer Discretionary', industry: 'Consumer Discretionary', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Consumer Discretionary' },
  'XLU': { sector: 'Utilities', industry: 'Utilities Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Utilities' },
  'VPU': { sector: 'Utilities', industry: 'Utilities Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Utilities' },
  'XLB': { sector: 'Materials', industry: 'Materials Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Materials' },
  'VAW': { sector: 'Materials', industry: 'Materials Sector', marketCap: 'large', geography: 'us', assetType: 'equity', underlyingIndex: 'Materials' },
  
  // ===== BOND ETFs - GOVERNMENT =====
  'TLT': { sector: 'Government', industry: 'Treasury Bonds', geography: 'us', assetType: 'bond', duration: 17, creditRating: 'AAA' },
  'IEF': { sector: 'Government', industry: 'Treasury Bonds', geography: 'us', assetType: 'bond', duration: 7, creditRating: 'AAA' },
  'SHY': { sector: 'Government', industry: 'Treasury Bonds', geography: 'us', assetType: 'bond', duration: 2, creditRating: 'AAA' },
  'SHV': { sector: 'Government', industry: 'Treasury Bills', geography: 'us', assetType: 'bond', duration: 0.25, creditRating: 'AAA' },
  'IEI': { sector: 'Government', industry: 'Treasury Bonds', geography: 'us', assetType: 'bond', duration: 5, creditRating: 'AAA' },
  'GOVT': { sector: 'Government', industry: 'Treasury Bonds', geography: 'us', assetType: 'bond', duration: 8, creditRating: 'AAA' },
  'VGSH': { sector: 'Government', industry: 'Short-Term Treasury', geography: 'us', assetType: 'bond', duration: 2, creditRating: 'AAA' },
  'VGIT': { sector: 'Government', industry: 'Intermediate Treasury', geography: 'us', assetType: 'bond', duration: 5, creditRating: 'AAA' },
  'VGLT': { sector: 'Government', industry: 'Long-Term Treasury', geography: 'us', assetType: 'bond', duration: 20, creditRating: 'AAA' },
  
  // ===== BOND ETFs - AGGREGATE/TOTAL =====
  'AGG': { sector: 'Fixed Income', industry: 'Aggregate Bond', geography: 'us', assetType: 'bond', duration: 6, creditRating: 'A' },
  'BND': { sector: 'Fixed Income', industry: 'Total Bond Market', geography: 'us', assetType: 'bond', duration: 6, creditRating: 'A' },
  'SCHZ': { sector: 'Fixed Income', industry: 'Aggregate Bond', geography: 'us', assetType: 'bond', duration: 6, creditRating: 'A' },
  
  // ===== BOND ETFs - CORPORATE =====
  'LQD': { sector: 'Corporate', industry: 'Investment Grade Corporate', geography: 'us', assetType: 'bond', duration: 8, creditRating: 'BBB' },
  'VCIT': { sector: 'Corporate', industry: 'Intermediate Corporate', geography: 'us', assetType: 'bond', duration: 6, creditRating: 'A' },
  'VCSH': { sector: 'Corporate', industry: 'Short-Term Corporate', geography: 'us', assetType: 'bond', duration: 3, creditRating: 'A' },
  'VCLT': { sector: 'Corporate', industry: 'Long-Term Corporate', geography: 'us', assetType: 'bond', duration: 12, creditRating: 'BBB' },
  'HYG': { sector: 'Corporate', industry: 'High Yield Corporate', geography: 'us', assetType: 'bond', duration: 4, creditRating: 'BB' },
  'JNK': { sector: 'Corporate', industry: 'High Yield Corporate', geography: 'us', assetType: 'bond', duration: 4, creditRating: 'BB' },
  
  // ===== REAL ESTATE =====
  'VNQ': { sector: 'Real Estate', industry: 'REITs', geography: 'us', assetType: 'real_estate', underlyingIndex: 'MSCI US REIT' },
  'SCHH': { sector: 'Real Estate', industry: 'REITs', geography: 'us', assetType: 'real_estate', underlyingIndex: 'Dow Jones US REIT' },
  'IYR': { sector: 'Real Estate', industry: 'REITs', geography: 'us', assetType: 'real_estate', underlyingIndex: 'Real Estate' },
  'XLRE': { sector: 'Real Estate', industry: 'REITs', geography: 'us', assetType: 'real_estate', underlyingIndex: 'Real Estate' },
  
  // ===== COMMODITIES =====
  'GLD': { sector: 'Precious Metals', industry: 'Gold', geography: 'us', assetType: 'commodity' },
  'IAU': { sector: 'Precious Metals', industry: 'Gold', geography: 'us', assetType: 'commodity' },
  'SLV': { sector: 'Precious Metals', industry: 'Silver', geography: 'us', assetType: 'commodity' },
  'USO': { sector: 'Energy', industry: 'Oil', geography: 'us', assetType: 'commodity' },
  'DBC': { sector: 'Commodities', industry: 'Broad Commodities', geography: 'us', assetType: 'commodity' },
  'GSG': { sector: 'Commodities', industry: 'Broad Commodities', geography: 'us', assetType: 'commodity' },
  
  // ===== INTERNATIONAL EQUITY =====
  'EFA': { sector: 'Broad Market', industry: 'Developed Markets', marketCap: 'large', geography: 'international', assetType: 'equity' },
  'VEA': { sector: 'Broad Market', industry: 'Developed Markets', marketCap: 'large', geography: 'international', assetType: 'equity' },
  'IEFA': { sector: 'Broad Market', industry: 'Developed Markets', marketCap: 'large', geography: 'international', assetType: 'equity' },
  'EEM': { sector: 'Broad Market', industry: 'Emerging Markets', marketCap: 'large', geography: 'emerging', assetType: 'equity' },
  'VWO': { sector: 'Broad Market', industry: 'Emerging Markets', marketCap: 'large', geography: 'emerging', assetType: 'equity' },
  'IEMG': { sector: 'Broad Market', industry: 'Emerging Markets', marketCap: 'large', geography: 'emerging', assetType: 'equity' },
  'VXUS': { sector: 'Broad Market', industry: 'Total International', marketCap: 'large', geography: 'international', assetType: 'equity' },
  'IXUS': { sector: 'Broad Market', industry: 'Total International', marketCap: 'large', geography: 'international', assetType: 'equity' },
  
  // ===== MAJOR INDIVIDUAL STOCKS - TECHNOLOGY =====
  'AAPL': { sector: 'Technology', industry: 'Consumer Electronics', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'MSFT': { sector: 'Technology', industry: 'Software', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'GOOGL': { sector: 'Technology', industry: 'Internet Services', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'GOOG': { sector: 'Technology', industry: 'Internet Services', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'AMZN': { sector: 'Consumer Discretionary', industry: 'E-commerce', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'NVDA': { sector: 'Technology', industry: 'Semiconductors', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'META': { sector: 'Technology', industry: 'Social Media', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'TSLA': { sector: 'Consumer Discretionary', industry: 'Electric Vehicles', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'NFLX': { sector: 'Technology', industry: 'Streaming Media', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'AMD': { sector: 'Technology', industry: 'Semiconductors', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'INTC': { sector: 'Technology', industry: 'Semiconductors', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'CSCO': { sector: 'Technology', industry: 'Networking', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'ORCL': { sector: 'Technology', industry: 'Software', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'CRM': { sector: 'Technology', industry: 'Software', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'ADBE': { sector: 'Technology', industry: 'Software', marketCap: 'large', geography: 'us', assetType: 'equity' },
  
  // ===== MAJOR INDIVIDUAL STOCKS - FINANCIALS =====
  'JPM': { sector: 'Financials', industry: 'Banking', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'BAC': { sector: 'Financials', industry: 'Banking', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'WFC': { sector: 'Financials', industry: 'Banking', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'C': { sector: 'Financials', industry: 'Banking', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'GS': { sector: 'Financials', industry: 'Investment Banking', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'MS': { sector: 'Financials', industry: 'Investment Banking', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'V': { sector: 'Financials', industry: 'Payment Processing', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'MA': { sector: 'Financials', industry: 'Payment Processing', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'BRK.B': { sector: 'Financials', industry: 'Diversified Financials', marketCap: 'large', geography: 'us', assetType: 'equity' },
  
  // ===== MAJOR INDIVIDUAL STOCKS - HEALTHCARE =====
  'JNJ': { sector: 'Healthcare', industry: 'Pharmaceuticals', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'UNH': { sector: 'Healthcare', industry: 'Health Insurance', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'PFE': { sector: 'Healthcare', industry: 'Pharmaceuticals', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'ABBV': { sector: 'Healthcare', industry: 'Pharmaceuticals', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'TMO': { sector: 'Healthcare', industry: 'Medical Devices', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'LLY': { sector: 'Healthcare', industry: 'Pharmaceuticals', marketCap: 'large', geography: 'us', assetType: 'equity' },
  
  // ===== MAJOR INDIVIDUAL STOCKS - CONSUMER =====
  'WMT': { sector: 'Consumer Staples', industry: 'Retail', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'PG': { sector: 'Consumer Staples', industry: 'Personal Products', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'KO': { sector: 'Consumer Staples', industry: 'Beverages', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'PEP': { sector: 'Consumer Staples', industry: 'Beverages', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'COST': { sector: 'Consumer Staples', industry: 'Retail', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'HD': { sector: 'Consumer Discretionary', industry: 'Home Improvement', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'MCD': { sector: 'Consumer Discretionary', industry: 'Restaurants', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'NKE': { sector: 'Consumer Discretionary', industry: 'Apparel', marketCap: 'large', geography: 'us', assetType: 'equity' },
  
  // ===== MAJOR INDIVIDUAL STOCKS - INDUSTRIALS & ENERGY =====
  'BA': { sector: 'Industrials', industry: 'Aerospace', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'CAT': { sector: 'Industrials', industry: 'Heavy Equipment', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'UPS': { sector: 'Industrials', industry: 'Logistics', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'XOM': { sector: 'Energy', industry: 'Oil & Gas', marketCap: 'large', geography: 'us', assetType: 'equity' },
  'CVX': { sector: 'Energy', industry: 'Oil & Gas', marketCap: 'large', geography: 'us', assetType: 'equity' },
};

/**
 * TIER 2: Dynamic classification via Tiingo API
 */
async function fetchDynamicClassification(symbol: string): Promise<Partial<AssetMetadata> | null> {
  try {
    const metadata = await tiingoService.getMetadata(symbol);
    
    // Extract what we can from Tiingo metadata
    return {
      sector: inferSectorFromName(metadata.name || ''),
      industry: metadata.name || 'Unknown',
      // Tiingo doesn't provide all fields, so we'll need fallback
    };
  } catch (error) {
    console.warn(`Could not fetch dynamic classification for ${symbol}:`, error);
    return null;
  }
}

/**
 * TIER 3: Intelligent fallback based on patterns and heuristics
 */
function applyIntelligentFallback(symbol: string): Partial<AssetMetadata> {
  const upperSymbol = symbol.toUpperCase();
  
  // Bond ETF patterns
  if (upperSymbol.includes('TLT') || upperSymbol.includes('IEF') || upperSymbol.includes('SHY')) {
    return {
      assetType: 'bond',
      sector: 'Government',
      industry: 'Treasury Bonds',
      geography: 'us',
      duration: estimateDurationFromSymbol(upperSymbol),
      creditRating: 'AAA'
    };
  }
  
  if (upperSymbol.includes('LQD') || upperSymbol.includes('VCIT') || upperSymbol.includes('VCSH')) {
    return {
      assetType: 'bond',
      sector: 'Corporate',
      industry: 'Corporate Bonds',
      geography: 'us',
      duration: estimateDurationFromSymbol(upperSymbol),
      creditRating: 'A'
    };
  }
  
  if (upperSymbol.includes('HYG') || upperSymbol.includes('JNK')) {
    return {
      assetType: 'bond',
      sector: 'Corporate',
      industry: 'High Yield',
      geography: 'us',
      duration: 4,
      creditRating: 'BB'
    };
  }
  
  // Aggregate bond patterns
  if (upperSymbol.includes('AGG') || upperSymbol.includes('BND')) {
    return {
      assetType: 'bond',
      sector: 'Fixed Income',
      industry: 'Aggregate Bond',
      geography: 'us',
      duration: 6,
      creditRating: 'A'
    };
  }
  
  // REIT/Real Estate patterns
  if (upperSymbol.includes('VNQ') || upperSymbol.includes('REIT') || upperSymbol.includes('IYR')) {
    return {
      assetType: 'real_estate',
      sector: 'Real Estate',
      industry: 'REITs',
      geography: 'us'
    };
  }
  
  // Commodity patterns
  if (upperSymbol.includes('GLD') || upperSymbol.includes('GOLD') || upperSymbol.includes('IAU')) {
    return {
      assetType: 'commodity',
      sector: 'Precious Metals',
      industry: 'Gold',
      geography: 'us'
    };
  }
  
  if (upperSymbol.includes('SLV') || upperSymbol.includes('SILVER')) {
    return {
      assetType: 'commodity',
      sector: 'Precious Metals',
      industry: 'Silver',
      geography: 'us'
    };
  }
  
  if (upperSymbol.includes('USO') || upperSymbol.includes('OIL')) {
    return {
      assetType: 'commodity',
      sector: 'Energy',
      industry: 'Oil',
      geography: 'us'
    };
  }
  
  // International patterns
  if (upperSymbol.includes('EEM') || upperSymbol.includes('VWO') || upperSymbol.includes('IEMG')) {
    return {
      assetType: 'equity',
      sector: 'Broad Market',
      industry: 'Emerging Markets',
      marketCap: 'large',
      geography: 'emerging'
    };
  }
  
  if (upperSymbol.includes('EFA') || upperSymbol.includes('VEA') || upperSymbol.includes('VXUS')) {
    return {
      assetType: 'equity',
      sector: 'Broad Market',
      industry: 'International Equity',
      marketCap: 'large',
      geography: 'international'
    };
  }
  
  // Sector ETF patterns (XL_ prefix indicates sector SPDR)
  if (upperSymbol.startsWith('XL')) {
    return {
      assetType: 'equity',
      sector: inferSectorFromXLSymbol(upperSymbol),
      industry: 'Sector ETF',
      marketCap: 'large',
      geography: 'us'
    };
  }
  
  // Small cap patterns
  if (upperSymbol.includes('IWM') || upperSymbol.includes('VB') || upperSymbol.includes('SMALL')) {
    return {
      assetType: 'equity',
      sector: 'Broad Market',
      industry: 'Small Cap Equity',
      marketCap: 'small',
      geography: 'us'
    };
  }
  
  // Default: Assume US large cap equity
  return {
    assetType: 'equity',
    sector: 'Diversified',
    industry: 'Equity',
    marketCap: 'large',
    geography: 'us'
  };
}

/**
 * Helper: Estimate bond duration from symbol
 */
function estimateDurationFromSymbol(symbol: string): number {
  const upperSymbol = symbol.toUpperCase();
  
  // Short-term indicators
  if (upperSymbol.includes('SHY') || upperSymbol.includes('SHV') || upperSymbol.includes('SHORT')) {
    return 2;
  }
  
  // Intermediate-term indicators
  if (upperSymbol.includes('IEF') || upperSymbol.includes('IEI') || upperSymbol.includes('INTERMEDIATE')) {
    return 7;
  }
  
  // Long-term indicators
  if (upperSymbol.includes('TLT') || upperSymbol.includes('LONG')) {
    return 17;
  }
  
  // Default intermediate
  return 6;
}

/**
 * Helper: Infer sector from XL symbol
 */
function inferSectorFromXLSymbol(symbol: string): string {
  const sectorMap: Record<string, string> = {
    'XLK': 'Technology',
    'XLF': 'Financials',
    'XLE': 'Energy',
    'XLV': 'Healthcare',
    'XLI': 'Industrials',
    'XLP': 'Consumer Staples',
    'XLY': 'Consumer Discretionary',
    'XLU': 'Utilities',
    'XLB': 'Materials',
    'XLRE': 'Real Estate'
  };
  
  return sectorMap[symbol] || 'Diversified';
}

/**
 * Helper: Infer sector from asset name
 */
function inferSectorFromName(name: string): string {
  const lowerName = name.toLowerCase();
  
  if (lowerName.includes('tech') || lowerName.includes('software') || lowerName.includes('semiconductor')) {
    return 'Technology';
  }
  if (lowerName.includes('financ') || lowerName.includes('bank')) {
    return 'Financials';
  }
  if (lowerName.includes('health') || lowerName.includes('pharma') || lowerName.includes('medical')) {
    return 'Healthcare';
  }
  if (lowerName.includes('energy') || lowerName.includes('oil') || lowerName.includes('gas')) {
    return 'Energy';
  }
  if (lowerName.includes('consumer')) {
    return lowerName.includes('staples') ? 'Consumer Staples' : 'Consumer Discretionary';
  }
  if (lowerName.includes('industrial')) {
    return 'Industrials';
  }
  if (lowerName.includes('utility') || lowerName.includes('utilities')) {
    return 'Utilities';
  }
  if (lowerName.includes('material')) {
    return 'Materials';
  }
  if (lowerName.includes('real estate') || lowerName.includes('reit')) {
    return 'Real Estate';
  }
  
  return 'Diversified';
}

/**
 * Main classification function using hybrid approach
 */
export async function classifyAsset(symbol: string): Promise<AssetMetadata> {
  // Check cache first
  if (classificationCache.has(symbol)) {
    return classificationCache.get(symbol)!;
  }
  
  let classification: Partial<AssetMetadata>;
  let source: 'hardcoded' | 'api' | 'fallback';
  
  // Tier 1: Check hardcoded database
  if (HARDCODED_CLASSIFICATIONS[symbol.toUpperCase()]) {
    classification = HARDCODED_CLASSIFICATIONS[symbol.toUpperCase()];
    source = 'hardcoded';
  } else {
    // Tier 2: Try dynamic API lookup
    const dynamicClassification = await fetchDynamicClassification(symbol);
    
    if (dynamicClassification) {
      // Merge with fallback for missing fields
      const fallback = applyIntelligentFallback(symbol);
      classification = { ...fallback, ...dynamicClassification };
      source = 'api';
    } else {
      // Tier 3: Use intelligent fallback
      classification = applyIntelligentFallback(symbol);
      source = 'fallback';
    }
  }
  
  // Ensure all required fields are present
  const fullClassification: AssetMetadata = {
    symbol: symbol.toUpperCase(),
    sector: classification.sector || 'Diversified',
    industry: classification.industry || 'Unknown',
    marketCap: classification.marketCap || 'large',
    geography: classification.geography || 'us',
    assetType: classification.assetType || 'equity',
    duration: classification.duration,
    creditRating: classification.creditRating,
    underlyingIndex: classification.underlyingIndex,
    classificationSource: source
  };
  
  // Cache the result
  classificationCache.set(symbol, fullClassification);
  
  return fullClassification;
}

/**
 * Batch classification for multiple assets
 */
export async function classifyAssets(symbols: string[]): Promise<Map<string, AssetMetadata>> {
  const results = new Map<string, AssetMetadata>();
  
  // Process in parallel
  const classifications = await Promise.all(
    symbols.map(symbol => classifyAsset(symbol))
  );
  
  classifications.forEach((classification, index) => {
    results.set(symbols[index], classification);
  });
  
  return results;
}

/**
 * Get classification statistics for a portfolio
 */
export function getClassificationStats(classifications: AssetMetadata[]): {
  hardcodedCount: number;
  apiCount: number;
  fallbackCount: number;
  coveragePercent: number;
} {
  const hardcodedCount = classifications.filter(c => c.classificationSource === 'hardcoded').length;
  const apiCount = classifications.filter(c => c.classificationSource === 'api').length;
  const fallbackCount = classifications.filter(c => c.classificationSource === 'fallback').length;
  const total = classifications.length;
  
  // Coverage = hardcoded + api (high quality sources)
  const coveragePercent = total > 0 ? ((hardcodedCount + apiCount) / total) * 100 : 0;
  
  return {
    hardcodedCount,
    apiCount,
    fallbackCount,
    coveragePercent: Math.round(coveragePercent * 10) / 10
  };
}

/**
 * Clear classification cache (useful for testing or force refresh)
 */
export function clearClassificationCache(): void {
  classificationCache.clear();
}

export default {
  classifyAsset,
  classifyAssets,
  getClassificationStats,
  clearClassificationCache
};

