-- =============================================
-- DIAGNOSE MISSING TRIGGER LOGS
-- =============================================
-- This script investigates why our enhanced trigger logging isn't appearing
-- even though a new Apple user was successfully created
-- Run this in Supabase SQL Editor

-- =============================================
-- 1. CHECK IF TRIGGERS EXIST AND ARE ACTIVE
-- =============================================

-- List all triggers on auth.users table
SELECT 'STEP 1: Current triggers on auth.users' as step;
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing,
    action_condition
FROM information_schema.triggers 
WHERE event_object_table = 'users' 
AND event_object_schema = 'auth'
ORDER BY trigger_name;

-- =============================================
-- 2. CHECK IF OUR FUNCTIONS EXIST
-- =============================================

SELECT 'STEP 2: Available user creation functions' as step;
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines 
WHERE routine_name LIKE '%handle_new_user%'
OR routine_name LIKE '%create_user_profile%'
OR routine_name LIKE '%user_unified%'
ORDER BY routine_name;

-- =============================================
-- 3. CHECK THE NEW APPLE USER STATE
-- =============================================

-- Check if the new Apple user has a profile created
SELECT 'STEP 3: New Apple user profile status' as step;
SELECT 
    'auth.users data:' as source,
    id,
    email,
    created_at,
    raw_app_meta_data->>'provider' as provider_from_metadata,
    raw_user_meta_data
FROM auth.users 
WHERE id = '9fd66739-e114-4893-ae3c-26ccd2e66576';

-- Check if profile was created
SELECT 
    'profiles table data:' as source,
    id,
    email,
    display_name,
    auth_provider,
    apple_user_id,
    google_user_id,
    created_at
FROM public.profiles 
WHERE id = '9fd66739-e114-4893-ae3c-26ccd2e66576';

-- =============================================
-- 4. TEST BASIC LOGGING FUNCTIONALITY
-- =============================================

SELECT 'STEP 4: Testing basic logging' as step;

-- Test if we can log at all
DO $$
BEGIN
    RAISE LOG 'DIAGNOSTIC TEST: Basic logging functionality - timestamp: %', NOW();
    RAISE LOG 'DIAGNOSTIC TEST: Testing if LOG level appears in postgres_logs';
    RAISE INFO 'DIAGNOSTIC TEST: Testing if INFO level appears in postgres_logs';
    RAISE DEBUG 'DIAGNOSTIC TEST: Testing if DEBUG level appears in postgres_logs';
    RAISE WARNING 'DIAGNOSTIC TEST: Testing if WARNING level appears in postgres_logs';
END $$;

-- =============================================
-- 5. GET FUNCTION SOURCE CODE
-- =============================================

SELECT 'STEP 5: Function source code inspection' as step;

-- Get the actual source code of our functions to see if they have the enhanced logging
SELECT 
    proname as function_name,
    prosrc as source_code
FROM pg_proc 
WHERE proname LIKE '%handle_new_user%'
OR proname LIKE '%create_user_profile%';

-- =============================================
-- 6. MANUAL TRIGGER TEST (IF NEEDED)
-- =============================================

SELECT 'STEP 6: Manual trigger test preparation' as step;
SELECT 'To manually test trigger, we would need to insert a test user into auth.users' as instruction;
SELECT 'This is risky and should only be done if other diagnostics fail' as warning;

-- =============================================
-- DIAGNOSTIC SUMMARY
-- =============================================

SELECT 'DIAGNOSTIC COMPLETE - Check results above:' as status;
SELECT 'Step 1: Should show our trigger if it exists' as step1_meaning;
SELECT 'Step 2: Should show our function if it exists' as step2_meaning;
SELECT 'Step 3: Shows if profile was created for new Apple user' as step3_meaning;
SELECT 'Step 4: Tests if logging works at different levels' as step4_meaning;
SELECT 'Step 5: Shows actual function code with logging' as step5_meaning;