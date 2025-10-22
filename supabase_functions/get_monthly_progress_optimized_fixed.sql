-- Fixed monthly progress function using same logic as working weekly functions
-- Uses pages table and page creation dates (same as weekly functions)
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
  monthly_data AS (
    SELECT 
      date_trunc('month', p.created_at::DATE)::date as month_start,
      COUNT(w.id) as words_added,
      COUNT(CASE WHEN w.is_mastered THEN 1 END) as words_mastered
    FROM pages p
    JOIN notebooks n ON n.id = p.notebook_id
    LEFT JOIN words w ON w.page_id = p.id
    WHERE n.user_id = p_user_id
      AND p.created_at::DATE >= start_date
      AND p.created_at::DATE <= p_current_date  -- Use page creation date like weekly functions
    GROUP BY date_trunc('month', p.created_at::DATE)::date
  )
  SELECT 
    month_names[EXTRACT(MONTH FROM ms.month_start)::integer] as month,
    COALESCE(md.words_added, 0)::bigint as words_added,
    COALESCE(md.words_mastered, 0)::bigint as words_mastered
  FROM month_series ms
  LEFT JOIN monthly_data md ON ms.month_start = md.month_start
  ORDER BY ms.month_start;
END;
$$;