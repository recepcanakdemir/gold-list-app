import { supabase } from '@/lib/supabase/client'
import { Database, Tables } from '@/lib/types/database'
import { PostgrestError } from '@supabase/supabase-js'

// =============================================
// PERFORMANCE & RELIABILITY HELPERS
// =============================================

// Retry configuration for database operations
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
}

// Safe retry wrapper for database operations
async function withRetry<T>(
  operation: () => Promise<T>, 
  operationName: string = 'database operation',
  retries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await operation()
      
      // Log success if it took multiple attempts
      if (attempt > 0) {
        console.log(`✅ ${operationName} succeeded after ${attempt + 1} attempts`)
      }
      
      return result
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on the last attempt
      if (attempt === retries) {
        console.error(`❌ ${operationName} failed after ${retries + 1} attempts:`, error)
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
        RETRY_CONFIG.maxDelay
      )
      
      console.warn(`⚠️ ${operationName} failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms:`, error)
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Simple cache for read-only data
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()
  
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // Default 5 minutes
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  clear(keyPattern?: string): void {
    if (keyPattern) {
      // Clear keys matching pattern
      for (const key of this.cache.keys()) {
        if (key.includes(keyPattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }
  
  size(): number {
    return this.cache.size
  }
}

// Global cache instance
const dataCache = new SimpleCache()

// Time provider for simulation support
let timeProvider: (() => Date) | null = null

export function setTimeProvider(provider: () => Date) {
  timeProvider = provider
}

function getCurrentDate(): Date {
  return timeProvider ? timeProvider() : new Date()
}

// Type definitions
export type Notebook = Tables<'notebooks'>
export type Page = Tables<'pages'>
export type Word = Tables<'words'>
export type Review = Tables<'reviews'>
export type UserProfile = Tables<'user_profiles'>

export interface PageWithWords extends Page {
  words: Word[]
  notebook: Notebook
}

export interface WordWithReviews extends Word {
  reviews: Review[]
  page: Page
  nextReviewDate: Date | null
  daysSinceCreated: number
  isReviewable: boolean
  daysUntilReview: number
}

export interface CreateWordData {
  word: string
  translation: string
  meaning: string
  notes?: string
  example_sentence?: string
  sentence_bold?: string
  sentence_meaning?: string
  meaning_bold?: string
  word_type?: string
  position_in_page: number
}

export interface ReviewOptions {
  page?: number
  limit?: number
}

export interface DailyProgress {
  date: string
  wordsAdded: number
  wordsReviewed: number
  hasActivity: boolean
}

class SupabaseService {
  private reviewCallTracker = new Map<string, number>()
  private pendingCalls = new Map<string, Promise<any>>()
  
  // Authentication caching to reduce network calls
  private cachedUser: any = null
  private userCacheExpiry: number = 0
  private readonly USER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  // Cached authentication - replaces 12 redundant getUser() calls
  private async getCachedUser(): Promise<any> {
    // Return cached user if still valid
    if (this.cachedUser && Date.now() < this.userCacheExpiry) {
      return this.cachedUser
    }
    
    // Refresh cache with new auth check
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!user) throw new Error('Not authenticated')
    
    // Cache the result
    this.cachedUser = user
    this.userCacheExpiry = Date.now() + this.USER_CACHE_TTL
    console.log('🔐 User authentication cached for 5 minutes')
    
    return user
  }
  
  // Clear auth cache (call when user logs out or auth changes)
  clearAuthCache(): void {
    this.cachedUser = null
    this.userCacheExpiry = 0
    console.log('🗑️ Authentication cache cleared')
  }

  // Create a new notebook
  async createNotebook(data: { title: string; language: string; language_code: string; words_per_day: number; notebook_level?: 'bronze' | 'silver' | 'gold' }): Promise<Notebook | null> {
    const user = await this.getCachedUser()

    console.log('📝 Creating notebook without bulk pages...')
    
    const { data: notebook, error } = await supabase
      .from('notebooks')
      .insert({
        user_id: user.id,
        title: data.title,
        language: data.language,
        language_code: data.language_code,
        words_per_day: data.words_per_day,
        notebook_level: data.notebook_level || 'bronze', // Use provided level or default to Bronze
        created_at: getCurrentDate().toISOString() // Use simulation time in dev, real time in production
      })
      .select()
      .single()

    if (error) throw error
    if (!notebook) return null

    console.log('📔 Notebook created successfully - now creating first page...')

    // Create the first page separately
    const { data: firstPage, error: pageError } = await supabase
      .from('pages')
      .insert({
        notebook_id: notebook.id,
        page_number: 1,
        date_created: getCurrentDate().toISOString().split('T')[0],
        target_round: 1,
        words_count: 0,
        is_completed: false,
        is_unlocked: true,
        unlock_date: getCurrentDate().toISOString().split('T')[0],
        next_review_date: null,
        created_at: getCurrentDate().toISOString() // Use simulation time in dev, real time in production
      })
      .select()
      .single()

    if (pageError) {
      console.error('Error creating first page:', pageError)
    } else {
      console.log('✅ First page created successfully')
    }

    return notebook
  }

  // Get or create today's page for the notebook
  async getTodaysPage(notebookId: string): Promise<PageWithWords | null> {
    // Apply debounce to prevent excessive calls
    const callKey = `todaysPage-${notebookId}`
    const now = Date.now()
    const lastCall = this.reviewCallTracker.get(callKey) || 0
    
    if (now - lastCall < 300) {
      const pendingCall = this.pendingCalls.get(callKey)
      return pendingCall || null
    }
    
    this.reviewCallTracker.set(callKey, now)
    
    // PERFORMANCE: Add retry logic to critical operation
    const promise = withRetry(
      () => this._performGetTodaysPage(notebookId),
      `getTodaysPage(${notebookId.slice(0, 8)})`
    )
    this.pendingCalls.set(callKey, promise)
    
    try {
      const result = await promise
      return result
    } finally {
      // Clean up the pending call
      this.pendingCalls.delete(callKey)
    }
  }
  
  private async _performGetTodaysPage(notebookId: string): Promise<PageWithWords | null> {
    const user = await this.getCachedUser()

    // Get notebook to find creation date and calculate current day
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', notebookId)
      .single()

    if (notebookError) throw notebookError
    if (!notebook) return null

    // Always calculate page number from notebook-specific creation time
    // This ensures each notebook has its own independent timeline
    const currentDateTime = getCurrentDate()
    const notebookCreated = new Date(notebook.created_at)
    const daysSinceCreation = Math.floor(
      (currentDateTime.getTime() - notebookCreated.getTime()) / (24 * 60 * 60 * 1000)
    ) + 1 // Day 1, not Day 0
    const todaysPageNumber = daysSinceCreation

    // Enforce 200-page limit - no pages beyond day 200
    if (todaysPageNumber > 200) {
      console.log(`📖 Notebook ${notebookId.slice(0, 8)} has reached 200-page limit (day ${todaysPageNumber})`)
      return null // No page available beyond day 200
    }

    // Check if today's page already exists
    let { data: existingPage, error: pageError } = await supabase
      .from('pages')
      .select(`
        *,
        words!words_page_id_fkey (*)
      `)
      .eq('notebook_id', notebookId)
      .eq('page_number', todaysPageNumber)
      .single()

    // If page doesn't exist, create it
    if (pageError?.code === 'PGRST116' || !existingPage) {
      const { data: newPage, error: createError } = await supabase
        .from('pages')
        .insert({
          notebook_id: notebookId,
          page_number: todaysPageNumber,
          date_created: getCurrentDate().toISOString().split('T')[0],
          target_round: 1,
          words_count: 0,
          is_completed: false,
          is_unlocked: true,
          unlock_date: getCurrentDate().toISOString().split('T')[0],
          next_review_date: null,
          created_at: getCurrentDate().toISOString() // Use simulation time in dev, real time in production
        })
        .select(`
          *,
          words!words_page_id_fkey (*)
        `)
        .single()

      // Handle race condition: if page was created by another concurrent call
      if (createError?.code === '23505') { // Unique constraint violation
        console.log(`🔄 Page ${todaysPageNumber} was created by another process - fetching existing page`)
        
        // Fetch the page that was created by the other process
        const { data: existingPageAfterRace, error: fetchError } = await supabase
          .from('pages')
          .select(`
            *,
            words!words_page_id_fkey (*)
          `)
          .eq('notebook_id', notebookId)
          .eq('page_number', todaysPageNumber)
          .single()

        if (fetchError) {
          console.error(`❌ Failed to fetch page after race condition:`, fetchError)
          throw fetchError
        }

        return {
          ...existingPageAfterRace,
          notebook
        } as PageWithWords
      }

      // Handle other creation errors
      if (createError) {
        console.error(`❌ Failed to create page ${todaysPageNumber}:`, createError)
        throw createError
      }
      
      if (!newPage) return null
      
      return {
        ...newPage,
        notebook
      } as PageWithWords
    }
    
    // CRITICAL FIX: Ensure existing page is unlocked if it should be accessible
    // Check if page should be unlocked based on notebook timeline
    const shouldBeUnlocked = todaysPageNumber <= daysSinceCreation
    
    // If page should be unlocked but isn't, fix it in database
    if (shouldBeUnlocked && !existingPage.is_unlocked) {
      const { error: unlockError } = await supabase
        .from('pages')
        .update({
          is_unlocked: true,
          unlock_date: getCurrentDate().toISOString().split('T')[0]
        })
        .eq('id', existingPage.id)
      
      if (!unlockError) {
        // Update the local object to reflect the change
        existingPage.is_unlocked = true
        existingPage.unlock_date = getCurrentDate().toISOString().split('T')[0]
      }
    }
    
    return {
      ...existingPage,
      notebook
    } as PageWithWords
  }

  // Update notebook last used timestamp
  async updateNotebookLastUsed(notebookId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notebooks')
        .update({ 
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        })
        .eq('id', notebookId)

      if (error) {
        console.warn('Failed to update notebook last used timestamp:', error)
        // Don't throw - this is a nice-to-have feature
      }
    } catch (error) {
      console.warn('Error updating notebook last used:', error)
    }
  }

  // Rest of the methods remain the same...
  async getNotebooks(): Promise<Notebook[]> {
    const user = await this.getCachedUser()

    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async addWords(pageId: string, words: CreateWordData[]): Promise<{ success: boolean }> {
    return withRetry(async () => {
      if (!words || words.length === 0) {
        throw new Error('No words provided')
      }

      console.log(`💾 Adding ${words.length} words to page: ${pageId}`)
      
      const user = await this.getCachedUser()

      console.log('📄 Getting page details...')
      
      // Get page details first
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single()

      if (pageError) throw pageError
      if (!page) throw new Error('Page not found')

      console.log('🔄 Preparing word data for insertion...')

      // Prepare words for insertion
      const wordsToInsert = words.map((word, index) => ({
        notebook_id: page.notebook_id,
        page_id: pageId,
        word: word.word,
        translation: word.translation,
        meaning: word.meaning || word.translation,
        notes: word.notes || null,
        example_sentence: word.example_sentence || null,
        sentence_bold: word.sentence_bold || null,
        sentence_meaning: word.sentence_meaning || null,
        meaning_bold: word.meaning_bold || null,
        word_type: word.word_type || 'unknown',
        position_in_page: word.position_in_page,
        current_round: 1 as 1,  // Cast to round_number enum type
        is_mastered: false,
        review_date: (() => {
          const currentDate = new Date(getCurrentDate())
          currentDate.setHours(0, 0, 0, 0)
          const reviewDate = new Date(currentDate.getTime() + 13 * 24 * 60 * 60 * 1000)
          
          // Use local date formatting to avoid timezone issues
          const year = reviewDate.getFullYear()
          const month = String(reviewDate.getMonth() + 1).padStart(2, '0')
          const day = String(reviewDate.getDate()).padStart(2, '0')
          const reviewDateStr = `${year}-${month}-${day}`
          
          console.log(`🗓️ TIMING DEBUG - Word created on ${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}, review_date set to ${reviewDateStr} (added 13 days for Day 15 review)`)
          return reviewDateStr
        })(),
        times_reviewed: 0,
        status: 'learning',
        // Lineage tracking for Silver/Gold progression
        source_notebook_id: page.notebook_id, // Track original Bronze notebook
        original_page_id: pageId // Track original Bronze page
      }))

      console.log('⚡ Executing 3 operations in parallel: words insert, page update, profile query...')
      
      // Debug: Log the words being inserted to check if bold fields are included
      console.log('🔍 DATABASE INSERT DEBUG - Words to insert:')
      wordsToInsert.forEach((word, index) => {
        console.log(`  Word ${index + 1}: ${word.word}`)
        console.log(`    sentence_bold: ${word.sentence_bold}`)
        console.log(`    meaning_bold: ${word.meaning_bold}`)
        console.log(`    example_sentence: ${word.example_sentence}`)
        console.log(`    sentence_meaning: ${word.sentence_meaning}`)
      })

      // Get notebook details to check words_per_day limit
      const { data: notebook, error: notebookError } = await supabase
        .from('notebooks')
        .select('words_per_day')
        .eq('id', page.notebook_id)
        .single()

      if (notebookError) throw notebookError
      
      const dailyWordLimit = notebook?.words_per_day || 20

      // First: Insert words and get profile in parallel  
      const [wordsResult, profileUpdateResult] = await Promise.allSettled([
        // Insert words
        supabase.from('words').insert(wordsToInsert),
        
        // Get current profile for stats update
        supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
      ])

      // Check words insert result
      if (wordsResult.status === 'rejected') {
        throw wordsResult.reason
      }

      // Second: Update page with proper word count and completion logic (AFTER words are inserted)
      const pageUpdateResult = await supabase.rpc('update_page_with_completion_check', {
        p_page_id: pageId,
        p_daily_limit: dailyWordLimit,
        p_added_words_count: words.length
      })

      // Check page update result
      if (pageUpdateResult.error) {
        console.warn('Failed to update page completion:', pageUpdateResult.error)
      }

      console.log('👤 Updating profile stats...')

      // Update profile stats
      if (profileUpdateResult.status === 'fulfilled') {
        const { data: currentProfile } = profileUpdateResult.value
        await supabase.from('user_profiles').update({
          total_words_added: (currentProfile?.total_words_added || 0) + words.length,
          updated_at: new Date().toISOString()
        }).eq('user_id', user.id)
      }

      console.log(`✅ Successfully added ${words.length} words`)
      
      // Record streak activity (multi-notebook aware, prevents double-counting)
      try {
        await this.recordActivity(user.id, getCurrentDate())
      } catch (streakError) {
        console.error('Error recording streak activity:', streakError)
        // Don't throw - streak tracking is non-critical
      }
      
      // Update cached profile stats for social features
      try {
        await this.updateProfileStats(words.length, 0)
      } catch (profileError) {
        console.error('Error updating profile stats:', profileError)
        // Don't throw - profile stats tracking is non-critical
      }
      
      return { success: true }
    }, `addWords(${pageId.slice(0, 8)}, ${words.length} words)`)
  }

  // Additional methods that are being called
  async getNotebook(id: string): Promise<Notebook | null> {
    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  // Update notebook title
  async updateNotebookTitle(notebookId: string, newTitle: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('notebooks')
        .update({ 
          title: newTitle,
          updated_at: new Date().toISOString()
        })
        .eq('id', notebookId)

      if (error) throw error
      
      // Clear cache to ensure fresh data on next load
      this.clearCache()
    }, 'updateNotebookTitle')
  }

  // Delete notebook and all related data
  async deleteNotebook(notebookId: string): Promise<void> {
    return withRetry(async () => {
      // Delete in correct order to maintain referential integrity
      // Reviews -> Words -> Pages -> Notebook
      
      // First, get all pages for this notebook
      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select('id')
        .eq('notebook_id', notebookId)

      if (pagesError) throw pagesError

      if (pages && pages.length > 0) {
        const pageIds = pages.map(page => page.id)

        // Get all words for these pages
        const { data: words, error: wordsError } = await supabase
          .from('words')
          .select('id')
          .in('page_id', pageIds)

        if (wordsError) throw wordsError

        if (words && words.length > 0) {
          const wordIds = words.map(word => word.id)

          // Delete all reviews for these words
          const { error: reviewsError } = await supabase
            .from('reviews')
            .delete()
            .in('word_id', wordIds)

          if (reviewsError) throw reviewsError

          // Delete all words
          const { error: deleteWordsError } = await supabase
            .from('words')
            .delete()
            .in('page_id', pageIds)

          if (deleteWordsError) throw deleteWordsError
        }

        // Delete all pages
        const { error: deletePagesError } = await supabase
          .from('pages')
          .delete()
          .eq('notebook_id', notebookId)

        if (deletePagesError) throw deletePagesError
      }

      // Finally, delete the notebook
      const { error: deleteNotebookError } = await supabase
        .from('notebooks')
        .delete()
        .eq('id', notebookId)

      if (deleteNotebookError) throw deleteNotebookError
      
      // Clear cache to ensure fresh data on next load
      this.clearCache()
    }, 'deleteNotebook')
  }

  // Streak Management Functions
  async updateStreak(userId: string, hasActivity: boolean, currentDate?: Date): Promise<void> {
    const today = (currentDate || new Date()).toISOString().split('T')[0]
    console.log(`🔥 supabaseService: updateStreak called - hasActivity=${hasActivity}, date=${today}`)
    
    return withRetry(async () => {
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('streak_count, longest_streak, streak_miss_count, last_activity_date')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError
      if (!profile) throw new Error('Profile not found')

      const today = (currentDate || new Date()).toISOString().split('T')[0] // YYYY-MM-DD format
      const lastActivity = profile.last_activity_date
      
      let newStreakCount = profile.streak_count
      let newLongestStreak = profile.longest_streak
      let newMissCount = profile.streak_miss_count || 0
      let newLastActivityDate = lastActivity

      if (hasActivity) {
        // User did something today
        const daysSinceLastActivity = lastActivity ? 
          Math.floor((new Date(today).getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) : 999

        console.log(`🔥 supabaseService: User HAS activity - daysSinceLastActivity=${daysSinceLastActivity}`)

        if (daysSinceLastActivity <= 2) {
          // Consecutive day or within 2-day grace period (as per user requirement)
          newStreakCount += 1
          console.log(`🔥 supabaseService: Within grace period, streak increased to ${newStreakCount}`)
        } else {
          // Too many days missed (>2), start new streak
          newStreakCount = 1
          console.log(`🔥 supabaseService: Too many days missed, streak reset to 1`)
        }

        // Update longest streak if current streak is higher
        if (newStreakCount > newLongestStreak) {
          newLongestStreak = newStreakCount
        }

        newMissCount = 0
        newLastActivityDate = today
      } else {
        // User missed today - check if we should reset
        const daysSinceLastActivity = lastActivity ? 
          Math.floor((new Date(today).getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) : 999

        console.log(`🔥 supabaseService: User MISSED day - daysSinceLastActivity=${daysSinceLastActivity}, currentStreak=${profile.streak_count}`)

        if (daysSinceLastActivity > 2) {
          // More than 2 days missed, reset streak (as per user requirement)
          newStreakCount = 0
          newMissCount = 0
          console.log(`🔥 supabaseService: >2 days missed, RESETTING streak to 0`)
        } else {
          // Within grace period, increment miss count but keep streak
          newMissCount = Math.min(newMissCount + 1, 2)
          console.log(`🔥 supabaseService: Within grace period, keeping streak=${newStreakCount}, missCount=${newMissCount}`)
        }
        // Note: We don't update last_activity_date when missing
      }

      // Update the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          streak_count: newStreakCount,
          longest_streak: newLongestStreak,
          streak_miss_count: newMissCount,
          last_activity_date: newLastActivityDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) throw updateError

      console.log(`🔥 Streak updated for user ${userId.slice(0, 8)}: ${newStreakCount} days`)
    }, 'updateStreak')
  }

  async getStreakStatus(userId: string): Promise<{
    streakCount: number
    longestStreak: number
    missCount: number
    lastActivityDate: string | null
    daysInGracePeriod: number
  }> {
    return withRetry(async () => {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('streak_count, longest_streak, streak_miss_count, last_activity_date')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (!profile) throw new Error('Profile not found')

      const today = new Date().toISOString().split('T')[0]
      const lastActivity = profile.last_activity_date
      
      const daysSinceLastActivity = lastActivity ? 
        Math.floor((new Date(today).getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)) : 0

      const daysInGracePeriod = Math.max(0, Math.min(2, daysSinceLastActivity - 1))

      return {
        streakCount: profile.streak_count,
        longestStreak: profile.longest_streak,
        missCount: profile.streak_miss_count || 0,
        lastActivityDate: profile.last_activity_date,
        daysInGracePeriod
      }
    }, 'getStreakStatus')
  }

  async recordActivity(userId: string, currentDate?: Date): Promise<void> {
    // This function is called when user does a streak-worthy activity
    // Implements smart daily activity checking to prevent double-counting
    return withRetry(async () => {
      const today = (currentDate || getCurrentDate()).toISOString().split('T')[0]
      
      // Check if user already has activity recorded for today
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('last_activity_date')
        .eq('id', userId)
        .single()

      if (fetchError) throw fetchError
      if (!profile) throw new Error('Profile not found')

      // If user already has activity today, don't double-count
      if (profile.last_activity_date === today) {
        console.log(`🔥 Activity already recorded for today (${today}), skipping duplicate`)
        return
      }

      // Record activity and update streak
      console.log(`🔥 Recording first activity of the day (${today}) - updating streak`)
      await this.updateStreak(userId, true, currentDate)
    }, 'recordActivity')
  }


  async getPages(notebookId: string): Promise<PageWithWords[]> {
    // Fetch actual pages from database with all context fields
    const { data: realPages, error } = await supabase
      .from('pages')
      .select(`
        *,
        words!words_page_id_fkey (*)
      `)
      .eq('notebook_id', notebookId)
      .order('page_number', { ascending: true })

    if (error) throw error
    
    const realPagesData = realPages || []
    
    // Generate 200 total pages (real + virtual) while preserving context data
    const allPages: PageWithWords[] = []
    
    // Get notebook creation date for unlock logic
    const { data: notebook } = await supabase
      .from('notebooks')
      .select('created_at')
      .eq('id', notebookId)
      .single()
    
    const notebookCreated = notebook ? new Date(notebook.created_at) : new Date()
    const currentDate = getCurrentDate()
    
    // Calculate days since THIS notebook's creation (notebook-specific timeline)
    const daysSinceNotebookCreation = Math.floor(
      (currentDate.getTime() - notebookCreated.getTime()) / (24 * 60 * 60 * 1000)
    ) + 1 // Add 1 because day 1 is creation day
    
    for (let pageNum = 1; pageNum <= 200; pageNum++) {
      // Check if real page exists for this page number
      const existingPage = realPagesData.find(p => p.page_number === pageNum)
      
      if (existingPage) {
        // Use existing page with all its data including context
        allPages.push(existingPage)
      } else {
        // Create virtual page with notebook-specific unlock logic
        const isUnlocked = pageNum <= daysSinceNotebookCreation
        const unlockDate = new Date(notebookCreated)
        unlockDate.setDate(unlockDate.getDate() + pageNum - 1)
        
        // Create virtual page with null context initially
        const virtualPage: PageWithWords = {
          id: `virtual-${pageNum}`,
          notebook_id: notebookId,
          page_number: pageNum,
          date_created: unlockDate.toISOString().split('T')[0],
          target_round: 1,
          words_count: 0,
          is_completed: false,
          is_unlocked: isUnlocked,
          unlock_date: unlockDate.toISOString().split('T')[0],
          next_review_date: null,
          created_at: unlockDate.toISOString(),
          updated_at: unlockDate.toISOString(),
          // Context fields - initially null for virtual pages
          context_title: null,
          context_source: null,
          context_description: null,
          context_theme: null,
          // Words array
          words: []
        }
        
        allPages.push(virtualPage)
      }
    }
    
    return allPages
  }

  // Create a new page in the database
  async createPage(notebookId: string, pageNumber: number): Promise<Page> {
    const today = getCurrentDate()
    
    const { data: page, error } = await supabase
      .from('pages')
      .insert({
        notebook_id: notebookId,
        page_number: pageNumber,
        date_created: today.toISOString().split('T')[0],
        target_round: 1,
        words_count: 0,
        is_completed: false,
        is_unlocked: true,
        unlock_date: today.toISOString().split('T')[0],
        next_review_date: null,
        created_at: today.toISOString(), // Use simulation time in dev, real time in production
        // Context fields start as null
        context_title: null,
        context_source: null,
        context_description: null,
        context_theme: null
      })
      .select()
      .single()

    if (error) throw error
    return page
  }

  // Check if there are any words due for review today across all user's notebooks
  async getAllWordsForReviewToday(): Promise<any[]> {
    return withRetry(async () => {
      let user
      try {
        const { data } = await supabase.auth.getUser()
        user = data.user
        if (!user) return []
      } catch (error) {
        console.warn('Authentication check failed:', error)
        return []
      }

      const currentDateTime = getCurrentDate()
      const currentDate = new Date(currentDateTime)
      currentDate.setHours(0, 0, 0, 0)
      const currentDateString = currentDate.toISOString().split('T')[0]
      console.log(`🕰️ getAllWordsForReviewToday DEBUG - getCurrentDate(): ${currentDateTime.toISOString()}`)
      console.log(`🕰️ getAllWordsForReviewToday DEBUG - Normalized currentDate: ${currentDateString}`)
      
      // Get ALL words for review (Bronze, Silver, Gold by round classification)
      const { data: allWords, error: wordsError } = await supabase
        .from('words')
        .select(`
          id,
          word,
          translation,
          meaning,
          notes,
          example_sentence,
          word_type,
          current_round,
          review_date,
          last_reviewed,
          times_reviewed,
          page_id,
          page:pages!page_id(
            id,
            page_number,
            notebook_id,
            context_title,
            context_source,
            context_description,
            context_theme,
            notebook:notebooks!inner(user_id, title, notebook_level)
          )
        `)
        .eq('page.notebook.user_id', user.id)
        .eq('page.notebook.notebook_level', 'bronze')  // All words still in Bronze notebooks
        .eq('is_mastered', false)
        .eq('status', 'learning')
        .not('review_date', 'is', null)
        .order('current_round', { ascending: true })
        .order('page_number', { ascending: true, foreignTable: 'page' })
        .order('id', { ascending: true })

      if (wordsError) {
        throw new Error(`Failed to get words for review: ${wordsError.message}`)
      }

      // Filter words that are due today or overdue (accumulate missed reviews)
      const reviewableWords = (allWords || []).filter(word => {
        const reviewDateString = word.review_date
        const isDue = reviewDateString <= currentDateString
        
        // Classify words by their current round for logging
        const badgeType = word.current_round <= 4 ? 'Bronze' : 
                         word.current_round <= 8 ? 'Silver' : 'Gold'
        const displayRound = word.current_round <= 4 ? word.current_round :
                           word.current_round <= 8 ? word.current_round - 4 : 
                           word.current_round - 8
        
        console.log(`🔍 ${badgeType} Word ${word.id}: reviewDate=${reviewDateString}, currentDate=${currentDateString}, isDue=${isDue}`)
        return isDue
      })

      // Count words by badge type for logging
      const bronzeWords = reviewableWords.filter(w => w.current_round <= 4)
      const silverWords = reviewableWords.filter(w => w.current_round >= 5 && w.current_round <= 8)
      const goldWords = reviewableWords.filter(w => w.current_round >= 9 && w.current_round <= 12)
      
      console.log(`📅 Found ${bronzeWords.length} Bronze words and ${silverWords.length + goldWords.length} Silver/Gold words due for review today`)
      console.log(`📅 Total: ${reviewableWords.length} words from ${new Set(reviewableWords.map(w => (w.page as any).notebook_id)).size} pages/sessions`)
      
      return reviewableWords
    }, 'getAllWordsForReviewToday')
  }

  async hasWordsForReviewToday(): Promise<{ hasReviews: boolean; notebookId?: string; pageNumber?: number }> {
    // Use the unified function to check for any reviewable words
    const reviewableWords = await this.getAllWordsForReviewToday()
    
    if (reviewableWords.length === 0) {
      return { hasReviews: false }
    }

    // For the button navigation, we'll use a special route for unified reviews
    // But we still need a notebook ID for the route, so use the first one
    const firstWord = reviewableWords[0]
    const page = firstWord.page as any
    
    return { 
      hasReviews: true,
      notebookId: page.notebook_id,
      pageNumber: null // null indicates unified review mode
    }
  }

  async hasWordsForReviewTodayForNotebook(notebookId: string): Promise<{ hasReviews: boolean; pageNumber?: number }> {
    return withRetry(async () => {
      const user = await this.getCachedUser()

      const currentDate = getCurrentDate()
      const reviewDate = new Date(currentDate)
      reviewDate.setHours(0, 0, 0, 0)

      const { data: reviewableWords, error } = await supabase
        .from('words')
        .select(`
          id,
          review_date,
          is_mastered,
          word,
          page:pages!words_page_id_fkey(
            id,
            page_number,
            notebook_id,
            created_at
          )
        `)
        .eq('notebook_id', notebookId)
        .eq('is_mastered', false)
        .not('review_date', 'is', null)
        .lte('review_date', reviewDate.toISOString())

      if (error) {
        console.error(`Error checking words for review (${notebookId.slice(0, 8)}):`, error)
        throw error
      }

      if (!reviewableWords || reviewableWords.length === 0) {
        return { hasReviews: false }
      }

      const firstWord = reviewableWords[0]
      const page = firstWord.page as any
      
      // Defensive check for null page data
      if (!page) {
        console.warn(`Word ${firstWord.id} has null page data - skipping review check for notebook ${notebookId.slice(0, 8)}`)
        return { hasReviews: false }
      }
      
      return { 
        hasReviews: true,
        pageNumber: page.page_number
      }
    }, `hasWordsForReviewTodayForNotebook(${notebookId.slice(0, 8)})`)
  }

  async getWordsForReview(notebookId: string): Promise<WordWithReviews[]> {
    return withRetry(async () => {
      const user = await this.getCachedUser()

      // Get all words from the notebook with page data including context
      const { data: wordsData, error } = await supabase
        .from('words')
        .select(`
          *,
          page:pages!page_id(
            id,
            page_number,
            notebook_id,
            context_title,
            context_source,
            context_description,
            context_theme
          )
        `)
        .eq('notebook_id', notebookId)

      if (error) throw error
      if (!wordsData) return []

      const notebookWords = wordsData

      // Transform to WordWithReviews format
      return notebookWords.map(word => {
        const currentDate = getCurrentDate()
        currentDate.setHours(0, 0, 0, 0)
        
        let daysSinceCreated: number
        let daysUntilReview: number
        
        const wordCreated = new Date(word.created_at)
        wordCreated.setHours(0, 0, 0, 0)
        daysSinceCreated = Math.floor(
          (currentDate.getTime() - wordCreated.getTime()) / (24 * 60 * 60 * 1000)
        )
        daysUntilReview = 0 // Already filtered by database function

        return {
          ...word,
          // Add required properties for WordWithReviews interface
          reviews: [],
          page: { id: word.page_id || null } as any,
          nextReviewDate: null,
          daysSinceCreated,
          isReadyForReview: true, // Note: property name should be isReadyForReview, not isReviewable
          // Legacy badge properties (kept for compatibility)
          badge_type: word.badge_type || null,
          review_type: word.review_type || 'word',
          notebook_level: word.notebook_level || 'bronze'
        }
      })
    }, `getWordsForReview(${notebookId.slice(0, 8)})`)
  }

  async processWordReview(
    wordId: string, 
    remembered: boolean, 
    reviewType: 'word' | 'page' = 'word'
  ): Promise<{ success: boolean; badgeAcquired?: string; migrationTriggered?: boolean }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
      const currentDate = getCurrentDate()
      const currentDateString = currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
      
      if (reviewType === 'page') {
        // Handle page-based review for Silver/Gold
        const { data: word } = await supabase
          .from('words')
          .select('page_id')
          .eq('id', wordId)
          .single()
        
        if (!word?.page_id) throw new Error('Page ID not found for word')
        
        const { data: pageReviewResult, error } = await supabase.rpc('update_page_review_result', {
          p_page_id: word.page_id,
          p_remembered: remembered,
          p_current_date: currentDateString
        })

        if (error) throw error

        const result = pageReviewResult?.[0]
        console.log(`✅ Page review processed: ${word.page_id}, remembered: ${remembered}`)
        
        return { 
          success: true,
          badgeAcquired: result?.badge_acquired,
          migrationTriggered: result?.migration_triggered
        }
      } else {
        // Handle word-based review for Bronze
        let { error } = await supabase.rpc('update_word_review_result', {
          p_word_id: wordId,
          p_remembered: remembered,
          p_current_date: currentDateString
        })

        // If enhanced function doesn't exist, use client-side update with simulation support
        if (error && error.code === 'PGRST202') {
          console.log('📝 Using client-side update with simulation date support')
          return await this.processWordReviewClientSide(wordId, remembered, currentDateString)
        }

        if (error) {
          console.error('Error processing word review:', error)
          throw error
        }

        console.log(`✅ Word review processed: ${wordId}, remembered: ${remembered}`)
        return { success: true }
      }
    } catch (error) {
      console.error('Failed to process word review:', error)
      throw error
    }
  }

  // Client-side word review processing with simplified 12-round system
  async processWordReviewClientSide(wordId: string, remembered: boolean, currentDate: string): Promise<{ success: boolean }> {
    // Get current word state
    const { data: word, error: fetchError } = await supabase
      .from('words')
      .select('current_round, notebook_id, page_id, times_reviewed')
      .eq('id', wordId)
      .single()

    if (fetchError) throw fetchError
    if (!word) throw new Error('Word not found')

    let updateData: any = {
      times_reviewed: (word.times_reviewed || 0) + 1,
      last_reviewed: currentDate,
      updated_at: new Date().toISOString()
    }

    if (remembered) {
      // Remembered words are mastered and removed from future reviews
      updateData.is_mastered = true
      updateData.status = 'mastered'
      updateData.review_date = null
      console.log(`🏆 Word ${wordId} remembered and mastered (round ${word.current_round})`)
    } else {
      // Forgotten words advance to next round (1-12)
      const nextRound = word.current_round + 1
      
      if (nextRound > 12) {
        // Even Gold Round 4 failures (Round 12+) become mastered
        updateData.is_mastered = true
        updateData.status = 'mastered'
        updateData.current_round = 12  // Cap at round 12
        updateData.review_date = null
        console.log(`🏆 Word ${wordId} reached maximum difficulty (Gold Round 4) - now mastered`)
      } else {
        // Continue learning at next round
        const nextReviewDate = new Date(currentDate)
        nextReviewDate.setDate(nextReviewDate.getDate() + 14)
        const nextReviewDateString = nextReviewDate.toISOString().split('T')[0]
        
        updateData.current_round = nextRound as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
        updateData.review_date = nextReviewDateString
        updateData.status = 'learning'
        
        // Log with badge information for user clarity
        const badgeType = nextRound <= 4 ? 'Bronze' : nextRound <= 8 ? 'Silver' : 'Gold'
        const displayRound = nextRound <= 4 ? nextRound : nextRound <= 8 ? nextRound - 4 : nextRound - 8
        console.log(`📈 Word ${wordId} forgotten - advanced to ${badgeType} Round ${displayRound} (database round ${nextRound})`)
      }
    }

    // Update the word
    const { error: updateError } = await supabase
      .from('words')
      .update(updateData)
      .eq('id', wordId)

    if (updateError) throw updateError

    // Update notebook last activity
    await supabase
      .from('notebooks')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', word.notebook_id)

    console.log(`✅ Word review processed (simplified system): ${wordId}, remembered: ${remembered}`)
    return { success: true }
  }

  // Batch process multiple word reviews for better performance
  // Check for notebook progressions after reviews are completed
  async checkNotebookProgressions(reviews: Array<{ wordId: string; remembered: boolean }>): Promise<{ 
    silverCreated: boolean; 
    silverMigratedCount: number; 
    goldCreated: boolean; 
    goldMigratedCount: number;
    silverNotebookId?: string;
    bronzeNotebookTitle?: string;
    silverNotebookTitle?: string;
  }> {
    console.log(`🔍 Checking progressions for ${reviews.length} reviews`)
    
    // Get word details for progression checking
    const wordIds = reviews.map(r => r.wordId)
    const { data: words } = await supabase
      .from('words')
      .select(`
        id, current_round, notebook_id,
        notebooks!inner(id, title, notebook_level)
      `)
      .in('id', wordIds)
    
    if (!words) {
      console.log('❌ No words found for progression check')
      return {
        silverCreated: false,
        silverMigratedCount: 0,
        goldCreated: false,
        goldMigratedCount: 0
      }
    }
    
    // Check for Round 4 failures that need progression
    const round4Failures = words.filter(word => {
      const review = reviews.find(r => r.wordId === word.id)
      return word.current_round === 4 && review && !review.remembered
    })
    
    let silverCreated = false
    let silverMigratedCount = 0
    let goldCreated = false
    let goldMigratedCount = 0
    let silverNotebookId: string | undefined
    let bronzeNotebookTitle: string | undefined
    let silverNotebookTitle: string | undefined
    
    if (round4Failures.length > 0) {
      console.log(`📈 Found ${round4Failures.length} Round 4 failures needing progression`)
      
      // Group by notebook level for different progression paths
      const bronzeFailures = round4Failures.filter(w => w.notebooks.notebook_level === 'bronze')
      const silverFailures = round4Failures.filter(w => w.notebooks.notebook_level === 'silver')
      
      // Handle Bronze → Silver progression
      if (bronzeFailures.length > 0) {
        console.log(`🥉→🥈 Processing ${bronzeFailures.length} Bronze → Silver progressions`)
        try {
          // Run Bronze→Silver migration
          const { data: migrationResult } = await supabase.rpc('migrate_failed_bronze_words_to_silver')
          
          if (migrationResult && migrationResult.length > 0) {
            const result = migrationResult[0]
            silverCreated = result.badges_created > 0
            silverMigratedCount = result.words_migrated || bronzeFailures.length
            bronzeNotebookTitle = bronzeFailures[0]?.notebooks.title
            
            console.log(`✅ Bronze→Silver migration: ${silverMigratedCount} words, ${result.badges_created} badges created`)
          }
        } catch (error) {
          console.error('❌ Bronze→Silver migration failed:', error)
        }
      }
      
      // Handle Silver → Gold progression
      if (silverFailures.length > 0) {
        console.log(`🥈→🥇 Processing ${silverFailures.length} Silver → Gold progressions`)
        try {
          // Run Silver→Gold migration
          const { data: migrationResult } = await supabase.rpc('migrate_failed_silver_pages_to_gold')
          
          if (migrationResult && migrationResult.length > 0) {
            const result = migrationResult[0]
            goldCreated = result.badges_created > 0
            goldMigratedCount = result.words_migrated || silverFailures.length
            silverNotebookTitle = silverFailures[0]?.notebooks.title
            
            console.log(`✅ Silver→Gold migration: ${goldMigratedCount} words, ${result.badges_created} badges created`)
          }
        } catch (error) {
          console.error('❌ Silver→Gold migration failed:', error)
        }
      }
    }
    
    console.log(`📊 Progression results: Silver created: ${silverCreated} (${silverMigratedCount} words), Gold created: ${goldCreated} (${goldMigratedCount} words)`)
    
    return {
      silverCreated,
      silverMigratedCount,
      goldCreated,
      goldMigratedCount,
      silverNotebookId,
      bronzeNotebookTitle,
      silverNotebookTitle
    }
  }

  async processBatchWordReviews(reviews: Array<{ wordId: string; remembered: boolean }>): Promise<{ 
    success: boolean; 
    silverCreated: boolean; 
    silverMigratedCount: number; 
    goldCreated: boolean; 
    goldMigratedCount: number;
    silverNotebookId?: string;
    bronzeNotebookTitle?: string;
    silverNotebookTitle?: string;
  }> {
    if (reviews.length === 0) return { success: true, silverCreated: false, silverMigratedCount: 0, goldCreated: false, goldMigratedCount: 0 }

    // Safety net: Deduplicate reviews to prevent database errors
    const originalLength = reviews.length
    const deduplicatedReviews = reviews.filter((review, index, arr) => 
      arr.findIndex(r => r.wordId === review.wordId) === index
    )
    
    if (deduplicatedReviews.length !== originalLength) {
      console.warn(`⚠️ Database safety net: Removed ${originalLength - deduplicatedReviews.length} duplicate word reviews`)
    }

    return withRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      try {
      const currentDate = getCurrentDate()
      const currentDateString = currentDate.toISOString().split('T')[0]
      
      console.log(`📦 Processing batch of ${deduplicatedReviews.length} word reviews...`)

      // Try using the optimized database RPC function first
      try {
        console.log(`⚡ Using optimized database RPC for batch processing...`)
        
        // Process each review using the optimized database function
        const rpcPromises = deduplicatedReviews.map(review => 
          supabase.rpc('update_word_review_result', {
            p_word_id: review.wordId,
            p_remembered: review.remembered,
            p_current_date: currentDateString
          })
        )

        // Execute all RPC calls in parallel for maximum speed
        const results = await Promise.all(rpcPromises)
        
        // Check for any errors
        const errors = results.filter(result => result.error)
        if (errors.length > 0) {
          console.warn(`⚠️ ${errors.length} RPC calls failed, falling back to client-side processing`)
          throw new Error('RPC batch processing had errors')
        }

        console.log(`🚀 RPC batch processing completed: ${deduplicatedReviews.length} words processed via database functions`)
      } catch (rpcError) {
        console.log(`🔄 RPC failed, falling back to client-side batch processing...`, rpcError)

        // Fallback to client-side batch processing
        // Get all words data in one query
        const wordIds = deduplicatedReviews.map(r => r.wordId)
        const { data: words, error: fetchError } = await supabase
          .from('words')
          .select('id, current_round, notebook_id, page_id, times_reviewed, last_reviewed, created_at, difficulty_tag, cycle_count')
          .in('id', wordIds)

        if (fetchError) throw fetchError
        if (!words || words.length !== deduplicatedReviews.length) {
          console.error(`❌ Database mismatch: Expected ${deduplicatedReviews.length} words, found ${words?.length || 0}`)
          console.error(`Missing word IDs:`, deduplicatedReviews.filter(r => !words?.find(w => w.id === r.wordId)).map(r => r.wordId))
          throw new Error('Some words not found')
        }

        // Prepare batch updates
        const wordsToUpdate = []

        for (const review of deduplicatedReviews) {
          const word = words.find(w => w.id === review.wordId)
          if (!word) continue

          // Calculate next review date using CURRENT review date (not old last_reviewed)
          let nextReviewDateString: string | undefined
          if (!review.remembered && word.current_round < 12) {
            // Calculate next review date for all forgotten words (rounds 1-11) that continue learning
            // Use current review date + 14 days for consistent Gold List Method timing
            const baseDate = new Date(currentDate)
            const nextReviewDate = new Date(baseDate)
            nextReviewDate.setDate(nextReviewDate.getDate() + 14)
            
            // Validate the calculated next review date
            if (isNaN(nextReviewDate.getTime())) {
              console.error(`❌ Invalid next review date for word ${word.id}, skipping date calculation`)
            } else {
              nextReviewDateString = nextReviewDate.toISOString().split('T')[0]
              console.log(`📅 Word ${word.id} next review: ${currentDateString} + 14 days = ${nextReviewDateString}`)
            }
          }

          let updateData: any = {
            id: word.id,
            times_reviewed: (word.times_reviewed || 0) + 1,
            last_reviewed: currentDateString,
            updated_at: new Date().toISOString()
          }

          if (review.remembered) {
            // Remembered words are mastered and removed from future reviews
            updateData.is_mastered = true
            updateData.status = 'mastered'
            // No review_date needed - they're done forever
            console.log(`🏆 Word ${word.id} remembered and mastered (round ${word.current_round})`)
          } else {
            // Forgotten words advance to next round (1-12) - simplified system
            const nextRound = word.current_round + 1
            
            // Ensure default values for new fields
            if (updateData.difficulty_tag === undefined) {
              updateData.difficulty_tag = 'NORMAL'
            }
            if (updateData.cycle_count === undefined) {
              updateData.cycle_count = 0
            }
            
            if (nextRound > 12) {
              // Gold Round 4 failure - cycle back to Round 1 with increased difficulty
              const currentCycle = (word as any).cycle_count || 0
              const newCycle = currentCycle + 1
              
              let newDifficultyTag: 'EXTREMELY_HARD' | 'MASTER_LEVEL' | 'LEGENDARY'
              if (newCycle === 1) {
                newDifficultyTag = 'EXTREMELY_HARD'
              } else if (newCycle === 2) {
                newDifficultyTag = 'MASTER_LEVEL'
              } else {
                newDifficultyTag = 'LEGENDARY'
              }
              
              updateData.current_round = 1  // Reset to Round 1 (Bronze Round 1)
              updateData.difficulty_tag = newDifficultyTag
              updateData.cycle_count = newCycle
              updateData.review_date = nextReviewDateString
              updateData.status = 'learning'
              
              console.log(`🔄 Word ${word.id} failed Gold Round 4 - cycling to ${newDifficultyTag} (cycle ${newCycle})`)
            } else {
              // Continue learning at next round
              updateData.current_round = nextRound as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
              updateData.review_date = nextReviewDateString
              updateData.status = 'learning'
              
              // Log with badge information for user clarity
              const badgeType = nextRound <= 4 ? 'Bronze' : nextRound <= 8 ? 'Silver' : 'Gold'
              const displayRound = nextRound <= 4 ? nextRound : nextRound <= 8 ? nextRound - 4 : nextRound - 8
              console.log(`📈 Word ${word.id} forgotten - advanced to ${badgeType} Round ${displayRound} (database round ${nextRound})`)
            }
          }

          wordsToUpdate.push(updateData)
        }

        // Batch update all words in parallel for maximum performance
        if (wordsToUpdate.length > 0) {
          console.log(`⚡ Updating ${wordsToUpdate.length} words in parallel...`)
          
          // Process updates in parallel for dramatic speed improvement
          const updatePromises = wordsToUpdate.map(async (wordUpdate) => {
            const { error } = await supabase
              .from('words')
              .update(wordUpdate)
              .eq('id', wordUpdate.id)
            
            if (error) {
              console.error(`Error updating word ${wordUpdate.id}:`, error)
              throw error
            }
            return wordUpdate.id
          })

          // Wait for all updates to complete
          const results = await Promise.all(updatePromises)
          console.log(`🚀 Parallel update completed: ${results.length} words updated`)
        }

        // Update notebook last activity in parallel (get unique notebook IDs)
        const notebookIds = [...new Set(words.map(w => w.notebook_id))]
        if (notebookIds.length > 0) {
          const notebookUpdatePromises = notebookIds.map(notebookId => 
            supabase
              .from('notebooks')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', notebookId)
          )
          await Promise.all(notebookUpdatePromises)
          console.log(`📚 Updated ${notebookIds.length} notebooks in parallel`)
        }
      }

      // Update profile statistics for mastered words
      const masteredWordsCount = deduplicatedReviews.filter(r => r.remembered).length
      if (masteredWordsCount > 0) {
        console.log(`📊 Updating profile: ${masteredWordsCount} words mastered`)
        try {
          const { data: currentProfile } = await supabase
            .from('user_profiles')
            .select('total_words_mastered')
            .eq('user_id', user.id)
            .single()

          await supabase
            .from('user_profiles')
            .update({
              total_words_mastered: (currentProfile?.total_words_mastered || 0) + masteredWordsCount,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
        } catch (profileError) {
          console.error('Failed to update profile mastered words count:', profileError)
          // Don't throw - mastery tracking is non-critical
        }
      }

      // Record streak activity for review session (multi-notebook aware, prevents double-counting)
      if (deduplicatedReviews.length > 0) {
        try {
          await this.recordActivity(user.id, getCurrentDate())
        } catch (streakError) {
          console.error('Error recording streak activity:', streakError)
          // Don't throw - streak tracking is non-critical
        }
      }

      // After all reviews are processed, check for Silver/Gold progression
      const progressionResults = await this.checkNotebookProgressions(reviews)
      
      // Update cached profile stats for social features
      try {
        const masteredCount = reviews.filter(r => r.remembered).length
        if (masteredCount > 0) {
          await this.updateProfileStats(0, masteredCount)
        }
      } catch (profileError) {
        console.error('Error updating profile stats:', profileError)
        // Don't throw - profile stats tracking is non-critical
      }
      
      console.log(`✅ Batch review completed: ${reviews.length} words processed`)
      return { 
        success: true,
        silverCreated: progressionResults.silverCreated,
        silverMigratedCount: progressionResults.silverMigratedCount,
        goldCreated: progressionResults.goldCreated,
        goldMigratedCount: progressionResults.goldMigratedCount,
        silverNotebookId: progressionResults.silverNotebookId,
        bronzeNotebookTitle: progressionResults.bronzeNotebookTitle,
        silverNotebookTitle: progressionResults.silverNotebookTitle
      }
    } catch (error) {
      console.error('Failed to process batch word reviews:', error)
      throw error
    }
    }, `processBatchWordReviews(${reviews.length} words)`)
  }

  async unlockTodaysPages(): Promise<void> {
    // Simplified - do nothing for now
  }

  async getWeeklyProgress(): Promise<{ day: string; wordsAdded: number; wordsRemembered: number; completed: boolean }[]> {
    return withRetry(async () => {
      // Get last 7 days of daily progress
      const dailyProgress = await this.getDailyProgress(7)
      
      // Convert to the format expected by dashboard
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const result = []
      
      // Generate rolling 7-day window ending with TODAY (rightmost)
      const currentDate = getCurrentDate()
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate)
        date.setDate(date.getDate() - i)
        const dayName = weekDays[date.getDay()]
        const dateStr = date.toISOString().split('T')[0]
        
        // Find matching daily progress data
        const dayData = dailyProgress.find(d => d.date === dateStr)
        const wordsAdded = dayData?.wordsAdded || 0
        const wordsRemembered = dayData?.wordsRemembered || 0
        
        result.push({
          day: dayName,
          wordsAdded: wordsAdded,
          wordsRemembered: wordsRemembered,
          completed: wordsAdded > 0 // Consider completed if any words were added
        })
      }
      
      console.log(`📊 Generated rolling 7-day window: ${result.map(r => r.day).join('-')} (TODAY: ${result[result.length - 1].day})`)
      return result
      
    }, 'getWeeklyProgress')
  }

  async getMonthlyProgress(): Promise<{ month: string; wordsAdded: number; wordsMastered: number }[]> {
    return withRetry(async () => {
      // Get last 7 months of daily progress (approximately 210 days)
      const dailyProgress = await this.getDailyProgress(210)
      
      // Group data by month
      const monthlyStats: { [key: string]: { wordsAdded: number; wordsMastered: number } } = {}
      
      dailyProgress.forEach(day => {
        const date = new Date(day.date)
        const monthKey = date.toISOString().substring(0, 7) // YYYY-MM format
        
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = { wordsAdded: 0, wordsMastered: 0 }
        }
        
        monthlyStats[monthKey].wordsAdded += day.wordsAdded
        monthlyStats[monthKey].wordsMastered += day.wordsRemembered
      })
      
      // Convert to array and get last 7 months
      const currentDate = getCurrentDate()
      const result = []
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(currentDate)
        date.setMonth(date.getMonth() - i)
        const monthKey = date.toISOString().substring(0, 7)
        const monthName = date.toLocaleDateString('en-US', { month: 'short' })
        
        const monthData = monthlyStats[monthKey] || { wordsAdded: 0, wordsMastered: 0 }
        
        result.push({
          month: monthName,
          wordsAdded: monthData.wordsAdded,
          wordsMastered: monthData.wordsMastered
        })
      }
      
      console.log(`📊 Generated monthly progress for 7 months`)
      return result
      
    }, 'getMonthlyProgress')
  }

  // Get real-time total words statistics from database
  async getTotalWordsStats(): Promise<{ totalAdded: number; totalMastered: number }> {
    return withRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { totalAdded: 0, totalMastered: 0 }

      // Get user's notebook IDs
      const { data: notebooks } = await supabase
        .from('notebooks')
        .select('id')
        .eq('user_id', user.id)

      if (!notebooks || notebooks.length === 0) {
        return { totalAdded: 0, totalMastered: 0 }
      }

      const notebookIds = notebooks.map(n => n.id)

      // Count total words added and mastered in parallel
      const [totalWordsResult, masteredWordsResult] = await Promise.all([
        supabase
          .from('words')
          .select('id', { count: 'exact', head: true })
          .in('notebook_id', notebookIds),
        supabase
          .from('words')
          .select('id', { count: 'exact', head: true })
          .in('notebook_id', notebookIds)
          .eq('is_mastered', true)
      ])

      const totalAdded = totalWordsResult.count || 0
      const totalMastered = masteredWordsResult.count || 0

      console.log(`📊 Real-time stats: ${totalAdded} total words, ${totalMastered} mastered`)
      return { totalAdded, totalMastered }
    }, 'getTotalWordsStats')
  }

  async updateProfileStats(deltaAdded: number = 0, deltaMastered: number = 0): Promise<void> {
    return withRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log(`📊 Updating profile stats: +${deltaAdded} added, +${deltaMastered} mastered`)

      // Get current profile stats first
      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('total_words_added, total_words_mastered')
        .eq('id', user.id)
        .single()

      if (selectError) throw selectError
      if (!profile) throw new Error('Profile not found')

      // Calculate new values
      const newTotalAdded = (profile.total_words_added || 0) + deltaAdded
      const newTotalMastered = (profile.total_words_mastered || 0) + deltaMastered

      // Update with new calculated values
      const { error } = await supabase
        .from('profiles')
        .update({
          total_words_added: newTotalAdded,
          total_words_mastered: newTotalMastered
        })
        .eq('id', user.id)

      if (error) throw error
      console.log(`✅ Profile stats updated: ${newTotalAdded} total added, ${newTotalMastered} total mastered`)
    }, 'updateProfileStats')
  }

  async syncProfileStats(): Promise<void> {
    return withRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      console.log(`🔄 Syncing profile stats with database reality...`)

      // Get real-time stats from the words table
      const realStats = await this.getTotalWordsStats()
      
      // Update the profile table to match reality
      const { error } = await supabase
        .from('profiles')
        .update({
          total_words_added: realStats.totalAdded,
          total_words_mastered: realStats.totalMastered
        })
        .eq('id', user.id)

      if (error) throw error
      console.log(`✅ Profile stats synced: ${realStats.totalAdded} added, ${realStats.totalMastered} mastered`)
    }, 'syncProfileStats')
  }

  async getTodayProgress(): Promise<{ wordsAdded: number; goal: number; completed: boolean }> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { wordsAdded: 0, goal: 20, completed: false }

      const currentDate = getCurrentDate()
      const todayDateStr = currentDate.toISOString().split('T')[0]

      // Get today's page and check if it has words
      const { data: pages, error } = await supabase
        .from('pages')
        .select(`
          id,
          words_count,
          is_completed,
          notebook:notebooks!notebook_id(user_id, words_per_day)
        `)
        .eq('notebooks.user_id', user.id)
        .eq('date_created', todayDateStr)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error getting today progress:', error)
        return { wordsAdded: 0, goal: 20, completed: false }
      }

      if (!pages) {
        // No page created for today yet
        return { wordsAdded: 0, goal: 20, completed: false }
      }

      const wordsAdded = pages.words_count || 0
      const goal = (pages.notebook as any).words_per_day || 20
      const completed = pages.is_completed || wordsAdded >= goal

      return {
        wordsAdded,
        goal,
        completed
      }
    } catch (error) {
      console.error('Error in getTodayProgress:', error)
      return { wordsAdded: 0, goal: 20, completed: false }
    }
  }

  async getDailyProgress(days: number): Promise<DailyProgress[]> {
    return withRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const currentDate = getCurrentDate()
      
      // Generate date range for the requested number of days
      const dailyStats: { [key: string]: DailyProgress } = {}

      console.log(`📊 Getting daily progress for ${days} days using page-level data`)

      // Initialize all days with zero values
      for (let i = 0; i < days; i++) {
        const date = new Date(currentDate)
        date.setDate(date.getDate() - (days - 1 - i)) // Start from oldest day
        const dateStr = date.toISOString().split('T')[0]
        
        dailyStats[dateStr] = {
          date: dateStr,
          wordsAdded: 0,
          wordsReviewed: 0,
          wordsRemembered: 0,
          wordsForgotten: 0,
          sessionDurationMinutes: 0
        }
      }

      // Get all pages created within the date range (like getTodayProgress does)
      const startDateStr = Object.keys(dailyStats)[0] // First date in range
      const endDateStr = Object.keys(dailyStats)[Object.keys(dailyStats).length - 1] // Last date in range

      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select(`
          date_created,
          words_count,
          notebook:notebooks!notebook_id(user_id)
        `)
        .eq('notebooks.user_id', user.id)
        .gte('date_created', startDateStr)
        .lte('date_created', endDateStr)

      if (pagesError) {
        console.error('Error fetching pages data:', pagesError)
        return Object.values(dailyStats)
      }

      // Sum up words added from pages by date_created
      pages?.forEach(page => {
        const dateStr = page.date_created
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].wordsAdded += page.words_count || 0
        }
      })

      // Get ALL review data within the date range (not limited to specific pages)
      // This captures all review activity regardless of when words were originally added
      const { data: allUserWords } = await supabase
        .from('words')
        .select('id, notebook_id')
        .in('notebook_id', (await supabase
          .from('notebooks')
          .select('id')
          .eq('user_id', user.id)
        ).data?.map(n => n.id) || [])

      if (allUserWords && allUserWords.length > 0) {
        const allWordIds = allUserWords.map(w => w.id)
        
        // Query ALL reviews for user's words within the date range
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('reviewed_at, remembered')
          .in('word_id', allWordIds)
          .gte('reviewed_at', startDateStr)
          .lte('reviewed_at', endDateStr + 'T23:59:59.999Z')

        if (!reviewsError && reviewsData) {
          console.log(`📊 Found ${reviewsData.length} reviews in date range`)
          
          // Count review activities
          reviewsData.forEach(review => {
            const dateStr = review.reviewed_at.split('T')[0]
            if (dailyStats[dateStr]) {
              dailyStats[dateStr].wordsReviewed++
              if (review.remembered) {
                dailyStats[dateStr].wordsRemembered++
              } else {
                dailyStats[dateStr].wordsForgotten++
              }
            }
          })
        } else if (reviewsError) {
          console.error('Error fetching reviews data:', reviewsError)
        }

        // Also get mastered words from words table (when is_mastered = true, last_reviewed = mastery date)
        const { data: userNotebooks } = await supabase
          .from('notebooks')
          .select('id')
          .eq('user_id', user.id)

        if (userNotebooks && userNotebooks.length > 0) {
          const notebookIds = userNotebooks.map(n => n.id)
          
          const { data: masteredWords, error: masteredError } = await supabase
            .from('words')
            .select('last_reviewed')
            .in('notebook_id', notebookIds)
            .eq('is_mastered', true)
            .gte('last_reviewed', startDateStr)
            .lte('last_reviewed', endDateStr + 'T23:59:59.999Z')

          if (!masteredError && masteredWords) {
            console.log(`📊 Found ${masteredWords.length} mastered words in date range`)
            
            // Count mastered words by their last_reviewed date (which is their mastery date)
            masteredWords.forEach(word => {
              const dateStr = word.last_reviewed.split('T')[0]
              if (dailyStats[dateStr]) {
                dailyStats[dateStr].wordsRemembered++
                dailyStats[dateStr].wordsReviewed++
              }
            })
          } else if (masteredError) {
            console.error('Error fetching mastered words data:', masteredError)
          }
        }
      }

      // Convert to array and sort by date (newest first)
      const result = Object.values(dailyStats).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )

      console.log(`📊 Generated daily progress for ${result.length} days using page-level data`)
      console.log(`📊 Sample daily stats:`, result.slice(0, 3))
      return result

    }, 'getDailyProgress')
  }

  async getTotalWordsCount(): Promise<number> {
    // Return 0 for now
    return 0
  }

  async getMasteredWordsCount(): Promise<number> {
    // Return 0 for now
    return 0
  }

  // PERFORMANCE: Batch review checking for multiple notebooks
  async hasWordsForReviewTodayBatch(notebookIds: string[]): Promise<Map<string, { hasReviews: boolean; pageNumber?: number }>> {
    if (notebookIds.length === 0) {
      return new Map()
    }
    
    return withRetry(async () => {
      const user = await this.getCachedUser()
      const currentDate = getCurrentDate()
      const reviewDate = new Date(currentDate)
      reviewDate.setHours(0, 0, 0, 0)

      console.log(`🚀 Batch checking reviews for ${notebookIds.length} notebooks...`)
      const startTime = Date.now()

      // Single query to get reviewable words for ALL notebooks at once
      const { data: reviewableWords, error } = await supabase
      .from('words')
      .select(`
        id,
        notebook_id,
        review_date,
        is_mastered,
        word,
        page:pages!words_page_id_fkey(
          id,
          page_number,
          notebook_id,
          created_at
        )
      `)
      .in('notebook_id', notebookIds)
      .eq('is_mastered', false)
      .not('review_date', 'is', null)
      .lte('review_date', reviewDate.toISOString())

    if (error) {
      console.error('Error in batch review check:', error)
      // Fallback to individual checks
      const results = new Map<string, { hasReviews: boolean; pageNumber?: number }>()
      for (const notebookId of notebookIds) {
        try {
          const result = await this.hasWordsForReviewTodayForNotebook(notebookId)
          results.set(notebookId, result)
        } catch (err) {
          results.set(notebookId, { hasReviews: false })
        }
      }
      return results
    }

    // Group results by notebook
    const resultMap = new Map<string, { hasReviews: boolean; pageNumber?: number }>()
    
    // Initialize all notebooks with no reviews
    notebookIds.forEach(id => {
      resultMap.set(id, { hasReviews: false })
    })

    // Process reviewable words and group by notebook
    const notebookWordsMap = new Map<string, any[]>()
    reviewableWords?.forEach(word => {
      if (!notebookWordsMap.has(word.notebook_id)) {
        notebookWordsMap.set(word.notebook_id, [])
      }
      notebookWordsMap.get(word.notebook_id)!.push(word)
    })

    // Set results for notebooks that have reviews
    notebookWordsMap.forEach((words, notebookId) => {
      if (words.length > 0) {
        // Find the page number of the first reviewable word
        const firstWord = words[0]
        const pageNumber = firstWord.page?.page_number
        
        resultMap.set(notebookId, {
          hasReviews: true,
          pageNumber: pageNumber
        })
      }
    })

    const batchTime = Date.now() - startTime
    console.log(`✅ Batch review check completed in ${batchTime}ms for ${notebookIds.length} notebooks (${reviewableWords?.length || 0} reviewable words found)`)

    return resultMap
    }, `hasWordsForReviewTodayBatch(${notebookIds.length} notebooks)`)
  }

  async clearReviewCallTracker() {
    this.reviewCallTracker.clear()
    this.pendingCalls.clear()
  }

  // =============================================
  // SILVER & GOLD NOTEBOOK SYSTEM
  // =============================================

  // Check if Bronze notebook has words that failed Round 4
  async checkBronzeRound4Failures(notebookId: string): Promise<{ hasFailures: boolean; failedWords: any[] }> {
    // Badge system removed - return no failures
    return { hasFailures: false, failedWords: [] }
  }

  // Check if Silver notebook has words that failed Round 4 (for Gold migration)
  async checkSilverRound4Failures(notebookId: string): Promise<{ hasFailures: boolean; failedWords: any[] }> {
    // Badge system removed - return no failures
    return { hasFailures: false, failedWords: [] }
  }

  // Create Silver notebook automatically
  async createSilverNotebook(bronzeNotebookId: string): Promise<any> {
    // Badge system removed - return null
    return null
  }

  // Create Gold notebook automatically
  async createGoldNotebook(silverNotebookId: string): Promise<any> {
    // Badge system removed - return null
    return null
  }

  // Migrate failed Bronze words to Silver notebook
  async migrateBronzeToSilver(bronzeNotebookId: string, silverNotebookId: string, failedWordIds: string[]): Promise<any[]> {
    // Badge system removed - return empty array
    return []
  }

  // Migrate failed Silver words to Gold notebook  
  async migrateSilverToGold(silverNotebookId: string, goldNotebookId: string, failedWordIds: string[]): Promise<any[]> {
    // Badge system removed - return empty array
    return []
  }

  // Archive Gold words that fail Round 4 (mark as "super hard")
  async archiveGoldFailures(goldNotebookId: string, failedWordIds: string[]): Promise<number> {
    // Badge system removed - return 0
    return 0
  }

  // Check if Silver notebook exists for a Bronze notebook
  async getSilverNotebook(bronzeNotebookId: string): Promise<any | null> {
    // Badge system removed - return null
    return null
  }

  // Check if Gold notebook exists for a Silver notebook
  async getGoldNotebook(silverNotebookId: string): Promise<any | null> {
    // Badge system removed - return null
    return null
  }

  // Main function to handle Bronze → Silver progression
  async handleBronzeProgression(notebookId: string): Promise<{ 
    silverCreated: boolean; 
    silverNotebookId?: string; 
    migratedCount: number;
    bronzeNotebookTitle?: string;
    silverNotebookTitle?: string;
  }> {
    // Badge system removed - return no progression
    const bronzeNotebook = await this.getNotebook(notebookId)
    const bronzeNotebookTitle = bronzeNotebook?.title || 'Bronze Notebook'
    return { silverCreated: false, migratedCount: 0, bronzeNotebookTitle }
  }

  // Main function to handle Silver → Gold progression
  async handleSilverProgression(notebookId: string): Promise<{ goldCreated: boolean; goldNotebookId?: string; migratedCount: number }> {
    // Badge system removed - return no progression
    return { goldCreated: false, migratedCount: 0 }
  }

  // Main function to handle Gold → Archive progression
  async handleGoldProgression(notebookId: string): Promise<{ archivedCount: number }> {
    // Badge system removed - return no progression
    return { archivedCount: 0 }
  }

  // =============================================
  // CACHE UTILITY METHODS
  // =============================================

  // Clear cache when data changes (call after create/update/delete operations)
  clearCache(pattern?: string) {
    dataCache.clear(pattern)
    console.log(`🧹 Cache cleared${pattern ? ` (pattern: ${pattern})` : ''}, size: ${dataCache.size()}`)
  }

  // Get cached data with automatic fallback to database
  async getCachedData<T>(
    cacheKey: string,
    fetchFunction: () => Promise<T>,
    ttl: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    // Try cache first
    const cached = dataCache.get<T>(cacheKey)
    if (cached !== null) {
      console.log(`📦 Cache hit: ${cacheKey}`)
      return cached
    }

    // Cache miss - fetch from database
    console.log(`🔍 Cache miss: ${cacheKey} - fetching from database`)
    const data = await fetchFunction()
    
    // Store in cache
    dataCache.set(cacheKey, data, ttl)
    
    return data
  }

  // ==========================================
  // BADGE SYSTEM METHODS (NEW)
  // Replace Silver/Gold notebook system with badges
  // ==========================================

  // Create a badge for a Bronze notebook
  async createNotebookBadge(bronzeNotebookId: string, badgeType: 'silver' | 'gold'): Promise<string> {
    // Badge system removed - return empty string
    return ''
  }

  // Badge system removed - return empty array
  async getNotebookBadges(bronzeNotebookId: string): Promise<any[]> {
    return []
  }

  // Badge system removed - return empty result
  async addWordsToBadge(badgeId: string, wordIds: string[]): Promise<{
    pageId: string
    pageCompleted: boolean
    reviewDateSet: string | null
  }[]> {
    return []
  }

  // Get reviewable badge pages
  async getReviewableBadgePages(badgeId: string): Promise<any[]> {
    return withRetry(async () => {
      const { data: pages, error } = await supabase
        .rpc('get_reviewable_badge_pages', {
          p_badge_id: badgeId
        })

      if (error) {
        throw new Error(`Failed to get reviewable badge pages: ${error.message}`)
      }

      return pages || []
    }, 'getReviewableBadgePages')
  }

  // Check for Round 4 failures and create badges as needed
  async handleBronzeProgressionWithBadges(notebookId: string): Promise<{
    silverCreated: boolean
    silverBadgeId?: string
    migratedCount: number
    bronzeNotebookTitle?: string
    silverNotebookTitle?: string
  }> {
    // Badge system removed - return no progression
    const bronzeNotebook = await this.getNotebook(notebookId)
    const bronzeNotebookTitle = bronzeNotebook?.title || 'Bronze Notebook'
    return { silverCreated: false, migratedCount: 0, bronzeNotebookTitle }
  }

  // Mark words as migrated (helper function)
  async markWordsAsMigrated(wordIds: string[]): Promise<void> {
    // Badge system removed - no action needed
    return
  }

  // Get words for badge page review (page-based review system)
  async getWordsForBadgeReview(badgeId: string, pageId: string): Promise<WordWithReviews[]> {
    // Badge system removed - return empty array
    return []
  }

  // Get all reviewable content for user (both Bronze notebooks and badges)
  async getAllReviewableContent(): Promise<{
    bronzeWords: WordWithReviews[]
    badgePages: Array<{
      badgeId: string
      badgeType: string
      pageId: string
      pageNumber: number
      reviewDate: string
      wordsCount: number
      bronzeNotebookTitle: string
    }>
  }> {
    return withRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const currentDate = getCurrentDate()
      const currentDateString = currentDate.toISOString().split('T')[0]

      // Get Bronze notebook words (existing logic)
      const { data: bronzeWords, error: bronzeError } = await supabase
        .rpc('get_words_for_review', { p_user_id: user.id })

      if (bronzeError) {
        console.error('Error getting Bronze words:', bronzeError)
      }

      // Get reviewable badge pages  
      const { data: badgePages, error: badgeError } = await supabase
        .from('pages')
        .select(`
          id,
          page_number,
          review_date,
          words_count,
          badge_id,
          notebook_badges!badge_id(
            badge_type,
            bronze_notebook_id,
            notebooks!bronze_notebook_id(title)
          )
        `)
        .not('badge_id', 'is', null)
        .eq('status', 'ready_for_review')
        .lte('review_date', currentDateString)
        .order('review_date', { ascending: true })

      if (badgeError) {
        console.error('Error getting badge pages:', badgeError)
      }

      // Format badge pages data
      const formattedBadgePages = (badgePages || []).map(page => ({
        badgeId: page.badge_id,
        badgeType: (page.notebook_badges as any)?.badge_type || 'unknown',
        pageId: page.id,
        pageNumber: page.page_number,
        reviewDate: page.review_date,
        wordsCount: page.words_count,
        bronzeNotebookTitle: (page.notebook_badges as any)?.notebooks?.title || 'Unknown Notebook'
      }))

      console.log(`📚 Found ${bronzeWords?.length || 0} Bronze words and ${formattedBadgePages.length} badge pages for review`)

      return {
        bronzeWords: bronzeWords || [],
        badgePages: formattedBadgePages
      }
    }, 'getAllReviewableContent')
  }

  // Process badge page review results (page-based system)
  async processBadgePageReview(
    pageId: string, 
    badgeId: string,
    reviews: Array<{ wordId: string; remembered: boolean }>
  ): Promise<{
    success: boolean
    pageAdvanced: boolean
    newReviewDate?: string
    migrationNeeded?: boolean
    nextLevel?: 'gold' | 'archived'
  }> {
    return withRetry(async () => {
      const currentDate = getCurrentDate()
      const currentDateString = currentDate.toISOString().split('T')[0]

      // Process individual word reviews first
      for (const review of reviews) {
        if (review.remembered) {
          // Remembered words are mastered
          await supabase
            .from('words')
            .update({
              is_mastered: true,
              status: 'mastered',
              times_reviewed: supabase.sql`times_reviewed + 1`,
              last_reviewed: currentDateString,
              updated_at: new Date().toISOString()
            })
            .eq('id', review.wordId)
        } else {
          // Forgotten words just get their review count updated
          await supabase
            .from('words')
            .update({
              times_reviewed: supabase.sql`times_reviewed + 1`,
              last_reviewed: currentDateString,
              updated_at: new Date().toISOString()
            })
            .eq('id', review.wordId)
        }
      }

      // Get current page info
      const { data: page, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('id', pageId)
        .single()

      if (pageError || !page) {
        throw new Error('Page not found')
      }

      const forgottenWords = reviews.filter(r => !r.remembered)

      if (page.status === 'ready_for_review') {
        // Check if this was Round 4 of page
        if (page.target_round >= 4) {
          // Round 4 completed - handle migration if needed
          if (forgottenWords.length > 0) {
            // Mark page as needing migration
            await supabase
              .from('pages')
              .update({ status: 'migrated' })
              .eq('id', pageId)

            return {
              success: true,
              pageAdvanced: false,
              migrationNeeded: true,
              nextLevel: 'gold' // Silver → Gold migration
            }
          } else {
            // All words mastered - mark page as completed
            await supabase
              .from('pages')
              .update({ status: 'completed' })
              .eq('id', pageId)

            return {
              success: true,
              pageAdvanced: false
            }
          }
        } else {
          // Advance to next round
          const nextReviewDate = new Date(currentDate)
          nextReviewDate.setDate(nextReviewDate.getDate() + 14)
          const nextReviewDateString = nextReviewDate.toISOString().split('T')[0]

          await supabase
            .from('pages')
            .update({
              target_round: page.target_round + 1,
              review_date: nextReviewDateString
            })
            .eq('id', pageId)

          return {
            success: true,
            pageAdvanced: true,
            newReviewDate: nextReviewDateString
          }
        }
      }

      return { success: true, pageAdvanced: false }
    }, 'processBadgePageReview')
  }

  // Universal review function - handles both Bronze notebooks and badge pages
  async getReviewContent(id: string, type?: 'notebook' | 'badge' | 'page'): Promise<{
    type: 'notebook' | 'badge'
    data: any
    words: WordWithReviews[]
  }> {
    return withRetry(async () => {
      // First, try to determine what type of ID this is
      if (!type) {
        // Auto-detect type by checking if it's a notebook or badge/page
        const { data: notebook } = await supabase
          .from('notebooks')
          .select('id, notebook_level')
          .eq('id', id)
          .single()

        if (notebook) {
          type = 'notebook'
        } else {
          // Check if it's a badge ID
          const { data: badge } = await supabase
            .from('notebook_badges')
            .select('id')
            .eq('id', id)
            .single()

          if (badge) {
            type = 'badge'
          } else {
            // Check if it's a page ID
            const { data: page } = await supabase
              .from('pages')
              .select('id, badge_id')
              .eq('id', id)
              .single()

            if (page && page.badge_id) {
              type = 'page'
            } else {
              throw new Error('Invalid review ID - not a notebook, badge, or page')
            }
          }
        }
      }

      if (type === 'notebook') {
        // Bronze notebook review (existing logic)
        const words = await this.getWordsForReview(id)
        const notebook = await this.getNotebook(id)
        return {
          type: 'notebook',
          data: notebook,
          words
        }
      } else if (type === 'badge') {
        // Badge review - get first reviewable page
        const pages = await this.getReviewableBadgePages(id)
        if (pages.length === 0) {
          return {
            type: 'badge',
            data: { id, pages: [] },
            words: []
          }
        }
        
        const firstPage = pages[0]
        const words = await this.getWordsForBadgeReview(id, firstPage.page_id)
        return {
          type: 'badge',
          data: { id, currentPage: firstPage, totalPages: pages.length },
          words
        }
      } else if (type === 'page') {
        // Specific page review
        const { data: page } = await supabase
          .from('pages')
          .select(`
            *,
            notebook_badges!badge_id(*)
          `)
          .eq('id', id)
          .single()

        if (!page || !page.badge_id) {
          throw new Error('Page not found or not a badge page')
        }

        const words = await this.getWordsForBadgeReview(page.badge_id, id)
        return {
          type: 'badge',
          data: { 
            id: page.badge_id, 
            currentPage: { pageId: id, ...page },
            totalPages: 1 
          },
          words
        }
      }

      throw new Error('Invalid review type')
    }, 'getReviewContent')
  }

  // Badge migration functions
  // Badge system removed - return zero migrations
  async runBadgeMigrations(): Promise<{
    bronzeToSilverWords: number
    silverToGoldPages: number
    badgesCreated: number
  }> {
    return {
      bronzeToSilverWords: 0,
      silverToGoldPages: 0,
      badgesCreated: 0
    }
  }

  async migrateBronzeWordsToSilver(): Promise<{
    wordsMigrated: number
    badgesCreated: number
    pagesCreated: number
  }> {
    // Badge system removed - return zero values
    return { wordsMigrated: 0, badgesCreated: 0, pagesCreated: 0 }
  }

  async migrateSilverPagesToGold(): Promise<{
    pagesMigrated: number
    wordsMigrated: number
    badgesCreated: number
  }> {
    // Badge system removed - return zero values
    return { pagesMigrated: 0, wordsMigrated: 0, badgesCreated: 0 }
  }

  async getNotebookBadges(bronzeNotebookId: string): Promise<Array<{
    id: string
    badge_type: 'silver' | 'gold'
    created_at: string
    total_words: number
    active_pages_count: number
    reviewable_pages_count: number
  }>> {
    return withRetry(async () => {
      const { data: badges, error } = await supabase.rpc('get_notebook_badges', {
        p_bronze_notebook_id: bronzeNotebookId
      })
      
      if (error) throw error
      
      return badges || []
    }, 'getNotebookBadges')
  }

  // Background migration automation
  private migrationSchedulerRef: number | null = null
  private isSchedulingMigrations = false

  async startAutomatedMigrations(intervalMinutes: number = 5): Promise<void> {
    if (this.isSchedulingMigrations) {
      console.log('🔄 Migration scheduler already running')
      return
    }

    this.isSchedulingMigrations = true
    console.log(`🤖 Starting automated migrations every ${intervalMinutes} minutes`)

    const runMigrations = async () => {
      try {
        const result = { bronzeToSilverWords: 0, silverToGoldPages: 0 } // Badge system removed
        
        if (result.bronzeToSilverWords > 0 || result.silverToGoldPages > 0) {
          console.log('🎉 Automated migration completed:', result)
          
          // Trigger app context update to show badge notifications
          // This will be handled by the app context
        }
      } catch (error) {
        console.error('❌ Automated migration failed:', error)
      }
    }

    // Run initial migration
    await runMigrations()

    // Schedule recurring migrations
    this.migrationSchedulerRef = window.setInterval(runMigrations, intervalMinutes * 60 * 1000)
  }

  stopAutomatedMigrations(): void {
    if (this.migrationSchedulerRef) {
      clearInterval(this.migrationSchedulerRef)
      this.migrationSchedulerRef = null
      this.isSchedulingMigrations = false
      console.log('🛑 Automated migrations stopped')
    }
  }

  // Check for pending migrations without running them
  async checkPendingMigrations(): Promise<{
    hasPendingBronzeToSilver: boolean
    hasPendingSilverToGold: boolean
    pendingBronzeWordsCount: number
    pendingSilverPagesCount: number
  }> {
    return withRetry(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check for Bronze words that failed Round 4
      const { data: bronzeWords, error: bronzeError } = await supabase
        .from('words')
        .select('id, pages!page_id(notebook_id, notebooks!notebook_id(user_id))')
        .eq('status', 'failed')
        .gte('current_round', 4)
        .eq('pages.notebooks.user_id', user.id)

      if (bronzeError) throw bronzeError

      // Check for Silver pages that failed Round 4
      const { data: silverPages, error: silverError } = await supabase
        .from('pages')
        .select('id, notebook_badges!badge_id(bronze_notebook_id, notebooks!bronze_notebook_id(user_id))')
        .eq('status', 'failed')
        .gte('current_round', 4)
        .eq('notebook_badges.notebooks.user_id', user.id)

      if (silverError) throw silverError

      const validBronzeWords = bronzeWords?.filter(w => w.pages?.notebooks?.user_id === user.id) || []
      const validSilverPages = silverPages?.filter(p => p.notebook_badges?.notebooks?.user_id === user.id) || []

      return {
        hasPendingBronzeToSilver: validBronzeWords.length > 0,
        hasPendingSilverToGold: validSilverPages.length > 0,
        pendingBronzeWordsCount: validBronzeWords.length,
        pendingSilverPagesCount: validSilverPages.length
      }
    }, 'checkPendingMigrations')
  }

  // =============================================
  // PAGE CONTEXT MANAGEMENT
  // =============================================

  async updatePageContext(pageId: string, context: string | null): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('pages')
        .update({
          context_title: context,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageId)

      if (error) {
        throw new Error(`Failed to update page context: ${error.message}`)
      }

      console.log('✅ Page context updated successfully')
    }, 'updatePageContext')
  }

  async getPageContext(pageId: string): Promise<string | null> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('context_title')
        .eq('id', pageId)
        .single()

      if (error) {
        throw new Error(`Failed to get page context: ${error.message}`)
      }

      return data?.context_title || null
    }, 'getPageContext')
  }

  // =============================================
  // NOTIFICATION SERVICES
  // =============================================

  // Get today's page for notification logic
  async getTodayPage(notebookId: string, currentDate: Date): Promise<any | null> {
    const dateString = currentDate.toISOString().split('T')[0]
    return withRetry(async () => {
      const { data, error } = await supabase.rpc('get_today_page', {
        notebook_id_param: notebookId,
        current_date_param: dateString
      })

      if (error) {
        console.error('Error getting today page:', error)
        return null
      }

      return data?.[0] || null
    }, 'getTodayPage')
  }

  // Get count of words ready for review for notification logic
  async getWordsForReviewCount(notebookId: string, currentDate: Date): Promise<number> {
    const dateString = currentDate.toISOString().split('T')[0]
    return withRetry(async () => {
      const { data, error } = await supabase.rpc('get_review_words_count', {
        notebook_id_param: notebookId,
        current_date_param: dateString
      })

      if (error) {
        console.error('Error getting review words count:', error)
        return 0
      }

      return data || 0
    }, 'getWordsForReviewCount')
  }

  // Check user activity for notification logic
  async getUserActivityToday(userId: string, currentDate: Date): Promise<number> {
    const dateString = currentDate.toISOString().split('T')[0]
    return withRetry(async () => {
      const { data, error } = await supabase.rpc('get_user_activity_today', {
        user_id_param: userId,
        current_date_param: dateString
      })

      if (error) {
        console.error('Error getting user activity today:', error)
        return 0
      }

      return data || 0
    }, 'getUserActivityToday')
  }

  // Store notification history
  async storeNotificationHistory(notification: {
    id: string
    user_id: string
    type: string
    title: string
    body: string
    data: any
    scheduled_at: string
    sent_at: string | null
  }): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase.rpc('store_notification_history', {
        notification_id_param: notification.id,
        user_id_param: notification.user_id,
        type_param: notification.type,
        title_param: notification.title,
        body_param: notification.body,
        data_param: notification.data,
        scheduled_at_param: notification.scheduled_at,
        sent_at_param: notification.sent_at
      })

      if (error) {
        throw new Error(`Failed to store notification history: ${error.message}`)
      }
    }, 'storeNotificationHistory')
  }

  // Get user notification settings
  async getUserNotificationSettings(userId: string): Promise<any> {
    return withRetry(async () => {
      const { data, error } = await supabase.rpc('get_user_notification_settings', {
        user_id_param: userId
      })

      if (error) {
        throw new Error(`Failed to get notification settings: ${error.message}`)
      }

      return data?.[0] || null
    }, 'getUserNotificationSettings')
  }

  // Update user notification settings
  async updateUserNotificationSettings(userId: string, settings: any): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(`Failed to update notification settings: ${error.message}`)
      }
    }, 'updateUserNotificationSettings')
  }

  // Get notification history for user
  async getNotificationHistory(userId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    return withRetry(async () => {
      const { data, error } = await supabase.rpc('get_user_notification_history', {
        user_id_param: userId,
        limit_param: limit,
        offset_param: offset
      })

      if (error) {
        throw new Error(`Failed to get notification history: ${error.message}`)
      }

      return data || []
    }, 'getNotificationHistory')
  }

  // Mark notification as read
  async markNotificationRead(notificationId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id_param: notificationId
      })

      if (error) {
        throw new Error(`Failed to mark notification as read: ${error.message}`)
      }
    }, 'markNotificationRead')
  }

  // Mark notification as clicked
  async markNotificationClicked(notificationId: string): Promise<void> {
    return withRetry(async () => {
      const { error } = await supabase.rpc('mark_notification_clicked', {
        notification_id_param: notificationId
      })

      if (error) {
        throw new Error(`Failed to mark notification as clicked: ${error.message}`)
      }
    }, 'markNotificationClicked')
  }

  // Get unread notification count
  async getUnreadNotificationCount(userId: string): Promise<number> {
    return withRetry(async () => {
      const { data, error } = await supabase.rpc('get_unread_notification_count', {
        user_id_param: userId
      })

      if (error) {
        throw new Error(`Failed to get unread notification count: ${error.message}`)
      }

      return data || 0
    }, 'getUnreadNotificationCount')
  }

  // Mark all notifications as read
  async markAllNotificationsRead(userId: string): Promise<number> {
    return withRetry(async () => {
      const { data, error } = await supabase.rpc('mark_all_notifications_read', {
        user_id_param: userId
      })

      if (error) {
        throw new Error(`Failed to mark all notifications as read: ${error.message}`)
      }

      return data || 0
    }, 'markAllNotificationsRead')
  }

  // =============================================
  // TESTING & DEVELOPMENT
  // =============================================

  async resetUserData(userId: string): Promise<void> {
    return withRetry(async () => {
      console.log(`🧹 Starting complete user data reset for user ${userId.slice(0, 8)}...`)
      
      // 1. Get all user's notebooks
      const { data: notebooks, error: notebooksError } = await supabase
        .from('notebooks')
        .select('id')
        .eq('user_id', userId)

      if (notebooksError) {
        throw new Error(`Failed to get user notebooks: ${notebooksError.message}`)
      }

      // 2. Delete all notebooks (this will cascade to delete pages, words, and reviews)
      for (const notebook of notebooks || []) {
        await this.deleteNotebook(notebook.id)
        console.log(`🗑️ Deleted notebook ${notebook.id}`)
      }

      // 3. Reset all profile counters to zero
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          streak_count: 0,
          longest_streak: 0,
          streak_miss_count: 0,
          total_words_added: 0,
          total_words_mastered: 0,
          last_activity_date: null
        })
        .eq('id', userId)

      if (profileError) {
        throw new Error(`Failed to reset profile: ${profileError.message}`)
      }

      // 4. Clear all caches to ensure fresh state
      this.clearCache()
      this.clearAuthCache()
      
      console.log(`✅ Complete user data reset completed for user ${userId.slice(0, 8)}`)
    }, 'resetUserData')
  }

  // =============================================
  // SUBSCRIPTION & FREEMIUM SYSTEM
  // =============================================

  // Check if user can create a new notebook
  async checkNotebookCreationLimit(userId: string, notebookLevel: string): Promise<boolean> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('check_notebook_creation_limit', {
          p_user_id: userId,
          p_notebook_level: notebookLevel
        })

      if (error) {
        throw new Error(`Failed to check notebook creation limit: ${error.message}`)
      }

      return data || false
    }, 'checkNotebookCreationLimit')
  }

  // Check if user can create a new page
  async checkPageCreationLimit(notebookId: string): Promise<boolean> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('check_page_creation_limit', {
          p_notebook_id: notebookId
        })

      if (error) {
        throw new Error(`Failed to check page creation limit: ${error.message}`)
      }

      return data || false
    }, 'checkPageCreationLimit')
  }

  // DEPRECATED: Old freemium function removed
  // Word limits are now handled at page level, not user/subscription level
  // Use page-specific word count checks in the input screen instead

  // Archive notebook and reset for new cycle
  async archiveAndResetNotebook(notebookId: string): Promise<{ archivedWordsCount: number, newCycleNumber: number }> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('archive_and_reset_notebook', {
          p_notebook_id: notebookId
        })

      if (error) {
        throw new Error(`Failed to archive and reset notebook: ${error.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from archive and reset operation')
      }

      return {
        archivedWordsCount: data[0].archived_words_count,
        newCycleNumber: data[0].new_cycle_number
      }
    }, 'archiveAndResetNotebook')
  }

  // Get archived words for a notebook
  async getArchivedWords(notebookId: string): Promise<any[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('get_archived_words', {
          p_notebook_id: notebookId
        })

      if (error) {
        throw new Error(`Failed to get archived words: ${error.message}`)
      }

      return data || []
    }, 'getArchivedWords')
  }

  // Get notebook archives summary
  async getNotebookArchivesSummary(notebookId: string): Promise<any[]> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('get_notebook_archives_summary', {
          p_notebook_id: notebookId
        })

      if (error) {
        throw new Error(`Failed to get notebook archives summary: ${error.message}`)
      }

      return data || []
    }, 'getNotebookArchivesSummary')
  }

  // Activate subscription with DevTime support
  async activateSubscription(userId: string, subscriptionType: string, durationDays: number, currentDate?: Date): Promise<boolean> {
    return withRetry(async () => {
      console.log(`🔄 Activating subscription for user ${userId}: ${subscriptionType} (${durationDays} days)`)
      console.log(`📅 Using date: ${currentDate ? currentDate.toISOString() : 'NOW() (server time)'}`)
      
      const params: any = {
        p_user_id: userId,
        p_subscription_type: subscriptionType,
        p_duration_days: durationDays
      }
      
      // Pass DevTime date if provided
      if (currentDate) {
        params.p_current_date = currentDate.toISOString()
      }
      
      const { data, error } = await supabase
        .rpc('activate_subscription', params)

      if (error) {
        console.error(`❌ Subscription activation failed:`, error)
        throw new Error(`Failed to activate subscription: ${error.message}`)
      }

      console.log(`✅ Subscription activated successfully: ${data}`)
      return data || false
    }, 'activateSubscription')
  }

  // Check if subscription is active
  async isSubscriptionActive(userId: string): Promise<boolean> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('is_subscription_active', {
          p_user_id: userId
        })

      if (error) {
        throw new Error(`Failed to check subscription status: ${error.message}`)
      }

      return data || false
    }, 'isSubscriptionActive')
  }

  // =============================================
  // TRIAL SYSTEM FUNCTIONS
  // =============================================

  // Start free trial
  async startFreeTrial(userId: string, currentDate?: Date): Promise<boolean> {
    return withRetry(async () => {
      const params: any = { p_user_id: userId }
      if (currentDate) {
        params.p_current_date = currentDate.toISOString()
      }

      console.log(`🗄️ DB startFreeTrial: userId=${userId}`)
      console.log(`🗄️ DB startFreeTrial: currentDate=${currentDate?.toISOString() || 'undefined'}`)
      console.log(`🗄️ DB startFreeTrial: params=`, params)

      const { data, error } = await supabase
        .rpc('start_free_trial', params)

      console.log(`🗄️ DB startFreeTrial: result=${data}, error=${error?.message || 'none'}`)

      if (error) {
        throw new Error(`Failed to start free trial: ${error.message}`)
      }

      return data || false
    }, 'startFreeTrial')
  }

  // Check if user can create notebook (single notebook limit for trial/free)
  async canCreateNotebookTrial(userId: string, currentDate?: Date): Promise<boolean> {
    return withRetry(async () => {
      const params: any = { p_user_id: userId }
      if (currentDate) {
        params.p_current_date = currentDate.toISOString()
      }
      
      const { data, error } = await supabase
        .rpc('can_create_notebook_trial', params)

      if (error) {
        throw new Error(`Failed to check notebook creation limit: ${error.message}`)
      }

      return data || false
    }, 'canCreateNotebookTrial')
  }

  // Check if user can add words (trial users: yes, post-trial: no)
  async canAddWordsTrial(userId: string, currentDate?: Date): Promise<boolean> {
    return withRetry(async () => {
      const params: any = { p_user_id: userId }
      if (currentDate) {
        params.p_current_date = currentDate.toISOString()
      }

      console.log(`🗄️ DB canAddWordsTrial: userId=${userId}`)
      console.log(`🗄️ DB canAddWordsTrial: currentDate=${currentDate?.toISOString() || 'undefined'}`)
      console.log(`🗄️ DB canAddWordsTrial: params=`, params)
      
      const { data, error } = await supabase
        .rpc('can_add_words_trial', params)

      console.log(`🗄️ DB canAddWordsTrial: result=${data}, error=${error?.message || 'none'}`)

      if (error) {
        throw new Error(`Failed to check word addition limit: ${error.message}`)
      }

      return data || false
    }, 'canAddWordsTrial')
  }

  // Get trial days remaining
  async getTrialDaysRemaining(userId: string, currentDate?: Date): Promise<number> {
    return withRetry(async () => {
      const params: any = { p_user_id: userId }
      if (currentDate) {
        params.p_current_date = currentDate.toISOString()
      }

      console.log(`🗄️ DB getTrialDaysRemaining: userId=${userId}`)
      console.log(`🗄️ DB getTrialDaysRemaining: currentDate=${currentDate?.toISOString() || 'undefined'}`)
      console.log(`🗄️ DB getTrialDaysRemaining: params=`, params)
      
      const { data, error } = await supabase
        .rpc('get_trial_days_remaining', params)

      console.log(`🗄️ DB getTrialDaysRemaining: result=${data}, error=${error?.message || 'none'}`)

      if (error) {
        throw new Error(`Failed to get trial days remaining: ${error.message}`)
      }

      return data || 0
    }, 'getTrialDaysRemaining')
  }

  // Check if user is in trial period
  async isInTrialPeriod(userId: string, currentDate?: Date): Promise<boolean> {
    return withRetry(async () => {
      const params: any = { p_user_id: userId }
      if (currentDate) {
        params.p_current_date = currentDate.toISOString()
      }

      console.log(`🗄️ DB isInTrialPeriod: userId=${userId}`)
      console.log(`🗄️ DB isInTrialPeriod: currentDate=${currentDate?.toISOString() || 'undefined'}`)
      console.log(`🗄️ DB isInTrialPeriod: params=`, params)
      
      const { data, error } = await supabase
        .rpc('is_in_trial_period', params)

      console.log(`🗄️ DB isInTrialPeriod: result=${data}, error=${error?.message || 'none'}`)

      if (error) {
        throw new Error(`Failed to check trial period: ${error.message}`)
      }

      return data || false
    }, 'isInTrialPeriod')
  }

  // Debug trial status (for development)
  async debugTrialStatus(userId: string, currentDate?: Date): Promise<any> {
    return withRetry(async () => {
      const params: any = { p_user_id: userId }
      if (currentDate) {
        params.p_current_date = currentDate.toISOString()
      }

      console.log(`🔍 DEBUG: Checking trial status for user ${userId}`)
      console.log(`🔍 DEBUG: Using date ${currentDate?.toISOString() || 'NOW()'}`)

      const { data, error } = await supabase
        .rpc('debug_trial_status', params)

      if (error) {
        console.error('🔍 DEBUG: Error checking trial status:', error)
        throw new Error(`Failed to debug trial status: ${error.message}`)
      }

      console.log(`🔍 DEBUG: Trial status result:`, data)
      return data?.[0] || null
    }, 'debugTrialStatus')
  }

  // Get user stats including archived words
  async getUserStatsWithArchives(userId: string): Promise<any> {
    return withRetry(async () => {
      const { data, error } = await supabase
        .rpc('get_user_stats_with_archives', {
          p_user_id: userId
        })

      if (error) {
        throw new Error(`Failed to get user stats with archives: ${error.message}`)
      }

      return data?.[0] || {
        total_words_added: 0,
        total_words_mastered: 0,
        total_archived_words: 0,
        total_archive_cycles: 0,
        current_streak: 0,
        longest_streak: 0
      }
    }, 'getUserStatsWithArchives')
  }
}

export const supabaseService = new SupabaseService()