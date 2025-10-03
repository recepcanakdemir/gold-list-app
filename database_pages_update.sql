-- =============================================
-- ADD PAGE UNLOCKING SYSTEM
-- Run this SQL in Supabase SQL Editor after the main migration
-- =============================================

-- Add unlocking fields to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS is_unlocked BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS unlock_date DATE;

-- Update existing pages to be unlocked (for backwards compatibility)
UPDATE pages SET is_unlocked = true, unlock_date = date_created WHERE is_unlocked = false;

-- Create function to auto-generate 200 pages when creating a notebook
CREATE OR REPLACE FUNCTION create_notebook_with_pages(
    p_user_id UUID,
    p_title TEXT,
    p_language TEXT,
    p_language_code TEXT,
    p_words_per_day INTEGER DEFAULT 20
) RETURNS notebooks AS $$
DECLARE
    new_notebook notebooks%ROWTYPE;
    current_date DATE := CURRENT_DATE;
    i INTEGER;
BEGIN
    -- Create the notebook
    INSERT INTO notebooks (
        user_id,
        title,
        language,
        language_code,
        words_per_day,
        notebook_level,
        settings
    ) VALUES (
        p_user_id,
        p_title,
        p_language,
        p_language_code,
        p_words_per_day,
        'bronze'::notebook_level_enum,
        '{}'::jsonb
    ) RETURNING * INTO new_notebook;
    
    -- Create 200 pages
    FOR i IN 1..200 LOOP
        INSERT INTO pages (
            notebook_id,
            page_number,
            date_created,
            target_round,
            words_count,
            is_completed,
            is_unlocked,
            unlock_date,
            next_review_date
        ) VALUES (
            new_notebook.id,
            i,
            current_date,
            '1'::round_number,
            0,
            false,
            CASE 
                WHEN i = 1 THEN true  -- First page is unlocked
                ELSE false            -- All others locked initially
            END,
            CASE 
                WHEN i = 1 THEN current_date  -- First page unlocks today
                ELSE current_date + (i - 1)   -- Each subsequent page unlocks one day later
            END,
            null
        );
    END LOOP;
    
    RETURN new_notebook;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to unlock today's page for a user
CREATE OR REPLACE FUNCTION unlock_todays_page(
    p_user_id UUID
) RETURNS SETOF pages AS $$
BEGIN
    -- Unlock all pages that should be unlocked today or before
    UPDATE pages 
    SET is_unlocked = true 
    WHERE unlock_date <= CURRENT_DATE 
      AND is_unlocked = false
      AND notebook_id IN (
          SELECT id FROM notebooks WHERE user_id = p_user_id
      );
    
    -- Return the newly unlocked pages
    RETURN QUERY
    SELECT p.* FROM pages p
    JOIN notebooks n ON p.notebook_id = n.id
    WHERE n.user_id = p_user_id
      AND p.unlock_date = CURRENT_DATE
      AND p.is_unlocked = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current unlocked page for a notebook
CREATE OR REPLACE FUNCTION get_current_page(
    p_notebook_id UUID
) RETURNS pages AS $$
DECLARE
    current_page pages%ROWTYPE;
BEGIN
    -- First, unlock any pages that should be unlocked
    UPDATE pages 
    SET is_unlocked = true 
    WHERE unlock_date <= CURRENT_DATE 
      AND is_unlocked = false
      AND notebook_id = p_notebook_id;
    
    -- Get the highest unlocked page that's not completed
    SELECT * INTO current_page
    FROM pages
    WHERE notebook_id = p_notebook_id
      AND is_unlocked = true
      AND is_completed = false
    ORDER BY page_number ASC
    LIMIT 1;
    
    -- If no incomplete unlocked page, get the next unlocked page
    IF current_page.id IS NULL THEN
        SELECT * INTO current_page
        FROM pages
        WHERE notebook_id = p_notebook_id
          AND is_unlocked = true
        ORDER BY page_number DESC
        LIMIT 1;
    END IF;
    
    RETURN current_page;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_notebook_with_pages TO authenticated;
GRANT EXECUTE ON FUNCTION unlock_todays_page TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_page TO authenticated;