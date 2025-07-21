#!/usr/bin/env python3
"""
Demonstration of Cholesky Decomposition in Monte Carlo VaR Analysis
This script uses simulated data to show the power of correlation modeling.
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
import json

# Set random seed for reproducible results
np.random.seed(42)

def simulate_correlated_asset_returns(n_assets=5, n_days=1000, correlations=None):
    """
    Simulate correlated asset returns using a specified correlation structure.
    """
    print(f"📈 Simulating {n_days} days of returns for {n_assets} assets...")
    
    # Asset parameters (annual means and volatilities)
    asset_names = ['Tech Stock A', 'Tech Stock B', 'Bank Stock', 'Energy Stock', 'Utility Stock'][:n_assets]
    annual_means = [0.12, 0.15, 0.08, 0.06, 0.04][:n_assets]  # Annual expected returns
    annual_vols = [0.30, 0.35, 0.25, 0.40, 0.15][:n_assets]   # Annual volatilities
    
    # Convert to daily parameters
    daily_means = np.array(annual_means) / 252
    daily_vols = np.array(annual_vols) / np.sqrt(252)
    
    # Create correlation matrix if not provided
    if correlations is None:
        # Create realistic correlation structure
        correlations = np.array([
            [1.00, 0.75, 0.30, 0.20, 0.10],  # Tech A correlations
            [0.75, 1.00, 0.25, 0.15, 0.05],  # Tech B correlations  
            [0.30, 0.25, 1.00, 0.40, 0.35],  # Bank correlations
            [0.20, 0.15, 0.40, 1.00, 0.20],  # Energy correlations
            [0.10, 0.05, 0.35, 0.20, 1.00]   # Utility correlations
        ])[:n_assets, :n_assets]
    
    # Create covariance matrix from correlations and volatilities
    cov_matrix = np.outer(daily_vols, daily_vols) * correlations
    
    # Generate correlated returns using multivariate normal distribution
    returns = np.random.multivariate_normal(daily_means, cov_matrix, n_days)
    
    # Create DataFrame
    returns_df = pd.DataFrame(returns, columns=asset_names)
    
    print(f"✓ Generated returns with average correlation: {np.mean(correlations[np.triu_indices_from(correlations, k=1)]):.3f}")
    
    return returns_df, correlations, asset_names, daily_means, daily_vols

def monte_carlo_var_comparison(asset_returns, weights, portfolio_value, confidence_level=0.95, 
                             time_horizon=1, num_simulations=50000):
    """
    Compare VaR calculations with and without Cholesky decomposition.
    """
    print(f"🎯 Running Monte Carlo VaR comparison ({num_simulations:,} simulations)...")
    
    # Method 1: Traditional approach (treat portfolio as single asset)
    portfolio_returns_historical = asset_returns.dot(weights)
    mu_simple = portfolio_returns_historical.mean()
    sigma_simple = portfolio_returns_historical.std()
    
    # Generate simple portfolio returns
    np.random.seed(42)
    simple_returns = np.random.normal(
        mu_simple * time_horizon,
        sigma_simple * np.sqrt(time_horizon),
        num_simulations
    )
    simple_losses = portfolio_value * (1 - (1 + simple_returns))
    simple_var = np.percentile(simple_losses, confidence_level * 100)
    simple_cvar = simple_losses[simple_losses >= simple_var].mean()
    
    # Method 2: Cholesky decomposition approach
    mu = asset_returns.mean().values
    cov_matrix = asset_returns.cov().values
    
    # Ensure positive definiteness
    min_eigenvalue = np.min(np.linalg.eigvals(cov_matrix))
    if min_eigenvalue <= 0:
        regularization = abs(min_eigenvalue) + 1e-8
        cov_matrix += regularization * np.eye(len(cov_matrix))
    
    # Cholesky decomposition
    L = np.linalg.cholesky(cov_matrix)
    
    # Generate correlated returns
    np.random.seed(42)
    Z = np.random.normal(0, 1, (len(mu), num_simulations))
    mu_expanded = np.tile(mu.reshape(-1, 1), (1, num_simulations))
    correlated_returns = mu_expanded * time_horizon + L @ Z * np.sqrt(time_horizon)
    
    # Portfolio returns and losses
    cholesky_portfolio_returns = weights @ correlated_returns
    cholesky_losses = portfolio_value * (1 - (1 + cholesky_portfolio_returns))
    cholesky_var = np.percentile(cholesky_losses, confidence_level * 100)
    cholesky_cvar = cholesky_losses[cholesky_losses >= cholesky_var].mean()
    
    # Calculate portfolio statistics
    portfolio_vol = np.sqrt(weights.T @ cov_matrix @ weights) * np.sqrt(252)
    correlation_matrix = asset_returns.corr().values
    avg_correlation = np.mean(correlation_matrix[np.triu_indices_from(correlation_matrix, k=1)])
    
    results = {
        'simple': {
            'var': simple_var,
            'cvar': simple_cvar,
            'losses': simple_losses,
            'method': 'Traditional (Single Asset)'
        },
        'cholesky': {
            'var': cholesky_var,
            'cvar': cholesky_cvar,
            'losses': cholesky_losses,
            'method': 'Cholesky Decomposition'
        },
        'portfolio_stats': {
            'portfolio_volatility': portfolio_vol,
            'avg_correlation': avg_correlation,
            'correlation_matrix': correlation_matrix
        }
    }
    
    return results

def create_comparison_visualization(results, asset_names, weights, portfolio_value, confidence_level):
    """Create comprehensive comparison visualization."""
    fig = plt.figure(figsize=(20, 12))
    
    # Create grid layout
    gs = fig.add_gridspec(3, 4, hspace=0.3, wspace=0.3)
    
    # VaR distribution comparison
    ax1 = fig.add_subplot(gs[0, :2])
    ax1.hist(results['simple']['losses'], bins=50, alpha=0.6, color='lightcoral', 
             label=f"Traditional: VaR=${results['simple']['var']:,.0f}", density=True)
    ax1.hist(results['cholesky']['losses'], bins=50, alpha=0.6, color='skyblue', 
             label=f"Cholesky: VaR=${results['cholesky']['var']:,.0f}", density=True)
    ax1.axvline(results['simple']['var'], color='red', linestyle='--', linewidth=2)
    ax1.axvline(results['cholesky']['var'], color='blue', linestyle='--', linewidth=2)
    ax1.set_title("VaR Distribution Comparison", fontsize=14, fontweight='bold')
    ax1.set_xlabel("Loss Amount ($)")
    ax1.set_ylabel("Probability Density")
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    
    # Correlation heatmap
    ax2 = fig.add_subplot(gs[0, 2:])
    correlation_matrix = results['portfolio_stats']['correlation_matrix']
    im = ax2.imshow(correlation_matrix, cmap='RdYlBu_r', aspect='auto', vmin=-1, vmax=1)
    ax2.set_title("Asset Correlation Matrix", fontsize=14, fontweight='bold')
    ax2.set_xticks(range(len(asset_names)))
    ax2.set_yticks(range(len(asset_names)))
    ax2.set_xticklabels(asset_names, rotation=45, ha='right')
    ax2.set_yticklabels(asset_names)
    
    # Add correlation values
    for i in range(len(asset_names)):
        for j in range(len(asset_names)):
            color = "white" if abs(correlation_matrix[i, j]) > 0.5 else "black"
            ax2.text(j, i, f'{correlation_matrix[i, j]:.2f}',
                    ha="center", va="center", color=color, fontweight='bold')
    
    plt.colorbar(im, ax=ax2, shrink=0.8)
    
    # Portfolio composition
    ax3 = fig.add_subplot(gs[1, :2])
    colors = plt.cm.Set3(np.linspace(0, 1, len(asset_names)))
    wedges, texts, autotexts = ax3.pie(weights, labels=asset_names, autopct='%1.1f%%', 
                                       startangle=90, colors=colors)
    ax3.set_title("Portfolio Composition", fontsize=14, fontweight='bold')
    
    # VaR comparison bar chart
    ax4 = fig.add_subplot(gs[1, 2:])
    methods = ['Traditional\n(Single Asset)', 'Cholesky\n(Correlated Assets)']
    var_values = [results['simple']['var'], results['cholesky']['var']]
    cvar_values = [results['simple']['cvar'], results['cholesky']['cvar']]
    
    x = np.arange(len(methods))
    width = 0.35
    
    bars1 = ax4.bar(x - width/2, var_values, width, label='VaR', color=['lightcoral', 'skyblue'], alpha=0.8)
    bars2 = ax4.bar(x + width/2, cvar_values, width, label='CVaR', color=['red', 'blue'], alpha=0.8)
    
    ax4.set_title("VaR & CVaR Comparison", fontsize=14, fontweight='bold')
    ax4.set_ylabel("Loss Amount ($)")
    ax4.set_xticks(x)
    ax4.set_xticklabels(methods)
    ax4.legend()
    ax4.grid(True, alpha=0.3, axis='y')
    
    # Add value labels on bars
    for bar in bars1:
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height + height*0.01,
                f'${height:,.0f}', ha='center', va='bottom', fontweight='bold')
    for bar in bars2:
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height + height*0.01,
                f'${height:,.0f}', ha='center', va='bottom', fontweight='bold')
    
    # Key insights text
    ax5 = fig.add_subplot(gs[2, :])
    ax5.axis('off')
    
    var_diff = abs(results['cholesky']['var'] - results['simple']['var'])
    var_diff_pct = var_diff / results['simple']['var'] * 100
    
    insights_text = f"""
    🔍 KEY INSIGHTS FROM CHOLESKY DECOMPOSITION ANALYSIS:
    
    📊 PORTFOLIO STATISTICS:
    • Portfolio Value: ${portfolio_value:,.0f}
    • Portfolio Volatility: {results['portfolio_stats']['portfolio_volatility']*100:.1f}% (annualized)
    • Average Asset Correlation: {results['portfolio_stats']['avg_correlation']:.3f}
    
    ⚖️ VaR COMPARISON ({confidence_level*100:.0f}% confidence level):
    • Traditional Method VaR: ${results['simple']['var']:,.0f} ({results['simple']['var']/portfolio_value*100:.2f}% of portfolio)
    • Cholesky Method VaR: ${results['cholesky']['var']:,.0f} ({results['cholesky']['var']/portfolio_value*100:.2f}% of portfolio)
    • Difference: ${var_diff:,.0f} ({var_diff_pct:.1f}% difference)
    
    🎯 WHY CHOLESKY DECOMPOSITION MATTERS:
    • Captures realistic correlation structure between assets
    • Provides more accurate risk estimates for diversified portfolios
    • Essential for portfolios with significant correlations (avg: {results['portfolio_stats']['avg_correlation']:.1%})
    • Traditional method may {'underestimate' if results['cholesky']['var'] > results['simple']['var'] else 'overestimate'} risk by ignoring correlations
    """
    
    ax5.text(0.05, 0.95, insights_text, transform=ax5.transAxes, fontsize=11,
             verticalalignment='top', bbox=dict(boxstyle="round,pad=0.5", facecolor="lightblue", alpha=0.8))
    
    plt.suptitle("Monte Carlo VaR: Traditional vs. Cholesky Decomposition", 
                 fontsize=16, fontweight='bold', y=0.98)
    
    return fig

def main():
    """Main demonstration function."""
    print("🚀 CHOLESKY DECOMPOSITION MONTE CARLO VAR DEMONSTRATION")
    print("=" * 70)
    
    # Parameters
    n_assets = 5
    n_days = 1000
    confidence_level = 0.95
    time_horizon = 1
    num_simulations = 100000
    
    # Create sample portfolio
    portfolio_weights = np.array([0.25, 0.20, 0.20, 0.20, 0.15])  # Portfolio allocation
    portfolio_value = 1000000  # $1M portfolio
    
    print(f"\n📋 SIMULATION PARAMETERS:")
    print(f"• Portfolio Value: ${portfolio_value:,}")
    print(f"• Number of Assets: {n_assets}")
    print(f"• Historical Days: {n_days}")
    print(f"• Monte Carlo Simulations: {num_simulations:,}")
    print(f"• Confidence Level: {confidence_level*100}%")
    
    try:
        # Generate simulated asset returns with realistic correlations
        asset_returns, true_correlations, asset_names, daily_means, daily_vols = simulate_correlated_asset_returns(
            n_assets, n_days
        )
        
        print(f"\n📈 ASSET SUMMARY:")
        for i, name in enumerate(asset_names):
            print(f"• {name}: {portfolio_weights[i]:.1%} allocation, "
                  f"{daily_means[i]*252*100:.1f}% annual return, "
                  f"{daily_vols[i]*np.sqrt(252)*100:.1f}% annual volatility")
        
        # Run VaR comparison
        results = monte_carlo_var_comparison(
            asset_returns, portfolio_weights, portfolio_value, 
            confidence_level, time_horizon, num_simulations
        )
        
        # Display results
        print(f"\n📊 RESULTS COMPARISON:")
        print(f"{'Method':<25} {'VaR':<15} {'CVaR':<15} {'VaR %':<10}")
        print("-" * 65)
        
        for method_key, method_data in [('simple', results['simple']), ('cholesky', results['cholesky'])]:
            var_pct = method_data['var'] / portfolio_value * 100
            print(f"{method_data['method']:<25} ${method_data['var']:>10,.0f} "
                  f"${method_data['cvar']:>10,.0f} {var_pct:>8.2f}%")
        
        # Create visualization
        fig = create_comparison_visualization(
            results, asset_names, portfolio_weights, portfolio_value, confidence_level
        )
        
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"cholesky_demo_results_{timestamp}"
        
        plt.savefig(f"{filename}.png", dpi=150, bbox_inches='tight')
        print(f"\n💾 Visualization saved as: {filename}.png")
        
        # Save detailed results
        detailed_results = {
            "methodology": "Cholesky Decomposition vs Traditional Monte Carlo VaR",
            "parameters": {
                "portfolio_value": portfolio_value,
                "num_simulations": num_simulations,
                "confidence_level": confidence_level,
                "time_horizon": time_horizon,
                "historical_days": n_days
            },
            "portfolio": {
                "assets": asset_names,
                "weights": portfolio_weights.tolist(),
                "daily_expected_returns": daily_means.tolist(),
                "daily_volatilities": daily_vols.tolist()
            },
            "results": {
                "traditional_var": float(results['simple']['var']),
                "traditional_cvar": float(results['simple']['cvar']),
                "cholesky_var": float(results['cholesky']['var']),
                "cholesky_cvar": float(results['cholesky']['cvar']),
                "var_difference": float(abs(results['cholesky']['var'] - results['simple']['var'])),
                "var_difference_percentage": float(abs(results['cholesky']['var'] - results['simple']['var']) / results['simple']['var'] * 100)
            },
            "portfolio_statistics": {
                "portfolio_volatility": float(results['portfolio_stats']['portfolio_volatility']),
                "average_correlation": float(results['portfolio_stats']['avg_correlation']),
                "correlation_matrix": results['portfolio_stats']['correlation_matrix'].tolist()
            },
            "timestamp": datetime.now().isoformat()
        }
        
        with open(f"{filename}.json", "w") as f:
            json.dump(detailed_results, f, indent=2)
        
        print(f"📄 Detailed results saved as: {filename}.json")
        
        plt.show()
        
        print(f"\n✅ DEMONSTRATION COMPLETED SUCCESSFULLY!")
        print(f"🔍 The Cholesky decomposition method provides more accurate VaR estimates")
        print(f"   by properly modeling asset correlations in the Monte Carlo simulation.")
        
    except Exception as e:
        print(f"❌ Error in demonstration: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 