/**
 * Notebooks Slice - Optimistic-First Notebook State Management
 * 
 * Provides instant UI updates for all notebook operations while syncing in background.
 * Replaces useLocalNotebookState hook with unified, predictable state management.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { NotebookWithStats } from '@/lib/types/goldlist'

interface NotebookProgress {
  wordsAdded: number
  goal: number
  completed: boolean
  hasReviews: boolean
}

interface OptimisticUpdate {
  notebookId: string
  wordsAdded?: number
  reviewsCompleted?: number
  timestamp: number
}

interface NotebooksState {
  // Core data
  notebooks: NotebookWithStats[]
  todayProgress: Record<string, NotebookProgress>
  
  // Optimistic state
  optimisticUpdates: Record<string, OptimisticUpdate>
  
  // UI state
  isLoading: boolean
  error: string | null
  lastUpdated: number
  
  // Button states (computed from optimistic + database state)
  buttonStates: Record<string, {
    type: 'reviews' | 'words' | 'complete'
    text: string
    priority: 'high' | 'medium' | 'low'
  }>
}

const initialState: NotebooksState = {
  notebooks: [],
  todayProgress: {},
  optimisticUpdates: {},
  isLoading: false,
  error: null,
  lastUpdated: 0,
  buttonStates: {},
}

// Async thunks for background sync
export const fetchNotebooks = createAsyncThunk(
  'notebooks/fetchNotebooks',
  async (_, { rejectWithValue }) => {
    try {
      // Import here to avoid circular dependencies
      const { supabaseService } = await import('@/lib/services/supabaseService')
      const notebooks = await supabaseService.getUserNotebooks()
      return notebooks
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchTodayProgress = createAsyncThunk(
  'notebooks/fetchTodayProgress',
  async (_, { rejectWithValue }) => {
    try {
      const { supabaseService } = await import('@/lib/services/supabaseService')
      const progress = await supabaseService.getTodayProgress()
      return progress
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const notebooksSlice = createSlice({
  name: 'notebooks',
  initialState,
  reducers: {
    // ✨ INSTANT: Optimistic word addition (shows immediately in UI)
    addWordsOptimistic: (state, action: PayloadAction<{ notebookId: string; wordCount: number }>) => {
      const { notebookId, wordCount } = action.payload
      
      // Update optimistic state
      const existing = state.optimisticUpdates[notebookId]
      state.optimisticUpdates[notebookId] = {
        notebookId,
        wordsAdded: (existing?.wordsAdded || 0) + wordCount,
        reviewsCompleted: existing?.reviewsCompleted || 0,
        timestamp: Date.now(),
      }
      
      // Update button state immediately
      notebooksSlice.caseReducers.updateButtonStates(state)
    },

    // ✨ INSTANT: Optimistic review completion (shows immediately in UI)
    addReviewsOptimistic: (state, action: PayloadAction<{ notebookId: string; reviewCount: number }>) => {
      const { notebookId, reviewCount } = action.payload
      
      // Update optimistic state
      const existing = state.optimisticUpdates[notebookId]
      state.optimisticUpdates[notebookId] = {
        notebookId,
        wordsAdded: existing?.wordsAdded || 0,
        reviewsCompleted: (existing?.reviewsCompleted || 0) + reviewCount,
        timestamp: Date.now(),
      }
      
      // Update button state immediately
      notebooksSlice.caseReducers.updateButtonStates(state)
    },

    // Update database state (background sync)
    updateNotebookStats: (state, action: PayloadAction<{ notebookId: string; stats: Partial<NotebookWithStats> }>) => {
      const { notebookId, stats } = action.payload
      
      const notebookIndex = state.notebooks.findIndex(nb => nb.id === notebookId)
      if (notebookIndex >= 0) {
        state.notebooks[notebookIndex] = { ...state.notebooks[notebookIndex], ...stats }
      }
      
      // Clear related optimistic updates (database is now authoritative)
      delete state.optimisticUpdates[notebookId]
      
      // Update button states with fresh data
      notebooksSlice.caseReducers.updateButtonStates(state)
    },

    // Update today's progress (background sync)
    updateTodayProgress: (state, action: PayloadAction<{ notebookId: string; progress: NotebookProgress }>) => {
      const { notebookId, progress } = action.payload
      state.todayProgress[notebookId] = progress
      
      // Update button states with fresh data
      notebooksSlice.caseReducers.updateButtonStates(state)
    },

    // Clear stale optimistic updates
    clearStaleUpdates: (state) => {
      const now = Date.now()
      Object.keys(state.optimisticUpdates).forEach(notebookId => {
        const update = state.optimisticUpdates[notebookId]
        if (now - update.timestamp > 30000) { // 30 seconds
          delete state.optimisticUpdates[notebookId]
        }
      })
    },

    // Clear optimistic updates for a specific notebook
    clearOptimisticUpdates: (state, action: PayloadAction<string>) => {
      const notebookId = action.payload
      delete state.optimisticUpdates[notebookId]
      notebooksSlice.caseReducers.updateButtonStates(state)
    },

    // Smart button state calculation (combines database + optimistic state)
    updateButtonStates: (state) => {
      state.notebooks.forEach(notebook => {
        const todayProgress = state.todayProgress[notebook.id]
        const optimistic = state.optimisticUpdates[notebook.id]
        
        // Calculate predicted state
        const baseWordsAdded = todayProgress?.wordsAdded || 0
        const goal = todayProgress?.goal || 20
        const baseHasReviews = todayProgress?.hasReviews || false
        
        // Apply optimistic predictions
        const predictedWordsAdded = baseWordsAdded + (optimistic?.wordsAdded || 0)
        const predictedCompleted = predictedWordsAdded >= goal
        const predictedHasReviews = optimistic?.reviewsCompleted ? false : baseHasReviews
        
        // Calculate button state (same logic as useLocalNotebookState)
        if (predictedHasReviews) {
          state.buttonStates[notebook.id] = {
            type: 'reviews',
            text: 'Review Today\'s Words',
            priority: 'high'
          }
        } else if (!predictedCompleted) {
          state.buttonStates[notebook.id] = {
            type: 'words',
            text: 'Add Today\'s Words',
            priority: 'medium'
          }
        } else {
          state.buttonStates[notebook.id] = {
            type: 'complete',
            text: 'You\'re All Done Today! 🎉',
            priority: 'low'
          }
        }
      })
    },

    // Clear all state (for logout/reset)
    clearState: () => initialState,
  },

  extraReducers: (builder) => {
    // Handle async thunk states
    builder
      .addCase(fetchNotebooks.pending, (state) => {
        if (state.notebooks.length === 0) {
          state.isLoading = true // Only show loading if no cached data
        }
        state.error = null
      })
      .addCase(fetchNotebooks.fulfilled, (state, action) => {
        state.isLoading = false
        state.notebooks = action.payload
        state.lastUpdated = Date.now()
        state.error = null
        
        // Update button states with fresh notebook data
        notebooksSlice.caseReducers.updateButtonStates(state)
      })
      .addCase(fetchNotebooks.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      .addCase(fetchTodayProgress.fulfilled, (state, action) => {
        // Update today's progress for all notebooks
        if (action.payload) {
          Object.entries(action.payload).forEach(([notebookId, progress]) => {
            state.todayProgress[notebookId] = progress as NotebookProgress
          })
        }
        
        // Update button states with fresh progress data
        notebooksSlice.caseReducers.updateButtonStates(state)
      })
  },
})

export const {
  addWordsOptimistic,
  addReviewsOptimistic,
  updateNotebookStats,
  updateTodayProgress,
  clearStaleUpdates,
  clearOptimisticUpdates,
  updateButtonStates,
  clearState,
} = notebooksSlice.actions

export default notebooksSlice