-- =============================================
-- GOLD LIST APP DATABASE MIGRATION
-- Run these queries in Supabase SQL Editor to update schema
-- =============================================

-- 1. Create missing tables that the app expects

-- Create pages table (daily word entry sessions)
CREATE TABLE IF NOT EXISTS pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    date_created DATE DEFAULT CURRENT_DATE NOT NULL,
    target_round round_number DEFAULT '1'::round_number NOT NULL,
    words_count INTEGER DEFAULT 0 NOT NULL,
    is_completed BOOLEAN DEFAULT false NOT NULL,
    next_review_date DATE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique page numbers per notebook
    UNIQUE(notebook_id, page_number)
);

-- Create reviews table (track word review history)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE NOT NULL,
    round round_number NOT NULL,
    reviewed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    remembered BOOLEAN NOT NULL,
    next_review_date DATE,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Update words table to match app expectations

-- Add page_id column to words table
ALTER TABLE words ADD COLUMN IF NOT EXISTS page_id UUID REFERENCES pages(id) ON DELETE CASCADE;

-- Add missing columns to words table
ALTER TABLE words ADD COLUMN IF NOT EXISTS meaning TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS position_in_page INTEGER DEFAULT 1;
ALTER TABLE words ADD COLUMN IF NOT EXISTS status word_status DEFAULT 'learning'::word_status;

-- Update existing data: copy translation to meaning
UPDATE words SET meaning = translation WHERE meaning IS NULL;

-- 3. Update triggers for new tables

-- Add updated_at trigger for pages
CREATE OR REPLACE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Create RLS policies for new tables

-- Enable RLS on new tables
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Pages policies
CREATE POLICY "Users can view pages in own notebooks" ON pages
    FOR SELECT USING (
        notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert pages in own notebooks" ON pages
    FOR INSERT WITH CHECK (
        notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update pages in own notebooks" ON pages
    FOR UPDATE USING (
        notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete pages in own notebooks" ON pages
    FOR DELETE USING (
        notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid())
    );

-- Reviews policies
CREATE POLICY "Users can view reviews for own words" ON reviews
    FOR SELECT USING (
        word_id IN (
            SELECT w.id FROM words w
            JOIN notebooks n ON w.notebook_id = n.id
            WHERE n.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert reviews for own words" ON reviews
    FOR INSERT WITH CHECK (
        word_id IN (
            SELECT w.id FROM words w
            JOIN notebooks n ON w.notebook_id = n.id
            WHERE n.user_id = auth.uid()
        )
    );

-- 5. Update existing functions to work with new schema

-- Function to add words to a page
CREATE OR REPLACE FUNCTION add_words_to_page(
    p_page_id UUID,
    p_words JSONB
) RETURNS SETOF words AS $$
DECLARE
    word_record RECORD;
    new_word words%ROWTYPE;
BEGIN
    -- Loop through the words array
    FOR word_record IN SELECT * FROM jsonb_array_elements(p_words)
    LOOP
        -- Insert each word
        INSERT INTO words (
            page_id,
            notebook_id,
            word,
            meaning,
            translation,
            notes,
            position_in_page,
            review_date
        ) VALUES (
            p_page_id,
            (SELECT notebook_id FROM pages WHERE id = p_page_id),
            (word_record.value->>'word')::TEXT,
            (word_record.value->>'meaning')::TEXT,
            (word_record.value->>'meaning')::TEXT, -- Copy meaning to translation for compatibility
            (word_record.value->>'notes')::TEXT,
            (word_record.value->>'position')::INTEGER,
            CURRENT_DATE + INTERVAL '14 days' -- 14 days from now
        ) RETURNING * INTO new_word;
        
        RETURN NEXT new_word;
    END LOOP;
    
    -- Update page stats
    UPDATE pages 
    SET 
        words_count = (SELECT COUNT(*) FROM words WHERE page_id = p_page_id),
        is_completed = true,
        next_review_date = CURRENT_DATE + INTERVAL '14 days'
    WHERE id = p_page_id;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a new page
CREATE OR REPLACE FUNCTION create_new_page(
    p_notebook_id UUID
) RETURNS pages AS $$
DECLARE
    next_page_number INTEGER;
    new_page pages%ROWTYPE;
BEGIN
    -- Get the next page number
    SELECT COALESCE(MAX(page_number), 0) + 1 
    INTO next_page_number
    FROM pages 
    WHERE notebook_id = p_notebook_id;
    
    -- Create the new page
    INSERT INTO pages (
        notebook_id,
        page_number,
        date_created,
        target_round
    ) VALUES (
        p_notebook_id,
        next_page_number,
        CURRENT_DATE,
        '1'::round_number
    ) RETURNING * INTO new_page;
    
    RETURN new_page;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get words ready for review
CREATE OR REPLACE FUNCTION get_words_for_review_v2(
    p_notebook_id UUID
) RETURNS TABLE (
    id UUID,
    word TEXT,
    meaning TEXT,
    translation TEXT,
    notes TEXT,
    current_round INTEGER,
    status word_status,
    page_number INTEGER,
    review_date DATE,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.word,
        w.meaning,
        w.translation,
        w.notes,
        w.current_round,
        w.status,
        p.page_number,
        w.review_date,
        w.created_at
    FROM words w
    JOIN pages p ON w.page_id = p.id
    WHERE p.notebook_id = p_notebook_id
      AND w.status = 'learning'
      AND w.review_date <= CURRENT_DATE
      AND NOT w.is_mastered
    ORDER BY w.review_date ASC, w.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pages_notebook_id ON pages(notebook_id);
CREATE INDEX IF NOT EXISTS idx_pages_review_date ON pages(next_review_date);
CREATE INDEX IF NOT EXISTS idx_words_page_id ON words(page_id);
CREATE INDEX IF NOT EXISTS idx_words_review_date ON words(review_date);
CREATE INDEX IF NOT EXISTS idx_words_status ON words(status);
CREATE INDEX IF NOT EXISTS idx_reviews_word_id ON reviews(word_id);