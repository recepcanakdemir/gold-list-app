-- =============================================
-- COMPLETE BADGE SYSTEM MIGRATION
-- Implements Bronze→Silver→Gold progression with page-based reviews
-- =============================================

-- 1. Add missing columns to pages table for Silver/Gold progression
ALTER TABLE pages ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1 CHECK (current_round >= 1 AND current_round <= 4);

-- Update existing pages to have proper current_round values
UPDATE pages SET current_round = 1 WHERE current_round IS NULL;

-- 2. Create function to migrate Bronze Round 4 failures to Silver
CREATE OR REPLACE FUNCTION migrate_failed_bronze_words_to_silver()
RETURNS TABLE(
  words_migrated INTEGER,
  badges_created INTEGER,
  pages_created INTEGER
) AS $$
DECLARE
  bronze_notebook RECORD;
  failed_words RECORD;
  silver_badge_id UUID;
  migration_stats RECORD;
  total_words_migrated INTEGER := 0;
  total_badges_created INTEGER := 0;
  total_pages_created INTEGER := 0;
BEGIN
  -- Process each Bronze notebook that has failed words
  FOR bronze_notebook IN
    SELECT DISTINCT n.id as notebook_id, n.user_id, n.title, n.language
    FROM notebooks n
    JOIN pages p ON p.notebook_id = n.id
    JOIN words w ON w.page_id = p.id
    WHERE n.notebook_level = 'bronze'
    AND w.status = 'failed'
    AND w.current_round >= 4
  LOOP
    -- Get or create Silver badge for this Bronze notebook
    SELECT id INTO silver_badge_id
    FROM notebook_badges
    WHERE bronze_notebook_id = bronze_notebook.notebook_id
    AND badge_type = 'silver';
    
    IF silver_badge_id IS NULL THEN
      -- Create Silver badge
      INSERT INTO notebook_badges (bronze_notebook_id, badge_type)
      VALUES (bronze_notebook.notebook_id, 'silver')
      RETURNING id INTO silver_badge_id;
      
      total_badges_created := total_badges_created + 1;
    END IF;
    
    -- Get all failed words from this Bronze notebook
    FOR failed_words IN
      SELECT array_agg(w.id) as word_ids
      FROM words w
      JOIN pages p ON w.page_id = p.id
      WHERE p.notebook_id = bronze_notebook.notebook_id
      AND w.status = 'failed'
      AND w.current_round >= 4
      GROUP BY TRUE
      HAVING COUNT(*) > 0
    LOOP
      -- Add words to Silver badge (will create pages as needed)
      SELECT * INTO migration_stats
      FROM add_words_to_badge(silver_badge_id, failed_words.word_ids);
      
      -- Reset words to learning status and Round 1 for Silver progression
      UPDATE words
      SET 
        status = 'learning',
        current_round = 1,
        updated_at = NOW()
      WHERE id = ANY(failed_words.word_ids);
      
      total_words_migrated := total_words_migrated + array_length(failed_words.word_ids, 1);
      
      IF migration_stats.page_completed THEN
        total_pages_created := total_pages_created + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT total_words_migrated, total_badges_created, total_pages_created;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to migrate Silver Round 4 failures to Gold
CREATE OR REPLACE FUNCTION migrate_failed_silver_pages_to_gold()
RETURNS TABLE(
  pages_migrated INTEGER,
  words_migrated INTEGER,
  badges_created INTEGER
) AS $$
DECLARE
  failed_silver_page RECORD;
  gold_badge_id UUID;
  bronze_notebook_id UUID;
  page_words UUID[];
  migration_stats RECORD;
  total_pages_migrated INTEGER := 0;
  total_words_migrated INTEGER := 0;
  total_badges_created INTEGER := 0;
BEGIN
  -- Process each Silver page that failed Round 4
  FOR failed_silver_page IN
    SELECT p.id as page_id, p.badge_id as silver_badge_id, nb.bronze_notebook_id
    FROM pages p
    JOIN notebook_badges nb ON p.badge_id = nb.id
    WHERE nb.badge_type = 'silver'
    AND p.status = 'failed'
    AND p.current_round >= 4
  LOOP
    bronze_notebook_id := failed_silver_page.bronze_notebook_id;
    
    -- Get or create Gold badge for this Bronze notebook
    SELECT id INTO gold_badge_id
    FROM notebook_badges
    WHERE bronze_notebook_id = bronze_notebook_id
    AND badge_type = 'gold';
    
    IF gold_badge_id IS NULL THEN
      -- Create Gold badge
      INSERT INTO notebook_badges (bronze_notebook_id, badge_type)
      VALUES (bronze_notebook_id, 'gold')
      RETURNING id INTO gold_badge_id;
      
      total_badges_created := total_badges_created + 1;
    END IF;
    
    -- Get all words from the failed Silver page
    SELECT array_agg(w.id) INTO page_words
    FROM words w
    WHERE w.page_id = failed_silver_page.page_id;
    
    IF page_words IS NOT NULL THEN
      -- Add words to Gold badge
      SELECT * INTO migration_stats
      FROM add_words_to_badge(gold_badge_id, page_words);
      
      -- Reset words to learning status and Round 1 for Gold progression
      UPDATE words
      SET 
        status = 'learning',
        current_round = 1,
        updated_at = NOW()
      WHERE id = ANY(page_words);
      
      -- Mark original Silver page as migrated
      UPDATE pages
      SET status = 'migrated'
      WHERE id = failed_silver_page.page_id;
      
      total_pages_migrated := total_pages_migrated + 1;
      total_words_migrated := total_words_migrated + array_length(page_words, 1);
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT total_pages_migrated, total_words_migrated, total_badges_created;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the review result function to handle page-based Silver/Gold reviews
CREATE OR REPLACE FUNCTION update_page_review_result(
  p_page_id UUID,
  p_remembered BOOLEAN,
  p_current_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  badge_acquired TEXT,
  migration_triggered BOOLEAN
) AS $$
DECLARE
  page_info RECORD;
  next_review_date DATE;
  migration_needed BOOLEAN := FALSE;
  new_badge_type TEXT := NULL;
BEGIN
  -- Get page info
  SELECT p.current_round, p.badge_id, nb.badge_type, nb.bronze_notebook_id
  INTO page_info
  FROM pages p
  JOIN notebook_badges nb ON p.badge_id = nb.id
  WHERE p.id = p_page_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found or not a badge page';
  END IF;
  
  -- Calculate next review date (14 days from current)
  next_review_date := p_current_date + INTERVAL '14 days';
  
  IF p_remembered THEN
    -- All words in page are mastered
    UPDATE words 
    SET 
      is_mastered = true,
      status = 'mastered',
      times_reviewed = times_reviewed + 1,
      last_reviewed = p_current_date,
      updated_at = NOW()
    WHERE page_id = p_page_id;
    
    -- Mark page as completed
    UPDATE pages 
    SET 
      status = 'completed',
      updated_at = NOW()
    WHERE id = p_page_id;
  ELSE
    -- Page forgotten - check if this is Round 4 failure
    IF page_info.current_round >= 4 THEN
      -- Round 4 failure - mark for migration
      UPDATE pages 
      SET 
        status = 'failed',
        current_round = page_info.current_round,
        times_reviewed = times_reviewed + 1,
        last_reviewed = p_current_date,
        updated_at = NOW()
      WHERE id = p_page_id;
      
      migration_needed := TRUE;
      
      -- Determine what badge will be acquired
      IF page_info.badge_type = 'silver' THEN
        new_badge_type := 'gold';
      END IF;
    ELSE
      -- Advance to next round
      UPDATE pages 
      SET 
        current_round = page_info.current_round + 1,
        review_date = next_review_date,
        status = 'ready_for_review',
        times_reviewed = times_reviewed + 1,
        last_reviewed = p_current_date,
        updated_at = NOW()
      WHERE id = p_page_id;
      
      -- Update word review counts
      UPDATE words 
      SET 
        times_reviewed = times_reviewed + 1,
        last_reviewed = p_current_date,
        updated_at = NOW()
      WHERE page_id = p_page_id;
    END IF;
  END IF;
  
  RETURN QUERY SELECT new_badge_type, migration_needed;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to get words with their badge level for review UI
CREATE OR REPLACE FUNCTION get_words_with_badge_level(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  word TEXT,
  translation TEXT,
  meaning TEXT,
  example_sentence TEXT,
  notes TEXT,
  current_round INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  notebook_id UUID,
  page_id UUID,
  notebook_title TEXT,
  notebook_language TEXT,
  notebook_level TEXT,
  badge_type TEXT,
  review_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.word,
    w.translation,
    w.meaning,
    w.example_sentence,
    w.notes,
    w.current_round,
    w.created_at,
    COALESCE(n.id, nb.bronze_notebook_id) as notebook_id,
    w.page_id,
    COALESCE(n.title, bn.title) as notebook_title,
    COALESCE(n.language, bn.language) as notebook_language,
    COALESCE(n.notebook_level, 'bronze') as notebook_level,
    COALESCE(nb.badge_type, 'bronze') as badge_type,
    CASE 
      WHEN n.id IS NOT NULL THEN 'word'
      ELSE 'page'
    END as review_type
  FROM words w
  LEFT JOIN pages p ON w.page_id = p.id
  LEFT JOIN notebooks n ON p.notebook_id = n.id AND n.user_id = p_user_id
  LEFT JOIN notebook_badges nb ON p.badge_id = nb.id
  LEFT JOIN notebooks bn ON nb.bronze_notebook_id = bn.id AND bn.user_id = p_user_id
  WHERE (
    -- Bronze words (individual review)
    (n.id IS NOT NULL AND w.review_date <= CURRENT_DATE AND w.status = 'learning')
    OR
    -- Silver/Gold words (page-based review)
    (nb.id IS NOT NULL AND p.review_date <= NOW() AND p.status = 'ready_for_review')
  )
  ORDER BY w.created_at;
END;
$$ LANGUAGE plpgsql;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION migrate_failed_bronze_words_to_silver() TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_failed_silver_pages_to_gold() TO authenticated;
GRANT EXECUTE ON FUNCTION update_page_review_result(UUID, BOOLEAN, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_words_with_badge_level(UUID) TO authenticated;

-- 7. Create scheduled migration job (to be run periodically)
CREATE OR REPLACE FUNCTION run_badge_migrations()
RETURNS TABLE(
  bronze_to_silver_words INTEGER,
  silver_to_gold_pages INTEGER,
  badges_created INTEGER
) AS $$
DECLARE
  bronze_migration RECORD;
  silver_migration RECORD;
BEGIN
  -- Run Bronze to Silver migration
  SELECT * INTO bronze_migration FROM migrate_failed_bronze_words_to_silver();
  
  -- Run Silver to Gold migration  
  SELECT * INTO silver_migration FROM migrate_failed_silver_pages_to_gold();
  
  RETURN QUERY SELECT 
    bronze_migration.words_migrated,
    silver_migration.pages_migrated,
    bronze_migration.badges_created + silver_migration.badges_created;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION run_badge_migrations() TO authenticated;

-- Success message
SELECT 'Complete badge system migration created successfully' as result;