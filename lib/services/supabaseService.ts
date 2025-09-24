import { supabase } from '@/lib/supabase/client'
import { Database, Tables } from '@/lib/types/database'
import { PostgrestError } from '@supabase/supabase-js'

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

  // Create a new notebook
  async createNotebook(data: { title: string; language: string; language_code: string; words_per_day: number }): Promise<Notebook | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    console.log('📝 Creating notebook without bulk pages...')
    
    const { data: notebook, error } = await supabase
      .from('notebooks')
      .insert({
        user_id: user.id,
        title: data.title,
        language: data.language,
        language_code: data.language_code,
        words_per_day: data.words_per_day
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
        next_review_date: null
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
  async getTodaysPage(notebookId: string, currentSimulatedDay?: number): Promise<PageWithWords | null> {
    // Apply debounce to prevent excessive calls
    const callKey = `todaysPage-${notebookId}`
    const now = Date.now()
    const lastCall = this.reviewCallTracker.get(callKey) || 0
    
    if (now - lastCall < 300) {
      const pendingCall = this.pendingCalls.get(callKey)
      return pendingCall || null
    }
    
    this.reviewCallTracker.set(callKey, now)
    
    // Create and store the pending promise
    const promise = this._performGetTodaysPage(notebookId, currentSimulatedDay)
    this.pendingCalls.set(callKey, promise)
    
    try {
      const result = await promise
      return result
    } finally {
      // Clean up the pending call
      this.pendingCalls.delete(callKey)
    }
  }
  
  private async _performGetTodaysPage(notebookId: string, currentSimulatedDay?: number): Promise<PageWithWords | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get notebook to find creation date and calculate current day
    const { data: notebook, error: notebookError } = await supabase
      .from('notebooks')
      .select('*')
      .eq('id', notebookId)
      .single()

    if (notebookError) throw notebookError
    if (!notebook) return null

    // Use provided simulated day or calculate from notebook creation
    let todaysPageNumber: number
    
    if (currentSimulatedDay !== undefined) {
      // Use the simulation day, but pages are 1-based (simulation day 0 = page 1)
      todaysPageNumber = currentSimulatedDay + 1
    } else {
      // Fallback: calculate from notebook creation time
      const currentDateTime = getCurrentDate()
      const notebookCreated = new Date(notebook.created_at)
      const daysSinceCreation = Math.floor(
        (currentDateTime.getTime() - notebookCreated.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1 // Day 1, not Day 0
      todaysPageNumber = daysSinceCreation
    }

    // Check if today's page already exists
    let { data: existingPage, error: pageError } = await supabase
      .from('pages')
      .select(`
        *,
        words (*)
      `)
      .eq('notebook_id', notebookId)
      .eq('page_number', todaysPageNumber)
      .single()

    // If page doesn't exist, create it
    if (pageError?.code === 'PGRST116' || !existingPage) {
      console.log(`🔧 Creating page ${todaysPageNumber}...`)
      
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
          next_review_date: null
        })
        .select(`
          *,
          words (*)
        `)
        .single()

      if (createError) throw createError
      if (!newPage) return null

      console.log(`✅ Page ${todaysPageNumber} created successfully`)
      console.log(`✅ Returning page ${todaysPageNumber} with ${newPage.words?.length || 0} words`)
      
      return {
        ...newPage,
        notebook
      } as PageWithWords
    }

    console.log(`📄 Page ${todaysPageNumber} already exists`)
    console.log(`✅ Returning page ${todaysPageNumber} with ${existingPage.words?.length || 0} words`)
    
    return {
      ...existingPage,
      notebook
    } as PageWithWords
  }

  // Rest of the methods remain the same...
  async getNotebooks(): Promise<Notebook[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('notebooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async addWords(pageId: string, words: CreateWordData[]): Promise<{ success: boolean }> {
    if (!words || words.length === 0) {
      throw new Error('No words provided')
    }

    console.log(`💾 Adding ${words.length} words to page: ${pageId}`)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

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
      position_in_page: word.position_in_page,
      current_round: 1,
      is_mastered: false,
      review_date: new Date(getCurrentDate().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      times_reviewed: 0,
      status: 'learning'
    }))

    console.log('⚡ Executing 3 operations in parallel: words insert, page update, profile query...')

    // Execute all operations in parallel
    const [wordsResult, pageUpdateResult, profileUpdateResult] = await Promise.allSettled([
      // Insert words
      supabase.from('words').insert(wordsToInsert),
      
      // Update page with word count and completion info
      supabase.from('pages').update({
        words_count: words.length,
        is_completed: false,
        next_review_date: new Date(getCurrentDate().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }).eq('id', pageId),
      
      // Get current profile for stats update
      supabase.from('user_profiles').select('*').eq('user_id', user.id).single()
    ])

    // Check words insert result
    if (wordsResult.status === 'rejected') {
      throw wordsResult.reason
    }

    // Check page update result
    if (pageUpdateResult.status === 'rejected') {
      console.warn('Failed to update page:', pageUpdateResult.reason)
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
    return { success: true }
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

  async getPages(notebookId: string): Promise<PageWithWords[]> {
    // For now, return a simplified version
    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        words (*)
      `)
      .eq('notebook_id', notebookId)
      .order('page_number', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Check if there are any words due for review today across all user's notebooks
  async getAllWordsForReviewToday(): Promise<any[]> {
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
    
    // Get ALL words from ALL pages that are due for review today
    const { data: words, error } = await supabase
      .from('words')
      .select(`
        id,
        word,
        translation,
        meaning,
        notes,
        current_round,
        review_date,
        last_reviewed,
        times_reviewed,
        page_id,
        page:pages!inner(
          id,
          page_number,
          notebook_id,
          notebook:notebooks!inner(user_id, title)
        )
      `)
      .eq('page.notebook.user_id', user.id)
      .eq('is_mastered', false)
      .not('review_date', 'is', null)

    if (error) {
      console.error('Error getting words for review:', error)
      return []
    }

    if (!words || words.length === 0) return []

    // Filter words that are actually due for review today
    const reviewableWords = words.filter(word => {
      const reviewDate = new Date(word.review_date)
      reviewDate.setHours(0, 0, 0, 0)
      return reviewDate <= currentDate
    })

    console.log(`📅 Found ${reviewableWords.length} words due for review today across ${new Set(reviewableWords.map(w => (w.page as any).page_number)).size} pages`)
    
    return reviewableWords
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

  async getWordsForReview(notebookId: string): Promise<WordWithReviews[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const currentDateTime = getCurrentDate()
    
    // Get all learning words for the notebook (no timestamp filter)
    const { data: words, error } = await supabase
      .from('words')
      .select(`
        *,
        pages!inner(notebook_id)
      `)
      .eq('pages.notebook_id', notebookId)
      .eq('status', 'learning')
      .eq('is_mastered', false)

    if (error) throw error
    if (!words) return []

    // Filter words using client-side simulation-aware logic
    const reviewableWords = words.filter(word => {
      const currentDate = new Date(currentDateTime)
      currentDate.setHours(0, 0, 0, 0)
      
      // Check if word has a review_date and if it's due
      if (word.review_date) {
        const reviewDate = new Date(word.review_date)
        reviewDate.setHours(0, 0, 0, 0)
        return currentDate >= reviewDate
      } else {
        // Fallback to creation date logic for words without review_date
        const wordCreated = new Date(word.created_at)
        wordCreated.setHours(0, 0, 0, 0)
        
        const daysSinceCreated = Math.floor(
          (currentDate.getTime() - wordCreated.getTime()) / (24 * 60 * 60 * 1000)
        )
        
        return daysSinceCreated > 14
      }
    })

    // Transform to WordWithReviews format
    return reviewableWords.map(word => {
      const currentDate = new Date(currentDateTime)
      currentDate.setHours(0, 0, 0, 0)
      
      let daysSinceCreated: number
      let daysUntilReview: number
      
      if (word.review_date) {
        const reviewDate = new Date(word.review_date)
        reviewDate.setHours(0, 0, 0, 0)
        daysSinceCreated = Math.floor(
          (currentDate.getTime() - reviewDate.getTime()) / (24 * 60 * 60 * 1000)
        )
        daysUntilReview = Math.max(0, -daysSinceCreated)
      } else {
        const wordCreated = new Date(word.created_at)
        wordCreated.setHours(0, 0, 0, 0)
        daysSinceCreated = Math.floor(
          (currentDate.getTime() - wordCreated.getTime()) / (24 * 60 * 60 * 1000)
        )
        daysUntilReview = Math.max(0, 14 - daysSinceCreated)
      }

      return {
        ...word,
        reviews: [],
        page: { id: word.page_id } as any,
        nextReviewDate: word.review_date ? new Date(word.review_date) : null,
        daysSinceCreated,
        isReviewable: true,
        daysUntilReview
      }
    })
  }

  async processWordReview(wordId: string, remembered: boolean): Promise<{ success: boolean }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
      const currentDate = getCurrentDate()
      const currentDateString = currentDate.toISOString().split('T')[0] // YYYY-MM-DD format
      
      // Try enhanced function first
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
    } catch (error) {
      console.error('Failed to process word review:', error)
      throw error
    }
  }

  // Client-side word review processing with full simulation date support
  async processWordReviewClientSide(wordId: string, remembered: boolean, currentDate: string): Promise<{ success: boolean }> {
    // Get current word state
    const { data: word, error: fetchError } = await supabase
      .from('words')
      .select('current_round, notebook_id, page_id, times_reviewed')
      .eq('id', wordId)
      .single()

    if (fetchError) throw fetchError
    if (!word) throw new Error('Word not found')

    // Calculate next review date (14 days from current simulation date)
    const nextReviewDate = new Date(currentDate)
    nextReviewDate.setDate(nextReviewDate.getDate() + 14)
    const nextReviewDateString = nextReviewDate.toISOString().split('T')[0]

    let updateData: any = {
      times_reviewed: (word.times_reviewed || 0) + 1,
      last_reviewed: currentDate,
      updated_at: new Date().toISOString()
    }

    if (remembered) {
      // Remembered words are mastered and removed from future reviews
      updateData.is_mastered = true
      updateData.status = 'mastered'
      // No review_date needed - they're done forever
      console.log(`🏆 Word ${wordId} remembered and mastered (round ${word.current_round})`)
    } else {
      // Forgotten words advance to next round by 1
      updateData.current_round = word.current_round + 1
      updateData.review_date = nextReviewDateString
      updateData.status = 'learning'
      console.log(`📈 Word ${wordId} forgotten - advanced from round ${word.current_round} to ${word.current_round + 1}`)
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

    console.log(`✅ Word review processed (client-side): ${wordId}, remembered: ${remembered}`)
    return { success: true }
  }

  // Batch process multiple word reviews for better performance
  async processBatchWordReviews(reviews: Array<{ wordId: string; remembered: boolean }>): Promise<{ success: boolean }> {
    if (reviews.length === 0) return { success: true }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
      const currentDate = getCurrentDate()
      const currentDateString = currentDate.toISOString().split('T')[0]
      
      console.log(`📦 Processing batch of ${reviews.length} word reviews...`)

      // Get all words data in one query
      const wordIds = reviews.map(r => r.wordId)
      const { data: words, error: fetchError } = await supabase
        .from('words')
        .select('id, current_round, notebook_id, page_id, times_reviewed')
        .in('id', wordIds)

      if (fetchError) throw fetchError
      if (!words || words.length !== reviews.length) {
        throw new Error('Some words not found')
      }

      // Prepare batch updates
      const wordsToUpdate = []
      const nextReviewDate = new Date(currentDate)
      nextReviewDate.setDate(nextReviewDate.getDate() + 14)
      const nextReviewDateString = nextReviewDate.toISOString().split('T')[0]

      for (const review of reviews) {
        const word = words.find(w => w.id === review.wordId)
        if (!word) continue

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
          // Forgotten words advance to next round by 1
          updateData.current_round = word.current_round + 1
          updateData.review_date = nextReviewDateString
          updateData.status = 'learning'
          console.log(`📈 Word ${word.id} forgotten - advanced from round ${word.current_round} to ${word.current_round + 1}`)
        }

        wordsToUpdate.push(updateData)
      }

      // Batch update all words
      if (wordsToUpdate.length > 0) {
        for (const wordUpdate of wordsToUpdate) {
          const { error: updateError } = await supabase
            .from('words')
            .update(wordUpdate)
            .eq('id', wordUpdate.id)

          if (updateError) {
            console.error(`Error updating word ${wordUpdate.id}:`, updateError)
            throw updateError
          }
        }
      }

      // Update notebook last activity (get unique notebook IDs)
      const notebookIds = [...new Set(words.map(w => w.notebook_id))]
      for (const notebookId of notebookIds) {
        await supabase
          .from('notebooks')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', notebookId)
      }

      console.log(`✅ Batch review completed: ${reviews.length} words processed`)
      return { success: true }
    } catch (error) {
      console.error('Failed to process batch word reviews:', error)
      throw error
    }
  }

  async unlockTodaysPages(): Promise<void> {
    // Simplified - do nothing for now
  }

  async getWeeklyProgress(): Promise<DailyProgress[]> {
    // Return empty array for now
    return []
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
          notebook:notebooks!inner(user_id, words_per_day)
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
    // Return empty array for now
    return []
  }

  async getTotalWordsCount(): Promise<number> {
    // Return 0 for now
    return 0
  }

  async getMasteredWordsCount(): Promise<number> {
    // Return 0 for now
    return 0
  }

  clearReviewCallTracker() {
    this.reviewCallTracker.clear()
    this.pendingCalls.clear()
  }
}

export const supabaseService = new SupabaseService()