-- =============================================
-- INVESTIGATE DATABASE CONSTRAINTS BLOCKING ROUND 5+
-- This will show what's preventing round advancement
-- =============================================

-- 1. Check the current enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')
ORDER BY enumsortorder;

-- 2. Check for check constraints on words table
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'words')
AND contype = 'c';

-- 3. Check the column definition for current_round
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'words' 
AND column_name = 'current_round';

-- 4. Check if there are any triggers affecting current_round
SELECT 
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'words'
AND action_statement LIKE '%current_round%';

-- 5. Try to see what specific constraint is failing
-- Show all constraints on words table
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'words'
AND tc.table_schema = 'public';