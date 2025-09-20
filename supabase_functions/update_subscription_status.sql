-- Update user subscription status
CREATE OR REPLACE FUNCTION update_subscription_status(
  p_user_id uuid,
  p_status text,
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_transaction_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate subscription status
  IF p_status NOT IN ('free', 'weekly', 'annual') THEN
    RAISE EXCEPTION 'Invalid subscription status: %', p_status;
  END IF;
  
  -- Update profile
  UPDATE profiles 
  SET 
    subscription_status = p_status,
    subscription_expires_at = p_expires_at,
    subscription_transaction_id = p_transaction_id,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Log subscription change
  INSERT INTO subscription_logs (
    user_id,
    status,
    expires_at,
    transaction_id
  ) VALUES (
    p_user_id,
    p_status,
    p_expires_at,
    p_transaction_id
  );
END;
$$;