-- =============================================
-- FIX APPLE SIGN-IN DATA EXTRACTION
-- =============================================
-- This script fixes the Apple Sign-In data extraction issues
-- specifically targeting auth provider detection and email/name extraction
-- Run this script in Supabase SQL Editor

-- =============================================
-- 1. SAFELY DROP DEPENDENT OBJECTS IN CORRECT ORDER
-- =============================================

-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS on_auth_user_created_unified ON auth.users;

-- Now we can safely drop the function
DROP FUNCTION IF EXISTS handle_new_user_unified();

-- Create improved function with better metadata extraction
CREATE OR REPLACE FUNCTION handle_new_user_unified()
RETURNS TRIGGER AS $$
DECLARE
    auth_provider TEXT;
    display_name TEXT;
    avatar_url TEXT;
    apple_user_id TEXT;
    google_user_id TEXT;
    extracted_email TEXT;
BEGIN
    -- Extract provider information with detailed logging
    auth_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    extracted_email := NEW.email;
    
    -- Log all available metadata for debugging
    RAISE LOG 'User creation triggered - ID: %, Email: %, Provider: %', NEW.id, NEW.email, auth_provider;
    RAISE LOG 'App metadata: %', NEW.raw_app_meta_data;
    RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
    
    -- Extract social-specific data based on provider
    IF auth_provider = 'apple' THEN
        -- Apple Sign-In specific extraction
        apple_user_id := COALESCE(
            NEW.raw_user_meta_data->>'sub',
            NEW.raw_user_meta_data->>'apple_user_id',
            NEW.raw_app_meta_data->>'provider_id'
        );
        
        -- Try multiple sources for Apple display name
        display_name := COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'given_name',
            CASE 
                WHEN NEW.email IS NOT NULL AND NEW.email != '' THEN split_part(NEW.email, '@', 1)
                ELSE 'Apple User'
            END
        );
        
        -- For Apple, email might be provided or hidden
        IF NEW.email IS NULL OR NEW.email = '' THEN
            extracted_email := COALESCE(
                NEW.raw_user_meta_data->>'email',
                NEW.raw_app_meta_data->>'email',
                '' -- Apple user chose to hide email
            );
        END IF;
        
        RAISE LOG 'Apple Sign-In extracted - User ID: %, Display Name: %, Email: %', 
            apple_user_id, display_name, extracted_email;
            
    ELSIF auth_provider = 'google' THEN
        -- Google Sign-In specific extraction
        google_user_id := COALESCE(
            NEW.raw_user_meta_data->>'sub',
            NEW.raw_user_meta_data->>'google_user_id',
            NEW.raw_app_meta_data->>'provider_id'
        );
        
        display_name := COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'given_name',
            CASE 
                WHEN NEW.email IS NOT NULL AND NEW.email != '' THEN split_part(NEW.email, '@', 1)
                ELSE 'Google User'
            END
        );
        
        avatar_url := NEW.raw_user_meta_data->>'avatar_url';
        
        RAISE LOG 'Google Sign-In extracted - User ID: %, Display Name: %, Email: %, Avatar: %', 
            google_user_id, display_name, extracted_email, avatar_url;
            
    ELSE
        -- Email signup
        display_name := COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            CASE 
                WHEN NEW.email IS NOT NULL AND NEW.email != '' THEN split_part(NEW.email, '@', 1)
                ELSE 'User'
            END
        );
        
        RAISE LOG 'Email signup - Display Name: %, Email: %', display_name, extracted_email;
    END IF;
    
    -- Insert into profiles table with ALL required fields
    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        avatar_url,
        auth_provider,
        apple_user_id,
        google_user_id,
        subscription_status,
        streak_count,
        longest_streak,
        streak_miss_count,
        total_words_added,
        total_words_mastered,
        last_activity_date,
        onboarding_completed,
        preferences,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        extracted_email,
        display_name,
        avatar_url,
        auth_provider,
        apple_user_id,
        google_user_id,
        'free'::TEXT,
        0,
        0,
        0,
        0,
        0,
        CASE 
            WHEN auth_provider != 'email' THEN CURRENT_DATE::TEXT
            ELSE NULL
        END,
        false,  -- onboarding_completed (required field)
        '{}'::JSONB,  -- preferences (required field)
        NOW(),
        NOW()
    );
    
    RAISE LOG 'Profile created successfully for user % with provider %', NEW.id, auth_provider;
    
    -- Create default notification settings
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
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error with full details
        RAISE LOG 'Error in handle_new_user_unified for user % with provider %: %', 
            NEW.id, auth_provider, SQLERRM;
        RAISE LOG 'Error context - Email: %, App metadata: %, User metadata: %',
            NEW.email, NEW.raw_app_meta_data, NEW.raw_user_meta_data;
        -- Return NEW anyway to not break user creation
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 2. RECREATE THE TRIGGER WITH IMPROVED FUNCTION
-- =============================================

-- Recreate the trigger that uses the improved function
CREATE TRIGGER on_auth_user_created_unified
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_unified();

-- =============================================
-- 3. GRANT PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION handle_new_user_unified() TO anon, authenticated;

-- =============================================
-- 4. VERIFY CURRENT TRIGGER STATE
-- =============================================

-- Show current triggers
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND trigger_schema = 'auth';

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

SELECT 'Apple Sign-In data extraction improved!' as status;
SELECT 'Enhanced logging and metadata extraction added' as details;