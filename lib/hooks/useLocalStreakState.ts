/**
 * Local streak state management for instant UI updates
 * 
 * This hook provides immediate feedback for streak-related actions while database
 * operations happen in background. Falls back to database state if needed.
 */

import { useState, useCallback } from 'react'
import { useDevTime } from '@/lib/contexts/DevTimeContext'

interface LocalStreakUpdate {
  streakIncrement?: number
  hasActivityToday?: boolean
  timestamp: number
}

export function useLocalStreakState() {
  // Track local streak updates that haven't been synced yet
  const [localUpdate, setLocalUpdate] = useState<LocalStreakUpdate | null>(null)
  const { getCurrentDate } = useDevTime()
  
  // Clear old updates periodically (they should sync within 30 seconds)
  const clearStaleUpdates = useCallback(() => {
    const now = Date.now()
    setLocalUpdate(prev => {
      if (prev && (now - prev.timestamp > 30000)) { // 30 seconds
        return null
      }
      return prev
    })
  }, [])

  // Add optimistic streak update for activity (words added or reviews completed)
  const addActivityOptimistic = useCallback(() => {
    const today = getCurrentDate().toISOString().split('T')[0]
    
    setLocalUpdate(prev => {
      // Only increment if we haven't already recorded activity today
      if (prev?.hasActivityToday) {
        return prev // No additional increment needed
      }
      
      return {
        streakIncrement: 1, // Assume streak will increase by 1
        hasActivityToday: true,
        timestamp: Date.now()
      }
    })
    
    // Clear stale updates
    setTimeout(clearStaleUpdates, 100)
  }, [clearStaleUpdates, getCurrentDate])

  // Get predicted streak count (merges database + local state)
  const getPredictedStreak = useCallback((dbStreakCount: number): number => {
    if (!localUpdate) {
      return dbStreakCount
    }
    
    // Apply local predictions
    const predictedCount = dbStreakCount + (localUpdate.streakIncrement || 0)
    return Math.max(0, predictedCount) // Never go below 0
  }, [localUpdate])

  // Check if user has predicted activity today
  const hasPredictedActivityToday = useCallback((dbHasActivity: boolean): boolean => {
    if (localUpdate?.hasActivityToday) {
      return true
    }
    return dbHasActivity
  }, [localUpdate])

  // Clear local state (when database sync confirmed or on refresh)
  const clearStreakUpdates = useCallback(() => {
    setLocalUpdate(null)
  }, [])

  return {
    addActivityOptimistic,
    getPredictedStreak,
    hasPredictedActivityToday,
    clearStreakUpdates,
    hasLocalStreakUpdate: !!localUpdate
  }
}