-- Risk Portfolio Management Schema
-- This migration creates the core tables for portfolio management and risk calculations

-- =============================================
-- PORTFOLIOS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_ccy TEXT DEFAULT 'USD' CHECK (base_ccy IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF')),
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- POSITIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  asset_name TEXT,
  asset_type TEXT DEFAULT 'equity' CHECK (asset_type IN ('equity', 'bond', 'commodity', 'crypto', 'etf', 'option', 'future')),
  quantity NUMERIC NOT NULL,
  last_price NUMERIC,
  market_value NUMERIC GENERATED ALWAYS AS (quantity * COALESCE(last_price, 0)) STORED,
  currency TEXT DEFAULT 'USD',
  sector TEXT,
  asof_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT positive_price CHECK (last_price IS NULL OR last_price > 0)
);

-- =============================================
-- CALCULATION JOBS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS calc_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  calc_type TEXT NOT NULL CHECK (calc_type IN ('var_95', 'var_99', 'var_975', 'es_95', 'es_99', 'stress_test', 'monte_carlo', 'parametric', 'historical')),
  params JSONB DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  -- Ensure logical timestamps
  CONSTRAINT logical_timestamps CHECK (
    (started_at IS NULL OR started_at >= created_at) AND
    (finished_at IS NULL OR finished_at >= COALESCE(started_at, created_at))
  )
);

-- =============================================
-- RESULTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  calc_job_id UUID REFERENCES calc_jobs(id) ON DELETE SET NULL,
  calc_type TEXT NOT NULL,
  confidence NUMERIC CHECK (confidence > 0 AND confidence < 1),
  horizon_days INTEGER DEFAULT 1 CHECK (horizon_days > 0),
  var_amount NUMERIC,
  es_amount NUMERIC, -- Expected Shortfall
  distribution_stats JSONB, -- Summary statistics, bins, etc.
  risk_metrics JSONB, -- Additional risk metrics (volatility, correlation, etc.)
  params JSONB DEFAULT '{}'::JSONB,
  chart_url TEXT,
  data_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure negative VaR values (losses are positive)
  CONSTRAINT var_negative CHECK (var_amount IS NULL OR var_amount <= 0),
  CONSTRAINT es_negative CHECK (es_amount IS NULL OR es_amount <= 0)
);

-- =============================================
-- STRESS TEST SCENARIOS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS stress_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT DEFAULT 'custom' CHECK (scenario_type IN ('historical', 'hypothetical', 'custom', 'regulatory')),
  parameters JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- STRESS TEST RESULTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS stress_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES stress_scenarios(id) ON DELETE CASCADE,
  calc_job_id UUID REFERENCES calc_jobs(id) ON DELETE SET NULL,
  base_value NUMERIC NOT NULL,
  stressed_value NUMERIC NOT NULL,
  pnl_amount NUMERIC GENERATED ALWAYS AS (stressed_value - base_value) STORED,
  pnl_percentage NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN base_value != 0 THEN ((stressed_value - base_value) / base_value * 100)
      ELSE 0 
    END
  ) STORED,
  component_results JSONB, -- Per-asset breakdown
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MARKET DATA CACHE TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS market_data_cache (
  symbol TEXT PRIMARY KEY,
  last_price NUMERIC NOT NULL,
  price_change NUMERIC,
  price_change_pct NUMERIC,
  volume BIGINT,
  market_cap NUMERIC,
  currency TEXT DEFAULT 'USD',
  exchange TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT positive_price CHECK (last_price > 0)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Portfolio indexes
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_created_at ON portfolios(created_at DESC);

-- Position indexes
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_symbol ON positions(symbol);
CREATE INDEX IF NOT EXISTS idx_positions_asof_date ON positions(asof_date DESC);

-- Calc jobs indexes
CREATE INDEX IF NOT EXISTS idx_calc_jobs_user_status ON calc_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_calc_jobs_portfolio_created ON calc_jobs(portfolio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calc_jobs_status_created ON calc_jobs(status, created_at DESC);

-- Results indexes
CREATE INDEX IF NOT EXISTS idx_results_portfolio_created ON results(portfolio_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_calc_type ON results(calc_type);
CREATE INDEX IF NOT EXISTS idx_results_job_id ON results(calc_job_id);

-- Stress test indexes
CREATE INDEX IF NOT EXISTS idx_stress_scenarios_user_id ON stress_scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_stress_scenarios_public ON stress_scenarios(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_stress_test_results_portfolio ON stress_test_results(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_stress_test_results_scenario ON stress_test_results(scenario_id);

-- Market data indexes
CREATE INDEX IF NOT EXISTS idx_market_data_last_updated ON market_data_cache(last_updated DESC);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stress_scenarios_updated_at BEFORE UPDATE ON stress_scenarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR PORTFOLIO CALCULATIONS
-- =============================================

-- Function to update portfolio total value
CREATE OR REPLACE FUNCTION update_portfolio_total_value()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the portfolio's total value based on current positions
    UPDATE portfolios 
    SET total_value = (
        SELECT COALESCE(SUM(quantity * COALESCE(last_price, 0)), 0)
        FROM positions 
        WHERE portfolio_id = COALESCE(NEW.portfolio_id, OLD.portfolio_id)
    )
    WHERE id = COALESCE(NEW.portfolio_id, OLD.portfolio_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger to update portfolio value when positions change
CREATE TRIGGER update_portfolio_value_on_position_change
    AFTER INSERT OR UPDATE OR DELETE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_portfolio_total_value();

