-- Real-time Data Enhancement Migration (Safe Version)
-- This version checks for existing columns before referencing them

-- =============================================
-- ADD REAL-TIME SUPPORT COLUMNS
-- =============================================

-- Add columns to portfolios table
ALTER TABLE portfolios 
  ADD COLUMN IF NOT EXISTS last_sync_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_realtime_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ;

-- Add total_value if it doesn't exist (from base schema)
ALTER TABLE portfolios
  ADD COLUMN IF NOT EXISTS total_value NUMERIC DEFAULT 0;

-- Add columns to positions table
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_source TEXT DEFAULT 'manual';

-- Add constraint for price_source if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'positions_price_source_check'
  ) THEN
    ALTER TABLE positions 
    ADD CONSTRAINT positions_price_source_check 
    CHECK (price_source IN ('manual', 'yfinance', 'tiingo', 'api', 'sync'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN portfolios.last_sync_time IS 'Timestamp when portfolio was last synced from mobile app';
COMMENT ON COLUMN portfolios.is_realtime_enabled IS 'Enable/disable automatic real-time price updates for this portfolio';
COMMENT ON COLUMN portfolios.last_price_update IS 'Timestamp when any position price in this portfolio was last updated';
COMMENT ON COLUMN positions.last_price_update IS 'Timestamp when this position price was last fetched from market data';
COMMENT ON COLUMN positions.price_source IS 'Source of the price data (manual, yfinance, tiingo, api, sync)';

-- =============================================
-- AUTOMATIC PRICE UPDATE FUNCTION
-- =============================================

-- Function to automatically update position prices from market data cache
CREATE OR REPLACE FUNCTION update_positions_from_market_data()
RETURNS TRIGGER AS $$
DECLARE
  affected_rows INT;
BEGIN
  -- Update all positions with matching symbol
  UPDATE positions
  SET 
    last_price = NEW.last_price,
    last_price_update = NEW.last_updated,
    price_source = 'api',
    updated_at = NOW()
  WHERE symbol = NEW.symbol
    AND (last_price_update IS NULL OR last_price_update < NEW.last_updated);
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Update portfolio last_price_update for all affected portfolios
  IF affected_rows > 0 THEN
    UPDATE portfolios
    SET last_price_update = NEW.last_updated
    WHERE id IN (
      SELECT DISTINCT portfolio_id 
      FROM positions 
      WHERE symbol = NEW.symbol
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic price updates
DROP TRIGGER IF EXISTS sync_position_prices ON market_data_cache;
CREATE TRIGGER sync_position_prices
  AFTER INSERT OR UPDATE ON market_data_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_positions_from_market_data();

COMMENT ON FUNCTION update_positions_from_market_data IS 'Automatically updates position prices when market data cache is updated';

-- =============================================
-- PRICE REFRESH HELPER FUNCTIONS
-- =============================================

-- Function to get stale symbols for a portfolio
CREATE OR REPLACE FUNCTION get_stale_symbols(
  p_portfolio_id UUID, 
  p_max_age_minutes INT DEFAULT 5
)
RETURNS TABLE(
  symbol TEXT, 
  last_updated TIMESTAMPTZ,
  current_price NUMERIC,
  quantity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pos.symbol,
    pos.last_price_update,
    pos.last_price,
    pos.quantity
  FROM positions pos
  WHERE pos.portfolio_id = p_portfolio_id
    AND (
      pos.last_price_update IS NULL 
      OR pos.last_price_update < NOW() - (p_max_age_minutes || ' minutes')::INTERVAL
    )
  ORDER BY pos.last_price_update ASC NULLS FIRST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_stale_symbols IS 'Returns positions with stale prices that need refreshing';

-- Function to get all unique symbols across all user portfolios
CREATE OR REPLACE FUNCTION get_user_symbols(p_user_id UUID)
RETURNS TABLE(
  symbol TEXT,
  portfolio_count BIGINT,
  total_quantity NUMERIC,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pos.symbol,
    COUNT(DISTINCT pos.portfolio_id) as portfolio_count,
    SUM(pos.quantity) as total_quantity,
    MAX(pos.last_price_update) as last_updated
  FROM positions pos
  JOIN portfolios p ON p.id = pos.portfolio_id
  WHERE p.user_id = p_user_id
  GROUP BY pos.symbol
  ORDER BY portfolio_count DESC, pos.symbol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_symbols IS 'Returns all unique symbols used across a user''s portfolios';

-- Function to refresh prices for a specific portfolio
CREATE OR REPLACE FUNCTION refresh_portfolio_prices(
  p_portfolio_id UUID
)
RETURNS TABLE(
  symbol TEXT,
  old_price NUMERIC,
  new_price NUMERIC,
  updated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  UPDATE positions pos
  SET 
    last_price = mdc.last_price,
    last_price_update = mdc.last_updated,
    price_source = 'api',
    updated_at = NOW()
  FROM market_data_cache mdc
  WHERE pos.symbol = mdc.symbol
    AND pos.portfolio_id = p_portfolio_id
    AND (pos.last_price_update IS NULL OR pos.last_price_update < mdc.last_updated)
  RETURNING 
    pos.symbol,
    pos.last_price AS old_price,
    mdc.last_price AS new_price,
    TRUE AS updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_portfolio_prices IS 'Updates portfolio position prices from market data cache';

-- =============================================
-- SYNC STATUS VIEW (SAFE VERSION)
-- =============================================

-- Create view with safe column references
CREATE OR REPLACE VIEW portfolio_sync_status AS
SELECT 
  p.id,
  p.name,
  p.user_id,
  p.last_sync_time,
  p.last_price_update,
  p.is_realtime_enabled,
  COALESCE(p.total_value, 0) as total_value,
  COUNT(pos.id) as position_count,
  MIN(pos.last_price_update) as oldest_price_update,
  MAX(pos.last_price_update) as newest_price_update,
  CASE 
    WHEN COUNT(pos.id) = 0 THEN FALSE
    WHEN MIN(pos.last_price_update) IS NULL THEN TRUE
    WHEN MIN(pos.last_price_update) < NOW() - INTERVAL '5 minutes' THEN TRUE
    ELSE FALSE
  END as needs_price_refresh,
  CASE
    WHEN p.last_sync_time IS NULL THEN 'never_synced'
    WHEN p.last_sync_time < NOW() - INTERVAL '1 day' THEN 'stale'
    WHEN p.last_sync_time < NOW() - INTERVAL '1 hour' THEN 'outdated'
    ELSE 'current'
  END as sync_status
FROM portfolios p
LEFT JOIN positions pos ON pos.portfolio_id = p.id
GROUP BY p.id, p.name, p.user_id, p.last_sync_time, p.last_price_update, p.is_realtime_enabled, p.total_value;

COMMENT ON VIEW portfolio_sync_status IS 'Provides sync status and price freshness for all portfolios';

-- =============================================
-- UPDATE TRIGGERS FOR SYNC TIMESTAMPS
-- =============================================

-- Function to update portfolio last_sync_time when positions change
CREATE OR REPLACE FUNCTION update_portfolio_sync_time()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE portfolios
  SET last_sync_time = NOW()
  WHERE id = COALESCE(NEW.portfolio_id, OLD.portfolio_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to track portfolio sync when positions are modified
DROP TRIGGER IF EXISTS track_portfolio_sync_on_position_change ON positions;
CREATE TRIGGER track_portfolio_sync_on_position_change
  AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_sync_time();

COMMENT ON FUNCTION update_portfolio_sync_time IS 'Updates portfolio last_sync_time when positions are modified';

-- =============================================
-- ENHANCED RLS POLICIES
-- =============================================

-- Allow users to update sync timestamps on their own portfolios
DROP POLICY IF EXISTS "Users can update sync timestamps" ON portfolios;
CREATE POLICY "Users can update sync timestamps"
ON portfolios FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Only allow updating these specific columns
  (last_sync_time IS DISTINCT FROM portfolios.last_sync_time OR
   is_realtime_enabled IS DISTINCT FROM portfolios.is_realtime_enabled)
);

-- Allow service role to update market data timestamps
DROP POLICY IF EXISTS "Service can update price timestamps" ON positions;
CREATE POLICY "Service can update price timestamps"
ON positions FOR UPDATE
USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = positions.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Index for finding positions by last update time
CREATE INDEX IF NOT EXISTS idx_positions_last_price_update 
ON positions(last_price_update DESC NULLS LAST);

-- Index for finding portfolios by sync time
CREATE INDEX IF NOT EXISTS idx_portfolios_last_sync_time 
ON portfolios(last_sync_time DESC NULLS LAST);

-- Index for finding realtime-enabled portfolios
CREATE INDEX IF NOT EXISTS idx_portfolios_realtime_enabled 
ON portfolios(is_realtime_enabled) WHERE is_realtime_enabled = TRUE;

-- Composite index for price source queries
CREATE INDEX IF NOT EXISTS idx_positions_symbol_source 
ON positions(symbol, price_source);

-- =============================================
-- HELPER FUNCTION FOR BATCH PRICE UPDATES
-- =============================================

-- Function to batch update market data cache
CREATE OR REPLACE FUNCTION batch_update_market_data(
  p_symbols TEXT[],
  p_prices NUMERIC[],
  p_price_changes NUMERIC[] DEFAULT NULL,
  p_price_change_pcts NUMERIC[] DEFAULT NULL
)
RETURNS TABLE(
  symbol TEXT,
  updated BOOLEAN,
  positions_updated INT
) AS $$
DECLARE
  i INT;
  affected_positions INT;
BEGIN
  -- Validate array lengths match
  IF array_length(p_symbols, 1) != array_length(p_prices, 1) THEN
    RAISE EXCEPTION 'Symbols and prices arrays must have same length';
  END IF;

  -- Loop through and update each symbol
  FOR i IN 1..array_length(p_symbols, 1)
  LOOP
    -- Upsert market data
    INSERT INTO market_data_cache (
      symbol, 
      last_price, 
      price_change, 
      price_change_pct,
      last_updated
    )
    VALUES (
      p_symbols[i],
      p_prices[i],
      CASE WHEN p_price_changes IS NOT NULL THEN p_price_changes[i] END,
      CASE WHEN p_price_change_pcts IS NOT NULL THEN p_price_change_pcts[i] END,
      NOW()
    )
    ON CONFLICT (symbol) DO UPDATE
    SET 
      last_price = EXCLUDED.last_price,
      price_change = EXCLUDED.price_change,
      price_change_pct = EXCLUDED.price_change_pct,
      last_updated = EXCLUDED.last_updated;
    
    -- Count affected positions (trigger will update them)
    SELECT COUNT(*) INTO affected_positions
    FROM positions
    WHERE positions.symbol = p_symbols[i];
    
    RETURN QUERY SELECT p_symbols[i], TRUE, affected_positions;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION batch_update_market_data IS 'Batch updates market data cache with multiple symbols';

-- =============================================
-- STATISTICS AND MONITORING
-- =============================================

-- View for market data coverage
CREATE OR REPLACE VIEW market_data_coverage AS
SELECT 
  pos.symbol,
  COUNT(DISTINCT pos.portfolio_id) as portfolio_count,
  SUM(pos.quantity) as total_quantity,
  MAX(pos.last_price) as position_price,
  mdc.last_price as cache_price,
  mdc.last_updated as cache_updated,
  CASE
    WHEN mdc.last_price IS NULL THEN 'no_cache'
    WHEN mdc.last_updated < NOW() - INTERVAL '5 minutes' THEN 'stale'
    WHEN mdc.last_updated < NOW() - INTERVAL '1 minute' THEN 'outdated'
    ELSE 'fresh'
  END as cache_status
FROM positions pos
LEFT JOIN market_data_cache mdc ON mdc.symbol = pos.symbol
GROUP BY pos.symbol, mdc.last_price, mdc.last_updated
ORDER BY portfolio_count DESC, pos.symbol;

COMMENT ON VIEW market_data_coverage IS 'Shows market data cache coverage for all symbols in use';

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant access to views
GRANT SELECT ON portfolio_sync_status TO authenticated;
GRANT SELECT ON market_data_coverage TO authenticated;

-- Grant execute on functions to authenticated users (security definer handles auth)
GRANT EXECUTE ON FUNCTION get_stale_symbols(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_symbols(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_portfolio_prices(UUID) TO authenticated;

-- Grant service role full access to batch update
GRANT EXECUTE ON FUNCTION batch_update_market_data(TEXT[], NUMERIC[], NUMERIC[], NUMERIC[]) TO service_role;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Real-time enhancements migration completed successfully';
  RAISE NOTICE '📊 Added sync tracking columns to portfolios and positions';
  RAISE NOTICE '⚡ Created automatic price update triggers';
  RAISE NOTICE '🔍 Created helper functions for price refresh';
  RAISE NOTICE '📈 Created portfolio_sync_status and market_data_coverage views';
END $$;

