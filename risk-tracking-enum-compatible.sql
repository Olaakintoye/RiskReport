-- =============================================
-- Risk Tracking User Isolation & VaR Integration
-- ENUM-COMPATIBLE VERSION - Works with existing schema
-- =============================================

-- Step 0: Extend the enum type if needed (to add new metric types)
DO $$
BEGIN
  -- Add sortino_ratio if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'sortino_ratio' 
                 AND enumtypid = 'risk_metric_type'::regtype) THEN
    ALTER TYPE risk_metric_type ADD VALUE 'sortino_ratio';
    RAISE NOTICE '✅ Added sortino_ratio to enum';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️  Could not add sortino_ratio to enum (may already exist)';
END $$;

-- Step 1: The risk_metrics table already exists, verify its structure
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'risk_metrics') THEN
    RAISE NOTICE '✅ risk_metrics table exists';
  ELSE
    RAISE EXCEPTION 'risk_metrics table does not exist! Check migrations.';
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

-- Step 4: Drop and recreate policies
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
    
    -- Insert VaR metric (use 'var' enum value)
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
        'var'::risk_metric_type, -- Cast to enum
        NEW.var_percentage / 100,
        NEW.confidence,
        NEW.horizon_days,
        CURRENT_DATE,
        NEW.calc_type,
        COALESCE(NEW.parameters, NEW.params, '{}'::JSONB),
        NOW()
      )
      ON CONFLICT (portfolio_id, metric_type, confidence_level, time_horizon, calculation_date) 
      DO UPDATE SET
        value = EXCLUDED.value,
        methodology = EXCLUDED.methodology,
        parameters = EXCLUDED.parameters,
        created_at = EXCLUDED.created_at;
    END IF;
    
    -- Insert CVaR metric (use 'cvar' enum value)
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
        'cvar'::risk_metric_type, -- Cast to enum
        NEW.cvar_percentage / 100,
        NEW.confidence,
        NEW.horizon_days,
        CURRENT_DATE,
        NEW.calc_type,
        COALESCE(NEW.parameters, NEW.params, '{}'::JSONB),
        NOW()
      )
      ON CONFLICT (portfolio_id, metric_type, confidence_level, time_horizon, calculation_date) 
      DO UPDATE SET
        value = EXCLUDED.value,
        methodology = EXCLUDED.methodology,
        parameters = EXCLUDED.parameters,
        created_at = EXCLUDED.created_at;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger (DROP IF EXISTS to handle existing)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_save_var_to_risk_metrics ON results;
  CREATE TRIGGER trigger_save_var_to_risk_metrics
    AFTER INSERT ON results
    FOR EACH ROW
    EXECUTE FUNCTION save_var_to_risk_metrics();
  RAISE NOTICE '✅ Created trigger on results table';
END $$;

-- Step 7: Migrate existing data
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
        'var'::risk_metric_type,
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
      ON CONFLICT (portfolio_id, metric_type, confidence_level, time_horizon, calculation_date) 
      DO NOTHING
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
          'cvar'::risk_metric_type,
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
        ON CONFLICT (portfolio_id, metric_type, confidence_level, time_horizon, calculation_date) 
        DO NOTHING
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

