-- Update page target_round and next_review_date after word reviews
CREATE OR REPLACE FUNCTION update_page_after_review(
  p_page_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  page_notebook_id uuid;
  max_round integer;
  earliest_review_date date;
BEGIN
  -- Get page info and verify ownership
  SELECT p.notebook_id
  INTO page_notebook_id
  FROM pages p
  JOIN notebooks n ON p.notebook_id = n.id
  WHERE p.id = p_page_id AND n.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Page not found or access denied';
  END IF;
  
  -- Get the highest round of words in this page
  SELECT COALESCE(MAX(w.current_round), 1)
  INTO max_round
  FROM words w
  WHERE w.page_id = p_page_id AND w.status = 'learning';
  
  -- Get the earliest next review date of words in this page
  SELECT MIN(w.review_date)
  INTO earliest_review_date
  FROM words w
  WHERE w.page_id = p_page_id 
    AND w.status = 'learning'
    AND w.review_date IS NOT NULL;
  
  -- Update the page with new target_round and next_review_date
  UPDATE pages 
  SET 
    target_round = max_round,
    next_review_date = earliest_review_date,
    updated_at = NOW()
  WHERE id = p_page_id;
  
  -- Update notebook's last activity
  UPDATE notebooks 
  SET updated_at = NOW() 
  WHERE id = page_notebook_id;
END;
$$;