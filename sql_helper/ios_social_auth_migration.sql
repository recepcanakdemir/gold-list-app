-- =============================================
-- iOS SOCIAL AUTHENTICATION MIGRATION
-- =============================================
-- This migration adds necessary fields for iOS social authentication
-- Run this script in Supabase SQL Editor

-- =============================================
-- 1. ADD SOCIAL AUTHENTICATION FIELDS TO PROFILES
-- =============================================

-- Add fields for tracking authentication provider and social data
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS apple_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add RevenueCat integration fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenuecat_user_id TEXT;

-- Add constraints for auth provider
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_auth_provider_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_auth_provider_check 
CHECK (auth_provider IN ('email', 'google', 'apple'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_provider ON profiles(auth_provider);
CREATE INDEX IF NOT EXISTS idx_profiles_apple_user_id ON profiles(apple_user_id) WHERE apple_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_google_user_id ON profiles(google_user_id) WHERE google_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_revenuecat_user_id ON profiles(revenuecat_user_id) WHERE revenuecat_user_id IS NOT NULL;

-- =============================================
-- 2. UPDATE PROFILE CREATION FUNCTION
-- =============================================

-- Function to create or update profile for social auth users
CREATE OR REPLACE FUNCTION create_or_update_social_profile(
    p_user_id UUID,
    p_email TEXT,
    p_auth_provider TEXT,
    p_apple_user_id TEXT DEFAULT NULL,
    p_google_user_id TEXT DEFAULT NULL,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    profile_id UUID;
BEGIN
    -- Try to find existing profile by user_id first
    SELECT id INTO profile_id FROM profiles WHERE id = p_user_id;
    
    IF profile_id IS NOT NULL THEN
        -- Update existing profile with social data
        UPDATE profiles SET
            auth_provider = p_auth_provider,
            apple_user_id = COALESCE(p_apple_user_id, apple_user_id),
            google_user_id = COALESCE(p_google_user_id, google_user_id),
            display_name = COALESCE(p_display_name, display_name),
            avatar_url = COALESCE(p_avatar_url, avatar_url),
            updated_at = NOW()
        WHERE id = p_user_id;
        
        RETURN profile_id;
    END IF;
    
    -- Create new profile for social auth user
    INSERT INTO profiles (
        id,
        email,
        auth_provider,
        apple_user_id,
        google_user_id,
        display_name,
        avatar_url,
        subscription_status,
        streak_count,
        longest_streak,
        streak_miss_count,
        total_words_added,
        total_words_mastered,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_email,
        p_auth_provider,
        p_apple_user_id,
        p_google_user_id,
        p_display_name,
        p_avatar_url,
        'free',
        0,
        0,
        0,
        0,
        0,
        NOW(),
        NOW()
    )
    RETURNING id INTO profile_id;
    
    RETURN profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. LINK SOCIAL ACCOUNTS FUNCTION
-- =============================================

-- Function to link social accounts to existing profiles
CREATE OR REPLACE FUNCTION link_social_account(
    p_user_id UUID,
    p_auth_provider TEXT,
    p_social_user_id TEXT,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update profile with social account data
    IF p_auth_provider = 'apple' THEN
        UPDATE profiles SET
            apple_user_id = p_social_user_id,
            display_name = COALESCE(p_display_name, display_name),
            avatar_url = COALESCE(p_avatar_url, avatar_url),
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSIF p_auth_provider = 'google' THEN
        UPDATE profiles SET
            google_user_id = p_social_user_id,
            display_name = COALESCE(p_display_name, display_name),
            avatar_url = COALESCE(p_avatar_url, avatar_url),
            updated_at = NOW()
        WHERE id = p_user_id;
    ELSE
        RETURN FALSE;
    END IF;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 4. REVENUECAT INTEGRATION FUNCTIONS
-- =============================================

-- Function to update RevenueCat user ID
CREATE OR REPLACE FUNCTION update_revenuecat_user_id(
    p_user_id UUID,
    p_revenuecat_user_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles SET
        revenuecat_user_id = p_revenuecat_user_id,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user by RevenueCat ID (for webhook handling)
CREATE OR REPLACE FUNCTION get_user_by_revenuecat_id(p_revenuecat_user_id TEXT)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    subscription_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.subscription_status
    FROM profiles p
    WHERE p.revenuecat_user_id = p_revenuecat_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION create_or_update_social_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION link_social_account(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_revenuecat_user_id(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_by_revenuecat_id(TEXT) TO authenticated;

-- =============================================
-- 6. UPDATE ROW LEVEL SECURITY POLICIES
-- =============================================

-- Update existing policies to work with social auth fields
-- (Existing RLS policies should continue to work as they're based on user_id)

-- =============================================
-- 7. ADD SUPABASE AUTH TRIGGERS
-- =============================================

-- Trigger to automatically create profile when user signs up via social auth
CREATE OR REPLACE FUNCTION handle_new_social_user()
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
    
    -- Extract social-specific data
    IF auth_provider = 'apple' THEN
        apple_user_id := NEW.raw_user_meta_data->>'sub';
        display_name := NEW.raw_user_meta_data->>'display_name';
    ELSIF auth_provider = 'google' THEN
        google_user_id := NEW.raw_user_meta_data->>'sub';
        display_name := NEW.raw_user_meta_data->>'name';
        avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    END IF;
    
    -- Create profile for new social user
    PERFORM create_or_update_social_profile(
        NEW.id,
        NEW.email,
        auth_provider,
        apple_user_id,
        google_user_id,
        display_name,
        avatar_url
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_social ON auth.users;

-- Create trigger for new social users
CREATE TRIGGER on_auth_user_created_social
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_social_user();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Final success message
SELECT 'iOS social authentication migration completed successfully!' as status;