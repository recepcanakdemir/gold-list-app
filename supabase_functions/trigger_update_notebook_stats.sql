-- Trigger for updating notebook statistics when words change
CREATE OR REPLACE TRIGGER update_notebook_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON words
  FOR EACH ROW
  EXECUTE FUNCTION update_notebook_stats();