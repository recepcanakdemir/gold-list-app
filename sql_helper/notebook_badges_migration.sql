-- Migration: Create notebook_badges system for Silver/Gold progression
-- This implements page-based badge system instead of full notebooks for Silver/Gold

-- 1. Create notebook_badges table
CREATE TABLE IF NOT EXISTS notebook_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bronze_notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('silver', 'gold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_words INTEGER DEFAULT 0,
  active_pages_count INTEGER DEFAULT 0,
  
  -- Ensure each Bronze notebook can only have one Silver and one Gold badge
  UNIQUE(bronze_notebook_id, badge_type)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notebook_badges_bronze_id ON notebook_badges(bronze_notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_badges_type ON notebook_badges(badge_type);

-- 3. Update pages table to support both notebooks and badges
ALTER TABLE pages ADD COLUMN IF NOT EXISTS badge_id UUID REFERENCES notebook_badges(id) ON DELETE CASCADE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS review_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accumulating';

-- 4. Add constraint to ensure pages belong to either notebook OR badge (not both)
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_reference_check;
ALTER TABLE pages ADD CONSTRAINT pages_reference_check 
  CHECK (
    (notebook_id IS NOT NULL AND badge_id IS NULL) OR 
    (notebook_id IS NULL AND badge_id IS NOT NULL)
  );

-- 5. Create indexes for badge pages
CREATE INDEX IF NOT EXISTS idx_pages_badge_id ON pages(badge_id);
CREATE INDEX IF NOT EXISTS idx_pages_review_date ON pages(review_date);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);

-- 6. Update pages updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for notebook_badges
DROP TRIGGER IF EXISTS update_notebook_badges_updated_at ON notebook_badges;
CREATE TRIGGER update_notebook_badges_updated_at 
  BEFORE UPDATE ON notebook_badges 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Create function to get badges for a Bronze notebook
CREATE OR REPLACE FUNCTION get_notebook_badges(p_bronze_notebook_id UUID)
RETURNS TABLE(
  id UUID,
  badge_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  total_words INTEGER,
  active_pages_count INTEGER,
  reviewable_pages_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nb.id,
    nb.badge_type,
    nb.created_at,
    nb.total_words,
    nb.active_pages_count,
    COALESCE(
      (SELECT COUNT(*) 
       FROM pages p 
       WHERE p.badge_id = nb.id 
       AND p.review_date IS NOT NULL 
       AND p.review_date <= NOW()
      ), 0
    ) as reviewable_pages_count
  FROM notebook_badges nb
  WHERE nb.bronze_notebook_id = p_bronze_notebook_id
  ORDER BY nb.badge_type;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get reviewable badge pages
CREATE OR REPLACE FUNCTION get_reviewable_badge_pages(p_badge_id UUID)
RETURNS TABLE(
  page_id UUID,
  page_number INTEGER,
  review_date TIMESTAMP WITH TIME ZONE,
  words_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as page_id,
    p.page_number,
    p.review_date,
    p.words_count
  FROM pages p
  WHERE p.badge_id = p_badge_id
  AND p.review_date IS NOT NULL
  AND p.review_date <= NOW()
  AND p.status = 'ready_for_review'
  ORDER BY p.review_date, p.page_number;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to create a new badge
CREATE OR REPLACE FUNCTION create_notebook_badge(
  p_bronze_notebook_id UUID,
  p_badge_type TEXT
)
RETURNS UUID AS $$
DECLARE
  new_badge_id UUID;
BEGIN
  -- Create the badge
  INSERT INTO notebook_badges (bronze_notebook_id, badge_type)
  VALUES (p_bronze_notebook_id, p_badge_type)
  RETURNING id INTO new_badge_id;
  
  RETURN new_badge_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to add words to badge and manage page completion
CREATE OR REPLACE FUNCTION add_words_to_badge(
  p_badge_id UUID,
  p_words UUID[]
)
RETURNS TABLE(
  page_id UUID,
  page_completed BOOLEAN,
  review_date_set TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_page_id UUID;
  current_words_count INTEGER;
  words_to_add INTEGER;
  new_review_date TIMESTAMP WITH TIME ZONE;
BEGIN
  words_to_add := array_length(p_words, 1);
  
  -- Get or create current accumulating page
  SELECT p.id, p.words_count 
  INTO current_page_id, current_words_count
  FROM pages p 
  WHERE p.badge_id = p_badge_id 
  AND p.status = 'accumulating'
  ORDER BY p.page_number DESC
  LIMIT 1;
  
  -- If no accumulating page exists, create one
  IF current_page_id IS NULL THEN
    INSERT INTO pages (
      badge_id, 
      page_number, 
      words_count, 
      status,
      date_created
    )
    SELECT 
      p_badge_id,
      COALESCE(MAX(p.page_number), 0) + 1,
      0,
      'accumulating',
      NOW()
    FROM pages p 
    WHERE p.badge_id = p_badge_id
    RETURNING id, words_count INTO current_page_id, current_words_count;
  END IF;
  
  -- Update words to point to this page
  UPDATE words 
  SET page_id = current_page_id 
  WHERE id = ANY(p_words);
  
  -- Update page words count
  UPDATE pages 
  SET words_count = current_words_count + words_to_add
  WHERE id = current_page_id;
  
  -- Check if page is now complete (20 words)
  IF current_words_count + words_to_add >= 20 THEN
    new_review_date := NOW() + INTERVAL '14 days';
    
    UPDATE pages 
    SET 
      status = 'ready_for_review',
      review_date = new_review_date
    WHERE id = current_page_id;
    
    -- Update badge stats
    UPDATE notebook_badges 
    SET 
      total_words = total_words + words_to_add,
      active_pages_count = active_pages_count + 1
    WHERE id = p_badge_id;
    
    RETURN QUERY SELECT current_page_id, true, new_review_date;
  ELSE
    -- Update badge word count
    UPDATE notebook_badges 
    SET total_words = total_words + words_to_add
    WHERE id = p_badge_id;
    
    RETURN QUERY SELECT current_page_id, false, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 11. Comments for documentation
COMMENT ON TABLE notebook_badges IS 'Badge system for Silver/Gold progression - simpler than full notebooks';
COMMENT ON COLUMN notebook_badges.bronze_notebook_id IS 'Reference to the Bronze notebook this badge belongs to';
COMMENT ON COLUMN notebook_badges.badge_type IS 'Either silver or gold badge type';
COMMENT ON COLUMN pages.badge_id IS 'Reference to badge for Silver/Gold pages (mutually exclusive with notebook_id)';
COMMENT ON COLUMN pages.review_date IS 'Page-level review date for Silver/Gold badges (when all 20 words are reviewed together)';
COMMENT ON COLUMN pages.status IS 'Page status: accumulating (<20 words), ready_for_review (20 words, future date), reviewable (20 words, date passed)';

-- Success message
SELECT 'Notebook badges migration completed successfully' as result;