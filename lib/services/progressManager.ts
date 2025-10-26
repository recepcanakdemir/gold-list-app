import { supabaseService } from './supabaseService'
import { invalidateCache } from './performanceCache'
import { supabase } from '@/lib/supabase/client'
import { profileOperations } from '@/lib/supabase/operations'

// Unified progress state interface
interface ProgressState {
  todayProgress: {
    wordsAdded: number
    goal: number
    completed: boolean
  }
  weeklyProgress: Array<{
    day: string
    wordsAdded: number
    wordsRemembered: number
    completed: boolean
  }>
  totalStats: {
    totalAdded: number
    totalMastered: number
  }
  heatmapData: number[][] // 7x25 grid for GitHub-style activity
  streakCount: number
  notebookProgress: Map<string, {
    wordsAdded: number
    goal: number
    completed: boolean
  }>
  lastSyncTime: number
  // ✨ FLICKER PREVENTION: Track optimistic updates vs database data
  hasOptimisticUpdates: boolean
  lastOptimisticUpdateTime: number
}

type ProgressListener = (state: ProgressState) => void

class ProgressManager {
  private state: ProgressState
  private listeners: Set<ProgressListener> = new Set()
  private syncInterval: NodeJS.Timeout | null = null
  private pendingUpdates: Array<{
    type: 'words_added' | 'words_reviewed'
    data: any
    timestamp: number
  }> = []
  
  // ✨ BACKGROUND SYNC GUARDS: Prevent concurrent sync operations
  private isSyncingPendingUpdates: boolean = false
  private isBackgroundSyncActive: boolean = false
  
  // ✨ INITIALIZATION GUARDS: Prevent multiple instances and concurrent calls
  private isInitialized: boolean = false
  private isInitializing: boolean = false
  private isHydrating: boolean = false
  private hydratePromise: Promise<void> | null = null

  constructor() {
    this.state = this.getInitialState()
  }

  // ✨ INITIALIZATION METHOD: Ensure proper setup
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ ProgressManager: Already initialized, skipping...')
      return
    }

    if (this.isInitializing) {
      console.log('⚠️ ProgressManager: Initialization in progress, waiting...')
      return
    }

    this.isInitializing = true

    try {
      console.log('🚀 ProgressManager: Initializing...')
      
      // Perform initial database hydration
      await this.hydrateFromDatabase()
      
      this.isInitialized = true
      console.log('✅ ProgressManager: Initialization complete')
    } catch (error) {
      console.error('❌ ProgressManager: Initialization failed:', error)
    } finally {
      this.isInitializing = false
    }
  }

  private getInitialState(): ProgressState {
    return {
      todayProgress: {
        wordsAdded: 0,
        goal: 20,
        completed: false
      },
      weeklyProgress: [
        { day: 'Mon', wordsAdded: 0, wordsRemembered: 0, completed: false },
        { day: 'Tue', wordsAdded: 0, wordsRemembered: 0, completed: false },
        { day: 'Wed', wordsAdded: 0, wordsRemembered: 0, completed: false },
        { day: 'Thu', wordsAdded: 0, wordsRemembered: 0, completed: false },
        { day: 'Fri', wordsAdded: 0, wordsRemembered: 0, completed: false },
        { day: 'Sat', wordsAdded: 0, wordsRemembered: 0, completed: false },
        { day: 'Sun', wordsAdded: 0, wordsRemembered: 0, completed: false },
      ],
      totalStats: {
        totalAdded: 0,
        totalMastered: 0
      },
      heatmapData: Array.from({ length: 7 }, () => Array(25).fill(0)),
      streakCount: 0,
      notebookProgress: new Map(),
      lastSyncTime: 0,
      // ✨ FLICKER PREVENTION: Initialize optimistic tracking
      hasOptimisticUpdates: false,
      lastOptimisticUpdateTime: 0
    }
  }

  // ✨ INSTANT OPTIMISTIC UPDATES

  addWordsOptimistic(notebookId: string, wordCount: number, goal: number = 20): void {
    console.log(`🚀 ProgressManager: Optimistic word addition - ${wordCount} words to ${notebookId.slice(0, 8)}`)
    
    // ✨ FLICKER PREVENTION: Mark as having optimistic updates
    this.state.hasOptimisticUpdates = true
    this.state.lastOptimisticUpdateTime = Date.now()
    
    // Update today's progress
    const newWordsAdded = this.state.todayProgress.wordsAdded + wordCount
    this.state.todayProgress = {
      wordsAdded: newWordsAdded,
      goal: this.state.todayProgress.goal,
      completed: newWordsAdded >= this.state.todayProgress.goal
    }

    // Update weekly progress (today's entry)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })
    this.state.weeklyProgress = this.state.weeklyProgress.map(day => {
      if (day.day === today) {
        const newDayWords = day.wordsAdded + wordCount
        return {
          ...day,
          wordsAdded: newDayWords,
          completed: newDayWords >= goal
        }
      }
      return day
    })

    // Update total stats
    this.state.totalStats = {
      ...this.state.totalStats,
      totalAdded: this.state.totalStats.totalAdded + wordCount
    }

    // Update heatmap (mark today as active)
    const todayDate = new Date()
    const dayOfWeek = todayDate.getUTCDay() // 0 = Sunday, 6 = Saturday
    const currentWeekCol = 24 // Rightmost column is current week
    
    if (this.state.heatmapData[dayOfWeek]) {
      this.state.heatmapData[dayOfWeek][currentWeekCol] = 1 // Mark as active
    }

    // Update notebook-specific progress
    const currentNotebookProgress = this.state.notebookProgress.get(notebookId) || {
      wordsAdded: 0,
      goal,
      completed: false
    }
    
    const newNotebookWords = currentNotebookProgress.wordsAdded + wordCount
    this.state.notebookProgress.set(notebookId, {
      wordsAdded: newNotebookWords,
      goal,
      completed: newNotebookWords >= goal
    })

    // Track pending update for background sync
    this.pendingUpdates.push({
      type: 'words_added',
      data: { notebookId, wordCount, goal },
      timestamp: Date.now()
    })

    // Notify all listeners immediately (0ms update)
    this.notifyListeners()
  }

  addReviewsOptimistic(notebookId: string, reviewCount: number): void {
    console.log(`🚀 ProgressManager: Optimistic review completion - ${reviewCount} reviews`)
    
    // ✨ FLICKER PREVENTION: Mark as having optimistic updates
    this.state.hasOptimisticUpdates = true
    this.state.lastOptimisticUpdateTime = Date.now()
    
    // Update weekly progress (reviews)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'short' })
    this.state.weeklyProgress = this.state.weeklyProgress.map(day => {
      if (day.day === today) {
        return {
          ...day,
          wordsRemembered: day.wordsRemembered + reviewCount
        }
      }
      return day
    })

    // Update heatmap (mark today as active if not already)
    const todayDate = new Date()
    const dayOfWeek = todayDate.getUTCDay()
    const currentWeekCol = 24
    
    if (this.state.heatmapData[dayOfWeek]) {
      this.state.heatmapData[dayOfWeek][currentWeekCol] = 1
    }

    // Track pending update
    this.pendingUpdates.push({
      type: 'words_reviewed',
      data: { notebookId, reviewCount },
      timestamp: Date.now()
    })

    this.notifyListeners()
  }

  incrementStreakOptimistic(): void {
    console.log(`🚀 ProgressManager: Optimistic streak increment`)
    
    // ✨ FLICKER PREVENTION: Mark as having optimistic updates
    this.state.hasOptimisticUpdates = true
    this.state.lastOptimisticUpdateTime = Date.now()
    
    this.state.streakCount += 1
    this.notifyListeners()
  }

  // ✨ ROLLBACK MECHANISM: Restore state when optimistic updates fail
  rollbackOptimisticUpdates(): void {
    console.log('🔄 ProgressManager: Rolling back optimistic updates...')
    
    // Clear optimistic update flags
    this.state.hasOptimisticUpdates = false
    this.state.lastOptimisticUpdateTime = 0
    
    // Clear pending updates
    this.pendingUpdates = []
    
    // Force re-hydration from database to get correct state
    this.hydrateFromDatabase().catch(error => {
      console.error('Failed to re-hydrate after rollback:', error)
    })
    
    console.log('✅ ProgressManager: Optimistic updates rolled back')
  }

  // ✨ DAY CHANGE HANDLING: Refresh data when day advances
  handleDayChange(): void {
    console.log('📅 ProgressManager: Day change detected - refreshing weekly progress')
    
    // Clear optimistic updates (they're for the previous day)
    this.state.hasOptimisticUpdates = false
    this.state.lastOptimisticUpdateTime = 0
    
    // Clear pending updates
    this.pendingUpdates = []
    
    // ✨ CACHE INVALIDATION: Clear all cached progress data to force fresh fetch
    try {
      invalidateCache('weeklyProgress')
      invalidateCache('todayProgress')
      invalidateCache('totalStats')
      console.log('🗑️ ProgressManager: Cache invalidated for day change')
    } catch (error) {
      console.warn('Warning: Failed to invalidate cache:', error)
    }
    
    // Force refresh of weekly progress data
    this.hydrateFromDatabase().catch(error => {
      console.error('Failed to refresh data after day change:', error)
    })
    
    console.log('✅ ProgressManager: Day change handling complete')
  }

  // 📊 STATE ACCESS

  getState(): ProgressState {
    return { ...this.state }
  }

  getTodayProgress(): { wordsAdded: number; goal: number; completed: boolean } {
    return { ...this.state.todayProgress }
  }

  getWeeklyProgress(): Array<{ day: string; wordsAdded: number; wordsRemembered: number; completed: boolean }> {
    return [...this.state.weeklyProgress]
  }

  getTotalStats(): { totalAdded: number; totalMastered: number } {
    return { ...this.state.totalStats }
  }

  getHeatmapData(): number[][] {
    return this.state.heatmapData.map(row => [...row])
  }

  getNotebookProgress(notebookId: string): { wordsAdded: number; goal: number; completed: boolean } | null {
    return this.state.notebookProgress.get(notebookId) || null
  }

  getStreakCount(): number {
    return this.state.streakCount
  }

  // 🔄 BACKGROUND SYNCHRONIZATION

  async hydrateFromDatabase(): Promise<void> {
    // ✨ INITIALIZATION GUARDS: Prevent concurrent hydration calls
    if (this.isHydrating) {
      console.log('⚠️ ProgressManager: Hydration already in progress, waiting for existing call...')
      if (this.hydratePromise) {
        await this.hydratePromise
      }
      return
    }

    this.isHydrating = true
    
    try {
      this.hydratePromise = this.performHydration()
      await this.hydratePromise
    } finally {
      this.isHydrating = false
      this.hydratePromise = null
    }
  }

  private async getUserProfile(): Promise<{ streak_count: number } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const profile = await profileOperations.get(user.id)
      if (!profile) return null

      // Return only the streak_count field to match the interface
      return { streak_count: profile.streak_count }
    } catch (error) {
      console.error('ProgressManager: Error in getUserProfile:', error)
      return null
    }
  }

  private async performHydration(): Promise<void> {
    try {
      console.log('🔄 ProgressManager: Hydrating from database...')
      const startTime = Date.now()

      // Load all data in parallel including user profile for streak count
      const [
        todayProgress,
        weeklyProgress,
        totalStats,
        dailyProgress,
        userProfile
      ] = await Promise.all([
        supabaseService.getTodayProgress(),
        supabaseService.getWeeklyProgress(),
        supabaseService.getTotalWordsStats(),
        supabaseService.getDailyProgress(175),
        this.getUserProfile()
      ])

      // ✨ RECONCILIATION: Smart merge of optimistic and database data
      const timeSinceOptimisticUpdate = Date.now() - this.state.lastOptimisticUpdateTime
      const hasRecentOptimisticUpdates = this.state.hasOptimisticUpdates && timeSinceOptimisticUpdate < 10000 // 10 seconds

      if (!hasRecentOptimisticUpdates) {
        // No recent optimistic updates - safe to use database data
        this.state.todayProgress = todayProgress || this.state.todayProgress
        this.state.weeklyProgress = weeklyProgress || this.state.weeklyProgress
        this.state.totalStats = totalStats || this.state.totalStats
        
        // Update streak count from profile data
        if (userProfile?.streak_count !== undefined) {
          this.state.streakCount = userProfile.streak_count
          console.log(`🔥 ProgressManager: Updated streak count from profile: ${userProfile.streak_count}`)
        }
        
        // Clear optimistic update flags after successful sync
        this.state.hasOptimisticUpdates = false
        this.state.lastOptimisticUpdateTime = 0
        
        console.log('📊 ProgressManager: Updated with database data - no conflicts')
      } else {
        // Recent optimistic updates - reconcile intelligently
        console.log('🔀 ProgressManager: Reconciling optimistic and database data...')
        
        // Reconcile today's progress: use higher values (optimistic updates are additive)
        if (todayProgress && todayProgress.wordsAdded > this.state.todayProgress.wordsAdded) {
          console.log('📊 Database has higher progress than optimistic - using database data')
          this.state.todayProgress = todayProgress
        } else {
          console.log('📊 Optimistic data is newer - preserving optimistic progress')
        }
        
        // Reconcile weekly progress: merge data intelligently
        if (weeklyProgress) {
          this.state.weeklyProgress = this.reconcileWeeklyProgress(this.state.weeklyProgress, weeklyProgress)
        }
        
        // Reconcile total stats: use database for reliable totals
        if (totalStats) {
          this.state.totalStats = totalStats
        }
        
        // Reconcile streak count: prefer database value over optimistic for accuracy
        if (userProfile?.streak_count !== undefined) {
          // Only update if database streak is different from optimistic
          if (userProfile.streak_count !== this.state.streakCount) {
            console.log(`🔥 ProgressManager: Reconciling streak - optimistic: ${this.state.streakCount}, database: ${userProfile.streak_count}`)
            this.state.streakCount = userProfile.streak_count
          }
        }
        
        // Keep optimistic flags but reduce timeout for faster convergence
        console.log('🛡️ ProgressManager: Reconciliation complete - optimistic updates preserved')
      }
      
      // Generate heatmap from daily progress (always safe to update)
      if (dailyProgress && dailyProgress.length > 0) {
        this.state.heatmapData = this.generateHeatmapFromDailyProgress(dailyProgress)
      }

      this.state.lastSyncTime = Date.now()
      
      const loadTime = Date.now() - startTime
      console.log(`✅ ProgressManager: Database hydration completed in ${loadTime}ms`)
      
      this.notifyListeners()
    } catch (error) {
      console.error('❌ ProgressManager: Database hydration failed:', error)
    }
  }

  async syncNotebookProgress(notebooks: Array<{ id: string; words_per_day?: number }>): Promise<void> {
    try {
      // Load progress for each notebook in parallel
      const progressPromises = notebooks.map(async (notebook) => {
        try {
          const todaysPage = await supabaseService.getTodaysPage(notebook.id)
          const wordsAdded = todaysPage?.words?.length || 0
          const goal = notebook.words_per_day || 20
          
          return {
            notebookId: notebook.id,
            progress: {
              wordsAdded,
              goal,
              completed: wordsAdded >= goal
            }
          }
        } catch (error) {
          console.error(`Error syncing notebook ${notebook.id}:`, error)
          return {
            notebookId: notebook.id,
            progress: {
              wordsAdded: 0,
              goal: notebook.words_per_day || 20,
              completed: false
            }
          }
        }
      })

      const results = await Promise.all(progressPromises)
      
      // Update notebook progress map
      results.forEach(({ notebookId, progress }) => {
        this.state.notebookProgress.set(notebookId, progress)
      })

      this.notifyListeners()
    } catch (error) {
      console.error('❌ ProgressManager: Notebook progress sync failed:', error)
    }
  }

  startBackgroundSync(intervalMs: number = 30000): void {
    // ✨ BACKGROUND SYNC GUARDS: Prevent multiple sync intervals
    if (this.isBackgroundSyncActive) {
      console.log('⚠️ ProgressManager: Background sync already active, skipping new interval')
      return
    }

    if (this.syncInterval) {
      console.log('🔄 ProgressManager: Clearing existing sync interval')
      clearInterval(this.syncInterval)
    }

    this.isBackgroundSyncActive = true
    console.log(`🔄 ProgressManager: Starting background sync (${intervalMs}ms interval)`)

    this.syncInterval = setInterval(async () => {
      try {
        // Sync pending updates if any exist and not already syncing
        if (this.pendingUpdates.length > 0 && !this.isSyncingPendingUpdates) {
          await this.syncPendingUpdates()
        }
        
        // Periodic hydration to catch changes from other devices
        // Only if we don't have recent optimistic updates (avoid conflicts)
        const timeSinceLastSync = Date.now() - this.state.lastSyncTime
        const timeSinceOptimistic = Date.now() - this.state.lastOptimisticUpdateTime
        const hasRecentOptimistic = this.state.hasOptimisticUpdates && timeSinceOptimistic < 15000 // 15 seconds
        
        if (timeSinceLastSync > 60000 && !hasRecentOptimistic && !this.isHydrating) {
          console.log('🔄 ProgressManager: Background hydration (no recent optimistic updates)')
          await this.hydrateFromDatabase()
        }
      } catch (error) {
        console.error('❌ ProgressManager: Background sync error:', error)
      }
    }, intervalMs)
  }

  stopBackgroundSync(): void {
    console.log('🛑 ProgressManager: Stopping background sync')
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    
    this.isBackgroundSyncActive = false
  }

  private async syncPendingUpdates(): Promise<void> {
    // ✨ BACKGROUND SYNC GUARDS: Prevent concurrent pending updates sync
    if (this.isSyncingPendingUpdates) {
      console.log('⚠️ ProgressManager: Pending updates sync already in progress, skipping')
      return
    }

    this.isSyncingPendingUpdates = true

    try {
      console.log(`🔄 ProgressManager: Syncing ${this.pendingUpdates.length} pending updates`)
      
      // Process pending updates
      // In a production app, you'd batch these updates and send to server
      // For now, we just clear them since the database save already happened
      this.pendingUpdates = []
      
      console.log('✅ ProgressManager: Pending updates synced')
    } catch (error) {
      console.error('❌ ProgressManager: Pending updates sync failed:', error)
    } finally {
      this.isSyncingPendingUpdates = false
    }
  }

  // 🎧 LISTENER MANAGEMENT

  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState())
      } catch (error) {
        console.error('ProgressManager listener error:', error)
      }
    })
  }

  // 🛠️ UTILITY METHODS

  private reconcileWeeklyProgress(
    optimisticWeekly: Array<{ day: string; wordsAdded: number; wordsRemembered: number; completed: boolean }>,
    databaseWeekly: Array<{ day: string; wordsAdded: number; wordsRemembered: number; completed: boolean }>
  ): Array<{ day: string; wordsAdded: number; wordsRemembered: number; completed: boolean }> {
    // Merge weekly progress: for each day, use the higher values (optimistic updates are additive)
    return optimisticWeekly.map(optimisticDay => {
      const databaseDay = databaseWeekly.find(dbDay => dbDay.day === optimisticDay.day)
      
      if (!databaseDay) {
        // Database doesn't have this day - keep optimistic data
        return optimisticDay
      }
      
      // Use higher values for words added and reviewed (assuming optimistic updates are additive)
      const reconciledWordsAdded = Math.max(optimisticDay.wordsAdded, databaseDay.wordsAdded)
      const reconciledWordsRemembered = Math.max(optimisticDay.wordsRemembered, databaseDay.wordsRemembered)
      
      return {
        day: optimisticDay.day,
        wordsAdded: reconciledWordsAdded,
        wordsRemembered: reconciledWordsRemembered,
        completed: reconciledWordsAdded >= 20 // Recalculate completion based on merged data
      }
    })
  }

  private generateHeatmapFromDailyProgress(dailyProgress: any[]): number[][] {
    const heatmapData = Array.from({ length: 7 }, () => Array(25).fill(0))
    
    dailyProgress.forEach((day) => {
      if (!day.date) return
      
      const dayDate = new Date(day.date + 'T00:00:00.000Z')
      const dayOfWeek = dayDate.getUTCDay()
      
      // Calculate column position (25 weeks, rightmost = current week)
      const currentDate = new Date()
      const currentWeekStart = new Date(currentDate)
      currentWeekStart.setUTCDate(currentDate.getUTCDate() - currentDate.getUTCDay())
      
      const dayWeekStart = new Date(dayDate)
      dayWeekStart.setUTCDate(dayDate.getUTCDate() - dayDate.getUTCDay())
      
      const weeksDiff = Math.floor((currentWeekStart.getTime() - dayWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      const col = 24 - weeksDiff // Rightmost column = current week
      
      if (col >= 0 && col < 25 && dayOfWeek >= 0 && dayOfWeek < 7) {
        const isActive = (day.wordsAdded > 0 || day.wordsReviewed > 0) ? 1 : 0
        heatmapData[dayOfWeek][col] = isActive
      }
    })
    
    return heatmapData
  }

  // 🧹 CLEANUP

  destroy(): void {
    console.log('🧹 ProgressManager: Destroying instance...')
    
    this.stopBackgroundSync()
    this.listeners.clear()
    this.pendingUpdates = []
    
    // Reset all flags
    this.isInitialized = false
    this.isInitializing = false
    this.isHydrating = false
    this.isSyncingPendingUpdates = false
    this.isBackgroundSyncActive = false
    this.hydratePromise = null
    
    console.log('✅ ProgressManager: Instance destroyed')
  }
}

// Export singleton instance
export const progressManager = new ProgressManager()
export type { ProgressState, ProgressListener }