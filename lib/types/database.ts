export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          created_at: string
          subscription_status: 'free' | 'weekly' | 'annual'
          subscription_expires_at: string | null
          streak_count: number
          total_words_added: number
          total_words_mastered: number
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          subscription_status?: 'free' | 'weekly' | 'annual'
          subscription_expires_at?: string | null
          streak_count?: number
          total_words_added?: number
          total_words_mastered?: number
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          subscription_status?: 'free' | 'weekly' | 'annual'
          subscription_expires_at?: string | null
          streak_count?: number
          total_words_added?: number
          total_words_mastered?: number
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
          created_at: string
          updated_at: string
          words_per_day: number
          review_interval_days: number
          total_words: number
          mastered_words: number
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          language: string
          language_code: string
          notebook_level?: 'bronze' | 'silver' | 'gold'
          created_at?: string
          updated_at?: string
          words_per_day?: number
          review_interval_days?: number
          total_words?: number
          mastered_words?: number
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          language?: string
          language_code?: string
          notebook_level?: 'bronze' | 'silver' | 'gold'
          created_at?: string
          updated_at?: string
          words_per_day?: number
          review_interval_days?: number
          total_words?: number
          mastered_words?: number
          is_active?: boolean
        }
      }
      pages: {
        Row: {
          id: string
          notebook_id: string
          page_number: number
          date_created: string
          target_round: 1 | 2 | 3 | 4
          words_count: number
          is_completed: boolean
          next_review_date: string | null
        }
        Insert: {
          id?: string
          notebook_id: string
          page_number: number
          date_created?: string
          target_round?: 1 | 2 | 3 | 4
          words_count?: number
          is_completed?: boolean
          next_review_date?: string | null
        }
        Update: {
          id?: string
          notebook_id?: string
          page_number?: number
          date_created?: string
          target_round?: 1 | 2 | 3 | 4
          words_count?: number
          is_completed?: boolean
          next_review_date?: string | null
        }
      }
      words: {
        Row: {
          id: string
          page_id: string
          word: string
          meaning: string
          notes: string | null
          image_url: string | null
          current_round: 1 | 2 | 3 | 4
          status: 'learning' | 'mastered' | 'failed'
          created_at: string
          updated_at: string
          position_in_page: number
        }
        Insert: {
          id?: string
          page_id: string
          word: string
          meaning: string
          notes?: string | null
          image_url?: string | null
          current_round?: 1 | 2 | 3 | 4
          status?: 'learning' | 'mastered' | 'failed'
          created_at?: string
          updated_at?: string
          position_in_page: number
        }
        Update: {
          id?: string
          page_id?: string
          word?: string
          meaning?: string
          notes?: string | null
          image_url?: string | null
          current_round?: 1 | 2 | 3 | 4
          status?: 'learning' | 'mastered' | 'failed'
          created_at?: string
          updated_at?: string
          position_in_page?: number
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
      [_ in never]: never
    }
    Enums: {
      subscription_status: 'free' | 'weekly' | 'annual'
      notebook_level: 'bronze' | 'silver' | 'gold'
      word_status: 'learning' | 'mastered' | 'failed'
      round_number: 1 | 2 | 3 | 4
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]