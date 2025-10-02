"""
Market Data Service
Handles fetching and caching of market data from various sources
"""

import yfinance as yf
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta
import asyncio
import aiohttp
import os
from .supabase_io import SupabaseService

logger = logging.getLogger(__name__)

class MarketDataService:
    """Service for fetching and managing market data"""
    
    def __init__(self):
        self.supabase_service: Optional[SupabaseService] = None
        self.tiingo_api_key = os.getenv("TIINGO_API_KEY")
        self.cache_duration_minutes = 15  # Cache duration for real-time data
    
    async def initialize(self):
        """Initialize market data service"""
        self.supabase_service = SupabaseService()
        await self.supabase_service.initialize()
        logger.info("Market data service initialized")
    
    async def get_historical_prices(
        self, 
        symbols: List[str], 
        days: int = 1260,
        source: str = "yfinance"
    ) -> pd.DataFrame:
        """
        Get historical price data for symbols
        
        Args:
            symbols: List of ticker symbols
            days: Number of days of historical data
            source: Data source ('yfinance' or 'tiingo')
            
        Returns:
            DataFrame with historical adjusted close prices
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            logger.info(f"Fetching {days} days of historical data for {len(symbols)} symbols")
            
            if source == "yfinance":
                return await self._fetch_yfinance_data(symbols, start_date, end_date)
            elif source == "tiingo" and self.tiingo_api_key:
                return await self._fetch_tiingo_data(symbols, start_date, end_date)
            else:
                # Fallback to yfinance
                return await self._fetch_yfinance_data(symbols, start_date, end_date)
                
        except Exception as e:
            logger.error(f"Error fetching historical prices: {e}")
            raise
    
    async def _fetch_yfinance_data(
        self, 
        symbols: List[str], 
        start_date: datetime, 
        end_date: datetime
    ) -> pd.DataFrame:
        """Fetch data using yfinance"""
        try:
            # Run yfinance download in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(
                None,
                lambda: yf.download(
                    symbols,
                    start=start_date,
                    end=end_date,
                    progress=False,
                    threads=True
                )
            )
            
            # Handle single symbol case
            if len(symbols) == 1:
                if 'Adj Close' in data.columns:
                    return pd.DataFrame({symbols[0]: data['Adj Close']})
                else:
                    return pd.DataFrame({symbols[0]: data['Close']})
            
            # Multiple symbols
            if 'Adj Close' in data.columns:
                price_data = data['Adj Close']
            else:
                price_data = data['Close']
            
            # Clean data
            price_data = price_data.dropna(how='all')  # Remove rows with all NaN
            price_data = price_data.ffill()  # Forward fill (updated pandas syntax)
            
            # Remove symbols with insufficient data
            min_observations = min(252, len(price_data) * 0.8)  # At least 80% of data or 1 year
            valid_symbols = []
            
            for symbol in symbols:
                if symbol in price_data.columns:
                    valid_data = price_data[symbol].dropna()
                    if len(valid_data) >= min_observations:
                        valid_symbols.append(symbol)
                    else:
                        logger.warning(f"Insufficient data for {symbol}: {len(valid_data)} observations")
            
            if not valid_symbols:
                raise ValueError("No symbols have sufficient historical data")
            
            result = price_data[valid_symbols]
            logger.info(f"Successfully fetched data for {len(valid_symbols)} symbols")
            
            return result
            
        except Exception as e:
            logger.error(f"Error fetching yfinance data: {e}")
            raise
    
    async def _fetch_tiingo_data(
        self,
        symbols: List[str],
        start_date: datetime,
        end_date: datetime
    ) -> pd.DataFrame:
        """Fetch data using Tiingo API"""
        try:
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Token {self.tiingo_api_key}'
            }
            
            all_data = {}
            
            async with aiohttp.ClientSession(headers=headers) as session:
                tasks = []
                for symbol in symbols:
                    url = f"https://api.tiingo.com/tiingo/daily/{symbol}/prices"
                    params = {
                        'startDate': start_date.strftime('%Y-%m-%d'),
                        'endDate': end_date.strftime('%Y-%m-%d'),
                        'format': 'json'
                    }
                    tasks.append(self._fetch_symbol_data(session, symbol, url, params))
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for symbol, result in zip(symbols, results):
                    if isinstance(result, Exception):
                        logger.warning(f"Failed to fetch data for {symbol}: {result}")
                        continue
                    
                    if result:
                        df = pd.DataFrame(result)
                        df['date'] = pd.to_datetime(df['date'])
                        df.set_index('date', inplace=True)
                        all_data[symbol] = df['adjClose']
            
            if not all_data:
                raise ValueError("No data fetched from Tiingo")
            
            # Combine all symbol data
            price_data = pd.DataFrame(all_data)
            price_data = price_data.ffill()  # Forward fill (updated pandas syntax)
            
            logger.info(f"Successfully fetched Tiingo data for {len(all_data)} symbols")
            return price_data
            
        except Exception as e:
            logger.error(f"Error fetching Tiingo data: {e}")
            raise
    
    async def _fetch_symbol_data(
        self,
        session: aiohttp.ClientSession,
        symbol: str,
        url: str,
        params: Dict[str, Any]
    ) -> Optional[List[Dict[str, Any]]]:
        """Fetch data for a single symbol"""
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.warning(f"Failed to fetch {symbol}: HTTP {response.status}")
                    return None
        except Exception as e:
            logger.warning(f"Error fetching {symbol}: {e}")
            return None
    
    async def update_market_data(self, symbols: List[str]):
        """Update real-time market data for symbols"""
        try:
            # Check cache first
            cached_data = await self.supabase_service.get_market_data(symbols)
            
            symbols_to_update = []
            for symbol in symbols:
                if symbol not in cached_data:
                    symbols_to_update.append(symbol)
                else:
                    # Check if data is stale
                    last_updated = datetime.fromisoformat(cached_data[symbol]['last_updated'].replace('Z', '+00:00'))
                    if (datetime.utcnow() - last_updated.replace(tzinfo=None)).total_seconds() > self.cache_duration_minutes * 60:
                        symbols_to_update.append(symbol)
            
            if not symbols_to_update:
                logger.info("All market data is up to date")
                return
            
            logger.info(f"Updating market data for {len(symbols_to_update)} symbols")
            
            # Fetch fresh data
            fresh_data = await self._fetch_real_time_data(symbols_to_update)
            
            # Update cache
            for symbol, data in fresh_data.items():
                await self.supabase_service.update_market_data(symbol, data)
            
        except Exception as e:
            logger.error(f"Error updating market data: {e}")
            raise
    
    async def _fetch_real_time_data(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch real-time market data"""
        try:
            # Use yfinance for real-time data
            loop = asyncio.get_event_loop()
            
            def fetch_info():
                data = {}
                for symbol in symbols:
                    try:
                        ticker = yf.Ticker(symbol)
                        info = ticker.info
                        hist = ticker.history(period="2d")
                        
                        if not hist.empty:
                            current_price = hist['Close'].iloc[-1]
                            prev_price = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
                            price_change = current_price - prev_price
                            price_change_pct = (price_change / prev_price * 100) if prev_price != 0 else 0
                            
                            data[symbol] = {
                                "last_price": float(current_price),
                                "price_change": float(price_change),
                                "price_change_pct": float(price_change_pct),
                                "volume": int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else None,
                                "market_cap": info.get('marketCap'),
                                "currency": info.get('currency', 'USD'),
                                "exchange": info.get('exchange')
                            }
                    except Exception as e:
                        logger.warning(f"Failed to fetch real-time data for {symbol}: {e}")
                        continue
                
                return data
            
            return await loop.run_in_executor(None, fetch_info)
            
        except Exception as e:
            logger.error(f"Error fetching real-time data: {e}")
            return {}
    
    async def get_cached_prices(self, symbols: List[str]) -> Dict[str, float]:
        """Get cached prices for symbols"""
        try:
            cached_data = await self.supabase_service.get_market_data(symbols)
            return {
                symbol: data['last_price'] 
                for symbol, data in cached_data.items() 
                if 'last_price' in data
            }
        except Exception as e:
            logger.error(f"Error getting cached prices: {e}")
            return {}
    
    async def validate_symbols(self, symbols: List[str]) -> List[str]:
        """Validate that symbols exist and have data"""
        try:
            valid_symbols = []
            
            # Test fetch a small amount of data
            test_data = await self.get_historical_prices(symbols, days=5)
            
            for symbol in symbols:
                if symbol in test_data.columns:
                    # Check if we have actual price data
                    symbol_data = test_data[symbol].dropna()
                    if len(symbol_data) > 0:
                        valid_symbols.append(symbol)
                    else:
                        logger.warning(f"No valid data found for symbol: {symbol}")
                else:
                    logger.warning(f"Symbol not found: {symbol}")
            
            return valid_symbols
            
        except Exception as e:
            logger.error(f"Error validating symbols: {e}")
            return []

