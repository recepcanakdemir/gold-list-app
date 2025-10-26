-- RPC Functions for managing user survey responses
-- Provides secure, validated operations for survey data

-- Function to save or update user survey response
CREATE OR REPLACE FUNCTION save_survey_response(
  p_hear_about_us TEXT DEFAULT NULL,
  p_target_language TEXT DEFAULT NULL,
  p_current_level TEXT DEFAULT NULL,
  p_biggest_challenge TEXT DEFAULT NULL,
  p_memory_assessment TEXT DEFAULT NULL,
  p_goldlist_experience TEXT DEFAULT NULL,
  p_unknown_words_daily INTEGER DEFAULT NULL,
  p_word_sources TEXT[] DEFAULT NULL,
  p_learning_reasons TEXT[] DEFAULT NULL,
  p_consent_given BOOLEAN DEFAULT FALSE,
  p_app_version TEXT DEFAULT '1.0.0',
  p_onboarding_completed BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  result_data JSON;
  user_uuid UUID;
BEGIN
  -- Get the current user ID
  user_uuid := auth.uid();
  
  -- Check if user is authenticated
  IF user_uuid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Validate consent if this is a complete response
  IF p_onboarding_completed = true AND p_consent_given = false THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User consent required for saving survey data'
    );
  END IF;

  -- Upsert survey response
  INSERT INTO user_survey_responses (
    user_id,
    hear_about_us,
    target_language,
    current_level,
    biggest_challenge,
    memory_assessment,
    goldlist_experience,
    unknown_words_daily,
    word_sources,
    learning_reasons,
    consent_given,
    app_version,
    onboarding_completed,
    completed_at,
    data_retention_expires_at
  ) VALUES (
    user_uuid,
    p_hear_about_us,
    p_target_language,
    p_current_level,
    p_biggest_challenge,
    p_memory_assessment,
    p_goldlist_experience,
    p_unknown_words_daily,
    p_word_sources,
    p_learning_reasons,
    p_consent_given,
    p_app_version,
    p_onboarding_completed,
    CASE 
      WHEN p_onboarding_completed = true THEN NOW()
      ELSE NULL
    END,
    NOW() + INTERVAL '2 years'
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    hear_about_us = COALESCE(p_hear_about_us, user_survey_responses.hear_about_us),
    target_language = COALESCE(p_target_language, user_survey_responses.target_language),
    current_level = COALESCE(p_current_level, user_survey_responses.current_level),
    biggest_challenge = COALESCE(p_biggest_challenge, user_survey_responses.biggest_challenge),
    memory_assessment = COALESCE(p_memory_assessment, user_survey_responses.memory_assessment),
    goldlist_experience = COALESCE(p_goldlist_experience, user_survey_responses.goldlist_experience),
    unknown_words_daily = COALESCE(p_unknown_words_daily, user_survey_responses.unknown_words_daily),
    word_sources = COALESCE(p_word_sources, user_survey_responses.word_sources),
    learning_reasons = COALESCE(p_learning_reasons, user_survey_responses.learning_reasons),
    consent_given = CASE 
      WHEN p_consent_given = true THEN true 
      ELSE user_survey_responses.consent_given 
    END,
    app_version = COALESCE(p_app_version, user_survey_responses.app_version),
    onboarding_completed = CASE 
      WHEN p_onboarding_completed = true THEN true 
      ELSE user_survey_responses.onboarding_completed 
    END,
    completed_at = CASE 
      WHEN p_onboarding_completed = true AND user_survey_responses.completed_at IS NULL THEN NOW()
      ELSE user_survey_responses.completed_at
    END,
    updated_at = NOW();

  -- Return success with saved data
  SELECT json_build_object(
    'success', true,
    'data', row_to_json(user_survey_responses.*)
  ) INTO result_data
  FROM user_survey_responses
  WHERE user_id = user_uuid;

  RETURN result_data;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's survey response
CREATE OR REPLACE FUNCTION get_survey_response()
RETURNS JSON AS $$
DECLARE
  result_data JSON;
  user_uuid UUID;
BEGIN
  -- Get the current user ID
  user_uuid := auth.uid();
  
  -- Check if user is authenticated
  IF user_uuid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get user's survey response
  SELECT json_build_object(
    'success', true,
    'data', CASE 
      WHEN COUNT(*) > 0 THEN row_to_json(user_survey_responses.*)
      ELSE NULL
    END
  ) INTO result_data
  FROM user_survey_responses
  WHERE user_id = user_uuid;

  RETURN result_data;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete user's survey response (GDPR compliance)
CREATE OR REPLACE FUNCTION delete_survey_response()
RETURNS JSON AS $$
DECLARE
  user_uuid UUID;
  deleted_count INTEGER;
BEGIN
  -- Get the current user ID
  user_uuid := auth.uid();
  
  -- Check if user is authenticated
  IF user_uuid IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Delete user's survey response
  DELETE FROM user_survey_responses 
  WHERE user_id = user_uuid;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted', deleted_count > 0
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get aggregated survey analytics (admin only)
CREATE OR REPLACE FUNCTION get_survey_analytics()
RETURNS JSON AS $$
DECLARE
  result_data JSON;
  admin_emails TEXT[] := ARRAY['recepcanakdemir@gmail.com']; -- Admin email list
  current_user_email TEXT;
BEGIN
  -- Get current user email
  current_user_email := auth.jwt() ->> 'email';
  
  -- Check if user is admin
  IF current_user_email IS NULL OR NOT (current_user_email = ANY(admin_emails)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Admin access required'
    );
  END IF;

  -- Generate aggregated analytics (anonymized)
  SELECT json_build_object(
    'success', true,
    'data', json_build_object(
      'total_responses', COUNT(*),
      'completed_responses', COUNT(*) FILTER (WHERE onboarding_completed = true),
      'consent_rate', ROUND(
        (COUNT(*) FILTER (WHERE consent_given = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 1
      ),
      'language_distribution', (
        SELECT json_object_agg(target_language, count)
        FROM (
          SELECT target_language, COUNT(*) as count
          FROM user_survey_responses
          WHERE target_language IS NOT NULL
          GROUP BY target_language
          ORDER BY count DESC
        ) t
      ),
      'level_distribution', (
        SELECT json_object_agg(current_level, count)
        FROM (
          SELECT current_level, COUNT(*) as count
          FROM user_survey_responses
          WHERE current_level IS NOT NULL
          GROUP BY current_level
          ORDER BY 
            CASE current_level
              WHEN 'A1' THEN 1
              WHEN 'A2' THEN 2
              WHEN 'B1' THEN 3
              WHEN 'B2' THEN 4
              WHEN 'C1' THEN 5
              WHEN 'C2' THEN 6
              ELSE 7
            END
        ) t
      ),
      'challenge_distribution', (
        SELECT json_object_agg(biggest_challenge, count)
        FROM (
          SELECT biggest_challenge, COUNT(*) as count
          FROM user_survey_responses
          WHERE biggest_challenge IS NOT NULL
          GROUP BY biggest_challenge
          ORDER BY count DESC
        ) t
      ),
      'hear_about_us_distribution', (
        SELECT json_object_agg(hear_about_us, count)
        FROM (
          SELECT hear_about_us, COUNT(*) as count
          FROM user_survey_responses
          WHERE hear_about_us IS NOT NULL
          GROUP BY hear_about_us
          ORDER BY count DESC
        ) t
      ),
      'average_unknown_words_daily', ROUND(AVG(unknown_words_daily), 1),
      'responses_over_time', (
        SELECT json_agg(
          json_build_object(
            'date', date_trunc('day', completed_at),
            'count', count
          ) ORDER BY date_trunc('day', completed_at)
        )
        FROM (
          SELECT date_trunc('day', completed_at) as day, COUNT(*) as count
          FROM user_survey_responses
          WHERE completed_at IS NOT NULL
          GROUP BY date_trunc('day', completed_at)
        ) t
      )
    )
  ) INTO result_data
  FROM user_survey_responses;

  RETURN result_data;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION save_survey_response TO authenticated;
GRANT EXECUTE ON FUNCTION get_survey_response TO authenticated;
GRANT EXECUTE ON FUNCTION delete_survey_response TO authenticated;
GRANT EXECUTE ON FUNCTION get_survey_analytics TO authenticated;