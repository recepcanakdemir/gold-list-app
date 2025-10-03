-- =============================================
-- FIX IMMEDIATE SILVER MIGRATION
-- Run this to fix immediate Silver badge creation
-- =============================================

-- Update the migrate_single_failed_word_to_silver function with better error handling
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
  
  -- Reset word to learning status and Round 1 for Silver progression
  UPDATE words
  SET 
    status = 'learning',
    current_round = 1,
    updated_at = NOW()
  WHERE id = p_word_id;
  
  RAISE NOTICE 'Word % migrated successfully to Silver badge %, page %, badge created: %', 
    p_word_id, badge_id, page_result.page_id, badge_was_created;
  
  RETURN QUERY SELECT badge_id, page_result.page_id, badge_was_created;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION migrate_single_failed_word_to_silver(UUID) TO authenticated;

-- Success message
SELECT 'Immediate Silver migration function updated with better error handling' as result;