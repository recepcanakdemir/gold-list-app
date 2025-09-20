-- =============================================
-- GOLD LIST METHOD APP - SUPABASE CONFIGURATION
-- =============================================
-- Copy and paste these SQL queries into your Supabase SQL Editor
-- Run them in order to set up the complete database schema

-- =============================================
-- 1. ENABLE ROW LEVEL SECURITY AND EXTENSIONS
-- =============================================

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Enable realtime for live updates
ALTER publication supabase_realtime ADD TABLE profiles;
ALTER publication supabase_realtime ADD TABLE notebooks;
ALTER publication supabase_realtime ADD TABLE pages;
ALTER publication supabase_realtime ADD TABLE words;
ALTER publication supabase_realtime ADD TABLE reviews;

-- =============================================
-- 2. CREATE ENUMS
-- =============================================

CREATE TYPE subscription_status AS ENUM ('free', 'weekly', 'annual');
CREATE TYPE notebook_level AS ENUM ('bronze', 'silver', 'gold');
CREATE TYPE word_status AS ENUM ('learning', 'mastered', 'failed');
CREATE TYPE round_number AS ENUM ('1', '2', '3', '4');

-- =============================================
-- 3. CREATE TABLES
-- =============================================

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    subscription_status subscription_status DEFAULT 'free' NOT NULL,
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    stripe_customer_id TEXT,
    streak_count INTEGER DEFAULT 0 NOT NULL,
    total_words_added INTEGER DEFAULT 0 NOT NULL,
    total_words_mastered INTEGER DEFAULT 0 NOT NULL,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL,
    preferences JSONB DEFAULT '{}' NOT NULL
);

-- Notebooks table
CREATE TABLE notebooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    language TEXT NOT NULL,
    language_code TEXT NOT NULL, -- ISO 639-1 code (e.g., 'en', 'es', 'fr')
    notebook_level notebook_level DEFAULT 'bronze' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    words_per_day INTEGER DEFAULT 20 NOT NULL CHECK (words_per_day > 0 AND words_per_day <= 50),
    review_interval_days INTEGER DEFAULT 14 NOT NULL CHECK (review_interval_days > 0),
    total_words INTEGER DEFAULT 0 NOT NULL,
    mastered_words INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    settings JSONB DEFAULT '{}' NOT NULL
);

-- Pages table (daily word entry sessions)
CREATE TABLE pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    date_created DATE DEFAULT CURRENT_DATE NOT NULL,
    target_round INTEGER DEFAULT 1 NOT NULL CHECK (target_round >= 1 AND target_round <= 4),
    words_count INTEGER DEFAULT 0 NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    next_review_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    UNIQUE(notebook_id, page_number)
);

-- Words table
CREATE TABLE words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    notes TEXT,
    image_url TEXT,
    pronunciation TEXT,
    example_sentence TEXT,
    current_round INTEGER DEFAULT 1 NOT NULL CHECK (current_round >= 1 AND current_round <= 4),
    status word_status DEFAULT 'learning' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    position_in_page INTEGER NOT NULL,
    times_reviewed INTEGER DEFAULT 0 NOT NULL,
    times_remembered INTEGER DEFAULT 0 NOT NULL,
    times_forgotten INTEGER DEFAULT 0 NOT NULL,
    
    UNIQUE(page_id, position_in_page)
);

-- Reviews table (tracks word progression through rounds)
CREATE TABLE reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE NOT NULL,
    round INTEGER NOT NULL CHECK (round >= 1 AND round <= 4),
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    remembered BOOLEAN NOT NULL,
    next_review_date DATE,
    response_time_ms INTEGER CHECK (response_time_ms >= 0),
    session_id UUID, -- To group reviews from the same session
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Daily progress tracking
CREATE TABLE daily_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    words_added INTEGER DEFAULT 0 NOT NULL,
    words_reviewed INTEGER DEFAULT 0 NOT NULL,
    words_remembered INTEGER DEFAULT 0 NOT NULL,
    words_forgotten INTEGER DEFAULT 0 NOT NULL,
    session_duration_minutes INTEGER DEFAULT 0 NOT NULL,
    notebooks_practiced TEXT[] DEFAULT '{}', -- Array of notebook IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    UNIQUE(user_id, date)
);

-- =============================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_subscription ON profiles(subscription_status);
CREATE INDEX idx_profiles_last_activity ON profiles(last_activity_date);

-- Notebooks indexes
CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX idx_notebooks_level ON notebooks(notebook_level);
CREATE INDEX idx_notebooks_active ON notebooks(is_active);
CREATE INDEX idx_notebooks_user_active ON notebooks(user_id, is_active);

-- Pages indexes
CREATE INDEX idx_pages_notebook_id ON pages(notebook_id);
CREATE INDEX idx_pages_review_date ON pages(next_review_date);
CREATE INDEX idx_pages_notebook_number ON pages(notebook_id, page_number);
CREATE INDEX idx_pages_due_reviews ON pages(next_review_date) WHERE next_review_date <= CURRENT_DATE AND is_completed = TRUE;

-- Words indexes
CREATE INDEX idx_words_page_id ON words(page_id);
CREATE INDEX idx_words_status ON words(status);
CREATE INDEX idx_words_round ON words(current_round);
CREATE INDEX idx_words_page_position ON words(page_id, position_in_page);

-- Reviews indexes
CREATE INDEX idx_reviews_word_id ON reviews(word_id);
CREATE INDEX idx_reviews_date ON reviews(reviewed_at);
CREATE INDEX idx_reviews_round ON reviews(round);
CREATE INDEX idx_reviews_session ON reviews(session_id);

-- Daily progress indexes
CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, date);
CREATE INDEX idx_daily_progress_date ON daily_progress(date);

-- =============================================
-- 5. CREATE FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate next review date
CREATE OR REPLACE FUNCTION calculate_next_review_date(current_round INTEGER, interval_days INTEGER DEFAULT 14)
RETURNS DATE AS $$
BEGIN
    RETURN CURRENT_DATE + (interval_days * current_round);
END;
$$ language 'plpgsql';

-- Function to update notebook stats
CREATE OR REPLACE FUNCTION update_notebook_stats()
RETURNS TRIGGER AS $$
DECLARE
    notebook_id_var UUID;
    total_count INTEGER;
    mastered_count INTEGER;
BEGIN
    -- Get notebook_id from the word's page
    IF TG_OP = 'DELETE' THEN
        SELECT p.notebook_id INTO notebook_id_var 
        FROM pages p WHERE p.id = OLD.page_id;
    ELSE
        SELECT p.notebook_id INTO notebook_id_var 
        FROM pages p WHERE p.id = NEW.page_id;
    END IF;
    
    -- Calculate new stats
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'mastered')
    INTO total_count, mastered_count
    FROM words w
    JOIN pages p ON w.page_id = p.id
    WHERE p.notebook_id = notebook_id_var;
    
    -- Update notebook
    UPDATE notebooks SET 
        total_words = total_count,
        mastered_words = mastered_count,
        updated_at = NOW()
    WHERE id = notebook_id_var;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update page word count
CREATE OR REPLACE FUNCTION update_page_word_count()
RETURNS TRIGGER AS $$
DECLARE
    page_id_var UUID;
    word_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        page_id_var := OLD.page_id;
    ELSE
        page_id_var := NEW.page_id;
    END IF;
    
    SELECT COUNT(*) INTO word_count 
    FROM words WHERE page_id = page_id_var;
    
    UPDATE pages SET 
        words_count = word_count,
        updated_at = NOW()
    WHERE id = page_id_var;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
DECLARE
    user_id_var UUID;
    total_added INTEGER;
    total_mastered INTEGER;
BEGIN
    -- Get user_id from notebook
    SELECT user_id INTO user_id_var 
    FROM notebooks n
    JOIN pages p ON n.id = p.notebook_id
    WHERE p.id = COALESCE(NEW.page_id, OLD.page_id);
    
    -- Calculate new stats
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE w.status = 'mastered')
    INTO total_added, total_mastered
    FROM words w
    JOIN pages p ON w.page_id = p.id
    JOIN notebooks n ON p.notebook_id = n.id
    WHERE n.user_id = user_id_var;
    
    -- Update profile
    UPDATE profiles SET 
        total_words_added = total_added,
        total_words_mastered = total_mastered,
        updated_at = NOW()
    WHERE id = user_id_var;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Function to process word review
CREATE OR REPLACE FUNCTION process_word_review(
    p_word_id UUID,
    p_remembered BOOLEAN,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    word_record words%ROWTYPE;
    new_round INTEGER;
    new_status word_status;
    next_review DATE;
    result JSON;
BEGIN
    -- Get current word data
    SELECT * INTO word_record FROM words WHERE id = p_word_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Word not found';
    END IF;
    
    -- Insert review record
    INSERT INTO reviews (word_id, round, remembered, response_time_ms, session_id)
    VALUES (p_word_id, word_record.current_round, p_remembered, p_response_time_ms, p_session_id);
    
    -- Update word stats
    UPDATE words SET 
        times_reviewed = times_reviewed + 1,
        times_remembered = times_remembered + CASE WHEN p_remembered THEN 1 ELSE 0 END,
        times_forgotten = times_forgotten + CASE WHEN p_remembered THEN 0 ELSE 1 END
    WHERE id = p_word_id;
    
    -- Determine next status and round
    IF p_remembered THEN
        new_status := 'mastered';
        new_round := word_record.current_round;
        next_review := NULL;
    ELSE
        new_status := 'learning';
        new_round := LEAST(word_record.current_round + 1, 4);
        
        IF new_round > 4 THEN
            new_status := 'failed';
            next_review := NULL;
        ELSE
            next_review := calculate_next_review_date(new_round);
        END IF;
    END IF;
    
    -- Update word
    UPDATE words SET 
        current_round = new_round,
        status = new_status,
        updated_at = NOW()
    WHERE id = p_word_id;
    
    -- Return result
    SELECT json_build_object(
        'word_id', p_word_id,
        'remembered', p_remembered,
        'new_round', new_round,
        'new_status', new_status,
        'next_review_date', next_review
    ) INTO result;
    
    RETURN result;
END;
$$ language 'plpgsql';

-- =============================================
-- 6. CREATE TRIGGERS
-- =============================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON notebooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_words_updated_at BEFORE UPDATE ON words
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_progress_updated_at BEFORE UPDATE ON daily_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Stats update triggers
CREATE TRIGGER update_notebook_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON words
    FOR EACH ROW EXECUTE FUNCTION update_notebook_stats();

CREATE TRIGGER update_page_word_count_trigger
    AFTER INSERT OR DELETE ON words
    FOR EACH ROW EXECUTE FUNCTION update_page_word_count();

CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON words
    FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- =============================================
-- 7. ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users can insert own notebooks" ON notebooks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notebooks" ON notebooks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notebooks" ON notebooks
    FOR DELETE USING (auth.uid() = user_id);

-- Pages policies
CREATE POLICY "Users can view own pages" ON pages
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM notebooks WHERE id = pages.notebook_id
        )
    );

CREATE POLICY "Users can insert own pages" ON pages
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM notebooks WHERE id = pages.notebook_id
        )
    );

CREATE POLICY "Users can update own pages" ON pages
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM notebooks WHERE id = pages.notebook_id
        )
    );

CREATE POLICY "Users can delete own pages" ON pages
    FOR DELETE USING (
        auth.uid() IN (
            SELECT user_id FROM notebooks WHERE id = pages.notebook_id
        )
    );

-- Words policies
CREATE POLICY "Users can view own words" ON words
    FOR SELECT USING (
        auth.uid() IN (
            SELECT n.user_id 
            FROM notebooks n 
            JOIN pages p ON n.id = p.notebook_id 
            WHERE p.id = words.page_id
        )
    );

CREATE POLICY "Users can insert own words" ON words
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT n.user_id 
            FROM notebooks n 
            JOIN pages p ON n.id = p.notebook_id 
            WHERE p.id = words.page_id
        )
    );

CREATE POLICY "Users can update own words" ON words
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT n.user_id 
            FROM notebooks n 
            JOIN pages p ON n.id = p.notebook_id 
            WHERE p.id = words.page_id
        )
    );

CREATE POLICY "Users can delete own words" ON words
    FOR DELETE USING (
        auth.uid() IN (
            SELECT n.user_id 
            FROM notebooks n 
            JOIN pages p ON n.id = p.notebook_id 
            WHERE p.id = words.page_id
        )
    );

-- Reviews policies
CREATE POLICY "Users can view own reviews" ON reviews
    FOR SELECT USING (
        auth.uid() IN (
            SELECT n.user_id 
            FROM notebooks n 
            JOIN pages p ON n.id = p.notebook_id 
            JOIN words w ON p.id = w.page_id 
            WHERE w.id = reviews.word_id
        )
    );

CREATE POLICY "Users can insert own reviews" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() IN (
            SELECT n.user_id 
            FROM notebooks n 
            JOIN pages p ON n.id = p.notebook_id 
            JOIN words w ON p.id = w.page_id 
            WHERE w.id = reviews.word_id
        )
    );

-- Daily progress policies
CREATE POLICY "Users can view own daily progress" ON daily_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily progress" ON daily_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily progress" ON daily_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 8. USEFUL VIEWS
-- =============================================

-- View for words ready for review
CREATE VIEW words_ready_for_review AS
SELECT 
    w.*,
    p.notebook_id,
    p.next_review_date,
    n.user_id,
    n.title as notebook_title,
    n.language,
    n.notebook_level
FROM words w
JOIN pages p ON w.page_id = p.id
JOIN notebooks n ON p.notebook_id = n.id
WHERE w.status = 'learning'
    AND p.next_review_date <= CURRENT_DATE
    AND p.is_completed = TRUE
    AND n.is_active = TRUE;

-- View for notebook statistics
CREATE VIEW notebook_stats AS
SELECT 
    n.*,
    COALESCE(words_stats.total_words, 0) as total_words_calculated,
    COALESCE(words_stats.mastered_words, 0) as mastered_words_calculated,
    COALESCE(words_stats.learning_words, 0) as learning_words,
    COALESCE(words_stats.failed_words, 0) as failed_words,
    COALESCE(review_stats.pending_reviews, 0) as pending_reviews,
    COALESCE(review_stats.overdue_reviews, 0) as overdue_reviews
FROM notebooks n
LEFT JOIN (
    SELECT 
        p.notebook_id,
        COUNT(w.id) as total_words,
        COUNT(w.id) FILTER (WHERE w.status = 'mastered') as mastered_words,
        COUNT(w.id) FILTER (WHERE w.status = 'learning') as learning_words,
        COUNT(w.id) FILTER (WHERE w.status = 'failed') as failed_words
    FROM pages p
    LEFT JOIN words w ON p.id = w.page_id
    GROUP BY p.notebook_id
) words_stats ON n.id = words_stats.notebook_id
LEFT JOIN (
    SELECT 
        p.notebook_id,
        COUNT(DISTINCT p.id) FILTER (WHERE p.next_review_date <= CURRENT_DATE AND p.is_completed = TRUE) as pending_reviews,
        COUNT(DISTINCT p.id) FILTER (WHERE p.next_review_date < CURRENT_DATE AND p.is_completed = TRUE) as overdue_reviews
    FROM pages p
    GROUP BY p.notebook_id
) review_stats ON n.id = review_stats.notebook_id;

-- =============================================
-- 9. INSERT SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =============================================

-- This section is commented out - uncomment if you want sample data for testing

/*
-- Insert sample user profile (replace with actual user ID after signup)
INSERT INTO profiles (id, email, subscription_status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', 'free');

-- Insert sample notebook
INSERT INTO notebooks (user_id, title, language, language_code) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Spanish Vocabulary', 'Spanish', 'es');

-- Insert sample page
INSERT INTO pages (notebook_id, page_number, is_completed, next_review_date)
SELECT id, 1, true, CURRENT_DATE
FROM notebooks WHERE title = 'Spanish Vocabulary';

-- Insert sample words
INSERT INTO words (page_id, word, meaning, position_in_page)
SELECT id, 'hola', 'hello', 1
FROM pages WHERE page_number = 1;

INSERT INTO words (page_id, word, meaning, position_in_page)
SELECT id, 'gracias', 'thank you', 2
FROM pages WHERE page_number = 1;
*/

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- 
-- Next steps:
-- 1. Update your environment variables with Supabase URL and keys
-- 2. Test authentication signup/signin
-- 3. Create your first notebook through the app
-- 
-- The database is now ready for the Gold List Method app!