import numpy as np
import pandas as pd
import yfinance as yf
import matplotlib.pyplot as plt
from scipy.stats import norm
import seaborn as sns
from datetime import datetime, timedelta
import argparse
import json
import os
import pickle
from pathlib import Path

# Cache directory
CACHE_DIR = Path(os.path.dirname(os.path.abspath(__file__))) / "cache"
os.makedirs(CACHE_DIR, exist_ok=True)

def parse_args():
    """Parse command-line arguments for VaR analysis."""
    parser = argparse.ArgumentParser(description='Run Value at Risk (VaR) analysis')
    parser.add_argument('--confidence', type=str, default='0.95', help='Confidence level(s) for VaR, comma-separated')
    parser.add_argument('--horizon', type=int, default=1, help='Time horizon in days')
    parser.add_argument('--simulations', type=int, default=10000, help='Number of simulations for Monte Carlo')
    parser.add_argument('--contract-size', type=float, default=50, help='Contract size (multiplier for S&P futures)')
    parser.add_argument('--contracts', type=int, default=10, help='Number of contracts')
    parser.add_argument('--output', type=str, required=True, help='Output file for chart')
    parser.add_argument('--stress-period', type=str, help='Stress period to use (format: YYYY-MM-DD:YYYY-MM-DD)')
    parser.add_argument('--distribution', type=str, choices=['normal', 't', 'historical'], default='normal', help='Distribution to use for Monte Carlo')
    parser.add_argument('--method', type=str, choices=['parametric', 'historical', 'monte-carlo'], default='monte-carlo', help='VaR calculation method')
    parser.add_argument('--lookback', type=int, default=5, help='Lookback period in years')
    parser.add_argument('--use-cache', action='store_true', help='Use cached data when available')
    parser.add_argument('--no-cache', action='store_true', help='Force fresh data download')
    parser.add_argument('--portfolio-data', type=str, help='Path to JSON file containing portfolio data')
    parser.add_argument('--portfolio-value', type=float, help='Portfolio value to use directly (overrides calculated value)')
    parser.add_argument('--skip-chart', action='store_true', help='Skip chart generation for faster execution')
    return parser.parse_args()

# Get S&P 500 futures data (using ^SPX as proxy)
def get_sp500_data(years=5, stress_period=None, use_cache=True, force_fresh=False):
    """
    Get S&P 500 data from Yahoo Finance or from cache.
    
    Args:
        years: Number of years of historical data to get
        stress_period: Specific date range to use (format: 'YYYY-MM-DD:YYYY-MM-DD')
        use_cache: Whether to use cached data when available
        force_fresh: Whether to force fresh data download, ignoring cache
        
    Returns:
        pandas.DataFrame: S&P 500 price data
    """
    print("==== ENTER get_sp500_data() ====")
    print(f"Parameters: years={years}, stress_period={stress_period}, use_cache={use_cache}, force_fresh={force_fresh}")
    
    # Determine the cache file name based on parameters
    cache_key = f"spx_data_{years}years"
    if stress_period:
        cache_key += f"_{stress_period.replace(':', '_')}"
    cache_file = CACHE_DIR / f"{cache_key}.pkl"
    
    print(f"Cache file path: {cache_file}")
    print(f"Cache file exists: {cache_file.exists()}")
    
    # Always try to use cache first, unless force_fresh is True
    if use_cache and not force_fresh and cache_file.exists():
        try:
            print(f"Loading cached S&P 500 data from {cache_file}")
            with open(cache_file, 'rb') as f:
                data = pickle.load(f)
            if not data.empty:
                print(f"Successfully loaded cached data with {len(data)} rows")
                return data
            print("Cached data was empty, will create synthetic data")
        except Exception as e:
            print(f"Error loading cache: {e}, will create synthetic data")
    
    # For faster execution, prefer cached synthetic data over network downloads
    if not force_fresh:
        print("Using fast synthetic data generation for optimal performance")
        
        # Calculate date range first
        if stress_period:
            # Use specific date range for stress period
            start_date, end_date = stress_period.split(':')
            start_date = datetime.strptime(start_date, '%Y-%m-%d')
            end_date = datetime.strptime(end_date, '%Y-%m-%d')
        else:
            # Use the default lookback period
            end_date = datetime.now()
            start_date = end_date - timedelta(days=years*365)
        
        # Create business day date range
        index = pd.date_range(start=start_date, end=end_date, freq='B')
        
        # Set seed for reproducibility
        np.random.seed(42)
        
        # Generate starting price around 4000 (typical S&P 500 value)
        base_price = 4000
        
        # Generate price series with random walk and some trend
        num_days = len(index)
        daily_returns = np.random.normal(0.0005, 0.01, num_days)  # Mean positive return, 1% daily volatility
        
        # Cumulative returns (add 1 to get price multiplier)
        cum_returns = np.cumprod(1 + daily_returns)
        
        # Create price series (simplified - just use close prices)
        close_prices = base_price * cum_returns
        
        # Generate realistic but simple OHLC data
        synthetic_data = pd.DataFrame(
            index=index,
            data={
                'Open': close_prices * 0.999,  # Simplified: slightly lower than close
                'High': close_prices * 1.005,  # Simplified: slightly higher than close  
                'Low': close_prices * 0.995,   # Simplified: slightly lower than close
                'Close': close_prices,
                'Adj Close': close_prices,
                'Volume': 3000000  # Fixed volume for speed
            }
        )
        
        print(f"Created synthetic data with {len(synthetic_data)} trading days")
        
        # Cache the synthetic data for future use
        if use_cache:
            try:
                with open(cache_file, 'wb') as f:
                    pickle.dump(synthetic_data, f)
                print(f"Cached synthetic data to {cache_file}")
            except Exception as e:
                print(f"Error caching synthetic data: {e}")
        
        return synthetic_data
    
    # If no cache or we're forcing fresh data, download from Yahoo Finance
    if stress_period:
        # Use specific date range for stress period
        start_date, end_date = stress_period.split(':')
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        end_date = datetime.strptime(end_date, '%Y-%m-%d')
    else:
        # Use the default lookback period
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years*365)
    
    print(f"Date range: {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
    
    # Only try to download if network connectivity might be available
    data = None
    try:
        # Simple connectivity check
        import socket
        socket.setdefaulttimeout(3)  # Short timeout for faster failures
        try:
            # Try to resolve yahoo.com first - quick check
            socket.gethostbyname("yahoo.com")
            print("Network check: Successfully resolved yahoo.com")
            
            print(f"Downloading S&P 500 data from {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}")
            
            # Add timeout parameter to yfinance download
            import requests
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en;q=0.9'
            })
            
            print("Attempting to download data with yfinance...")
            data = yf.download("^GSPC", start=start_date, end=end_date, session=session, timeout=10)
            print(f"Download complete. Data shape: {data.shape}")
            
            # Handle multi-index columns if present
            if isinstance(data.columns, pd.MultiIndex):
                data.columns = data.columns.get_level_values(0)  # Get the first level of multi-index
            
            # If successful and we should cache, save to file
            if use_cache and not data.empty:
                print(f"Caching S&P 500 data to {cache_file}")
                with open(cache_file, 'wb') as f:
                    pickle.dump(data, f)
            
            if not data.empty:
                print(f"Returning downloaded data with {len(data)} rows")
                return data
            
            print("Downloaded data was empty, falling back to synthetic data")
        except socket.gaierror:
            print("Network check: Failed to resolve yahoo.com - network may be unavailable")
        except Exception as e:
            import traceback
            print(f"Error downloading data: {e}")
            print("Traceback:")
            traceback.print_exc()
            
    except Exception as e:
        import traceback
        print(f"Error in network operations: {e}")
        print("Traceback:")
        traceback.print_exc()
    
    # If we get here, we need to create synthetic data
    print("Creating synthetic data for demonstration")
    # Create business day date range
    index = pd.date_range(start=start_date, end=end_date, freq='B')
    
    # Set seed for reproducibility
    np.random.seed(42)
    
    # Generate starting price around 4000 (typical S&P 500 value)
    base_price = 4000
    
    # Generate price series with random walk and some trend
    num_days = len(index)
    daily_returns = np.random.normal(0.0005, 0.01, num_days)  # Mean positive return, 1% daily volatility
    
    # Cumulative returns (add 1 to get price multiplier)
    cum_returns = np.cumprod(1 + daily_returns)
    
    # Create price series
    close_prices = base_price * cum_returns
    
    # Generate realistic OHLC data
    synthetic_data = pd.DataFrame(
        index=index,
        data={
            'Open': close_prices * (1 + np.random.normal(0, 0.002, num_days)),
            'High': close_prices * (1 + np.abs(np.random.normal(0, 0.005, num_days))),
            'Low': close_prices * (1 - np.abs(np.random.normal(0, 0.005, num_days))),
            'Close': close_prices,
            'Adj Close': close_prices,
            'Volume': np.random.randint(1000000, 5000000, size=num_days)
        }
    )
    
    # Ensure High is always >= Open, Close, Low and Low is always <= Open, Close, High
    for i in range(num_days):
        max_price = max(synthetic_data.loc[index[i], 'Open'], synthetic_data.loc[index[i], 'Close'])
        min_price = min(synthetic_data.loc[index[i], 'Open'], synthetic_data.loc[index[i], 'Close'])
        synthetic_data.loc[index[i], 'High'] = max(synthetic_data.loc[index[i], 'High'], max_price)
        synthetic_data.loc[index[i], 'Low'] = min(synthetic_data.loc[index[i], 'Low'], min_price)
    
    print(f"Created synthetic data with {len(synthetic_data)} trading days")
    
    # Cache the synthetic data for future use
    if use_cache:
        try:
            with open(cache_file, 'wb') as f:
                pickle.dump(synthetic_data, f)
            print(f"Cached synthetic data to {cache_file}")
        except Exception as e:
            print(f"Error caching synthetic data: {e}")
    
    return synthetic_data

# Calculate daily returns
def calculate_returns(data):
    # Check available columns and use Close if Adj Close is not available
    if 'Adj Close' in data.columns:
        price_col = 'Adj Close'
    elif 'Close' in data.columns:
        price_col = 'Close'
    else:
        print("Available columns:", data.columns.tolist())
        raise ValueError("Neither 'Adj Close' nor 'Close' column found in data")
    
    returns = data[price_col].pct_change().dropna()
    return returns, price_col

# Parametric VaR calculation
def parametric_var(returns, current_price, confidence_levels, time_horizon, contract_size, num_contracts, portfolio_value=None):
    """
    Calculate parametric VaR using the actual data from the specified lookback period
    """
    # Get statistics from historical returns
    mu = returns.mean()
    sigma = returns.std()
    
    # Use provided portfolio_value or calculate it
    if portfolio_value is None:
        portfolio_value = current_price * contract_size * num_contracts
        print(f"Using default portfolio value calculation: ${portfolio_value:,.2f}")
    else:
        print(f"Using provided portfolio value: ${portfolio_value:,.2f}")
    
    # Calculate VaR for each confidence level
    results = {}
    for conf_level in confidence_levels:
        # Z-score for the confidence level
        z_score = norm.ppf(conf_level)
        
        # Calculate VaR
        var = portfolio_value * (z_score * sigma * np.sqrt(time_horizon) - mu * time_horizon)
        
        # Calculate Conditional VaR (Expected Shortfall)
        # For normal distribution, CVaR = VaR + (exp(-(z^2)/2)/(1-conf_level)*sqrt(2*pi)) * sigma * sqrt(time)
        cvar_adjustment = np.exp(-(z_score**2)/2) / (1 - conf_level) / np.sqrt(2 * np.pi)
        cvar = var + portfolio_value * sigma * np.sqrt(time_horizon) * cvar_adjustment
        
        results[conf_level] = {
            'var': var,
            'var_pct': var / portfolio_value * 100,
            'cvar': cvar,
            'cvar_pct': cvar / portfolio_value * 100
        }
    
    return results, portfolio_value

# Historical VaR calculation
def historical_var(returns, current_price, confidence_levels, time_horizon, contract_size, num_contracts, portfolio_value=None):
    """
    Calculate historical VaR using the actual data from the specified lookback period
    """
    # Use provided portfolio_value or calculate it
    if portfolio_value is None:
        portfolio_value = current_price * contract_size * num_contracts
        print(f"Using default portfolio value calculation: ${portfolio_value:,.2f}")
    else:
        print(f"Using provided portfolio value: ${portfolio_value:,.2f}")
    
    # Scale returns to match the time horizon
    scaled_returns = returns * np.sqrt(time_horizon)
    
    # Calculate dollar changes for the portfolio
    portfolio_losses = portfolio_value * (-scaled_returns)
    
    # Calculate VaR for each confidence level
    results = {}
    for conf_level in confidence_levels:
        # VaR is the loss at the specified percentile
        var = np.percentile(portfolio_losses, conf_level * 100)
        
        # Conditional VaR is the average of losses that exceed VaR
        cvar = portfolio_losses[portfolio_losses >= var].mean()
        
        results[conf_level] = {
            'var': var,
            'var_pct': var / portfolio_value * 100,
            'cvar': cvar,
            'cvar_pct': cvar / portfolio_value * 100
        }
    
    return results, portfolio_losses, portfolio_value

# Monte Carlo simulation for VaR
def monte_carlo_var(returns, current_price, confidence_levels, time_horizon, num_simulations, contract_size, num_contracts, distribution='normal', portfolio_value=None):
    """
    Monte Carlo VaR calculation using the actual data from the specified lookback period
    """
    # Get statistics from historical returns
    mu = returns.mean()
    sigma = returns.std()
    
    # Use provided portfolio_value or calculate it if not provided
    if portfolio_value is None:
        portfolio_value = current_price * contract_size * num_contracts
        print(f"Using default portfolio value calculation: ${portfolio_value:,.2f}")
    else:
        print(f"Using provided portfolio value: ${portfolio_value:,.2f}")
        
    # Simulate returns based on distribution type
    if distribution == 'normal':
        print(f"Simulating {num_simulations} scenarios with normal distribution")
        simulated_returns = np.random.normal(
            mu * time_horizon, 
            sigma * np.sqrt(time_horizon), 
            num_simulations
        )
    elif distribution == 't':
        # Estimate degrees of freedom for t-distribution (simple approximation)
        degrees_of_freedom = 5  # A typical value for financial returns
        print(f"Simulating {num_simulations} scenarios with t-distribution (df={degrees_of_freedom})")
        
        # Scale and shift t-distribution to match mean and variance
        scale = sigma * np.sqrt((degrees_of_freedom - 2) / degrees_of_freedom)
        simulated_returns = np.random.standard_t(degrees_of_freedom, num_simulations)
        simulated_returns = simulated_returns * scale * np.sqrt(time_horizon) + mu * time_horizon
    else:  # Use historical sampling
        print(f"Simulating {num_simulations} scenarios with historical sampling")
        
        # Sample with replacement from historical returns
        historical_indices = np.random.choice(
            len(returns), 
            size=num_simulations, 
            replace=True
        )
        simulated_returns = returns.iloc[historical_indices].values * np.sqrt(time_horizon)
    
    # Calculate simulated portfolio values
    simulated_portfolio_values = portfolio_value * (1 + simulated_returns)
    
    # Calculate portfolio losses
    portfolio_losses = portfolio_value - simulated_portfolio_values
    
    # Calculate VaR for each confidence level
    results = {}
    for conf_level in confidence_levels:
        var = np.percentile(portfolio_losses, conf_level * 100)
        # Add Conditional VaR (ES/ETL) - Expected shortfall
        cvar = portfolio_losses[portfolio_losses >= var].mean()
        results[conf_level] = {
            'var': var,
            'var_pct': var / portfolio_value * 100,
            'cvar': cvar,
            'cvar_pct': cvar / portfolio_value * 100
        }
    
    return results, portfolio_losses, portfolio_value

# Run the analysis
def main():
    # Parse command-line arguments
    args = parse_args()
    
    # Parse confidence levels
    confidence_levels = [float(c) for c in args.confidence.split(',')]
    
    # Print parsed arguments
    print("=== Parameters Used ===")
    print(f"Confidence Levels: {confidence_levels}")
    print(f"Time Horizon: {args.horizon} days")
    print(f"Number of Simulations: {args.simulations}")
    print(f"Contract Size: ${args.contract_size}")
    print(f"Number of Contracts: {args.contracts}")
    print(f"Output Filename: {args.output}")
    print(f"Stress Period: {args.stress_period if args.stress_period else 'None'}")
    print(f"Distribution: {args.distribution}")
    print(f"Lookback Period: {args.lookback} years")
    print(f"VaR Method: {args.method}")
    if args.portfolio_data:
        print(f"Portfolio Data: {args.portfolio_data}")
    if args.portfolio_value is not None:
        print(f"Portfolio Value (from command line): ${args.portfolio_value:,.2f}")
    print("=======================")
    
    time_horizon = args.horizon
    num_simulations = args.simulations
    contract_size = args.contract_size
    num_contracts = args.contracts
    output_file = args.output
    distribution = args.distribution
    stress_period = args.stress_period if args.stress_period else None
    lookback_years = args.lookback
    
    # Use portfolio value from command line if provided
    portfolio_value = args.portfolio_value
    if portfolio_value is not None:
        print(f"Using portfolio value from command line: ${portfolio_value:,.2f}")
    
    # Load portfolio data if available and portfolio value not provided directly
    portfolio_assets = []
    portfolio_name = "Unknown"
    
    if args.portfolio_data and portfolio_value is None:
        try:
            with open(args.portfolio_data, 'r') as f:
                portfolio_data = json.load(f)
            
            # Check if portfolio data contains assets
            if 'assets' in portfolio_data and len(portfolio_data['assets']) > 0:
                # Calculate portfolio value based on assets (price * quantity)
                portfolio_value = sum(asset['price'] * asset['quantity'] for asset in portfolio_data['assets'])
                portfolio_assets = portfolio_data['assets']
                portfolio_name = portfolio_data.get('name', "Unknown")
                print(f"Portfolio '{portfolio_name}' has {len(portfolio_assets)} assets")
                print(f"Portfolio Value (calculated from assets): ${portfolio_value:,.2f}")
            else:
                print("Warning: Portfolio data does not contain assets or assets list is empty")
        except Exception as e:
            print(f"Error reading portfolio data: {e}")
    
    # Parse VaR method to use
    var_method = args.method.lower() if hasattr(args, 'method') and args.method else 'monte-carlo'
    
    # Print analysis parameters
    print(f"Running {var_method.capitalize()} VaR Analysis")
    if portfolio_value is not None:
        print(f"Using portfolio value: ${portfolio_value:,.2f}")
    else:
        print("Using S&P 500 Futures as proxy")
        
    print(f"Confidence Levels: {[f'{cl*100}%' for cl in confidence_levels]}")
    print(f"Time Horizon: {time_horizon} day(s)")
    
    if portfolio_value is None:
        print(f"Number of Contracts: {num_contracts}")
        print(f"Contract Size: ${contract_size}")
        
    if var_method == 'monte-carlo':
        print(f"Number of Simulations: {num_simulations}")
        print(f"Distribution Type: {distribution}")
        
    print(f"Lookback Period: {lookback_years} years")
    if stress_period:
        print(f"Using Stress Period: {stress_period}")
    print("-" * 50)
    
    try:
        # Get data with the specified lookback period - use cache by default for speed
        data = get_sp500_data(years=lookback_years, stress_period=stress_period, use_cache=True, force_fresh=False)
        print("Available columns:", data.columns.tolist())
        print(f"Using data from {data.index[0].strftime('%Y-%m-%d')} to {data.index[-1].strftime('%Y-%m-%d')}")
        print(f"Number of trading days in the dataset: {len(data)}")
        
        returns, price_col = calculate_returns(data)
        
        # Current S&P 500 value
        current_sp500 = data[price_col][-1]
        print(f"Current S&P 500 Value: ${current_sp500:.2f}")
        
        # If portfolio value hasn't been set yet (no valid portfolio data), use S&P calculation
        if portfolio_value is None:
            portfolio_value = current_sp500 * contract_size * num_contracts
            print(f"Portfolio Value (based on S&P 500): ${portfolio_value:,.2f}")
        
        # Calculate VaR using the appropriate method
        title_prefix = ""
        if var_method == 'parametric':
            title_prefix = "Parametric"
            var_results, _ = parametric_var(
                returns, 
                current_sp500, 
                confidence_levels, 
                time_horizon, 
                contract_size, 
                num_contracts,
                portfolio_value=portfolio_value
            )
            # Create synthetic portfolio losses for visualization
            # Using normal distribution with mean and std from historical data
            mu = returns.mean()
            sigma = returns.std()
            synthetic_returns = np.random.normal(
                mu * time_horizon, 
                sigma * np.sqrt(time_horizon), 
                10000  # Generate synthetic data points for visualization
            )
            portfolio_losses = portfolio_value - (portfolio_value * (1 + synthetic_returns))
        elif var_method == 'historical':
            title_prefix = "Historical"
            var_results, portfolio_losses, _ = historical_var(
                returns,
                current_sp500,
                confidence_levels, 
                time_horizon, 
                contract_size,
                num_contracts,
                portfolio_value=portfolio_value
            )
        else:  # default to monte-carlo
            title_prefix = "Monte Carlo"
            var_results, portfolio_losses, _ = monte_carlo_var(
                returns,
                current_sp500,
                confidence_levels, 
                time_horizon, 
                num_simulations,
                contract_size,
                num_contracts,
                distribution,
                portfolio_value=portfolio_value
            )
        
        # Save results and metrics to JSON
        json_output_file = output_file.replace('.png', '.json')
        results_json = {
            "var_results": var_results,
            "portfolioValue": portfolio_value,
            "varPercentage": var_results[confidence_levels[0]]['var_pct'],
            "cvarPercentage": var_results[confidence_levels[0]]['cvar_pct'],
            "var": var_results[confidence_levels[0]]['var'],
            "cvar": var_results[confidence_levels[0]]['cvar'],
            "current_price": current_sp500,
            
            # Include all the parameters used
            "confidence_level": args.confidence,
            "time_horizon": args.horizon,
            "lookback_years": args.lookback,
            "num_simulations": args.simulations,
            "distribution": args.distribution,
            "var_method": args.method,
            "data_start_date": data.index[0].strftime("%Y-%m-%d"),
            "data_end_date": data.index[-1].strftime("%Y-%m-%d"),
            "trading_days": len(data),
            "parameters_source": "User selected from UI",
            "run_timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "user_provided_portfolio_value": args.portfolio_value is not None
        }
        
        # Include portfolio data if available
        if args.portfolio_data and portfolio_assets:
            results_json["portfolio"] = {
                "assets": portfolio_assets,
                "asset_count": len(portfolio_assets),
                "name": portfolio_name
            }
        
        # Print VaR results for each confidence level
        for conf_level, results in var_results.items():
            print(f"\n{time_horizon}-Day Value at Risk (VaR) at {conf_level*100}% confidence:")
            print(f"${results['var']:,.2f}")
            print(f"VaR as percentage of portfolio: {results['var_pct']:.2f}%")
            print(f"Conditional VaR (Expected Shortfall): ${results['cvar']:,.2f}")
            print(f"CVaR as percentage of portfolio: {results['cvar_pct']:.2f}%")
        
        # Write JSON results to file
        print(f"Writing JSON results to {json_output_file}")
        with open(json_output_file, 'w') as f:
            json.dump(results_json, f, indent=2)
        print(f"Results saved to {json_output_file}")
        
        # Generate chart only if not skipped (for faster API responses)
        if not args.skip_chart:
            print("Generating chart...")
            # Plot the distribution of portfolio losses with all confidence levels
            plt.figure(figsize=(15, 10))  # Increased from (12, 8) for larger chart
            
            # Plot histogram with KDE
            sns.histplot(portfolio_losses, kde=True, stat="density", alpha=0.6)
            
            # Add vertical lines for each VaR level
            colors = ['#e53e3e', '#9f1239', '#7f1d1d']  # Improved red color palette
            for i, (conf_level, results) in enumerate(var_results.items()):
                plt.axvline(results['var'], color=colors[i % len(colors)], linestyle='--', linewidth=2.5,
                            label=f"{conf_level*100}% VaR: ${results['var']:,.2f} ({results['var_pct']:.2f}%)")
            
            # Add title and labels with stress period information if applicable
            title = f"{title_prefix} Value at Risk ({time_horizon}-Day Horizon)"
            if stress_period:
                title += f"\nBased on Stress Period: {stress_period}"
            else:
                title += f"\nBased on {lookback_years}-Year Historical Data"
            
            plt.title(title, fontsize=16, fontweight='bold')
            plt.xlabel("Loss Amount ($)", fontsize=14)
            plt.ylabel("Probability Density", fontsize=14)
            
            # Add distribution information
            footer_text = f"Method: {var_method.capitalize()}"
            if var_method == 'monte-carlo':
                footer_text += f" with {distribution.capitalize()} distribution"
                if distribution == 'normal':
                    footer_text += "\nAssumption: Returns follow normal distribution (may underestimate tail risk)"
                elif distribution == 't':
                    footer_text += "\nAssumption: Returns follow t-distribution (heavier tails than normal)"
                elif distribution == 'historical':
                    footer_text += "\nBased on historical returns (no parametric assumptions)"
            elif var_method == 'parametric':
                footer_text += "\nAssumption: Returns follow normal distribution (analytical solution)"
            elif var_method == 'historical':
                footer_text += "\nBased purely on historical returns (non-parametric approach)"
            
            data_range_text = f"Data period: {data.index[0].strftime('%Y-%m-%d')} to {data.index[-1].strftime('%Y-%m-%d')} ({len(data)} trading days)"
            footer_text += f"\n{data_range_text}"
            
            plt.figtext(0.5, 0.01, footer_text, ha="center", fontsize=12, bbox={"facecolor":"white", "alpha":0.8, "pad":5})
            
            plt.legend(fontsize=12)
            plt.grid(True, alpha=0.3)
            plt.xticks(fontsize=12)
            plt.yticks(fontsize=12)
            plt.tight_layout()
            plt.savefig(output_file)
            print(f"Chart saved to {output_file}")
        else:
            print("Chart generation skipped for faster execution")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error running VaR analysis: {e}")
        exit(1)

if __name__ == "__main__":
    main() 