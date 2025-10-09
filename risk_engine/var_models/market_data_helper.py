"""
Market Data Helper
Provides fallback data fetching: Tiingo -> yfinance -> synthetic data
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import os

logger = logging.getLogger(__name__)

def get_historical_prices_with_fallback(symbols, years=5):
    """
    Fetch historical prices with fallback strategy:
    1. Try Tiingo (if API key available)
    2. Fall back to yfinance
    3. Fall back to synthetic data
    
    Args:
        symbols: List of ticker symbols or single symbol string
        years: Number of years of historical data
        
    Returns:
        pandas.DataFrame: Historical adjusted close prices
    """
    import yfinance as yf
    
    # Ensure symbols is a list
    if isinstance(symbols, str):
        symbols = [symbols]
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=int(years*365.25))
    
    logger.info(f"Fetching historical prices for {len(symbols)} symbols from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} ({years} years)")
    
    # Strategy 1: Try Tiingo first (if API key is available)
    tiingo_key = os.getenv('TIINGO_API_KEY')
    if tiingo_key:
        try:
            logger.info("Attempting to fetch data from Tiingo...")
            data = _fetch_from_tiingo(symbols, start_date, end_date, tiingo_key)
            if data is not None and len(data) > 0:
                logger.info(f"✅ Successfully fetched {len(data)} days of data from Tiingo")
                return data
            logger.warning("Tiingo returned empty data, falling back to yfinance")
        except Exception as e:
            logger.warning(f"Tiingo fetch failed: {e}, falling back to yfinance")
    else:
        logger.info("TIINGO_API_KEY not set, skipping Tiingo")
    
    # Strategy 2: Try yfinance
    try:
        logger.info("Attempting to fetch data from yfinance...")
        data = yf.download(symbols, start=start_date, end=end_date, progress=False)['Adj Close']
        
        # yfinance returns Series for single symbol, DataFrame for multiple symbols
        if isinstance(data, pd.Series):
            data = pd.DataFrame({symbols[0]: data})
        
        # Forward fill missing values
        data = data.ffill()
        
        # Drop completely empty columns
        if isinstance(data, pd.DataFrame) and data.isna().any().any():
            empty_symbols = data.columns[data.isna().all()].tolist()
            if empty_symbols:
                logger.warning(f"No yfinance data for: {empty_symbols}")
                data = data.drop(columns=empty_symbols)
        
        if len(data) > 0:
            logger.info(f"✅ Successfully fetched {len(data)} days of data from yfinance")
            return data
        
        logger.warning("yfinance returned empty data, falling back to synthetic data")
    except Exception as e:
        logger.warning(f"yfinance fetch failed: {e}, falling back to synthetic data")
    
    # Strategy 3: Generate synthetic data as last resort
    logger.warning("⚠️  Using synthetic data - actual market data unavailable")
    return _generate_synthetic_data(symbols, start_date, end_date)


def _fetch_from_tiingo(symbols, start_date, end_date, api_key):
    """Fetch data from Tiingo API"""
    import requests
    
    all_data = {}
    
    for symbol in symbols:
        try:
            url = f"https://api.tiingo.com/tiingo/daily/{symbol}/prices"
            params = {
                'token': api_key,
                'startDate': start_date.strftime('%Y-%m-%d'),
                'endDate': end_date.strftime('%Y-%m-%d'),
                'resampleFreq': 'daily'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data:
                df = pd.DataFrame(data)
                df['date'] = pd.to_datetime(df['date'])
                df.set_index('date', inplace=True)
                all_data[symbol] = df['adjClose']
                logger.info(f"  ✓ {symbol}: {len(df)} days")
        except Exception as e:
            logger.warning(f"  ✗ {symbol}: {e}")
            continue
    
    if not all_data:
        return None
    
    # Combine all symbol data
    price_data = pd.DataFrame(all_data)
    price_data = price_data.ffill().bfill()  # Forward and backward fill
    
    return price_data


def _generate_synthetic_data(symbols, start_date, end_date):
    """Generate synthetic price data as fallback"""
    # Create business day date range
    index = pd.date_range(start=start_date, end=end_date, freq='B')
    
    # Set seed for reproducibility
    np.random.seed(42)
    
    all_data = {}
    for symbol in symbols:
        # Generate realistic price movements
        base_price = 100.0
        num_days = len(index)
        daily_returns = np.random.normal(0.0005, 0.012, num_days)  # ~0.05% mean, 1.2% std
        cum_returns = np.cumprod(1 + daily_returns)
        prices = base_price * cum_returns
        all_data[symbol] = prices
    
    logger.info(f"Generated synthetic data for {len(symbols)} symbols with {len(index)} trading days")
    
    return pd.DataFrame(all_data, index=index)

