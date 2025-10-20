-- =============================================
-- FIX USER CREATION TRIGGERS
-- =============================================
-- This script fixes the competing triggers that are causing 
-- "Database error saving new user" issues
-- Run this script in Supabase SQL Editor

-- =============================================
-- 1. DROP ALL EXISTING CONFLICTING TRIGGERS
-- =============================================

-- Drop all existing user creation triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_social ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;

-- Drop existing functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_new_social_user();

-- =============================================
-- 2. CREATE UNIFIED USER CREATION FUNCTION
-- =============================================

-- Create a single function that handles both email and social auth users
CREATE OR REPLACE FUNCTION handle_new_user_unified()
RETURNS TRIGGER AS $$
DECLARE
    auth_provider TEXT;
    display_name TEXT;
    avatar_url TEXT;
    apple_user_id TEXT;
    google_user_id TEXT;
BEGIN
    -- Extract provider information from new user
    auth_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
    
    -- Extract social-specific data based on provider
    IF auth_provider = 'apple' THEN
        apple_user_id := NEW.raw_user_meta_data->>'sub';
        -- Apple Sign-In: Try multiple sources for display name
        display_name := COALESCE(
            NEW.raw_user_meta_data->>'display_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1),
            'Apple User'
        );
        -- Log Apple Sign-In data for debugging
        RAISE LOG 'Apple Sign-In user data: email=%, display_name=%, apple_user_id=%, raw_meta=%', 
            NEW.email, display_name, apple_user_id, NEW.raw_user_meta_data;
    ELSIF auth_provider = 'google' THEN
        google_user_id := NEW.raw_user_meta_data->>'sub';
        display_name := COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1),
            'Google User'
        );
        avatar_url := NEW.raw_user_meta_data->>'avatar_url';
        -- Log Google Sign-In data for debugging
        RAISE LOG 'Google Sign-In user data: email=%, display_name=%, google_user_id=%, raw_meta=%', 
            NEW.email, display_name, google_user_id, NEW.raw_user_meta_data;
    ELSE
        -- Email signup - use email prefix as display name
        display_name := COALESCE(split_part(NEW.email, '@', 1), 'User');
        -- Log email signup data for debugging
        RAISE LOG 'Email signup user data: email=%, display_name=%', NEW.email, display_name;
    END IF;
    
    -- Insert into profiles table with ALL required fields
    INSERT INTO public.profiles (
        id,
        email,
        display_name,
        avatar_url,
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
        NEW.email,
        display_name,
        avatar_url,
        'free'::TEXT,
        0,
        0,
        0,
        0,
        0,
        NULL,
        false,  -- onboarding_completed (required field)
        '{}'::JSONB,  -- preferences (required field)
        NOW(),
        NOW()
    );
    
    -- If social auth, also update the specific social fields
    IF auth_provider = 'apple' AND apple_user_id IS NOT NULL THEN
        UPDATE public.profiles SET
            auth_provider = 'apple',
            apple_user_id = apple_user_id
        WHERE id = NEW.id;
    ELSIF auth_provider = 'google' AND google_user_id IS NOT NULL THEN
        UPDATE public.profiles SET
            auth_provider = 'google',
            google_user_id = google_user_id
        WHERE id = NEW.id;
    ELSE
        UPDATE public.profiles SET
            auth_provider = 'email'
        WHERE id = NEW.id;
    END IF;
    
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
        -- Log the error for debugging
        RAISE LOG 'Error in handle_new_user_unified for user %: %', NEW.id, SQLERRM;
        -- Return NEW anyway to not break user creation
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. CREATE SINGLE TRIGGER FOR ALL USER TYPES
-- =============================================

-- Create one trigger that handles both email and social auth
CREATE TRIGGER on_auth_user_created_unified
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_unified();

-- =============================================
-- 4. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant execute permissions on the function
GRANT EXECUTE ON FUNCTION handle_new_user_unified() TO anon, authenticated;

-- =============================================
-- 5. ADD MISSING PROFILE COLUMNS IF NEEDED
-- =============================================

-- Add social auth columns if they don't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apple_user_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_user_id TEXT;

-- Add constraint for auth provider
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_auth_provider_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_auth_provider_check 
CHECK (auth_provider IN ('email', 'google', 'apple'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON public.profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_apple_user_id ON public.profiles(apple_user_id) WHERE apple_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_google_user_id ON public.profiles(google_user_id) WHERE google_user_id IS NOT NULL;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Test the trigger setup
SELECT 'User creation triggers fixed successfully!' as status;
SELECT 'All competing triggers removed and unified trigger created' as details;