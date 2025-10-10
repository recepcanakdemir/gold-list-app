-- Add streak_miss_count field to profiles table for tracking consecutive missed days
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS streak_miss_count INTEGER DEFAULT 0;

-- Update existing users to have 0 missed days initially
UPDATE profiles 
SET streak_miss_count = 0 
WHERE streak_miss_count IS NULL;

-- Add constraint to ensure streak_miss_count is never negative
ALTER TABLE profiles 
ADD CONSTRAINT check_streak_miss_count_non_negative 
CHECK (streak_miss_count >= 0);