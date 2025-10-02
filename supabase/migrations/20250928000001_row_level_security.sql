-- Row Level Security (RLS) Policies
-- This migration sets up comprehensive RLS policies for the risk management system

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PORTFOLIOS POLICIES
-- =============================================

-- Users can only see their own portfolios
CREATE POLICY "Users can view their own portfolios"
ON portfolios FOR SELECT
USING (auth.uid() = user_id);

-- Users can create portfolios for themselves
CREATE POLICY "Users can create their own portfolios"
ON portfolios FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own portfolios
CREATE POLICY "Users can update their own portfolios"
ON portfolios FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own portfolios
CREATE POLICY "Users can delete their own portfolios"
ON portfolios FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- POSITIONS POLICIES
-- =============================================

-- Users can view positions in their portfolios
CREATE POLICY "Users can view positions in their portfolios"
ON positions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = positions.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can create positions in their portfolios
CREATE POLICY "Users can create positions in their portfolios"
ON positions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = positions.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can update positions in their portfolios
CREATE POLICY "Users can update positions in their portfolios"
ON positions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = positions.portfolio_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = positions.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can delete positions in their portfolios
CREATE POLICY "Users can delete positions in their portfolios"
ON positions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = positions.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- =============================================
-- CALC_JOBS POLICIES
-- =============================================

-- Users can view their own calculation jobs
CREATE POLICY "Users can view their own calc jobs"
ON calc_jobs FOR SELECT
USING (auth.uid() = user_id);

-- Users can create calculation jobs for their portfolios
CREATE POLICY "Users can create calc jobs for their portfolios"
ON calc_jobs FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = calc_jobs.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can update their own calculation jobs (for status updates)
CREATE POLICY "Users can update their own calc jobs"
ON calc_jobs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own calculation jobs
CREATE POLICY "Users can delete their own calc jobs"
ON calc_jobs FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- RESULTS POLICIES
-- =============================================

-- Users can view results for their portfolios
CREATE POLICY "Users can view results for their portfolios"
ON results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = results.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Service role can insert results (backend service)
CREATE POLICY "Service role can insert results"
ON results FOR INSERT
WITH CHECK (
  -- Allow service role to insert
  auth.jwt() ->> 'role' = 'service_role' OR
  -- Or allow if user owns the portfolio
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = results.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can update results for their portfolios
CREATE POLICY "Users can update results for their portfolios"
ON results FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = results.portfolio_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = results.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can delete results for their portfolios
CREATE POLICY "Users can delete results for their portfolios"
ON results FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = results.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- =============================================
-- STRESS_SCENARIOS POLICIES
-- =============================================

-- Users can view their own scenarios and public scenarios
CREATE POLICY "Users can view accessible stress scenarios"
ON stress_scenarios FOR SELECT
USING (
  auth.uid() = user_id OR 
  is_public = TRUE
);

-- Users can create their own scenarios
CREATE POLICY "Users can create their own stress scenarios"
ON stress_scenarios FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scenarios
CREATE POLICY "Users can update their own stress scenarios"
ON stress_scenarios FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own scenarios
CREATE POLICY "Users can delete their own stress scenarios"
ON stress_scenarios FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- STRESS_TEST_RESULTS POLICIES
-- =============================================

-- Users can view stress test results for their portfolios
CREATE POLICY "Users can view stress test results for their portfolios"
ON stress_test_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = stress_test_results.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Service role can insert stress test results
CREATE POLICY "Service role can insert stress test results"
ON stress_test_results FOR INSERT
WITH CHECK (
  -- Allow service role to insert
  auth.jwt() ->> 'role' = 'service_role' OR
  -- Or allow if user owns the portfolio
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = stress_test_results.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can update stress test results for their portfolios
CREATE POLICY "Users can update stress test results for their portfolios"
ON stress_test_results FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = stress_test_results.portfolio_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = stress_test_results.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- Users can delete stress test results for their portfolios
CREATE POLICY "Users can delete stress test results for their portfolios"
ON stress_test_results FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM portfolios p 
    WHERE p.id = stress_test_results.portfolio_id 
    AND p.user_id = auth.uid()
  )
);

-- =============================================
-- MARKET_DATA_CACHE POLICIES
-- =============================================

-- Everyone can read market data (it's public information)
CREATE POLICY "Anyone can read market data"
ON market_data_cache FOR SELECT
USING (true);

-- Only service role can update market data
CREATE POLICY "Service role can manage market data"
ON market_data_cache FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE portfolios;
ALTER PUBLICATION supabase_realtime ADD TABLE positions;
ALTER PUBLICATION supabase_realtime ADD TABLE calc_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE results;
ALTER PUBLICATION supabase_realtime ADD TABLE stress_test_results;
ALTER PUBLICATION supabase_realtime ADD TABLE market_data_cache;

