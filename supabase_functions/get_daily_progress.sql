-- Get daily progress data for analytics
CREATE OR REPLACE FUNCTION get_daily_progress(
  p_start_date date DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  date date,
  words_added bigint,
  words_reviewed bigint,
  words_mastered bigint,
  total_study_time integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date as date
  ),
  daily_stats AS (
    SELECT 
      DATE(w.created_at) as date,
      COUNT(*) as words_added,
      0::bigint as words_reviewed,
      0::bigint as words_mastered
    FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = auth.uid()
      AND DATE(w.created_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(w.created_at)
    
    UNION ALL
    
    SELECT 
      DATE(w.last_reviewed) as date,
      0::bigint as words_added,
      COUNT(*) as words_reviewed,
      COUNT(CASE WHEN w.is_mastered AND DATE(w.updated_at) = DATE(w.last_reviewed) THEN 1 END) as words_mastered
    FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = auth.uid()
      AND w.last_reviewed IS NOT NULL
      AND DATE(w.last_reviewed) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(w.last_reviewed)
  )
  SELECT 
    ds.date,
    COALESCE(SUM(daily_stats.words_added), 0)::bigint as words_added,
    COALESCE(SUM(daily_stats.words_reviewed), 0)::bigint as words_reviewed,
    COALESCE(SUM(daily_stats.words_mastered), 0)::bigint as words_mastered,
    0 as total_study_time -- Placeholder for future implementation
  FROM date_series ds
  LEFT JOIN daily_stats ON ds.date = daily_stats.date
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$;