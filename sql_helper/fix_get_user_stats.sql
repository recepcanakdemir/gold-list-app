-- Fix the get_user_stats function with proper table aliases
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
    (SELECT COUNT(*) FROM notebooks nb WHERE nb.user_id = target_user_id)::bigint as total_notebooks,
    (SELECT COUNT(*) FROM words w 
     JOIN notebooks nb ON w.notebook_id = nb.id 
     WHERE nb.user_id = target_user_id)::bigint as total_words,
    (SELECT COUNT(*) FROM words w 
     JOIN notebooks nb ON w.notebook_id = nb.id 
     WHERE nb.user_id = target_user_id AND w.is_mastered = true)::bigint as words_mastered,
    (SELECT streak_count FROM profiles p WHERE p.id = target_user_id) as current_streak,
    (SELECT COUNT(*) FROM words w 
     JOIN notebooks nb ON w.notebook_id = nb.id 
     WHERE nb.user_id = target_user_id 
     AND DATE(w.created_at) = CURRENT_DATE)::bigint as words_added_today;
END;
$$;