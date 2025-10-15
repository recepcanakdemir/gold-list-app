-- ==========================================
-- FINAL Widget Feature Removal - Database Cleanup
-- ==========================================
-- Run this SQL in your Supabase SQL editor to completely remove all widget traces

-- Remove the RLS policy first (if it exists)
DROP POLICY IF EXISTS "Users can manage their own widget cache" ON widget_cache;

-- Remove the widget_cache table
DROP TABLE IF EXISTS widget_cache;

-- Remove widget columns from profiles table (if they still exist)
ALTER TABLE profiles 
DROP COLUMN IF EXISTS widget_enabled,
DROP COLUMN IF EXISTS widget_notebook_id;

-- Verification queries to confirm cleanup
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name IN ('widget_enabled', 'widget_notebook_id');

SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'widget_cache';

-- If the queries above return no rows, the cleanup was successful