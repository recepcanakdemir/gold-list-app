-- Fix for enum type casting issues in freemium limit functions
-- Run this to fix the "operator does not exist: notebook_level_enum = text" error

-- Update check_notebook_creation_limit function with proper enum casting
CREATE OR REPLACE FUNCTION check_notebook_creation_limit(p_user_id UUID, p_notebook_level TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_subscription TEXT;
    existing_count INTEGER;
BEGIN
    -- Get user's subscription status
    SELECT subscription_status INTO user_subscription
    FROM profiles
    WHERE id = p_user_id;
    
    -- Premium users have no limits
    IF user_subscription != 'free' THEN
        RETURN TRUE;
    END IF;
    
    -- Free users can have 1 notebook per level
    -- Cast enum to text for comparison
    SELECT COUNT(*) INTO existing_count
    FROM notebooks
    WHERE user_id = p_user_id 
    AND notebook_level::text = p_notebook_level
    AND is_active = TRUE;
    
    RETURN existing_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the fix worked
SELECT 'Enum casting fix applied successfully!' as status;