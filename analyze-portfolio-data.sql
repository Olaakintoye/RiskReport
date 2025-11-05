-- SAFE Portfolio User Mapping Analysis Script
-- This script analyzes the current state WITHOUT making destructive changes
-- Run this first to understand what data exists before making any changes

-- =============================================
-- 1. ANALYZE CURRENT PORTFOLIO STATE
-- =============================================

-- Check total portfolio count
SELECT 
    'Current Portfolio Analysis' as analysis_type,
    COUNT(*) as total_portfolios,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as portfolios_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as portfolios_without_user_id
FROM portfolios;

-- =============================================
-- 2. CHECK USER ASSOCIATIONS
-- =============================================

-- Show portfolios and their user associations
SELECT 
    p.id as portfolio_id,
    p.name as portfolio_name,
    p.user_id,
    u.email as user_email,
    CASE 
        WHEN p.user_id IS NULL THEN '❌ Missing user_id'
        WHEN u.id IS NULL THEN '❌ Orphaned (no valid user)'
        ELSE '✅ Valid user association'
    END as status
FROM portfolios p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY status, p.name;

-- =============================================
-- 3. VERIFY RLS STATUS
-- =============================================

-- Check if RLS is enabled on portfolios table
SELECT 
    'RLS Status Check' as check_type,
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled' 
        ELSE '❌ RLS Disabled - NEEDS TO BE ENABLED' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'portfolios';

-- =============================================
-- 4. CHECK RLS POLICIES
-- =============================================

-- Check if RLS policies exist for portfolios
SELECT 
    'RLS Policies Check' as check_type,
    policyname,
    cmd as command,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Users can view their own portfolios'
        WHEN cmd = 'INSERT' THEN '✅ Users can create their own portfolios'
        WHEN cmd = 'UPDATE' THEN '✅ Users can update their own portfolios'
        WHEN cmd = 'DELETE' THEN '✅ Users can delete their own portfolios'
        ELSE '❓ Unknown policy'
    END as description
FROM pg_policies 
WHERE tablename = 'portfolios'
ORDER BY cmd;

-- =============================================
-- 5. PORTFOLIO DISTRIBUTION BY USER
-- =============================================

-- Show current portfolio count by user
SELECT 
    'Portfolio Distribution' as analysis_type,
    p.user_id,
    u.email,
    COUNT(p.id) as portfolio_count,
    SUM(p.total_value) as total_value,
    CASE 
        WHEN u.id IS NULL THEN '❌ Orphaned portfolios'
        ELSE '✅ Valid user'
    END as user_status
FROM portfolios p
LEFT JOIN auth.users u ON p.user_id = u.id
GROUP BY p.user_id, u.email, u.id
ORDER BY portfolio_count DESC;

-- =============================================
-- 6. CHECK FOR SAMPLE/DEMO DATA
-- =============================================

-- Look for portfolios that might be sample data
SELECT 
    'Sample Data Check' as check_type,
    p.id,
    p.name,
    p.user_id,
    u.email,
    CASE 
        WHEN p.name ILIKE '%sample%' OR p.name ILIKE '%demo%' OR p.name ILIKE '%test%' THEN '⚠️ Possible sample data'
        WHEN p.name ILIKE '%conservative%' OR p.name ILIKE '%aggressive%' OR p.name ILIKE '%income%' THEN '⚠️ Possible sample data'
        ELSE '✅ Appears to be user data'
    END as data_type
FROM portfolios p
LEFT JOIN auth.users u ON p.user_id = u.id
ORDER BY data_type, p.name;

-- =============================================
-- 7. RECOMMENDATIONS
-- =============================================

-- Generate recommendations based on findings
WITH analysis AS (
    SELECT 
        COUNT(*) as total_portfolios,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as valid_portfolios,
        COUNT(CASE WHEN user_id IS NULL THEN 1 END) as orphaned_portfolios,
        COUNT(CASE WHEN u.id IS NULL AND p.user_id IS NOT NULL THEN 1 END) as portfolios_without_valid_users
    FROM portfolios p
    LEFT JOIN auth.users u ON p.user_id = u.id
)
SELECT 
    'RECOMMENDATIONS' as section,
    CASE 
        WHEN orphaned_portfolios = 0 AND portfolios_without_valid_users = 0 THEN '✅ No cleanup needed - all portfolios have valid users'
        WHEN orphaned_portfolios > 0 OR portfolios_without_valid_users > 0 THEN 
            '⚠️ ACTION NEEDED: ' || (orphaned_portfolios + portfolios_without_valid_users) || ' portfolios need user assignment or deletion'
        ELSE '✅ All portfolios have valid user associations'
    END as recommendation
FROM analysis;
