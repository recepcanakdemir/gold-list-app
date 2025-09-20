-- Update user statistics trigger function
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  user_id uuid;
  total_words_count integer;
  mastered_words_count integer;
BEGIN
  -- Get the user_id from the notebook
  SELECT n.user_id INTO user_id
  FROM notebooks n
  WHERE n.id = COALESCE(NEW.notebook_id, OLD.notebook_id);
  
  -- Calculate updated statistics
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN w.is_mastered THEN 1 END)
  INTO total_words_count, mastered_words_count
  FROM words w
  JOIN notebooks n ON w.notebook_id = n.id
  WHERE n.user_id = user_id;
  
  -- Update user profile statistics
  UPDATE profiles 
  SET 
    total_words_added = total_words_count,
    total_words_mastered = mastered_words_count,
    updated_at = NOW()
  WHERE id = user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;