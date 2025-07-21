# Portfolio Risk Analysis Integration

This module integrates portfolio management with risk analysis capabilities, allowing users to perform Value at Risk (VaR) calculations on their portfolios.

## Features

- **Portfolio-Aware Risk Analysis**: Calculate VaR metrics specific to the selected portfolio's assets and weights
- **Multiple VaR Methodologies**: Support for Parametric (Variance-Covariance), Historical Simulation, Monte Carlo, and Monte Carlo with t-distribution
- **Risk Parameter Configuration**: Adjust confidence level, time horizon, and simulation count
- **Asset Risk Contribution Analysis**: View which assets contribute most to portfolio risk
- **Visual Risk Distribution**: Visualize portfolio loss distribution with VaR and CVaR cutoffs
- **Responsive UI**: User-friendly risk parameter controls with sliders and method selectors

## Architecture

The risk analysis module follows a client-server architecture:

### Client-Side (React Native)
- `risk-report.tsx`: Main UI component for portfolio selection and risk parameter configuration
- Fetches portfolio data from `portfolioService`
- Supports simulation mode for development without a server

### Server-Side
- `var-calculator.js`: Express API route that processes VaR calculation requests
- Communicates with Python backend through file-based data exchange
- Handles chart generation and temporary file management

### Python Risk Calculation Engine
- `portfolio_var.py`: Core calculation engine that implements various VaR methodologies
- Fetches historical price data for portfolio assets
- Calculates correlations and contributions to risk
- Generates visualizations of loss distributions

## Usage

1. Navigate to the Risk Report screen
2. Select a portfolio from the dropdown
3. Configure risk parameters:
   - Confidence level (80% to 99%)
   - Time horizon (1 to 10 days)
   - Number of simulations
   - VaR methodology
4. Click "Run Risk Analysis"
5. View results including:
   - VaR and CVaR in dollar amounts and percentages
   - Loss distribution visualization
   - Per-asset risk contribution breakdown

## Development

### Adding a New VaR Method

To add a new VaR calculation method:

1. Add the method to the client-side method selector in `risk-report.tsx`
2. Implement the calculation function in `portfolio_var.py`
3. Add handling for the new method in the `run_var_analysis` function

### Extending Risk Metrics

To add additional risk metrics beyond VaR/CVaR:

1. Implement the calculations in the Python backend
2. Update the response format in the API
3. Add UI components to display the new metrics

## Dependencies

- **Client**: React Native, Axios, React Navigation
- **Server**: Express, Node.js child_process
- **Python**: NumPy, Pandas, Matplotlib, Seaborn, yfinance, SciPy

## Future Enhancements

- Stress testing scenarios
- Position-level drill-down
- Time-series VaR tracking
- Risk limit management
- Market correlation analysis
- Risk-adjusted performance metrics 