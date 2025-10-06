-- =============================================
-- ADD WORD_TYPE COLUMN TO WORDS TABLE
-- =============================================
-- Migration to add word type classification to existing words table
-- Run this in Supabase SQL Editor

-- Add word_type column to words table with default value for unknown type
ALTER TABLE words 
ADD COLUMN word_type TEXT DEFAULT 'unknown';

-- Add check constraint for valid word types
ALTER TABLE words
ADD CONSTRAINT check_word_type 
CHECK (word_type IN ('verb', 'noun', 'adjective', 'adverb', 'preposition', 'conjunction', 'interjection', 'pronoun', 'article', 'other', 'unknown'));

-- Add comment explaining the column
COMMENT ON COLUMN words.word_type IS 'Type of word: verb, noun, adjective, adverb, etc. Default "unknown" for user to classify later.';

-- Update existing words to have 'unknown' type (this is already the default, but making it explicit)
UPDATE words 
SET word_type = 'unknown' 
WHERE word_type IS NULL;

-- Optional: Create index for faster queries by word type
CREATE INDEX idx_words_word_type ON words(word_type);

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Run this to verify the migration worked:
-- SELECT word_type, COUNT(*) FROM words GROUP BY word_type;