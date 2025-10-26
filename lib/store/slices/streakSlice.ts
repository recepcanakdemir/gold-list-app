/**
 * Streak Slice - Optimistic-First Streak State Management
 * 
 * Provides instant streak updates for immediate UI feedback while syncing in background.
 * Replaces useLocalStreakState hook with unified state management.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

interface OptimisticStreakUpdate {
  streakIncrement: number
  hasActivityToday: boolean
  timestamp: number
}

interface StreakState {
  // Database state
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null
  
  // Optimistic state
  optimisticUpdate: OptimisticStreakUpdate | null
  
  // UI state
  isLoading: boolean
  error: string | null
  lastUpdated: number
  
  // Computed state
  predictedStreak: number
  predictedHasActivityToday: boolean
}

const initialState: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  optimisticUpdate: null,
  isLoading: false,
  error: null,
  lastUpdated: 0,
  predictedStreak: 0,
  predictedHasActivityToday: false,
}

// Async thunks for background sync
export const fetchStreakData = createAsyncThunk(
  'streak/fetchStreakData',
  async (_, { rejectWithValue }) => {
    try {
      const { supabaseService } = await import('@/lib/services/supabaseService')
      const profile = await supabaseService.getProfile()
      return {
        currentStreak: profile?.streak_count || 0,
        longestStreak: profile?.longest_streak || 0,
        lastActivityDate: profile?.last_activity_date || null,
      }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

export const recordActivity = createAsyncThunk(
  'streak/recordActivity',
  async (_, { rejectWithValue }) => {
    try {
      const { supabaseService } = await import('@/lib/services/supabaseService')
      const updatedProfile = await supabaseService.recordUserActivity()
      return {
        currentStreak: updatedProfile?.streak_count || 0,
        longestStreak: updatedProfile?.longest_streak || 0,
        lastActivityDate: updatedProfile?.last_activity_date || null,
      }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

const streakSlice = createSlice({
  name: 'streak',
  initialState,
  reducers: {
    // ✨ INSTANT: Optimistic activity recording (shows immediately in UI)
    addActivityOptimistic: (state) => {
      // Get current date (should use DevTime in real implementation)
      const today = new Date().toISOString().split('T')[0]
      
      // Only increment if we haven't already recorded activity today
      if (state.optimisticUpdate?.hasActivityToday) {
        return // No additional increment needed
      }
      
      state.optimisticUpdate = {
        streakIncrement: 1, // Assume streak will increase by 1
        hasActivityToday: true,
        timestamp: Date.now(),
      }
      
      // Update predicted values immediately
      streakSlice.caseReducers.updatePredictedValues(state)
    },

    // Update database streak data (background sync)
    updateStreakData: (state, action: PayloadAction<{ currentStreak: number; longestStreak: number; lastActivityDate: string | null }>) => {
      const { currentStreak, longestStreak, lastActivityDate } = action.payload
      
      state.currentStreak = currentStreak
      state.longestStreak = longestStreak
      state.lastActivityDate = lastActivityDate
      
      // Clear optimistic updates (database is now authoritative)
      state.optimisticUpdate = null
      
      // Update predicted values
      streakSlice.caseReducers.updatePredictedValues(state)
    },

    // Clear stale optimistic updates
    clearStaleUpdates: (state) => {
      if (state.optimisticUpdate) {
        const now = Date.now()
        if (now - state.optimisticUpdate.timestamp > 30000) { // 30 seconds
          state.optimisticUpdate = null
          streakSlice.caseReducers.updatePredictedValues(state)
        }
      }
    },

    // Clear optimistic updates
    clearOptimisticUpdates: (state) => {
      state.optimisticUpdate = null
      streakSlice.caseReducers.updatePredictedValues(state)
    },

    // Update predicted values (combines database + optimistic state)
    updatePredictedValues: (state) => {
      if (state.optimisticUpdate) {
        // Apply optimistic predictions
        state.predictedStreak = Math.max(0, state.currentStreak + state.optimisticUpdate.streakIncrement)
        state.predictedHasActivityToday = state.optimisticUpdate.hasActivityToday
      } else {
        // Use database values
        state.predictedStreak = state.currentStreak
        
        // Check if user has activity today based on last activity date
        const today = new Date().toISOString().split('T')[0]
        state.predictedHasActivityToday = state.lastActivityDate === today
      }
    },

    // Set specific predicted streak (for external updates)
    setPredictedStreak: (state, action: PayloadAction<number>) => {
      state.predictedStreak = action.payload
    },

    // Clear all state (for logout/reset)
    clearState: () => initialState,
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchStreakData.pending, (state) => {
        if (state.currentStreak === 0) {
          state.isLoading = true // Only show loading if no cached data
        }
        state.error = null
      })
      .addCase(fetchStreakData.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentStreak = action.payload.currentStreak
        state.longestStreak = action.payload.longestStreak
        state.lastActivityDate = action.payload.lastActivityDate
        state.lastUpdated = Date.now()
        state.error = null
        
        // Update predicted values
        streakSlice.caseReducers.updatePredictedValues(state)
      })
      .addCase(fetchStreakData.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      .addCase(recordActivity.fulfilled, (state, action) => {
        // Update with actual database results
        state.currentStreak = action.payload.currentStreak
        state.longestStreak = action.payload.longestStreak
        state.lastActivityDate = action.payload.lastActivityDate
        
        // Clear optimistic updates (database confirmed)
        state.optimisticUpdate = null
        
        // Update predicted values
        streakSlice.caseReducers.updatePredictedValues(state)
      })
      .addCase(recordActivity.rejected, (state, action) => {
        // Revert optimistic updates on failure
        state.optimisticUpdate = null
        state.error = action.payload as string
        
        // Update predicted values to revert to database state
        streakSlice.caseReducers.updatePredictedValues(state)
      })
  },
})

export const {
  addActivityOptimistic,
  updateStreakData,
  clearStaleUpdates,
  clearOptimisticUpdates,
  updatePredictedValues,
  setPredictedStreak,
  clearState,
} = streakSlice.actions

export default streakSlice