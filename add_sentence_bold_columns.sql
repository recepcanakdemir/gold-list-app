-- Add sentence_bold and meaning_bold columns to words table for pre-processed word highlighting
-- These columns store HTML <b>word</b> formatted versions for direct display in review cards

-- Add sentence_bold column - stores HTML formatted version of example_sentence
ALTER TABLE words 
ADD COLUMN sentence_bold TEXT NULL;

-- Add meaning_bold column - stores HTML formatted version of sentence_meaning  
ALTER TABLE words 
ADD COLUMN meaning_bold TEXT NULL;

-- Add comments to document the column purposes
COMMENT ON COLUMN words.sentence_bold IS 'HTML formatted version of example_sentence with <b>target_word</b> tags for bold highlighting';
COMMENT ON COLUMN words.meaning_bold IS 'HTML formatted version of sentence_meaning with <b>target_word</b> tags for bold highlighting';

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'words' 
AND column_name IN ('sentence_bold', 'meaning_bold')
ORDER BY column_name;