const axios = require('axios');

function getConfig() {
  return {
    apiKey: process.env.TIINGO_API_KEY,
    iexUrl: process.env.TIINGO_IEX_URL || 'https://api.tiingo.com/iex',
    dailyUrl: process.env.TIINGO_DAILY_URL || 'https://api.tiingo.com/tiingo/daily'
  };
}

async function fetchDailyPrices(symbol, startDate, endDate) {
  const { dailyUrl, apiKey } = getConfig();
  if (!apiKey) throw new Error('Missing TIINGO_API_KEY');
  const url = `${dailyUrl}/${encodeURIComponent(symbol)}/prices`;
  const params = { token: apiKey, startDate, endDate, resampleFreq: 'daily' };
  const { data } = await axios.get(url, { params });
  return data;
}

async function fetchMultiple(symbols, startDate, endDate) {
  const map = {};
  for (const s of symbols) {
    try {
      map[s] = await fetchDailyPrices(s, startDate, endDate);
    } catch (e) {
      map[s] = [];
    }
  }
  return map;
}

module.exports = { fetchDailyPrices, fetchMultiple };


