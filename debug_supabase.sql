-- Debug script to test Supabase setup
-- Run these queries one by one in Supabase SQL Editor

-- 1. Check if profiles table exists and structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles';

-- 2. Check if the trigger function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 3. Check if the trigger exists
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 4. Test the handle_new_user function manually
-- Replace 'test-uuid' with a real UUID and 'test@email.com' with a test email
-- SELECT handle_new_user();

-- 5. Check RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Try to insert a test profile manually (replace with your user ID if you have one)
-- INSERT INTO profiles (id, email, display_name, subscription_status) 
-- VALUES ('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test User', 'free');