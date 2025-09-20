-- Trigger for updating user statistics when words change
CREATE OR REPLACE TRIGGER update_user_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON words
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats();