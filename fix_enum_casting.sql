-- =============================================
-- FIX ENUM TYPE CASTING FOR ROUND_NUMBER
-- Run this to fix PostgreSQL enum constraint violations
-- =============================================

-- Fix the add_words_to_badge function with proper enum casting
CREATE OR REPLACE FUNCTION add_words_to_badge(
  p_badge_id UUID,
  p_words UUID[]
)
RETURNS TABLE(
  page_id UUID,
  page_completed BOOLEAN,
  review_date_set TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_page_id UUID;
  current_words_count INTEGER;
  words_to_add INTEGER;
  new_review_date TIMESTAMP WITH TIME ZONE;
  max_page_number INTEGER;
BEGIN
  words_to_add := array_length(p_words, 1);
  
  -- Get current accumulating page for this badge
  SELECT p.id, p.words_count 
  INTO current_page_id, current_words_count
  FROM pages p 
  WHERE p.badge_id = p_badge_id 
  AND p.status = 'accumulating'
  ORDER BY p.page_number DESC
  LIMIT 1;
  
  -- If no accumulating page exists, create one
  IF current_page_id IS NULL THEN
    -- Get max page number for this badge
    SELECT COALESCE(MAX(p.page_number), 0) INTO max_page_number
    FROM pages p 
    WHERE p.badge_id = p_badge_id;
    
    -- Create new page with explicit enum casting
    INSERT INTO pages (
      badge_id, 
      notebook_id,  -- Explicitly set to NULL
      page_number, 
      words_count, 
      status,
      date_created,
      current_round,
      is_completed,
      is_unlocked,
      target_round
    )
    VALUES (
      p_badge_id,
      NULL,  -- notebook_id is NULL for badge pages
      max_page_number + 1,
      0,
      'accumulating',
      NOW(),
      1::round_number,  -- Cast to enum type
      false,
      true,
      1::round_number   -- Cast to enum type
    )
    RETURNING id, words_count INTO current_page_id, current_words_count;
  END IF;
  
  -- Update words to point to this page
  UPDATE words 
  SET page_id = current_page_id 
  WHERE id = ANY(p_words);
  
  -- Update page words count
  UPDATE pages 
  SET words_count = current_words_count + words_to_add,
      updated_at = NOW()
  WHERE id = current_page_id;
  
  -- Check if page is now complete (20 words)
  IF current_words_count + words_to_add >= 20 THEN
    new_review_date := NOW() + INTERVAL '14 days';
    
    UPDATE pages 
    SET 
      status = 'ready_for_review',
      review_date = new_review_date,
      updated_at = NOW()
    WHERE id = current_page_id;
    
    -- Update badge stats
    UPDATE notebook_badges 
    SET 
      total_words = total_words + words_to_add,
      active_pages_count = active_pages_count + 1,
      updated_at = NOW()
    WHERE id = p_badge_id;
    
    RETURN QUERY SELECT current_page_id, true, new_review_date;
  ELSE
    -- Update badge word count
    UPDATE notebook_badges 
    SET 
      total_words = total_words + words_to_add,
      updated_at = NOW()
    WHERE id = p_badge_id;
    
    RETURN QUERY SELECT current_page_id, false, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fix the migrate_single_failed_word_to_silver function with proper enum casting
CREATE OR REPLACE FUNCTION migrate_single_failed_word_to_silver(
  p_word_id UUID
)
RETURNS TABLE(
  silver_badge_id UUID,
  page_id UUID,
  badge_created BOOLEAN
) AS $$
DECLARE
  word_info RECORD;
  badge_id UUID;
  page_result RECORD;
  badge_was_created BOOLEAN := FALSE;
BEGIN
  -- Get word and notebook info with detailed logging
  SELECT 
    w.id as word_id,
    w.current_round,
    w.status,
    p.id as page_id,
    p.notebook_id
  INTO word_info
  FROM words w
  JOIN pages p ON w.page_id = p.id
  WHERE w.id = p_word_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Word % not found in database', p_word_id;
  END IF;
  
  RAISE NOTICE 'Word % found: round=%, status=%, page_id=%, notebook_id=%', 
    p_word_id, word_info.current_round, word_info.status, word_info.page_id, word_info.notebook_id;
  
  -- Check if it's from a Bronze notebook
  IF word_info.notebook_id IS NULL THEN
    RAISE EXCEPTION 'Word % does not belong to a Bronze notebook (notebook_id is NULL)', p_word_id;
  END IF;
  
  -- Get or create Silver badge for this Bronze notebook
  SELECT id INTO badge_id
  FROM notebook_badges
  WHERE bronze_notebook_id = word_info.notebook_id
  AND badge_type = 'silver';
  
  IF badge_id IS NULL THEN
    -- Create Silver badge
    RAISE NOTICE 'Creating new Silver badge for Bronze notebook %', word_info.notebook_id;
    INSERT INTO notebook_badges (bronze_notebook_id, badge_type)
    VALUES (word_info.notebook_id, 'silver')
    RETURNING id INTO badge_id;
    
    badge_was_created := TRUE;
    RAISE NOTICE 'Created Silver badge % for Bronze notebook %', badge_id, word_info.notebook_id;
  ELSE
    RAISE NOTICE 'Using existing Silver badge % for Bronze notebook %', badge_id, word_info.notebook_id;
  END IF;
  
  -- Add the single word to the badge
  RAISE NOTICE 'Adding word % to Silver badge %', p_word_id, badge_id;
  SELECT * INTO page_result
  FROM add_words_to_badge(badge_id, ARRAY[p_word_id]);
  
  -- Reset word to learning status and Round 1 for Silver progression (with enum casting)
  UPDATE words
  SET 
    status = 'learning',
    current_round = 1::round_number,  -- Cast to enum type
    updated_at = NOW()
  WHERE id = p_word_id;
  
  RAISE NOTICE 'Word % migrated successfully to Silver badge %, page %, badge created: %', 
    p_word_id, badge_id, page_result.page_id, badge_was_created;
  
  RETURN QUERY SELECT badge_id, page_result.page_id, badge_was_created;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_words_to_badge(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_single_failed_word_to_silver(UUID) TO authenticated;

-- Success message
SELECT 'Enum type casting fixes applied successfully' as result;