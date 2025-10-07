export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          subscription_status: 'free' | 'weekly' | 'annual'
          subscription_expires_at: string | null
          subscription_transaction_id: string | null
          streak_count: number
          longest_streak: number
          total_words_added: number
          total_words_mastered: number
          last_activity_date: string | null
          onboarding_completed: boolean
          preferences: Record<string, any>
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          subscription_status?: 'free' | 'weekly' | 'annual'
          subscription_expires_at?: string | null
          subscription_transaction_id?: string | null
          streak_count?: number
          longest_streak?: number
          total_words_added?: number
          total_words_mastered?: number
          last_activity_date?: string | null
          onboarding_completed?: boolean
          preferences?: Record<string, any>
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          subscription_status?: 'free' | 'weekly' | 'annual'
          subscription_expires_at?: string | null
          subscription_transaction_id?: string | null
          streak_count?: number
          longest_streak?: number
          total_words_added?: number
          total_words_mastered?: number
          last_activity_date?: string | null
          onboarding_completed?: boolean
          preferences?: Record<string, any>
        }
      }
      notebooks: {
        Row: {
          id: string
          user_id: string
          title: string
          language: string
          language_code: string
          notebook_level: 'bronze' | 'silver' | 'gold'
          words_per_day: number
          review_interval_days: number
          is_active: boolean
          settings: Record<string, any>
          created_at: string
          updated_at: string
          last_used_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          language: string
          language_code: string
          notebook_level?: 'bronze' | 'silver' | 'gold'
          words_per_day?: number
          review_interval_days?: number
          is_active?: boolean
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
          last_used_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          language?: string
          language_code?: string
          notebook_level?: 'bronze' | 'silver' | 'gold'
          words_per_day?: number
          review_interval_days?: number
          is_active?: boolean
          settings?: Record<string, any>
          created_at?: string
          updated_at?: string
          last_used_at?: string
        }
      }
      pages: {
        Row: {
          id: string
          notebook_id: string | null
          page_number: number
          date_created: string
          target_round: 1 | 2 | 3 | 4
          current_round: number
          words_count: number
          is_completed: boolean
          next_review_date: string | null
          is_unlocked: boolean
          unlock_date: string | null
          review_date: string | null
          status: string | null
          times_reviewed: number
          last_reviewed: string | null
          created_at: string
          updated_at: string
          context_title: string | null
          context_source: string | null
          context_description: string | null
          context_theme: string | null
        }
        Insert: {
          id?: string
          notebook_id?: string | null
          page_number: number
          date_created?: string
          target_round?: 1 | 2 | 3 | 4
          current_round?: number
          words_count?: number
          is_completed?: boolean
          next_review_date?: string | null
          is_unlocked?: boolean
          unlock_date?: string | null
          review_date?: string | null
          status?: string | null
          times_reviewed?: number
          last_reviewed?: string | null
          created_at?: string
          updated_at?: string
          context_title?: string | null
          context_source?: string | null
          context_description?: string | null
          context_theme?: string | null
        }
        Update: {
          id?: string
          notebook_id?: string | null
          page_number?: number
          date_created?: string
          target_round?: 1 | 2 | 3 | 4
          current_round?: number
          words_count?: number
          is_completed?: boolean
          next_review_date?: string | null
          is_unlocked?: boolean
          unlock_date?: string | null
          review_date?: string | null
          status?: string | null
          times_reviewed?: number
          last_reviewed?: string | null
          created_at?: string
          updated_at?: string
          context_title?: string | null
          context_source?: string | null
          context_description?: string | null
          context_theme?: string | null
        }
      }
      words: {
        Row: {
          id: string
          notebook_id: string
          page_id: string | null
          word: string
          translation: string
          meaning: string | null
          example_sentence: string | null
          notes: string | null
          current_round: number
          is_mastered: boolean
          review_date: string
          last_reviewed: string | null
          times_reviewed: number
          position_in_page: number | null
          status: 'learning' | 'mastered' | 'failed' | null
          difficulty_tag: 'NORMAL' | 'EXTREMELY_HARD' | 'MASTER_LEVEL' | 'LEGENDARY'
          cycle_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          notebook_id: string
          page_id?: string | null
          word: string
          translation: string
          meaning?: string | null
          example_sentence?: string | null
          notes?: string | null
          current_round?: number
          is_mastered?: boolean
          review_date?: string
          last_reviewed?: string | null
          times_reviewed?: number
          position_in_page?: number | null
          status?: 'learning' | 'mastered' | 'failed' | null
          difficulty_tag?: 'NORMAL' | 'EXTREMELY_HARD' | 'MASTER_LEVEL' | 'LEGENDARY'
          cycle_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          notebook_id?: string
          page_id?: string | null
          word?: string
          translation?: string
          meaning?: string | null
          example_sentence?: string | null
          notes?: string | null
          current_round?: number
          is_mastered?: boolean
          review_date?: string
          last_reviewed?: string | null
          times_reviewed?: number
          position_in_page?: number | null
          status?: 'learning' | 'mastered' | 'failed' | null
          difficulty_tag?: 'NORMAL' | 'EXTREMELY_HARD' | 'MASTER_LEVEL' | 'LEGENDARY'
          cycle_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          word_id: string
          round: 1 | 2 | 3 | 4
          reviewed_at: string
          remembered: boolean
          next_review_date: string | null
          response_time_ms: number | null
        }
        Insert: {
          id?: string
          word_id: string
          round: 1 | 2 | 3 | 4
          reviewed_at?: string
          remembered: boolean
          next_review_date?: string | null
          response_time_ms?: number | null
        }
        Update: {
          id?: string
          word_id?: string
          round?: 1 | 2 | 3 | 4
          reviewed_at?: string
          remembered?: boolean
          next_review_date?: string | null
          response_time_ms?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
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
          created_at: string
        }
      }
      get_user_notebooks_with_pages_count: {
        Args: {
          p_notebook_id: string
        }
        Returns: {
          id: string
          title: string
          language: string
          language_code: string
          words_per_day: number
          notebook_level: string
          created_at: string
          pages_count: number
        }[]
      }
      get_user_all_notebooks_with_stats: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          title: string
          language: string
          language_code: string
          words_per_day: number
          notebook_level: string
          created_at: string
          last_used_at: string
          pages_count: number
          total_words: number
          words_ready_for_review: number
        }[]
      }
      increment_streak_counter: {
        Args: {
          table_name: string
          row_id: string
          field_name: string
          x: number
        }
        Returns: void
      }
      get_user_notebooks_with_review_count: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          title: string
          language: string
          language_code: string
          words_per_day: number
          notebook_level: string
          created_at: string
          words_ready_for_review: number
        }[]
      }
      get_recent_activity: {
        Args: {
          p_user_id: string
          p_days: number
        }
        Returns: {
          date: string
          words_added: number
          words_reviewed: number
          activity_type: string
        }[]
      }
      get_user_stats: {
        Args: {
          p_user_id: string
        }
        Returns: {
          total_words_added: number
          total_words_reviewed: number
          average_accuracy: number
          streak_days: number
        }
      }
      get_words_for_review: {
        Args: {
          p_user_id: string
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
          words_per_day: number
        }[]
      }
      get_notebook_badges: {
        Args: {
          p_bronze_notebook_id: string
        }
        Returns: {
          id: string
          badge_type: string
          created_at: string
          total_words: number
          active_pages_count: number
          reviewable_pages_count: number
        }[]
      }
      get_reviewable_badge_pages: {
        Args: {
          p_badge_id: string
        }
        Returns: {
          page_id: string
          page_number: number
          review_date: string
          words_count: number
        }[]
      }
      create_notebook_badge: {
        Args: {
          p_bronze_notebook_id: string
          p_badge_type: string
        }
        Returns: string
      }
      add_words_to_badge: {
        Args: {
          p_badge_id: string
          p_words: string[]
        }
        Returns: {
          page_id: string
          page_completed: boolean
          review_date_set: string | null
        }[]
      }
      migrate_failed_bronze_words_to_silver: {
        Args: {}
        Returns: {
          words_migrated: number
          badges_created: number
          pages_created: number
        }[]
      }
      migrate_failed_silver_pages_to_gold: {
        Args: {}
        Returns: {
          pages_migrated: number
          words_migrated: number
          badges_created: number
        }[]
      }
      update_page_review_result: {
        Args: {
          p_page_id: string
          p_remembered: boolean
          p_current_date?: string
        }
        Returns: {
          badge_acquired: string | null
          migration_triggered: boolean
        }[]
      }
      get_words_with_badge_level: {
        Args: {
          p_user_id: string
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
          badge_type: string
          review_type: string
        }[]
      }
      run_badge_migrations: {
        Args: {}
        Returns: {
          bronze_to_silver_words: number
          silver_to_gold_pages: number
          badges_created: number
        }[]
      }
      migrate_single_failed_word_to_silver: {
        Args: {
          p_word_id: string
        }
        Returns: {
          silver_badge_id: string
          page_id: string
          badge_created: boolean
        }[]
      }
    }
    Enums: {
      subscription_status: 'free' | 'weekly' | 'annual'
      notebook_level: 'bronze' | 'silver' | 'gold'
      word_status: 'learning' | 'mastered' | 'failed'
      round_number: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
      difficulty_tag: 'NORMAL' | 'EXTREMELY_HARD' | 'MASTER_LEVEL' | 'LEGENDARY'
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = {
  Row: Database['public']['Tables'][T]['Row']
  Insert: Database['public']['Tables'][T]['Insert']
  Update: Database['public']['Tables'][T]['Update']
}
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]