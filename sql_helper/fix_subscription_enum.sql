-- Quick fix for subscription_status enum issue
-- Run this if the main migration fails due to enum errors

-- Method 1: Add enum values (if column uses enum type)
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'monthly';
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'yearly';

-- Method 2: If above fails, change column to text and add constraint
ALTER TABLE profiles ALTER COLUMN subscription_status TYPE TEXT;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_status_check 
CHECK (subscription_status IN ('free', 'weekly', 'monthly', 'yearly'));

-- Set default value
ALTER TABLE profiles ALTER COLUMN subscription_status SET DEFAULT 'free';

-- Verify the change
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'subscription_status';