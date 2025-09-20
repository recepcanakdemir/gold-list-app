-- Update word review result and advance round or mark as mastered
CREATE OR REPLACE FUNCTION update_word_review_result(
  p_word_id uuid,
  p_remembered boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_word_round integer;
  word_notebook_id uuid;
  next_review_date date;
BEGIN
  -- Get current word info and verify ownership
  SELECT w.current_round, w.notebook_id
  INTO current_word_round, word_notebook_id
  FROM words w
  JOIN notebooks n ON w.notebook_id = n.id
  WHERE w.id = p_word_id AND n.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Word not found or access denied';
  END IF;
  
  -- Calculate next review date (14 days from today)
  next_review_date := CURRENT_DATE + INTERVAL '14 days';
  
  IF p_remembered THEN
    -- Word was remembered
    IF current_word_round >= 4 THEN
      -- Word is mastered after round 4
      UPDATE words 
      SET 
        is_mastered = true,
        times_reviewed = times_reviewed + 1,
        last_reviewed = CURRENT_DATE,
        updated_at = NOW()
      WHERE id = p_word_id;
    ELSE
      -- Advance to next round
      UPDATE words 
      SET 
        current_round = current_word_round + 1,
        review_date = next_review_date,
        times_reviewed = times_reviewed + 1,
        last_reviewed = CURRENT_DATE,
        updated_at = NOW()
      WHERE id = p_word_id;
    END IF;
  ELSE
    -- Word was not remembered, reset to round 1
    UPDATE words 
    SET 
      current_round = 1,
      review_date = next_review_date,
      times_reviewed = times_reviewed + 1,
      last_reviewed = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = p_word_id;
  END IF;
  
  -- Update notebook's last activity
  UPDATE notebooks 
  SET updated_at = NOW() 
  WHERE id = word_notebook_id;
END;
$$;