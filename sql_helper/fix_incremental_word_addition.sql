-- Fix incremental word addition by properly handling page completion
-- Run this SQL in your Supabase SQL editor

-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS update_page_with_completion_check(uuid,integer,integer);

-- Create function to update page with proper completion logic
CREATE OR REPLACE FUNCTION update_page_with_completion_check(
    p_page_id UUID,
    p_daily_limit INTEGER,
    p_added_words_count INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_words INTEGER;
    v_is_completed BOOLEAN;
    v_review_date DATE;
    v_result JSON;
BEGIN
    -- Get the total count of words for this page
    SELECT COUNT(*) INTO v_total_words
    FROM words 
    WHERE page_id = p_page_id;
    
    -- Determine if page should be completed based on daily limit
    v_is_completed := v_total_words >= p_daily_limit;
    
    -- Set review date only if page is completed
    IF v_is_completed THEN
        v_review_date := CURRENT_DATE + INTERVAL '14 days';
    ELSE
        v_review_date := NULL;
    END IF;
    
    -- Update the page with correct stats
    UPDATE pages 
    SET 
        words_count = v_total_words,
        is_completed = v_is_completed,
        next_review_date = v_review_date,
        updated_at = NOW()
    WHERE id = p_page_id;
    
    -- Log for debugging
    RAISE LOG 'Page % updated: total_words=%, daily_limit=%, completed=%, review_date=%', 
        p_page_id, v_total_words, p_daily_limit, v_is_completed, v_review_date;
    
    -- Return debug information
    v_result := json_build_object(
        'page_id', p_page_id,
        'total_words', v_total_words,
        'daily_limit', p_daily_limit,
        'is_completed', v_is_completed,
        'review_date', v_review_date,
        'added_words_count', p_added_words_count
    );
    
    RETURN v_result;
END;
$$;