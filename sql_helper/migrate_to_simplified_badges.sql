-- =============================================
-- SIMPLIFIED ROUND-BASED BADGE SYSTEM MIGRATION
-- Replaces complex badge tables with simple 12-round progression
-- Rounds 1-4: Bronze, 5-8: Silver, 9-12: Gold
-- =============================================

-- Step 1: Extend round_number enum to support rounds 1-12
-- Note: Each ALTER TYPE must be in a separate transaction, so we'll handle this differently
DO $$
BEGIN
  -- Add enum values if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '5' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '5';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '6' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '6';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '7' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '7';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '8' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '8';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '9' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '9';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '10' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '10';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '11' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '11';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '12' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '12';
  END IF;
END $$;

-- Step 2: Convert existing Silver/Gold words to new round system
-- Handle Silver words first (pages with badge_id that are NOT gold)
UPDATE words 
SET current_round = '5'::round_number
FROM pages p 
WHERE words.page_id = p.id 
AND p.badge_id IS NOT NULL 
AND p.current_round = 1
AND NOT EXISTS (
  SELECT 1 FROM notebook_badges nb 
  WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
);

UPDATE words 
SET current_round = '6'::round_number
FROM pages p 
WHERE words.page_id = p.id 
AND p.badge_id IS NOT NULL 
AND p.current_round = 2
AND NOT EXISTS (
  SELECT 1 FROM notebook_badges nb 
  WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
);

UPDATE words 
SET current_round = '7'::round_number
FROM pages p 
WHERE words.page_id = p.id 
AND p.badge_id IS NOT NULL 
AND p.current_round = 3
AND NOT EXISTS (
  SELECT 1 FROM notebook_badges nb 
  WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
);

UPDATE words 
SET current_round = '8'::round_number
FROM pages p 
WHERE words.page_id = p.id 
AND p.badge_id IS NOT NULL 
AND p.current_round = 4
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
AND p.current_round = 1;

UPDATE words 
SET current_round = '10'::round_number
FROM pages p 
JOIN notebook_badges nb ON p.badge_id = nb.id
WHERE words.page_id = p.id 
AND nb.badge_type = 'gold'
AND p.current_round = 2;

UPDATE words 
SET current_round = '11'::round_number
FROM pages p 
JOIN notebook_badges nb ON p.badge_id = nb.id
WHERE words.page_id = p.id 
AND nb.badge_type = 'gold'
AND p.current_round = 3;

UPDATE words 
SET current_round = '12'::round_number
FROM pages p 
JOIN notebook_badges nb ON p.badge_id = nb.id
WHERE words.page_id = p.id 
AND nb.badge_type = 'gold'
AND p.current_round = 4;

-- Step 3: Move all badge words back to Bronze notebook pages
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
        1::round_number,
        1::round_number,
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

-- Step 4: Remove badge system tables and constraints
-- Drop foreign key constraints first
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_reference_check;
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_badge_id_fkey;

-- Drop badge system tables
DROP TABLE IF EXISTS notebook_badges CASCADE;

-- Remove badge_id column from pages
ALTER TABLE pages DROP COLUMN IF EXISTS badge_id;

-- Re-add the simplified constraint for pages (notebook_id must exist)
ALTER TABLE pages ALTER COLUMN notebook_id SET NOT NULL;

-- Step 5: Remove badge-related functions
DROP FUNCTION IF EXISTS add_words_to_badge(UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS migrate_single_failed_word_to_silver(UUID) CASCADE;
DROP FUNCTION IF EXISTS migrate_failed_bronze_words_to_silver() CASCADE;
DROP FUNCTION IF EXISTS migrate_failed_silver_pages_to_gold() CASCADE;
DROP FUNCTION IF EXISTS get_reviewable_badge_pages(UUID) CASCADE;
DROP FUNCTION IF EXISTS collect_and_migrate_failed_words(UUID, UUID[]) CASCADE;

-- Step 6: Update word review function to handle 12 rounds
CREATE OR REPLACE FUNCTION update_word_review_result(
  p_word_id UUID,
  p_remembered BOOLEAN,
  p_current_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  success BOOLEAN,
  new_round INTEGER,
  new_status TEXT,
  review_date DATE,
  is_mastered BOOLEAN
) AS $$
DECLARE
  word_record RECORD;
  next_round INTEGER;
  next_review_date DATE;
  new_word_status TEXT;
  mastered BOOLEAN := FALSE;
BEGIN
  -- Get current word state
  SELECT current_round, status, times_reviewed
  INTO word_record
  FROM words 
  WHERE id = p_word_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'not_found'::TEXT, NULL::DATE, FALSE;
    RETURN;
  END IF;
  
  -- Calculate next state based on review result
  IF p_remembered THEN
    -- Word remembered - mastered
    new_word_status := 'mastered';
    next_round := word_record.current_round;
    next_review_date := NULL;
    mastered := TRUE;
  ELSE
    -- Word forgotten - advance to next round
    next_round := word_record.current_round + 1;
    
    IF next_round > 12 THEN
      -- Even Gold Round 4 failures become mastered (max difficulty reached)
      new_word_status := 'mastered';
      next_review_date := NULL;
      mastered := TRUE;
      next_round := 12;  -- Cap at round 12
    ELSE
      -- Continue learning at next round
      new_word_status := 'learning';
      next_review_date := p_current_date + INTERVAL '14 days';
      mastered := FALSE;
    END IF;
  END IF;
  
  -- Update the word
  UPDATE words
  SET 
    current_round = next_round::round_number,
    status = new_word_status,
    review_date = next_review_date,
    last_reviewed = p_current_date,
    times_reviewed = COALESCE(word_record.times_reviewed, 0) + 1,
    is_mastered = mastered,
    updated_at = NOW()
  WHERE id = p_word_id;
  
  -- Return the result
  RETURN QUERY SELECT TRUE, next_round, new_word_status, next_review_date, mastered;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_word_review_result(UUID, BOOLEAN, DATE) TO authenticated;

-- Success message
SELECT 'Simplified round-based badge system migration completed successfully' as result;