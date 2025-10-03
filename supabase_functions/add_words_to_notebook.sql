-- Add multiple words to a notebook
CREATE OR REPLACE FUNCTION add_words_to_notebook(
  p_notebook_id uuid,
  p_words jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  word_record jsonb;
  words_added integer := 0;
  review_date date;
BEGIN
  -- Check if user owns this notebook
  IF NOT EXISTS (
    SELECT 1 FROM notebooks 
    WHERE id = p_notebook_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Notebook not found or access denied';
  END IF;
  
  -- Calculate review date (14 days from now)  
  review_date := CURRENT_DATE + INTERVAL '14 days';
  
  -- Insert each word
  FOR word_record IN SELECT * FROM jsonb_array_elements(p_words)
  LOOP
    INSERT INTO words (
      notebook_id,
      word,
      translation,
      example_sentence,
      notes,
      current_round,
      review_date
    ) VALUES (
      p_notebook_id,
      word_record->>'word',
      word_record->>'translation',
      NULLIF(word_record->>'example_sentence', ''),
      NULLIF(word_record->>'notes', ''),
      1,
      review_date
    );
    
    words_added := words_added + 1;
  END LOOP;
  
  -- Update notebook's updated_at timestamp
  UPDATE notebooks 
  SET updated_at = NOW() 
  WHERE id = p_notebook_id;
  
  RETURN words_added;
END;
$$;