/**
 * Progress Slice - Dashboard and Weekly Progress State Management
 * 
 * Handles dashboard statistics, weekly progress, and heatmap data with optimistic updates.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

interface DashboardStats {
  totalWords: number
  wordsThisWeek: number
  currentStreak: number
  weeklyGoal: number
  completionRate: number
}

interface WeeklyProgress {
  date: string
  wordsAdded: number
  reviewsCompleted: number
  goalsCompleted: boolean
}

interface HeatmapData {
  date: string
  value: number
  level: 0 | 1 | 2 | 3 | 4 // GitHub-style intensity levels
}

interface ProgressState {
  // Dashboard data
  dashboardStats: DashboardStats
  weeklyProgress: WeeklyProgress[]
  heatmapData: HeatmapData[]
  
  // Today's data
  todayWordsAdded: number
  todayReviewsCompleted: number
  todayGoalCompleted: boolean
  
  // UI state
  isLoading: boolean
  error: string | null
  lastUpdated: number
}

const initialState: ProgressState = {
  dashboardStats: {
    totalWords: 0,
    wordsThisWeek: 0,
    currentStreak: 0,
    weeklyGoal: 140, // 20 words × 7 days
    completionRate: 0,
  },
  weeklyProgress: [],
  heatmapData: [],
  todayWordsAdded: 0,
  todayReviewsCompleted: 0,
  todayGoalCompleted: false,
  isLoading: false,
  error: null,
  lastUpdated: 0,
}

// Async thunks for background sync
export const fetchDashboardStats = createAsyncThunk(
  'progress/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const { supabaseService } = await import('@/lib/services/supabaseService')
      const stats = await supabaseService.getDashboardStats()
      return stats
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchWeeklyProgress = createAsyncThunk(
  'progress/fetchWeeklyProgress',
  async (_, { rejectWithValue }) => {
    try {
      const { supabaseService } = await import('@/lib/services/supabaseService')
      const progress = await supabaseService.getWeeklyProgress()
      return progress
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const fetchHeatmapData = createAsyncThunk(
  'progress/fetchHeatmapData',
  async (_, { rejectWithValue }) => {
    try {
      const { supabaseService } = await import('@/lib/services/supabaseService')
      const heatmap = await supabaseService.getHeatmapData()
      return heatmap
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    // ✨ INSTANT: Update today's word count optimistically
    addTodayWordsOptimistic: (state, action: PayloadAction<number>) => {
      const wordCount = action.payload
      state.todayWordsAdded += wordCount
      state.dashboardStats.totalWords += wordCount
      state.dashboardStats.wordsThisWeek += wordCount
      
      // Check if goal is completed (assume 20 words per day)
      state.todayGoalCompleted = state.todayWordsAdded >= 20
      
      // Update completion rate
      if (state.dashboardStats.weeklyGoal > 0) {
        state.dashboardStats.completionRate = 
          (state.dashboardStats.wordsThisWeek / state.dashboardStats.weeklyGoal) * 100
      }
      
      // Update today's entry in weekly progress
      const today = new Date().toISOString().split('T')[0]
      const todayIndex = state.weeklyProgress.findIndex(p => p.date === today)
      if (todayIndex >= 0) {
        state.weeklyProgress[todayIndex].wordsAdded = state.todayWordsAdded
        state.weeklyProgress[todayIndex].goalsCompleted = state.todayGoalCompleted
      } else {
        // Add today's entry if it doesn't exist
        state.weeklyProgress.push({
          date: today,
          wordsAdded: state.todayWordsAdded,
          reviewsCompleted: state.todayReviewsCompleted,
          goalsCompleted: state.todayGoalCompleted,
        })
      }
      
      // Update heatmap data
      const heatmapIndex = state.heatmapData.findIndex(h => h.date === today)
      const intensity = Math.min(4, Math.floor(state.todayWordsAdded / 5)) as 0 | 1 | 2 | 3 | 4
      if (heatmapIndex >= 0) {
        state.heatmapData[heatmapIndex].value = state.todayWordsAdded
        state.heatmapData[heatmapIndex].level = intensity
      } else {
        state.heatmapData.push({
          date: today,
          value: state.todayWordsAdded,
          level: intensity,
        })
      }
    },

    // ✨ INSTANT: Update today's review count optimistically
    addTodayReviewsOptimistic: (state, action: PayloadAction<number>) => {
      const reviewCount = action.payload
      state.todayReviewsCompleted += reviewCount
      
      // Update today's entry in weekly progress
      const today = new Date().toISOString().split('T')[0]
      const todayIndex = state.weeklyProgress.findIndex(p => p.date === today)
      if (todayIndex >= 0) {
        state.weeklyProgress[todayIndex].reviewsCompleted = state.todayReviewsCompleted
      }
    },

    // ✨ INSTANT: Update streak count optimistically
    updateStreakOptimistic: (state, action: PayloadAction<number>) => {
      state.dashboardStats.currentStreak = action.payload
    },

    // Update dashboard stats from database
    updateDashboardStats: (state, action: PayloadAction<DashboardStats>) => {
      state.dashboardStats = action.payload
    },

    // Update weekly progress from database
    updateWeeklyProgress: (state, action: PayloadAction<WeeklyProgress[]>) => {
      state.weeklyProgress = action.payload
      
      // Update today's data from weekly progress
      const today = new Date().toISOString().split('T')[0]
      const todayData = action.payload.find(p => p.date === today)
      if (todayData) {
        state.todayWordsAdded = todayData.wordsAdded
        state.todayReviewsCompleted = todayData.reviewsCompleted
        state.todayGoalCompleted = todayData.goalsCompleted
      }
    },

    // Update heatmap data from database
    updateHeatmapData: (state, action: PayloadAction<HeatmapData[]>) => {
      state.heatmapData = action.payload
    },

    // Reset today's data (for new day)
    resetTodayData: (state) => {
      state.todayWordsAdded = 0
      state.todayReviewsCompleted = 0
      state.todayGoalCompleted = false
    },

    // Clear all state (for logout/reset)
    clearState: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        if (state.dashboardStats.totalWords === 0) {
          state.isLoading = true // Only show loading if no cached data
        }
        state.error = null
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false
        state.dashboardStats = action.payload
        state.lastUpdated = Date.now()
        state.error = null
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      .addCase(fetchWeeklyProgress.fulfilled, (state, action) => {
        state.weeklyProgress = action.payload
        
        // Update today's data
        const today = new Date().toISOString().split('T')[0]
        const todayData = action.payload.find(p => p.date === today)
        if (todayData) {
          state.todayWordsAdded = todayData.wordsAdded
          state.todayReviewsCompleted = todayData.reviewsCompleted
          state.todayGoalCompleted = todayData.goalsCompleted
        }
      })
      
      .addCase(fetchHeatmapData.fulfilled, (state, action) => {
        state.heatmapData = action.payload
      })
  },
})

export const {
  addTodayWordsOptimistic,
  addTodayReviewsOptimistic,
  updateStreakOptimistic,
  updateDashboardStats,
  updateWeeklyProgress,
  updateHeatmapData,
  resetTodayData,
  clearState,
} = progressSlice.actions

export default progressSlice