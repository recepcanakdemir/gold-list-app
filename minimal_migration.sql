-- =============================================
-- MINIMAL MIGRATION: Just update word rounds and remove badge system
-- This avoids all enum type conversion issues
-- =============================================

-- Update Silver words (Round 1-4 → Round 5-8)
UPDATE words 
SET current_round = current_round + 4
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  WHERE p.badge_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM notebook_badges nb 
    WHERE nb.id = p.badge_id AND nb.badge_type = 'gold'
  )
);

-- Update Gold words (Round 1-4 → Round 9-12)  
UPDATE words 
SET current_round = current_round + 8
WHERE id IN (
  SELECT w.id 
  FROM words w
  JOIN pages p ON w.page_id = p.id
  JOIN notebook_badges nb ON p.badge_id = nb.id
  WHERE nb.badge_type = 'gold'
);

-- Move badge words back to Bronze notebooks
UPDATE words 
SET page_id = (
  SELECT p.id 
  FROM pages p
  WHERE p.notebook_id = (
    SELECT nb.bronze_notebook_id 
    FROM notebook_badges nb
    JOIN pages badge_page ON badge_page.badge_id = nb.id
    WHERE badge_page.id = words.page_id
  )
  AND p.badge_id IS NULL
  ORDER BY p.page_number
  LIMIT 1
)
WHERE page_id IN (
  SELECT id FROM pages WHERE badge_id IS NOT NULL
);

-- Clean up badge system
DROP TABLE IF EXISTS notebook_badges CASCADE;
ALTER TABLE pages DROP COLUMN IF EXISTS badge_id;

-- Remove badge functions
DROP FUNCTION IF EXISTS add_words_to_badge(UUID, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS migrate_single_failed_word_to_silver(UUID) CASCADE;
DROP FUNCTION IF EXISTS migrate_failed_bronze_words_to_silver() CASCADE;
DROP FUNCTION IF EXISTS migrate_failed_silver_pages_to_gold() CASCADE;
DROP FUNCTION IF EXISTS get_reviewable_badge_pages(UUID) CASCADE;
DROP FUNCTION IF EXISTS collect_and_migrate_failed_words(UUID, UUID[]) CASCADE;

SELECT 'Minimal migration complete: Badge system removed, rounds updated' as result;