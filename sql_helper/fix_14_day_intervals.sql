-- =============================================
-- FIX 14-DAY REVIEW INTERVALS - URGENT DATABASE UPDATE
-- Run this SQL in Supabase SQL Editor to restore proper Gold List Method timing
-- =============================================

-- Update the update_word_review_result function with correct 14-day progression logic
CREATE OR REPLACE FUNCTION update_word_review_result(
  p_word_id uuid,
  p_remembered boolean,
  p_current_date date DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_word_round integer;
  word_notebook_id uuid;
  word_page_id uuid;
  word_last_reviewed date;
  word_created_at timestamp;
  next_review_date date;
BEGIN
  -- Get current word info and verify ownership
  SELECT w.current_round, w.notebook_id, w.page_id, w.last_reviewed, w.created_at
  INTO current_word_round, word_notebook_id, word_page_id, word_last_reviewed, word_created_at
  FROM words w
  JOIN notebooks n ON w.notebook_id = n.id
  WHERE w.id = p_word_id AND n.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Word not found or access denied';
  END IF;
  
  -- Calculate next review date based on word's last review date (proper +14 sequence)
  -- Use last_reviewed if available, otherwise fall back to word's creation date (not current date)
  -- This ensures Day 1→15→29→43 progression regardless of simulation day
  next_review_date := COALESCE(word_last_reviewed, word_created_at::date) + INTERVAL '14 days';
  
  IF p_remembered THEN
    -- Remembered words are mastered and removed from future reviews
    UPDATE words 
    SET 
      is_mastered = true,
      status = 'mastered',
      times_reviewed = times_reviewed + 1,
      last_reviewed = p_current_date,
      updated_at = NOW()
      -- No review_date needed - they're done forever
    WHERE id = p_word_id;
  ELSE
    -- Check if this is a Round 4 failure that should trigger Silver migration
    IF current_word_round >= 4 THEN
      -- Round 4 failures should be marked as 'failed' and handled by Silver migration
      UPDATE words 
      SET 
        status = 'failed',
        -- Don't advance round - leave at 4 and let Silver migration handle it
        current_round = current_word_round,
        -- No next review date - they'll be migrated to Silver
        times_reviewed = times_reviewed + 1,
        last_reviewed = p_current_date,
        updated_at = NOW()
      WHERE id = p_word_id;
    ELSE
      -- Forgotten words advance to next round by 1 (Rounds 1-3)
      UPDATE words 
      SET 
        current_round = current_word_round + 1,
        review_date = next_review_date,
        status = 'learning',
        times_reviewed = times_reviewed + 1,
        last_reviewed = p_current_date,
        updated_at = NOW()
      WHERE id = p_word_id;
    END IF;
  END IF;
  
  -- Update notebook's last activity
  UPDATE notebooks 
  SET updated_at = NOW() 
  WHERE id = word_notebook_id;
  
  -- Update the page's target_round and next_review_date
  IF word_page_id IS NOT NULL THEN
    PERFORM update_page_after_review(word_page_id);
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_word_review_result(UUID, BOOLEAN, DATE) TO authenticated;

-- Success message
SELECT '✅ 14-day review intervals FIXED! Words will now follow proper Day 1→15→29→43 progression.' as status;