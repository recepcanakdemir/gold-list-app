-- =============================================
-- FREEMIUM SYSTEM MIGRATION
-- =============================================
-- This migration adds all necessary fields and functions for the freemium system
-- Run this script in Supabase SQL Editor

-- =============================================
-- 1. ADD ARCHIVE FIELDS TO WORDS TABLE
-- =============================================

-- Add archive functionality to words table
ALTER TABLE words ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE words ADD COLUMN IF NOT EXISTS archived_notebook_id UUID;
ALTER TABLE words ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE words ADD COLUMN IF NOT EXISTS archive_cycle_number INTEGER DEFAULT 1;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_words_archived ON words(is_archived, archived_notebook_id);
CREATE INDEX IF NOT EXISTS idx_words_active ON words(is_archived, notebook_id) WHERE is_archived = FALSE;

-- =============================================
-- 2. ENSURE SUBSCRIPTION FIELDS IN PROFILES
-- =============================================

-- Add subscription fields if they don't exist (they might already exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_status') THEN
        ALTER TABLE profiles ADD COLUMN subscription_status TEXT DEFAULT 'free';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_expires_at') THEN
        ALTER TABLE profiles ADD COLUMN subscription_expires_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_activated_at') THEN
        ALTER TABLE profiles ADD COLUMN subscription_activated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Update subscription status enum to include new tiers
-- First, drop any existing constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

-- Handle enum type if it exists
DO $$ 
BEGIN
    -- Check if enum type exists and update it
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
        -- Try to add new values to existing enum (PostgreSQL 9.1+)
        BEGIN
            ALTER TYPE subscription_status ADD VALUE 'monthly';
        EXCEPTION 
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE subscription_status ADD VALUE 'yearly';
        EXCEPTION 
            WHEN duplicate_object THEN NULL;
        END;
    ELSE
        -- Create enum type if it doesn't exist
        CREATE TYPE subscription_status AS ENUM ('free', 'weekly', 'monthly', 'yearly');
    END IF;
EXCEPTION 
    WHEN others THEN 
        -- If anything fails, just continue (constraint will handle validation)
        RAISE NOTICE 'Could not modify enum, using constraint validation instead';
END $$;

-- Add constraint as fallback for non-enum columns
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('free', 'weekly', 'monthly', 'yearly'));

-- =============================================
-- 3. CREATE ARCHIVE TRACKING TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS notebook_archives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE,
    cycle_number INTEGER NOT NULL DEFAULT 1,
    words_count INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy for notebook_archives
ALTER TABLE notebook_archives ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notebook archives" ON notebook_archives;
DROP POLICY IF EXISTS "Users can insert their own notebook archives" ON notebook_archives;

-- Create new policies
CREATE POLICY "Users can view their own notebook archives"
ON notebook_archives FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notebook archives"
ON notebook_archives FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 4. FREEMIUM LIMIT CHECKING FUNCTIONS
-- =============================================

-- Function to check if user can create a new notebook
CREATE OR REPLACE FUNCTION check_notebook_creation_limit(p_user_id UUID, p_notebook_level TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_subscription TEXT;
    existing_count INTEGER;
BEGIN
    -- Get user's subscription status
    SELECT subscription_status INTO user_subscription
    FROM profiles
    WHERE id = p_user_id;
    
    -- Premium users have no limits
    IF user_subscription != 'free' THEN
        RETURN TRUE;
    END IF;
    
    -- Free users can have 1 notebook per level
    -- Cast enum to text for comparison
    SELECT COUNT(*) INTO existing_count
    FROM notebooks
    WHERE user_id = p_user_id 
    AND notebook_level::text = p_notebook_level
    AND is_active = TRUE;
    
    RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create a new page
CREATE OR REPLACE FUNCTION check_page_creation_limit(p_notebook_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    user_subscription TEXT;
    page_count INTEGER;
BEGIN
    -- Get user ID and subscription from notebook
    SELECT n.user_id, p.subscription_status
    INTO user_id, user_subscription
    FROM notebooks n
    JOIN profiles p ON p.id = n.user_id
    WHERE n.id = p_notebook_id;
    
    -- Premium users have no limits
    IF user_subscription != 'free' THEN
        RETURN TRUE;
    END IF;
    
    -- Free users are limited to 15 pages per notebook
    SELECT COUNT(*) INTO page_count
    FROM pages
    WHERE notebook_id = p_notebook_id;
    
    RETURN page_count < 15;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check words per page limit
CREATE OR REPLACE FUNCTION check_words_per_page_limit(p_page_id UUID, p_additional_words INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
DECLARE
    user_subscription TEXT;
    current_word_count INTEGER;
BEGIN
    -- Get user's subscription status through page -> notebook -> user
    SELECT p.subscription_status
    INTO user_subscription
    FROM pages pg
    JOIN notebooks n ON n.id = pg.notebook_id
    JOIN profiles p ON p.id = n.user_id
    WHERE pg.id = p_page_id;
    
    -- Premium users have no limits
    IF user_subscription != 'free' THEN
        RETURN TRUE;
    END IF;
    
    -- Get current word count for this page
    SELECT COUNT(*) INTO current_word_count
    FROM words
    WHERE page_id = p_page_id AND is_archived = FALSE;
    
    -- Free users are limited to 10 words per page
    RETURN (current_word_count + p_additional_words) <= 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. ARCHIVE AND RESET FUNCTIONS
-- =============================================

-- Function to archive notebook words and reset for new cycle
CREATE OR REPLACE FUNCTION archive_and_reset_notebook(p_notebook_id UUID)
RETURNS TABLE(archived_words_count INTEGER, new_cycle_number INTEGER) AS $$
DECLARE
    user_id UUID;
    words_count INTEGER;
    next_cycle_number INTEGER;
BEGIN
    -- Get user ID
    SELECT n.user_id INTO user_id
    FROM notebooks n
    WHERE n.id = p_notebook_id;
    
    -- Get count of words to archive
    SELECT COUNT(*) INTO words_count
    FROM words w
    WHERE w.notebook_id = p_notebook_id AND w.is_archived = FALSE;
    
    -- Get next cycle number
    SELECT COALESCE(MAX(cycle_number), 0) + 1 INTO next_cycle_number
    FROM notebook_archives
    WHERE notebook_id = p_notebook_id;
    
    -- Archive all current words
    UPDATE words
    SET 
        is_archived = TRUE,
        archived_notebook_id = p_notebook_id,
        archived_at = NOW(),
        archive_cycle_number = next_cycle_number,
        page_id = NULL  -- Decouple from pages
    WHERE notebook_id = p_notebook_id AND is_archived = FALSE;
    
    -- Delete all pages to start fresh
    DELETE FROM pages WHERE notebook_id = p_notebook_id;
    
    -- Create archive record
    INSERT INTO notebook_archives (user_id, notebook_id, cycle_number, words_count)
    VALUES (user_id, p_notebook_id, next_cycle_number, words_count);
    
    -- Create fresh pages 1-15
    INSERT INTO pages (notebook_id, page_number, status, created_at, unlocked_at)
    SELECT 
        p_notebook_id,
        generate_series(1, 15),
        CASE WHEN generate_series(1, 15) = 1 THEN 'unlocked' ELSE 'locked' END,
        NOW(),
        CASE WHEN generate_series(1, 15) = 1 THEN NOW() ELSE NULL END;
    
    RETURN QUERY SELECT words_count, next_cycle_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get archived words for a notebook
CREATE OR REPLACE FUNCTION get_archived_words(p_notebook_id UUID)
RETURNS TABLE(
    id UUID,
    word TEXT,
    meaning TEXT,
    notes TEXT,
    archive_cycle_number INTEGER,
    archived_at TIMESTAMPTZ,
    round INTEGER,
    status TEXT,
    next_review_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.word,
        w.meaning,
        w.notes,
        w.archive_cycle_number,
        w.archived_at,
        w.round,
        w.status,
        w.next_review_date
    FROM words w
    WHERE w.archived_notebook_id = p_notebook_id 
    AND w.is_archived = TRUE
    ORDER BY w.archive_cycle_number, w.archived_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notebook archives summary
CREATE OR REPLACE FUNCTION get_notebook_archives_summary(p_notebook_id UUID)
RETURNS TABLE(
    cycle_number INTEGER,
    words_count INTEGER,
    completed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        na.cycle_number,
        na.words_count,
        na.completed_at
    FROM notebook_archives na
    WHERE na.notebook_id = p_notebook_id
    ORDER BY na.cycle_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 6. UPDATE EXISTING FUNCTIONS FOR ARCHIVE SUPPORT
-- =============================================

-- Update get_words_for_review to include archived words
CREATE OR REPLACE FUNCTION get_words_for_review(p_notebook_id UUID, p_current_date TIMESTAMPTZ DEFAULT NOW())
RETURNS TABLE(
    id UUID,
    word TEXT,
    meaning TEXT,
    notes TEXT,
    round INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ,
    next_review_date TIMESTAMPTZ,
    page_number INTEGER,
    word_type TEXT,
    example_sentence TEXT,
    sentence_bold TEXT,
    sentence_meaning TEXT,
    meaning_bold TEXT,
    ai_generated BOOLEAN,
    is_archived BOOLEAN,
    archive_cycle_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.word,
        w.meaning,
        w.notes,
        w.round,
        w.status,
        w.created_at,
        w.next_review_date,
        COALESCE(p.page_number, 0) as page_number,
        w.word_type,
        w.example_sentence,
        w.sentence_bold,
        w.sentence_meaning,
        w.meaning_bold,
        w.ai_generated,
        w.is_archived,
        w.archive_cycle_number
    FROM words w
    LEFT JOIN pages p ON p.id = w.page_id
    WHERE (
        -- Active words from this notebook
        (w.notebook_id = p_notebook_id AND w.is_archived = FALSE)
        OR 
        -- Archived words from this notebook
        (w.archived_notebook_id = p_notebook_id AND w.is_archived = TRUE)
    )
    AND w.status IN ('learning', 'reviewing')
    AND w.next_review_date <= p_current_date
    ORDER BY w.next_review_date ASC, w.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update user stats to include archived words
CREATE OR REPLACE FUNCTION get_user_stats_with_archives(p_user_id UUID)
RETURNS TABLE(
    total_words_added INTEGER,
    total_words_mastered INTEGER,
    total_archived_words INTEGER,
    total_archive_cycles INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM words w 
         JOIN notebooks n ON n.id = w.notebook_id 
         WHERE n.user_id = p_user_id),
        (SELECT COUNT(*)::INTEGER FROM words w 
         JOIN notebooks n ON n.id = w.notebook_id 
         WHERE n.user_id = p_user_id AND w.status = 'mastered'),
        (SELECT COUNT(*)::INTEGER FROM words w 
         WHERE w.archived_notebook_id IN (
             SELECT id FROM notebooks WHERE user_id = p_user_id
         ) AND w.is_archived = TRUE),
        (SELECT COUNT(DISTINCT archive_cycle_number)::INTEGER FROM words w 
         WHERE w.archived_notebook_id IN (
             SELECT id FROM notebooks WHERE user_id = p_user_id
         ) AND w.is_archived = TRUE),
        (SELECT streak_count FROM profiles WHERE id = p_user_id),
        (SELECT longest_streak FROM profiles WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. SUBSCRIPTION MANAGEMENT FUNCTIONS
-- =============================================

-- Function to activate subscription (mock implementation)
CREATE OR REPLACE FUNCTION activate_subscription(
    p_user_id UUID,
    p_subscription_type TEXT,
    p_duration_days INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles
    SET 
        subscription_status = p_subscription_type,
        subscription_activated_at = NOW(),
        subscription_expires_at = NOW() + (p_duration_days || ' days')::INTERVAL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if subscription is active
CREATE OR REPLACE FUNCTION is_subscription_active(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub_status TEXT;
    expires_at TIMESTAMPTZ;
BEGIN
    SELECT subscription_status, subscription_expires_at
    INTO sub_status, expires_at
    FROM profiles
    WHERE id = p_user_id;
    
    -- Free users are not active
    IF sub_status = 'free' OR sub_status IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if subscription hasn't expired
    RETURN expires_at IS NULL OR expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. GRANT NECESSARY PERMISSIONS
-- =============================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_notebook_creation_limit(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_page_creation_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_words_per_page_limit(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_and_reset_notebook(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_archived_words(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notebook_archives_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_words_for_review(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_stats_with_archives(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_subscription(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION is_subscription_active(UUID) TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT UNIQUE NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE migration_log IS 'Tracks which migrations have been executed';

-- Insert a test log entry to confirm migration ran
INSERT INTO migration_log (migration_name, executed_at) 
VALUES ('freemium_system_migration', NOW())
ON CONFLICT (migration_name) DO NOTHING;

-- Final success message
SELECT 'Freemium system migration completed successfully!' as status;