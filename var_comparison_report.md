
# Value at Risk (VaR) and Conditional VaR Comparison Report

This report compares different VaR calculation methodologies and their corresponding Conditional VaR (Expected Shortfall) values.

## Portfolio Information
- **S&P 500 Futures Contracts**: 10
- **Contract Size**: $50 per index point
- **Portfolio Value**: $2,811,344.97
- **Confidence Level**: 95%
- **Time Horizon**: 1 day(s)

## VaR Methodology Comparison

| Method | VaR | CVaR (Expected Shortfall) | VaR % | CVaR % |
|--------|-----|---------------------------|-------|--------|
| Parametric | $52,254.94 | $66,221.98 | 1.86% | 2.36% |
| Historical | $48,039.40 | $75,007.48 | 1.71% | 2.67% |
| Monte Carlo (Normal) | $52,001.42 | $66,075.53 | 1.85% | 2.35% |
| Monte Carlo (t-dist) | $47,538.75 | $74,285.34 | 1.69% | 2.64% |

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

