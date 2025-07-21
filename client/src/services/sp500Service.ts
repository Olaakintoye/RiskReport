import axios from 'axios';

export interface SP500Company {
  symbol: string;
  name: string;
  sector: string;
  subSector: string;
  headQuarter: string;
  founded: string;
}

// Set to false to use mock data instead of actual API calls
const USE_REAL_API = false;
const API_KEY = 'demo'; // Replace with your actual API key for production
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

/**
 * Get all S&P 500 companies
 */
export const getSP500Companies = async (): Promise<SP500Company[]> => {
  // If not using real API, return mock data immediately
  if (!USE_REAL_API) {
    console.log('Using mock S&P 500 company data');
    return getMockSP500Companies();
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/sp500_constituent`, {
      params: {
        apikey: API_KEY
      }
    });
    
    // If API fails or rate limit hit, return mock data
    if (!response.data || response.data.length === 0) {
      console.log('API returned empty data, using mock data');
      return getMockSP500Companies();
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching S&P 500 companies:', error);
    return getMockSP500Companies();
  }
};

/**
 * Get S&P 500 companies by sector
 */
export const getSP500CompaniesBySector = async (sector: string): Promise<SP500Company[]> => {
  const companies = await getSP500Companies();
  return companies.filter(company => company.sector === sector);
};

/**
 * Get unique sectors in the S&P 500
 */
export const getSP500Sectors = async (): Promise<string[]> => {
  const companies = await getSP500Companies();
  const sectors = new Set(companies.map(company => company.sector));
  return Array.from(sectors).sort();
};

/**
 * Get company details including current price and financial metrics
 */
export const getCompanyDetails = async (symbol: string): Promise<any> => {
  // If not using real API, return mock data immediately
  if (!USE_REAL_API) {
    console.log(`Using mock data for ${symbol} details`);
    return getMockCompanyDetails(symbol);
  }
  
  try {
    // Get company profile
    const profileResponse = await axios.get(`${BASE_URL}/profile/${symbol}`, {
      params: {
        apikey: API_KEY
      }
    });
    
    // Get company quote
    const quoteResponse = await axios.get(`${BASE_URL}/quote/${symbol}`, {
      params: {
        apikey: API_KEY
      }
    });
    
    // Get key metrics
    const metricsResponse = await axios.get(`${BASE_URL}/key-metrics-ttm/${symbol}`, {
      params: {
        apikey: API_KEY
      }
    });
    
    // If API fails or rate limit hit, return mock data
    if (!profileResponse.data || profileResponse.data.length === 0) {
      console.log(`API returned empty data for ${symbol}, using mock data`);
      return getMockCompanyDetails(symbol);
    }
    
    // Combine data
    return {
      profile: profileResponse.data[0],
      quote: quoteResponse.data[0],
      metrics: metricsResponse.data[0]
    };
  } catch (error) {
    console.error(`Error fetching details for ${symbol}:`, error);
    return getMockCompanyDetails(symbol);
  }
};

/**
 * Get historical prices for a company
 */
export const getHistoricalPrices = async (symbol: string, days: number = 30): Promise<any[]> => {
  // If not using real API, return mock data immediately
  if (!USE_REAL_API) {
    console.log(`Using mock price history for ${symbol}`);
    return getMockHistoricalPrices(symbol, days);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/historical-price-full/${symbol}`, {
      params: {
        timeseries: days,
        apikey: API_KEY
      }
    });
    
    // If API fails or rate limit hit, return mock data
    if (!response.data || !response.data.historical) {
      console.log(`API returned empty price history for ${symbol}, using mock data`);
      return getMockHistoricalPrices(symbol, days);
    }
    
    return response.data.historical;
  } catch (error) {
    console.error(`Error fetching historical prices for ${symbol}:`, error);
    return getMockHistoricalPrices(symbol, days);
  }
};

// Mock Data Generators

/**
 * Generate mock S&P 500 companies when API fails
 */
const getMockSP500Companies = (): SP500Company[] => {
  return [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sector: 'Information Technology',
      subSector: 'Technology Hardware, Storage & Peripherals',
      headQuarter: 'Cupertino, California',
      founded: '1976'
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      sector: 'Information Technology',
      subSector: 'Systems Software',
      headQuarter: 'Redmond, Washington',
      founded: '1975'
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      sector: 'Consumer Discretionary',
      subSector: 'Internet & Direct Marketing Retail',
      headQuarter: 'Seattle, Washington',
      founded: '1994'
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc. (Google) Class A',
      sector: 'Communication Services',
      subSector: 'Interactive Media & Services',
      headQuarter: 'Mountain View, California',
      founded: '1998'
    },
    {
      symbol: 'META',
      name: 'Meta Platforms Inc.',
      sector: 'Communication Services',
      subSector: 'Interactive Media & Services',
      headQuarter: 'Menlo Park, California',
      founded: '2004'
    },
    {
      symbol: 'TSLA',
      name: 'Tesla, Inc.',
      sector: 'Consumer Discretionary',
      subSector: 'Automobile Manufacturers',
      headQuarter: 'Palo Alto, California',
      founded: '2003'
    },
    {
      symbol: 'BRK.B',
      name: 'Berkshire Hathaway Inc. Class B',
      sector: 'Financials',
      subSector: 'Multi-Sector Holdings',
      headQuarter: 'Omaha, Nebraska',
      founded: '1839'
    },
    {
      symbol: 'JPM',
      name: 'JPMorgan Chase & Co.',
      sector: 'Financials',
      subSector: 'Diversified Banks',
      headQuarter: 'New York, New York',
      founded: '1799'
    },
    {
      symbol: 'V',
      name: 'Visa Inc.',
      sector: 'Financials',
      subSector: 'Data Processing & Outsourced Services',
      headQuarter: 'San Francisco, California',
      founded: '1958'
    },
    {
      symbol: 'PG',
      name: 'Procter & Gamble Co.',
      sector: 'Consumer Staples',
      subSector: 'Personal Products',
      headQuarter: 'Cincinnati, Ohio',
      founded: '1837'
    },
    {
      symbol: 'JNJ',
      name: 'Johnson & Johnson',
      sector: 'Health Care',
      subSector: 'Pharmaceuticals',
      headQuarter: 'New Brunswick, New Jersey',
      founded: '1886'
    },
    {
      symbol: 'UNH',
      name: 'UnitedHealth Group',
      sector: 'Health Care',
      subSector: 'Managed Health Care',
      headQuarter: 'Minnetonka, Minnesota',
      founded: '1977'
    },
    {
      symbol: 'HD',
      name: 'Home Depot Inc.',
      sector: 'Consumer Discretionary',
      subSector: 'Home Improvement Retail',
      headQuarter: 'Atlanta, Georgia',
      founded: '1978'
    },
    {
      symbol: 'XOM',
      name: 'Exxon Mobil Corporation',
      sector: 'Energy',
      subSector: 'Integrated Oil & Gas',
      headQuarter: 'Irving, Texas',
      founded: '1870'
    },
    {
      symbol: 'CVX',
      name: 'Chevron Corporation',
      sector: 'Energy',
      subSector: 'Integrated Oil & Gas',
      headQuarter: 'San Ramon, California',
      founded: '1879'
    },
    {
      symbol: 'MA',
      name: 'Mastercard Incorporated',
      sector: 'Financials',
      subSector: 'Transaction & Payment Processing Services',
      headQuarter: 'Purchase, New York',
      founded: '1966'
    },
    {
      symbol: 'BAC',
      name: 'Bank of America Corporation',
      sector: 'Financials',
      subSector: 'Diversified Banks',
      headQuarter: 'Charlotte, North Carolina',
      founded: '1904'
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      sector: 'Information Technology',
      subSector: 'Semiconductors',
      headQuarter: 'Santa Clara, California',
      founded: '1993'
    },
    {
      symbol: 'SPG',
      name: 'Simon Property Group',
      sector: 'Real Estate',
      subSector: 'Retail REITs',
      headQuarter: 'Indianapolis, Indiana',
      founded: '1993'
    },
    {
      symbol: 'DIS',
      name: 'The Walt Disney Company',
      sector: 'Communication Services',
      subSector: 'Movies & Entertainment',
      headQuarter: 'Burbank, California',
      founded: '1923'
    }
  ];
};

/**
 * Generate mock company details when API fails
 */
const getMockCompanyDetails = (symbol: string): any => {
  const mockCompany = getMockSP500Companies().find(company => company.symbol === symbol);
  if (!mockCompany) {
    return null;
  }

  // Generate realistic mock price and financial data
  const basePrice = symbol.length * 10 + Math.random() * 100;
  const marketCap = basePrice * (10000000 + Math.random() * 900000000);
  
  return {
    profile: {
      symbol: mockCompany.symbol,
      price: basePrice,
      beta: 1 + (Math.random() - 0.5),
      volAvg: Math.floor(1000000 + Math.random() * 10000000),
      mktCap: marketCap,
      lastDiv: mockCompany.sector === 'Technology' ? 0.5 + Math.random() : 1 + Math.random() * 3,
      range: `${(basePrice * 0.8).toFixed(2)}-${(basePrice * 1.2).toFixed(2)}`,
      changes: (Math.random() * 10) - 5,
      companyName: mockCompany.name,
      industry: mockCompany.subSector,
      sector: mockCompany.sector,
      country: 'US',
      isEtf: false,
      isActivelyTrading: true,
      description: `${mockCompany.name} is a leading company in the ${mockCompany.sector} sector, specializing in ${mockCompany.subSector}. Founded in ${mockCompany.founded}, it is headquartered in ${mockCompany.headQuarter}.`
    },
    quote: {
      symbol: mockCompany.symbol,
      name: mockCompany.name,
      price: basePrice,
      changesPercentage: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
      change: parseFloat(((Math.random() * 10) - 5).toFixed(2)),
      dayLow: parseFloat((basePrice * 0.95).toFixed(2)),
      dayHigh: parseFloat((basePrice * 1.05).toFixed(2)),
      yearHigh: parseFloat((basePrice * 1.3).toFixed(2)),
      yearLow: parseFloat((basePrice * 0.7).toFixed(2)),
      marketCap: marketCap,
      priceAvg50: parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.1)).toFixed(2)),
      priceAvg200: parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.2)).toFixed(2)),
      volume: Math.floor(1000000 + Math.random() * 5000000),
      avgVolume: Math.floor(1000000 + Math.random() * 5000000),
      exchange: 'NYSE',
      open: parseFloat((basePrice * 0.99).toFixed(2)),
      previousClose: parseFloat((basePrice * 1.01).toFixed(2)),
      eps: parseFloat((basePrice * 0.05).toFixed(2)),
      pe: parseFloat((15 + Math.random() * 15).toFixed(2)),
      sharesOutstanding: Math.floor(1000000000 + Math.random() * 9000000000)
    },
    metrics: {
      peRatioTTM: parseFloat((15 + Math.random() * 15).toFixed(2)),
      priceFairValueTTM: parseFloat((0.8 + Math.random() * 0.4).toFixed(2)),
      dividendYieldTTM: parseFloat((Math.random() * 3).toFixed(2)),
      dividendYieldPercentageTTM: parseFloat((Math.random() * 3).toFixed(2)),
      bookValuePerShareTTM: parseFloat((basePrice * 0.3).toFixed(2)),
      roeTTM: parseFloat((Math.random() * 30).toFixed(2)),
      roaTTM: parseFloat((Math.random() * 15).toFixed(2)),
      debtToEquityTTM: parseFloat((Math.random() * 2).toFixed(2)),
      freeCashFlowYieldTTM: parseFloat((Math.random() * 5).toFixed(2)),
      dividendPaidAndCapexCoverageRatioTTM: parseFloat((1 + Math.random() * 3).toFixed(2)),
      priceToBookRatioTTM: parseFloat((2 + Math.random() * 4).toFixed(2)),
      enterpriseValueMultipleTTM: parseFloat((5 + Math.random() * 10).toFixed(2))
    }
  };
};

/**
 * Generate mock historical prices when API fails
 */
const getMockHistoricalPrices = (symbol: string, days: number): any[] => {
  const result: any[] = [];
  const mockCompany = getMockSP500Companies().find(company => company.symbol === symbol);
  if (!mockCompany) {
    return result;
  }

  // Create a base price with some randomness
  const basePrice = symbol.length * 10 + Math.random() * 100;
  
  // Generate price data for each day
  const today = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Add some price movement patterns
    const trend = Math.sin(i / 10) * 10; // Cyclical component
    const random = (Math.random() - 0.5) * 5; // Random component
    const priceFactor = 1 + ((trend + random) / 100);
    
    const dayPrice = basePrice * priceFactor;
    
    // Create a realistic day's price action
    const open = dayPrice * (1 + (Math.random() - 0.5) * 0.01);
    const close = dayPrice * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    
    result.push({
      date: date.toISOString().split('T')[0],
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume: Math.floor(1000000 + Math.random() * 5000000)
    });
  }
  
  return result;
};

export default {
  getSP500Companies,
  getSP500CompaniesBySector,
  getSP500Sectors,
  getCompanyDetails,
  getHistoricalPrices
}; 