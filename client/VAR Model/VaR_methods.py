import numpy as np
import pandas as pd
import yfinance as yf
import matplotlib.pyplot as plt
from scipy.stats import norm, t
import seaborn as sns
from datetime import datetime, timedelta
from tabulate import tabulate

# Parameters
confidence_level = 0.95
time_horizon = 1  # days
num_simulations = 50000
contract_size = 50  # Each E-mini S&P 500 contract represents $50 x index value
num_contracts = 10  # Number of contracts in portfolio

# Get S&P 500 futures data (using ^GSPC as proxy)
def get_sp500_data(years=3):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years*365)
    data = yf.download("^GSPC", start=start_date, end=end_date)
    # Handle multi-index columns if present
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)  # Get the first level of multi-index
    return data

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

# 1. Parametric VaR (Variance-Covariance Method)
def parametric_var(returns, current_price, confidence_level, time_horizon, contract_size, num_contracts):
    """
    Calculate VaR using the Parametric (Variance-Covariance) method.
    Assumes returns are normally distributed.
    """
    # Get statistics from historical returns
    mu = returns.mean()
    sigma = returns.std()
    
    # Portfolio value
    portfolio_value = current_price * contract_size * num_contracts
    
    # Calculate VaR
    # For the normal distribution, we use the z-score from the normal distribution
    z_score = norm.ppf(confidence_level)
    var = portfolio_value * (z_score * sigma * np.sqrt(time_horizon) - mu * time_horizon)
    
    # Calculate portfolio losses based on this model (for visualization)
    # Simulate normally distributed returns
    np.random.seed(42)  # For reproducibility
    simulated_returns = np.random.normal(mu * time_horizon, sigma * np.sqrt(time_horizon), num_simulations)
    simulated_portfolio_values = portfolio_value * (1 + simulated_returns)
    portfolio_losses = portfolio_value - simulated_portfolio_values
    
    return var, portfolio_losses, portfolio_value

# 2. Historical VaR
def historical_var(returns, current_price, confidence_level, time_horizon, contract_size, num_contracts):
    """
    Calculate VaR using historical simulation method.
    Uses actual historical returns without assuming any distribution.
    """
    # Portfolio value
    portfolio_value = current_price * contract_size * num_contracts
    
    # Scale historical returns to the time horizon
    if time_horizon > 1:
        # For multi-day horizons, we bootstrap sequences of returns
        # This is a simplified approach - can be improved with bootstrapping methods
        horizon_returns = []
        for i in range(len(returns) - time_horizon + 1):
            horizon_return = np.prod(1 + returns.iloc[i:i + time_horizon]) - 1
            horizon_returns.append(horizon_return)
        scaled_returns = pd.Series(horizon_returns)
    else:
        scaled_returns = returns
    
    # Calculate portfolio losses for each historical return
    portfolio_losses = portfolio_value * -scaled_returns
    
    # Calculate VaR as the specified percentile of the loss distribution
    var = np.percentile(portfolio_losses, confidence_level * 100)
    
    return var, portfolio_losses, portfolio_value

# 3. Monte Carlo simulation for VaR
def monte_carlo_var(returns, current_price, confidence_level, time_horizon, num_simulations, contract_size, num_contracts):
    """
    Calculate VaR using Monte Carlo simulation method.
    Generates random scenarios based on historical mean and standard deviation.
    """
    # Get statistics from historical returns
    mu = returns.mean()
    sigma = returns.std()
    
    # Portfolio value
    portfolio_value = current_price * contract_size * num_contracts
    
    # Generate random returns based on historical mean and standard deviation
    np.random.seed(42)  # For reproducibility
    simulated_returns = np.random.normal(
        mu * time_horizon, 
        sigma * np.sqrt(time_horizon), 
        num_simulations
    )
    
    # Calculate simulated portfolio values
    simulated_portfolio_values = portfolio_value * (1 + simulated_returns)
    
    # Calculate portfolio losses
    portfolio_losses = portfolio_value - simulated_portfolio_values
    
    # Calculate VaR
    var = np.percentile(portfolio_losses, confidence_level * 100)
    
    return var, portfolio_losses, portfolio_value

# 4. Monte Carlo with t-distribution (handles fat tails better)
def monte_carlo_t_var(returns, current_price, confidence_level, time_horizon, num_simulations, contract_size, num_contracts):
    """
    Calculate VaR using Monte Carlo simulation with t-distribution.
    Better for capturing fat tails in financial returns.
    """
    # Fit t-distribution to returns data
    params = t.fit(returns)
    df, loc, scale = params  # degrees of freedom, location, scale
    
    # Portfolio value
    portfolio_value = current_price * contract_size * num_contracts
    
    # Generate random returns based on fitted t-distribution
    np.random.seed(42)  # For reproducibility
    simulated_returns = t.rvs(
        df=df,
        loc=loc * time_horizon, 
        scale=scale * np.sqrt(time_horizon), 
        size=num_simulations
    )
    
    # Calculate simulated portfolio values
    simulated_portfolio_values = portfolio_value * (1 + simulated_returns)
    
    # Calculate portfolio losses
    portfolio_losses = portfolio_value - simulated_portfolio_values
    
    # Calculate VaR
    var = np.percentile(portfolio_losses, confidence_level * 100)
    
    return var, portfolio_losses, portfolio_value

# 5. Conditional VaR (Expected Shortfall)
def calculate_cvar(portfolio_losses, var, confidence_level):
    """
    Calculate Conditional VaR (Expected Shortfall) from the portfolio losses.
    CVaR is the average of losses beyond the VaR threshold.
    """
    # Filter losses that exceed VaR
    extreme_losses = portfolio_losses[portfolio_losses >= var]
    
    # Calculate CVaR as the mean of the extreme losses
    cvar = extreme_losses.mean()
    
    return cvar

def run_var_analysis():
    """Run a comprehensive VaR analysis using different methods."""
    print(f"Running Comprehensive VaR Analysis for S&P 500 Futures")
    print(f"Confidence Level: {confidence_level*100}%")
    print(f"Time Horizon: {time_horizon} day(s)")
    print(f"Number of Contracts: {num_contracts}")
    print(f"Number of Simulations: {num_simulations}")
    print("-" * 50)
    
    try:
        # Get data
        data = get_sp500_data()
        returns, price_col = calculate_returns(data)
        
        # Current S&P 500 value
        current_sp500 = data[price_col][-1]
        print(f"Current S&P 500 Value: ${current_sp500:.2f}")
        
        # Calculate portfolio value
        portfolio_value = current_sp500 * contract_size * num_contracts
        print(f"Portfolio Value: ${portfolio_value:,.2f}")
        
        # Run different VaR methods
        results = {}
        
        # 1. Parametric VaR
        param_var, param_losses, _ = parametric_var(
            returns, current_sp500, confidence_level, time_horizon, contract_size, num_contracts
        )
        param_cvar = calculate_cvar(pd.Series(param_losses), param_var, confidence_level)
        results['Parametric'] = {
            'VaR': param_var,
            'CVaR': param_cvar,
            'VaR %': param_var/portfolio_value*100,
            'CVaR %': param_cvar/portfolio_value*100,
            'Losses': param_losses
        }
        
        # 2. Historical VaR
        hist_var, hist_losses, _ = historical_var(
            returns, current_sp500, confidence_level, time_horizon, contract_size, num_contracts
        )
        hist_cvar = calculate_cvar(pd.Series(hist_losses), hist_var, confidence_level)
        results['Historical'] = {
            'VaR': hist_var,
            'CVaR': hist_cvar,
            'VaR %': hist_var/portfolio_value*100,
            'CVaR %': hist_cvar/portfolio_value*100,
            'Losses': hist_losses
        }
        
        # 3. Monte Carlo (Normal) VaR
        mc_var, mc_losses, _ = monte_carlo_var(
            returns, current_sp500, confidence_level, time_horizon, num_simulations, contract_size, num_contracts
        )
        mc_cvar = calculate_cvar(pd.Series(mc_losses), mc_var, confidence_level)
        results['Monte Carlo (Normal)'] = {
            'VaR': mc_var,
            'CVaR': mc_cvar,
            'VaR %': mc_var/portfolio_value*100,
            'CVaR %': mc_cvar/portfolio_value*100,
            'Losses': mc_losses
        }
        
        # 4. Monte Carlo with t-distribution VaR
        mc_t_var, mc_t_losses, _ = monte_carlo_t_var(
            returns, current_sp500, confidence_level, time_horizon, num_simulations, contract_size, num_contracts
        )
        mc_t_cvar = calculate_cvar(pd.Series(mc_t_losses), mc_t_var, confidence_level)
        results['Monte Carlo (t-dist)'] = {
            'VaR': mc_t_var,
            'CVaR': mc_t_cvar,
            'VaR %': mc_t_var/portfolio_value*100,
            'CVaR %': mc_t_cvar/portfolio_value*100,
            'Losses': mc_t_losses
        }
        
        # Display results in a table
        table_data = []
        for method, data in results.items():
            table_data.append([
                method, 
                f"${data['VaR']:,.2f}", 
                f"${data['CVaR']:,.2f}", 
                f"{data['VaR %']:.2f}%", 
                f"{data['CVaR %']:.2f}%"
            ])
        
        headers = ["Method", "VaR", "CVaR (Expected Shortfall)", "VaR %", "CVaR %"]
        print("\nComparison of VaR Methods:")
        print(tabulate(table_data, headers=headers, tablefmt="grid"))
        
        # Plot the distributions
        plt.figure(figsize=(15, 10))
        
        plt.subplot(2, 2, 1)
        sns.histplot(results['Parametric']['Losses'], kde=True)
        plt.axvline(results['Parametric']['VaR'], color='r', linestyle='--', 
                    label=f"VaR: ${results['Parametric']['VaR']:,.2f}")
        plt.axvline(results['Parametric']['CVaR'], color='g', linestyle='--', 
                    label=f"CVaR: ${results['Parametric']['CVaR']:,.2f}")
        plt.title("Parametric VaR Distribution")
        plt.xlabel("Loss Amount ($)")
        plt.ylabel("Frequency")
        plt.legend()
        
        plt.subplot(2, 2, 2)
        sns.histplot(results['Historical']['Losses'], kde=True)
        plt.axvline(results['Historical']['VaR'], color='r', linestyle='--', 
                    label=f"VaR: ${results['Historical']['VaR']:,.2f}")
        plt.axvline(results['Historical']['CVaR'], color='g', linestyle='--', 
                    label=f"CVaR: ${results['Historical']['CVaR']:,.2f}")
        plt.title("Historical VaR Distribution")
        plt.xlabel("Loss Amount ($)")
        plt.ylabel("Frequency")
        plt.legend()
        
        plt.subplot(2, 2, 3)
        sns.histplot(results['Monte Carlo (Normal)']['Losses'], kde=True)
        plt.axvline(results['Monte Carlo (Normal)']['VaR'], color='r', linestyle='--', 
                    label=f"VaR: ${results['Monte Carlo (Normal)']['VaR']:,.2f}")
        plt.axvline(results['Monte Carlo (Normal)']['CVaR'], color='g', linestyle='--', 
                    label=f"CVaR: ${results['Monte Carlo (Normal)']['CVaR']:,.2f}")
        plt.title("Monte Carlo (Normal) VaR Distribution")
        plt.xlabel("Loss Amount ($)")
        plt.ylabel("Frequency")
        plt.legend()
        
        plt.subplot(2, 2, 4)
        sns.histplot(results['Monte Carlo (t-dist)']['Losses'], kde=True)
        plt.axvline(results['Monte Carlo (t-dist)']['VaR'], color='r', linestyle='--', 
                    label=f"VaR: ${results['Monte Carlo (t-dist)']['VaR']:,.2f}")
        plt.axvline(results['Monte Carlo (t-dist)']['CVaR'], color='g', linestyle='--', 
                    label=f"CVaR: ${results['Monte Carlo (t-dist)']['CVaR']:,.2f}")
        plt.title("Monte Carlo (t-dist) VaR Distribution")
        plt.xlabel("Loss Amount ($)")
        plt.ylabel("Frequency")
        plt.legend()
        
        plt.tight_layout()
        plt.savefig("var_methods_comparison.png")
        plt.show()
        
        return results
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error running VaR analysis: {e}")
        return None

if __name__ == "__main__":
    run_var_analysis() 