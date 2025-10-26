/**
 * Instant Updates Hook - Unified Interface for Instagram-like Responsiveness
 * 
 * This hook replaces useLocalNotebookState and useLocalStreakState with a single,
 * optimistic-first interface that provides instant UI updates for all operations.
 */

import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/lib/store'
import { 
  addWordsOptimistic, 
  addReviewsOptimistic,
  clearOptimisticUpdates as clearNotebookUpdates 
} from '@/lib/store/slices/notebooksSlice'
import { 
  addActivityOptimistic,
  clearOptimisticUpdates as clearStreakUpdates 
} from '@/lib/store/slices/streakSlice'
import { 
  addTodayWordsOptimistic,
  addTodayReviewsOptimistic,
  updateStreakOptimistic 
} from '@/lib/store/slices/progressSlice'
import { addSyncOperation } from '@/lib/store/slices/syncSlice'

export function useInstantUpdates() {
  const dispatch = useAppDispatch()
  
  // Get current state for computed values
  const notebooks = useAppSelector(state => state.notebooks.notebooks)
  const buttonStates = useAppSelector(state => state.notebooks.buttonStates)
  const todayProgress = useAppSelector(state => state.notebooks.todayProgress)
  const predictedStreak = useAppSelector(state => state.streak.predictedStreak)
  const dashboardStats = useAppSelector(state => state.progress.dashboardStats)

  // ✨ INSTANT: Add words with immediate UI feedback
  const addWords = useCallback(async (notebookId: string, pageId: string, words: any[], wordCount: number) => {
    // 1. INSTANT: Update all relevant UI states immediately
    dispatch(addWordsOptimistic({ notebookId, wordCount }))
    dispatch(addActivityOptimistic())
    dispatch(addTodayWordsOptimistic(wordCount))
    dispatch(updateStreakOptimistic(predictedStreak + 1))
    
    // 2. BACKGROUND: Queue database operation for sync
    dispatch(addSyncOperation({
      type: 'addWords',
      data: { pageId, words },
      maxRetries: 3
    }))
    
    return true // Always return success for optimistic updates
  }, [dispatch, predictedStreak])

  // ✨ INSTANT: Complete reviews with immediate UI feedback  
  const completeReviews = useCallback(async (notebookId: string, reviewResults: any[], reviewCount: number) => {
    // 1. INSTANT: Update all relevant UI states immediately
    dispatch(addReviewsOptimistic({ notebookId, reviewCount }))
    dispatch(addActivityOptimistic())
    dispatch(addTodayReviewsOptimistic(reviewCount))
    dispatch(updateStreakOptimistic(predictedStreak + 1))
    
    // 2. BACKGROUND: Queue database operations for sync
    reviewResults.forEach(result => {
      dispatch(addSyncOperation({
        type: 'completeReview',
        data: {
          wordId: result.wordId,
          result: result.result,
          round: result.round
        },
        maxRetries: 3
      }))
    })
    
    return true // Always return success for optimistic updates
  }, [dispatch, predictedStreak])

  // ✨ INSTANT: Record activity (for standalone operations)
  const recordActivity = useCallback(async () => {
    // 1. INSTANT: Update streak immediately
    dispatch(addActivityOptimistic())
    dispatch(updateStreakOptimistic(predictedStreak + 1))
    
    // 2. BACKGROUND: Queue database operation
    dispatch(addSyncOperation({
      type: 'recordActivity',
      data: {},
      maxRetries: 3
    }))
    
    return true
  }, [dispatch, predictedStreak])

  // Get predicted button state for a notebook
  const getButtonState = useCallback((notebookId: string) => {
    return buttonStates[notebookId] || {
      type: 'words',
      text: 'Add Today\'s Words',
      priority: 'medium'
    }
  }, [buttonStates])

  // Get predicted progress for a notebook
  const getNotebookProgress = useCallback((notebookId: string) => {
    const progress = todayProgress[notebookId]
    return {
      wordsAdded: progress?.wordsAdded || 0,
      goal: progress?.goal || 20,
      completed: progress?.completed || false,
      hasReviews: progress?.hasReviews || false
    }
  }, [todayProgress])

  // Clear optimistic updates (when database confirms sync)
  const clearUpdates = useCallback((notebookId?: string) => {
    if (notebookId) {
      dispatch(clearNotebookUpdates(notebookId))
    } else {
      // Clear all optimistic updates
      notebooks.forEach(notebook => {
        dispatch(clearNotebookUpdates(notebook.id))
      })
      dispatch(clearStreakUpdates())
    }
  }, [dispatch, notebooks])

  return {
    // Core operations with instant UI feedback
    addWords,
    completeReviews,
    recordActivity,
    
    // State getters
    getButtonState,
    getNotebookProgress,
    predictedStreak,
    dashboardStats,
    
    // Utility functions
    clearUpdates,
    
    // Raw state access (for advanced use cases)
    notebooks,
    buttonStates,
    todayProgress
  }
}