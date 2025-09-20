-- Create notebook function
CREATE OR REPLACE FUNCTION create_notebook(
  p_title text,
  p_language text,
  p_language_code text,
  p_words_per_day integer DEFAULT 20
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_notebook_id uuid;
  user_subscription_status text;
  notebook_count integer;
BEGIN
  -- Check user's subscription status
  SELECT subscription_status INTO user_subscription_status
  FROM profiles WHERE id = auth.uid();
  
  -- Count existing notebooks
  SELECT COUNT(*) INTO notebook_count
  FROM notebooks WHERE user_id = auth.uid();
  
  -- Check limits for free users
  IF user_subscription_status = 'free' AND notebook_count >= 3 THEN
    RAISE EXCEPTION 'Free users can only create up to 3 notebooks. Upgrade to Premium for unlimited notebooks.';
  END IF;
  
  -- Create the notebook
  INSERT INTO notebooks (
    user_id,
    title,
    language,
    language_code,
    words_per_day,
    notebook_level
  ) VALUES (
    auth.uid(),
    p_title,
    p_language,
    p_language_code,
    p_words_per_day,
    'bronze'
  ) RETURNING id INTO new_notebook_id;
  
  RETURN new_notebook_id;
END;
$$;