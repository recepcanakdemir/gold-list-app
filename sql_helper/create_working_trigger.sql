-- =============================================
-- CREATE WORKING USER TRIGGER
-- =============================================
-- This script creates a bulletproof trigger that will definitely work
-- Run this AFTER running diagnose_trigger_issues.sql
-- Run this script in Supabase SQL Editor

-- =============================================
-- 1. COMPLETELY CLEAN SLATE
-- =============================================

-- Remove ALL existing triggers and functions related to user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_social ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_unified ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- Remove all related functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_new_social_user();
DROP FUNCTION IF EXISTS handle_new_user_unified();
DROP FUNCTION IF EXISTS create_user_profile();

-- Log the cleanup
DO $$
BEGIN
    RAISE LOG 'TRIGGER SETUP: Cleaned up all existing triggers and functions';
END $$;

-- =============================================
-- 2. CREATE SIMPLE, WORKING FUNCTION
-- =============================================

-- Create a simple function that we know will work
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
DECLARE
    auth_provider TEXT;
    display_name TEXT;
    extracted_email TEXT;
    apple_user_id TEXT;
    google_user_id TEXT;
BEGIN
    -- Log that the trigger is firing
    RAISE LOG 'TRIGGER FIRED: User creation detected - ID: %, Email: %', NEW.id, NEW.email;
    
    -- Extract provider information
    auth_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    extracted_email := COALESCE(NEW.email, '');
    
    -- Log the raw metadata for debugging
    RAISE LOG 'METADATA DEBUG: Provider: %, App Meta: %, User Meta: %', 
        auth_provider, NEW.raw_app_meta_data, NEW.raw_user_meta_data;
    
    -- Extract data based on provider
    IF auth_provider = 'apple' THEN
        apple_user_id := NEW.raw_user_meta_data->>'sub';
        display_name := COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            CASE WHEN extracted_email != '' THEN split_part(extracted_email, '@', 1) ELSE 'Apple User' END
        );
        RAISE LOG 'APPLE USER: ID: %, Name: %, Email: %', apple_user_id, display_name, extracted_email;
        
    ELSIF auth_provider = 'google' THEN
        google_user_id := NEW.raw_user_meta_data->>'sub';
        display_name := COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            CASE WHEN extracted_email != '' THEN split_part(extracted_email, '@', 1) ELSE 'Google User' END
        );
        RAISE LOG 'GOOGLE USER: ID: %, Name: %, Email: %', google_user_id, display_name, extracted_email;
        
    ELSE
        display_name := CASE 
            WHEN extracted_email != '' THEN split_part(extracted_email, '@', 1) 
            ELSE 'User' 
        END;
        RAISE LOG 'EMAIL USER: Name: %, Email: %', display_name, extracted_email;
    END IF;
    
    -- Create the profile
    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        auth_provider,
        apple_user_id,
        google_user_id,
        subscription_status,
        streak_count,
        longest_streak,
        streak_miss_count,
        total_words_added,
        total_words_mastered,
        onboarding_completed,
        preferences,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        extracted_email,
        display_name,
        auth_provider,
        apple_user_id,
        google_user_id,
        'free',
        0,
        0,
        0,
        0,
        0,
        false,
        '{}',
        NOW(),
        NOW()
    );
    
    RAISE LOG 'PROFILE CREATED: Successfully created profile for user % with provider %', NEW.id, auth_provider;
    
    -- Create notification settings (with error handling)
    BEGIN
        INSERT INTO public.user_notification_settings (
            user_id,
            enable_notifications,
            daily_reminder_time,
            progress_reminder_time,
            review_reminder_time,
            streak_protection_time
        ) VALUES (
            NEW.id,
            true,
            '14:00:00'::TIME,
            '17:00:00'::TIME,
            '19:00:00'::TIME,
            '21:00:00'::TIME
        );
        RAISE LOG 'NOTIFICATION SETTINGS: Created for user %', NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'NOTIFICATION SETTINGS ERROR: % for user %', SQLERRM, NEW.id;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'TRIGGER ERROR: % for user % - Raw data: App Meta: %, User Meta: %', 
            SQLERRM, NEW.id, NEW.raw_app_meta_data, NEW.raw_user_meta_data;
        -- Return NEW anyway to not break user creation
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log function creation
DO $$
BEGIN
    RAISE LOG 'TRIGGER SETUP: Function create_user_profile created successfully';
END $$;

-- =============================================
-- 3. CREATE THE TRIGGER
-- =============================================

-- Create the trigger
CREATE TRIGGER handle_new_user_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Log trigger creation
DO $$
BEGIN
    RAISE LOG 'TRIGGER SETUP: Trigger handle_new_user_trigger created successfully';
END $$;

-- =============================================
-- 4. GRANT PERMISSIONS
-- =============================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_profile() TO anon, authenticated;

-- Log permissions
DO $$
BEGIN
    RAISE LOG 'TRIGGER SETUP: Permissions granted successfully';
END $$;

-- =============================================
-- 5. VERIFY INSTALLATION
-- =============================================

-- Check that trigger was created
SELECT 
    'VERIFICATION: Trigger created successfully' as status,
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth'
AND trigger_name = 'handle_new_user_trigger';

-- Final success log
DO $$
BEGIN
    RAISE LOG 'TRIGGER SETUP COMPLETE: Ready for testing with real user creation';
END $$;

-- =============================================
-- SETUP COMPLETE
-- =============================================

SELECT 'User creation trigger installed successfully!' as final_status;
SELECT 'Now test by creating a new user and watching postgres_logs' as next_step;