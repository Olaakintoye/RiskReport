-- Fix CVaR constraint to allow positive values
-- VaR models return positive values for losses, not negative

-- Drop the old constraint
ALTER TABLE results DROP CONSTRAINT IF EXISTS es_negative;
ALTER TABLE results DROP CONSTRAINT IF EXISTS var_negative;

-- Add new constraints that allow positive values (which represent losses)
-- Or NULL values
ALTER TABLE results 
ADD CONSTRAINT var_valid CHECK (var_amount IS NULL OR var_amount >= 0);

ALTER TABLE results 
ADD CONSTRAINT es_valid CHECK (es_amount IS NULL OR es_amount >= 0);

-- Add comment to clarify
COMMENT ON COLUMN results.var_amount IS 'VaR amount (positive value represents loss)';
COMMENT ON COLUMN results.es_amount IS 'Expected Shortfall / CVaR (positive value represents loss)';

