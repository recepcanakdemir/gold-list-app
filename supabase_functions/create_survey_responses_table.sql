-- Create user_survey_responses table for storing onboarding survey data
-- This enables data analysis and app improvements while maintaining privacy compliance

CREATE TABLE IF NOT EXISTS user_survey_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Survey responses (matching current SurveyContext interface)
  hear_about_us TEXT,
  target_language TEXT,
  current_level TEXT, -- A1, A2, B1, B2, C1, C2
  biggest_challenge TEXT,
  memory_assessment TEXT,
  goldlist_experience TEXT,
  unknown_words_daily INTEGER,
  word_sources TEXT[], -- Array for multi-select (Books, Movies, etc.)
  learning_reasons TEXT[], -- Array for multi-select (Education, Career, etc.)
  
  -- Metadata
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  app_version TEXT DEFAULT '1.0.0',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  
  -- Privacy compliance
  consent_given BOOLEAN DEFAULT FALSE,
  data_retention_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 years'),
  
  -- Ensure one survey response per user
  UNIQUE(user_id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) for privacy protection
ALTER TABLE user_survey_responses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own survey responses
CREATE POLICY "Users can view their own survey responses" ON user_survey_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey responses" ON user_survey_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey responses" ON user_survey_responses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own survey responses" ON user_survey_responses
  FOR DELETE USING (auth.uid() = user_id);

-- Admin policy for analytics (optional - for future admin dashboard)
-- CREATE POLICY "Admins can view all survey responses" ON user_survey_responses
--   FOR SELECT USING (auth.jwt() ->> 'email' IN ('admin@goldlist.com'));

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_survey_responses_user_id ON user_survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_survey_responses_completed_at ON user_survey_responses(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_survey_responses_target_language ON user_survey_responses(target_language);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_survey_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_survey_responses_updated_at
  BEFORE UPDATE ON user_survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_user_survey_responses_updated_at();

-- Function to clean up expired survey data (for privacy compliance)
CREATE OR REPLACE FUNCTION cleanup_expired_survey_data()
RETURNS void AS $$
BEGIN
  DELETE FROM user_survey_responses 
  WHERE data_retention_expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-surveys', '0 2 * * *', 'SELECT cleanup_expired_survey_data();');

COMMENT ON TABLE user_survey_responses IS 'Stores user onboarding survey responses for app improvement and personalization';
COMMENT ON COLUMN user_survey_responses.consent_given IS 'User explicitly consented to data collection';
COMMENT ON COLUMN user_survey_responses.data_retention_expires_at IS 'When this data should be automatically deleted for privacy compliance';