import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from './AuthContext'
import { useDevTime } from './DevTimeContext'
import { 
  AppState, 
  GoldListSettings, 
  NotebookWithStats, 
  ReviewSession, 
  InputSession
} from '../types/goldlist'
import { supabaseService } from '../services/supabaseService'
import { notificationService } from '../services/notificationService'

// Event system for reliable cross-screen communication
type AppEvent = 'wordsAdded' | 'reviewsCompleted' | 'appOpened' | 'dataChanged'

interface AppEventData {
  wordsAdded: { notebookId: string; wordCount: number }
  reviewsCompleted: { notebookId: string; reviewCount: number }
  appOpened: Record<string, never>
  dataChanged: Record<string, never>
}

type EventListener<T extends AppEvent> = (data: AppEventData[T]) => void

interface AppContextType {
  appState: AppState
  settings: GoldListSettings
  updateSettings: (settings: Partial<GoldListSettings>) => Promise<void>
  refreshNotebooks: (skipProfileRefresh?: boolean) => Promise<void>
  setCurrentNotebook: (notebook: NotebookWithStats | null) => void
  startReviewSession: (notebookId: string) => Promise<void>
  startInputSession: (notebookId: string, mode: 'focus' | 'fullpage') => Promise<void>
  updateNotebookLastUsed: (notebookId: string) => Promise<void>
  scheduleNotifications: () => Promise<void>
  refreshData?: () => Promise<void>
  // Event system methods
  emitEvent: <T extends AppEvent>(event: T, data: AppEventData[T]) => void
  addEventListener: <T extends AppEvent>(event: T, listener: EventListener<T>) => () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

const DEFAULT_SETTINGS: GoldListSettings = {
  wordsPerDay: 20,
  reviewIntervalDays: 14,
  enableNotifications: true,
  enableHapticFeedback: true,
}


interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const { user, profile, refreshProfile } = useAuth()
  const { getCurrentDate, isDevMode } = useDevTime()
  const [appState, setAppState] = useState<AppState>({
    user: null,
    notebooks: [],
    currentNotebook: null,
    reviewSession: null,
    inputSession: null,
    settings: DEFAULT_SETTINGS,
    isOffline: false,
    lastSyncTime: null,
  })

  // Event system for reliable cross-screen communication
  const eventListeners = useRef(new Map<AppEvent, Set<EventListener<any>>>())

  const emitEvent = useCallback(<T extends AppEvent>(event: T, data: AppEventData[T]) => {
    const listeners = eventListeners.current.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
    // if (__DEV__) console.log(`📡 Event emitted: ${event}`, data)
  }, [])

  const addEventListener = useCallback(<T extends AppEvent>(
    event: T, 
    listener: EventListener<T>
  ): (() => void) => {
    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, new Set())
    }
    eventListeners.current.get(event)!.add(listener)

    // Return cleanup function
    return () => {
      const listeners = eventListeners.current.get(event)
      if (listeners) {
        listeners.delete(listener)
        if (listeners.size === 0) {
          eventListeners.current.delete(event)
        }
      }
    }
  }, [])

  // Load settings from AsyncStorage
  useEffect(() => {
    loadSettings()
  }, [])

  // Update user in app state when auth changes
  useEffect(() => {
    if (__DEV__) console.log('🔄 AppContext: Profile changed, triggering refreshNotebooks')
    setAppState(prev => ({ ...prev, user: profile }))
    if (profile) {
      // CRITICAL: Skip profile refresh when triggered by profile change to prevent infinite loop
      refreshNotebooks(true) // Skip profile refresh since profile just changed
    }
  }, [profile])

  // Initialize notifications when user is authenticated
  useEffect(() => {
    if (user?.id && appState.settings.enableNotifications) {
      console.log('🔔 Initializing notifications service...')
      notificationService.initialize(user.id, isDevMode)
        .then((success) => {
          if (success) {
            console.log('✅ Notifications initialized successfully')
            // Schedule initial notifications
            scheduleNotifications()
          } else {
            console.log('❌ Notification permissions denied')
          }
        })
        .catch((error) => {
          console.error('❌ Failed to initialize notifications:', error)
        })
    }
  }, [user?.id, appState.settings.enableNotifications, isDevMode])

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('goldlist_settings')
      if (stored) {
        const settings = JSON.parse(stored)
        setAppState(prev => ({ ...prev, settings: { ...DEFAULT_SETTINGS, ...settings } }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }


  const updateSettings = async (newSettings: Partial<GoldListSettings>) => {
    try {
      const updatedSettings = { ...appState.settings, ...newSettings }
      await AsyncStorage.setItem('goldlist_settings', JSON.stringify(updatedSettings))
      setAppState(prev => ({ ...prev, settings: updatedSettings }))
      
      // If notifications setting changed, reschedule notifications
      if ('enableNotifications' in newSettings && user?.id) {
        if (updatedSettings.enableNotifications) {
          // Re-initialize and schedule notifications
          const success = await notificationService.initialize(user.id, isDevMode)
          if (success) {
            await scheduleNotifications()
          }
        } else {
          // Cancel all notifications
          await notificationService.cancelAllNotifications()
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const scheduleNotifications = useCallback(async () => {
    if (!user?.id || !appState.settings.enableNotifications) return
    
    try {
      console.log('📅 Scheduling notifications...')
      const currentDate = getCurrentDate()
      await notificationService.scheduleAllNotifications(appState.notebooks, profile, currentDate)
      console.log('✅ Notifications scheduled successfully')
    } catch (error) {
      console.error('❌ Failed to schedule notifications:', error)
    }
  }, [user?.id, appState.settings.enableNotifications, appState.notebooks, profile, getCurrentDate])

  const refreshNotebooks = useCallback(async (skipProfileRefresh = false) => {
    if (!user?.id) return

    try {
      if (__DEV__) console.log('🔄 refreshNotebooks called, skipProfileRefresh:', skipProfileRefresh)
      
      // Unlock today's pages first
      await supabaseService.unlockTodaysPages()
      
      // Then load notebooks
      const notebooks = await supabaseService.getNotebooks()
      
      // PERFORMANCE: Only update state if notebooks actually changed
      setAppState(prev => {
        // Check if notebooks are actually different
        const notebooksChanged = JSON.stringify(prev.notebooks) !== JSON.stringify(notebooks)
        if (!notebooksChanged && __DEV__) {
          console.log('🔄 Notebooks data is identical, skipping state update')
          return prev // Don't trigger state update if data is the same
        }
        
        if (__DEV__ && notebooksChanged) {
          console.log('🔄 Notebooks data changed, updating state')
        }
        
        return { 
          ...prev, 
          notebooks,
          lastSyncTime: new Date()
        }
      })

      // PERFORMANCE: Skip profile refresh when it's redundant (e.g., after addWords)
      if (!skipProfileRefresh) {
        if (__DEV__) console.log('🔄 refreshNotebooks calling refreshProfile - this may trigger loop!')
        await refreshProfile()
      }
    } catch (error) {
      console.error('Error loading notebooks:', error)
      setAppState(prev => ({ ...prev, isOffline: true }))
    }
  }, [user?.id, refreshProfile])

  const setCurrentNotebook = (notebook: NotebookWithStats | null) => {
    setAppState(prev => ({ ...prev, currentNotebook: notebook }))
  }

  const startReviewSession = async (notebookId: string) => {
    try {
      // TODO: Load words for review
      const reviewSession: ReviewSession = {
        id: `review_${Date.now()}`,
        notebookId,
        words: [], // Will be populated with actual words
        currentIndex: 0,
        startTime: new Date(),
        responses: [],
        isCompleted: false,
      }
      
      setAppState(prev => ({ ...prev, reviewSession }))
    } catch (error) {
      console.error('Error starting review session:', error)
    }
  }

  const startInputSession = async (notebookId: string, mode: 'focus' | 'fullpage') => {
    try {
      // TODO: Create new page or load existing incomplete page
      const inputSession: InputSession = {
        notebookId,
        pageId: `page_${Date.now()}`, // Temporary ID
        words: [],
        targetCount: appState.settings.wordsPerDay,
        currentIndex: 0,
        mode,
      }
      
      setAppState(prev => ({ ...prev, inputSession }))
    } catch (error) {
      console.error('Error starting input session:', error)
    }
  }


  const updateNotebookLastUsed = async (notebookId: string) => {
    try {
      if (__DEV__) console.log('🔄 updateNotebookLastUsed called for:', notebookId.slice(0, 8))
      
      // Optimistic UI update: immediately reorder notebooks locally
      const currentTime = new Date().toISOString()
      setAppState(prev => {
        // Check if this notebook actually needs updating
        const targetNotebook = prev.notebooks.find(n => n.id === notebookId)
        if (!targetNotebook) {
          if (__DEV__) console.log('🔄 updateNotebookLastUsed: Notebook not found, skipping update')
          return prev
        }
        
        // Check if the last_used_at would actually change (avoid updates if called rapidly)
        const existingTime = targetNotebook.last_used_at || targetNotebook.created_at
        const timeDiff = new Date(currentTime).getTime() - new Date(existingTime).getTime()
        if (timeDiff < 1000) { // Less than 1 second difference
          if (__DEV__) console.log('🔄 updateNotebookLastUsed: Time difference too small, skipping update')
          return prev
        }
        
        const updatedNotebooks = prev.notebooks.map(notebook => 
          notebook.id === notebookId 
            ? { ...notebook, last_used_at: currentTime, updated_at: currentTime }
            : notebook
        )
        
        // Sort by last_used_at to ensure the updated notebook appears first
        const sortedNotebooks = updatedNotebooks.sort((a, b) => {
          const aTime = new Date(a.last_used_at || a.created_at).getTime()
          const bTime = new Date(b.last_used_at || b.created_at).getTime()
          return bTime - aTime
        })
        
        if (__DEV__) console.log('🔄 updateNotebookLastUsed: Creating NEW notebooks array - this is necessary for reordering')
        return { ...prev, notebooks: sortedNotebooks }
      })

      // Update database in background (don't await to avoid slowing UI)
      supabaseService.updateNotebookLastUsed(notebookId).catch(error => {
        console.warn('Failed to update notebook last used in database:', error)
        // In case of error, refresh from database to get correct state
        // Skip profile refresh since this is just a notebook ordering issue
        refreshNotebooks(true)
      })
    } catch (error) {
      console.warn('Failed to update notebook last used:', error)
    }
  }

  const refreshData = useCallback(async () => {
    await refreshNotebooks(false)
    await scheduleNotifications()
  }, [refreshNotebooks, scheduleNotifications])

  const value: AppContextType = {
    appState,
    settings: appState.settings,
    updateSettings,
    refreshNotebooks,
    setCurrentNotebook,
    startReviewSession,
    startInputSession,
    updateNotebookLastUsed,
    scheduleNotifications,
    refreshData,
    emitEvent,
    addEventListener,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}