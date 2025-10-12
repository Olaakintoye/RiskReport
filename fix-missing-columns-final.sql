-- Fix all missing columns for portfolio sync
-- Run this in Supabase SQL Editor

-- Add missing columns to portfolios table
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS base_ccy VARCHAR(3) DEFAULT 'USD';
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS risk_tolerance VARCHAR(20) DEFAULT 'moderate';

-- Add missing columns to positions table  
ALTER TABLE positions ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP WITH TIME ZONE;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS price_source VARCHAR(50) DEFAULT 'manual';

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'portfolios' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'positions' 
ORDER BY ordinal_position;
