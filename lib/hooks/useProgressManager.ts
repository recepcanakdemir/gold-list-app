import { useState, useEffect, useCallback } from 'react'
import { progressManager, ProgressState } from '@/lib/services/progressManager'
import { useDevTime } from '@/lib/contexts/DevTimeContext'

// Custom hook to connect React components to ProgressManager
export function useProgressManager() {
  const [state, setState] = useState<ProgressState>(progressManager.getState())
  const { registerDayChangeCallback } = useDevTime()

  useEffect(() => {
    // ✨ INITIALIZATION: Ensure ProgressManager is properly initialized
    progressManager.initialize().catch(error => {
      console.error('Failed to initialize ProgressManager:', error)
    })

    // Subscribe to ProgressManager updates
    const unsubscribe = progressManager.subscribe((newState) => {
      setState(newState)
    })

    // Initialize with current state
    setState(progressManager.getState())

    return unsubscribe
  }, [])

  // ✨ DAY CHANGE INTEGRATION: Register callback to refresh data when day changes
  useEffect(() => {
    const unregisterDayChange = registerDayChangeCallback(() => {
      console.log('📅 useProgressManager: Day changed - triggering ProgressManager refresh')
      progressManager.handleDayChange()
    })

    return unregisterDayChange
  }, [registerDayChangeCallback])

  // Optimistic update methods
  const addWordsOptimistic = useCallback((notebookId: string, wordCount: number, goal: number = 20) => {
    progressManager.addWordsOptimistic(notebookId, wordCount, goal)
  }, [])

  const addReviewsOptimistic = useCallback((notebookId: string, reviewCount: number) => {
    progressManager.addReviewsOptimistic(notebookId, reviewCount)
  }, [])

  const incrementStreakOptimistic = useCallback(() => {
    progressManager.incrementStreakOptimistic()
  }, [])

  // Data access methods
  const getTodayProgress = useCallback(() => {
    return progressManager.getTodayProgress()
  }, [])

  const getWeeklyProgress = useCallback(() => {
    return progressManager.getWeeklyProgress()
  }, [])

  const getTotalStats = useCallback(() => {
    return progressManager.getTotalStats()
  }, [])

  const getHeatmapData = useCallback(() => {
    return progressManager.getHeatmapData()
  }, [])

  const getNotebookProgress = useCallback((notebookId: string) => {
    return progressManager.getNotebookProgress(notebookId)
  }, [])

  const getStreakCount = useCallback(() => {
    return progressManager.getStreakCount()
  }, [])

  // Sync methods
  const hydrateFromDatabase = useCallback(async () => {
    await progressManager.hydrateFromDatabase()
  }, [])

  const syncNotebookProgress = useCallback(async (notebooks: Array<{ id: string; words_per_day?: number }>) => {
    await progressManager.syncNotebookProgress(notebooks)
  }, [])

  return {
    // State
    state,
    
    // Optimistic updates
    addWordsOptimistic,
    addReviewsOptimistic,
    incrementStreakOptimistic,
    
    // Data access
    getTodayProgress,
    getWeeklyProgress,
    getTotalStats,
    getHeatmapData,
    getNotebookProgress,
    getStreakCount,
    
    // Sync methods
    hydrateFromDatabase,
    syncNotebookProgress
  }
}

// Lightweight hook for components that only need specific data
export function useTodayProgress() {
  const [progress, setProgress] = useState(progressManager.getTodayProgress())

  useEffect(() => {
    const unsubscribe = progressManager.subscribe((state) => {
      setProgress(state.todayProgress)
    })

    setProgress(progressManager.getTodayProgress())
    return unsubscribe
  }, [])

  return progress
}

export function useWeeklyProgress() {
  const [progress, setProgress] = useState(progressManager.getWeeklyProgress())

  useEffect(() => {
    const unsubscribe = progressManager.subscribe((state) => {
      setProgress(state.weeklyProgress)
    })

    setProgress(progressManager.getWeeklyProgress())
    return unsubscribe
  }, [])

  return progress
}

export function useTotalStats() {
  const [stats, setStats] = useState(progressManager.getTotalStats())

  useEffect(() => {
    const unsubscribe = progressManager.subscribe((state) => {
      setStats(state.totalStats)
    })

    setStats(progressManager.getTotalStats())
    return unsubscribe
  }, [])

  return stats
}

export function useNotebookProgress(notebookId: string) {
  const [progress, setProgress] = useState(progressManager.getNotebookProgress(notebookId))

  useEffect(() => {
    const unsubscribe = progressManager.subscribe((state) => {
      setProgress(state.notebookProgress.get(notebookId) || null)
    })

    setProgress(progressManager.getNotebookProgress(notebookId))
    return unsubscribe
  }, [notebookId])

  return progress
}

export function useStreakCount() {
  const [streak, setStreak] = useState(progressManager.getStreakCount())

  useEffect(() => {
    const unsubscribe = progressManager.subscribe((state) => {
      setStreak(state.streakCount)
    })

    setStreak(progressManager.getStreakCount())
    return unsubscribe
  }, [])

  return streak
}