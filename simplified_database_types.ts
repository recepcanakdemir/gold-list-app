/**
 * Replace the Functions section in database.ts with this simplified version
 * that removes all badge-related functions and keeps only the essential ones
 */

Functions: {
  create_notebook_with_pages: {
    Args: {
      p_user_id: string
      p_title: string
      p_language: string
      p_language_code: string
      p_words_per_day: number
    }
    Returns: {
      id: string
      title: string
      language: string
      language_code: string
      words_per_day: number
      notebook_level: string
    }[]
  }
  get_user_notebooks_with_stats: {
    Args: {
      p_user_id: string
    }
    Returns: {
      id: string
      title: string
      language: string
      language_code: string
      words_per_day: number
      total_words: number
      words_due_today: number
      streak_count: number
      created_at: string
      notebook_level: string
      notebook_title: string
      notebook_language: string
      words_per_day: number
    }[]
  }
  update_word_review_result: {
    Args: {
      p_word_id: string
      p_remembered: boolean
      p_current_date?: string
    }
    Returns: {
      success: boolean
      new_round: number
      new_status: string
      review_date: string | null
      is_mastered: boolean
    }[]
  }
  get_words_for_review: {
    Args: {
      p_user_id: string
      p_current_date?: string
    }
    Returns: {
      id: string
      word: string
      translation: string
      meaning: string | null
      example_sentence: string | null
      notes: string | null
      current_round: number
      created_at: string
      notebook_id: string
      page_id: string
      notebook_title: string
      notebook_language: string
      notebook_level: string
    }[]
  }
  add_words_to_page: {
    Args: {
      p_page_id: string
      p_words: Record<string, any>[]
    }
    Returns: {
      success: boolean
      words_added: number
    }[]
  }
  get_or_create_today_page: {
    Args: {
      p_notebook_id: string
      p_current_date?: string
    }
    Returns: {
      id: string
      page_number: number
      words_count: number
      is_unlocked: boolean
    }[]
  }
  check_subscription_limits: {
    Args: {
      p_user_id: string
    }
    Returns: {
      can_create_notebook: boolean
      notebook_count: number
      notebook_limit: number
      subscription_status: string
      is_premium: boolean
    }[]
  }
}