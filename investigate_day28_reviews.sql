-- =============================================
-- INVESTIGATE DAY 28 REVIEW ISSUE
-- Run this SQL in Supabase SQL Editor to understand why reviews appear on Day 28
-- =============================================

-- 1. Show all words due for review on 2025-10-23 (Day 28 in simulation)
SELECT 
    w.id,
    w.word,
    w.created_at,
    w.review_date,
    w.current_round,
    w.last_reviewed,
    w.status,
    p.page_number,
    p.date_created as page_date,
    n.title as notebook_title
FROM words w
JOIN pages p ON w.page_id = p.id
JOIN notebooks n ON w.notebook_id = n.id
WHERE w.review_date = '2025-10-23'
ORDER BY w.created_at;

-- 2. Calculate the days between creation and review for these words
SELECT 
    w.id,
    w.word,
    w.created_at::date as created_date,
    w.review_date,
    (w.review_date - w.created_at::date) as days_difference,
    w.current_round,
    p.page_number
FROM words w
JOIN pages p ON w.page_id = p.id
WHERE w.review_date = '2025-10-23'
ORDER BY w.created_at;

-- 3. Show all pages created between Day 15-16 to see when words were actually added
SELECT 
    p.id,
    p.page_number,
    p.date_created,
    COUNT(w.id) as word_count,
    MIN(w.created_at::date) as first_word_date,
    MAX(w.created_at::date) as last_word_date
FROM pages p
LEFT JOIN words w ON p.id = w.page_id
WHERE p.date_created IN ('2025-10-09', '2025-10-10')  -- Day 15-16 assuming simulation started 2025-09-25
GROUP BY p.id, p.page_number, p.date_created
ORDER BY p.page_number;

-- 4. Show simulation timeline to understand the day mapping
SELECT 
    'Analysis: If simulation started 2025-09-25, then:' as timeline_info
UNION ALL
SELECT 'Day 1 = 2025-09-25 (simulation start)'
UNION ALL  
SELECT 'Day 15 = 2025-10-09 (when words were added)'
UNION ALL
SELECT 'Day 28 = 2025-10-22 (current simulation day - 1)'
UNION ALL
SELECT 'Day 29 = 2025-10-23 (when Day 15 words should be reviewed)';

-- 5. Show the exact relationship between page dates and word creation
SELECT 
    p.page_number,
    p.date_created as page_date,
    COUNT(w.id) as words_on_page,
    STRING_AGG(DISTINCT w.review_date::text, ', ') as review_dates,
    STRING_AGG(DISTINCT w.current_round::text, ', ') as rounds
FROM pages p
LEFT JOIN words w ON p.id = w.page_id
WHERE p.date_created BETWEEN '2025-10-09' AND '2025-10-10'
GROUP BY p.id, p.page_number, p.date_created
ORDER BY p.page_number;