-- Get user statistics function
CREATE OR REPLACE FUNCTION get_user_stats(user_id uuid DEFAULT NULL)
RETURNS TABLE(
  total_notebooks bigint,
  total_words bigint,
  words_mastered bigint,
  current_streak integer,
  words_added_today bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id uuid := COALESCE(user_id, auth.uid());
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM notebooks WHERE user_id = target_user_id)::bigint as total_notebooks,
    (SELECT COUNT(*) FROM words w 
     JOIN notebooks n ON w.notebook_id = n.id 
     WHERE n.user_id = target_user_id)::bigint as total_words,
    (SELECT COUNT(*) FROM words w 
     JOIN notebooks n ON w.notebook_id = n.id 
     WHERE n.user_id = target_user_id AND w.is_mastered = true)::bigint as words_mastered,
    (SELECT streak_count FROM profiles WHERE id = target_user_id) as current_streak,
    (SELECT COUNT(*) FROM words w 
     JOIN notebooks n ON w.notebook_id = n.id 
     WHERE n.user_id = target_user_id 
     AND DATE(w.created_at) = CURRENT_DATE)::bigint as words_added_today;
END;
$$;