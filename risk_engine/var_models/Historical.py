import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import requests
import json
import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('historical_var')

# Default Parameters
confidence_level = 0.95
time_horizon = 1  # days
lookback_period = 5  # years
MAX_LOOKBACK = 20  # Maximum allowed lookback period in years
MIN_LOOKBACK = 1   # Minimum allowed lookback period in years
API_URL = "http://localhost:8000/api/portfolio/1"  # Change as needed

# Allow reading parameters from a JSON file (e.g., 'var_input.json')
def load_params_from_file(input_file):
    if not os.path.exists(input_file):
        logger.warning(f"Input file {input_file} not found, using default parameters")
        return None
    
    try:
        with open(input_file, 'r') as f:
            data = json.load(f)
        
        params = data.get('params', {})
        portfolio_id = data.get('portfolio', {}).get('id', '1')
        
        # Parse and validate lookback period
        lookback = int(params.get('lookbackPeriod', 5))
        if lookback < MIN_LOOKBACK:
            logger.warning(f"Lookback period {lookback} is too short, using minimum of {MIN_LOOKBACK} year(s)")
            lookback = MIN_LOOKBACK
        elif lookback > MAX_LOOKBACK:
            logger.warning(f"Lookback period {lookback} is too long, using maximum of {MAX_LOOKBACK} years")
            lookback = MAX_LOOKBACK
            
        return {
            'confidence_level': float(params.get('confidenceLevel', 0.95)),
            'time_horizon': int(params.get('timeHorizon', 1)),
            'lookback_period': lookback,
            'portfolio_id': portfolio_id
        }
    except Exception as e:
        logger.error(f"Error loading parameters from file: {e}")
        return None

def load_portfolio_from_api(api_url):
    try:
        logger.info(f"Loading portfolio from API: {api_url}")
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        df = pd.DataFrame(data['positions'])
        logger.info(f"Successfully loaded portfolio with {len(df)} positions")
        return df
    except requests.exceptions.RequestException as e:
        logger.error(f"API request failed: {e}")
        raise

def get_historical_prices(symbols, years=5):
    """
    Get historical prices for the given symbols with proper error handling
    and data quality checks.
    """
    # Validate lookback period
    years = max(MIN_LOOKBACK, min(MAX_LOOKBACK, years))
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=int(years*365.25))  # More precise year calculation
    
    logger.info(f"Fetching historical prices from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')} ({years} years)")
    
    try:
        # Fetch data for all symbols at once
        data = yf.download(symbols, start=start_date, end=end_date, progress=False)['Adj Close']
        
        # Check for missing data
        missing_pct = data.isna().mean().mean() * 100
        if missing_pct > 5:
            logger.warning(f"Warning: {missing_pct:.1f}% of price data is missing")
        
        # Forward fill missing values (more appropriate for price data than mean)
        data = data.fillna(method='ffill')
        
        # If any columns are still completely empty, drop them
        if data.isna().any().any():
            empty_symbols = data.columns[data.isna().all()].tolist()
            if empty_symbols:
                logger.warning(f"No data available for symbols: {empty_symbols}")
                data = data.drop(columns=empty_symbols)
        
        # Ensure we have enough data
        if len(data) < 252:  # Approximately 1 year of trading days
            logger.warning(f"Limited historical data available: only {len(data)} trading days")
        
        return data
    except Exception as e:
        logger.error(f"Error fetching historical prices: {e}")
        raise

def calculate_portfolio_returns(portfolio, price_data):
    """
    Calculate weighted portfolio returns based on position sizes.
    """
    if len(price_data.columns) == 0:
        raise ValueError("No price data available for portfolio assets")
    
    # Create a mapping from symbols to their weights
    weights = []
    symbols = []
    
    for _, row in portfolio.iterrows():
        symbol = row['symbol']
        # Only include symbols that exist in the price data
        if symbol in price_data.columns:
            weights.append(row['quantity'] * row['price'])
            symbols.append(symbol)
    
    if not weights:
        raise ValueError("No matching symbols found in price data")
    
    # Convert to numpy array and normalize
    weights = np.array(weights)
    weights = weights / weights.sum()
    
    # Calculate returns
    returns = price_data[symbols].pct_change().dropna()
    
    # Handle single asset case
    if len(symbols) == 1:
        # For single asset, just return the returns series (weights are 100%)
        portfolio_returns = returns[symbols[0]]
    else:
        # Combine using dot product for multiple assets
        portfolio_returns = returns.dot(weights)
    
    return portfolio_returns

def historical_var(portfolio_returns, portfolio_value, confidence_level, time_horizon):
    """
    Calculate Historical VaR and CVaR using historical returns.
    """
    # Scale returns for the time horizon
    scaled_returns = portfolio_returns * np.sqrt(time_horizon)
    
    # Calculate losses
    losses = -scaled_returns * portfolio_value
    
    # Calculate VaR
    var = np.percentile(losses, confidence_level * 100)
    
    # Calculate Conditional VaR (Expected Shortfall)
    cvar = losses[losses >= var].mean()
    
    return var, cvar, losses

def calculate_var(portfolio_assets, confidence=0.95, horizon=1, lookback_years=5):
    """
    Wrapper function for API compatibility
    Calculates VaR for a portfolio given as a list of asset dictionaries
    """
    try:
        # Convert portfolio_assets to DataFrame
        portfolio_df = pd.DataFrame(portfolio_assets)
        
        # Get symbols and fetch price data
        symbols = portfolio_df['symbol'].tolist()
        price_data = get_historical_prices(symbols, years=lookback_years)
        
        # Calculate portfolio returns
        portfolio_returns = calculate_portfolio_returns(portfolio_df, price_data)
        
        # Calculate portfolio value
        portfolio_value = (portfolio_df['quantity'] * portfolio_df['price']).sum()
        
        # Calculate VaR
        var, cvar, losses = historical_var(portfolio_returns, portfolio_value, confidence, horizon)
        
        # Return results in standard format
        return {
            'results': {
                'var': var,
                'cvar': cvar,
                'portfolio_value': portfolio_value,
                'var_percentage': (var / portfolio_value) * 100,
                'confidence_level': confidence,
                'time_horizon': horizon,
                'lookback_years': lookback_years
            },
            'chart_url': ''
        }
    except Exception as e:
        logger.error(f"Error in calculate_var: {e}")
        raise

def main():
    # Check for input file argument
    input_file = None
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
    
    params = None
    if input_file:
        params = load_params_from_file(input_file)
    
    # Use params from file if available, else defaults
    cl = params['confidence_level'] if params else confidence_level
    th = params['time_horizon'] if params else time_horizon
    lp = params['lookback_period'] if params else lookback_period
    portfolio_id = params['portfolio_id'] if params else '1'
    api_url = f"http://localhost:8000/api/portfolio/{portfolio_id}"

    logger.info("Historical VaR Analysis")
    logger.info(f"Confidence Level: {cl*100}%")
    logger.info(f"Time Horizon: {th} day(s)")
    logger.info(f"Lookback Period: {lp} year(s)")
    
    try:
        portfolio = load_portfolio_from_api(api_url)
        symbols = portfolio['symbol'].tolist()
        
        price_data = get_historical_prices(symbols, years=lp)
        portfolio_returns = calculate_portfolio_returns(portfolio, price_data)
        
        portfolio_value = (portfolio['quantity'] * portfolio['price']).sum()
        var, cvar, losses = historical_var(portfolio_returns, portfolio_value, cl, th)
        
        logger.info(f"Portfolio Value: ${portfolio_value:,.2f}")
        logger.info(f"Historical VaR ({cl*100:.0f}%, {th}d): ${var:,.2f}")
        logger.info(f"Conditional VaR (Expected Shortfall): ${cvar:,.2f}")
        logger.info(f"VaR as percentage of portfolio: {var/portfolio_value*100:.2f}%")
        logger.info(f"CVaR as percentage of portfolio: {cvar/portfolio_value*100:.2f}%")
        
        # Plotting with improved visualization
        plt.figure(figsize=(12, 8))
        
        # Plot histogram of losses
        n, bins, patches = plt.hist(losses, bins=50, alpha=0.7, density=True, color='skyblue')
        
        # Color the tail losses in red
        tail_idx = np.where(bins > var)[0][0]
        for i in range(tail_idx, len(patches)):
            patches[i].set_facecolor('salmon')
        
        # Add vertical lines for VaR and CVaR
        plt.axvline(var, color='red', linestyle='--', linewidth=2, 
                    label=f'VaR ({cl*100:.0f}%): ${var:,.2f} ({var/portfolio_value*100:.2f}%)')
        plt.axvline(cvar, color='darkred', linestyle='-.', linewidth=2,
                    label=f'CVaR: ${cvar:,.2f} ({cvar/portfolio_value*100:.2f}%)')
        
        plt.title(f'Historical VaR Analysis ({th}-Day Horizon)\nBased on {lp}-Year Historical Data', fontsize=14)
        plt.xlabel('Loss Amount ($)', fontsize=12)
        plt.ylabel('Probability Density', fontsize=12)
        plt.grid(True, alpha=0.3)
        plt.legend(fontsize=10)
        
        # Add text with key metrics
        info_text = (
            f"Portfolio Value: ${portfolio_value:,.2f}\n"
            f"Data Period: {price_data.index[0].strftime('%Y-%m-%d')} to {price_data.index[-1].strftime('%Y-%m-%d')}\n"
            f"Trading Days: {len(price_data)}\n"
            f"Assets: {len(portfolio)}"
        )
        plt.figtext(0.15, 0.01, info_text, fontsize=10, bbox=dict(facecolor='white', alpha=0.8))
        
        plt.tight_layout(rect=[0, 0.03, 1, 0.97])  # Adjust for text
        plt.savefig("historical_var.png", dpi=150)
        
        # Save with timestamp for archiving
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plt.savefig(f"historical_var_{timestamp}.png", dpi=150)
        
        logger.info(f"Chart saved as historical_var.png and historical_var_{timestamp}.png")
        plt.show()
        
        # Save results to JSON for API consumption
        results = {
            "var": float(var),
            "cvar": float(cvar),
            "varPercentage": float(var/portfolio_value*100),
            "cvarPercentage": float(cvar/portfolio_value*100),
            "portfolioValue": float(portfolio_value),
            "lookbackPeriod": lp,
            "confidenceLevel": cl,
            "timeHorizon": th,
            "timestamp": datetime.now().isoformat()
        }
        
        with open("historical_var_results.json", "w") as f:
            json.dump(results, f, indent=2)
        logger.info("Results saved to historical_var_results.json")
        
    except Exception as e:
        logger.error(f"Error running Historical VaR analysis: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
