-- =============================================
-- TRIAL SYSTEM MIGRATION
-- =============================================
-- This migration converts the freemium system to a 15-day trial system
-- Run this script in Supabase SQL Editor

-- =============================================
-- 1. ADD TRIAL FIELDS TO PROFILES TABLE
-- =============================================

-- Add trial tracking field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_trial_started ON profiles(trial_started_at);

-- =============================================
-- 2. UPDATE SUBSCRIPTION STATUS VALUES
-- =============================================

-- Update constraint to include 'trial' status
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('free', 'trial', 'weekly', 'monthly', 'yearly'));

-- =============================================
-- 3. SIMPLIFIED TRIAL CHECKING FUNCTIONS
-- =============================================

-- Function to start free trial
CREATE OR REPLACE FUNCTION start_free_trial(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Start trial by setting trial_started_at and updating status
    UPDATE profiles
    SET 
        trial_started_at = NOW(),
        subscription_status = 'trial',
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is in trial period
CREATE OR REPLACE FUNCTION is_in_trial_period(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    trial_start TIMESTAMPTZ;
    sub_status TEXT;
BEGIN
    SELECT trial_started_at, subscription_status
    INTO trial_start, sub_status
    FROM profiles
    WHERE id = p_user_id;
    
    -- If user has premium subscription, they're not in trial
    IF sub_status IN ('weekly', 'monthly', 'yearly') THEN
        RETURN FALSE;
    END IF;
    
    -- If no trial started, user is not in trial
    IF trial_start IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if trial period (15 days) has not expired
    RETURN trial_start + INTERVAL '15 days' > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trial days remaining
CREATE OR REPLACE FUNCTION get_trial_days_remaining(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    trial_start TIMESTAMPTZ;
    days_remaining INTEGER;
BEGIN
    SELECT trial_started_at INTO trial_start
    FROM profiles
    WHERE id = p_user_id;
    
    -- If no trial started, return 0
    IF trial_start IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate days remaining (max 15)
    days_remaining := GREATEST(0, 15 - EXTRACT(DAY FROM NOW() - trial_start)::INTEGER);
    
    RETURN days_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create notebook (single notebook limit)
CREATE OR REPLACE FUNCTION can_create_notebook_trial(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    existing_count INTEGER;
    has_premium BOOLEAN;
BEGIN
    -- Check if user has premium subscription
    SELECT subscription_status IN ('weekly', 'monthly', 'yearly') INTO has_premium
    FROM profiles
    WHERE id = p_user_id;
    
    -- Premium users have no limits
    IF has_premium THEN
        RETURN TRUE;
    END IF;
    
    -- Count existing active notebooks
    SELECT COUNT(*) INTO existing_count
    FROM notebooks
    WHERE user_id = p_user_id AND is_active = TRUE;
    
    -- Single notebook limit for trial/free users
    RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can add words (trial + review-only logic)
CREATE OR REPLACE FUNCTION can_add_words_trial(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_status TEXT;
    in_trial BOOLEAN;
BEGIN
    -- Get subscription status
    SELECT subscription_status INTO sub_status
    FROM profiles
    WHERE id = p_user_id;
    
    -- Premium users can always add words
    IF sub_status IN ('weekly', 'monthly', 'yearly') THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is in trial period
    SELECT is_in_trial_period(p_user_id) INTO in_trial;
    
    -- Users can add words during trial, but not after trial expires
    RETURN in_trial;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. REMOVE OLD FREEMIUM FUNCTIONS
-- =============================================

-- Drop old freemium limit functions
DROP FUNCTION IF EXISTS check_notebook_creation_limit(UUID, TEXT);
DROP FUNCTION IF EXISTS check_page_creation_limit(UUID);
DROP FUNCTION IF EXISTS check_words_per_page_limit(UUID, INTEGER);

-- =============================================
-- 5. GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION start_free_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_trial_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_days_remaining(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_notebook_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_words_trial(UUID) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('trial_system_migration', NOW())
ON CONFLICT (migration_name) DO NOTHING;

-- Success message
SELECT 'Trial system migration completed successfully!' as status;