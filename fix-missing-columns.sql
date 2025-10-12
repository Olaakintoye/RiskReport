-- Fix missing columns in portfolios table
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS base_ccy VARCHAR(3) DEFAULT 'USD';
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS risk_tolerance VARCHAR(20) DEFAULT 'moderate';

-- Check the current schema
\d portfolios;
