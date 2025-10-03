-- =============================================
-- FIX EXISTING WORDS LINEAGE TRACKING
-- Run this SQL query in Supabase SQL Editor to fix existing words
-- =============================================

-- Update all existing words that have NULL lineage fields
-- For existing words in Bronze notebooks, set:
-- - source_notebook_id = their current notebook_id (they originated in this Bronze notebook)
-- - original_page_id = their current page_id (they originated on this Bronze page)

UPDATE words 
SET 
    source_notebook_id = notebook_id,
    original_page_id = page_id
WHERE 
    source_notebook_id IS NULL 
    OR original_page_id IS NULL;

-- Verify the update worked
SELECT 
    COUNT(*) as total_words,
    COUNT(source_notebook_id) as words_with_source_notebook,
    COUNT(original_page_id) as words_with_original_page,
    COUNT(CASE WHEN source_notebook_id IS NULL OR original_page_id IS NULL THEN 1 END) as words_with_null_lineage
FROM words;

-- Show sample of updated words
SELECT 
    id,
    word,
    meaning,
    notebook_id,
    page_id,
    source_notebook_id,
    original_page_id,
    status
FROM words 
ORDER BY created_at DESC 
LIMIT 10;