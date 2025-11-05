-- Comprehensive User Isolation Verification Script
-- This script checks RLS status and policies across ALL user-related tables
-- Run this BEFORE the migration to understand current state

-- =============================================
-- 1. CHECK RLS STATUS ON ALL TABLES
-- =============================================

SELECT 
    'RLS Status Check' as check_type,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '⚠️ RLS Disabled - NEEDS ENABLING'
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

-- =============================================
-- 2. CHECK ALL RLS POLICIES
-- =============================================

SELECT 
    'RLS Policies Inventory' as check_type,
    tablename,
    policyname,
    cmd as command,
    CASE cmd
        WHEN 'SELECT' THEN '👁️ Read'
        WHEN 'INSERT' THEN '➕ Create'
        WHEN 'UPDATE' THEN '✏️ Update'
        WHEN 'DELETE' THEN '🗑️ Delete'
        ELSE '❓ Other'
    END as operation
FROM pg_policies 
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
ORDER BY tablename, cmd;

-- =============================================
-- 3. IDENTIFY TABLES WITHOUT RLS
-- =============================================

WITH required_tables AS (
    SELECT unnest(ARRAY[
        'portfolios',
        'positions',
        'calc_jobs',
        'results',
        'stress_scenarios',
        'stress_test_results',
        'risk_metrics',
        'portfolio_performance'
    ]) as table_name
),
rls_status AS (
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
)
SELECT 
    'Tables Missing RLS' as check_type,
    rt.table_name,
    COALESCE(rs.rowsecurity, false) as has_rls,
    CASE 
        WHEN rs.rowsecurity THEN '✅ RLS Enabled'
        WHEN rs.tablename IS NULL THEN '❌ Table Does Not Exist'
        ELSE '⚠️ RLS NOT Enabled - ACTION REQUIRED'
    END as status
FROM required_tables rt
LEFT JOIN rls_status rs ON rt.table_name = rs.tablename
WHERE COALESCE(rs.rowsecurity, false) = false
OR rs.tablename IS NULL;

-- =============================================
-- 4. CHECK FOR MISSING POLICIES
-- =============================================

-- Tables that should have SELECT policies
WITH expected_policies AS (
    SELECT 
        t.table_name,
        'SELECT' as required_cmd,
        CASE 
            WHEN t.table_name = 'market_data_cache' THEN 'Public read'
            ELSE 'User-filtered read'
        END as policy_type
    FROM (
        SELECT unnest(ARRAY[
            'portfolios',
            'positions',
            'calc_jobs',
            'results',
            'stress_scenarios',
            'stress_test_results',
            'risk_metrics',
            'portfolio_performance'
        ]) as table_name
    ) t
),
existing_policies AS (
    SELECT tablename, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT 
    'Missing Policies Check' as check_type,
    ep.table_name,
    ep.required_cmd as required_command,
    ep.policy_type,
    CASE 
        WHEN ex.cmd IS NOT NULL THEN '✅ Policy Exists'
        ELSE '⚠️ Policy MISSING - ACTION REQUIRED'
    END as status
FROM expected_policies ep
LEFT JOIN existing_policies ex 
    ON ep.table_name = ex.tablename 
    AND ep.required_cmd = ex.cmd
WHERE ex.cmd IS NULL;

-- =============================================
-- 5. DATA ISOLATION CHECK - PORTFOLIOS
-- =============================================

SELECT 
    'Portfolio Data Distribution' as check_type,
    COUNT(*) as total_portfolios,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as portfolios_without_user,
    CASE 
        WHEN COUNT(CASE WHEN user_id IS NULL THEN 1 END) = 0 THEN '✅ All portfolios have users'
        ELSE '⚠️ Some portfolios missing user_id'
    END as status
FROM portfolios;

-- =============================================
-- 6. DATA ISOLATION CHECK - CALC JOBS
-- =============================================

SELECT 
    'Calc Jobs Distribution' as check_type,
    COUNT(*) as total_jobs,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as jobs_without_user,
    CASE 
        WHEN COUNT(CASE WHEN user_id IS NULL THEN 1 END) = 0 THEN '✅ All jobs have users'
        ELSE '⚠️ Some jobs missing user_id'
    END as status
FROM calc_jobs;

-- =============================================
-- 7. DATA ISOLATION CHECK - STRESS TEST RESULTS
-- =============================================

SELECT 
    'Stress Test Results Distribution' as check_type,
    COUNT(DISTINCT str.id) as total_results,
    COUNT(DISTINCT p.user_id) as unique_users,
    COUNT(CASE WHEN p.user_id IS NULL THEN 1 END) as results_without_user,
    CASE 
        WHEN COUNT(CASE WHEN p.user_id IS NULL THEN 1 END) = 0 THEN '✅ All results linked to users via portfolios'
        ELSE '⚠️ Some results have orphaned portfolios'
    END as status
FROM stress_test_results str
LEFT JOIN portfolios p ON str.portfolio_id = p.id;

-- =============================================
-- 8. CHECK RISK_METRICS TABLE (if exists)
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_metrics') THEN
        RAISE NOTICE 'risk_metrics table exists - checking data';
        PERFORM 1;
    ELSE
        RAISE NOTICE '⚠️ risk_metrics table does not exist - will need to be created';
    END IF;
END $$;

SELECT 
    'Risk Metrics Distribution' as check_type,
    COUNT(DISTINCT rm.id) as total_metrics,
    COUNT(DISTINCT p.user_id) as unique_users,
    COUNT(CASE WHEN p.user_id IS NULL THEN 1 END) as metrics_without_user,
    CASE 
        WHEN COUNT(CASE WHEN p.user_id IS NULL THEN 1 END) = 0 THEN '✅ All metrics linked to users via portfolios'
        ELSE '⚠️ Some metrics have orphaned portfolios'
    END as status
FROM risk_metrics rm
LEFT JOIN portfolios p ON rm.portfolio_id = p.id
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'risk_metrics');

-- =============================================
-- 9. CHECK PORTFOLIO_PERFORMANCE TABLE (if exists)
-- =============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portfolio_performance') THEN
        RAISE NOTICE 'portfolio_performance table exists - checking data';
        PERFORM 1;
    ELSE
        RAISE NOTICE '⚠️ portfolio_performance table does not exist';
    END IF;
END $$;

-- =============================================
-- 10. SUMMARY AND RECOMMENDATIONS
-- =============================================

WITH isolation_summary AS (
    SELECT 
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('portfolios', 'positions', 'calc_jobs', 'results', 'stress_scenarios', 'stress_test_results', 'risk_metrics', 'portfolio_performance') AND rowsecurity = true) as tables_with_rls,
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('portfolios', 'positions', 'calc_jobs', 'results', 'stress_scenarios', 'stress_test_results', 'risk_metrics', 'portfolio_performance')) as total_tables,
        (SELECT COUNT(*) FROM portfolios WHERE user_id IS NULL) as portfolios_without_user,
        (SELECT COUNT(*) FROM calc_jobs WHERE user_id IS NULL) as jobs_without_user
)
SELECT 
    'FINAL SUMMARY' as section,
    tables_with_rls || ' / ' || total_tables || ' tables have RLS enabled' as rls_coverage,
    CASE 
        WHEN tables_with_rls = total_tables THEN '✅ All tables secured'
        WHEN tables_with_rls > total_tables / 2 THEN '⚠️ Partial coverage - some tables need RLS'
        ELSE '❌ Most tables unsecured - URGENT ACTION REQUIRED'
    END as security_status,
    CASE 
        WHEN portfolios_without_user = 0 AND jobs_without_user = 0 THEN '✅ All data properly associated with users'
        ELSE '⚠️ Some data missing user associations - cleanup recommended'
    END as data_quality
FROM isolation_summary;

-- =============================================
-- 11. ACTION ITEMS
-- =============================================

SELECT 
    'ACTION ITEMS' as section,
    'Run complete-user-isolation.sql to:' as next_steps,
    '1. Enable RLS on tables without it' as step_1,
    '2. Create missing RLS policies' as step_2,
    '3. Verify all data has proper user associations' as step_3;

