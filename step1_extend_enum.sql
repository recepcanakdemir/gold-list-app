-- =============================================
-- STEP 1: EXTEND ROUND_NUMBER ENUM
-- Run this first, then run step2_migrate_data.sql
-- =============================================

-- Extend round_number enum to support rounds 1-12
-- Each ALTER TYPE must be in a separate transaction
DO $$
BEGIN
  -- Add enum values if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '5' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '5';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '6' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '6';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '7' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '7';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '8' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '8';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '9' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '9';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '10' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '10';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '11' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '11';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = '12' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'round_number')) THEN
    ALTER TYPE round_number ADD VALUE '12';
  END IF;
END $$;

-- Success message
SELECT 'Step 1 complete: round_number enum extended to support rounds 1-12' as result;