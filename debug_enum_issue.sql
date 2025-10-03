-- =============================================
-- DEBUG: Find what's causing the enum comparison issue
-- Run this to identify the source of the round_number >= integer error
-- =============================================

-- Check current column types
SELECT 
  table_name, 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE column_name LIKE '%round%' 
AND table_schema = 'public';

-- Check constraints that might involve round comparisons
SELECT 
  tc.constraint_name,
  tc.table_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND (cc.check_clause ILIKE '%round%' OR cc.check_clause ILIKE '%>=%' OR cc.check_clause ILIKE '%<=%');

-- Check triggers that might be causing issues
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND (action_statement ILIKE '%round%' OR action_statement ILIKE '%>=%');

-- Check functions that might be using round comparisons
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_definition ILIKE '%round%'
AND routine_definition ILIKE '%>=%';

SELECT 'Debug queries completed. Check the results above to identify the issue.' as result;