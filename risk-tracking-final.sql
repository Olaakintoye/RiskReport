-- =============================================
-- Risk Tracking User Isolation & VaR Integration
-- FINAL SAFE VERSION - Handles all existing objects
-- =============================================

-- Step 1: Create risk_metrics table (handle existing table gracefully)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_metrics') THEN
    CREATE TABLE risk_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      metric_type TEXT NOT NULL,
      value NUMERIC NOT NULL,
      confidence_level NUMERIC,
      time_horizon INTEGER,
      calculation_date DATE NOT NULL DEFAULT CURRENT_DATE,
      methodology TEXT,
      parameters JSONB DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    RAISE NOTICE '✅ Created risk_metrics table';
  ELSE
    RAISE NOTICE 'ℹ️  risk_metrics table already exists';
  END IF;
END $$;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'risk_metrics_metric_type_check'
  ) THEN
    ALTER TABLE risk_metrics 
    ADD CONSTRAINT risk_metrics_metric_type_check 
    CHECK (metric_type IN ('var', 'cvar', 'volatility', 'sharpe_ratio', 'beta', 'max_drawdown', 'sortino_ratio', 'treynor_ratio', 'calmar_ratio'));
    RAISE NOTICE '✅ Added metric_type check constraint';
  END IF;
END $$;

-- Step 2: Create indexes (IF NOT EXISTS handles duplicates)
CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_date 
ON risk_metrics(portfolio_id, calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_type 
ON risk_metrics(metric_type, calculation_date DESC);

CREATE INDEX IF NOT EXISTS idx_risk_metrics_portfolio_type 
ON risk_metrics(portfolio_id, metric_type, calculation_date DESC);

-- Step 3: Enable RLS
ALTER TABLE risk_metrics ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop and recreate policies (safe approach)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view risk metrics for their portfolios" ON risk_metrics;
  CREATE POLICY "Users can view risk metrics for their portfolios"
  ON risk_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = risk_metrics.portfolio_id 
      AND p.user_id = auth.uid()
    )
  );
  RAISE NOTICE '✅ Created SELECT policy for risk_metrics';
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can insert risk metrics for their portfolios" ON risk_metrics;
  CREATE POLICY "Users can insert risk metrics for their portfolios"
  ON risk_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = risk_metrics.portfolio_id 
      AND p.user_id = auth.uid()
    )
  );
  RAISE NOTICE '✅ Created INSERT policy for risk_metrics (users)';
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role can insert risk metrics" ON risk_metrics;
  CREATE POLICY "Service role can insert risk metrics"
  ON risk_metrics FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );
  RAISE NOTICE '✅ Created INSERT policy for risk_metrics (service role)';
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update risk metrics for their portfolios" ON risk_metrics;
  CREATE POLICY "Users can update risk metrics for their portfolios"
  ON risk_metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = risk_metrics.portfolio_id 
      AND p.user_id = auth.uid()
    )
  );
  RAISE NOTICE '✅ Created UPDATE policy for risk_metrics';
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can delete risk metrics for their portfolios" ON risk_metrics;
  CREATE POLICY "Users can delete risk metrics for their portfolios"
  ON risk_metrics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM portfolios p 
      WHERE p.id = risk_metrics.portfolio_id 
      AND p.user_id = auth.uid()
    )
  );
  RAISE NOTICE '✅ Created DELETE policy for risk_metrics';
END $$;

-- Step 5: Create or replace trigger function
CREATE OR REPLACE FUNCTION save_var_to_risk_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process VaR calculations
  IF NEW.calc_type IN ('var_95', 'var_99', 'var_975', 'parametric', 'historical', 'monte_carlo') THEN
    
    -- Insert VaR metric
    IF NEW.var_percentage IS NOT NULL AND NEW.var_percentage > 0 THEN
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
        NEW.var_percentage / 100,
        NEW.confidence,
        NEW.horizon_days,
        CURRENT_DATE,
        NEW.calc_type,
        COALESCE(NEW.parameters, NEW.params, '{}'::JSONB),
        NOW()
      )
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Insert CVaR metric
    IF NEW.cvar_percentage IS NOT NULL AND NEW.cvar_percentage > 0 THEN
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
        NEW.cvar_percentage / 100,
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

-- Step 6: Create trigger (DROP IF EXISTS to handle existing)
DROP TRIGGER IF EXISTS trigger_save_var_to_risk_metrics ON results;
CREATE TRIGGER trigger_save_var_to_risk_metrics
  AFTER INSERT ON results
  FOR EACH ROW
  EXECUTE FUNCTION save_var_to_risk_metrics();

-- Step 7: Migrate existing data (with safety checks)
DO $$
DECLARE
  v_migrated_var INTEGER := 0;
  v_migrated_cvar INTEGER := 0;
BEGIN
  -- Check if necessary columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'results' 
    AND column_name IN ('var_percentage', 'calc_type', 'portfolio_id')
  ) THEN
    
    -- Migrate VaR data
    WITH inserted AS (
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
            AND COALESCE(rm.confidence_level, 0) = COALESCE(r.confidence, 0)
        )
      ON CONFLICT DO NOTHING
      RETURNING *
    )
    SELECT COUNT(*) INTO v_migrated_var FROM inserted;
    
    -- Migrate CVaR data if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'results' AND column_name = 'cvar_percentage'
    ) THEN
      WITH inserted AS (
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
              AND COALESCE(rm.confidence_level, 0) = COALESCE(r.confidence, 0)
          )
        ON CONFLICT DO NOTHING
        RETURNING *
      )
      SELECT COUNT(*) INTO v_migrated_cvar FROM inserted;
    END IF;
    
    RAISE NOTICE '✅ Migrated % VaR records and % CVaR records', v_migrated_var, v_migrated_cvar;
  ELSE
    RAISE NOTICE 'ℹ️  Required columns not found in results table - skipping migration';
  END IF;
END $$;

-- Step 8: Verification and Summary
DO $$
DECLARE
  v_total INTEGER;
  v_portfolios INTEGER;
  v_types INTEGER;
  v_rls_enabled BOOLEAN;
  v_policies INTEGER;
BEGIN
  -- Count metrics
  SELECT COUNT(*), COUNT(DISTINCT portfolio_id), COUNT(DISTINCT metric_type)
  INTO v_total, v_portfolios, v_types
  FROM risk_metrics;
  
  -- Check RLS
  SELECT rowsecurity INTO v_rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'risk_metrics';
  
  -- Count policies
  SELECT COUNT(*) INTO v_policies
  FROM pg_policies
  WHERE tablename = 'risk_metrics';
  
  -- Print summary
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   RISK TRACKING MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Metrics: %', v_total;
  RAISE NOTICE 'Unique Portfolios: %', v_portfolios;
  RAISE NOTICE 'Metric Types: %', v_types;
  RAISE NOTICE 'RLS Enabled: %', CASE WHEN v_rls_enabled THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'Policies Created: %', v_policies;
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Final verification query
SELECT 
  metric_type,
  COUNT(*) as count,
  MIN(calculation_date) as earliest_date,
  MAX(calculation_date) as latest_date
FROM risk_metrics
GROUP BY metric_type
ORDER BY metric_type;

