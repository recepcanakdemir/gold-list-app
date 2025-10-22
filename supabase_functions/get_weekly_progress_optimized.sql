-- Optimized weekly progress function for dashboard real-time updates
-- Returns 7 days of data ending with the current date (compatible with DevTime simulation)
CREATE OR REPLACE FUNCTION get_weekly_progress_optimized(
  p_user_id uuid,
  p_current_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  day text,
  words_added bigint,
  words_remembered bigint,
  completed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date date;
  day_names text[] := ARRAY['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
BEGIN
  -- Calculate start of week (7 days ago)
  start_date := p_current_date - INTERVAL '6 days';
  
  RETURN QUERY
  WITH date_series AS (
    SELECT 
      generate_series(start_date, p_current_date, '1 day'::interval)::date as date,
      generate_series(0, 6) as day_index
  ),
  daily_words AS (
    SELECT 
      DATE(w.created_at) as date,
      COUNT(*) as words_added
    FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = p_user_id
      AND DATE(w.created_at) BETWEEN start_date AND p_current_date
    GROUP BY DATE(w.created_at)
  ),
  daily_reviews AS (
    SELECT 
      DATE(r.created_at) as date,
      COUNT(CASE WHEN r.result = 'remembered' THEN 1 END) as words_remembered
    FROM reviews r
    JOIN words w ON r.word_id = w.id
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = p_user_id
      AND DATE(r.created_at) BETWEEN start_date AND p_current_date
    GROUP BY DATE(r.created_at)
  ),
  daily_goals AS (
    SELECT 
      ds.date,
      COALESCE(SUM(n.words_per_day), 10) as daily_goal
    FROM date_series ds
    CROSS JOIN notebooks n
    WHERE n.user_id = p_user_id
    GROUP BY ds.date
  )
  SELECT 
    day_names[(EXTRACT(DOW FROM ds.date)::integer) + 1] as day,
    COALESCE(dw.words_added, 0)::bigint as words_added,
    COALESCE(dr.words_remembered, 0)::bigint as words_remembered,
    COALESCE(dw.words_added, 0) >= COALESCE(dg.daily_goal, 10) as completed
  FROM date_series ds
  LEFT JOIN daily_words dw ON ds.date = dw.date
  LEFT JOIN daily_reviews dr ON ds.date = dr.date
  LEFT JOIN daily_goals dg ON ds.date = dg.date
  ORDER BY ds.date;
END;
$$;