-- =============================================
-- FIX MIGRATION STATUS ENUM ISSUE
-- Run this SQL in Supabase SQL Editor to fix the 'archived' status issue
-- =============================================

-- Update the migration functions to use 'failed' instead of 'archived'

-- 1. Fix migrate_words_to_silver function
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
    page_number INTEGER := 1;
BEGIN
    -- Get Silver notebook details
    SELECT * INTO silver_notebook FROM notebooks WHERE id = p_silver_notebook_id;
    
    -- Create first page in Silver notebook
    INSERT INTO pages (
        notebook_id,
        page_number,
        date_created,
        target_round
    ) VALUES (
        p_silver_notebook_id,
        page_number,
        CURRENT_DATE,
        '1'::round_number
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
            page_number := page_number + 1;
            words_in_current_page := 0;
            
            -- Create new page
            INSERT INTO pages (
                notebook_id,
                page_number,
                date_created,
                target_round
            ) VALUES (
                p_silver_notebook_id,
                page_number,
                CURRENT_DATE,
                '1'::round_number
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

-- 2. Fix migrate_words_to_gold function
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
    page_number INTEGER := 1;
BEGIN
    -- Get Gold notebook details
    SELECT * INTO gold_notebook FROM notebooks WHERE id = p_gold_notebook_id;
    
    -- Create first page in Gold notebook
    INSERT INTO pages (
        notebook_id,
        page_number,
        date_created,
        target_round
    ) VALUES (
        p_gold_notebook_id,
        page_number,
        CURRENT_DATE,
        '1'::round_number
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
            page_number := page_number + 1;
            words_in_current_page := 0;
            
            -- Create new page
            INSERT INTO pages (
                notebook_id,
                page_number,
                date_created,
                target_round
            ) VALUES (
                p_gold_notebook_id,
                page_number,
                CURRENT_DATE,
                '1'::round_number
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

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION migrate_words_to_silver(UUID, UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_words_to_gold(UUID, UUID, UUID[]) TO authenticated;

-- 4. Test that the functions work
SELECT 'Migration functions updated successfully! Ready to test Bronze→Silver→Gold progression.' as status;