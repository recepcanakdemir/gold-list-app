-- Migration: Add Extremely Hard Words System
-- Description: Adds difficulty_tag and cycle_count columns to support Gold Round 4 failure cycling
-- Date: 2024-01-06

-- Add new columns to words table
ALTER TABLE words 
ADD COLUMN IF NOT EXISTS difficulty_tag text DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS cycle_count integer DEFAULT 0;

-- Add check constraint for difficulty_tag enum values
ALTER TABLE words 
ADD CONSTRAINT check_difficulty_tag 
CHECK (difficulty_tag IN ('NORMAL', 'EXTREMELY_HARD', 'MASTER_LEVEL', 'LEGENDARY'));

-- Create index for performance on difficulty_tag queries
CREATE INDEX IF NOT EXISTS idx_words_difficulty_tag ON words(difficulty_tag);

-- Create index for cycle_count queries (useful for statistics)
CREATE INDEX IF NOT EXISTS idx_words_cycle_count ON words(cycle_count);

-- Update existing words to have default values (safety measure)
UPDATE words 
SET difficulty_tag = 'NORMAL', cycle_count = 0 
WHERE difficulty_tag IS NULL OR cycle_count IS NULL;

-- Make columns NOT NULL after setting defaults
ALTER TABLE words 
ALTER COLUMN difficulty_tag SET NOT NULL,
ALTER COLUMN cycle_count SET NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN words.difficulty_tag IS 'Difficulty level for words that have failed Gold Round 4 multiple times';
COMMENT ON COLUMN words.cycle_count IS 'Number of times word has cycled through rounds 1-12 after Gold Round 4 failures';

-- Verification queries (run these to confirm the migration worked)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'words' AND column_name IN ('difficulty_tag', 'cycle_count');

-- SELECT difficulty_tag, cycle_count, COUNT(*) 
-- FROM words 
-- GROUP BY difficulty_tag, cycle_count 
-- ORDER BY difficulty_tag, cycle_count;