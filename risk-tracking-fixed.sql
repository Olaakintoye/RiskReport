-- =============================================
-- Risk Tracking User Isolation & VaR Integration
-- FIXED VERSION - Compatible with existing schema
-- =============================================

-- Step 1: Create risk_metrics table (if not exists, or modify existing)
DO $$ 
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_metrics') THEN
    -- Create new table
    CREATE TABLE risk_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      metric_type TEXT NOT NULL CHECK (metric_type IN ('var', 'cvar', 'volatility', 'sharpe_ratio', 'beta', 'max_drawdown', 'sortino_ratio', 'treynor_ratio', 'calmar_ratio')),
      value NUMERIC NOT NULL,
      confidence_level NUMERIC CHECK (confidence_level > 0 AND confidence_level < 1),
      time_horizon INTEGER,
      calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
      methodology TEXT,
      parameters JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE 'Created risk_metrics table';
  ELSE
    -- Table exists, ensure it has the columns we need
    -- Add metric_type if it doesn't exist (for old schemas with risk_metric_type enum)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'risk_metrics' AND column_name = 'metric_type' AND data_type = 'text'
    ) THEN
      ALTER TABLE risk_metrics ADD COLUMN IF NOT EXISTS metric_type TEXT;
    END IF;
    RAISE NOTICE 'risk_metrics table already exists';
  END IF;
END $$;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_date 
ON risk_metrics(portfolio_id, calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_type 
ON risk_metrics(metric_type, calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_type 
ON risk_metrics(portfolio_id, metric_type, calculation_date DESC);

-- Step 3: Enable RLS
ALTER TABLE risk_metrics ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view risk metrics for their portfolios" ON risk_metrics;
DROP POLICY IF EXISTS "Service role can insert risk metrics" ON risk_metrics;
DROP POLICY IF EXISTS "Users can insert risk metrics for their portfolios" ON risk_metrics;
DROP POLICY IF EXISTS "Users can update risk metrics for their portfolios" ON risk_metrics;
DROP POLICY IF EXISTS "Users can delete risk metrics for their portfolios" ON risk_metrics;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view risk metrics for their portfolios"
ON risk_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = risk_metrics.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert risk metrics for their portfolios"
ON risk_metrics FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = risk_metrics.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can insert risk metrics"
ON risk_metrics FOR INSERT
WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Users can update risk metrics for their portfolios"
ON risk_metrics FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = risk_metrics.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete risk metrics for their portfolios"
ON risk_metrics FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = risk_metrics.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Step 6: Create trigger function
CREATE OR REPLACE FUNCTION save_var_to_risk_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process VaR calculations
  IF NEW.calc_type IN ('var_95', 'var_99', 'var_975', 'parametric', 'historical', 'monte_carlo') THEN
    
    -- Insert VaR metric (check if var_percentage exists in results table)
    IF NEW.var_percentage IS NOT NULL THEN
      INSERT INTO risk_metrics (
        portfolio_id,
        metric_type,
        value,
        confidence_level,
        time_horizon,
        calculation_date,
        methodology,
        parameters,
        created_at
      ) VALUES (
        NEW.portfolio_id,
        'var',
        NEW.var_percentage / 100, -- Convert percentage to decimal
        NEW.confidence,
        NEW.horizon_days,
        CURRENT_DATE,
        NEW.calc_type, -- Use calc_type as methodology
        COALESCE(NEW.parameters, NEW.params, '{}'::JSONB), -- Try both column names
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Insert CVaR metric (check if cvar_percentage exists)
    IF NEW.cvar_percentage IS NOT NULL THEN
      INSERT INTO risk_metrics (
        portfolio_id,
        metric_type,
        value,
        confidence_level,
        time_horizon,
        calculation_date,
        methodology,
        parameters,
        created_at
      ) VALUES (
        NEW.portfolio_id,
        'cvar',
        NEW.cvar_percentage / 100, -- Convert percentage to decimal
        NEW.confidence,
        NEW.horizon_days,
        CURRENT_DATE,
        NEW.calc_type,
        COALESCE(NEW.parameters, NEW.params, '{}'::JSONB),
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger
DROP TRIGGER IF EXISTS trigger_save_var_to_risk_metrics ON results;
CREATE TRIGGER trigger_save_var_to_risk_metrics
  AFTER INSERT ON results
  FOR EACH ROW
  EXECUTE FUNCTION save_var_to_risk_metrics();

-- Step 8: Migrate existing data (only if var_percentage column exists in results)
DO $$
BEGIN
  -- Check if var_percentage column exists in results table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'results' AND column_name = 'var_percentage'
  ) THEN
    -- Migrate VaR data
    INSERT INTO risk_metrics (
      portfolio_id,
      metric_type,
      value,
      confidence_level,
      time_horizon,
      calculation_date,
      methodology,
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
      COALESCE(r.parameters, r.params, '{}'::JSONB),
      r.created_at
    FROM results r
    WHERE r.var_percentage IS NOT NULL
      AND r.var_percentage > 0
      AND NOT EXISTS (
        SELECT 1 FROM risk_metrics rm
        WHERE rm.portfolio_id = r.portfolio_id
          AND rm.metric_type = 'var'
          AND rm.calculation_date = r.created_at::DATE
          AND rm.confidence_level = r.confidence
      )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Migrated VaR data from results table';
    
    -- Migrate CVaR data if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'results' AND column_name = 'cvar_percentage'
    ) THEN
      INSERT INTO risk_metrics (
        portfolio_id,
        metric_type,
        value,
        confidence_level,
        time_horizon,
        calculation_date,
        methodology,
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
        COALESCE(r.parameters, r.params, '{}'::JSONB),
        r.created_at
      FROM results r
      WHERE r.cvar_percentage IS NOT NULL
        AND r.cvar_percentage > 0
        AND NOT EXISTS (
          SELECT 1 FROM risk_metrics rm
          WHERE rm.portfolio_id = r.portfolio_id
            AND rm.metric_type = 'cvar'
            AND rm.calculation_date = r.created_at::DATE
            AND rm.confidence_level = r.confidence
        )
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Migrated CVaR data from results table';
    END IF;
  ELSE
    RAISE NOTICE 'var_percentage column does not exist in results table - skipping migration';
  END IF;
END $$;

-- Step 9: Verification queries
SELECT 
  'Migration Complete' as status,
  COUNT(*) as total_metrics,
  COUNT(DISTINCT portfolio_id) as unique_portfolios,
  COUNT(DISTINCT metric_type) as metric_types
FROM risk_metrics;

SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'risk_metrics';

SELECT 
  'Policies Created' as check_type,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'risk_metrics';

SELECT 
  'Metrics by Type' as check_type,
  metric_type,
  COUNT(*) as count
FROM risk_metrics
GROUP BY metric_type
ORDER BY metric_type;

