-- =============================================
-- COMPLETE ROUND CONSTRAINT FIX
-- This handles all aspects of enabling rounds 1-12
-- =============================================

-- Step 1: Extend the enum if needed (this should already be done)
DO $$ 
BEGIN
  -- Add enum values 5-12 if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '5' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '5';
    ALTER TYPE round_number ADD VALUE '6';
    ALTER TYPE round_number ADD VALUE '7';
    ALTER TYPE round_number ADD VALUE '8';
    ALTER TYPE round_number ADD VALUE '9';
    ALTER TYPE round_number ADD VALUE '10';
    ALTER TYPE round_number ADD VALUE '11';
    ALTER TYPE round_number ADD VALUE '12';
  END IF;
END $$;

-- Step 2: Drop all check constraints on words table that might restrict current_round
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop any check constraints on words table
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'words')
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%current_round%'
    LOOP
        EXECUTE format('ALTER TABLE words DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 3: Verify the fix works by testing round 5
DO $$
BEGIN
    -- Test that round 5 can be assigned
    IF '5'::round_number IS NOT NULL THEN
        RAISE NOTICE 'SUCCESS: Round 5 is now valid';
    END IF;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE EXCEPTION 'FAILED: Round 5 still not valid: %', SQLERRM;
END $$;

-- Step 4: Show final state
SELECT 'Round constraint fix completed' as result;

-- Show available enum values
SELECT 'Available rounds: ' || string_agg(enumlabel, ', ' ORDER BY enumsortorder) as available_rounds
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number');

-- Show remaining constraints (should be minimal)
SELECT 
  'Remaining constraints: ' || coalesce(string_agg(conname, ', '), 'none') as remaining_constraints
FROM pg_constraint 
WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'words')
AND contype = 'c';