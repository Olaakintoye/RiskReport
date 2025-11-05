-- =============================================
-- Risk Tracking Setup Verification
-- Run this to confirm everything is working
-- =============================================

-- 1. Check RLS is enabled
SELECT 
  '1. RLS Status' as check_name,
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'risk_metrics';

-- 2. Count policies
SELECT 
  '2. RLS Policies' as check_name,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ All policies created'
    ELSE '⚠️  Missing policies'
  END as status
FROM pg_policies
WHERE tablename = 'risk_metrics';

-- 3. List all policies
SELECT 
  '3. Policy Details' as check_name,
  policyname as policy_name,
  cmd as command
FROM pg_policies
WHERE tablename = 'risk_metrics'
ORDER BY cmd;

-- 4. Check trigger exists
SELECT 
  '4. Trigger Status' as check_name,
  tgname as trigger_name,
  '✅ Trigger installed' as status
FROM pg_trigger
WHERE tgname = 'trigger_save_var_to_risk_metrics'
  AND tgrelid = 'results'::regclass;

-- 5. Check for migrated data
SELECT 
  '5. Migrated Data' as check_name,
  COUNT(*) as total_metrics,
  COUNT(DISTINCT portfolio_id) as unique_portfolios,
  COUNT(DISTINCT metric_type) as metric_types,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Data exists'
    ELSE 'ℹ️  No data yet (run VaR analysis to populate)'
  END as status
FROM risk_metrics;

-- 6. Metrics breakdown by type
SELECT 
  '6. Metrics by Type' as check_name,
  metric_type::text,
  COUNT(*) as count,
  MIN(calculation_date) as earliest,
  MAX(calculation_date) as latest
FROM risk_metrics
GROUP BY metric_type
ORDER BY metric_type;

-- 7. Check indexes
SELECT 
  '7. Index Status' as check_name,
  indexname,
  '✅ Index exists' as status
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'risk_metrics'
ORDER BY indexname;

-- 8. Sample data (if any exists)
SELECT 
  '8. Sample Records' as check_name,
  portfolio_id,
  metric_type::text,
  value,
  confidence_level,
  calculation_date,
  methodology
FROM risk_metrics
ORDER BY created_at DESC
LIMIT 5;

-- =============================================
-- SUMMARY
-- =============================================
SELECT 
  '========================================' as summary;
SELECT 
  'RISK TRACKING SETUP VERIFICATION' as summary;
SELECT 
  '========================================' as summary;

DO $$
DECLARE
  v_rls BOOLEAN;
  v_policies INTEGER;
  v_trigger INTEGER;
  v_indexes INTEGER;
  v_data INTEGER;
BEGIN
  SELECT rowsecurity INTO v_rls FROM pg_tables WHERE tablename = 'risk_metrics';
  SELECT COUNT(*) INTO v_policies FROM pg_policies WHERE tablename = 'risk_metrics';
  SELECT COUNT(*) INTO v_trigger FROM pg_trigger WHERE tgname = 'trigger_save_var_to_risk_metrics';
  SELECT COUNT(*) INTO v_indexes FROM pg_indexes WHERE tablename = 'risk_metrics' AND schemaname = 'public';
  SELECT COUNT(*) INTO v_data FROM risk_metrics;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ RLS Enabled: %', v_rls;
  RAISE NOTICE '✅ Policies Created: %/5', v_policies;
  RAISE NOTICE '✅ Trigger Installed: %', CASE WHEN v_trigger > 0 THEN 'YES' ELSE 'NO' END;
  RAISE NOTICE '✅ Indexes Created: %/3', v_indexes;
  RAISE NOTICE 'ℹ️  Existing Metrics: %', v_data;
  RAISE NOTICE '';
  
  IF v_rls AND v_policies >= 5 AND v_trigger > 0 AND v_indexes >= 3 THEN
    RAISE NOTICE '🎉 RISK TRACKING IS READY TO USE!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Run VaR analysis in the app';
    RAISE NOTICE '2. Check Risk Tracking section';
    RAISE NOTICE '3. Verify data appears in charts';
  ELSE
    RAISE NOTICE '⚠️  Some components may be missing - review output above';
  END IF;
END $$;

