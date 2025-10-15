-- =============================================
-- GOLD LIST APP PERFORMANCE OPTIMIZATION
-- Database Indexes for Faster Queries
-- =============================================

-- SAFE PERFORMANCE INDEXES
-- These indexes will dramatically speed up common queries
-- without changing any application functionality.

-- =============================================
-- 1. WORDS TABLE INDEXES
-- =============================================

-- Index for review queries (most common query pattern)
-- Speeds up: "get all words for user that need review"
CREATE INDEX IF NOT EXISTS idx_words_review_lookup 
ON words(user_id, review_date, is_mastered) 
WHERE is_mastered = false AND review_date IS NOT NULL;

-- Index for page-specific word queries  
-- Speeds up: "get all words for specific notebook page"
CREATE INDEX IF NOT EXISTS idx_words_page_lookup 
ON words(notebook_id, page_id, current_round);

-- Index for user's learning words
-- Speeds up: "get all learning words for user"
CREATE INDEX IF NOT EXISTS idx_words_user_status 
ON words(user_id, status, is_mastered) 
WHERE status = 'learning';

-- =============================================
-- 2. PAGES TABLE INDEXES
-- =============================================

-- Index for notebook page navigation
-- Speeds up: "get pages for specific notebook by date"
CREATE INDEX IF NOT EXISTS idx_pages_notebook_date 
ON pages(notebook_id, date_created, page_number);

-- Index for finding today's pages
-- Speeds up: "find all pages created on specific date"
CREATE INDEX IF NOT EXISTS idx_pages_date_lookup 
ON pages(date_created, notebook_id, is_completed);

-- =============================================
-- 3. REVIEWS TABLE INDEXES (if exists)
-- =============================================

-- Index for review history queries
-- Speeds up: "get review history for words"
CREATE INDEX IF NOT EXISTS idx_reviews_word_date 
ON reviews(word_id, reviewed_at);

-- Index for recent reviews
-- Speeds up: "get recent review activity"
CREATE INDEX IF NOT EXISTS idx_reviews_date_lookup 
ON reviews(reviewed_at, word_id);

-- =============================================
-- 4. NOTEBOOKS TABLE INDEXES
-- =============================================

-- Index for user's notebooks
-- Speeds up: "get all notebooks for user"
CREATE INDEX IF NOT EXISTS idx_notebooks_user_lookup 
ON notebooks(user_id, created_at);

-- =============================================
-- PERFORMANCE IMPACT ESTIMATES
-- =============================================

-- Before indexes: Review queries could take 100-500ms
-- After indexes:  Review queries should take 5-20ms  
-- Expected improvement: 5-25x faster

-- Before indexes: Page loading could take 50-200ms
-- After indexes:  Page loading should take 2-10ms
-- Expected improvement: 10-25x faster

-- =============================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================

/*
-- To remove these indexes if any issues occur:

DROP INDEX IF EXISTS idx_words_review_lookup;
DROP INDEX IF EXISTS idx_words_page_lookup;
DROP INDEX IF EXISTS idx_words_user_status;
DROP INDEX IF EXISTS idx_pages_notebook_date;
DROP INDEX IF EXISTS idx_pages_date_lookup;
DROP INDEX IF EXISTS idx_reviews_word_date;
DROP INDEX IF EXISTS idx_reviews_date_lookup;
DROP INDEX IF EXISTS idx_notebooks_user_lookup;
*/

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Check if indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;