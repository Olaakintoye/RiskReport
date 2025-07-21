# Risk Analysis Project: Value at Risk (VaR) Methods

This project implements and compares different Value at Risk (VaR) calculation methodologies for financial risk assessment, including Conditional Value at Risk (CVaR)/Expected Shortfall.

## Quick Start

### Starting the Backend Server

The application requires a backend server for VaR calculations. To start it:

```bash
# Option 1: Use the automated script (recommended)
./start-backend.sh

# Option 2: Start manually with portfolio support
cd server && node var-api.js

# Option 3: Start both backend and frontend together
./start.sh
```

The backend server runs on port 3001 and provides Python-based VaR calculation APIs with **full portfolio data support**.

### Portfolio VaR Analysis ✅

The application now correctly processes portfolio data including:
- **Individual asset quantities and prices**
- **Real portfolio value calculations** (not S&P 500 proxy)
- **Asset-specific risk contributions**
- **Multi-asset portfolio VaR calculations**

### Troubleshooting Server Issues

If you see "Network Error" messages in the logs, it means the backend server is not running. Common solutions:

1. **Check if server is running**: `lsof -i :3001`
2. **Start the server**: `./start-backend.sh`
3. **Verify connectivity**: `curl http://192.168.1.106:3001/api/charts`

The application will fall back to local calculations if the backend is unavailable, but for best performance and **accurate portfolio-based VaR calculations**, ensure the server is running.

**Note**: Make sure you're using the correct backend server (`server/var-api.js`) which supports portfolio data, not the basic `server.js` which only supports S&P 500 proxy calculations.

## Overview

Value at Risk (VaR) is a statistical technique used to measure and quantify the level of financial risk within a portfolio over a specific time frame. This project implements four common VaR calculation methods:

1. **Parametric VaR (Variance-Covariance Method)**
2. **Historical VaR**
3. **Monte Carlo VaR (Normal Distribution)**
4. **Monte Carlo VaR (t-Distribution)**

Additionally, for each method, the project calculates the **Conditional Value at Risk (CVaR)**, also known as Expected Shortfall, which measures the average loss in the worst-case scenarios that exceed the VaR threshold.

## Phase 1 Enhancements - Advanced Scenario Tools

The application now includes advanced scenario analysis tools designed to provide institutional-grade risk management capabilities:

### Interactive Scenario Builder
A sophisticated scenario creation interface that allows users to:
- **Build custom scenarios** with 7 key risk factors (equity markets, interest rates, credit spreads, inflation, volatility, currency, commodities)
- **Access predefined templates** for major crisis scenarios (Financial Crisis, Stagflation, Tech Bubble Burst, Geopolitical Crisis)
- **Apply auto-correlation effects** between risk factors for more realistic modeling
- **View historical context** with 95th/5th percentile ranges for each factor
- **Get real-time impact estimates** as scenarios are built
- **Save and run scenarios** immediately on selected portfolios

### Real-Time Risk Dashboard
A live monitoring system that provides:
- **Real-time risk metrics** including VaR (95%, 99%), portfolio volatility, correlation, concentration risk, and liquidity scores
- **Live market indicators** tracking S&P 500, VIX, Dollar Index, and 10Y Treasury yields
- **Threshold monitoring** with visual status indicators (normal, warning, critical)
- **Automated alerts** when risk metrics breach predefined thresholds
- **Animated live updates** with pause/play functionality for continuous monitoring

### Key Features
- **Template-based scenario creation** with historical analogs (2008 GFC, 1970s Stagflation, etc.)
- **Advanced factor modeling** with correlation matrices and volatility regimes
- **Real-time data integration** with live market feeds
- **Mobile-optimized interface** with intuitive touch controls
- **Institutional-grade analytics** suitable for professional risk management

### Benefits
- **Faster scenario creation** with intelligent templates and auto-correlation
- **Better risk understanding** through sophisticated factor modeling
- **Real-time decision making** with live risk monitoring
- **Professional-grade tools** comparable to institutional risk systems

## Tiingo API Integration

The project includes integration with Tiingo's IEX API for real-time and historical market data, enabling:

1. **Real-time price data** for securities in portfolios
2. **Historical scenario analysis** based on actual market events
3. **Stress testing** using real market data

### Setting Up Tiingo API

1. **Sign up for a Tiingo account** at [tiingo.com](https://www.tiingo.com)
2. **Get your API key** from your Tiingo dashboard
3. **Set up your environment variables**:
   - Copy `client/env.example` to `client/.env`
   - Add your Tiingo API key to the `.env` file

```bash
# Install required dependencies
npm install dotenv axios --legacy-peer-deps
```

### Real-Time Portfolio Integration

The application provides real-time market data integration for portfolios:

- **Automatic price updates** when viewing portfolios
- **Manual refresh** option to get the latest market prices for all securities
- **Real-time security details** when adding assets to portfolios
- **Batch API processing** to efficiently update multiple securities at once

When creating or modifying portfolios, the application will:

1. Fetch the latest market prices for all securities
2. Calculate up-to-date portfolio values
3. Store the updated prices for risk calculations

### Using Real Data

The application includes components for:

- **Historical Event Analysis**: Run scenarios based on actual historical market events like the 2008 Financial Crisis or COVID-19 Crash
- **Real-time Portfolio Valuation**: Get current market prices for portfolio securities
- **Custom Scenario Builder**: Create and test scenarios using real market data

## Files

- `VaR_methods.py`: Core implementation of all VaR and CVaR calculation methods
- `var_comparison.py`: Script to run comparative analysis with visualizations
- `Py.py`: Original Monte Carlo VaR implementation

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd risk-analysis

# Install required packages
pip install numpy pandas matplotlib seaborn scipy yfinance tabulate
```

## Usage

Run the main comparison script:

```bash
python var_comparison.py
```

This will:
1. Download historical S&P 500 data using yfinance
2. Calculate VaR and CVaR using all four methods
3. Generate comparative visualizations
4. Create a comprehensive markdown report

To run just the VaR methods implementation:

```bash
python VaR_methods.py
```

## Outputs

The scripts generate the following outputs:

1. **Tabulated comparison** of all VaR methods in the console
2. **Visualizations**:
   - `var_methods_comparison.png` - Distribution plots for each method
   - `var_comparison_barchart.png` - Bar chart comparing VaR and CVaR values
   - `var_tail_comparison.png` - KDE plots focusing on tail distributions
   - `returns_distribution_analysis.png` - QQ plots and returns distribution analysis
3. **Markdown report**: `var_comparison_report.md` - Detailed analysis and methodology comparison

## VaR Methods Implemented

### Parametric VaR (Variance-Covariance)
Assumes returns follow a normal distribution and uses the portfolio's standard deviation to calculate VaR.

### Historical VaR
Uses actual historical returns to determine VaR without making distributional assumptions.

### Monte Carlo VaR (Normal)
Generates thousands of random scenarios based on a normal distribution of returns.

### Monte Carlo VaR (t-Distribution)
Similar to standard Monte Carlo but uses Student's t-distribution to better account for fat tails.

### Conditional VaR (Expected Shortfall)
For all methods, calculates the average loss in scenarios where VaR is exceeded.

## Parameters

The default parameters used in the analysis:

- **Confidence Level**: 95%
- **Time Horizon**: 1 day
- **Number of Simulations**: 50,000 (for Monte Carlo methods)
- **Portfolio**: 10 E-mini S&P 500 futures contracts

## Customization

Modify the parameters in `VaR_methods.py` to customize the analysis:

```python
# Parameters
confidence_level = 0.95  # Change to desired confidence level (e.g., 0.99)
time_horizon = 1  # Change time horizon in days
num_simulations = 50000  # Adjust number of simulations
contract_size = 50  # Contract multiplier
num_contracts = 10  # Number of contracts
```

## License

[MIT License](LICENSE)
