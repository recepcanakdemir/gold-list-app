-- Optimized monthly progress function for dashboard real-time updates
-- Returns 7 months of data INCLUDING today's words in current month
CREATE OR REPLACE FUNCTION get_monthly_progress_optimized(
  p_user_id uuid,
  p_current_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  month text,
  words_added bigint,
  words_mastered bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date date;
  month_names text[] := ARRAY['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
BEGIN
  -- Calculate start date (6 months ago) using the provided current date
  start_date := date_trunc('month', p_current_date - INTERVAL '6 months')::date;
  
  RETURN QUERY
  WITH month_series AS (
    SELECT 
      generate_series(
        start_date,
        date_trunc('month', p_current_date)::date,
        '1 month'::interval
      )::date as month_start,
      generate_series(0, 6) as month_index
  ),
  monthly_words AS (
    SELECT 
      date_trunc('month', DATE(w.created_at))::date as month_start,
      COUNT(*) as words_added
    FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = p_user_id
      AND DATE(w.created_at) >= start_date
      AND DATE(w.created_at) <= p_current_date  -- CRITICAL: Include today's date
    GROUP BY date_trunc('month', DATE(w.created_at))::date
  ),
  monthly_mastered AS (
    SELECT 
      date_trunc('month', DATE(w.updated_at))::date as month_start,
      COUNT(*) as words_mastered
    FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = p_user_id
      AND w.is_mastered = true
      AND DATE(w.updated_at) >= start_date
      AND DATE(w.updated_at) <= p_current_date  -- CRITICAL: Include today's date
    GROUP BY date_trunc('month', DATE(w.updated_at))::date
  )
  SELECT 
    month_names[EXTRACT(MONTH FROM ms.month_start)::integer] as month,
    COALESCE(mw.words_added, 0)::bigint as words_added,
    COALESCE(mm.words_mastered, 0)::bigint as words_mastered
  FROM month_series ms
  LEFT JOIN monthly_words mw ON ms.month_start = mw.month_start
  LEFT JOIN monthly_mastered mm ON ms.month_start = mm.month_start
  ORDER BY ms.month_start;
END;
$$;