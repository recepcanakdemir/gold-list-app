-- =============================================
-- CLEANUP CORRUPTED WORD DATA - PERFORMANCE FIX
-- Run this SQL in Supabase SQL Editor to fix corrupted words
-- =============================================

-- Step 1: Identify corrupted words (words with null page_id)
SELECT 
  id,
  word,
  translation,
  page_id,
  notebook_id,
  created_at
FROM words 
WHERE page_id IS NULL;

-- Step 2: Delete corrupted words that have null page_id
-- These are causing infinite loops in the app
DELETE FROM words 
WHERE page_id IS NULL;

-- Step 3: Identify orphaned words (words referencing non-existent pages)
SELECT 
  w.id,
  w.word,
  w.translation,
  w.page_id,
  w.notebook_id,
  w.created_at
FROM words w
LEFT JOIN pages p ON w.page_id = p.id
WHERE p.id IS NULL;

-- Step 4: Delete orphaned words (words referencing non-existent pages)
DELETE FROM words 
WHERE page_id IS NOT NULL 
AND page_id NOT IN (SELECT id FROM pages);

-- Step 5: Verify cleanup results
SELECT 
  'Total words after cleanup' as status,
  COUNT(*) as count
FROM words;

SELECT 
  'Words with valid page references' as status,
  COUNT(*) as count
FROM words w
INNER JOIN pages p ON w.page_id = p.id;

-- Success message
SELECT '✅ Corrupted word data cleanup completed successfully' as result;