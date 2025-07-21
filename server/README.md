# Risk Analysis Server

This server exposes a REST API for generating Value at Risk (VaR) charts using Python backend. It connects the React frontend with the Python data analysis scripts.

## Features

- Serve static chart images for display in the frontend
- Generate VaR charts using different methods (Parametric, Historical, Monte Carlo)
- API endpoints for on-demand chart regeneration
- Caching system to prevent repeated API calls to Yahoo Finance
- Fallback to synthetic data when network connectivity issues occur
- Robust error handling for chart generation

## Setup

1. Install Node.js dependencies:

```bash
npm install
```

2. Install Python dependencies:

```bash
pip install numpy pandas yfinance matplotlib scipy seaborn
```

3. Create a cache directory for storing Yahoo Finance data:

```bash
mkdir -p cache
```

4. Make sure the public directory exists:

```bash
mkdir -p public
```

## Running the Server

```bash
PORT=3001 node server.js
```

The server will always run on port 3001 to avoid conflicts with the frontend.

## Troubleshooting

### Chart Generation Failures

If chart generation fails, the server will:
1. Log detailed error information
2. Fall back to cached data when possible
3. Generate synthetic data if network connectivity is an issue
4. Return appropriate error responses to the client

### Network Connectivity Issues

The server includes robust handling for network connectivity issues:
- Automatic check for connectivity before attempting to download data
- Fallback to cached data when available
- Generation of synthetic data when both network and cache are unavailable
- Appropriate timeouts to prevent hanging processes

## API Endpoints

- `GET /parametric_var.png` - Get the parametric VaR chart
- `GET /historical_var.png` - Get the historical VaR chart
- `GET /monte_carlo_var.png` - Get the Monte Carlo VaR chart
- `GET /generate/parametric` - Generate a new parametric VaR chart
- `GET /generate/historical` - Generate a new historical VaR chart
- `GET /generate/montecarlo` - Generate a new Monte Carlo VaR chart
- `GET /generate/all` - Generate all VaR charts at once (with improved error handling)

## Configuration

The server uses the following configuration:

- Python script: `var_analysis.py`
- Default lookback period: 5 years
- Cache enabled by default
- Chart files are saved in both the server root and public directories
- 60-second timeout for chart generation processes 