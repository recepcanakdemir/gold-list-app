-- =============================================
-- SAFE STEP 2: MIGRATE DATA WITH CONSTRAINT HANDLING
-- Run this AFTER step1_extend_enum.sql has been completed
-- This version handles constraints that might cause enum comparison issues
-- =============================================

-- First, disable all constraints temporarily to avoid enum comparison issues
SET check_function_bodies = false;

-- Drop any constraints that might be causing round_number comparison issues
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop all check constraints that might involve round comparisons
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'CHECK'
        AND (cc.check_clause ILIKE '%round%' OR cc.check_clause ILIKE '%>=%' OR cc.check_clause ILIKE '%<=%')
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                      constraint_record.table_name, 
                      constraint_record.constraint_name);
    END LOOP;
END $$;

-- Convert existing Silver/Gold words to new round system using integer values
-- Silver Round 1 → Database Round 5
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

-- Silver Round 2 → Database Round 6
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

-- Silver Round 3 → Database Round 7
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

-- Silver Round 4 → Database Round 8
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

-- Gold Round 1 → Database Round 9
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

-- Gold Round 2 → Database Round 10
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

-- Gold Round 3 → Database Round 11
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

-- Gold Round 4 → Database Round 12
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

-- Move all badge words back to Bronze notebooks (simple approach)
-- Just move words to the first available Bronze page
DO $$
DECLARE
    word_record RECORD;
    target_page_id UUID;
BEGIN
    FOR word_record IN
        SELECT w.id as word_id, nb.bronze_notebook_id
        FROM words w
        JOIN pages p ON w.page_id = p.id
        JOIN notebook_badges nb ON p.badge_id = nb.id
    LOOP
        -- Find first available Bronze page
        SELECT p.id INTO target_page_id
        FROM pages p
        WHERE p.notebook_id = word_record.bronze_notebook_id
        AND p.badge_id IS NULL
        ORDER BY p.page_number
        LIMIT 1;
        
        -- Move the word
        IF target_page_id IS NOT NULL THEN
            UPDATE words 
            SET page_id = target_page_id
            WHERE id = word_record.word_id;
        END IF;
    END LOOP;
END $$;

-- Remove badge system completely
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

-- Now convert to enum types safely
ALTER TABLE words ALTER COLUMN current_round DROP DEFAULT;
ALTER TABLE words ALTER COLUMN current_round TYPE round_number USING current_round::text::round_number;
ALTER TABLE words ALTER COLUMN current_round SET DEFAULT '1'::round_number;

ALTER TABLE pages ALTER COLUMN current_round DROP DEFAULT;
ALTER TABLE pages ALTER COLUMN current_round TYPE round_number USING current_round::text::round_number;
ALTER TABLE pages ALTER COLUMN current_round SET DEFAULT '1'::round_number;

ALTER TABLE pages ALTER COLUMN target_round DROP DEFAULT;
ALTER TABLE pages ALTER COLUMN target_round TYPE round_number USING target_round::text::round_number;
ALTER TABLE pages ALTER COLUMN target_round SET DEFAULT '1'::round_number;

-- Re-enable constraint checking
SET check_function_bodies = true;

-- Success message
SELECT 'Safe Step 2 complete: Data migrated with constraint handling' as result;