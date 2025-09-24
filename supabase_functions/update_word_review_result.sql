-- Update word review result and advance round or mark as mastered
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
  next_review_date date;
BEGIN
  -- Get current word info and verify ownership
  SELECT w.current_round, w.notebook_id, w.page_id
  INTO current_word_round, word_notebook_id, word_page_id
  FROM words w
  JOIN notebooks n ON w.notebook_id = n.id
  WHERE w.id = p_word_id AND n.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Word not found or access denied';
  END IF;
  
  -- Calculate next review date (14 days from current date)
  next_review_date := p_current_date + INTERVAL '14 days';
  
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
    -- Forgotten words advance to next round by 1
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