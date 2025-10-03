-- =============================================
-- INTEGER-BASED STEP 2: MIGRATE DATA TO SIMPLIFIED BADGE SYSTEM
-- Run this AFTER step1_extend_enum.sql has been completed
-- This version keeps integer types and converts values only
-- =============================================

-- Convert existing Silver/Gold words to new round system using integer values
-- We'll keep the columns as integers for now to avoid enum comparison issues

-- Silver Round 1 words → Database Round 5
UPDATE words 
SET current_round = 5
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  WHERE p.badge_id IS NOT NULL 
  AND w.current_round = 1
  AND NOT EXISTS (
    SELECT 1 FROM notebook_badges nb 
    WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
  )
);

-- Silver Round 2 words → Database Round 6
UPDATE words 
SET current_round = 6
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  WHERE p.badge_id IS NOT NULL 
  AND w.current_round = 2
  AND NOT EXISTS (
    SELECT 1 FROM notebook_badges nb 
    WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
  )
);

-- Silver Round 3 words → Database Round 7
UPDATE words 
SET current_round = 7
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  WHERE p.badge_id IS NOT NULL 
  AND w.current_round = 3
  AND NOT EXISTS (
    SELECT 1 FROM notebook_badges nb 
    WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
  )
);

-- Silver Round 4 words → Database Round 8
UPDATE words 
SET current_round = 8
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  WHERE p.badge_id IS NOT NULL 
  AND w.current_round = 4
  AND NOT EXISTS (
    SELECT 1 FROM notebook_badges nb 
    WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
  )
);

-- Gold Round 1 words → Database Round 9
UPDATE words 
SET current_round = 9
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  JOIN notebook_badges nb ON p.badge_id = nb.id
  WHERE nb.badge_type = 'gold'
  AND w.current_round = 1
);

-- Gold Round 2 words → Database Round 10
UPDATE words 
SET current_round = 10
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  JOIN notebook_badges nb ON p.badge_id = nb.id
  WHERE nb.badge_type = 'gold'
  AND w.current_round = 2
);

-- Gold Round 3 words → Database Round 11
UPDATE words 
SET current_round = 11
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  JOIN notebook_badges nb ON p.badge_id = nb.id
  WHERE nb.badge_type = 'gold'
  AND w.current_round = 3
);

-- Gold Round 4 words → Database Round 12
UPDATE words 
SET current_round = 12
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  JOIN notebook_badges nb ON p.badge_id = nb.id
  WHERE nb.badge_type = 'gold'
  AND w.current_round = 4
);

-- Move all badge words back to their original Bronze notebook
-- Find a suitable Bronze page for each word
UPDATE words 
SET page_id = (
  SELECT p.id 
  FROM pages p
  JOIN notebook_badges nb ON nb.bronze_notebook_id = p.notebook_id
  WHERE nb.id = (
    SELECT badge_id FROM pages badge_page WHERE badge_page.id = words.page_id
  )
  AND p.notebook_id IS NOT NULL
  AND p.badge_id IS NULL
  ORDER BY p.page_number
  LIMIT 1
)
WHERE page_id IN (
  SELECT id FROM pages WHERE badge_id IS NOT NULL
);

-- Drop badge system constraints and tables
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_reference_check;
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_badge_id_fkey;
DROP TABLE IF EXISTS notebook_badges CASCADE;
ALTER TABLE pages DROP COLUMN IF EXISTS badge_id;
ALTER TABLE pages ALTER COLUMN notebook_id SET NOT NULL;

-- Remove badge-related functions
DROP FUNCTION IF EXISTS add_words_to_badge(UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS migrate_single_failed_word_to_silver(UUID) CASCADE;
DROP FUNCTION IF EXISTS migrate_failed_bronze_words_to_silver() CASCADE;
DROP FUNCTION IF EXISTS migrate_failed_silver_pages_to_gold() CASCADE;
DROP FUNCTION IF EXISTS get_reviewable_badge_pages(UUID) CASCADE;
DROP FUNCTION IF EXISTS collect_and_migrate_failed_words(UUID, UUID[]) CASCADE;

-- Now safely convert to round_number enum type AFTER removing badge system
-- Handle words table
ALTER TABLE words ALTER COLUMN current_round DROP DEFAULT;
ALTER TABLE words ALTER COLUMN current_round TYPE round_number USING current_round::text::round_number;
ALTER TABLE words ALTER COLUMN current_round SET DEFAULT '1'::round_number;

-- Handle pages table current_round column  
ALTER TABLE pages ALTER COLUMN current_round DROP DEFAULT;
ALTER TABLE pages ALTER COLUMN current_round TYPE round_number USING current_round::text::round_number;
ALTER TABLE pages ALTER COLUMN current_round SET DEFAULT '1'::round_number;

-- Handle pages table target_round column
ALTER TABLE pages ALTER COLUMN target_round DROP DEFAULT;
ALTER TABLE pages ALTER COLUMN target_round TYPE round_number USING target_round::text::round_number;
ALTER TABLE pages ALTER COLUMN target_round SET DEFAULT '1'::round_number;

-- Success message
SELECT 'Integer-based Step 2 complete: Data migrated, badge system removed, and columns converted to enum' as result;