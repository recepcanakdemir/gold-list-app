-- Delete notebook and all associated words
CREATE OR REPLACE FUNCTION delete_notebook(p_notebook_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user owns this notebook
  IF NOT EXISTS (
    SELECT 1 FROM notebooks 
    WHERE id = p_notebook_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Notebook not found or access denied';
  END IF;
  
  -- Delete all words in the notebook first (cascade will handle this, but explicit is better)
  DELETE FROM words WHERE notebook_id = p_notebook_id;
  
  -- Delete the notebook
  DELETE FROM notebooks WHERE id = p_notebook_id AND user_id = auth.uid();
END;
$$;