-- =============================================
-- Portfolio VaR Analysis Check Functions
-- Helper functions to check if a portfolio has analysis results
-- =============================================

-- Function to check if a portfolio has any VaR analysis results
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

-- Function to get the count of VaR analyses for a portfolio
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

-- Function to get the latest VaR analysis date for a portfolio
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

-- Add RLS policy for these functions
GRANT EXECUTE ON FUNCTION portfolio_has_var_analysis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_var_analysis_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_var_analysis_date(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION portfolio_has_var_analysis(UUID) IS 
'Check if a portfolio has any completed VaR analysis results';

COMMENT ON FUNCTION get_var_analysis_count(UUID) IS 
'Get the total number of VaR analyses run for a portfolio';

COMMENT ON FUNCTION get_latest_var_analysis_date(UUID) IS 
'Get the timestamp of the most recent VaR analysis for a portfolio';

-- Verification queries
DO $$
BEGIN
  RAISE NOTICE '✅ Portfolio VaR analysis check functions created successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'Available functions:';
  RAISE NOTICE '  - portfolio_has_var_analysis(portfolio_id) → boolean';
  RAISE NOTICE '  - get_var_analysis_count(portfolio_id) → integer';
  RAISE NOTICE '  - get_latest_var_analysis_date(portfolio_id) → timestamp';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage example:';
  RAISE NOTICE '  SELECT portfolio_has_var_analysis(''your-portfolio-id'');';
END $$;

