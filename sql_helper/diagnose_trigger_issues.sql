-- =============================================
-- DIAGNOSE TRIGGER ISSUES
-- =============================================
-- This script checks the current state of triggers and functions
-- Run this in Supabase SQL Editor to see what exists

-- =============================================
-- 1. CHECK IF TRIGGERS EXIST
-- =============================================

-- List all triggers on auth.users table
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
-- 2. CHECK IF FUNCTIONS EXIST
-- =============================================

-- List functions related to user creation
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%handle_new_user%'
OR routine_name LIKE '%user_unified%'
ORDER BY routine_name;

-- =============================================
-- 3. CHECK FUNCTION DETAILS
-- =============================================

-- Get detailed function information
SELECT 
    proname as function_name,
    proargnames as argument_names,
    prosrc as source_code
FROM pg_proc 
WHERE proname LIKE '%handle_new_user%'
OR proname LIKE '%user_unified%';

-- =============================================
-- 4. CHECK FOR RECENT ERRORS
-- =============================================

-- Check for any errors in the last day (requires log access)
-- This will help identify if trigger creation failed
SELECT 'Check postgres_logs for any ERROR messages related to trigger creation' as instruction;

-- =============================================
-- 5. TEST BASIC LOGGING
-- =============================================

-- Test if we can log at all (this should appear in postgres logs)
DO $$
BEGIN
    RAISE LOG 'TEST: Basic logging functionality works - timestamp: %', NOW();
END $$;

-- =============================================
-- 6. CHECK TABLE PERMISSIONS
-- =============================================

-- Check permissions on auth.users table
SELECT 
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'auth' 
AND table_name = 'users'
ORDER BY privilege_type;

-- =============================================
-- RESULTS INTERPRETATION
-- =============================================

SELECT 'DIAGNOSIS COMPLETE - Check results above:' as status;
SELECT 'If no triggers found in step 1: Trigger was never created' as step1;
SELECT 'If no functions found in step 2: Function creation failed' as step2;
SELECT 'If TEST log appears in postgres_logs: Logging works' as step5;
SELECT 'Next: Create working trigger based on findings' as next_step;