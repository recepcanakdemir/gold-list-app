-- =============================================
-- SILVER & GOLD NOTEBOOK MIGRATION
-- Run these queries in Supabase SQL Editor to add Silver/Gold support
-- =============================================

-- 1. Add word lineage tracking fields to words table
-- These fields track the original source when words move between Bronze → Silver → Gold

ALTER TABLE words ADD COLUMN IF NOT EXISTS source_notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL;
ALTER TABLE words ADD COLUMN IF NOT EXISTS original_page_id UUID REFERENCES pages(id) ON DELETE SET NULL;

-- 2. Add comments to explain the new fields
COMMENT ON COLUMN words.source_notebook_id IS 'Original Bronze notebook ID when word was first created';
COMMENT ON COLUMN words.original_page_id IS 'Original Bronze page ID when word was first created';

-- 3. Update existing Bronze words to set their lineage (for existing data)
-- All existing words are Bronze words, so set source_notebook_id to their current notebook_id
UPDATE words 
SET 
    source_notebook_id = notebook_id,
    original_page_id = page_id
WHERE source_notebook_id IS NULL;

-- 4. Add page-based review fields for Silver/Gold notebooks
-- These fields enable page-level reviews instead of individual word reviews
ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_review_date DATE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_current_round INTEGER DEFAULT 1 CHECK (page_current_round >= 1 AND page_current_round <= 4);
ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_status TEXT DEFAULT 'pending' CHECK (page_status IN ('pending', 'active', 'completed', 'migrated'));
ALTER TABLE pages ADD COLUMN IF NOT EXISTS page_completion_date DATE;

-- Add comments to explain the new page fields
COMMENT ON COLUMN pages.page_review_date IS 'Review date for the entire page (Silver/Gold only)';
COMMENT ON COLUMN pages.page_current_round IS 'Current round for the entire page (Silver/Gold only)';
COMMENT ON COLUMN pages.page_status IS 'Page status: pending=not complete, active=ready for review, completed=finished all rounds, migrated=moved to next level';
COMMENT ON COLUMN pages.page_completion_date IS 'Date when page reached 20 words and became ready for reviews';

-- 5. Create indexes for efficient Silver/Gold queries
CREATE INDEX IF NOT EXISTS idx_words_source_notebook ON words(source_notebook_id);
CREATE INDEX IF NOT EXISTS idx_words_original_page ON words(original_page_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_level ON notebooks(notebook_level);
CREATE INDEX IF NOT EXISTS idx_pages_review_date ON pages(page_review_date);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(page_status);

-- 6. Create function to detect Bronze words that failed Round 4
CREATE OR REPLACE FUNCTION get_notebook_round4_failures(
    p_notebook_id UUID,
    p_notebook_level TEXT DEFAULT 'bronze'
) RETURNS TABLE (
    word_id UUID,
    word TEXT,
    meaning TEXT,
    translation TEXT,
    notes TEXT,
    original_page_id UUID,
    page_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as word_id,
        w.word,
        w.meaning,
        w.translation,
        w.notes,
        w.page_id as original_page_id,
        p.page_number
    FROM words w
    JOIN pages p ON w.page_id = p.id
    JOIN notebooks n ON w.notebook_id = n.id
    WHERE w.notebook_id = p_notebook_id
      AND n.notebook_level = p_notebook_level::notebook_level_enum
      AND w.current_round = 4
      AND w.status = 'failed'
      AND NOT w.is_mastered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to create Silver notebook automatically
CREATE OR REPLACE FUNCTION create_silver_notebook(
    p_bronze_notebook_id UUID
) RETURNS notebooks AS $$
DECLARE
    bronze_notebook notebooks%ROWTYPE;
    new_silver_notebook notebooks%ROWTYPE;
BEGIN
    -- Get the Bronze notebook details
    SELECT * INTO bronze_notebook 
    FROM notebooks 
    WHERE id = p_bronze_notebook_id AND notebook_level = 'bronze';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bronze notebook not found: %', p_bronze_notebook_id;
    END IF;
    
    -- Create Silver notebook with same settings
    INSERT INTO notebooks (
        user_id,
        title,
        language,
        language_code,
        notebook_level,
        words_per_day,
        review_interval_days,
        is_active,
        settings
    ) VALUES (
        bronze_notebook.user_id,
        bronze_notebook.title || ' - Silver',
        bronze_notebook.language,
        bronze_notebook.language_code,
        'silver',
        bronze_notebook.words_per_day,
        bronze_notebook.review_interval_days,
        true,
        bronze_notebook.settings
    ) RETURNING * INTO new_silver_notebook;
    
    RETURN new_silver_notebook;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create function to create Gold notebook automatically
CREATE OR REPLACE FUNCTION create_gold_notebook(
    p_silver_notebook_id UUID
) RETURNS notebooks AS $$
DECLARE
    silver_notebook notebooks%ROWTYPE;
    bronze_notebook notebooks%ROWTYPE;
    new_gold_notebook notebooks%ROWTYPE;
BEGIN
    -- Get the Silver notebook details
    SELECT * INTO silver_notebook 
    FROM notebooks 
    WHERE id = p_silver_notebook_id AND notebook_level = 'silver';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Silver notebook not found: %', p_silver_notebook_id;
    END IF;
    
    -- Get the original Bronze notebook title (remove " - Silver" suffix)
    SELECT * INTO bronze_notebook
    FROM notebooks 
    WHERE user_id = silver_notebook.user_id 
      AND language = silver_notebook.language
      AND notebook_level = 'bronze'
    LIMIT 1;
    
    -- Create Gold notebook with same settings
    INSERT INTO notebooks (
        user_id,
        title,
        language,
        language_code,
        notebook_level,
        words_per_day,
        review_interval_days,
        is_active,
        settings
    ) VALUES (
        silver_notebook.user_id,
        COALESCE(bronze_notebook.title, silver_notebook.title) || ' - Gold',
        silver_notebook.language,
        silver_notebook.language_code,
        'gold',
        silver_notebook.words_per_day,
        silver_notebook.review_interval_days,
        true,
        silver_notebook.settings
    ) RETURNING * INTO new_gold_notebook;
    
    RETURN new_gold_notebook;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to migrate words from Bronze to Silver (with batching)
CREATE OR REPLACE FUNCTION migrate_words_to_silver(
    p_bronze_notebook_id UUID,
    p_silver_notebook_id UUID,
    p_failed_word_ids UUID[]
) RETURNS SETOF words AS $$
DECLARE
    word_record RECORD;
    new_word words%ROWTYPE;
    silver_notebook notebooks%ROWTYPE;
    current_page_id UUID;
    words_in_current_page INTEGER := 0;
    current_page_number INTEGER;
    max_page_number INTEGER;
BEGIN
    -- Get Silver notebook details
    SELECT * INTO silver_notebook FROM notebooks WHERE id = p_silver_notebook_id;
    
    -- Find the highest existing page number in Silver notebook
    SELECT COALESCE(MAX(page_number), 0) INTO max_page_number
    FROM pages 
    WHERE notebook_id = p_silver_notebook_id;
    
    -- Start from the next available page number
    current_page_number := max_page_number + 1;
    
    -- Create first page in Silver notebook with page-based review fields
    INSERT INTO pages (
        notebook_id,
        page_number,
        date_created,
        target_round,
        page_completion_date,
        page_current_round,
        page_status,
        page_review_date
    ) VALUES (
        p_silver_notebook_id,
        current_page_number,
        CURRENT_DATE,
        '1'::round_number,
        CURRENT_DATE, -- Page completion date is when migration happens
        1, -- Start at Round 1
        'active', -- Ready for review
        CURRENT_DATE + INTERVAL '14 days' -- First review in 14 days
    ) RETURNING id INTO current_page_id;
    
    -- Migrate each failed word
    FOR word_record IN 
        SELECT w.*, p.page_number as original_page_number
        FROM words w
        JOIN pages p ON w.page_id = p.id
        WHERE w.id = ANY(p_failed_word_ids)
        ORDER BY p.page_number, w.position_in_page
    LOOP
        -- Check if we need a new page (reached words_per_day limit)
        IF words_in_current_page >= silver_notebook.words_per_day THEN
            current_page_number := current_page_number + 1;
            words_in_current_page := 0;
            
            -- Create new page with page-based review fields
            INSERT INTO pages (
                notebook_id,
                page_number,
                date_created,
                target_round,
                page_completion_date,
                page_current_round,
                page_status,
                page_review_date
            ) VALUES (
                p_silver_notebook_id,
                current_page_number,
                CURRENT_DATE,
                '1'::round_number,
                CURRENT_DATE,
                1,
                'active',
                CURRENT_DATE + INTERVAL '14 days'
            ) RETURNING id INTO current_page_id;
        END IF;
        
        -- Insert word into Silver notebook (reset to Round 1)
        INSERT INTO words (
            notebook_id,
            page_id,
            word,
            meaning,
            translation,
            notes,
            current_round,
            status,
            review_date,
            source_notebook_id,
            original_page_id,
            position_in_page
        ) VALUES (
            p_silver_notebook_id,
            current_page_id,
            word_record.word,
            word_record.meaning,
            word_record.translation,
            word_record.notes,
            1, -- Reset to Round 1 in Silver
            'learning',
            CURRENT_DATE + INTERVAL '14 days', -- New 14-day timer
            p_bronze_notebook_id, -- Track original Bronze notebook
            word_record.page_id, -- Track original Bronze page
            words_in_current_page + 1
        ) RETURNING * INTO new_word;
        
        words_in_current_page := words_in_current_page + 1;
        
        -- Mark original Bronze word as failed (moved to Silver)
        UPDATE words 
        SET status = 'failed' 
        WHERE id = word_record.id;
        
        RETURN NEXT new_word;
    END LOOP;
    
    -- Update page stats for all created pages
    UPDATE pages 
    SET 
        words_count = (SELECT COUNT(*) FROM words WHERE page_id = pages.id),
        is_completed = (SELECT COUNT(*) FROM words WHERE page_id = pages.id) > 0
    WHERE notebook_id = p_silver_notebook_id;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to migrate words from Silver to Gold
CREATE OR REPLACE FUNCTION migrate_words_to_gold(
    p_silver_notebook_id UUID,
    p_gold_notebook_id UUID,
    p_failed_word_ids UUID[]
) RETURNS SETOF words AS $$
DECLARE
    word_record RECORD;
    new_word words%ROWTYPE;
    gold_notebook notebooks%ROWTYPE;
    current_page_id UUID;
    words_in_current_page INTEGER := 0;
    current_page_number INTEGER;
    max_page_number INTEGER;
BEGIN
    -- Get Gold notebook details
    SELECT * INTO gold_notebook FROM notebooks WHERE id = p_gold_notebook_id;
    
    -- Find the highest existing page number in Gold notebook
    SELECT COALESCE(MAX(page_number), 0) INTO max_page_number
    FROM pages 
    WHERE notebook_id = p_gold_notebook_id;
    
    -- Start from the next available page number
    current_page_number := max_page_number + 1;
    
    -- Create first page in Gold notebook with page-based review fields
    INSERT INTO pages (
        notebook_id,
        page_number,
        date_created,
        target_round,
        page_completion_date,
        page_current_round,
        page_status,
        page_review_date
    ) VALUES (
        p_gold_notebook_id,
        current_page_number,
        CURRENT_DATE,
        '1'::round_number,
        CURRENT_DATE,
        1,
        'active',
        CURRENT_DATE + INTERVAL '14 days'
    ) RETURNING id INTO current_page_id;
    
    -- Migrate each failed word
    FOR word_record IN 
        SELECT w.*, p.page_number as silver_page_number
        FROM words w
        JOIN pages p ON w.page_id = p.id
        WHERE w.id = ANY(p_failed_word_ids)
        ORDER BY p.page_number, w.position_in_page
    LOOP
        -- Check if we need a new page
        IF words_in_current_page >= gold_notebook.words_per_day THEN
            current_page_number := current_page_number + 1;
            words_in_current_page := 0;
            
            -- Create new page with page-based review fields
            INSERT INTO pages (
                notebook_id,
                page_number,
                date_created,
                target_round,
                page_completion_date,
                page_current_round,
                page_status,
                page_review_date
            ) VALUES (
                p_gold_notebook_id,
                current_page_number,
                CURRENT_DATE,
                '1'::round_number,
                CURRENT_DATE,
                1,
                'active',
                CURRENT_DATE + INTERVAL '14 days'
            ) RETURNING id INTO current_page_id;
        END IF;
        
        -- Insert word into Gold notebook (reset to Round 1)
        INSERT INTO words (
            notebook_id,
            page_id,
            word,
            meaning,
            translation,
            notes,
            current_round,
            status,
            review_date,
            source_notebook_id, -- Keep original Bronze notebook ID
            original_page_id,   -- Keep original Bronze page ID
            position_in_page
        ) VALUES (
            p_gold_notebook_id,
            current_page_id,
            word_record.word,
            word_record.meaning,
            word_record.translation,
            word_record.notes,
            1, -- Reset to Round 1 in Gold
            'learning',
            CURRENT_DATE + INTERVAL '14 days', -- New 14-day timer
            word_record.source_notebook_id, -- Preserve original Bronze ID
            word_record.original_page_id,   -- Preserve original Bronze page ID
            words_in_current_page + 1
        ) RETURNING * INTO new_word;
        
        words_in_current_page := words_in_current_page + 1;
        
        -- Mark original Silver word as failed (moved to Gold)
        UPDATE words 
        SET status = 'failed' 
        WHERE id = word_record.id;
        
        RETURN NEXT new_word;
    END LOOP;
    
    -- Update page stats
    UPDATE pages 
    SET 
        words_count = (SELECT COUNT(*) FROM words WHERE page_id = pages.id),
        is_completed = (SELECT COUNT(*) FROM words WHERE page_id = pages.id) > 0
    WHERE notebook_id = p_gold_notebook_id;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to archive Gold words that fail Round 4
CREATE OR REPLACE FUNCTION archive_gold_failures(
    p_gold_notebook_id UUID,
    p_failed_word_ids UUID[]
) RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Mark Gold Round 4 failures as "super_hard"
    UPDATE words 
    SET 
        status = 'super_hard',
        updated_at = now()
    WHERE id = ANY(p_failed_word_ids)
      AND notebook_id = p_gold_notebook_id;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create backward-compatible alias for existing code
CREATE OR REPLACE FUNCTION get_bronze_round4_failures(
    p_notebook_id UUID
) RETURNS TABLE (
    word_id UUID,
    word TEXT,
    meaning TEXT,
    translation TEXT,
    notes TEXT,
    original_page_id UUID,
    page_number INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_notebook_round4_failures(p_notebook_id, 'bronze');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to get pages due for review (Silver/Gold page-based system)
CREATE OR REPLACE FUNCTION get_pages_due_for_review(
    p_user_id UUID,
    p_current_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    page_id UUID,
    notebook_id UUID,
    notebook_title TEXT,
    notebook_level TEXT,
    page_number INTEGER,
    page_current_round INTEGER,
    page_review_date DATE,
    words_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as page_id,
        p.notebook_id,
        n.title as notebook_title,
        n.notebook_level::TEXT,
        p.page_number,
        p.page_current_round,
        p.page_review_date,
        (SELECT COUNT(*)::INTEGER FROM words w WHERE w.page_id = p.id) as words_count
    FROM pages p
    JOIN notebooks n ON p.notebook_id = n.id
    WHERE n.user_id = p_user_id
      AND n.notebook_level IN ('silver', 'gold')
      AND p.page_status = 'active'
      AND p.page_review_date <= p_current_date
    ORDER BY p.page_review_date ASC, n.notebook_level ASC, p.page_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to update page after review (advance round or migrate)
CREATE OR REPLACE FUNCTION update_page_after_review(
    p_page_id UUID,
    p_failed_words_count INTEGER,
    p_current_date DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN AS $$
DECLARE
    page_record pages%ROWTYPE;
    notebook_record notebooks%ROWTYPE;
    next_review_date DATE;
BEGIN
    -- Get page and notebook details
    SELECT * INTO page_record FROM pages WHERE id = p_page_id;
    SELECT * INTO notebook_record FROM notebooks WHERE id = page_record.notebook_id;
    
    IF page_record.page_current_round < 4 THEN
        -- Advance to next round
        next_review_date := p_current_date + INTERVAL '14 days';
        
        UPDATE pages 
        SET 
            page_current_round = page_current_round + 1,
            page_review_date = next_review_date
        WHERE id = p_page_id;
        
        RETURN TRUE;
    ELSE
        -- Round 4 completed - check if migration needed
        IF p_failed_words_count > 0 THEN
            -- Mark page as ready for migration
            UPDATE pages 
            SET page_status = 'migrated'
            WHERE id = p_page_id;
        ELSE
            -- All words mastered - mark page as completed
            UPDATE pages 
            SET page_status = 'completed'
            WHERE id = p_page_id;
        END IF;
        
        RETURN FALSE; -- No more reviews for this page
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to collect failed words for batching (20 words per Silver page)
CREATE OR REPLACE FUNCTION collect_and_migrate_failed_words(
    p_notebook_id UUID,
    p_failed_word_ids UUID[]
) RETURNS TABLE (
    silver_created BOOLEAN,
    silver_notebook_id UUID,
    words_migrated INTEGER
) AS $$
DECLARE
    notebook_record notebooks%ROWTYPE;
    existing_silver_id UUID;
    new_silver_id UUID;
    total_failed_words INTEGER;
    words_to_migrate UUID[];
    batch_size INTEGER := 20;
BEGIN
    -- Get notebook details
    SELECT * INTO notebook_record FROM notebooks WHERE id = p_notebook_id;
    
    -- Check if Silver notebook already exists for this language/user
    SELECT id INTO existing_silver_id 
    FROM notebooks 
    WHERE user_id = notebook_record.user_id 
      AND language = notebook_record.language
      AND notebook_level = 'silver'
    LIMIT 1;
    
    IF existing_silver_id IS NULL THEN
        -- No Silver notebook exists - check if we have enough words to create one
        total_failed_words := array_length(p_failed_word_ids, 1);
        
        IF total_failed_words >= batch_size THEN
            -- Create Silver notebook
            SELECT * INTO new_silver_id FROM create_silver_notebook(p_notebook_id);
            
            -- Migrate first 20 words
            words_to_migrate := p_failed_word_ids[1:batch_size];
            PERFORM migrate_words_to_silver(p_notebook_id, new_silver_id, words_to_migrate);
            
            RETURN QUERY SELECT TRUE, new_silver_id, batch_size;
        ELSE
            -- Not enough words yet - store them for later batching
            -- For now, just mark them as failed but don't migrate
            RETURN QUERY SELECT FALSE, NULL::UUID, 0;
        END IF;
    ELSE
        -- Silver notebook exists - add words to next available page
        PERFORM migrate_words_to_silver(p_notebook_id, existing_silver_id, p_failed_word_ids);
        
        RETURN QUERY SELECT FALSE, existing_silver_id, array_length(p_failed_word_ids, 1);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant permissions
GRANT EXECUTE ON FUNCTION get_notebook_round4_failures(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_bronze_round4_failures(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_silver_notebook(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_gold_notebook(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_words_to_silver(UUID, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_words_to_gold(UUID, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_gold_failures(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pages_due_for_review(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION update_page_after_review(UUID, INTEGER, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION collect_and_migrate_failed_words(UUID, UUID[]) TO authenticated;

-- 12. Add word_status enum value for super hard words (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'word_status') THEN
        CREATE TYPE word_status AS ENUM ('learning', 'mastered', 'failed', 'super_hard');
    ELSE
        ALTER TYPE word_status ADD VALUE IF NOT EXISTS 'super_hard';
        ALTER TYPE word_status ADD VALUE IF NOT EXISTS 'failed';
    END IF;
END $$;