-- =============================================
-- TEST IF TRIGGER IS FIRING
-- =============================================
-- This script tests if the existing trigger fires at all
-- Run this in Supabase SQL Editor and watch postgres_logs

-- =============================================
-- 1. FIRST - TEST BASIC LOGGING
-- =============================================

-- Test if we can log to postgres_logs at all
DO $$
BEGIN
    RAISE LOG 'TRIGGER TEST: Basic logging test - timestamp: %', NOW();
    RAISE LOG 'TRIGGER TEST: If you see this, logging is working';
END $$;

-- =============================================
-- 2. ADD SIMPLE LOGGING TO EXISTING FUNCTION
-- =============================================

-- Temporarily modify the existing function to add very basic logging at the start
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
    -- FIRST THING: Log that trigger is firing
    RAISE LOG 'TRIGGER FIRING: handle_new_user_unified called for user %', NEW.id;
    RAISE LOG 'TRIGGER FIRING: Basic user data - ID: %, Email: %', NEW.id, NEW.email;
    
    -- Extract provider information with detailed logging
    auth_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    extracted_email := NEW.email;
    
    RAISE LOG 'TRIGGER FIRING: Provider detected as: %', auth_provider;
    
    -- Log all available metadata for debugging
    RAISE LOG 'User creation triggered - ID: %, Email: %, Provider: %', NEW.id, NEW.email, auth_provider;
    RAISE LOG 'App metadata: %', NEW.raw_app_meta_data;
    RAISE LOG 'User metadata: %', NEW.raw_user_meta_data;
    
    -- Extract social-specific data based on provider
    IF auth_provider = 'apple' THEN
        RAISE LOG 'APPLE PATH: Processing Apple Sign-In user';
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
        RAISE LOG 'GOOGLE PATH: Processing Google Sign-In user';
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
        RAISE LOG 'EMAIL PATH: Processing email signup user';
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
    
    RAISE LOG 'BEFORE INSERT: About to insert profile with provider: %, email: %, display_name: %', 
        auth_provider, extracted_email, display_name;
    
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
    
    RAISE LOG 'AFTER INSERT: Profile created successfully for user % with provider %', NEW.id, auth_provider;
    
    -- Create default notification settings
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
        RAISE LOG 'NOTIFICATION SETTINGS: Created successfully for user %', NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE LOG 'NOTIFICATION SETTINGS ERROR: % for user %', SQLERRM, NEW.id;
    END;
    
    RAISE LOG 'TRIGGER COMPLETE: All operations finished for user %', NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error with full details
        RAISE LOG 'TRIGGER ERROR: % for user % - Raw data: App Meta: %, User Meta: %', 
            SQLERRM, NEW.id, NEW.raw_app_meta_data, NEW.raw_user_meta_data;
        RAISE LOG 'TRIGGER ERROR: Exception occurred, but returning NEW to not break user creation';
        -- Return NEW anyway to not break user creation
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. TEST COMPLETION MESSAGE
-- =============================================

-- Final test message
DO $$
BEGIN
    RAISE LOG 'TRIGGER TEST SETUP: Enhanced logging added to trigger function';
    RAISE LOG 'TRIGGER TEST SETUP: Now test by creating a user and watch postgres_logs';
END $$;

-- Success message
SELECT 'Trigger test setup complete - check postgres_logs for test messages' as status;
SELECT 'Now create a new user (Apple Sign-In) and watch postgres_logs in real-time' as instruction;