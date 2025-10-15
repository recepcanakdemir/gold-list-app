-- =============================================
-- FIX FAILED ROUND 4 WORDS TO USE SIMPLIFIED SYSTEM
-- This updates stuck words to Round 5 (Silver) with proper status
-- =============================================

-- Update all words with current_round=4 and status='failed' to Round 5 (Silver)
UPDATE words 
SET 
  current_round = 5,
  status = 'learning',
  review_date = CURRENT_DATE + INTERVAL '14 days',
  updated_at = NOW()
WHERE 
  current_round = 4 
  AND status = 'failed';

-- Show the results
SELECT 
  id,
  word,
  current_round,
  status,
  review_date,
  'Updated to Silver Round 1 (Round 5)' as result
FROM words 
WHERE current_round = 5 AND status = 'learning'
ORDER BY updated_at DESC;