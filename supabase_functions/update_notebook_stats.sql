-- Update notebook statistics trigger function
CREATE OR REPLACE FUNCTION update_notebook_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function is called after words are inserted, updated, or deleted
  -- It could update computed statistics if needed, but for now we use real-time queries
  
  -- Update the notebook's updated_at timestamp
  UPDATE notebooks 
  SET updated_at = NOW() 
  WHERE id = COALESCE(NEW.notebook_id, OLD.notebook_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;