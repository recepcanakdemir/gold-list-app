-- =============================================
-- FIX WORD ADDITION LOGIC FOR TRIAL SYSTEM
-- =============================================
-- This migration ensures can_add_words_trial only checks trial permissions
-- Run this script in Supabase SQL Editor

-- =============================================
-- 1. DROP OLD FREEMIUM FUNCTIONS (ENSURE CLEAN STATE)
-- =============================================

-- Drop old freemium limit functions if they still exist
DROP FUNCTION IF EXISTS check_words_per_page_limit(UUID, INTEGER);
DROP FUNCTION IF EXISTS check_page_creation_limit(UUID);
DROP FUNCTION IF EXISTS check_notebook_creation_limit(UUID, TEXT);

-- =============================================
-- 2. RECREATE CLEAN can_add_words_trial FUNCTION
-- =============================================

-- Ensure can_add_words_trial ONLY checks trial/subscription status
-- NOT daily word limits or page-specific restrictions
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
    -- NO DAILY WORD LIMIT CHECKS - only trial status
    RETURN in_trial;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. VERIFY is_in_trial_period FUNCTION IS CORRECT
-- =============================================

-- Ensure is_in_trial_period uses proper date arithmetic
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
    
    -- Calculate elapsed days properly using date arithmetic
    days_elapsed := (p_current_date::date - trial_start::date);
    
    -- Trial is active if less than 15 days have elapsed
    RETURN days_elapsed < 15;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions on updated functions
GRANT EXECUTE ON FUNCTION can_add_words_trial(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION can_add_words_trial(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_trial_period(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_trial_period(UUID) TO authenticated;

-- =============================================
-- 5. VERIFY FUNCTION BEHAVIOR
-- =============================================

-- Add debugging function to check what functions return
CREATE OR REPLACE FUNCTION debug_trial_status(p_user_id UUID, p_current_date TIMESTAMPTZ DEFAULT NOW())
RETURNS TABLE (
    user_id UUID,
    subscription_status TEXT,
    trial_started_at TIMESTAMPTZ,
    current_date_param TIMESTAMPTZ,
    days_elapsed INTEGER,
    is_in_trial BOOLEAN,
    can_add_words BOOLEAN
) AS $$
DECLARE
    profile_data RECORD;
    days_elapsed_calc INTEGER;
    trial_check BOOLEAN;
    add_words_check BOOLEAN;
BEGIN
    -- Get profile data
    SELECT subscription_status, trial_started_at
    INTO profile_data
    FROM profiles
    WHERE id = p_user_id;
    
    -- Calculate days elapsed if trial started
    IF profile_data.trial_started_at IS NOT NULL THEN
        days_elapsed_calc := (p_current_date::date - profile_data.trial_started_at::date);
    ELSE
        days_elapsed_calc := NULL;
    END IF;
    
    -- Check trial status
    SELECT is_in_trial_period(p_user_id, p_current_date) INTO trial_check;
    
    -- Check can add words
    SELECT can_add_words_trial(p_user_id, p_current_date) INTO add_words_check;
    
    -- Return debug info
    RETURN QUERY SELECT
        p_user_id,
        profile_data.subscription_status,
        profile_data.trial_started_at,
        p_current_date,
        days_elapsed_calc,
        trial_check,
        add_words_check;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_trial_status(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_trial_status(UUID) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Success message
SELECT 'Word addition logic fixed - trial system cleaned!' as status;

-- =============================================
-- EXPLANATION
-- =============================================

-- BEFORE (PROBLEMATIC):
-- - Old freemium functions may have been interfering
-- - can_add_words_trial might have had daily word limit checks
-- - Adding words to one page blocked other pages

-- AFTER (FIXED):
-- - can_add_words_trial ONLY checks subscription and trial status
-- - NO daily word limits or page restrictions in trial function
-- - Users can add words to any page during trial period
-- - Clean separation: trial permissions vs page word limits