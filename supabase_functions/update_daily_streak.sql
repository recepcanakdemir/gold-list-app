-- Update user's daily streak
CREATE OR REPLACE FUNCTION update_daily_streak()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_streak integer;
  last_activity_date date;
  today_activity boolean;
BEGIN
  -- Get current profile data
  SELECT 
    streak_count, 
    last_activity_date
  INTO current_streak, last_activity_date
  FROM profiles 
  WHERE id = auth.uid();
  
  -- Check if user has activity today
  SELECT EXISTS (
    SELECT 1 FROM words w
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE n.user_id = auth.uid()
    AND (
      DATE(w.created_at) = CURRENT_DATE OR 
      DATE(w.last_reviewed) = CURRENT_DATE
    )
  ) INTO today_activity;
  
  IF today_activity THEN
    -- User has activity today
    IF last_activity_date = CURRENT_DATE THEN
      -- Already updated today, return current streak
      RETURN current_streak;
    ELSIF last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN
      -- Consecutive day, increment streak
      current_streak := current_streak + 1;
    ELSE
      -- Streak broken, reset to 1
      current_streak := 1;
    END IF;
    
    -- Update profile
    UPDATE profiles 
    SET 
      streak_count = current_streak,
      longest_streak = GREATEST(longest_streak, current_streak),
      last_activity_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = auth.uid();
    
  ELSE
    -- No activity today
    IF last_activity_date < CURRENT_DATE - INTERVAL '1 day' THEN
      -- Streak is broken
      current_streak := 0;
      UPDATE profiles 
      SET 
        streak_count = 0,
        updated_at = NOW()
      WHERE id = auth.uid();
    END IF;
  END IF;
  
  RETURN current_streak;
END;
$$;