-- Check if user has reached subscription limits
CREATE OR REPLACE FUNCTION check_subscription_limits(p_user_id uuid)
RETURNS TABLE(
  can_create_notebook boolean,
  notebook_count integer,
  notebook_limit integer,
  subscription_status text,
  is_premium boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_subscription text;
  current_notebook_count integer;
  max_notebooks integer;
BEGIN
  -- Get user subscription status
  SELECT profiles.subscription_status 
  INTO user_subscription
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Count user's notebooks
  SELECT COUNT(*)::integer 
  INTO current_notebook_count
  FROM notebooks 
  WHERE user_id = p_user_id;
  
  -- Determine limits based on subscription
  IF user_subscription IN ('weekly', 'annual') THEN
    max_notebooks := 999; -- Unlimited for premium users
  ELSE
    max_notebooks := 3; -- Free user limit
  END IF;
  
  RETURN QUERY
  SELECT 
    (current_notebook_count < max_notebooks) as can_create_notebook,
    current_notebook_count as notebook_count,
    max_notebooks as notebook_limit,
    user_subscription as subscription_status,
    (user_subscription IN ('weekly', 'annual')) as is_premium;
END;
$$;