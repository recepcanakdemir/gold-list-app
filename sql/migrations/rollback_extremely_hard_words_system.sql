-- Rollback Migration: Remove Extremely Hard Words System
-- Description: Removes difficulty_tag and cycle_count columns and related constraints
-- Date: 2024-01-06
-- WARNING: This will permanently delete all difficulty tag and cycle count data!

-- Remove indexes first
DROP INDEX IF EXISTS idx_words_difficulty_tag;
DROP INDEX IF EXISTS idx_words_cycle_count;

-- Remove check constraint
ALTER TABLE words DROP CONSTRAINT IF EXISTS check_difficulty_tag;

-- Remove the new columns (THIS WILL DELETE ALL DATA IN THESE COLUMNS!)
ALTER TABLE words DROP COLUMN IF EXISTS difficulty_tag;
ALTER TABLE words DROP COLUMN IF EXISTS cycle_count;

-- Verification query (run this to confirm rollback worked)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'words' AND column_name IN ('difficulty_tag', 'cycle_count');