-- Add position_code column to positions table
-- This provides a human-readable identifier: TICKER-12345

ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS position_code VARCHAR(50) UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_positions_position_code ON positions(position_code);

-- Add comment to explain the column
COMMENT ON COLUMN positions.position_code IS 'Human-readable position identifier in format TICKER-XXXXX (e.g., AAPL-12345). Unique across all users and positions.';

