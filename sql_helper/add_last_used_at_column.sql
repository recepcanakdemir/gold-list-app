-- Add last_used_at column to notebooks table for tracking notebook usage
ALTER TABLE notebooks 
ADD COLUMN last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient sorting by last used date
CREATE INDEX idx_notebooks_last_used_at ON notebooks(last_used_at DESC);

-- Update existing notebooks to have a last_used_at value based on created_at
UPDATE notebooks 
SET last_used_at = created_at 
WHERE last_used_at IS NULL;

-- Update the get_user_all_notebooks_with_stats function to include last_used_at and sort by it
CREATE OR REPLACE FUNCTION get_user_all_notebooks_with_stats(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  language text,
  language_code text,
  words_per_day integer,
  notebook_level text,
  created_at timestamp with time zone,
  last_used_at timestamp with time zone,
  pages_count bigint,
  total_words bigint,
  words_ready_for_review bigint
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
    n.notebook_level::text,
    n.created_at,
    n.last_used_at,
    COUNT(DISTINCT p.id) as pages_count,
    COUNT(DISTINCT w.id) as total_words,
    COUNT(DISTINCT CASE 
      WHEN w.review_date <= CURRENT_DATE AND w.is_mastered = false 
      THEN w.id 
      ELSE NULL 
    END) as words_ready_for_review
  FROM notebooks n
  LEFT JOIN pages p ON n.id = p.notebook_id
  LEFT JOIN words w ON n.id = w.notebook_id
  WHERE n.user_id = p_user_id AND n.is_active = true
  GROUP BY n.id, n.title, n.language, n.language_code, n.words_per_day, n.notebook_level, n.created_at, n.last_used_at
  ORDER BY n.last_used_at DESC, n.created_at DESC;
END;
$$;