-- =============================================
-- DELETE APPLE TEST USERS COMPLETELY
-- =============================================
-- This script completely removes Apple test users from both auth.users and profiles
-- to enable clean testing of the fixed trigger function
--
-- IMPORTANT: Only run this on test users, not production users!
-- Run this in Supabase SQL Editor

-- =============================================
-- METHOD 1: DELETE SPECIFIC TEST USERS
-- =============================================

-- Delete the current Apple test users we've been working with
-- These are the user IDs from our testing sessions

-- User 1: The recent user with schema error
DELETE FROM auth.users WHERE id = '13088d9e-6313-4fec-9d8f-a2f27fd86d4e';
DELETE FROM public.profiles WHERE id = '13088d9e-6313-4fec-9d8f-a2f27fd86d4e';

-- User 2: The earlier user with wrong auth_provider
DELETE FROM auth.users WHERE id = '9fd66739-e114-4893-ae3c-26ccd2e66576';
DELETE FROM public.profiles WHERE id = '9fd66739-e114-4893-ae3c-26ccd2e66576';

-- Clean up any notification settings for these users
DELETE FROM public.user_notification_settings WHERE user_id IN (
    '13088d9e-6313-4fec-9d8f-a2f27fd86d4e',
    '9fd66739-e114-4893-ae3c-26ccd2e66576'
);

-- =============================================
-- METHOD 2: DELETE ALL APPLE USERS (BE CAREFUL!)
-- =============================================
-- Uncomment the lines below ONLY if you want to delete ALL Apple users
-- This is more aggressive and should only be used in development

-- DELETE FROM auth.users WHERE raw_app_meta_data->>'provider' = 'apple';
-- DELETE FROM public.profiles WHERE auth_provider = 'apple';
-- DELETE FROM public.user_notification_settings WHERE user_id NOT IN (SELECT id FROM auth.users);

-- =============================================
-- METHOD 3: DELETE BY EMAIL (SAFEST FOR TESTING)
-- =============================================
-- Delete users with your specific test email
-- This is the safest method for testing

DELETE FROM auth.users WHERE email = 'recepcanakdemir@icloud.com';
DELETE FROM public.profiles WHERE email = 'recepcanakdemir@icloud.com';
DELETE FROM public.user_notification_settings WHERE user_id NOT IN (SELECT id FROM auth.users);

-- =============================================
-- VERIFICATION
-- =============================================

-- Check that Apple test users are gone
SELECT 'Verification: Checking remaining Apple users' as status;

SELECT 
    'auth.users with Apple provider:' as table_name,
    COUNT(*) as count
FROM auth.users 
WHERE raw_app_meta_data->>'provider' = 'apple';

SELECT 
    'profiles with Apple provider:' as table_name,
    COUNT(*) as count
FROM public.profiles 
WHERE auth_provider = 'apple';

SELECT 
    'profiles with test email:' as table_name,
    COUNT(*) as count
FROM public.profiles 
WHERE email = 'recepcanakdemir@icloud.com';

-- List any remaining users for verification
SELECT 
    'Remaining users:' as info,
    id,
    email,
    raw_app_meta_data->>'provider' as provider,
    created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- =============================================
-- TEST CONFIRMATION
-- =============================================

SELECT 'CLEANUP COMPLETE - Ready for fresh Apple Sign-In testing' as status;
SELECT 'Next step: Sign in with Apple to test the fixed trigger' as instruction;
SELECT 'Expected: Profile created with auth_provider=apple, correct email, and apple_user_id' as expected_result;