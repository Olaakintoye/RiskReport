-- =============================================
-- Fix Auto VaR Calculations - Database Support
-- Prevents showing calculated VaR before user runs analysis
-- =============================================

-- Step 1: Create function to check if portfolio has VaR analysis
CREATE OR REPLACE FUNCTION portfolio_has_var_analysis(p_portfolio_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM results
    WHERE portfolio_id = p_portfolio_id
      AND var_percentage IS NOT NULL
      AND var_percentage > 0
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create function to get analysis count
CREATE OR REPLACE FUNCTION get_var_analysis_count(p_portfolio_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM results
  WHERE portfolio_id = p_portfolio_id
    AND var_percentage IS NOT NULL
    AND var_percentage > 0;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create function to get latest analysis date
CREATE OR REPLACE FUNCTION get_latest_var_analysis_date(p_portfolio_id UUID)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_latest_date TIMESTAMPTZ;
BEGIN
  SELECT MAX(created_at) INTO v_latest_date
  FROM results
  WHERE portfolio_id = p_portfolio_id
    AND var_percentage IS NOT NULL
    AND var_percentage > 0;
  
  RETURN v_latest_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION portfolio_has_var_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_var_analysis_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_var_analysis_date(UUID) TO authenticated;

-- Step 5: Add comments
COMMENT ON FUNCTION portfolio_has_var_analysis(UUID) IS 
'Check if a portfolio has any completed VaR analysis results';

COMMENT ON FUNCTION get_var_analysis_count(UUID) IS 
'Get the total number of VaR analyses run for a portfolio';

COMMENT ON FUNCTION get_latest_var_analysis_date(UUID) IS 
'Get the timestamp of the most recent VaR analysis for a portfolio';

-- Step 6: Verification
DO $$
DECLARE
  v_test_portfolio UUID;
  v_has_analysis BOOLEAN;
  v_count INTEGER;
BEGIN
  -- Test with first portfolio in database
  SELECT id INTO v_test_portfolio FROM portfolios LIMIT 1;
  
  IF v_test_portfolio IS NOT NULL THEN
    v_has_analysis := portfolio_has_var_analysis(v_test_portfolio);
    v_count := get_var_analysis_count(v_test_portfolio);
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '   VAR ANALYSIS CHECK FUNCTIONS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Functions created successfully';
    RAISE NOTICE '';
    RAISE NOTICE 'Test Results:';
    RAISE NOTICE '  Portfolio ID: %', v_test_portfolio;
    RAISE NOTICE '  Has Analysis: %', v_has_analysis;
    RAISE NOTICE '  Analysis Count: %', v_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Available Functions:';
    RAISE NOTICE '  - portfolio_has_var_analysis(portfolio_id)';
    RAISE NOTICE '  - get_var_analysis_count(portfolio_id)';
    RAISE NOTICE '  - get_latest_var_analysis_date(portfolio_id)';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE 'No portfolios found for testing';
  END IF;
END $$;

