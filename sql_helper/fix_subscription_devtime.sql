-- =============================================
-- FIX SUBSCRIPTION DEVTIME INTEGRATION
-- =============================================
-- This migration fixes the activate_subscription function to support DevTime simulation
-- Run this script in Supabase SQL Editor

-- =============================================
-- UPDATE activate_subscription FUNCTION
-- =============================================

-- Fix the function to use DevTime simulation date instead of NOW()
CREATE OR REPLACE FUNCTION activate_subscription(
    p_user_id UUID,
    p_subscription_type TEXT,
    p_duration_days INTEGER,
    p_current_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles
    SET 
        subscription_status = p_subscription_type,
        subscription_activated_at = p_current_date,
        subscription_expires_at = p_current_date + (p_duration_days || ' days')::INTERVAL,
        updated_at = p_current_date
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- GRANT PERMISSIONS
-- =============================================

-- Grant execute permissions on updated function
GRANT EXECUTE ON FUNCTION activate_subscription(UUID, TEXT, INTEGER, TIMESTAMPTZ) TO authenticated;

-- Keep backward compatibility with old function signature
GRANT EXECUTE ON FUNCTION activate_subscription(UUID, TEXT, INTEGER) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Success message
SELECT 'activate_subscription function updated for DevTime support!' as status;

-- =============================================
-- EXPLANATION
-- =============================================

-- BEFORE (PROBLEMATIC):
-- activate_subscription always used NOW() regardless of DevTime simulation
-- This caused subscriptions to use real time while checks used simulated time
-- Result: Subscriptions appeared expired immediately in simulation

-- AFTER (FIXED):
-- activate_subscription accepts optional p_current_date parameter
-- This allows DevTime simulation to work correctly
-- Subscription dates align with simulation time
-- Defaults to NOW() for backward compatibility