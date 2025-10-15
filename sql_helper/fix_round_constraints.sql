-- =============================================
-- FIX ROUND CONSTRAINTS TO ALLOW ROUNDS 1-12
-- This removes constraints blocking round advancement
-- =============================================

-- First, let's see what we're working with
\echo 'Current constraints on words table:'
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'words')
AND contype = 'c';

-- Drop any check constraints that might limit current_round
-- Common constraint names to try:
DROP CONSTRAINT IF EXISTS words_current_round_check ON words;
DROP CONSTRAINT IF EXISTS words_check ON words;
DROP CONSTRAINT IF EXISTS round_number_check ON words;

-- If the above don't work, we'll need to find the exact constraint name
-- Show remaining constraints after dropping
\echo 'Constraints after cleanup:'
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'words')
AND contype = 'c';

-- Verify enum values are available
\echo 'Available enum values:'
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')
ORDER BY enumsortorder;

-- Test that we can now set round 5
\echo 'Testing round 5 compatibility...'
-- This should not fail if constraints are fixed
SELECT 'Round 5 is valid' as test_result
WHERE '5'::round_number IS NOT NULL;