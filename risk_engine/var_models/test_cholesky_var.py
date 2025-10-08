#!/usr/bin/env python3
"""
Test script for Cholesky-enhanced Monte Carlo VaR simulation.
This demonstrates the correlation modeling capabilities without requiring the API server.
"""

import numpy as np
import pandas as pd
import yfinance as yf
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger('cholesky_var_test')

def create_sample_portfolio():
    """Create a sample portfolio for testing."""
    portfolio_data = {
        'symbol': ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'],
        'quantity': [100, 50, 75, 25, 30],
        'price': [180.00, 140.00, 380.00, 150.00, 200.00]  # Sample prices
    }
    return pd.DataFrame(portfolio_data)

def get_historical_prices(symbols, years=5):
    """Get historical prices for the given symbols."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=int(years*365.25))
    
    logger.info(f"Fetching historical prices for {len(symbols)} symbols...")
    
    try:
        data = yf.download(symbols, start=start_date, end=end_date, progress=False)['Adj Close']
        
        # Handle single symbol case
        if len(symbols) == 1:
            data = pd.DataFrame({symbols[0]: data})
        
        # Forward fill missing values
        data = data.ffill()
        
        # Drop any completely empty columns
        data = data.dropna(axis=1, how='all')
        
        logger.info(f"Successfully fetched {len(data)} days of data for {len(data.columns)} symbols")
        return data
    except Exception as e:
        logger.error(f"Error fetching historical prices: {e}")
        raise

def calculate_portfolio_data(portfolio, price_data):
    """Calculate individual asset returns and portfolio weights."""
    # Filter portfolio to only include symbols with price data
    available_symbols = set(price_data.columns)
    portfolio_filtered = portfolio[portfolio['symbol'].isin(available_symbols)]
    
    if portfolio_filtered.empty:
        raise ValueError("No portfolio symbols found in price data")
    
    # Calculate weights based on portfolio values
    portfolio_filtered['value'] = portfolio_filtered['quantity'] * portfolio_filtered['price']
    total_value = portfolio_filtered['value'].sum()
    weights = portfolio_filtered['value'].values / total_value
    symbols = portfolio_filtered['symbol'].tolist()
    
    # Calculate individual asset returns
    returns = price_data[symbols].pct_change().dropna()
    
    return returns, weights, symbols, total_value

def monte_carlo_var_cholesky(asset_returns, weights, current_value, confidence_level=0.95, 
                           time_horizon=1, num_simulations=50000):
    """
    Enhanced Monte Carlo VaR using Cholesky decomposition for correlation modeling.
    """
    logger.info("Starting Cholesky-enhanced Monte Carlo VaR calculation...")
    
    # Calculate distribution parameters
    mu = asset_returns.mean().values
    cov_matrix = asset_returns.cov().values
    
    # Validate and fix covariance matrix
    if not np.allclose(cov_matrix, cov_matrix.T):
        logger.warning("Making covariance matrix symmetric")
        cov_matrix = (cov_matrix + cov_matrix.T) / 2
    
    # Ensure positive definiteness
    min_eigenvalue = np.min(np.linalg.eigvals(cov_matrix))
    if min_eigenvalue <= 0:
        regularization = abs(min_eigenvalue) + 1e-8
        cov_matrix += regularization * np.eye(len(cov_matrix))
        logger.warning(f"Added regularization {regularization:.2e} to ensure positive definiteness")
    
    # Cholesky decomposition
    try:
        L = np.linalg.cholesky(cov_matrix)
        logger.info("✓ Successfully computed Cholesky decomposition")
    except np.linalg.LinAlgError:
        logger.warning("Cholesky failed, using eigenvalue decomposition")
        eigenvals, eigenvecs = np.linalg.eigh(cov_matrix)
        eigenvals = np.maximum(eigenvals, 1e-8)
        L = eigenvecs @ np.diag(np.sqrt(eigenvals))
    
    # Generate correlated random returns
    np.random.seed(42)
    num_assets = len(mu)
    
    # Independent standard normal random variables
    Z = np.random.normal(0, 1, (num_assets, num_simulations))
    
    # Transform to correlated returns: R = μ + L * Z
    mu_expanded = np.tile(mu.reshape(-1, 1), (1, num_simulations))
    correlated_returns = mu_expanded * time_horizon + L @ Z * np.sqrt(time_horizon)
    
    # Calculate portfolio returns
    portfolio_returns = weights @ correlated_returns
    
    # Calculate portfolio values and losses
    simulated_values = current_value * (1 + portfolio_returns)
    portfolio_losses = current_value - simulated_values
    
    # Calculate VaR and CVaR
    var = np.percentile(portfolio_losses, confidence_level * 100)
    cvar = portfolio_losses[portfolio_losses >= var].mean()
    
    # Calculate statistics
    correlation_matrix = asset_returns.corr().values
    avg_correlation = np.mean(correlation_matrix[np.triu_indices_from(correlation_matrix, k=1)])
    
    stats = {
        'var': var,
        'cvar': cvar,
        'var_percentage': var / current_value * 100,
        'cvar_percentage': cvar / current_value * 100,
        'min_loss': portfolio_losses.min(),
        'max_loss': portfolio_losses.max(),
        'mean_loss': portfolio_losses.mean(),
        'median_loss': np.median(portfolio_losses),
        'avg_correlation': avg_correlation,
        'portfolio_volatility': np.sqrt(weights.T @ cov_matrix @ weights) * np.sqrt(252),
        'individual_volatilities': np.sqrt(np.diag(cov_matrix)) * np.sqrt(252)
    }
    
    return portfolio_losses, correlation_matrix, stats

def create_visualization(portfolio_losses, correlation_matrix, stats, symbols, weights, 
                        confidence_level, num_simulations):
    """Create comprehensive visualization of results."""
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
    
    # VaR distribution
    ax1.hist(portfolio_losses, bins=50, density=True, alpha=0.7, color='skyblue', edgecolor='black')
    ax1.axvline(stats['var'], color='red', linestyle='--', linewidth=2, 
               label=f"VaR ({confidence_level*100:.0f}%): ${stats['var']:,.2f}")
    ax1.axvline(stats['cvar'], color='darkred', linestyle='-.', linewidth=2,
               label=f"CVaR: ${stats['cvar']:,.2f}")
    ax1.set_title("Monte Carlo VaR Distribution (Cholesky Enhanced)", fontsize=14)
    ax1.set_xlabel("Loss Amount ($)")
    ax1.set_ylabel("Probability Density")
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Correlation heatmap
    im = ax2.imshow(correlation_matrix, cmap='RdYlBu_r', aspect='auto', vmin=-1, vmax=1)
    ax2.set_title("Asset Correlation Matrix", fontsize=14)
    ax2.set_xticks(range(len(symbols)))
    ax2.set_yticks(range(len(symbols)))
    ax2.set_xticklabels(symbols, rotation=45)
    ax2.set_yticklabels(symbols)
    
    # Add correlation values
    for i in range(len(symbols)):
        for j in range(len(symbols)):
            ax2.text(j, i, f'{correlation_matrix[i, j]:.2f}',
                    ha="center", va="center", color="white" if abs(correlation_matrix[i, j]) > 0.5 else "black")
    
    plt.colorbar(im, ax=ax2, shrink=0.8)
    
    # Portfolio weights
    ax3.pie(weights, labels=symbols, autopct='%1.1f%%', startangle=90, colors=plt.cm.Set3(np.linspace(0, 1, len(symbols))))
    ax3.set_title("Portfolio Weights", fontsize=14)
    
    # Individual asset volatilities
    ax4.bar(symbols, stats['individual_volatilities']*100, color='lightcoral', alpha=0.7)
    ax4.set_title("Individual Asset Volatilities (Annualized)", fontsize=14)
    ax4.set_ylabel("Volatility (%)")
    ax4.tick_params(axis='x', rotation=45)
    
    # Add summary text
    summary_text = (
        f"Portfolio Statistics:\n"
        f"• VaR ({confidence_level*100:.0f}%): ${stats['var']:,.2f} ({stats['var_percentage']:.2f}%)\n"
        f"• CVaR: ${stats['cvar']:,.2f} ({stats['cvar_percentage']:.2f}%)\n"
        f"• Portfolio Volatility: {stats['portfolio_volatility']*100:.2f}%\n"
        f"• Average Correlation: {stats['avg_correlation']:.3f}\n"
        f"• Simulations: {num_simulations:,}"
    )
    
    fig.text(0.02, 0.02, summary_text, fontsize=10, 
             bbox=dict(boxstyle="round,pad=0.3", facecolor="lightblue", alpha=0.8))
    
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.15)
    
    return fig

def main():
    """Main function to run the Cholesky VaR test."""
    print("🚀 Testing Cholesky-Enhanced Monte Carlo VaR Analysis")
    print("=" * 60)
    
    # Parameters
    confidence_level = 0.95
    time_horizon = 1
    num_simulations = 50000
    lookback_years = 2
    
    try:
        # Create sample portfolio
        portfolio = create_sample_portfolio()
        logger.info(f"Created sample portfolio with {len(portfolio)} assets")
        print(f"\nSample Portfolio:")
        print(portfolio.to_string(index=False))
        
        # Get historical data
        symbols = portfolio['symbol'].tolist()
        price_data = get_historical_prices(symbols, years=lookback_years)
        
        # Calculate portfolio data
        asset_returns, weights, matched_symbols, portfolio_value = calculate_portfolio_data(portfolio, price_data)
        
        print(f"\nPortfolio Summary:")
        print(f"• Total Value: ${portfolio_value:,.2f}")
        print(f"• Assets: {len(matched_symbols)}")
        print(f"• Matched Symbols: {', '.join(matched_symbols)}")
        print(f"• Weights: {[f'{w:.1%}' for w in weights]}")
        
        # Run Cholesky Monte Carlo VaR
        print(f"\n🎯 Running {num_simulations:,} Monte Carlo simulations with Cholesky decomposition...")
        
        portfolio_losses, correlation_matrix, stats = monte_carlo_var_cholesky(
            asset_returns, weights, portfolio_value, confidence_level, time_horizon, num_simulations
        )
        
        # Display results
        print(f"\n📊 Results:")
        print(f"• VaR ({confidence_level*100:.0f}%): ${stats['var']:,.2f} ({stats['var_percentage']:.2f}%)")
        print(f"• CVaR (Expected Shortfall): ${stats['cvar']:,.2f} ({stats['cvar_percentage']:.2f}%)")
        print(f"• Portfolio Volatility (Annual): {stats['portfolio_volatility']*100:.2f}%")
        print(f"• Average Asset Correlation: {stats['avg_correlation']:.3f}")
        print(f"• Worst Case Loss: ${stats['max_loss']:,.2f}")
        print(f"• Best Case Loss: ${stats['min_loss']:,.2f}")
        
        # Create visualization
        fig = create_visualization(portfolio_losses, correlation_matrix, stats, 
                                 matched_symbols, weights, confidence_level, num_simulations)
        
        # Save results
        plt.savefig("cholesky_var_test_results.png", dpi=150, bbox_inches='tight')
        logger.info("✓ Visualization saved as cholesky_var_test_results.png")
        
        # Save detailed results to JSON
        results = {
            "methodology": "Cholesky Decomposition Monte Carlo VaR",
            "portfolio_value": float(portfolio_value),
            "var": float(stats['var']),
            "cvar": float(stats['cvar']),
            "var_percentage": float(stats['var_percentage']),
            "cvar_percentage": float(stats['cvar_percentage']),
            "portfolio_volatility": float(stats['portfolio_volatility']),
            "avg_correlation": float(stats['avg_correlation']),
            "assets": matched_symbols,
            "weights": [float(w) for w in weights],
            "correlation_matrix": correlation_matrix.tolist(),
            "individual_volatilities": [float(v) for v in stats['individual_volatilities']],
            "parameters": {
                "confidence_level": confidence_level,
                "time_horizon": time_horizon,
                "num_simulations": num_simulations,
                "lookback_years": lookback_years
            },
            "timestamp": datetime.now().isoformat()
        }
        
        with open("cholesky_var_test_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        logger.info("✓ Detailed results saved to cholesky_var_test_results.json")
        
        plt.show()
        
        print(f"\n✅ Cholesky VaR analysis completed successfully!")
        print(f"📁 Files saved: cholesky_var_test_results.png, cholesky_var_test_results.json")
        
    except Exception as e:
        logger.error(f"Error in Cholesky VaR test: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 