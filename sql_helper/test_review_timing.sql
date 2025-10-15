-- =============================================
-- TEST SILVER/GOLD REVIEW TIMING
-- This checks if Round 5+ words have proper review dates
-- =============================================

-- 1. Check words that were recently advanced to Round 5+
SELECT 
  id,
  word,
  current_round,
  status,
  review_date,
  last_reviewed,
  CASE 
    WHEN current_round <= 4 THEN 'Bronze Round ' || current_round
    WHEN current_round <= 8 THEN 'Silver Round ' || (current_round - 4)
    WHEN current_round <= 12 THEN 'Gold Round ' || (current_round - 8)
    ELSE 'Unknown Round ' || current_round
  END as display_round,
  CASE 
    WHEN review_date <= CURRENT_DATE THEN 'Due for review'
    ELSE 'Waiting (' || (review_date - CURRENT_DATE) || ' days)'
  END as review_status
FROM words 
WHERE current_round >= 5
ORDER BY current_round, review_date;

-- 2. Check if any Round 5+ words have old review dates (should all be 14+ days from last_reviewed)
SELECT 
  'Review Date Issues' as check_type,
  COUNT(*) as issue_count,
  string_agg(id::text, ', ') as problematic_words
FROM words 
WHERE current_round >= 5 
AND status = 'learning'
AND review_date <= last_reviewed::date;

-- 3. Show expected review schedule for Silver/Gold words
SELECT 
  current_round,
  CASE 
    WHEN current_round <= 4 THEN 'Bronze Round ' || current_round
    WHEN current_round <= 8 THEN 'Silver Round ' || (current_round - 4)
    WHEN current_round <= 12 THEN 'Gold Round ' || (current_round - 8)
  END as display_round,
  COUNT(*) as word_count,
  MIN(review_date) as earliest_review,
  MAX(review_date) as latest_review
FROM words 
WHERE current_round >= 5 
AND status = 'learning'
GROUP BY current_round
ORDER BY current_round;