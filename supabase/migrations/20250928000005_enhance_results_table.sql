-- Enhance results table for VaR result storage and history tracking
-- This migration adds columns needed for storing VaR analysis results with charts

-- Add new columns to results table
ALTER TABLE results 
ADD COLUMN IF NOT EXISTS var_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS cvar_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS portfolio_value NUMERIC,
ADD COLUMN IF NOT EXISTS chart_storage_url TEXT,
ADD COLUMN IF NOT EXISTS chart_base64 TEXT,
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}'::JSONB;

-- Update existing params column to parameters if it exists but is missing data
UPDATE results 
SET parameters = COALESCE(params, '{}'::JSONB)
WHERE parameters IS NULL;

-- Create index for efficient history queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_results_portfolio_created 
ON results(portfolio_id, created_at DESC);

-- Create index for calc_type queries
CREATE INDEX IF NOT EXISTS idx_results_calc_type 
ON results(calc_type, created_at DESC);

-- Add index for user_id joins through portfolios
CREATE INDEX IF NOT EXISTS idx_results_portfolio_user 
ON results(portfolio_id);

-- Add comment for documentation
COMMENT ON COLUMN results.var_percentage IS 'VaR as a percentage of portfolio value';
COMMENT ON COLUMN results.cvar_percentage IS 'CVaR (Expected Shortfall) as a percentage of portfolio value';
COMMENT ON COLUMN results.portfolio_value IS 'Total portfolio value at time of calculation';
COMMENT ON COLUMN results.chart_storage_url IS 'Supabase Storage URL for the VaR distribution chart';
COMMENT ON COLUMN results.chart_base64 IS 'Base64-encoded chart image (temporary, can be NULL after upload to storage)';
COMMENT ON COLUMN results.parameters IS 'Analysis parameters: confidence_level, time_horizon, lookback_period, num_simulations, etc.';

-- Create a helper view for easy result retrieval with portfolio info
CREATE OR REPLACE VIEW var_results_with_portfolio AS
SELECT 
  r.id,
  r.portfolio_id,
  p.name as portfolio_name,
  p.user_id,
  r.calc_type,
  r.confidence,
  r.horizon_days,
  r.var_amount,
  r.var_percentage,
  r.es_amount as cvar_amount,
  r.cvar_percentage,
  r.portfolio_value,
  r.chart_storage_url,
  r.parameters,
  r.created_at
FROM results r
JOIN portfolios p ON r.portfolio_id = p.id
ORDER BY r.created_at DESC;

-- Grant access to the view
GRANT SELECT ON var_results_with_portfolio TO authenticated;

-- Add RLS policy for the results table to allow service role to insert
-- (This is needed for the backend to save results)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'results' 
    AND policyname = 'Service role can insert results'
  ) THEN
    CREATE POLICY "Service role can insert results"
    ON results FOR INSERT
    TO service_role
    WITH CHECK (true);
  END IF;
END $$;

-- Add RLS policy for authenticated users to view their own results
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'results' 
    AND policyname = 'Users can view their own VaR results'
  ) THEN
    CREATE POLICY "Users can view their own VaR results"
    ON results FOR SELECT
    TO authenticated
    USING (
      portfolio_id IN (
        SELECT id FROM portfolios WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;

