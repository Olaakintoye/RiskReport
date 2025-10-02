-- Sample Data and Default Stress Scenarios
-- This migration creates sample portfolios and predefined stress test scenarios

-- =============================================
-- DEFAULT STRESS TEST SCENARIOS
-- =============================================

-- Insert predefined stress scenarios (public scenarios)
INSERT INTO stress_scenarios (id, user_id, name, description, scenario_type, parameters, is_public) VALUES
(
  'gfc-2008'::uuid,
  NULL, -- Public scenario, no specific user
  'Global Financial Crisis (2008)',
  'Historical stress scenario based on the 2008 financial crisis with severe equity market declines and credit spread widening',
  'historical',
  '{
    "period": "2008-09-01:2009-03-31",
    "equity_shock": -0.45,
    "credit_spread_shock": 0.035,
    "volatility_multiplier": 2.5,
    "correlation_increase": 0.2,
    "description": "Severe equity decline (-45%), credit spread widening (+350bp), increased volatility and correlations"
  }'::jsonb,
  true
),
(
  'covid-2020'::uuid,
  NULL,
  'COVID-19 Market Crash (2020)',
  'Historical stress scenario based on the COVID-19 pandemic market crash in early 2020',
  'historical',
  '{
    "period": "2020-02-15:2020-04-15",
    "equity_shock": -0.35,
    "credit_spread_shock": 0.025,
    "volatility_multiplier": 3.0,
    "fx_volatility_increase": 0.5,
    "description": "Rapid equity decline (-35%), credit stress (+250bp), extreme volatility spike"
  }'::jsonb,
  true
),
(
  'dotcom-burst'::uuid,
  NULL,
  'Dot-com Bubble Burst (2000-2002)',
  'Historical stress scenario based on the dot-com bubble burst and subsequent bear market',
  'historical',
  '{
    "period": "2000-03-01:2002-10-15",
    "equity_shock": -0.50,
    "tech_sector_shock": -0.75,
    "credit_spread_shock": 0.020,
    "volatility_multiplier": 2.0,
    "description": "Severe tech decline (-75%), broader equity decline (-50%), moderate credit stress"
  }'::jsonb,
  true
),
(
  'black-monday'::uuid,
  NULL,
  'Black Monday (1987)',
  'Historical stress scenario based on the Black Monday crash of October 19, 1987',
  'historical',
  '{
    "period": "1987-10-01:1987-10-30",
    "equity_shock": -0.25,
    "single_day_shock": -0.22,
    "volatility_multiplier": 4.0,
    "correlation_increase": 0.3,
    "description": "Severe single-day decline (-22%), overall monthly decline (-25%), extreme volatility"
  }'::jsonb,
  true
),
(
  'volmageddon'::uuid,
  NULL,
  'Volmageddon (2018)',
  'Historical stress scenario based on the February 2018 volatility spike',
  'historical',
  '{
    "period": "2018-02-01:2018-02-15",
    "equity_shock": -0.12,
    "volatility_shock": 2.5,
    "vix_spike": 37.32,
    "correlation_increase": 0.15,
    "description": "Moderate equity decline (-12%) with extreme volatility spike (VIX to 37)"
  }'::jsonb,
  true
),
(
  'regulatory-basel'::uuid,
  NULL,
  'Basel III Regulatory Stress',
  'Regulatory stress scenario based on Basel III severely adverse conditions',
  'regulatory',
  '{
    "equity_shock": -0.30,
    "credit_spread_shock": 0.030,
    "interest_rate_shock": 0.02,
    "fx_shock": 0.15,
    "real_estate_shock": -0.25,
    "unemployment_increase": 0.05,
    "gdp_decline": -0.08,
    "description": "Basel III severely adverse: equity decline (-30%), credit stress (+300bp), rate rise (+200bp)"
  }'::jsonb,
  true
),
(
  'hypothetical-severe'::uuid,
  NULL,
  'Hypothetical Severe Stress',
  'Hypothetical severe stress scenario combining multiple risk factors',
  'hypothetical',
  '{
    "equity_shock": -0.60,
    "credit_spread_shock": 0.050,
    "interest_rate_shock": 0.03,
    "fx_shock": 0.25,
    "commodity_shock": -0.40,
    "volatility_multiplier": 3.5,
    "correlation_increase": 0.4,
    "liquidity_stress": 0.3,
    "description": "Extreme hypothetical scenario: severe equity decline (-60%), major credit stress (+500bp), high volatility"
  }'::jsonb,
  true
);

-- =============================================
-- SAMPLE MARKET DATA
-- =============================================

-- Insert sample market data for common symbols
INSERT INTO market_data_cache (symbol, last_price, price_change, price_change_pct, volume, market_cap, currency, exchange) VALUES
('AAPL', 175.50, 2.25, 1.30, 45000000, 2800000000000, 'USD', 'NASDAQ'),
('MSFT', 335.20, -1.80, -0.53, 28000000, 2500000000000, 'USD', 'NASDAQ'),
('GOOGL', 138.75, 0.95, 0.69, 22000000, 1750000000000, 'USD', 'NASDAQ'),
('AMZN', 145.30, -2.10, -1.42, 35000000, 1500000000000, 'USD', 'NASDAQ'),
('TSLA', 248.90, 8.45, 3.52, 85000000, 790000000000, 'USD', 'NASDAQ'),
('NVDA', 455.60, 12.30, 2.77, 42000000, 1120000000000, 'USD', 'NASDAQ'),
('META', 315.80, -4.20, -1.31, 18000000, 800000000000, 'USD', 'NASDAQ'),
('JPM', 155.40, 1.15, 0.75, 12000000, 450000000000, 'USD', 'NYSE'),
('JNJ', 162.30, -0.85, -0.52, 8000000, 425000000000, 'USD', 'NYSE'),
('V', 245.70, 3.40, 1.40, 6500000, 520000000000, 'USD', 'NYSE'),
('SPY', 445.20, 2.80, 0.63, 75000000, NULL, 'USD', 'NYSE'),
('QQQ', 375.90, 1.95, 0.52, 45000000, NULL, 'USD', 'NASDAQ'),
('IWM', 198.50, 0.75, 0.38, 25000000, NULL, 'USD', 'NYSE'),
('VTI', 235.80, 1.20, 0.51, 3500000, NULL, 'USD', 'NYSE'),
('BTC-USD', 43250.00, 1250.00, 2.98, NULL, 850000000000, 'USD', 'CRYPTO'),
('ETH-USD', 2680.50, 85.30, 3.29, NULL, 320000000000, 'USD', 'CRYPTO'),
('GLD', 185.40, -0.60, -0.32, 8500000, NULL, 'USD', 'NYSE'),
('TLT', 92.15, -0.45, -0.49, 15000000, NULL, 'USD', 'NASDAQ')
ON CONFLICT (symbol) DO UPDATE SET
  last_price = EXCLUDED.last_price,
  price_change = EXCLUDED.price_change,
  price_change_pct = EXCLUDED.price_change_pct,
  volume = EXCLUDED.volume,
  market_cap = EXCLUDED.market_cap,
  last_updated = NOW();

-- =============================================
-- HELPER FUNCTIONS FOR SAMPLE DATA
-- =============================================

-- Function to create a sample portfolio for a user
CREATE OR REPLACE FUNCTION create_sample_portfolio(
  p_user_id UUID,
  p_portfolio_name TEXT DEFAULT 'Sample Portfolio'
) RETURNS UUID AS $$
DECLARE
  portfolio_id UUID;
BEGIN
  -- Create the portfolio
  INSERT INTO portfolios (user_id, name, description, base_ccy)
  VALUES (p_user_id, p_portfolio_name, 'Sample portfolio with diversified holdings', 'USD')
  RETURNING id INTO portfolio_id;
  
  -- Add sample positions
  INSERT INTO positions (portfolio_id, symbol, asset_name, asset_type, quantity, last_price, currency, sector) VALUES
  (portfolio_id, 'AAPL', 'Apple Inc.', 'equity', 100, 175.50, 'USD', 'Technology'),
  (portfolio_id, 'MSFT', 'Microsoft Corporation', 'equity', 75, 335.20, 'USD', 'Technology'),
  (portfolio_id, 'GOOGL', 'Alphabet Inc.', 'equity', 50, 138.75, 'USD', 'Technology'),
  (portfolio_id, 'JPM', 'JPMorgan Chase & Co.', 'equity', 80, 155.40, 'USD', 'Financial Services'),
  (portfolio_id, 'JNJ', 'Johnson & Johnson', 'equity', 60, 162.30, 'USD', 'Healthcare'),
  (portfolio_id, 'SPY', 'SPDR S&P 500 ETF', 'etf', 200, 445.20, 'USD', 'Diversified'),
  (portfolio_id, 'QQQ', 'Invesco QQQ Trust', 'etf', 100, 375.90, 'USD', 'Technology'),
  (portfolio_id, 'GLD', 'SPDR Gold Shares', 'etf', 50, 185.40, 'USD', 'Commodities'),
  (portfolio_id, 'TLT', 'iShares 20+ Year Treasury Bond ETF', 'etf', 75, 92.15, 'USD', 'Fixed Income'),
  (portfolio_id, 'BTC-USD', 'Bitcoin', 'crypto', 0.5, 43250.00, 'USD', 'Cryptocurrency');
  
  RETURN portfolio_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create sample calculation jobs
CREATE OR REPLACE FUNCTION create_sample_calc_jobs(
  p_user_id UUID,
  p_portfolio_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Create sample calculation jobs
  INSERT INTO calc_jobs (user_id, portfolio_id, calc_type, params, status) VALUES
  (p_user_id, p_portfolio_id, 'var_95', '{"confidence": 0.95, "horizon_days": 1, "method": "monte_carlo", "simulations": 50000}', 'completed'),
  (p_user_id, p_portfolio_id, 'var_99', '{"confidence": 0.99, "horizon_days": 1, "method": "monte_carlo", "simulations": 50000}', 'completed'),
  (p_user_id, p_portfolio_id, 'stress_test', '{"scenario_id": "gfc-2008", "method": "historical"}', 'completed'),
  (p_user_id, p_portfolio_id, 'monte_carlo', '{"confidence": 0.95, "horizon_days": 10, "simulations": 100000, "distribution": "t"}', 'queued');
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE portfolios IS 'User portfolios containing collections of financial positions';
COMMENT ON TABLE positions IS 'Individual asset positions within portfolios';
COMMENT ON TABLE calc_jobs IS 'Risk calculation jobs queue and history';
COMMENT ON TABLE results IS 'Risk calculation results including VaR, ES, and stress tests';
COMMENT ON TABLE stress_scenarios IS 'Predefined and custom stress test scenarios';
COMMENT ON TABLE stress_test_results IS 'Results from stress test calculations';
COMMENT ON TABLE market_data_cache IS 'Cached market data for pricing and calculations';

COMMENT ON COLUMN portfolios.base_ccy IS 'Base currency for portfolio valuation and reporting';
COMMENT ON COLUMN positions.market_value IS 'Computed market value (quantity × last_price)';
COMMENT ON COLUMN calc_jobs.params IS 'JSON parameters for the calculation (confidence, horizon, method, etc.)';
COMMENT ON COLUMN results.var_amount IS 'Value at Risk amount (negative number representing potential loss)';
COMMENT ON COLUMN results.es_amount IS 'Expected Shortfall amount (negative number representing expected loss beyond VaR)';
COMMENT ON COLUMN stress_scenarios.parameters IS 'JSON parameters defining the stress scenario shocks and conditions';

