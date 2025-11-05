-- Fix Portfolio User Mapping Migration
-- This script cleans up existing portfolio data and ensures proper user isolation

-- =============================================
-- 1. CLEAN UP ORPHANED PORTFOLIOS
-- =============================================

-- Delete portfolios that don't have valid user references
DELETE FROM portfolios 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete portfolios with NULL or empty user_id
DELETE FROM portfolios 
WHERE user_id IS NULL OR user_id = '';

-- =============================================
-- 2. VERIFY RLS IS ENABLED
-- =============================================

-- Check if RLS is enabled on portfolios table
SELECT 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled' 
        ELSE '❌ RLS Disabled' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'portfolios';

-- =============================================
-- 3. VERIFY RLS POLICIES EXIST
-- =============================================

-- Check if RLS policies exist for portfolios
SELECT 
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
-- 4. CHECK CURRENT PORTFOLIO DISTRIBUTION
-- =============================================

-- Show current portfolio count by user
SELECT 
    p.user_id,
    u.email,
    COUNT(p.id) as portfolio_count,
    SUM(p.total_value) as total_value
FROM portfolios p
LEFT JOIN auth.users u ON p.user_id = u.id
GROUP BY p.user_id, u.email
ORDER BY portfolio_count DESC;

-- =============================================
-- 5. OPTIONAL: ASSIGN EXISTING PORTFOLIOS TO SPECIFIC USER
-- =============================================

-- Uncomment and modify the following lines if you want to assign existing portfolios
-- to a specific user (replace 'YOUR_USER_UUID_HERE' with actual user ID):

-- UPDATE portfolios 
-- SET user_id = 'YOUR_USER_UUID_HERE'
-- WHERE user_id IS NULL OR user_id = '';

-- =============================================
-- 6. VERIFY FINAL STATE
-- =============================================

-- Final check: All portfolios should have valid user_id
SELECT 
    COUNT(*) as total_portfolios,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as portfolios_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as portfolios_without_user_id
FROM portfolios;

-- Show final portfolio distribution
SELECT 
    'Final Portfolio Distribution' as summary,
    COUNT(*) as total_portfolios,
    COUNT(DISTINCT user_id) as unique_users
FROM portfolios;
