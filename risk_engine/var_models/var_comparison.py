import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import yfinance as yf
from VaR_methods import (
    get_sp500_data, 
    calculate_returns, 
    parametric_var, 
    historical_var, 
    monte_carlo_var, 
    monte_carlo_t_var, 
    calculate_cvar,
    confidence_level,
    time_horizon,
    num_simulations,
    contract_size,
    num_contracts
)
from tabulate import tabulate

def generate_markdown_report(results, portfolio_value):
    """Generate a markdown report comparing the VaR methods"""
    md_report = """
# Value at Risk (VaR) and Conditional VaR Comparison Report

This report compares different VaR calculation methodologies and their corresponding Conditional VaR (Expected Shortfall) values.

## Portfolio Information
- **S&P 500 Futures Contracts**: {num_contracts}
- **Contract Size**: ${contract_size} per index point
- **Portfolio Value**: ${portfolio_value:,.2f}
- **Confidence Level**: {confidence_level:.0%}
- **Time Horizon**: {time_horizon} day(s)

## VaR Methodology Comparison

| Method | VaR | CVaR (Expected Shortfall) | VaR % | CVaR % |
|--------|-----|---------------------------|-------|--------|
""".format(
        num_contracts=num_contracts,
        contract_size=contract_size,
        portfolio_value=portfolio_value,
        confidence_level=confidence_level,
        time_horizon=time_horizon
    )
    
    for method, data in results.items():
        md_report += "| {} | ${:,.2f} | ${:,.2f} | {:.2f}% | {:.2f}% |\n".format(
            method, 
            data['VaR'], 
            data['CVaR'], 
            data['VaR %'], 
            data['CVaR %']
        )
    
    md_report += """
## Methodology Descriptions

### 1. Parametric VaR (Variance-Covariance Method)
- **Approach**: Assumes returns follow a normal distribution
- **Strengths**: Simple, computationally efficient
- **Weaknesses**: Underestimates tail risk in non-normal distributions

### 2. Historical VaR
- **Approach**: Uses actual historical returns without distributional assumptions
- **Strengths**: Based on actual market data, captures historical patterns
- **Weaknesses**: Limited by available historical data, assumes past will repeat

### 3. Monte Carlo VaR (Normal)
- **Approach**: Simulates multiple scenarios using normal distribution
- **Strengths**: Flexible, can incorporate various risk factors
- **Weaknesses**: Still assumes normality, computationally intensive

### 4. Monte Carlo VaR (t-distribution)
- **Approach**: Simulates scenarios using t-distribution to better capture fat tails
- **Strengths**: Better models extreme events, captures tail risk
- **Weaknesses**: More complex, requires distribution fitting

### Conditional VaR (Expected Shortfall)
- **Description**: Average loss when VaR threshold is exceeded
- **Advantages**: More conservative, considers tail severity, coherent risk measure
- **When to Use**: Higher volatility assets, complex derivatives, stressed market conditions

## Conclusion

Different VaR methodologies can produce significantly different results based on their underlying assumptions. 
The choice of methodology should consider the specific characteristics of the portfolio, market conditions, 
and the purpose of the risk measurement.

Conditional VaR consistently provides a more conservative risk estimate than standard VaR and better 
captures tail risk, which is crucial during market stress.

*This report is generated based on analysis of historical S&P 500 data.*

"""
    
    # Save the markdown report
    with open("var_comparison_report.md", "w") as f:
        f.write(md_report)
    
    print("Markdown report generated: var_comparison_report.md")

def run_comparison():
    """Run advanced comparison of VaR methods with additional visualizations"""
    try:
        # Get data
        data = get_sp500_data()
        returns, price_col = calculate_returns(data)
        
        # Current S&P 500 value
        current_sp500 = data[price_col][-1]
        
        # Calculate portfolio value
        portfolio_value = current_sp500 * contract_size * num_contracts
        
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
        
        # Generate comparison plots
        
        # 1. Bar chart comparison of VaR values
        plt.figure(figsize=(12, 8))
        
        methods = list(results.keys())
        var_values = [results[method]['VaR'] for method in methods]
        cvar_values = [results[method]['CVaR'] for method in methods]
        
        x = np.arange(len(methods))
        width = 0.35
        
        plt.bar(x - width/2, var_values, width, label='VaR', color='skyblue')
        plt.bar(x + width/2, cvar_values, width, label='CVaR', color='salmon')
        
        plt.xlabel('Method')
        plt.ylabel('Value ($)')
        plt.title('VaR vs CVaR by Calculation Method')
        plt.xticks(x, methods)
        plt.legend()
        
        for i, v in enumerate(var_values):
            plt.text(i - width/2, v + 500, f"${v:,.0f}", ha='center')
        
        for i, v in enumerate(cvar_values):
            plt.text(i + width/2, v + 500, f"${v:,.0f}", ha='center')
        
        plt.savefig("var_comparison_barchart.png")
        
        # 2. Tail distribution comparison
        plt.figure(figsize=(15, 8))
        
        for method in methods:
            losses = results[method]['Losses']
            # Focus only on the tail (losses > VaR)
            tail_losses = losses[losses >= results[method]['VaR']]
            
            # Create KDE plot for tail losses
            sns.kdeplot(tail_losses, label=f"{method} (Tail)", fill=True, alpha=0.3)
        
        plt.axvline(x=0, color='black', linestyle='--')
        plt.title('Comparison of Loss Distributions Tails (Beyond VaR)')
        plt.xlabel('Loss Amount ($)')
        plt.ylabel('Density')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.savefig("var_tail_comparison.png")
        
        # 3. QQ Plot to assess normality of returns
        plt.figure(figsize=(10, 10))
        
        from scipy import stats
        
        plt.subplot(2, 2, 1)
        stats.probplot(returns, dist="norm", plot=plt)
        plt.title("Q-Q Plot of Returns\n(Normal Distribution)")
        
        plt.subplot(2, 2, 2)
        stats.probplot(returns, dist=stats.t, sparams=(10,), plot=plt)
        plt.title("Q-Q Plot of Returns\n(t-Distribution, df=10)")
        
        plt.subplot(2, 2, 3)
        sns.histplot(returns, kde=True)
        plt.title("Distribution of Returns")
        
        plt.subplot(2, 2, 4)
        returns_sorted = returns.sort_values()
        plt.plot(returns_sorted.values)
        plt.title("Sorted Returns")
        plt.xlabel("Index")
        plt.ylabel("Return")
        
        plt.tight_layout()
        plt.savefig("returns_distribution_analysis.png")
        
        # Generate markdown report
        generate_markdown_report(results, portfolio_value)
        
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
        
        print("\nVisualizations saved:")
        print("- var_comparison_barchart.png")
        print("- var_tail_comparison.png")
        print("- returns_distribution_analysis.png")
        
        return results
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error running VaR comparison: {e}")
        return None

if __name__ == "__main__":
    run_comparison() 