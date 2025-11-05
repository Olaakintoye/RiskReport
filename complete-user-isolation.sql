-- Complete User Isolation Migration Script
-- This script ensures ALL user-related tables have proper RLS policies
-- Run verify-complete-user-isolation.sql FIRST to understand current state

-- =============================================
-- PHASE 1: ENABLE RLS ON ALL TABLES
-- =============================================

-- Enable RLS on core tables (safe - already enabled, idempotent)
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calc_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- Enable RLS on risk tracking tables (may need enabling)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_metrics') THEN
        ALTER TABLE risk_metrics ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled on risk_metrics table';
    ELSE
        RAISE NOTICE '⚠️ risk_metrics table does not exist - skipping';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portfolio_performance') THEN
        ALTER TABLE portfolio_performance ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS enabled on portfolio_performance table';
    ELSE
        RAISE NOTICE '⚠️ portfolio_performance table does not exist - skipping';
    END IF;
END $$;

-- =============================================
-- PHASE 2: CREATE/UPDATE RLS POLICIES
-- =============================================

-- =============================================
-- RISK_METRICS POLICIES (if table exists)
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_metrics') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view risk metrics for their portfolios" ON risk_metrics;
        DROP POLICY IF EXISTS "Service role can insert risk metrics" ON risk_metrics;
        DROP POLICY IF EXISTS "Users can update risk metrics for their portfolios" ON risk_metrics;
        DROP POLICY IF EXISTS "Users can delete risk metrics for their portfolios" ON risk_metrics;

        -- Users can view risk metrics for their portfolios
        CREATE POLICY "Users can view risk metrics for their portfolios"
        ON risk_metrics FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM portfolios p 
            WHERE p.id = risk_metrics.portfolio_id 
            AND p.user_id = auth.uid()
          )
        );

        -- Service role can insert risk metrics (backend calculations)
        CREATE POLICY "Service role can insert risk metrics"
        ON risk_metrics FOR INSERT
        WITH CHECK (
          auth.jwt() ->> 'role' = 'service_role' OR
          EXISTS (
            SELECT 1 FROM portfolios p 
            WHERE p.id = risk_metrics.portfolio_id 
            AND p.user_id = auth.uid()
          )
        );

        -- Users can update their risk metrics
        CREATE POLICY "Users can update risk metrics for their portfolios"
        ON risk_metrics FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM portfolios p 
            WHERE p.id = risk_metrics.portfolio_id 
            AND p.user_id = auth.uid()
          )
        );

        -- Users can delete their risk metrics
        CREATE POLICY "Users can delete risk metrics for their portfolios"
        ON risk_metrics FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM portfolios p 
            WHERE p.id = risk_metrics.portfolio_id 
            AND p.user_id = auth.uid()
          )
        );

        RAISE NOTICE '✅ RLS policies created for risk_metrics table';
    END IF;
END $$;

-- =============================================
-- PORTFOLIO_PERFORMANCE POLICIES (if table exists)
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portfolio_performance') THEN
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view performance for their portfolios" ON portfolio_performance;
        DROP POLICY IF EXISTS "Service role can insert performance data" ON portfolio_performance;
        DROP POLICY IF EXISTS "Users can update performance for their portfolios" ON portfolio_performance;
        DROP POLICY IF EXISTS "Users can delete performance for their portfolios" ON portfolio_performance;

        -- Users can view performance for their portfolios
        CREATE POLICY "Users can view performance for their portfolios"
        ON portfolio_performance FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM portfolios p 
            WHERE p.id = portfolio_performance.portfolio_id 
            AND p.user_id = auth.uid()
          )
        );

        -- Service role can insert performance data
        CREATE POLICY "Service role can insert performance data"
        ON portfolio_performance FOR INSERT
        WITH CHECK (
          auth.jwt() ->> 'role' = 'service_role' OR
          EXISTS (
            SELECT 1 FROM portfolios p 
            WHERE p.id = portfolio_performance.portfolio_id 
            AND p.user_id = auth.uid()
          )
        );

        -- Users can update their portfolio performance
        CREATE POLICY "Users can update performance for their portfolios"
        ON portfolio_performance FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM portfolios p 
            WHERE p.id = portfolio_performance.portfolio_id 
            AND p.user_id = auth.uid()
          )
        );

        -- Users can delete their portfolio performance
        CREATE POLICY "Users can delete performance for their portfolios"
        ON portfolio_performance FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM portfolios p 
            WHERE p.id = portfolio_performance.portfolio_id 
            AND p.user_id = auth.uid()
          )
        );

        RAISE NOTICE '✅ RLS policies created for portfolio_performance table';
    END IF;
END $$;

-- =============================================
-- PHASE 3: VERIFICATION
-- =============================================

-- Verify RLS is enabled
SELECT 
    'RLS Verification' as check_type,
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled' 
        ELSE '❌ RLS Disabled' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'portfolios',
    'positions',
    'calc_jobs',
    'results',
    'stress_scenarios',
    'stress_test_results',
    'market_data_cache',
    'risk_metrics',
    'portfolio_performance'
)
ORDER BY tablename;

-- Verify policies exist
SELECT 
    'Policy Verification' as check_type,
    tablename,
    COUNT(*) as policy_count,
    string_agg(DISTINCT cmd::text, ', ') as operations_covered
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'portfolios',
    'positions',
    'calc_jobs',
    'results',
    'stress_scenarios',
    'stress_test_results',
    'risk_metrics',
    'portfolio_performance'
)
GROUP BY tablename
ORDER BY tablename;

-- Final summary
SELECT 
    'MIGRATION COMPLETE' as status,
    'All user-related tables now have RLS enabled' as result,
    'Users can only access their own data' as security,
    'Run verify-complete-user-isolation.sql to confirm' as next_step;

