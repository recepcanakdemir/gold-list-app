-- =============================================
-- FIX RLS POLICIES AND CLEANUP
-- Run this to fix the page creation RLS issue
-- =============================================

-- Drop and recreate RLS policy for pages (remove badge_id references)
DROP POLICY IF EXISTS "Users can manage their own pages" ON pages;

-- Create simplified RLS policy without badge_id references
CREATE POLICY "Users can manage their own pages" ON pages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM notebooks 
    WHERE notebooks.id = pages.notebook_id 
    AND notebooks.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM notebooks 
    WHERE notebooks.id = pages.notebook_id 
    AND notebooks.user_id = auth.uid()
  )
);

-- Also ensure the pages table constraint is correct after badge_id removal
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_notebook_id_fkey;
ALTER TABLE pages ADD CONSTRAINT pages_notebook_id_fkey 
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE;

-- Success message
SELECT 'RLS policies fixed for pages table' as result;