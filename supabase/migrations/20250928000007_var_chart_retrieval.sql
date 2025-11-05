-- =============================================
-- VaR Chart Retrieval and Storage Enhancement
-- Migration to support proper chart URL retrieval with user isolation
-- =============================================

-- Step 1: Add user_id column to results table for efficient RLS filtering
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'results' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE results ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added user_id column to results table';
  ELSE
    RAISE NOTICE 'ℹ️  user_id column already exists in results table';
  END IF;
END $$;

-- Step 2: Populate user_id from portfolios for existing records
UPDATE results r 
SET user_id = p.user_id 
FROM portfolios p 
WHERE r.portfolio_id = p.id AND r.user_id IS NULL;

-- Step 3: Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_portfolio_calc_type ON results(portfolio_id, calc_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_chart_storage ON results(portfolio_id, calc_type, created_at DESC) 
  WHERE chart_storage_url IS NOT NULL;

-- Step 4: Enable RLS on results table
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies if they exist and create new ones
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view their own VaR results" ON results;
  DROP POLICY IF EXISTS "Service role can insert VaR results" ON results;
  DROP POLICY IF EXISTS "Users can insert their own VaR results" ON results;
  DROP POLICY IF EXISTS "Users can view results for their portfolios" ON results;
  
  -- Create SELECT policy: Users can view results for portfolios they own
  CREATE POLICY "Users can view results for their portfolios"
    ON results FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM portfolios p
        WHERE p.id = results.portfolio_id
        AND p.user_id = auth.uid()
      )
    );
  
  -- Create INSERT policy: Service role can insert results
  CREATE POLICY "Service role can insert VaR results"
    ON results FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
  
  -- Create INSERT policy: Authenticated users can insert results for their portfolios
  CREATE POLICY "Users can insert their own VaR results"
    ON results FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM portfolios p
        WHERE p.id = results.portfolio_id
        AND p.user_id = auth.uid()
      )
    );
  
  RAISE NOTICE '✅ Created RLS policies for results table';
END $$;

-- Step 6: Create function to get latest chart URLs for a portfolio
CREATE OR REPLACE FUNCTION get_latest_var_charts(p_portfolio_id UUID)
RETURNS TABLE (
  calc_type TEXT,
  chart_storage_url TEXT,
  var_percentage NUMERIC,
  cvar_percentage NUMERIC,
  portfolio_value NUMERIC,
  created_at TIMESTAMPTZ,
  confidence NUMERIC,
  horizon_days INTEGER
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the requesting user owns this portfolio (security check)
  IF NOT EXISTS (
    SELECT 1 FROM portfolios 
    WHERE id = p_portfolio_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Portfolio not found or does not belong to user';
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (r.calc_type)
    r.calc_type,
    r.chart_storage_url,
    r.var_percentage,
    r.cvar_percentage,
    r.portfolio_value,
    r.created_at,
    r.confidence,
    r.horizon_days
  FROM results r
  WHERE r.portfolio_id = p_portfolio_id
    AND r.chart_storage_url IS NOT NULL
    AND r.chart_storage_url != ''
    AND r.calc_type IN ('parametric', 'historical', 'monte_carlo', 'monte-carlo')
  ORDER BY r.calc_type, r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION get_latest_var_charts(UUID) IS 
'Retrieves the latest chart URLs for each VaR model type (parametric, historical, monte_carlo) for a given portfolio. Includes user ownership verification.';

-- Step 7: Create cleanup function to delete old charts (keep only latest per portfolio+model)
CREATE OR REPLACE FUNCTION cleanup_old_var_charts()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete old chart records, keeping only the latest per portfolio+model
  WITH old_records AS (
    SELECT id 
    FROM (
      SELECT id, 
        ROW_NUMBER() OVER (
          PARTITION BY portfolio_id, calc_type 
          ORDER BY created_at DESC
        ) as rn
      FROM results
      WHERE chart_storage_url IS NOT NULL
    ) sub
    WHERE sub.rn > 1  -- Keep only the most recent
  )
  DELETE FROM results
  WHERE id IN (SELECT id FROM old_records);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleaned up % old VaR chart records', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION cleanup_old_var_charts() IS 
'Deletes old VaR chart records, keeping only the most recent chart for each portfolio+model combination. Returns count of deleted records.';

-- Step 8: Create trigger function for automatic cleanup on new chart insertion
CREATE OR REPLACE FUNCTION trigger_cleanup_old_charts()
RETURNS TRIGGER AS $$
BEGIN
  -- After inserting a new chart, cleanup old ones for this portfolio+model combination
  DELETE FROM results
  WHERE portfolio_id = NEW.portfolio_id
    AND calc_type = NEW.calc_type
    AND chart_storage_url IS NOT NULL
    AND created_at < NEW.created_at
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger for automatic cleanup
DROP TRIGGER IF EXISTS auto_cleanup_old_var_charts ON results;
CREATE TRIGGER auto_cleanup_old_var_charts
  AFTER INSERT ON results
  FOR EACH ROW
  WHEN (NEW.chart_storage_url IS NOT NULL)
  EXECUTE FUNCTION trigger_cleanup_old_charts();

DO $$
BEGIN
  RAISE NOTICE '✅ Created trigger for automatic chart cleanup';
END $$;

-- Step 10: Create helper view for easy result retrieval with portfolio and user info
CREATE OR REPLACE VIEW latest_var_charts_view AS
SELECT DISTINCT ON (r.portfolio_id, r.calc_type)
  r.id,
  r.portfolio_id,
  r.calc_type,
  r.chart_storage_url,
  r.var_percentage,
  r.cvar_percentage,
  r.portfolio_value,
  r.confidence,
  r.horizon_days,
  r.created_at,
  p.name as portfolio_name,
  p.user_id
FROM results r
INNER JOIN portfolios p ON r.portfolio_id = p.id
WHERE r.chart_storage_url IS NOT NULL
  AND r.chart_storage_url != ''
ORDER BY r.portfolio_id, r.calc_type, r.created_at DESC;

-- Add comment to view
COMMENT ON VIEW latest_var_charts_view IS 
'View showing the latest VaR chart for each portfolio+model combination with portfolio and user information';

-- Step 11: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_latest_var_charts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_var_charts() TO authenticated;
GRANT SELECT ON latest_var_charts_view TO authenticated;

-- Step 12: Run initial cleanup to remove any duplicate charts
DO $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  SELECT cleanup_old_var_charts() INTO cleaned_count;
  RAISE NOTICE '✅ Initial cleanup complete: removed % old chart records', cleaned_count;
END $$;

-- Step 13: Verification summary
DO $$
DECLARE
  v_total_results INTEGER;
  v_results_with_charts INTEGER;
  v_unique_portfolios INTEGER;
  v_rls_enabled BOOLEAN;
  v_policies_count INTEGER;
BEGIN
  -- Count metrics
  SELECT COUNT(*) INTO v_total_results FROM results;
  SELECT COUNT(*) INTO v_results_with_charts FROM results WHERE chart_storage_url IS NOT NULL;
  SELECT COUNT(DISTINCT portfolio_id) INTO v_unique_portfolios FROM results WHERE chart_storage_url IS NOT NULL;
  
  -- Check RLS
  SELECT rowsecurity INTO v_rls_enabled FROM pg_tables WHERE schemaname = 'public' AND tablename = 'results';
  
  -- Count policies
  SELECT COUNT(*) INTO v_policies_count FROM pg_policies WHERE tablename = 'results';
  
  -- Print summary
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   VAR CHART RETRIEVAL MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Results: %', v_total_results;
  RAISE NOTICE 'Results with Charts: %', v_results_with_charts;
  RAISE NOTICE 'Portfolios with Charts: %', v_unique_portfolios;
  RAISE NOTICE 'RLS Enabled: %', CASE WHEN v_rls_enabled THEN '✅ YES' ELSE '❌ NO' END;
  RAISE NOTICE 'RLS Policies: %', v_policies_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Functions Created:';
  RAISE NOTICE '  - get_latest_var_charts(portfolio_id)';
  RAISE NOTICE '  - cleanup_old_var_charts()';
  RAISE NOTICE '  - trigger_cleanup_old_charts()';
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger Created:';
  RAISE NOTICE '  - auto_cleanup_old_var_charts';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Final verification query
SELECT 
  calc_type,
  COUNT(*) as chart_count,
  COUNT(DISTINCT portfolio_id) as portfolio_count,
  MIN(created_at) as earliest_chart,
  MAX(created_at) as latest_chart
FROM results
WHERE chart_storage_url IS NOT NULL
GROUP BY calc_type
ORDER BY calc_type;

