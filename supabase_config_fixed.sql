-- =============================================
-- GOLD LIST METHOD APP - SUPABASE CONFIGURATION (FIXED ORDER)
-- =============================================
-- Copy and paste these SQL queries into your Supabase SQL Editor
-- Run them in order to set up the complete database schema

-- =============================================
-- 1. CREATE ENUMS FIRST
-- =============================================

CREATE TYPE subscription_status AS ENUM ('free', 'weekly', 'annual');
CREATE TYPE notebook_level_enum AS ENUM ('bronze', 'silver', 'gold');
CREATE TYPE word_status AS ENUM ('learning', 'mastered', 'failed');
CREATE TYPE round_number AS ENUM ('1', '2', '3', '4');

-- =============================================
-- 2. CREATE TABLES
-- =============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    subscription_status subscription_status DEFAULT 'free' NOT NULL,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    subscription_transaction_id TEXT,
    streak_count INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    total_words_added INTEGER DEFAULT 0 NOT NULL,
    total_words_mastered INTEGER DEFAULT 0 NOT NULL,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
    preferences JSONB DEFAULT '{}' NOT NULL
);

-- Notebooks table
CREATE TABLE IF NOT EXISTS notebooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    language_code TEXT NOT NULL,
    notebook_level notebook_level_enum DEFAULT 'bronze' NOT NULL,
    words_per_day INTEGER DEFAULT 20 NOT NULL,
    review_interval_days INTEGER DEFAULT 14 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    settings JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Words table
CREATE TABLE IF NOT EXISTS words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
    word TEXT NOT NULL,
    translation TEXT NOT NULL,
    example_sentence TEXT,
    notes TEXT,
    current_round INTEGER DEFAULT 1 NOT NULL CHECK (current_round >= 1 AND current_round <= 4),
    is_mastered BOOLEAN DEFAULT FALSE NOT NULL,
    review_date DATE NOT NULL,
    last_reviewed DATE,
    times_reviewed INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Subscription logs table
CREATE TABLE IF NOT EXISTS subscription_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status subscription_status NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    transaction_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. CREATE RLS POLICIES
-- =============================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Notebooks policies
CREATE POLICY "Users can view own notebooks" ON notebooks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notebooks" ON notebooks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notebooks" ON notebooks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notebooks" ON notebooks
    FOR DELETE USING (auth.uid() = user_id);

-- Words policies
CREATE POLICY "Users can view words in own notebooks" ON words
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM notebooks 
            WHERE notebooks.id = words.notebook_id 
            AND notebooks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert words in own notebooks" ON words
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM notebooks 
            WHERE notebooks.id = words.notebook_id 
            AND notebooks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update words in own notebooks" ON words
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM notebooks 
            WHERE notebooks.id = words.notebook_id 
            AND notebooks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete words in own notebooks" ON words
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM notebooks 
            WHERE notebooks.id = words.notebook_id 
            AND notebooks.user_id = auth.uid()
        )
    );

-- Subscription logs policies
CREATE POLICY "Users can view own subscription logs" ON subscription_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscription logs" ON subscription_logs
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_user_active ON notebooks(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_words_notebook_id ON words(notebook_id);
CREATE INDEX IF NOT EXISTS idx_words_review_date ON words(review_date);
CREATE INDEX IF NOT EXISTS idx_words_notebook_mastered ON words(notebook_id, is_mastered);
CREATE INDEX IF NOT EXISTS idx_subscription_logs_user_id ON subscription_logs(user_id);

-- =============================================
-- 6. CREATE BASIC FUNCTIONS
-- =============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (
        id,
        email,
        display_name,
        subscription_status,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        'free',
        NOW(),
        NOW()
    );
    
    RETURN NEW;
END;
$$;

-- =============================================
-- 7. CREATE TRIGGERS
-- =============================================

-- Trigger for updating updated_at on profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updating updated_at on notebooks
CREATE OR REPLACE TRIGGER update_notebooks_updated_at
    BEFORE UPDATE ON notebooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updating updated_at on words
CREATE OR REPLACE TRIGGER update_words_updated_at
    BEFORE UPDATE ON words
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 8. ENABLE REALTIME (AFTER TABLES ARE CREATED)
-- =============================================

-- Enable realtime for live updates
ALTER publication supabase_realtime ADD TABLE profiles;
ALTER publication supabase_realtime ADD TABLE notebooks;
ALTER publication supabase_realtime ADD TABLE words;
ALTER publication supabase_realtime ADD TABLE subscription_logs;

-- =============================================
-- 9. GRANT PERMISSIONS
-- =============================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant permissions to anon users (for sign up)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT ON profiles TO anon;

COMMIT;