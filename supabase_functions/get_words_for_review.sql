-- Get words ready for review in a specific round
CREATE OR REPLACE FUNCTION get_words_for_review(
  p_notebook_id uuid,
  p_round_number integer DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  word text,
  translation text,
  example_sentence text,
  notes text,
  current_round integer,
  review_date date,
  times_reviewed integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns this notebook
  IF NOT EXISTS (
    SELECT 1 FROM notebooks 
    WHERE notebooks.id = p_notebook_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Notebook not found or access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    w.id,
    w.word,
    w.translation,
    w.example_sentence,
    w.notes,
    w.current_round,
    w.review_date,
    w.times_reviewed,
    w.created_at
  FROM words w
  WHERE w.notebook_id = p_notebook_id
    AND w.review_date <= CURRENT_DATE
    AND w.is_mastered = false
    AND (p_round_number IS NULL OR w.current_round = p_round_number)
  ORDER BY w.review_date ASC, w.created_at ASC;
END;
$$;