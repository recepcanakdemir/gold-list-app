-- =============================================
-- FIX TRIAL DATE CALCULATION BUGS
-- =============================================
-- This migration fixes critical bugs in trial date calculations
-- Run this script in Supabase SQL Editor

-- =============================================
-- 1. FIX get_trial_days_remaining FUNCTION
-- =============================================

-- The original function had a critical bug using EXTRACT(DAY FROM ...)
-- which extracts the day component, not elapsed days
CREATE OR REPLACE FUNCTION get_trial_days_remaining(p_user_id UUID, p_current_date TIMESTAMPTZ DEFAULT NOW())
RETURNS INTEGER AS $$
DECLARE
    trial_start TIMESTAMPTZ;
    days_elapsed INTEGER;
    days_remaining INTEGER;
BEGIN
    SELECT trial_started_at INTO trial_start
    FROM profiles
    WHERE id = p_user_id;
    
    -- If no trial started, return 0
    IF trial_start IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate actual elapsed days using proper date arithmetic
    days_elapsed := (p_current_date::date - trial_start::date);
    
    -- Calculate days remaining (max 15)
    days_remaining := GREATEST(0, 15 - days_elapsed);
    
    RETURN days_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. FIX is_in_trial_period FUNCTION
-- =============================================

-- Update to use proper date arithmetic and support DevTime
CREATE OR REPLACE FUNCTION is_in_trial_period(p_user_id UUID, p_current_date TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
DECLARE
    trial_start TIMESTAMPTZ;
    sub_status TEXT;
    days_elapsed INTEGER;
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
    
    -- Calculate elapsed days properly
    days_elapsed := (p_current_date::date - trial_start::date);
    
    -- Trial is active if less than 15 days have elapsed
    RETURN days_elapsed < 15;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. UPDATE can_add_words_trial FUNCTION
-- =============================================

-- Update to use the fixed is_in_trial_period function with DevTime support
CREATE OR REPLACE FUNCTION can_add_words_trial(p_user_id UUID, p_current_date TIMESTAMPTZ DEFAULT NOW())
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
    
    -- Check if user is in trial period using corrected function
    SELECT is_in_trial_period(p_user_id, p_current_date) INTO in_trial;
    
    -- Users can add words during trial, but not after trial expires
    RETURN in_trial;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. UPDATE can_create_notebook_trial FUNCTION
-- =============================================

-- Update to support DevTime parameter for consistency
CREATE OR REPLACE FUNCTION can_create_notebook_trial(p_user_id UUID, p_current_date TIMESTAMPTZ DEFAULT NOW())
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

-- =============================================
-- 5. GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION get_trial_days_remaining(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_trial_period(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_words_trial(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_notebook_trial(UUID, TIMESTAMPTZ) TO authenticated;

-- Keep backward compatibility with old function signatures
GRANT EXECUTE ON FUNCTION get_trial_days_remaining(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_trial_period(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_words_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_create_notebook_trial(UUID) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('fix_trial_date_calculations', NOW())
ON CONFLICT (migration_name) DO NOTHING;

-- Success message
SELECT 'Trial date calculation bugs fixed successfully!' as status;

-- =============================================
-- EXPLANATION OF FIXES
-- =============================================

-- BEFORE (BROKEN):
-- EXTRACT(DAY FROM NOW() - trial_start) extracts the day component of the result
-- If trial_start = '2025-01-28' and NOW() = '2025-02-10'
-- The interval is '13 days' but EXTRACT(DAY) returns 10 (the day of Feb 10)

-- AFTER (FIXED):
-- (NOW()::date - trial_start::date) calculates actual elapsed days
-- If trial_start = '2025-01-28' and NOW() = '2025-02-10'  
-- The result is correctly 13 days elapsed

-- DEVTIME SUPPORT:
-- All functions now accept optional p_current_date parameter
-- This allows the client to pass simulated DevTime date for testing
-- Defaults to NOW() for backward compatibility