-- =============================================
-- STEP 3: CREATE SIMPLIFIED FUNCTIONS
-- Run this AFTER step2_migrate_data.sql has been completed
-- =============================================

-- Update word review function to handle 12 rounds
CREATE OR REPLACE FUNCTION update_word_review_result(
  p_word_id UUID,
  p_remembered BOOLEAN,
  p_current_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  success BOOLEAN,
  new_round INTEGER,
  new_status TEXT,
  review_date DATE,
  is_mastered BOOLEAN
) AS $$
DECLARE
  word_record RECORD;
  next_round INTEGER;
  next_review_date DATE;
  new_word_status TEXT;
  mastered BOOLEAN := FALSE;
BEGIN
  -- Get current word state
  SELECT current_round, status, times_reviewed
  INTO word_record
  FROM words 
  WHERE id = p_word_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'not_found'::TEXT, NULL::DATE, FALSE;
    RETURN;
  END IF;
  
  -- Calculate next state based on review result
  IF p_remembered THEN
    -- Word remembered - mastered
    new_word_status := 'mastered';
    next_round := word_record.current_round;
    next_review_date := NULL;
    mastered := TRUE;
  ELSE
    -- Word forgotten - advance to next round
    next_round := word_record.current_round + 1;
    
    IF next_round > 12 THEN
      -- Even Gold Round 4 failures become mastered (max difficulty reached)
      new_word_status := 'mastered';
      next_review_date := NULL;
      mastered := TRUE;
      next_round := 12;  -- Cap at round 12
    ELSE
      -- Continue learning at next round
      new_word_status := 'learning';
      next_review_date := p_current_date + INTERVAL '14 days';
      mastered := FALSE;
    END IF;
  END IF;
  
  -- Update the word
  UPDATE words
  SET 
    current_round = next_round::round_number,
    status = new_word_status,
    review_date = next_review_date,
    last_reviewed = p_current_date,
    times_reviewed = COALESCE(word_record.times_reviewed, 0) + 1,
    is_mastered = mastered,
    updated_at = NOW()
  WHERE id = p_word_id;
  
  -- Return the result
  RETURN QUERY SELECT TRUE, next_round, new_word_status, next_review_date, mastered;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_word_review_result(UUID, BOOLEAN, DATE) TO authenticated;

-- Success message
SELECT 'Step 3 complete: Simplified functions created' as result;