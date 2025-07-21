/**
 * Configuration file for API keys and endpoints
 * In a production environment, sensitive values should be stored in environment variables
 */

// Tiingo API configuration
export const TIINGO_CONFIG = {
  API_KEY: process.env.TIINGO_API_KEY || 'eea215c3dee02fd378900c4a3d98dd347f54152b',
  IEX_URL: process.env.TIINGO_IEX_URL || 'https://api.tiingo.com/iex',
  DAILY_URL: process.env.TIINGO_DAILY_URL || 'https://api.tiingo.com/tiingo/daily'
}; 