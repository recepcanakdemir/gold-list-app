-- Get detailed notebook statistics
CREATE OR REPLACE FUNCTION get_notebook_stats(p_notebook_id uuid)
RETURNS TABLE(
  notebook_id uuid,
  total_words bigint,
  mastered_words bigint,
  round_1_words bigint,
  round_2_words bigint,
  round_3_words bigint,
  round_4_words bigint,
  pending_reviews bigint,
  words_added_today bigint,
  last_activity_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns this notebook
  IF NOT EXISTS (
    SELECT 1 FROM notebooks 
    WHERE id = p_notebook_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Notebook not found or access denied';
  END IF;
  
  RETURN QUERY
  SELECT 
    p_notebook_id as notebook_id,
    COUNT(*)::bigint as total_words,
    COUNT(CASE WHEN w.is_mastered THEN 1 END)::bigint as mastered_words,
    COUNT(CASE WHEN w.current_round = 1 THEN 1 END)::bigint as round_1_words,
    COUNT(CASE WHEN w.current_round = 2 THEN 1 END)::bigint as round_2_words,
    COUNT(CASE WHEN w.current_round = 3 THEN 1 END)::bigint as round_3_words,
    COUNT(CASE WHEN w.current_round = 4 THEN 1 END)::bigint as round_4_words,
    COUNT(CASE WHEN w.review_date <= CURRENT_DATE AND NOT w.is_mastered THEN 1 END)::bigint as pending_reviews,
    COUNT(CASE WHEN DATE(w.created_at) = CURRENT_DATE THEN 1 END)::bigint as words_added_today,
    MAX(DATE(w.updated_at)) as last_activity_date
  FROM words w
  WHERE w.notebook_id = p_notebook_id;
END;
$$;