-- Update trial duration from 15 days to 14 days for Apple App Store compliance
-- Apple only allows specific trial durations, 14 days is the standard before subscription periods

-- Update is_in_trial_period function (with current_date parameter)
CREATE OR REPLACE FUNCTION is_in_trial_period(p_user_id uuid, p_current_date timestamp with time zone DEFAULT now())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    
    -- Trial is active if less than 14 days have elapsed (changed from 15)
    RETURN days_elapsed < 14;
END;
$function$;

-- Update is_in_trial_period function (without current_date parameter)
CREATE OR REPLACE FUNCTION is_in_trial_period(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    
    -- Check if trial period (14 days) has not expired (changed from 15)
    RETURN trial_start + INTERVAL '14 days' > NOW();
END;
$function$;

-- Update get_trial_days_remaining function (with current_date parameter)
CREATE OR REPLACE FUNCTION get_trial_days_remaining(p_user_id uuid, p_current_date timestamp with time zone DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    
    -- Calculate days remaining (max 14, changed from 15)
    days_remaining := GREATEST(0, 14 - days_elapsed);
    
    RETURN days_remaining;
END;
$function$;

-- Update get_trial_days_remaining function (without current_date parameter)
CREATE OR REPLACE FUNCTION get_trial_days_remaining(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
    
    -- Calculate days remaining (max 14, changed from 15)
    days_remaining := GREATEST(0, 14 - EXTRACT(DAY FROM NOW() - trial_start)::INTEGER);
    
    RETURN days_remaining;
END;
$function$;

-- The can_add_words_trial and can_create_notebook_trial functions don't need updates
-- as they rely on is_in_trial_period() which we've already updated

-- Verification query to test the new functions
-- SELECT 
--   p.id,
--   p.email,
--   p.trial_started_at,
--   p.subscription_status,
--   is_in_trial_period(p.id) as is_in_trial,
--   get_trial_days_remaining(p.id) as days_remaining
-- FROM profiles p 
-- WHERE p.trial_started_at IS NOT NULL 
-- LIMIT 5;

COMMENT ON FUNCTION is_in_trial_period(uuid, timestamptz) IS 'Updated to use 14-day trial period for Apple App Store compliance';
COMMENT ON FUNCTION is_in_trial_period(uuid) IS 'Updated to use 14-day trial period for Apple App Store compliance';
COMMENT ON FUNCTION get_trial_days_remaining(uuid, timestamptz) IS 'Updated to use 14-day trial period for Apple App Store compliance';
COMMENT ON FUNCTION get_trial_days_remaining(uuid) IS 'Updated to use 14-day trial period for Apple App Store compliance';