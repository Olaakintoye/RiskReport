import axios from 'axios';
import tiingoService from './tiingoService';

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
 * Generate company information for S&P 500 tickers that don't have detailed mock data
 */
const generateCompanyInfo = (ticker: string): SP500Company => {
  // Basic sector mapping for common tickers
  const basicSectorMapping: { [key: string]: { sector: string; subSector: string } } = {
    // Tech companies
    'ORCL': { sector: 'Information Technology', subSector: 'Systems Software' },
    'CRM': { sector: 'Information Technology', subSector: 'Application Software' },
    'INTC': { sector: 'Information Technology', subSector: 'Semiconductors' },
    'CSCO': { sector: 'Information Technology', subSector: 'Communications Equipment' },
    'QCOM': { sector: 'Information Technology', subSector: 'Semiconductors' },
    'TXN': { sector: 'Information Technology', subSector: 'Semiconductors' },
    'INTU': { sector: 'Information Technology', subSector: 'Application Software' },
    'NOW': { sector: 'Information Technology', subSector: 'Application Software' },
    'PANW': { sector: 'Information Technology', subSector: 'Systems Software' },
    'SNPS': { sector: 'Information Technology', subSector: 'Application Software' },
    'CDNS': { sector: 'Information Technology', subSector: 'Application Software' },
    'FTNT': { sector: 'Information Technology', subSector: 'Systems Software' },
    
    // Financial services
    'BLK': { sector: 'Financials', subSector: 'Asset Management & Custody Banks' },
    'SCHW': { sector: 'Financials', subSector: 'Investment Banking & Brokerage' },
    'SPGI': { sector: 'Financials', subSector: 'Financial Exchanges & Data' },
    'CME': { sector: 'Financials', subSector: 'Financial Exchanges & Data' },
    'ICE': { sector: 'Financials', subSector: 'Financial Exchanges & Data' },
    'MCO': { sector: 'Financials', subSector: 'Financial Exchanges & Data' },
    'PYPL': { sector: 'Financials', subSector: 'Data Processing & Outsourced Services' },
    'FI': { sector: 'Information Technology', subSector: 'Data Processing & Outsourced Services' },
    
    // Healthcare & biotech
    'REGN': { sector: 'Health Care', subSector: 'Biotechnology' },
    'VRTX': { sector: 'Health Care', subSector: 'Biotechnology' },
    'ISRG': { sector: 'Health Care', subSector: 'Health Care Equipment' },
    'BSX': { sector: 'Health Care', subSector: 'Health Care Equipment' },
    'SYK': { sector: 'Health Care', subSector: 'Health Care Equipment' },
    'ZTS': { sector: 'Health Care', subSector: 'Pharmaceuticals' },
    'CVS': { sector: 'Health Care', subSector: 'Health Care Providers & Services' },
    'CI': { sector: 'Health Care', subSector: 'Managed Health Care' },
    'HUM': { sector: 'Health Care', subSector: 'Managed Health Care' },
    'DXCM': { sector: 'Health Care', subSector: 'Health Care Equipment' },
    
    // Consumer discretionary
    'TSLA': { sector: 'Consumer Discretionary', subSector: 'Automobile Manufacturers' },
    'ABNB': { sector: 'Consumer Discretionary', subSector: 'Hotels, Resorts & Cruise Lines' },
    'UBER': { sector: 'Communication Services', subSector: 'Interactive Media & Services' },
    'DASH': { sector: 'Consumer Discretionary', subSector: 'Restaurants' },
    'RCL': { sector: 'Consumer Discretionary', subSector: 'Hotels, Resorts & Cruise Lines' },
    'CCL': { sector: 'Consumer Discretionary', subSector: 'Hotels, Resorts & Cruise Lines' },
    'NCLH': { sector: 'Consumer Discretionary', subSector: 'Hotels, Resorts & Cruise Lines' },
    'MAR': { sector: 'Consumer Discretionary', subSector: 'Hotels, Resorts & Cruise Lines' },
    'HLT': { sector: 'Consumer Discretionary', subSector: 'Hotels, Resorts & Cruise Lines' },
    
    // Communication Services
    'NFLX': { sector: 'Communication Services', subSector: 'Movies & Entertainment' },
    'CHTR': { sector: 'Communication Services', subSector: 'Cable & Satellite' },
    'CMCSA': { sector: 'Communication Services', subSector: 'Cable & Satellite' },
    'PARA': { sector: 'Communication Services', subSector: 'Movies & Entertainment' },
    'WBD': { sector: 'Communication Services', subSector: 'Movies & Entertainment' },
    'MTCH': { sector: 'Communication Services', subSector: 'Interactive Media & Services' },
    
    // Energy
    'COP': { sector: 'Energy', subSector: 'Oil & Gas Exploration & Production' },
    'EOG': { sector: 'Energy', subSector: 'Oil & Gas Exploration & Production' },
    'PXD': { sector: 'Energy', subSector: 'Oil & Gas Exploration & Production' },
    'SLB': { sector: 'Energy', subSector: 'Oil & Gas Equipment & Services' },
    'HAL': { sector: 'Energy', subSector: 'Oil & Gas Equipment & Services' },
    'BKR': { sector: 'Energy', subSector: 'Oil & Gas Equipment & Services' },
    'MPC': { sector: 'Energy', subSector: 'Oil & Gas Refining & Marketing' },
    'PSX': { sector: 'Energy', subSector: 'Oil & Gas Refining & Marketing' },
    'VLO': { sector: 'Energy', subSector: 'Oil & Gas Refining & Marketing' },
    'KMI': { sector: 'Energy', subSector: 'Oil & Gas Storage & Transportation' }
  };
  
  const mappingInfo = basicSectorMapping[ticker];
  if (mappingInfo) {
    return {
      symbol: ticker,
      name: `${ticker} Corporation`,
      sector: mappingInfo.sector,
      subSector: mappingInfo.subSector,
      headQuarter: 'United States',
      founded: '1900'
    };
  }
  
  // Default fallback
  return {
    symbol: ticker,
    name: `${ticker} Corporation`,
    sector: 'Information Technology',
    subSector: 'Application Software',
    headQuarter: 'United States',
    founded: '1900'
  };
};

/**
 * Get all S&P 500 companies (combines detailed mock data with generated data for all 503 tickers)
 */
export const getSP500Companies = async (): Promise<SP500Company[]> => {
  try {
    // Get all S&P 500 tickers from tiingo service
    const allTickers = await tiingoService.getSP500Constituents();
    
    // Get detailed mock data
    const detailedCompanies = getMockSP500Companies();
    const detailedSymbols = new Set(detailedCompanies.map(c => c.symbol));
    
    // Generate data for remaining tickers
    const remainingTickers = allTickers.filter(ticker => !detailedSymbols.has(ticker));
    const generatedCompanies = remainingTickers.map(generateCompanyInfo);
    
    // Combine detailed and generated data
    const allCompanies = [...detailedCompanies, ...generatedCompanies];
    
    console.log(`Loaded ${allCompanies.length} S&P 500 companies (${detailedCompanies.length} detailed, ${generatedCompanies.length} generated)`);
    
    return allCompanies;
  } catch (error) {
    console.error('Error loading S&P 500 companies:', error);
    // Fallback to just detailed mock data
    return getMockSP500Companies();
  }
};

/**
 * Get all S&P 500 companies (legacy API mode - kept for backward compatibility)
 */
export const getSP500CompaniesLegacy = async (): Promise<SP500Company[]> => {
  // If not using real API, return comprehensive mock data
  if (!USE_REAL_API) {
    console.log('Using comprehensive S&P 500 company data');
    return getSP500Companies();
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
    },
    {
      symbol: 'ABBV',
      name: 'AbbVie Inc.',
      sector: 'Health Care',
      subSector: 'Biotechnology',
      headQuarter: 'North Chicago, Illinois',
      founded: '2013'
    },
    {
      symbol: 'ABT',
      name: 'Abbott Laboratories',
      sector: 'Health Care',
      subSector: 'Health Care Equipment',
      headQuarter: 'North Chicago, Illinois',
      founded: '1888'
    },
    {
      symbol: 'ACN',
      name: 'Accenture plc',
      sector: 'Information Technology',
      subSector: 'IT Consulting & Other Services',
      headQuarter: 'Dublin, Ireland',
      founded: '1989'
    },
    {
      symbol: 'ADBE',
      name: 'Adobe Inc.',
      sector: 'Information Technology',
      subSector: 'Application Software',
      headQuarter: 'San Jose, California',
      founded: '1982'
    },
    {
      symbol: 'AMD',
      name: 'Advanced Micro Devices Inc.',
      sector: 'Information Technology',
      subSector: 'Semiconductors',
      headQuarter: 'Santa Clara, California',
      founded: '1969'
    },
    {
      symbol: 'AES',
      name: 'AES Corporation',
      sector: 'Utilities',
      subSector: 'Independent Power Producers & Energy Traders',
      headQuarter: 'Arlington, Virginia',
      founded: '1981'
    },
    {
      symbol: 'AFL',
      name: 'Aflac Incorporated',
      sector: 'Financials',
      subSector: 'Life & Health Insurance',
      headQuarter: 'Columbus, Georgia',
      founded: '1955'
    },
    {
      symbol: 'APD',
      name: 'Air Products and Chemicals Inc.',
      sector: 'Materials',
      subSector: 'Industrial Gases',
      headQuarter: 'Allentown, Pennsylvania',
      founded: '1940'
    },
    {
      symbol: 'ABNB',
      name: 'Airbnb Inc.',
      sector: 'Consumer Discretionary',
      subSector: 'Hotels, Resorts & Cruise Lines',
      headQuarter: 'San Francisco, California',
      founded: '2008'
    },
    {
      symbol: 'AKAM',
      name: 'Akamai Technologies Inc.',
      sector: 'Information Technology',
      subSector: 'Internet Services & Infrastructure',
      headQuarter: 'Cambridge, Massachusetts',
      founded: '1998'
    },
    {
      symbol: 'ALB',
      name: 'Albemarle Corporation',
      sector: 'Materials',
      subSector: 'Specialty Chemicals',
      headQuarter: 'Charlotte, North Carolina',
      founded: '1994'
    },
    {
      symbol: 'ARE',
      name: 'Alexandria Real Estate Equities Inc.',
      sector: 'Real Estate',
      subSector: 'Office REITs',
      headQuarter: 'Pasadena, California',
      founded: '1994'
    },
    {
      symbol: 'ALGN',
      name: 'Align Technology Inc.',
      sector: 'Health Care',
      subSector: 'Health Care Supplies',
      headQuarter: 'Tempe, Arizona',
      founded: '1997'
    },
    {
      symbol: 'ALLE',
      name: 'Allegion plc',
      sector: 'Industrials',
      subSector: 'Building Products',
      headQuarter: 'Dublin, Ireland',
      founded: '1908'
    },
    {
      symbol: 'LNT',
      name: 'Alliant Energy Corporation',
      sector: 'Utilities',
      subSector: 'Electric Utilities',
      headQuarter: 'Madison, Wisconsin',
      founded: '1917'
    },
    {
      symbol: 'ALL',
      name: 'The Allstate Corporation',
      sector: 'Financials',
      subSector: 'Property & Casualty Insurance',
      headQuarter: 'Northbrook, Illinois',
      founded: '1931'
    },
    {
      symbol: 'GOOG',
      name: 'Alphabet Inc. Class C',
      sector: 'Communication Services',
      subSector: 'Interactive Media & Services',
      headQuarter: 'Mountain View, California',
      founded: '1998'
    },
    {
      symbol: 'MO',
      name: 'Altria Group Inc.',
      sector: 'Consumer Staples',
      subSector: 'Tobacco',
      headQuarter: 'Richmond, Virginia',
      founded: '1985'
    },
    {
      symbol: 'AMCR',
      name: 'Amcor plc',
      sector: 'Materials',
      subSector: 'Paper & Plastic Packaging Products & Materials',
      headQuarter: 'Bristol, United Kingdom',
      founded: '1860'
    },
    {
      symbol: 'AEE',
      name: 'Ameren Corporation',
      sector: 'Utilities',
      subSector: 'Multi-Utilities',
      headQuarter: 'St. Louis, Missouri',
      founded: '1902'
    },
    {
      symbol: 'AEP',
      name: 'American Electric Power Company Inc.',
      sector: 'Utilities',
      subSector: 'Electric Utilities',
      headQuarter: 'Columbus, Ohio',
      founded: '1906'
    },
    {
      symbol: 'AXP',
      name: 'American Express Company',
      sector: 'Financials',
      subSector: 'Consumer Finance',
      headQuarter: 'New York, New York',
      founded: '1850'
    },
    {
      symbol: 'AIG',
      name: 'American International Group Inc.',
      sector: 'Financials',
      subSector: 'Multi-line Insurance',
      headQuarter: 'New York, New York',
      founded: '1919'
    },
    {
      symbol: 'AMT',
      name: 'American Tower Corporation',
      sector: 'Real Estate',
      subSector: 'Telecom Tower REITs',
      headQuarter: 'Boston, Massachusetts',
      founded: '1995'
    },
    {
      symbol: 'AWK',
      name: 'American Water Works Company Inc.',
      sector: 'Utilities',
      subSector: 'Water Utilities',
      headQuarter: 'Camden, New Jersey',
      founded: '1886'
    },
    {
      symbol: 'AMP',
      name: 'Ameriprise Financial Inc.',
      sector: 'Financials',
      subSector: 'Asset Management & Custody Banks',
      headQuarter: 'Minneapolis, Minnesota',
      founded: '1894'
    },
    {
      symbol: 'AMGN',
      name: 'Amgen Inc.',
      sector: 'Health Care',
      subSector: 'Biotechnology',
      headQuarter: 'Thousand Oaks, California',
      founded: '1980'
    },
    {
      symbol: 'APH',
      name: 'Amphenol Corporation',
      sector: 'Information Technology',
      subSector: 'Electronic Components',
      headQuarter: 'Wallingford, Connecticut',
      founded: '1932'
    },
    {
      symbol: 'ADI',
      name: 'Analog Devices Inc.',
      sector: 'Information Technology',
      subSector: 'Semiconductors',
      headQuarter: 'Wilmington, Massachusetts',
      founded: '1965'
    },
    {
      symbol: 'ANSS',
      name: 'ANSYS Inc.',
      sector: 'Information Technology',
      subSector: 'Application Software',
      headQuarter: 'Canonsburg, Pennsylvania',
      founded: '1970'
    },
    {
      symbol: 'AON',
      name: 'Aon plc',
      sector: 'Financials',
      subSector: 'Insurance Brokers',
      headQuarter: 'Dublin, Ireland',
      founded: '1919'
    },
    {
      symbol: 'AOS',
      name: 'A. O. Smith Corporation',
      sector: 'Industrials',
      subSector: 'Building Products',
      headQuarter: 'Milwaukee, Wisconsin',
      founded: '1916'
    },
    {
      symbol: 'APA',
      name: 'APA Corporation',
      sector: 'Energy',
      subSector: 'Oil & Gas Exploration & Production',
      headQuarter: 'Houston, Texas',
      founded: '1954'
    },
    {
      symbol: 'AMAT',
      name: 'Applied Materials Inc.',
      sector: 'Information Technology',
      subSector: 'Semiconductor Equipment',
      headQuarter: 'Santa Clara, California',
      founded: '1967'
    },
    {
      symbol: 'APTV',
      name: 'Aptiv PLC',
      sector: 'Consumer Discretionary',
      subSector: 'Automotive Parts & Equipment',
      headQuarter: 'Dublin, Ireland',
      founded: '2017'
    },
    {
      symbol: 'ANET',
      name: 'Arista Networks Inc.',
      sector: 'Information Technology',
      subSector: 'Communications Equipment',
      headQuarter: 'Santa Clara, California',
      founded: '2004'
    },
    {
      symbol: 'ATO',
      name: 'Atmos Energy Corporation',
      sector: 'Utilities',
      subSector: 'Gas Utilities',
      headQuarter: 'Dallas, Texas',
      founded: '1906'
    },
    {
      symbol: 'T',
      name: 'AT&T Inc.',
      sector: 'Communication Services',
      subSector: 'Integrated Telecommunication Services',
      headQuarter: 'Dallas, Texas',
      founded: '1983'
    },
    {
      symbol: 'ADSK',
      name: 'Autodesk Inc.',
      sector: 'Information Technology',
      subSector: 'Application Software',
      headQuarter: 'San Rafael, California',
      founded: '1982'
    },
    {
      symbol: 'ADP',
      name: 'Automatic Data Processing Inc.',
      sector: 'Information Technology',
      subSector: 'Data Processing & Outsourced Services',
      headQuarter: 'Roseland, New Jersey',
      founded: '1949'
    },
    {
      symbol: 'AVB',
      name: 'AvalonBay Communities Inc.',
      sector: 'Real Estate',
      subSector: 'Residential REITs',
      headQuarter: 'Arlington, Virginia',
      founded: '1978'
    },
    {
      symbol: 'AVY',
      name: 'Avery Dennison Corporation',
      sector: 'Materials',
      subSector: 'Paper Packaging',
      headQuarter: 'Glendale, California',
      founded: '1935'
    },
    {
      symbol: 'AVGO',
      name: 'Broadcom Inc.',
      sector: 'Information Technology',
      subSector: 'Semiconductors',
      headQuarter: 'San Jose, California',
      founded: '1991'
    },
    {
      symbol: 'AXON',
      name: 'Axon Enterprise Inc.',
      sector: 'Industrials',
      subSector: 'Aerospace & Defense',
      headQuarter: 'Scottsdale, Arizona',
      founded: '1993'
    },
    {
      symbol: 'AZO',
      name: 'AutoZone Inc.',
      sector: 'Consumer Discretionary',
      subSector: 'Specialty Retail',
      headQuarter: 'Memphis, Tennessee',
      founded: '1979'
    },
    {
      symbol: 'BA',
      name: 'The Boeing Company',
      sector: 'Industrials',
      subSector: 'Aerospace & Defense',
      headQuarter: 'Chicago, Illinois',
      founded: '1916'
    },
    {
      symbol: 'BAX',
      name: 'Baxter International Inc.',
      sector: 'Health Care',
      subSector: 'Health Care Equipment',
      headQuarter: 'Deerfield, Illinois',
      founded: '1931'
    },
    {
      symbol: 'BDX',
      name: 'Becton Dickinson and Company',
      sector: 'Health Care',
      subSector: 'Health Care Equipment',
      headQuarter: 'Franklin Lakes, New Jersey',
      founded: '1897'
    },
    {
      symbol: 'BBY',
      name: 'Best Buy Co. Inc.',
      sector: 'Consumer Discretionary',
      subSector: 'Computer & Electronics Retail',
      headQuarter: 'Richfield, Minnesota',
      founded: '1966'
    },
    {
      symbol: 'BIO',
      name: 'Bio-Rad Laboratories Inc.',
      sector: 'Health Care',
      subSector: 'Life Sciences Tools & Services',
      headQuarter: 'Hercules, California',
      founded: '1952'
    },
    {
      symbol: 'BIIB',
      name: 'Biogen Inc.',
      sector: 'Health Care',
      subSector: 'Biotechnology',
      headQuarter: 'Cambridge, Massachusetts',
      founded: '1978'
    },
    {
      symbol: 'BLK',
      name: 'BlackRock Inc.',
      sector: 'Financials',
      subSector: 'Asset Management & Custody Banks',
      headQuarter: 'New York, New York',
      founded: '1988'
    },
    {
      symbol: 'BK',
      name: 'The Bank of New York Mellon Corporation',
      sector: 'Financials',
      subSector: 'Asset Management & Custody Banks',
      headQuarter: 'New York, New York',
      founded: '1784'
    },
    {
      symbol: 'BKNG',
      name: 'Booking Holdings Inc.',
      sector: 'Consumer Discretionary',
      subSector: 'Hotels, Resorts & Cruise Lines',
      headQuarter: 'Norwalk, Connecticut',
      founded: '1997'
    },
    {
      symbol: 'BWA',
      name: 'BorgWarner Inc.',
      sector: 'Consumer Discretionary',
      subSector: 'Automotive Parts & Equipment',
      headQuarter: 'Auburn Hills, Michigan',
      founded: '1928'
    },
    {
      symbol: 'BSX',
      name: 'Boston Scientific Corporation',
      sector: 'Health Care',
      subSector: 'Health Care Equipment',
      headQuarter: 'Marlborough, Massachusetts',
      founded: '1979'
    },
    {
      symbol: 'BMY',
      name: 'Bristol-Myers Squibb Company',
      sector: 'Health Care',
      subSector: 'Pharmaceuticals',
      headQuarter: 'New York, New York',
      founded: '1887'
    },
    {
      symbol: 'BR',
      name: 'Broadridge Financial Solutions Inc.',
      sector: 'Information Technology',
      subSector: 'Data Processing & Outsourced Services',
      headQuarter: 'Lake Success, New York',
      founded: '2007'
    },
    {
      symbol: 'BRO',
      name: 'Brown & Brown Inc.',
      sector: 'Financials',
      subSector: 'Insurance Brokers',
      headQuarter: 'Daytona Beach, Florida',
      founded: '1939'
    },
    {
      symbol: 'BX',
      name: 'Blackstone Inc.',
      sector: 'Financials',
      subSector: 'Asset Management & Custody Banks',
      headQuarter: 'New York, New York',
      founded: '1985'
    },
    {
      symbol: 'COST',
      name: 'Costco Wholesale Corporation',
      sector: 'Consumer Staples',
      subSector: 'Hypermarkets & Super Centers',
      headQuarter: 'Issaquah, Washington',
      founded: '1983'
    },
    {
      symbol: 'WMT',
      name: 'Walmart Inc.',
      sector: 'Consumer Staples',
      subSector: 'Hypermarkets & Super Centers',
      headQuarter: 'Bentonville, Arkansas',
      founded: '1962'
    },
    {
      symbol: 'LLY',
      name: 'Eli Lilly and Company',
      sector: 'Health Care',
      subSector: 'Pharmaceuticals',
      headQuarter: 'Indianapolis, Indiana',
      founded: '1876'
    },
    {
      symbol: 'ORCL',
      name: 'Oracle Corporation',
      sector: 'Information Technology',
      subSector: 'Systems Software',
      headQuarter: 'Austin, Texas',
      founded: '1977'
    },
    {
      symbol: 'NFLX',
      name: 'Netflix Inc.',
      sector: 'Communication Services',
      subSector: 'Movies & Entertainment',
      headQuarter: 'Los Gatos, California',
      founded: '1997'
    },
    {
      symbol: 'PLTR',
      name: 'Palantir Technologies Inc.',
      sector: 'Information Technology',
      subSector: 'Application Software',
      headQuarter: 'Denver, Colorado',
      founded: '2003'
    },
    {
      symbol: 'TMUS',
      name: 'T-Mobile US Inc.',
      sector: 'Communication Services',
      subSector: 'Wireless Telecommunication Services',
      headQuarter: 'Bellevue, Washington',
      founded: '1994'
    },
    {
      symbol: 'CSCO',
      name: 'Cisco Systems Inc.',
      sector: 'Information Technology',
      subSector: 'Communications Equipment',
      headQuarter: 'San Jose, California',
      founded: '1984'
    },
    {
      symbol: 'PM',
      name: 'Philip Morris International Inc.',
      sector: 'Consumer Staples',
      subSector: 'Tobacco',
      headQuarter: 'New York, New York',
      founded: '1847'
    },
    {
      symbol: 'WFC',
      name: 'Wells Fargo & Company',
      sector: 'Financials',
      subSector: 'Diversified Banks',
      headQuarter: 'San Francisco, California',
      founded: '1852'
    },
    {
      symbol: 'CRM',
      name: 'Salesforce Inc.',
      sector: 'Information Technology',
      subSector: 'Application Software',
      headQuarter: 'San Francisco, California',
      founded: '1999'
    },
    {
      symbol: 'IBM',
      name: 'International Business Machines Corporation',
      sector: 'Information Technology',
      subSector: 'IT Consulting & Other Services',
      headQuarter: 'Armonk, New York',
      founded: '1911'
    },
    {
      symbol: 'MS',
      name: 'Morgan Stanley',
      sector: 'Financials',
      subSector: 'Investment Banking & Brokerage',
      headQuarter: 'New York, New York',
      founded: '1935'
    },
    {
      symbol: 'GS',
      name: 'The Goldman Sachs Group Inc.',
      sector: 'Financials',
      subSector: 'Investment Banking & Brokerage',
      headQuarter: 'New York, New York',
      founded: '1869'
    },
    {
      symbol: 'LIN',
      name: 'Linde plc',
      sector: 'Materials',
      subSector: 'Industrial Gases',
      headQuarter: 'Guildford, United Kingdom',
      founded: '1879'
    },
    {
      symbol: 'INTU',
      name: 'Intuit Inc.',
      sector: 'Information Technology',
      subSector: 'Application Software',
      headQuarter: 'Mountain View, California',
      founded: '1983'
    },
    {
      symbol: 'MCD',
      name: 'McDonald\'s Corporation',
      sector: 'Consumer Discretionary',
      subSector: 'Restaurants',
      headQuarter: 'Chicago, Illinois',
      founded: '1940'
    },
    {
      symbol: 'RTX',
      name: 'RTX Corporation',
      sector: 'Industrials',
      subSector: 'Aerospace & Defense',
      headQuarter: 'Waltham, Massachusetts',
      founded: '1925'
    },
    {
      symbol: 'CAT',
      name: 'Caterpillar Inc.',
      sector: 'Industrials',
      subSector: 'Construction & Farm Machinery & Heavy Trucks',
      headQuarter: 'Deerfield, Illinois',
      founded: '1925'
    },
    {
      symbol: 'MRK',
      name: 'Merck & Co. Inc.',
      sector: 'Health Care',
      subSector: 'Pharmaceuticals',
      headQuarter: 'Rahway, New Jersey',
      founded: '1891'
    },
    {
      symbol: 'NOW',
      name: 'ServiceNow Inc.',
      sector: 'Information Technology',
      subSector: 'Application Software',
      headQuarter: 'Santa Clara, California',
      founded: '2004'
    },
    {
      symbol: 'PEP',
      name: 'PepsiCo Inc.',
      sector: 'Consumer Staples',
      subSector: 'Soft Drinks',
      headQuarter: 'Purchase, New York',
      founded: '1898'
    },
    {
      symbol: 'KO',
      name: 'The Coca-Cola Company',
      sector: 'Consumer Staples',
      subSector: 'Soft Drinks',
      headQuarter: 'Atlanta, Georgia',
      founded: '1886'
    },
    {
      symbol: 'GE',
      name: 'General Electric Company',
      sector: 'Industrials',
      subSector: 'Industrial Conglomerates',
      headQuarter: 'Boston, Massachusetts',
      founded: '1892'
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