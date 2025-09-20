import { supabase } from './client'
import { Tables } from '../types/database'
import { NotebookWithStats, WordWithReviews, PageWithWords } from '../types/goldlist'

// Notebook operations
export const notebookOperations = {
  async getAll(userId: string): Promise<NotebookWithStats[]> {
    const { data, error } = await supabase
      .from('notebooks')
      .select(`
        *,
        pages (
          id,
          words_count,
          next_review_date,
          words (
            id,
            status,
            current_round
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate stats for each notebook
    return data.map(notebook => {
      const pages = notebook.pages || []
      const allWords = pages.flatMap(page => page.words || [])
      
      const pendingReviews = pages.filter(page => 
        page.next_review_date && new Date(page.next_review_date) <= new Date()
      ).length

      const todaysPages = pages.filter(page => {
        const pageDate = new Date(page.next_review_date || '')
        const today = new Date()
        return pageDate.toDateString() === today.toDateString()
      })

      return {
        ...notebook,
        pendingReviews,
        todaysTarget: notebook.words_per_day,
        completedToday: todaysPages.length > 0,
        currentStreak: 0, // TODO: Calculate from daily progress
        weeklyProgress: 0, // TODO: Calculate weekly completion rate
      } as NotebookWithStats
    })
  },

  async create(data: Tables<'notebooks'>['Insert']): Promise<Tables<'notebooks'>> {
    const { data: notebook, error } = await supabase
      .from('notebooks')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return notebook
  },

  async update(id: string, data: Tables<'notebooks'>['Update']): Promise<Tables<'notebooks'>> {
    const { data: notebook, error } = await supabase
      .from('notebooks')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return notebook
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notebooks')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }
}

// Page operations
export const pageOperations = {
  async getByNotebook(notebookId: string): Promise<PageWithWords[]> {
    const { data, error } = await supabase
      .from('pages')
      .select(`
        *,
        words (*),
        notebook:notebooks (*)
      `)
      .eq('notebook_id', notebookId)
      .order('page_number', { ascending: true })

    if (error) throw error
    return data as PageWithWords[]
  },

  async create(data: Tables<'pages'>['Insert']): Promise<Tables<'pages'>> {
    const { data: page, error } = await supabase
      .from('pages')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return page
  },

  async getNextPageNumber(notebookId: string): Promise<number> {
    const { data, error } = await supabase
      .from('pages')
      .select('page_number')
      .eq('notebook_id', notebookId)
      .order('page_number', { ascending: false })
      .limit(1)

    if (error) throw error
    return (data[0]?.page_number || 0) + 1
  },

  async markCompleted(id: string): Promise<void> {
    const { error } = await supabase
      .from('pages')
      .update({ 
        is_completed: true,
        next_review_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', id)

    if (error) throw error
  }
}

// Word operations
export const wordOperations = {
  async create(words: Tables<'words'>['Insert'][]): Promise<Tables<'words'>[]> {
    const { data, error } = await supabase
      .from('words')
      .insert(words)
      .select()

    if (error) throw error
    return data
  },

  async getByPage(pageId: string): Promise<WordWithReviews[]> {
    const { data, error } = await supabase
      .from('words')
      .select(`
        *,
        reviews (*),
        page:pages (*)
      `)
      .eq('page_id', pageId)
      .order('position_in_page', { ascending: true })

    if (error) throw error

    return data.map(word => ({
      ...word,
      nextReviewDate: word.page?.next_review_date ? new Date(word.page.next_review_date) : null,
      daysSinceCreated: Math.floor((Date.now() - new Date(word.created_at).getTime()) / (24 * 60 * 60 * 1000)),
      isReadyForReview: word.page?.next_review_date ? new Date(word.page.next_review_date) <= new Date() : false,
    })) as WordWithReviews[]
  },

  async getWordsForReview(notebookId: string): Promise<WordWithReviews[]> {
    const { data, error } = await supabase
      .from('words')
      .select(`
        *,
        reviews (*),
        page:pages!inner (
          *,
          notebook:notebooks!inner (*)
        )
      `)
      .eq('page.notebook.id', notebookId)
      .eq('status', 'learning')
      .lte('page.next_review_date', new Date().toISOString())

    if (error) throw error

    return data.map(word => ({
      ...word,
      nextReviewDate: word.page?.next_review_date ? new Date(word.page.next_review_date) : null,
      daysSinceCreated: Math.floor((Date.now() - new Date(word.created_at).getTime()) / (24 * 60 * 60 * 1000)),
      isReadyForReview: true,
    })) as WordWithReviews[]
  },

  async updateStatus(id: string, status: 'learning' | 'mastered' | 'failed', round?: number): Promise<void> {
    const updateData: any = { status, updated_at: new Date().toISOString() }
    if (round) updateData.current_round = round

    const { error } = await supabase
      .from('words')
      .update(updateData)
      .eq('id', id)

    if (error) throw error
  }
}

// Review operations
export const reviewOperations = {
  async create(data: Tables<'reviews'>['Insert']): Promise<Tables<'reviews'>> {
    const { data: review, error } = await supabase
      .from('reviews')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return review
  },

  async getByWord(wordId: string): Promise<Tables<'reviews'>[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('word_id', wordId)
      .order('reviewed_at', { ascending: false })

    if (error) throw error
    return data
  }
}

// Profile operations
export const profileOperations = {
  async get(userId: string): Promise<Tables<'profiles'> | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  async create(data: Tables<'profiles'>['Insert']): Promise<Tables<'profiles'>> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return profile
  },

  async updateStats(userId: string, updates: Partial<Tables<'profiles'>>): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
  }
}