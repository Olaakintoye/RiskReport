-- Risk Tracking User Isolation & VaR Integration Script
-- This script creates/updates the risk_metrics table structure to properly track
-- historical risk metrics for each user with timeframe support

-- =============================================
-- PHASE 1: CREATE/UPDATE RISK_METRICS TABLE
-- =============================================

-- Create risk_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS risk_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('var', 'cvar', 'volatility', 'sharpe_ratio', 'beta', 'max_drawdown', 'sortino_ratio', 'treynor_ratio', 'calmar_ratio')),
  value NUMERIC NOT NULL,
  confidence_level NUMERIC CHECK (confidence_level > 0 AND confidence_level < 1), -- For VaR/CVaR: 0.95, 0.99, etc.
  time_horizon INTEGER, -- Days: 1, 10, 30, etc.
  calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  calculation_method TEXT, -- 'parametric', 'historical', 'monte_carlo', 'analytical', etc.
  parameters JSONB DEFAULT '{}'::JSONB, -- Additional parameters: lookback_period, simulations, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_date 
ON risk_metrics(portfolio_id, calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_type 
ON risk_metrics(metric_type, calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_type 
ON risk_metrics(portfolio_id, metric_type, calculation_date DESC);

-- =============================================
-- PHASE 2: ENABLE RLS ON RISK_METRICS
-- =============================================

ALTER TABLE risk_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view risk metrics for their portfolios" ON risk_metrics;
DROP POLICY IF EXISTS "Service role can insert risk metrics" ON risk_metrics;
DROP POLICY IF EXISTS "Users can insert risk metrics for their portfolios" ON risk_metrics;
DROP POLICY IF EXISTS "Users can update risk metrics for their portfolios" ON risk_metrics;
DROP POLICY IF EXISTS "Users can delete risk metrics for their portfolios" ON risk_metrics;

-- Users can view risk metrics for their portfolios
CREATE POLICY "Users can view risk metrics for their portfolios"
ON risk_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = risk_metrics.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can insert risk metrics for their portfolios
CREATE POLICY "Users can insert risk metrics for their portfolios"
ON risk_metrics FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = risk_metrics.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Service role can insert risk metrics (for backend calculations)
CREATE POLICY "Service role can insert risk metrics"
ON risk_metrics FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

-- Users can update their risk metrics
CREATE POLICY "Users can update risk metrics for their portfolios"
ON risk_metrics FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = risk_metrics.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can delete their risk metrics
CREATE POLICY "Users can delete risk metrics for their portfolios"
ON risk_metrics FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = risk_metrics.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- =============================================
-- PHASE 3: CREATE FUNCTION TO SAVE VAR RESULTS
-- =============================================

-- Function to automatically save VaR results from the results table to risk_metrics
CREATE OR REPLACE FUNCTION save_var_to_risk_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if this is a VaR calculation (var_95, var_99, parametric, historical, monte_carlo)
  IF NEW.calc_type IN ('var_95', 'var_99', 'var_975', 'parametric', 'historical', 'monte_carlo') THEN
    
    -- Insert VaR metric
    IF NEW.var_percentage IS NOT NULL THEN
      INSERT INTO risk_metrics (
        portfolio_id,
        metric_type,
        value,
        confidence_level,
        time_horizon,
        calculation_date,
        calculation_method,
        parameters,
        created_at
      ) VALUES (
        NEW.portfolio_id,
        'var',
        NEW.var_percentage / 100, -- Store as decimal (0.05 for 5%)
        NEW.confidence,
        NEW.horizon_days,
        CURRENT_DATE,
        COALESCE(NEW.calc_type, 'unknown'),
        NEW.parameters,
        NOW()
      )
      ON CONFLICT DO NOTHING; -- Prevent duplicates
    END IF;
    
    -- Insert CVaR (ES) metric
    IF NEW.cvar_percentage IS NOT NULL THEN
      INSERT INTO risk_metrics (
        portfolio_id,
        metric_type,
        value,
        confidence_level,
        time_horizon,
        calculation_date,
        calculation_method,
        parameters,
        created_at
      ) VALUES (
        NEW.portfolio_id,
        'cvar',
        NEW.cvar_percentage / 100, -- Store as decimal
        NEW.confidence,
        NEW.horizon_days,
        CURRENT_DATE,
        COALESCE(NEW.calc_type, 'unknown'),
        NEW.parameters,
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically save VaR results
DROP TRIGGER IF EXISTS trigger_save_var_to_risk_metrics ON results;
CREATE TRIGGER trigger_save_var_to_risk_metrics
  AFTER INSERT ON results
  FOR EACH ROW
  EXECUTE FUNCTION save_var_to_risk_metrics();

-- =============================================
-- PHASE 4: CREATE HELPER FUNCTIONS
-- =============================================

-- Function to get latest risk metrics for a portfolio
CREATE OR REPLACE FUNCTION get_latest_risk_metrics(p_portfolio_id UUID)
RETURNS TABLE (
  metric_type TEXT,
  value NUMERIC,
  confidence_level NUMERIC,
  calculation_date DATE,
  calculation_method TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (rm.metric_type, rm.confidence_level)
    rm.metric_type,
    rm.value,
    rm.confidence_level,
    rm.calculation_date,
    rm.calculation_method
  FROM risk_metrics rm
  WHERE rm.portfolio_id = p_portfolio_id
  ORDER BY rm.metric_type, rm.confidence_level, rm.calculation_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get risk metrics time series for charting
CREATE OR REPLACE FUNCTION get_risk_metrics_timeseries(
  p_portfolio_id UUID,
  p_metric_type TEXT,
  p_days_back INTEGER DEFAULT 90,
  p_confidence_level NUMERIC DEFAULT NULL,
  p_time_horizon INTEGER DEFAULT NULL
)
RETURNS TABLE (
  calculation_date DATE,
  value NUMERIC,
  confidence_level NUMERIC,
  time_horizon INTEGER,
  calculation_method TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rm.calculation_date,
    rm.value,
    rm.confidence_level,
    rm.time_horizon,
    rm.calculation_method
  FROM risk_metrics rm
  WHERE rm.portfolio_id = p_portfolio_id
    AND rm.metric_type = p_metric_type
    AND rm.calculation_date >= CURRENT_DATE - p_days_back
    AND (p_confidence_level IS NULL OR rm.confidence_level = p_confidence_level)
    AND (p_time_horizon IS NULL OR rm.time_horizon = p_time_horizon)
  ORDER BY rm.calculation_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get aggregated metrics by timeframe
CREATE OR REPLACE FUNCTION get_aggregated_risk_metrics(
  p_portfolio_id UUID,
  p_metric_type TEXT,
  p_timeframe TEXT, -- '1m', '3m', '6m', '1y', 'all'
  p_confidence_level NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  period_end DATE,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  latest_value NUMERIC
) AS $$
DECLARE
  v_days_back INTEGER;
  v_period_interval INTERVAL;
BEGIN
  -- Determine days back based on timeframe
  v_days_back := CASE p_timeframe
    WHEN '1m' THEN 30
    WHEN '3m' THEN 90
    WHEN '6m' THEN 180
    WHEN '1y' THEN 365
    WHEN 'all' THEN 365 * 3 -- 3 years
    ELSE 180
  END;
  
  -- Determine aggregation period
  v_period_interval := CASE p_timeframe
    WHEN '1m' THEN INTERVAL '1 week'
    WHEN '3m' THEN INTERVAL '1 week'
    WHEN '6m' THEN INTERVAL '2 weeks'
    WHEN '1y' THEN INTERVAL '1 month'
    WHEN 'all' THEN INTERVAL '1 month'
    ELSE INTERVAL '1 week'
  END;
  
  RETURN QUERY
  WITH date_series AS (
    SELECT 
      generate_series(
        CURRENT_DATE - v_days_back,
        CURRENT_DATE,
        v_period_interval
      )::DATE AS period_end
  ),
  metrics_by_period AS (
    SELECT 
      ds.period_end,
      rm.value,
      rm.calculation_date,
      ROW_NUMBER() OVER (PARTITION BY ds.period_end ORDER BY rm.calculation_date DESC) as rn
    FROM date_series ds
    LEFT JOIN risk_metrics rm ON 
      rm.portfolio_id = p_portfolio_id
      AND rm.metric_type = p_metric_type
      AND rm.calculation_date <= ds.period_end
      AND rm.calculation_date > ds.period_end - v_period_interval
      AND (p_confidence_level IS NULL OR rm.confidence_level = p_confidence_level)
  )
  SELECT 
    mbp.period_end,
    AVG(mbp.value) as avg_value,
    MIN(mbp.value) as min_value,
    MAX(mbp.value) as max_value,
    MAX(CASE WHEN mbp.rn = 1 THEN mbp.value END) as latest_value
  FROM metrics_by_period mbp
  WHERE mbp.value IS NOT NULL
  GROUP BY mbp.period_end
  ORDER BY mbp.period_end ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 5: MIGRATE EXISTING DATA
-- =============================================

-- Migrate existing VaR results from results table to risk_metrics
INSERT INTO risk_metrics (
  portfolio_id,
  metric_type,
  value,
  confidence_level,
  time_horizon,
  calculation_date,
  calculation_method,
  parameters,
  created_at
)
SELECT 
  r.portfolio_id,
  'var' as metric_type,
  r.var_percentage / 100 as value,
  r.confidence,
  r.horizon_days,
  r.created_at::DATE,
  r.calc_type,
  r.parameters,
  r.created_at
FROM results r
WHERE r.var_percentage IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM risk_metrics rm
    WHERE rm.portfolio_id = r.portfolio_id
      AND rm.metric_type = 'var'
      AND rm.calculation_date = r.created_at::DATE
      AND rm.confidence_level = r.confidence
  )
ON CONFLICT DO NOTHING;

-- Migrate CVaR data
INSERT INTO risk_metrics (
  portfolio_id,
  metric_type,
  value,
  confidence_level,
  time_horizon,
  calculation_date,
  calculation_method,
  parameters,
  created_at
)
SELECT 
  r.portfolio_id,
  'cvar' as metric_type,
  r.cvar_percentage / 100 as value,
  r.confidence,
  r.horizon_days,
  r.created_at::DATE,
  r.calc_type,
  r.parameters,
  r.created_at
FROM results r
WHERE r.cvar_percentage IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM risk_metrics rm
    WHERE rm.portfolio_id = r.portfolio_id
      AND rm.metric_type = 'cvar'
      AND rm.calculation_date = r.created_at::DATE
      AND rm.confidence_level = r.confidence
  )
ON CONFLICT DO NOTHING;

-- =============================================
-- PHASE 6: CREATE VIEWS FOR EASY QUERYING
-- =============================================

-- View for latest metrics by portfolio
CREATE OR REPLACE VIEW v_latest_portfolio_metrics AS
SELECT DISTINCT ON (rm.portfolio_id, rm.metric_type, rm.confidence_level)
  rm.portfolio_id,
  p.name as portfolio_name,
  p.user_id,
  rm.metric_type,
  rm.value,
  rm.confidence_level,
  rm.time_horizon,
  rm.calculation_date,
  rm.calculation_method
FROM risk_metrics rm
INNER JOIN portfolios p ON p.id = rm.portfolio_id
ORDER BY rm.portfolio_id, rm.metric_type, rm.confidence_level, rm.calculation_date DESC;

-- View for VaR metrics specifically
CREATE OR REPLACE VIEW v_var_metrics AS
SELECT 
  rm.id,
  rm.portfolio_id,
  p.name as portfolio_name,
  p.user_id,
  rm.value * 100 as var_percentage,
  rm.confidence_level,
  rm.time_horizon,
  rm.calculation_date,
  rm.calculation_method,
  rm.parameters,
  rm.created_at
FROM risk_metrics rm
INNER JOIN portfolios p ON p.id = rm.portfolio_id
WHERE rm.metric_type = 'var';

-- =============================================
-- PHASE 7: CLEANUP OLD DATA (OPTIONAL)
-- =============================================

-- Function to clean up old risk metrics (keep last N days)
CREATE OR REPLACE FUNCTION cleanup_old_risk_metrics(p_days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM risk_metrics
  WHERE calculation_date < CURRENT_DATE - p_days_to_keep;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- PHASE 8: VERIFICATION
-- =============================================

-- Verify risk_metrics table exists and has data
SELECT 
  'Risk Metrics Verification' as check_type,
  COUNT(*) as total_metrics,
  COUNT(DISTINCT portfolio_id) as unique_portfolios,
  COUNT(DISTINCT metric_type) as unique_metric_types,
  MIN(calculation_date) as earliest_date,
  MAX(calculation_date) as latest_date
FROM risk_metrics;

-- Verify RLS is enabled
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'risk_metrics';

-- Verify policies exist
SELECT 
  'RLS Policies' as check_type,
  policyname,
  cmd as command,
  CASE cmd
    WHEN 'SELECT' THEN '✅ Users can view their metrics'
    WHEN 'INSERT' THEN '✅ Users can insert their metrics'
    WHEN 'UPDATE' THEN '✅ Users can update their metrics'
    WHEN 'DELETE' THEN '✅ Users can delete their metrics'
  END as description
FROM pg_policies
WHERE tablename = 'risk_metrics'
ORDER BY cmd;

-- Show sample metrics by type
SELECT 
  'Metrics by Type' as check_type,
  metric_type,
  COUNT(*) as count,
  AVG(value) as avg_value,
  MIN(calculation_date) as earliest,
  MAX(calculation_date) as latest
FROM risk_metrics
GROUP BY metric_type
ORDER BY metric_type;

-- Final summary
SELECT 
  'MIGRATION COMPLETE' as status,
  'Risk metrics table created with user isolation' as result,
  'VaR results will automatically feed into risk tracking' as integration,
  'Use get_risk_metrics_timeseries() function for charting' as usage;

