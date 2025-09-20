-- Get user notebooks with statistics
CREATE OR REPLACE FUNCTION get_user_notebooks()
RETURNS TABLE(
  id uuid,
  title text,
  language text,
  language_code text,
  words_per_day integer,
  notebook_level notebook_level_enum,
  total_words bigint,
  mastered_words bigint,
  pending_reviews bigint,
  todays_target integer,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.language,
    n.language_code,
    n.words_per_day,
    n.notebook_level,
    COALESCE(stats.total_words, 0)::bigint as total_words,
    COALESCE(stats.mastered_words, 0)::bigint as mastered_words,
    COALESCE(reviews.pending_count, 0)::bigint as pending_reviews,
    n.words_per_day as todays_target,
    n.created_at,
    n.updated_at
  FROM notebooks n
  LEFT JOIN (
    SELECT 
      notebook_id,
      COUNT(*) as total_words,
      COUNT(CASE WHEN is_mastered THEN 1 END) as mastered_words
    FROM words
    GROUP BY notebook_id
  ) stats ON n.id = stats.notebook_id
  LEFT JOIN (
    SELECT 
      notebook_id,
      COUNT(*) as pending_count
    FROM words
    WHERE review_date <= CURRENT_DATE 
    AND is_mastered = false
    GROUP BY notebook_id
  ) reviews ON n.id = reviews.notebook_id
  WHERE n.user_id = auth.uid()
  ORDER BY n.updated_at DESC;
END;
$$;