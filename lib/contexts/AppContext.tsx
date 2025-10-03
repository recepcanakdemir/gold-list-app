import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from './AuthContext'
import { 
  AppState, 
  GoldListSettings, 
  NotebookWithStats, 
  ReviewSession, 
  InputSession,
  OnboardingProgress 
} from '../types/goldlist'
import { supabaseService } from '../services/supabaseService'

interface AppContextType {
  appState: AppState
  settings: GoldListSettings
  updateSettings: (settings: Partial<GoldListSettings>) => Promise<void>
  refreshNotebooks: () => Promise<void>
  setCurrentNotebook: (notebook: NotebookWithStats | null) => void
  startReviewSession: (notebookId: string) => Promise<void>
  startInputSession: (notebookId: string, mode: 'focus' | 'fullpage') => Promise<void>
  updateOnboardingProgress: (progress: Partial<OnboardingProgress>) => Promise<void>
  markOnboardingComplete: () => Promise<void>
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

const DEFAULT_ONBOARDING: OnboardingProgress = {
  currentStep: 0,
  totalSteps: 8,
  hasCompletedWelcome: false,
  hasCompletedTutorial: false,
  hasCreatedFirstNotebook: false,
  hasAddedFirstWords: false,
  hasCompletedFirstReview: false,
}

interface AppProviderProps {
  children: React.ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const { user, profile, refreshProfile } = useAuth()
  const [appState, setAppState] = useState<AppState>({
    user: null,
    notebooks: [],
    currentNotebook: null,
    reviewSession: null,
    inputSession: null,
    onboardingProgress: DEFAULT_ONBOARDING,
    settings: DEFAULT_SETTINGS,
    isOffline: false,
    lastSyncTime: null,
  })

  // Load settings from AsyncStorage
  useEffect(() => {
    loadSettings()
    loadOnboardingProgress()
  }, [])

  // Update user in app state when auth changes
  useEffect(() => {
    setAppState(prev => ({ ...prev, user: profile }))
    if (profile) {
      refreshNotebooks()
    }
  }, [profile])

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

  const loadOnboardingProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem('onboarding_progress')
      if (stored) {
        const progress = JSON.parse(stored)
        setAppState(prev => ({ ...prev, onboardingProgress: { ...DEFAULT_ONBOARDING, ...progress } }))
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error)
    }
  }

  const updateSettings = async (newSettings: Partial<GoldListSettings>) => {
    try {
      const updatedSettings = { ...appState.settings, ...newSettings }
      await AsyncStorage.setItem('goldlist_settings', JSON.stringify(updatedSettings))
      setAppState(prev => ({ ...prev, settings: updatedSettings }))
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  const refreshNotebooks = useCallback(async () => {
    if (!user?.id) return

    try {
      // Unlock today's pages first
      await supabaseService.unlockTodaysPages()
      
      // Then load notebooks
      const notebooks = await supabaseService.getNotebooks()
      setAppState(prev => ({ 
        ...prev, 
        notebooks,
        lastSyncTime: new Date()
      }))

      // Also refresh profile to get updated stats
      await refreshProfile()
    } catch (error) {
      console.error('Error loading notebooks:', error)
      setAppState(prev => ({ ...prev, isOffline: true }))
    }
  }, [user?.id])

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

  const updateOnboardingProgress = async (progress: Partial<OnboardingProgress>) => {
    try {
      const updatedProgress = { ...appState.onboardingProgress, ...progress }
      await AsyncStorage.setItem('onboarding_progress', JSON.stringify(updatedProgress))
      setAppState(prev => ({ ...prev, onboardingProgress: updatedProgress }))
    } catch (error) {
      console.error('Error updating onboarding progress:', error)
    }
  }

  const markOnboardingComplete = async () => {
    const completedProgress: OnboardingProgress = {
      ...appState.onboardingProgress,
      hasCompletedWelcome: true,
      hasCompletedTutorial: true,
      currentStep: DEFAULT_ONBOARDING.totalSteps,
    }
    await updateOnboardingProgress(completedProgress)
  }

  const value: AppContextType = {
    appState,
    settings: appState.settings,
    updateSettings,
    refreshNotebooks,
    setCurrentNotebook,
    startReviewSession,
    startInputSession,
    updateOnboardingProgress,
    markOnboardingComplete,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}