-- Notification Helper Functions
-- Copy and paste this entire SQL into your Supabase SQL editor AFTER running notifications_setup.sql

-- Function to get today's page for a notebook
CREATE OR REPLACE FUNCTION get_today_page(notebook_id_param UUID, current_date_param DATE)
RETURNS TABLE (
    id UUID,
    page_number INTEGER,
    words_count INTEGER,
    is_unlocked BOOLEAN,
    unlock_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.page_number,
        COALESCE(word_counts.word_count, 0) as words_count,
        p.is_unlocked,
        p.unlock_date
    FROM pages p
    LEFT JOIN (
        SELECT 
            page_id,
            COUNT(*) as word_count
        FROM words 
        WHERE created_at::date = current_date_param
        GROUP BY page_id
    ) word_counts ON p.id = word_counts.page_id
    WHERE p.notebook_id = notebook_id_param
    AND p.unlock_date = current_date_param
    AND p.is_unlocked = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get words ready for review for a notebook
CREATE OR REPLACE FUNCTION get_review_words_count(notebook_id_param UUID, current_date_param DATE)
RETURNS INTEGER AS $$
DECLARE
    word_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO word_count
    FROM words w
    INNER JOIN pages p ON w.page_id = p.id
    WHERE p.notebook_id = notebook_id_param
    AND w.is_mastered = false
    AND (
        -- Words with review_date that's due
        (w.review_date IS NOT NULL AND w.review_date::date <= current_date_param)
        OR
        -- Fallback: words created 14+ days ago without review_date
        (w.review_date IS NULL AND w.created_at::date <= current_date_param - INTERVAL '14 days')
    )
    AND (
        -- Not reviewed today
        w.last_reviewed IS NULL 
        OR w.last_reviewed::date < current_date_param
    );
    
    RETURN COALESCE(word_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any activity today
CREATE OR REPLACE FUNCTION get_user_activity_today(user_id_param UUID, current_date_param DATE)
RETURNS INTEGER AS $$
DECLARE
    activity_count INTEGER := 0;
    words_added INTEGER := 0;
    reviews_done INTEGER := 0;
BEGIN
    -- Count words added today
    SELECT COUNT(*)
    INTO words_added
    FROM words w
    INNER JOIN pages p ON w.page_id = p.id
    INNER JOIN notebooks n ON p.notebook_id = n.id
    WHERE n.user_id = user_id_param
    AND w.created_at::date = current_date_param;
    
    -- Count reviews done today
    SELECT COUNT(*)
    INTO reviews_done
    FROM words w
    INNER JOIN pages p ON w.page_id = p.id
    INNER JOIN notebooks n ON p.notebook_id = n.id
    WHERE n.user_id = user_id_param
    AND w.last_reviewed::date = current_date_param;
    
    activity_count := words_added + reviews_done;
    
    RETURN activity_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get notification settings for a user
CREATE OR REPLACE FUNCTION get_user_notification_settings(user_id_param UUID)
RETURNS TABLE (
    enable_notifications BOOLEAN,
    enable_daily_reminders BOOLEAN,
    enable_progress_reminders BOOLEAN,
    enable_review_reminders BOOLEAN,
    enable_streak_protection BOOLEAN,
    daily_reminder_time TIME,
    progress_reminder_time TIME,
    review_reminder_time TIME,
    streak_reminder_time TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uns.enable_notifications,
        uns.enable_daily_reminders,
        uns.enable_progress_reminders,
        uns.enable_review_reminders,
        uns.enable_streak_protection,
        uns.daily_reminder_time,
        uns.progress_reminder_time,
        uns.review_reminder_time,
        uns.streak_reminder_time
    FROM user_notification_settings uns
    WHERE uns.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store notification history
CREATE OR REPLACE FUNCTION store_notification_history(
    notification_id_param TEXT,
    user_id_param UUID,
    type_param TEXT,
    title_param TEXT,
    body_param TEXT,
    data_param JSONB DEFAULT '{}',
    scheduled_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    sent_at_param TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notification_history (
        id,
        user_id,
        type,
        title,
        body,
        data,
        scheduled_at,
        sent_at
    ) VALUES (
        notification_id_param,
        user_id_param,
        type_param,
        title_param,
        body_param,
        data_param,
        scheduled_at_param,
        sent_at_param
    )
    ON CONFLICT (id) DO UPDATE SET
        sent_at = COALESCE(sent_at_param, notification_history.sent_at),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id_param TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE notification_history 
    SET read_at = NOW()
    WHERE id = notification_id_param
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as clicked
CREATE OR REPLACE FUNCTION mark_notification_clicked(notification_id_param TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE notification_history 
    SET clicked_at = NOW(),
        read_at = COALESCE(read_at, NOW())
    WHERE id = notification_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's notification history with pagination
CREATE OR REPLACE FUNCTION get_user_notification_history(
    user_id_param UUID,
    limit_param INTEGER DEFAULT 50,
    offset_param INTEGER DEFAULT 0
)
RETURNS TABLE (
    id TEXT,
    type TEXT,
    title TEXT,
    body TEXT,
    data JSONB,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nh.id,
        nh.type,
        nh.title,
        nh.body,
        nh.data,
        nh.scheduled_at,
        nh.sent_at,
        nh.read_at,
        nh.clicked_at,
        nh.created_at
    FROM notification_history nh
    WHERE nh.user_id = user_id_param
    AND nh.sent_at IS NOT NULL
    ORDER BY nh.sent_at DESC, nh.created_at DESC
    LIMIT limit_param
    OFFSET offset_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM notification_history
    WHERE user_id = user_id_param
    AND sent_at IS NOT NULL
    AND read_at IS NULL;
    
    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notification_history 
    SET read_at = NOW()
    WHERE user_id = user_id_param
    AND read_at IS NULL
    AND sent_at IS NOT NULL;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;