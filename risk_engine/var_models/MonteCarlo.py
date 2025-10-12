import numpy as np
import pandas as pd
import yfinance as yf
import matplotlib.pyplot as plt
from scipy.stats import norm
import seaborn as sns
from datetime import datetime, timedelta
import requests
import json
import sys
import os
import logging
import base64
from io import BytesIO

# Import market data helper for fallback fetching
try:
    from .market_data_helper import get_historical_prices_with_fallback
except ImportError:
    from market_data_helper import get_historical_prices_with_fallback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('monte_carlo_var')

# Default Parameters
confidence_level = 0.95
time_horizon = 1  # days
num_simulations = 50000
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
            
        # Parse and validate simulation count
        sims = int(params.get('numSimulations', 50000))
        if sims < 10000:
            logger.warning(f"Number of simulations {sims} is too low, using minimum of 10000")
            sims = 10000
        elif sims > 500000:
            logger.warning(f"Number of simulations {sims} is too high, using maximum of 500000")
            sims = 500000
            
        return {
            'confidence_level': float(params.get('confidenceLevel', 0.95)),
            'time_horizon': int(params.get('timeHorizon', 1)),
            'num_simulations': sims,
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
    Get historical prices using fallback strategy (Tiingo -> yfinance -> synthetic).
    """
    # Validate lookback period
    years = max(MIN_LOOKBACK, min(MAX_LOOKBACK, years))
    
    try:
        # Use helper with fallback strategy
        data = get_historical_prices_with_fallback(symbols, years)
        
        # Check data quality
        if isinstance(data, pd.DataFrame):
            missing_pct = data.isna().mean().mean() * 100
            if missing_pct > 5:
                logger.warning(f"Warning: {missing_pct:.1f}% of price data is missing")
        
        # Ensure we have enough data
        if len(data) < 252:  # Approximately 1 year of trading days
            logger.warning(f"Limited historical data available: only {len(data)} trading days")
        
        return data
    except Exception as e:
        logger.error(f"Error fetching historical prices: {e}")
        raise

def calculate_portfolio_returns(portfolio, price_data):
    """
    Calculate individual asset returns and portfolio weights.
    Returns both for use in Cholesky-based simulation.
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
    
    # Calculate individual asset returns (don't combine yet)
    returns = price_data[symbols].pct_change().dropna()
    
    return returns, weights, symbols

def monte_carlo_var_cholesky(asset_returns, weights, current_value, confidence_level, time_horizon, num_simulations):
    """
    Calculate Monte Carlo VaR using Cholesky decomposition for correlated asset returns.
    This provides more accurate simulation by preserving correlation structure.
    """
    # Calculate distribution parameters for each asset
    mu = asset_returns.mean().values  # Mean returns for each asset
    cov_matrix = asset_returns.cov().values  # Covariance matrix
    
    # Validate covariance matrix
    if not np.allclose(cov_matrix, cov_matrix.T):
        logger.warning("Covariance matrix is not symmetric, making it symmetric")
        cov_matrix = (cov_matrix + cov_matrix.T) / 2
    
    # Add small regularization to diagonal to ensure positive definiteness
    min_eigenvalue = np.min(np.linalg.eigvals(cov_matrix))
    if min_eigenvalue <= 0:
        regularization = abs(min_eigenvalue) + 1e-8
        cov_matrix += regularization * np.eye(len(cov_matrix))
        logger.warning(f"Added regularization {regularization:.2e} to covariance matrix")
    
    # Cholesky decomposition
    try:
        L = np.linalg.cholesky(cov_matrix)
        logger.info("Successfully computed Cholesky decomposition")
    except np.linalg.LinAlgError:
        logger.error("Cholesky decomposition failed, using eigenvalue decomposition instead")
        # Fallback to eigenvalue decomposition
        eigenvals, eigenvecs = np.linalg.eigh(cov_matrix)
        eigenvals = np.maximum(eigenvals, 1e-8)  # Ensure positive eigenvalues
        L = eigenvecs @ np.diag(np.sqrt(eigenvals))
    
    # Set random seed for reproducibility
    np.random.seed(42)
    
    # Generate correlated returns using Cholesky decomposition
    num_assets = len(mu)
    
    # Generate independent random variables
    Z = np.random.normal(0, 1, (num_assets, num_simulations))
    
    # Transform to correlated variables
    # For each simulation, generate correlated returns: R = μ + L * Z
    mu_expanded = np.tile(mu.reshape(-1, 1), (1, num_simulations))
    correlated_returns = mu_expanded * time_horizon + L @ Z * np.sqrt(time_horizon)
    
    # Calculate portfolio returns for each simulation
    portfolio_returns = weights @ correlated_returns
    
    # Apply returns to portfolio value
    simulated_portfolio_values = current_value * (1 + portfolio_returns)
    
    # Calculate losses
    portfolio_losses = current_value - simulated_portfolio_values
    
    # Calculate VaR
    var = np.percentile(portfolio_losses, confidence_level * 100)
    
    # Calculate Conditional VaR (Expected Shortfall)
    cvar = portfolio_losses[portfolio_losses >= var].mean()
    
    # Basic statistics for reporting
    min_loss = portfolio_losses.min()
    max_loss = portfolio_losses.max()
    mean_loss = portfolio_losses.mean()
    median_loss = np.median(portfolio_losses)
    
    # Additional correlation statistics
    correlation_matrix = asset_returns.corr().values
    avg_correlation = np.mean(correlation_matrix[np.triu_indices_from(correlation_matrix, k=1)])
    
    stats = {
        'min_loss': min_loss,
        'max_loss': max_loss,
        'mean_loss': mean_loss,
        'median_loss': median_loss,
        'avg_correlation': avg_correlation,
        'num_assets': num_assets,
        'portfolio_volatility': np.sqrt(weights.T @ cov_matrix @ weights) * np.sqrt(252),  # Annualized
        'individual_volatilities': np.sqrt(np.diag(cov_matrix)) * np.sqrt(252)  # Annualized
    }
    
    return var, cvar, portfolio_losses, current_value, stats, correlation_matrix

def calculate_var(portfolio_assets, confidence=0.95, horizon=1, n_simulations=50000, lookback_years=5):
    """
    Wrapper function for API compatibility
    Calculates VaR for a portfolio given as a list of asset dictionaries using Monte Carlo simulation
    """
    try:
        # Convert portfolio_assets to DataFrame
        portfolio_df = pd.DataFrame(portfolio_assets)
        
        # Get symbols and fetch price data
        symbols = portfolio_df['symbol'].tolist()
        price_data = get_historical_prices(symbols, years=lookback_years)
        
        # Calculate asset returns
        asset_returns = price_data.pct_change().dropna()
        
        # Calculate weights based on current positions
        portfolio_value = (portfolio_df['quantity'] * portfolio_df['price']).sum()
        weights = (portfolio_df['quantity'] * portfolio_df['price']) / portfolio_value
        weights = weights.values
        
        # Calculate VaR using Cholesky method
        var, cvar, portfolio_losses, current_value, stats, correlation_matrix = monte_carlo_var_cholesky(
            asset_returns,
            weights,
            portfolio_value,
            confidence,
            horizon,
            n_simulations
        )
        
        # Generate chart and encode as base64
        chart_base64 = None
        try:
            plt.figure(figsize=(10, 6))
            
            # Plot histogram of simulated losses
            n, bins, patches = plt.hist(portfolio_losses, bins=50, alpha=0.7, density=True, color='skyblue', edgecolor='black')
            
            # Color the tail losses in red
            tail_idx = np.where(bins > var)[0]
            if len(tail_idx) > 0:
                for i in range(tail_idx[0], len(patches)):
                    patches[i].set_facecolor('salmon')
            
            # Add vertical lines for VaR and CVaR
            plt.axvline(var, color='red', linestyle='--', linewidth=2, 
                        label=f'VaR ({confidence*100:.0f}%): ${var:,.2f} ({var/portfolio_value*100:.2f}%)')
            plt.axvline(cvar, color='darkred', linestyle='-.', linewidth=2,
                        label=f'CVaR: ${cvar:,.2f} ({cvar/portfolio_value*100:.2f}%)')
            
            plt.title(f'Monte Carlo VaR Analysis - Cholesky Method\n({horizon}-Day Horizon, {n_simulations:,} Simulations)', fontsize=14)
            plt.xlabel('Loss Amount ($)', fontsize=12)
            plt.ylabel('Probability Density', fontsize=12)
            plt.grid(True, alpha=0.3)
            plt.legend(fontsize=10)
            
            # Add text with key metrics
            info_text = (
                f"Portfolio Value: ${portfolio_value:,.2f}\n"
                f"Avg Correlation: {stats.get('avg_correlation', 0):.3f}\n"
                f"Assets: {len(portfolio_df)}"
            )
            plt.figtext(0.15, 0.01, info_text, fontsize=10, bbox=dict(facecolor='white', alpha=0.8))
            
            plt.tight_layout(rect=[0, 0.03, 1, 0.97])
            
            # Save to BytesIO and encode as base64
            buffer = BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            buffer.seek(0)
            chart_base64 = base64.b64encode(buffer.read()).decode('utf-8')
            buffer.close()
            
            # Also save to file for Railway filesystem backup
            plt.savefig("monte_carlo_var.png", dpi=150)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            plt.savefig(f"monte_carlo_var_{timestamp}.png", dpi=150)
            
            plt.close()
            logger.info("Chart generated and encoded as base64")
        except Exception as e:
            logger.error(f"Error generating chart: {e}")
            chart_base64 = None
        
        # Return results in standard format
        return {
            'results': {
                'var': var,
                'cvar': cvar,
                'portfolio_value': portfolio_value,
                'var_percentage': (var / portfolio_value) * 100,
                'cvar_percentage': (cvar / portfolio_value) * 100,
                'confidence_level': confidence,
                'time_horizon': horizon,
                'num_simulations': n_simulations,
                'lookback_years': lookback_years
            },
            'chart_url': 'monte_carlo_var.png',
            'chart_base64': chart_base64
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
    ns = params['num_simulations'] if params else num_simulations
    lp = params['lookback_period'] if params else lookback_period
    portfolio_id = params['portfolio_id'] if params else '1'
    api_url = f"http://localhost:8000/api/portfolio/{portfolio_id}"

    logger.info(f"Running Enhanced Monte Carlo VaR Analysis with Cholesky Decomposition")
    logger.info(f"Confidence Level: {cl*100}%")
    logger.info(f"Time Horizon: {th} day(s)")
    logger.info(f"Number of Simulations: {ns:,}")
    logger.info(f"Lookback Period: {lp} year(s)")
    logger.info("-" * 60)
    
    try:
        portfolio = load_portfolio_from_api(api_url)
        symbols = portfolio['symbol'].tolist()
        price_data = get_historical_prices(symbols, years=lp)
        
        # Get individual asset returns and weights
        asset_returns, weights, matched_symbols = calculate_portfolio_returns(portfolio, price_data)
        
        # Use latest prices for portfolio value
        portfolio_value = (portfolio['quantity'] * portfolio['price']).sum()
        logger.info(f"Portfolio Value: ${portfolio_value:,.2f}")
        logger.info(f"Number of Assets: {len(matched_symbols)}")
        logger.info(f"Assets: {', '.join(matched_symbols)}")
        
        # Run enhanced Monte Carlo with Cholesky decomposition
        var, cvar, portfolio_losses, portfolio_value, stats, correlation_matrix = monte_carlo_var_cholesky(
            asset_returns,
            weights,
            portfolio_value,
            cl,
            th,
            ns
        )
        
        logger.info(f"\n{th}-Day Value at Risk (VaR) at {cl*100}% confidence:")
        logger.info(f"VaR: ${var:,.2f}")
        logger.info(f"CVaR (Expected Shortfall): ${cvar:,.2f}")
        logger.info(f"VaR as percentage of portfolio: {var/portfolio_value*100:.2f}%")
        logger.info(f"CVaR as percentage of portfolio: {cvar/portfolio_value*100:.2f}%")
        
        # Enhanced statistics
        logger.info(f"\nPortfolio Risk Statistics:")
        logger.info(f"Portfolio Volatility (Annualized): {stats['portfolio_volatility']*100:.2f}%")
        logger.info(f"Average Asset Correlation: {stats['avg_correlation']:.3f}")
        logger.info(f"Number of Assets: {stats['num_assets']}")
        
        logger.info(f"\nLoss Distribution Statistics:")
        logger.info(f"Min Loss: ${stats['min_loss']:,.2f}")
        logger.info(f"Max Loss: ${stats['max_loss']:,.2f}")
        logger.info(f"Mean Loss: ${stats['mean_loss']:,.2f}")
        logger.info(f"Median Loss: ${stats['median_loss']:,.2f}")
        
        # Enhanced visualization with correlation heatmap
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
        
        # Main VaR distribution plot
        ax1.hist(portfolio_losses, bins=50, density=True, alpha=0.7, color='skyblue', edgecolor='black')
        ax1.axvline(var, color='red', linestyle='--', linewidth=2, 
                   label=f"VaR ({cl*100:.0f}%): ${var:,.2f}")
        ax1.axvline(cvar, color='darkred', linestyle='-.', linewidth=2,
                   label=f"CVaR: ${cvar:,.2f}")
        ax1.set_title(f"Monte Carlo VaR Distribution (Cholesky Enhanced)", fontsize=12)
        ax1.set_xlabel("Loss Amount ($)")
        ax1.set_ylabel("Probability Density")
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # Correlation heatmap
        im = ax2.imshow(correlation_matrix, cmap='RdYlBu_r', aspect='auto', vmin=-1, vmax=1)
        ax2.set_title("Asset Correlation Matrix", fontsize=12)
        ax2.set_xticks(range(len(matched_symbols)))
        ax2.set_yticks(range(len(matched_symbols)))
        ax2.set_xticklabels(matched_symbols, rotation=45)
        ax2.set_yticklabels(matched_symbols)
        
        # Add correlation values to heatmap
        for i in range(len(matched_symbols)):
            for j in range(len(matched_symbols)):
                ax2.text(j, i, f'{correlation_matrix[i, j]:.2f}',
                        ha="center", va="center", color="black", fontsize=8)
        
        plt.colorbar(im, ax=ax2, shrink=0.8)
        
        # Portfolio weights pie chart
        ax3.pie(weights, labels=matched_symbols, autopct='%1.1f%%', startangle=90)
        ax3.set_title("Portfolio Weights", fontsize=12)
        
        # Individual asset volatilities
        ax4.bar(matched_symbols, stats['individual_volatilities']*100, color='lightcoral', alpha=0.7)
        ax4.set_title("Individual Asset Volatilities (Annualized)", fontsize=12)
        ax4.set_ylabel("Volatility (%)")
        ax4.tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        plt.savefig("monte_carlo_var_enhanced.png", dpi=150, bbox_inches='tight')
        
        # Save with timestamp for archiving
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        plt.savefig(f"monte_carlo_var_enhanced_{timestamp}.png", dpi=150, bbox_inches='tight')
        
        logger.info(f"Enhanced charts saved as monte_carlo_var_enhanced.png")
        plt.show()
        
        # Save enhanced results to JSON
        results = {
            "var": float(var),
            "cvar": float(cvar),
            "varPercentage": float(var/portfolio_value*100),
            "cvarPercentage": float(cvar/portfolio_value*100),
            "portfolioValue": float(portfolio_value),
            "lookbackPeriod": lp,
            "confidenceLevel": cl,
            "timeHorizon": th,
            "numSimulations": ns,
            "enhancedStatistics": {
                "min_loss": float(stats['min_loss']),
                "max_loss": float(stats['max_loss']),
                "mean_loss": float(stats['mean_loss']),
                "median_loss": float(stats['median_loss']),
                "avg_correlation": float(stats['avg_correlation']),
                "portfolio_volatility": float(stats['portfolio_volatility']),
                "num_assets": int(stats['num_assets']),
                "individual_volatilities": [float(x) for x in stats['individual_volatilities']],
                "asset_symbols": matched_symbols,
                "portfolio_weights": [float(x) for x in weights]
            },
            "correlationMatrix": correlation_matrix.tolist(),
            "methodology": "Cholesky Decomposition",
            "timestamp": datetime.now().isoformat()
        }
        
        with open("monte_carlo_var_enhanced_results.json", "w") as f:
            json.dump(results, f, indent=2)
        logger.info("Enhanced results saved to monte_carlo_var_enhanced_results.json")
        
    except Exception as e:
        logger.error(f"Error running Enhanced Monte Carlo VaR analysis: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
