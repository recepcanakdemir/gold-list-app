-- =============================================
-- STEP 2: MIGRATE DATA TO SIMPLIFIED BADGE SYSTEM
-- Run this AFTER step1_extend_enum.sql has been completed
-- =============================================

-- First, let's change both words.current_round and pages.current_round columns to be round_number type
-- Handle words table
ALTER TABLE words ALTER COLUMN current_round DROP DEFAULT;
ALTER TABLE words ALTER COLUMN current_round TYPE round_number USING current_round::text::round_number;
ALTER TABLE words ALTER COLUMN current_round SET DEFAULT '1'::round_number;

-- Handle pages table current_round column
ALTER TABLE pages ALTER COLUMN current_round DROP DEFAULT;
ALTER TABLE pages ALTER COLUMN current_round TYPE round_number USING current_round::text::round_number;
ALTER TABLE pages ALTER COLUMN current_round SET DEFAULT '1'::round_number;

-- Handle pages table target_round column as well
ALTER TABLE pages ALTER COLUMN target_round DROP DEFAULT;
ALTER TABLE pages ALTER COLUMN target_round TYPE round_number USING target_round::text::round_number;
ALTER TABLE pages ALTER COLUMN target_round SET DEFAULT '1'::round_number;

-- Convert existing Silver/Gold words to new round system
-- Handle Silver words first (pages with badge_id that are NOT gold)
UPDATE words 
SET current_round = '5'::round_number
FROM pages p 
WHERE words.page_id = p.id 
AND p.badge_id IS NOT NULL 
AND p.current_round = '1'::round_number
AND NOT EXISTS (
  SELECT 1 FROM notebook_badges nb 
  WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
);

UPDATE words 
SET current_round = '6'::round_number
FROM pages p 
WHERE words.page_id = p.id 
AND p.badge_id IS NOT NULL 
AND p.current_round = '2'::round_number
AND NOT EXISTS (
  SELECT 1 FROM notebook_badges nb 
  WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
);

UPDATE words 
SET current_round = '7'::round_number
FROM pages p 
WHERE words.page_id = p.id 
AND p.badge_id IS NOT NULL 
AND p.current_round = '3'::round_number
AND NOT EXISTS (
  SELECT 1 FROM notebook_badges nb 
  WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
);

UPDATE words 
SET current_round = '8'::round_number
FROM pages p 
WHERE words.page_id = p.id 
AND p.badge_id IS NOT NULL 
AND p.current_round = '4'::round_number
AND NOT EXISTS (
  SELECT 1 FROM notebook_badges nb 
  WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
);

-- Handle Gold words (badge_type = 'gold')
UPDATE words 
SET current_round = '9'::round_number
FROM pages p 
JOIN notebook_badges nb ON p.badge_id = nb.id
WHERE words.page_id = p.id 
AND nb.badge_type = 'gold'
AND p.current_round = '1'::round_number;

UPDATE words 
SET current_round = '10'::round_number
FROM pages p 
JOIN notebook_badges nb ON p.badge_id = nb.id
WHERE words.page_id = p.id 
AND nb.badge_type = 'gold'
AND p.current_round = '2'::round_number;

UPDATE words 
SET current_round = '11'::round_number
FROM pages p 
JOIN notebook_badges nb ON p.badge_id = nb.id
WHERE words.page_id = p.id 
AND nb.badge_type = 'gold'
AND p.current_round = '3'::round_number;

UPDATE words 
SET current_round = '12'::round_number
FROM pages p 
JOIN notebook_badges nb ON p.badge_id = nb.id
WHERE words.page_id = p.id 
AND nb.badge_type = 'gold'
AND p.current_round = '4'::round_number;

-- Move all badge words back to Bronze notebook pages BEFORE removing badge system
-- Create new Bronze pages for migrated words if needed
DO $$
DECLARE
  badge_word RECORD;
  bronze_notebook_id UUID;
  current_page_id UUID;
  page_word_count INTEGER;
BEGIN
  -- Process each word that's currently in a badge
  FOR badge_word IN 
    SELECT w.id as word_id, w.current_round, nb.bronze_notebook_id
    FROM words w
    JOIN pages p ON w.page_id = p.id  
    JOIN notebook_badges nb ON p.badge_id = nb.id
  LOOP
    bronze_notebook_id := badge_word.bronze_notebook_id;
    
    -- Find or create a Bronze page with space for this word
    SELECT p.id, p.words_count INTO current_page_id, page_word_count
    FROM pages p 
    WHERE p.notebook_id = bronze_notebook_id
    AND p.badge_id IS NULL  -- Bronze pages only
    AND p.words_count < 25  -- Has space (max 25 words per page)
    ORDER BY p.page_number DESC
    LIMIT 1;
    
    -- If no page with space, create a new one
    IF current_page_id IS NULL THEN
      INSERT INTO pages (
        notebook_id,
        page_number,
        words_count,
        status,
        date_created,
        current_round,
        target_round,
        is_completed,
        is_unlocked
      )
      SELECT 
        bronze_notebook_id,
        COALESCE(MAX(page_number), 0) + 1,
        0,
        'active',
        NOW(),
        '1'::round_number,
        '1'::round_number,
        false,
        true
      FROM pages 
      WHERE notebook_id = bronze_notebook_id
      RETURNING id, words_count INTO current_page_id, page_word_count;
    END IF;
    
    -- Move the word to the Bronze page
    UPDATE words 
    SET page_id = current_page_id
    WHERE id = badge_word.word_id;
    
    -- Update page word count
    UPDATE pages 
    SET words_count = words_count + 1,
        updated_at = NOW()
    WHERE id = current_page_id;
  END LOOP;
END $$;

-- Remove badge system tables and constraints
-- Drop foreign key constraints first
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_reference_check;
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_badge_id_fkey;

-- Drop badge system tables
DROP TABLE IF EXISTS notebook_badges CASCADE;

-- Remove badge_id column from pages
ALTER TABLE pages DROP COLUMN IF EXISTS badge_id;

-- Re-add the simplified constraint for pages (notebook_id must exist)
ALTER TABLE pages ALTER COLUMN notebook_id SET NOT NULL;

-- Remove badge-related functions
DROP FUNCTION IF EXISTS add_words_to_badge(UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS migrate_single_failed_word_to_silver(UUID) CASCADE;
DROP FUNCTION IF EXISTS migrate_failed_bronze_words_to_silver() CASCADE;
DROP FUNCTION IF EXISTS migrate_failed_silver_pages_to_gold() CASCADE;
DROP FUNCTION IF EXISTS get_reviewable_badge_pages(UUID) CASCADE;
DROP FUNCTION IF EXISTS collect_and_migrate_failed_words(UUID, UUID[]) CASCADE;

-- Success message
SELECT 'Step 2 complete: Data migrated and badge system removed' as result;