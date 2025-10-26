/**
 * Local state management for instant notebook UI updates
 * 
 * This hook provides immediate feedback for user actions while database
 * operations happen in background. Falls back to database state if needed.
 */

import { useState, useCallback, useRef } from 'react'
import { NotebookWithStats } from '../types/goldlist'

interface LocalNotebookUpdate {
  notebookId: string
  wordsAdded?: number
  reviewsCompleted?: number
  timestamp: number
}

interface NotebookProgress {
  wordsAdded: number
  goal: number
  completed: boolean
  hasReviews: boolean
}

export function useLocalNotebookState() {
  // Track local updates that haven't been synced yet
  const [localUpdates, setLocalUpdates] = useState<Map<string, LocalNotebookUpdate>>(new Map())
  
  // Clear old updates periodically (they should sync within 30 seconds)
  const clearStaleUpdates = useCallback(() => {
    const now = Date.now()
    setLocalUpdates(prev => {
      const updated = new Map(prev)
      for (const [notebookId, update] of updated.entries()) {
        if (now - update.timestamp > 30000) { // 30 seconds
          updated.delete(notebookId)
        }
      }
      return updated
    })
  }, [])

  // Add optimistic update for word addition
  const addWordsOptimistic = useCallback((notebookId: string, wordCount: number) => {
    setLocalUpdates(prev => {
      const updated = new Map(prev)
      const existing = updated.get(notebookId)
      updated.set(notebookId, {
        notebookId,
        wordsAdded: (existing?.wordsAdded || 0) + wordCount,
        reviewsCompleted: existing?.reviewsCompleted || 0,
        timestamp: Date.now()
      })
      return updated
    })
    
    // Clear stale updates
    setTimeout(clearStaleUpdates, 100)
  }, [clearStaleUpdates])

  // Add optimistic update for review completion
  const addReviewsOptimistic = useCallback((notebookId: string, reviewCount: number) => {
    setLocalUpdates(prev => {
      const updated = new Map(prev)
      const existing = updated.get(notebookId)
      updated.set(notebookId, {
        notebookId,
        wordsAdded: existing?.wordsAdded || 0,
        reviewsCompleted: (existing?.reviewsCompleted || 0) + reviewCount,
        timestamp: Date.now()
      })
      return updated
    })
    
    // Clear stale updates
    setTimeout(clearStaleUpdates, 100)
  }, [clearStaleUpdates])

  // Get predicted notebook progress (merges database + local state)
  const getPredictedProgress = useCallback((
    notebook: NotebookWithStats,
    todayProgress: { wordsAdded: number, goal: number, completed: boolean } | null,
    hasReviews: boolean
  ): NotebookProgress => {
    const localUpdate = localUpdates.get(notebook.id)
    
    // Base state from database
    const baseWordsAdded = todayProgress?.wordsAdded || 0
    const goal = todayProgress?.goal || 20
    
    // Apply local predictions
    const predictedWordsAdded = baseWordsAdded + (localUpdate?.wordsAdded || 0)
    const predictedCompleted = predictedWordsAdded >= goal
    
    // For reviews, if we locally completed reviews, assume no more reviews available
    const predictedHasReviews = localUpdate?.reviewsCompleted ? false : hasReviews
    
    return {
      wordsAdded: predictedWordsAdded,
      goal,
      completed: predictedCompleted,
      hasReviews: predictedHasReviews
    }
  }, [localUpdates])

  // Get predicted button state for a notebook
  const getPredictedButtonState = useCallback((
    notebook: NotebookWithStats,
    todayProgress: { wordsAdded: number, goal: number, completed: boolean } | null,
    hasReviews: boolean
  ) => {
    const progress = getPredictedProgress(notebook, todayProgress, hasReviews)
    
    // Priority logic (same as original but using predicted state)
    if (progress.hasReviews) {
      return {
        type: 'reviews',
        text: 'Review Today\'s Words',
        priority: 'high'
      }
    }
    
    if (!progress.completed) {
      return {
        type: 'words',
        text: 'Add Today\'s Words',
        priority: 'medium'
      }
    }
    
    return {
      type: 'complete',
      text: 'You\'re All Done Today! 🎉',
      priority: 'low'
    }
  }, [getPredictedProgress])

  // Clear local state for a notebook (when database sync confirmed)
  const clearNotebookUpdates = useCallback((notebookId: string) => {
    setLocalUpdates(prev => {
      const updated = new Map(prev)
      updated.delete(notebookId)
      return updated
    })
  }, [])

  // Clear all local state (on refresh/sync)
  const clearAllUpdates = useCallback(() => {
    setLocalUpdates(new Map())
  }, [])

  return {
    addWordsOptimistic,
    addReviewsOptimistic,
    getPredictedProgress,
    getPredictedButtonState,
    clearNotebookUpdates,
    clearAllUpdates,
    hasLocalUpdates: localUpdates.size > 0
  }
}