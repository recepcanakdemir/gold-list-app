-- Add page context fields to pages table for AI sentence generation
-- This supports the authentic Gold List Method practice of noting source materials

-- Add context fields to pages table
ALTER TABLE pages ADD COLUMN context_title TEXT;
ALTER TABLE pages ADD COLUMN context_source TEXT;
ALTER TABLE pages ADD COLUMN context_description TEXT;
ALTER TABLE pages ADD COLUMN context_theme TEXT;

-- Create index for efficient context-based queries
CREATE INDEX IF NOT EXISTS idx_pages_context_title ON pages(context_title);
CREATE INDEX IF NOT EXISTS idx_pages_context_theme ON pages(context_theme);

-- Add comment for documentation
COMMENT ON COLUMN pages.context_title IS 'Page title/topic for AI sentence generation context (e.g., "Business English - Meetings")';
COMMENT ON COLUMN pages.context_source IS 'Source material reference (e.g., "Advanced Business English Ch.4")';
COMMENT ON COLUMN pages.context_description IS 'Detailed description of the learning context';
COMMENT ON COLUMN pages.context_theme IS 'Theme/topic for coherent sentence generation (e.g., "workplace communication")';

-- Update existing pages to have default context if needed
UPDATE pages 
SET context_title = CASE 
  WHEN page_number <= 10 THEN 'Vocabulary Practice - Beginner'
  WHEN page_number <= 50 THEN 'Vocabulary Practice - Intermediate'
  ELSE 'Vocabulary Practice - Advanced'
END
WHERE context_title IS NULL;

-- Example context for demonstration
UPDATE pages 
SET 
  context_source = 'Gold List Method Learning',
  context_theme = 'general vocabulary'
WHERE context_source IS NULL;