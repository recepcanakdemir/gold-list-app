// =============================================
// GOLD LIST METHOD APP - SUPABASE CONFIGURATION
// =============================================
// This file contains all the configuration needed for Supabase

import { createClient } from '@supabase/supabase-js'

// =============================================
// 1. ENVIRONMENT VARIABLES SETUP
// =============================================
// Add these to your .env file or expo environment:

/*
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
*/

// =============================================
// 2. SUPABASE CLIENT CONFIGURATION
// =============================================

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// =============================================
// 3. HELPER FUNCTIONS FOR COMMON OPERATIONS
// =============================================

// Profile Operations
export const profileOperations = {
  // Get user profile
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Create new profile
  async createProfile(profile: {
    id: string
    email: string
    subscription_status?: 'free' | 'weekly' | 'annual'
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .insert([profile])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update profile stats
  async updateStats(userId: string, stats: {
    streak_count?: number
    total_words_added?: number
    total_words_mastered?: number
    last_activity_date?: string
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(stats)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update subscription
  async updateSubscription(userId: string, subscriptionData: {
    subscription_status: 'free' | 'weekly' | 'annual'
    subscription_expires_at?: string
    stripe_customer_id?: string
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .update(subscriptionData)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Notebook Operations
export const notebookOperations = {
  // Get all user notebooks with stats
  async getAllWithStats(userId: string) {
    const { data, error } = await supabase
      .from('notebook_stats')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Create new notebook
  async create(notebook: {
    user_id: string
    title: string
    language: string
    language_code: string
    notebook_level?: 'bronze' | 'silver' | 'gold'
    words_per_day?: number
    review_interval_days?: number
  }) {
    const { data, error } = await supabase
      .from('notebooks')
      .insert([notebook])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update notebook
  async update(notebookId: string, updates: {
    title?: string
    language?: string
    language_code?: string
    words_per_day?: number
    review_interval_days?: number
    settings?: any
  }) {
    const { data, error } = await supabase
      .from('notebooks')
      .update(updates)
      .eq('id', notebookId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Soft delete notebook
  async delete(notebookId: string) {
    const { error } = await supabase
      .from('notebooks')
      .update({ is_active: false })
      .eq('id', notebookId)
    
    if (error) throw error
  },

  // Get notebook by ID
  async getById(notebookId: string) {
    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', notebookId)
      .single()
    
    if (error) throw error
    return data
  }
}

// Page Operations
export const pageOperations = {
  // Get pages for notebook
  async getByNotebook(notebookId: string) {
    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        words (
          id,
          word,
          meaning,
          status,
          current_round
        )
      `)
      .eq('notebook_id', notebookId)
      .order('page_number', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Create new page
  async create(page: {
    notebook_id: string
    page_number: number
    target_round?: number
  }) {
    const { data, error } = await supabase
      .from('pages')
      .insert([page])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get next page number for notebook
  async getNextPageNumber(notebookId: string) {
    const { data, error } = await supabase
      .from('pages')
      .select('page_number')
      .eq('notebook_id', notebookId)
      .order('page_number', { ascending: false })
      .limit(1)
    
    if (error) throw error
    return (data[0]?.page_number || 0) + 1
  },

  // Mark page as completed and set review date
  async markCompleted(pageId: string, reviewIntervalDays: number = 14) {
    const reviewDate = new Date()
    reviewDate.setDate(reviewDate.getDate() + reviewIntervalDays)
    
    const { data, error } = await supabase
      .from('pages')
      .update({
        is_completed: true,
        next_review_date: reviewDate.toISOString().split('T')[0]
      })
      .eq('id', pageId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get pages ready for review
  async getReadyForReview(userId: string) {
    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        notebook:notebooks!inner (
          id,
          title,
          language,
          user_id
        ),
        words (
          id,
          word,
          meaning,
          status,
          current_round
        )
      `)
      .eq('notebook.user_id', userId)
      .eq('is_completed', true)
      .lte('next_review_date', new Date().toISOString().split('T')[0])
      .eq('notebook.is_active', true)
    
    if (error) throw error
    return data
  }
}

// Word Operations
export const wordOperations = {
  // Add multiple words to a page
  async addToPage(words: Array<{
    page_id: string
    word: string
    meaning: string
    notes?: string
    image_url?: string
    pronunciation?: string
    example_sentence?: string
    position_in_page: number
  }>) {
    const { data, error } = await supabase
      .from('words')
      .insert(words)
      .select()
    
    if (error) throw error
    return data
  },

  // Get words for review
  async getForReview(notebookId: string) {
    const { data, error } = await supabase
      .from('words_ready_for_review')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Update word status and round
  async updateStatus(wordId: string, status: 'learning' | 'mastered' | 'failed', round?: number) {
    const updates: any = { status }
    if (round !== undefined) updates.current_round = round
    
    const { data, error } = await supabase
      .from('words')
      .update(updates)
      .eq('id', wordId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get words by page
  async getByPage(pageId: string) {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('page_id', pageId)
      .order('position_in_page', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Search words across all user notebooks
  async search(userId: string, searchTerm: string) {
    const { data, error } = await supabase
      .from('words')
      .select(`
        *,
        page:pages!inner (
          id,
          notebook:notebooks!inner (
            id,
            title,
            user_id
          )
        )
      `)
      .eq('page.notebook.user_id', userId)
      .or(`word.ilike.%${searchTerm}%,meaning.ilike.%${searchTerm}%`)
      .limit(50)
    
    if (error) throw error
    return data
  }
}

// Review Operations
export const reviewOperations = {
  // Process a word review using the database function
  async processReview(
    wordId: string,
    remembered: boolean,
    responseTimeMs?: number,
    sessionId?: string
  ) {
    const { data, error } = await supabase
      .rpc('process_word_review', {
        p_word_id: wordId,
        p_remembered: remembered,
        p_response_time_ms: responseTimeMs,
        p_session_id: sessionId
      })
    
    if (error) throw error
    return data
  },

  // Get review history for a word
  async getWordHistory(wordId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('word_id', wordId)
      .order('reviewed_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get review session data
  async getSessionData(sessionId: string) {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        word:words (
          id,
          word,
          meaning,
          status
        )
      `)
      .eq('session_id', sessionId)
      .order('reviewed_at', { ascending: true })
    
    if (error) throw error
    return data
  }
}

// Daily Progress Operations
export const dailyProgressOperations = {
  // Update today's progress
  async updateToday(userId: string, updates: {
    words_added?: number
    words_reviewed?: number
    words_remembered?: number
    words_forgotten?: number
    session_duration_minutes?: number
    notebooks_practiced?: string[]
  }) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('daily_progress')
      .upsert({
        user_id: userId,
        date: today,
        ...updates
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get progress for date range
  async getDateRange(userId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    
    if (error) throw error
    return data
  },

  // Get weekly stats
  async getWeeklyStats(userId: string, weekStart: string) {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    
    const data = await this.getDateRange(
      userId, 
      weekStart, 
      weekEnd.toISOString().split('T')[0]
    )
    
    return {
      totalWordsAdded: data.reduce((sum, day) => sum + day.words_added, 0),
      totalWordsReviewed: data.reduce((sum, day) => sum + day.words_reviewed, 0),
      totalWordsRemembered: data.reduce((sum, day) => sum + day.words_remembered, 0),
      totalSessionTime: data.reduce((sum, day) => sum + day.session_duration_minutes, 0),
      daysActive: data.filter(day => day.words_added > 0 || day.words_reviewed > 0).length,
      accuracy: data.reduce((sum, day) => sum + day.words_reviewed, 0) > 0 
        ? (data.reduce((sum, day) => sum + day.words_remembered, 0) / 
           data.reduce((sum, day) => sum + day.words_reviewed, 0)) * 100
        : 0
    }
  }
}

// Real-time Subscriptions
export const subscriptions = {
  // Subscribe to notebook changes
  subscribeToNotebooks(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel('notebook-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notebooks',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to word changes for a notebook
  subscribeToWords(notebookId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`words-${notebookId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'words',
          filter: `page_id=in.(select id from pages where notebook_id=${notebookId})`
        },
        callback
      )
      .subscribe()
  },

  // Unsubscribe from all channels
  unsubscribeAll() {
    supabase.removeAllChannels()
  }
}

// =============================================
// 4. AUTHENTICATION HELPERS
// =============================================

export const authHelpers = {
  // Sign up new user
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) throw error
    return data
  },

  // Sign in user
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    return data
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Reset password
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  },

  // Get current session
  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data
  },

  // Get current user
  async getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data
  }
}

// =============================================
// 5. UTILITY FUNCTIONS
// =============================================

export const utils = {
  // Calculate streak from daily progress
  calculateStreak(dailyProgress: Array<{ date: string; words_added: number; words_reviewed: number }>) {
    let streak = 0
    const today = new Date()
    
    // Sort by date descending
    const sorted = dailyProgress.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    for (const progress of sorted) {
      const progressDate = new Date(progress.date)
      const daysDiff = Math.floor((today.getTime() - progressDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff === streak && (progress.words_added > 0 || progress.words_reviewed > 0)) {
        streak++
      } else {
        break
      }
    }
    
    return streak
  },

  // Format date for display
  formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString()
  },

  // Calculate accuracy percentage
  calculateAccuracy(remembered: number, total: number) {
    if (total === 0) return 0
    return Math.round((remembered / total) * 100)
  },

  // Get color for round
  getRoundColor(round: number) {
    const colors = {
      1: '#DC2626', // Red
      2: '#059669', // Green
      3: '#2563EB', // Blue
      4: '#D97706', // Orange
    }
    return colors[round as keyof typeof colors] || '#6B7280'
  },

  // Get notebook level color
  getNotebookLevelColor(level: 'bronze' | 'silver' | 'gold') {
    const colors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
    }
    return colors[level]
  }
}

// Export as default
export default supabase

// =============================================
// USAGE EXAMPLES
// =============================================

/*
// Create a new notebook
const newNotebook = await notebookOperations.create({
  user_id: 'user-uuid',
  title: 'Spanish Vocabulary',
  language: 'Spanish',
  language_code: 'es'
})

// Add words to a page
const words = await wordOperations.addToPage([
  {
    page_id: 'page-uuid',
    word: 'hola',
    meaning: 'hello',
    position_in_page: 1
  },
  {
    page_id: 'page-uuid',
    word: 'gracias',
    meaning: 'thank you',
    position_in_page: 2
  }
])

// Process a review
const result = await reviewOperations.processReview(
  'word-uuid',
  true, // remembered
  2500, // response time in ms
  'session-uuid'
)

// Subscribe to real-time changes
const subscription = subscriptions.subscribeToNotebooks(
  'user-uuid',
  (payload) => {
    console.log('Notebook changed:', payload)
  }
)
*/