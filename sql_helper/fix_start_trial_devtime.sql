-- =============================================
-- FIX START TRIAL FUNCTION FOR DEVTIME SUPPORT
-- =============================================
-- This migration updates start_free_trial to support DevTime simulation
-- Run this script in Supabase SQL Editor

-- =============================================
-- UPDATE start_free_trial FUNCTION
-- =============================================

-- Add DevTime support to the start_free_trial function
CREATE OR REPLACE FUNCTION start_free_trial(p_user_id UUID, p_current_date TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN AS $$
BEGIN
    -- Start trial by setting trial_started_at and updating status
    -- Use p_current_date parameter to support DevTime simulation
    UPDATE profiles
    SET 
        trial_started_at = p_current_date,
        subscription_status = 'trial',
        updated_at = p_current_date
    WHERE id = p_user_id;
    
    -- Return success
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions on updated function
GRANT EXECUTE ON FUNCTION start_free_trial(UUID, TIMESTAMPTZ) TO authenticated;

-- Keep backward compatibility with old function signature
GRANT EXECUTE ON FUNCTION start_free_trial(UUID) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Log the migration
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('fix_start_trial_devtime', NOW())
ON CONFLICT (migration_name) DO NOTHING;

-- Success message
SELECT 'start_free_trial function updated for DevTime support!' as status;

-- =============================================
-- EXPLANATION
-- =============================================

-- BEFORE (PROBLEMATIC):
-- start_free_trial always used NOW() regardless of DevTime simulation
-- This caused trials to start with real time while checks used simulated time

-- AFTER (FIXED):
-- start_free_trial accepts optional p_current_date parameter
-- This allows DevTime simulation to work correctly
-- Defaults to NOW() for backward compatibility