-- Get learning insights and recommendations
CREATE OR REPLACE FUNCTION get_learning_insights()
RETURNS TABLE(
  total_words_learned bigint,
  words_mastered_this_week bigint,
  average_mastery_rate numeric,
  most_productive_day text,
  current_streak integer,
  longest_streak integer,
  recommended_daily_target integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile_data profiles%ROWTYPE;
BEGIN
  -- Get user profile data
  SELECT * INTO user_profile_data FROM profiles WHERE id = auth.uid();
  
  RETURN QUERY
  WITH weekly_stats AS (
    SELECT 
      COUNT(CASE WHEN w.is_mastered AND w.updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as mastered_this_week
    FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = auth.uid()
  ),
  daily_counts AS (
    SELECT 
      EXTRACT(DOW FROM w.created_at) as day_of_week,
      COUNT(*) as words_count
    FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = auth.uid()
      AND w.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY EXTRACT(DOW FROM w.created_at)
  ),
  mastery_stats AS (
    SELECT 
      COUNT(*) as total_words,
      COUNT(CASE WHEN w.is_mastered THEN 1 END) as mastered_words
    FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = auth.uid()
  )
  SELECT 
    ms.mastered_words::bigint as total_words_learned,
    ws.mastered_this_week::bigint as words_mastered_this_week,
    CASE 
      WHEN ms.total_words > 0 
      THEN ROUND((ms.mastered_words::numeric / ms.total_words::numeric) * 100, 1)
      ELSE 0
    END as average_mastery_rate,
    CASE (SELECT day_of_week FROM daily_counts ORDER BY words_count DESC LIMIT 1)
      WHEN 0 THEN 'Sunday'
      WHEN 1 THEN 'Monday'
      WHEN 2 THEN 'Tuesday'
      WHEN 3 THEN 'Wednesday'
      WHEN 4 THEN 'Thursday'
      WHEN 5 THEN 'Friday'
      WHEN 6 THEN 'Saturday'
      ELSE 'Monday'
    END as most_productive_day,
    user_profile_data.streak_count as current_streak,
    user_profile_data.longest_streak as longest_streak,
    GREATEST(15, LEAST(30, COALESCE(user_profile_data.total_words_added, 0) / GREATEST(1, EXTRACT(days FROM (CURRENT_DATE - user_profile_data.created_at::date)) + 1))) as recommended_daily_target
  FROM mastery_stats ms
  CROSS JOIN weekly_stats ws;
END;
$$;