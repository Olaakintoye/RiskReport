-- SAFE Portfolio User Mapping Migration Script
-- This script makes changes ONLY after you've analyzed the data with analyze-portfolio-data.sql
-- IMPORTANT: Run analyze-portfolio-data.sql FIRST to understand your current data

-- =============================================
-- STEP 1: BACKUP CURRENT DATA (RECOMMENDED)
-- =============================================

-- Create a backup table of current portfolios (uncomment to run)
-- CREATE TABLE portfolios_backup AS SELECT * FROM portfolios;

-- =============================================
-- STEP 2: ENABLE RLS (SAFE - NO DATA LOSS)
-- =============================================

-- Enable Row Level Security on portfolios table
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 3: CREATE RLS POLICIES (SAFE - NO DATA LOSS)
-- =============================================

-- Drop existing policies if they exist (safe operation)
DROP POLICY IF EXISTS "Users can view their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can create their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can update their own portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can delete their own portfolios" ON portfolios;

-- Create RLS policies
CREATE POLICY "Users can view their own portfolios"
ON portfolios FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios"
ON portfolios FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
ON portfolios FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
ON portfolios FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- STEP 4: CLEANUP OPERATIONS (DESTRUCTIVE - REVIEW FIRST)
-- =============================================

-- ⚠️ DESTRUCTIVE OPERATIONS BELOW ⚠️
-- Only run these AFTER reviewing the analysis results
-- Uncomment the lines below ONLY if you want to clean up orphaned data

-- Delete portfolios that don't have valid user references
-- DELETE FROM portfolios 
-- WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Delete portfolios with NULL user_id
-- DELETE FROM portfolios 
-- WHERE user_id IS NULL;

-- =============================================
-- STEP 5: VERIFICATION (SAFE - READ ONLY)
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
WHERE schemaname = 'public' AND tablename = 'portfolios';

-- Verify policies exist
SELECT 
    'Policy Verification' as check_type,
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

-- Final portfolio count
SELECT 
    'Final State' as check_type,
    COUNT(*) as total_portfolios,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as portfolios_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as portfolios_without_user_id
FROM portfolios;
