import numpy as np
import pandas as pd
import yfinance as yf
from scipy.stats import norm, t
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import requests
import json
import sys
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('parametric_var')

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
            
        # Parse distribution type if provided
        distribution = params.get('distribution', 'normal').lower()
        if distribution not in ['normal', 't']:
            logger.warning(f"Unknown distribution {distribution}, using normal distribution")
            distribution = 'normal'
            
        return {
            'confidence_level': float(params.get('confidenceLevel', 0.95)),
            'time_horizon': int(params.get('timeHorizon', 1)),
            'lookback_period': lookback,
            'distribution': distribution,
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

def parametric_var(portfolio_returns, portfolio_value, confidence_level, time_horizon, distribution='normal'):
    """
    Calculate Parametric VaR and CVaR using either normal or t-distribution.
    
    Args:
        portfolio_returns: Series of historical portfolio returns
        portfolio_value: Current portfolio value
        confidence_level: Confidence level (e.g., 0.95 for 95%)
        time_horizon: Time horizon in days
        distribution: Either 'normal' or 't' for Student's t-distribution
        
    Returns:
        var: Value at Risk
        cvar: Conditional Value at Risk (Expected Shortfall)
        stats: Dictionary with distribution statistics
    """
    mu = portfolio_returns.mean()
    sigma = portfolio_returns.std()
    
    # Check for extreme values in the returns
    skewness = portfolio_returns.skew()
    kurtosis = portfolio_returns.kurtosis()
    
    # Store distribution statistics
    stats = {
        'mean': mu,
        'std_dev': sigma,
        'skewness': skewness,
        'kurtosis': kurtosis,
        'distribution': distribution
    }
    
    # Calculate VaR based on distribution
    if distribution == 't':
        # Estimate degrees of freedom (df) for t-distribution
        # A simple estimation based on kurtosis
        df = 6.0 / kurtosis if kurtosis > 0 else 10
        df = max(2.1, min(df, 30))  # Constrain df to reasonable range
        stats['df'] = df
        
        # Calculate VaR using t-distribution
        t_critical = t.ppf(1 - confidence_level, df)
        var = -(mu * time_horizon + t_critical * sigma * np.sqrt(time_horizon)) * portfolio_value
        
        # Calculate CVaR (Expected Shortfall) for t-distribution
        # Formula: ES = -μ + σ * [df/(df-1)] * [g(x_α)/(1-α)]
        # where g(x) is the PDF of the t-distribution and x_α is the α-quantile
        x_alpha = t.ppf(1 - confidence_level, df)
        t_density = t.pdf(x_alpha, df)
        scale_factor = (df + x_alpha**2) / (df - 1) * (1 / (1 - confidence_level)) * t_density
        cvar = -(mu * time_horizon - sigma * np.sqrt(time_horizon) * scale_factor) * portfolio_value
    else:
        # Normal distribution
        z = norm.ppf(1 - confidence_level)
        var = -(mu * time_horizon + z * sigma * np.sqrt(time_horizon)) * portfolio_value
        
        # Calculate CVaR (Expected Shortfall) for normal distribution
        # Formula: ES = -μ + σ * [φ(z_α)/(1-α)]
        # where φ is the PDF of the normal distribution
        normal_density = norm.pdf(z)
        cvar = -(mu * time_horizon - sigma * np.sqrt(time_horizon) * normal_density / (1 - confidence_level)) * portfolio_value
    
    # Simulate distribution to allow for plotting
    if distribution == 't':
        # For t-distribution
        simulated_returns = t.rvs(df, loc=mu * time_horizon, 
                                 scale=sigma * np.sqrt(time_horizon), 
                                 size=100000)
    else:
        # For normal distribution
        simulated_returns = np.random.normal(mu * time_horizon, 
                                          sigma * np.sqrt(time_horizon), 
                                          100000)
    
    simulated_losses = -simulated_returns * portfolio_value
    
    return var, cvar, simulated_losses, stats

def calculate_var(portfolio_assets, confidence=0.95, horizon=1, lookback_years=5, distribution='normal'):
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
        var, cvar, simulated_losses, dist_stats = parametric_var(
            portfolio_returns,
            portfolio_value,
            confidence,
            horizon,
            distribution=distribution
        )
        
        # Return results in standard format
        return {
            'results': {
                'var': var,
                'cvar': cvar,
                'portfolio_value': portfolio_value,
                'var_percentage': (var / portfolio_value) * 100,
                'confidence_level': confidence,
                'time_horizon': horizon,
                'lookback_years': lookback_years,
                'distribution': distribution,
                'stats': dist_stats
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
    dist = params.get('distribution', 'normal') if params else 'normal'
    portfolio_id = params['portfolio_id'] if params else '1'
    api_url = f"http://localhost:8000/api/portfolio/{portfolio_id}"

    logger.info("Parametric VaR Analysis")
    logger.info(f"Confidence Level: {cl*100}%")
    logger.info(f"Time Horizon: {th} day(s)")
    logger.info(f"Lookback Period: {lp} year(s)")
    logger.info(f"Distribution: {dist.capitalize()}")
    
    try:
        portfolio = load_portfolio_from_api(api_url)
        symbols = portfolio['symbol'].tolist()
        price_data = get_historical_prices(symbols, years=lp)
        portfolio_returns = calculate_portfolio_returns(portfolio, price_data)
        
        # Test for normality
        from scipy import stats
        k2, p_value = stats.normaltest(portfolio_returns)
        if p_value < 0.05:
            logger.warning("Portfolio returns are likely not normally distributed (p={:.5f})".format(p_value))
            logger.warning("Consider using t-distribution for better tail modeling")
        
        portfolio_value = (portfolio['quantity'] * portfolio['price']).sum()
        var, cvar, simulated_losses, dist_stats = parametric_var(
            portfolio_returns, 
            portfolio_value, 
            cl, 
            th,
            distribution=dist
        )
        
        logger.info(f"Portfolio Value: ${portfolio_value:,.2f}")
        logger.info(f"Parametric VaR ({cl*100:.0f}%, {th}d): ${var:,.2f}")
        logger.info(f"Conditional VaR (Expected Shortfall): ${cvar:,.2f}")
        logger.info(f"VaR as percentage of portfolio: {var/portfolio_value*100:.2f}%")
        logger.info(f"CVaR as percentage of portfolio: {cvar/portfolio_value*100:.2f}%")
        
        # Display distribution statistics
        logger.info("\nDistribution Statistics:")
        logger.info(f"Mean: {dist_stats['mean']*100:.4f}%")
        logger.info(f"Standard Deviation: {dist_stats['std_dev']*100:.4f}%")
        logger.info(f"Skewness: {dist_stats['skewness']:.4f}")
        logger.info(f"Kurtosis: {dist_stats['kurtosis']:.4f}")
        if 'df' in dist_stats:
            logger.info(f"Degrees of Freedom: {dist_stats['df']:.2f}")
        
        # Enhanced visualization
        plt.figure(figsize=(12, 8))
        
        # Plot histogram of returns and overlay parametric distribution
        n, bins, patches = plt.hist(simulated_losses, bins=50, alpha=0.7, density=True, color='skyblue')
        
        # Color the tail losses in red
        tail_idx = np.where(bins > var)[0][0]
        for i in range(tail_idx, len(patches)):
            patches[i].set_facecolor('salmon')
        
        # Add vertical lines for VaR and CVaR
        plt.axvline(var, color='red', linestyle='--', linewidth=2, 
                    label=f'VaR ({cl*100:.0f}%): ${var:,.2f} ({var/portfolio_value*100:.2f}%)')
        plt.axvline(cvar, color='darkred', linestyle='-.', linewidth=2,
                    label=f'CVaR: ${cvar:,.2f} ({cvar/portfolio_value*100:.2f}%)')
        
        plt.title(f'Parametric VaR Analysis ({th}-Day Horizon)\nBased on {lp}-Year Historical Data, {dist.capitalize()} Distribution', fontsize=14)
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
        plt.savefig("parametric_var.png", dpi=150)
        
        # Save with timestamp for archiving
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plt.savefig(f"parametric_var_{timestamp}.png", dpi=150)
        
        logger.info(f"Chart saved as parametric_var.png and parametric_var_{timestamp}.png")
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
            "distribution": dist,
            "statistics": {
                "mean": float(dist_stats['mean']),
                "stdDev": float(dist_stats['std_dev']),
                "skewness": float(dist_stats['skewness']),
                "kurtosis": float(dist_stats['kurtosis'])
            },
            "timestamp": datetime.now().isoformat()
        }
        
        if 'df' in dist_stats:
            results["statistics"]["degreesOfFreedom"] = float(dist_stats['df'])
            
        with open("parametric_var_results.json", "w") as f:
            json.dump(results, f, indent=2)
        logger.info("Results saved to parametric_var_results.json")
        
    except Exception as e:
        logger.error(f"Error running Parametric VaR analysis: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
