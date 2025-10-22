import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
  AppState,
} from 'react-native'
import CountryFlag from 'react-native-country-flag'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { NotebookWithStats } from '@/lib/types/goldlist'
import { supabase } from '@/lib/supabase/client'
// Removed unused badge imports
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { SharedHeader } from '@/components/shared-header'
import { DevTimeDisplay } from '@/components/DevTimeDisplay'
import { LoadingIndicator } from '@/components/LoadingIndicator'
import { getCountryCodeFromLanguage } from '@/lib/utils/flagUtils'
import { useRouteProtection } from '@/lib/hooks/useRouteProtection'


export default function HomeScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { appState, refreshNotebooks, updateNotebookLastUsed, addEventListener, emitEvent } = useApp()
  const { colors, isDark } = useTheme()
  const { registerDayChangeCallback, currentSimulatedDay, getCurrentDate } = useDevTime()
  const { subscription, showPaywallModal } = useSubscription()
  const { protectedNavigateToAddWords } = useRouteProtection()
  const [refreshing, setRefreshing] = useState(false)
  const screenWidth = Dimensions.get('window').width
  const [currentCarouselPage, setCurrentCarouselPage] = useState(0)
  const [weekData, setWeekData] = useState([
    { day: 'Mon', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Tue', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Wed', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Thu', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Fri', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Sat', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Sun', wordsAdded: 0, wordsRemembered: 0, completed: false },
  ])
  // Throttling and loading guards - use refs to avoid dependency issues
  const isLoadingProgressRef = useRef(false)
  const lastProgressLoadTimeRef = useRef(0)
  
  // App state tracking for open app detection
  const appStateRef = useRef(AppState.currentState)
  
  // Per-notebook progress tracking instead of global
  const [notebookProgressMap, setNotebookProgressMap] = useState<Map<string, {
    wordsAdded: number
    goal: number
    completed: boolean
  }>>(new Map())
  
  // Legacy global progress - will be derived from individual notebooks
  const [todayProgress, setTodayProgress] = useState({
    wordsAdded: 0,
    goal: 20,
    completed: false
  })
  const insets = useSafeAreaInsets()

  useEffect(() => {
    refreshNotebooks()
  }, [])

  // Reset carousel page when notebooks change
  useEffect(() => {
    setCurrentCarouselPage(0)
  }, [appState.notebooks.length])

  // Load progress data when profile becomes available
  useEffect(() => {
    if (profile) {
      loadProgressData()
      // Initialize button state from database when profile loads
      updateButtonState('DAY_INIT')
    }
  }, [profile, updateButtonState]) // Only reload when profile changes

  // Check if paywall should be shown on app launch
  useEffect(() => {
    if (profile && subscription) {
      // Show paywall if user has never started trial and is not subscribed
      const shouldShowPaywall = !subscription.isActive && 
                                !subscription.isInTrial && 
                                !subscription.trialStartedAt &&
                                subscription.tier === 'free'
      
      if (shouldShowPaywall) {
        // Small delay to ensure UI is ready
        // Only show if not during state updates (prevents race conditions)
        setTimeout(() => {
          // Check if we're still in pre-trial state (avoid showing during transitions)
          if (!subscription.isActive && !subscription.isInTrial && subscription.tier === 'free') {
            console.log('📱 Index page: Showing paywall for pre-trial user')
            showPaywallModal()
          } else {
            console.log('📱 Index page: Subscription state changed, skipping paywall')
          }
        }, 1000)
      }
    }
  }, [profile, subscription, showPaywallModal])

  // Better change detection: use notebook data fingerprint instead of just IDs
  const notebookFingerprint = useMemo(() => {
    // Create a fingerprint that includes meaningful data that would affect progress loading
    // IMPORTANT: Exclude updated_at to prevent reordering from triggering unnecessary reloads
    const fingerprint = appState.notebooks.map(notebook => ({
      id: notebook.id,
      words_per_day: notebook.words_per_day,
      // Include words count for meaningful changes (when words are actually added)
      words_count: notebook.words_count || 0,
      // Only include created_at to detect truly new notebooks
      created_at: notebook.created_at
    })).sort((a, b) => a.id.localeCompare(b.id))
    
    return JSON.stringify(fingerprint)
  }, [appState.notebooks])

  // DISABLED: Notebook fingerprint loading replaced by event-driven system
  // Only load progress on specific events (DAY_INIT, MANUAL_REFRESH, etc.)
  // useEffect(() => {
  //   if (profile && appState.notebooks.length > 0) {
  //     if (__DEV__) console.log('📚 Notebooks ACTUALLY changed - loading progress for', appState.notebooks.length, 'notebooks')
  //     loadNotebookProgress()
  //   }
  // }, [profile, notebookFingerprint, loadNotebookProgress])

  const loadProgressData = async () => {
    // Only load progress data if user is authenticated
    if (!profile) {
      return
    }
    
    try {
      const [weekly, today] = await Promise.all([
        supabaseService.getWeeklyProgress(),
        supabaseService.getTodayProgress()
      ])
      
      setWeekData(weekly)
      setTodayProgress(today)
      
      // Per-notebook progress now handled by event-driven system
      // loadNotebookProgress is called through updateButtonState events
    } catch (error) {
      console.error('Error loading progress data:', error)
    }
  }

  // Comprehensive refresh function for after actions (adding words, completing reviews)
  const refreshHomeData = async () => {
    if (!profile) return
    
    try {
      // Refresh all data sources
      await Promise.all([
        loadProgressData(), // Weekly progress and today's progress
        loadNotebookProgress(appState.notebooks), // Per-notebook progress
      ])
      
      // Update word stats
      const [totalCount, masteredCount] = await Promise.all([
        supabaseService.getTotalWordsCount(),
        supabaseService.getMasteredWordsCount()
      ])
      setRealWordStats({
        totalWords: totalCount,
        masteredWords: masteredCount
      })
      
      // Refresh review availability
      await checkAllNotebookReviews()
    } catch (error) {
      console.error('❌ Error refreshing home data:', error)
    }
  }

  // AppState listener for app open detection
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      // Only refresh when app comes from background to foreground
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (__DEV__) console.log('📱 App opened from background, emitting app opened event')
        emitEvent('appOpened', {})
      }
      appStateRef.current = nextAppState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription?.remove()
  }, [])

  // Load progress for each notebook independently - PARALLEL LOADING for performance
  const loadNotebookProgress = useCallback(async (notebooks?: NotebookWithStats[]) => {
    // Use passed notebooks or current state, but don't depend on appState.notebooks in useCallback
    const notebooksToLoad = notebooks || appState.notebooks
    
    if (notebooksToLoad.length === 0) {
      setNotebookProgressMap(new Map())
      return
    }

    // THROTTLING: Prevent rapid successive calls
    const now = Date.now()
    const timeSinceLastLoad = now - lastProgressLoadTimeRef.current
    const THROTTLE_MS = 1000 // Only allow one call per second
    
    if (isLoadingProgressRef.current) {
      if (__DEV__) console.log('⏸️ Progress loading already in progress, skipping duplicate call')
      return
    }
    
    if (timeSinceLastLoad < THROTTLE_MS) {
      if (__DEV__) console.log(`⏳ Progress loading throttled, last call was ${timeSinceLastLoad}ms ago`)
      return
    }

    isLoadingProgressRef.current = true
    lastProgressLoadTimeRef.current = now
    
    try {
      // Reduce log spam - only show every 5th call or important calls
      const shouldLog = timeSinceLastLoad > 5000 || notebooksToLoad.length !== 2
      if (shouldLog && __DEV__) {
        console.log(`🚀 Loading progress for ${notebooksToLoad.length} notebooks in parallel...`)
      }
      const startTime = Date.now()
      
      const progressMap = new Map<string, { wordsAdded: number; goal: number; completed: boolean }>()
      
      // PERFORMANCE FIX: Load all notebooks in parallel instead of serially
      const progressPromises = notebooksToLoad.map(async (notebook) => {
      try {
        // Get today's page for this notebook
        const todaysPage = await supabaseService.getTodaysPage(notebook.id)
        
        if (todaysPage) {
          // Count words added to today's page
          const wordsAddedToday = todaysPage.words?.length || 0
          const goal = notebook.words_per_day || 20
          const completed = wordsAddedToday >= goal
          
          return {
            notebookId: notebook.id,
            progress: { wordsAdded: wordsAddedToday, goal, completed }
          }
        } else {
          // No page available today (shouldn't happen in normal usage)
          return {
            notebookId: notebook.id,
            progress: { wordsAdded: 0, goal: notebook.words_per_day || 20, completed: false }
          }
        }
      } catch (error) {
        console.error(`Error loading progress for notebook ${notebook.id.slice(0, 8)}:`, error)
        return {
          notebookId: notebook.id,
          progress: { wordsAdded: 0, goal: notebook.words_per_day || 20, completed: false }
        }
      }
    })
    
    // Wait for all progress loads to complete
    const results = await Promise.all(progressPromises)
    
    // Build the progress map from results, but preserve recent local updates
    results.forEach(({ notebookId, progress }) => {
      progressMap.set(notebookId, progress)
    })
    
      const loadTime = Date.now() - startTime
      if (shouldLog && __DEV__) {
        console.log(`✅ Parallel progress loading completed in ${loadTime}ms for ${notebooksToLoad.length} notebooks`)
      }
      
      // Simple database load - no complex protection needed with event-driven system
      setNotebookProgressMap(progressMap)
    } catch (error) {
      console.error('Error loading notebook progress:', error)
    } finally {
      isLoadingProgressRef.current = false // Always reset loading guard
    }
  }, [])

  // Immediate state update functions - no database refetching needed
  
  // Single event-driven state manager for button state
  const updateButtonState = useCallback((event: 'DAY_INIT' | 'WORDS_ADDED' | 'MANUAL_REFRESH' | 'DAY_ADVANCE', data?: any) => {
    if (__DEV__) console.log(`🎯 Button State Event: ${event}`, data)
    
    switch (event) {
      case 'DAY_INIT':
        // Load initial state from database on app start or day change
        loadNotebookProgress(data?.notebooks || appState.notebooks)
        break;
        
      case 'WORDS_ADDED':
        // Update local state immediately when words are added
        const { notebookId, wordsAdded } = data
        setNotebookProgressMap(prev => {
          const newMap = new Map(prev)
          const notebook = appState.notebooks.find(n => n.id === notebookId)
          const goal = notebook?.words_per_day || 20
          const currentProgress = newMap.get(notebookId) || { wordsAdded: 0, goal, completed: false }
          const newWordsCount = currentProgress.wordsAdded + wordsAdded
          const newProgress = {
            wordsAdded: newWordsCount,
            goal,
            completed: newWordsCount >= goal
          }
          newMap.set(notebookId, newProgress)
          if (__DEV__) console.log(`🎯 Local state updated: ${currentProgress.wordsAdded} → ${newWordsCount}/${goal}, completed: ${newProgress.completed}`)
          return newMap
        })
        break;
        
      case 'MANUAL_REFRESH':
        // Reload from database on manual refresh
        loadNotebookProgress(appState.notebooks)
        break;
        
      case 'DAY_ADVANCE':
        // Reset state for new day
        setNotebookProgressMap(new Map())
        loadNotebookProgress(appState.notebooks)
        break;
    }
  }, [appState.notebooks])
  
  // Called directly when words are added to a notebook
  const onWordsAdded = useCallback((notebookId: string, wordsAdded: number) => {
    updateButtonState('WORDS_ADDED', { notebookId, wordsAdded })
  }, [updateButtonState])

  // Called directly when review session is completed
  const onReviewsCompleted = useCallback(() => {
    // Update review status immediately
    checkAllNotebookReviews()
  }, [])

  // Event listeners for data changes (replaces global function exposure)
  useEffect(() => {
    const handleWordsAdded = (data: { notebookId: string; wordCount: number }) => {
      onWordsAdded(data.notebookId, data.wordCount)
    }

    const handleReviewsCompleted = () => {
      onReviewsCompleted()
    }

    // Set up event listeners
    const cleanupWords = addEventListener('wordsAdded', handleWordsAdded)
    const cleanupReviews = addEventListener('reviewsCompleted', handleReviewsCompleted)

    return () => {
      cleanupWords()
      cleanupReviews()
    }
  }, [addEventListener, onWordsAdded, onReviewsCompleted])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      refreshNotebooks(),
      loadProgressData(),
      checkReviewsOnce() // Check reviews on manual refresh
    ])
    // Refresh button state from database
    updateButtonState('MANUAL_REFRESH')
    setRefreshing(false)
  }

  const handleCreateNotebook = async () => {
    setIsCreateNotebookLoading(true)
    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      router.push('/modal/create-notebook')
    } finally {
      setIsCreateNotebookLoading(false)
    }
  }

  const handleNotebookPress = (notebook: NotebookWithStats) => {
    updateNotebookLastUsed(notebook.id)
    router.push(`/notebook/${notebook.id}`)
  }

  const handlePracticeButtonPress = async (route: string | null) => {
    if (!route) return
    
    // Extract notebook ID from route and update last used
    const notebookIdMatch = route.match(/\/notebook\/([^\/\?]+)/)
    if (notebookIdMatch) {
      updateNotebookLastUsed(notebookIdMatch[1])
    }
    
    setIsPracticeButtonLoading(true)
    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      router.push(route)
    } finally {
      setIsPracticeButtonLoading(false)
    }
  }

  const handleAddWordsPress = async (route: string) => {
    // Extract notebook ID from route and update last used
    const notebookIdMatch = route.match(/\/notebook\/([^\/\?]+)/)
    if (!notebookIdMatch) {
      console.error('Could not extract notebook ID from route:', route)
      return
    }
    
    const notebookId = notebookIdMatch[1]
    updateNotebookLastUsed(notebookId)
    
    setIsAddWordsButtonLoading(true)
    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Use protected navigation - will show paywall if user can't add words
      await protectedNavigateToAddWords(notebookId)
    } finally {
      setIsAddWordsButtonLoading(false)
    }
  }

  // Removed unused handleBadgePress function

  const handleResetData = async () => {
    try {
      // await supabaseService.resetUserData() // Method doesn't exist
      await refreshNotebooks()
      await loadProgressData()
    } catch (error) {
      console.error('Error resetting data:', error)
    }
  }

  // Per-notebook review state - more accurate than global detection
  const [notebookReviews, setNotebookReviews] = useState<Map<string, { hasReviews: boolean; pageNumber?: number }>>(new Map())
  
  // Legacy global review state - kept for backward compatibility during transition
  const [hasReviewsToday, setHasReviewsToday] = useState(false)
  const [, setReviewNotebookId] = useState<string | undefined>()
  const [, setReviewPageNumber] = useState<number | undefined>()
  
  // Loading states for async operations
  const [isPracticeButtonLoading, setIsPracticeButtonLoading] = useState(false)
  const [isAddWordsButtonLoading, setIsAddWordsButtonLoading] = useState(false)
  const [isCreateNotebookLoading, setIsCreateNotebookLoading] = useState(false)

  // Check reviews for all notebooks - PARALLEL CHECKING for performance
  const checkAllNotebookReviews = async () => {
    if (!profile || appState.notebooks.length === 0) {
      setNotebookReviews(new Map())
      setHasReviewsToday(false)
      return
    }
    
    try {
      console.log(`🔄 Checking reviews for ${appState.notebooks.length} notebooks using batch query...`)
      const startTime = Date.now()
      
      // PERFORMANCE: Use single batched query instead of N individual queries
      const notebookIds = appState.notebooks.map(n => n.id)
      const reviewMap = await supabaseService.hasWordsForReviewTodayBatch(notebookIds)
      
      // Convert Map to array format for backward compatibility
      const results = Array.from(reviewMap.entries()).map(([notebookId, data]) => ({
        notebookId,
        hasReviews: data.hasReviews,
        pageNumber: data.pageNumber
      }))
      
      const loadTime = Date.now() - startTime
      console.log(`✅ Batch review checking completed in ${loadTime}ms for ${appState.notebooks.length} notebooks`)
      
      setNotebookReviews(reviewMap)
      
      // Update legacy global state for backward compatibility
      const hasAnyReviews = results.some(r => r.hasReviews)
      const firstReviewNotebook = results.find(r => r.hasReviews)
      
      setHasReviewsToday(hasAnyReviews)
      setReviewNotebookId(firstReviewNotebook?.notebookId)
      setReviewPageNumber(firstReviewNotebook?.pageNumber)
      
      console.log(`📅 FINAL Review results:`, results.map(r => `${r.notebookId.slice(0, 8)}: ${r.hasReviews}`).join(', '))
      console.log(`🎯 Global hasReviews: ${hasAnyReviews}, First review notebook: ${firstReviewNotebook?.notebookId?.slice(0, 8)}`)
    } catch (error) {
      console.error('Error checking notebook reviews:', error)
      setNotebookReviews(new Map())
      setHasReviewsToday(false)
    }
  }

  // Legacy function - now delegates to the improved multi-notebook version
  const checkReviewsOnce = async () => {
    await checkAllNotebookReviews()
  }

  // PERFORMANCE FIX: Removed per-notebook review checking function
  // This was causing hundreds of database calls and severe performance issues

  // Track if we've already checked reviews to prevent multiple checks
  const [hasCheckedReviews, setHasCheckedReviews] = useState(false)
  const [lastCheckedUserId, setLastCheckedUserId] = useState<string | null>(null)

  // Only check on app launch when user is authenticated (once per user)
  useEffect(() => {
    const currentUserId = profile?.id
    console.log('📋 Profile useEffect triggered, profile:', profile ? 'present' : 'null', 'already checked:', hasCheckedReviews, 'user changed:', lastCheckedUserId !== currentUserId)
    
    if (currentUserId && (lastCheckedUserId !== currentUserId || !hasCheckedReviews)) {
      checkReviewsOnce()
      setHasCheckedReviews(true)
      setLastCheckedUserId(currentUserId)
    } else if (!currentUserId) {
      // Reset when user logs out
      setHasCheckedReviews(false)
      setLastCheckedUserId(null)
      setHasReviewsToday(false)
    }
  }, [profile?.id]) // Only depend on user ID, not the whole profile object

  // Register callback for day changes
  useEffect(() => {
    const unregister = registerDayChangeCallback(() => {
      console.log('📅 Day changed - checking for reviews and resetting progress')
      checkReviewsOnce()
      // Reset all notebook progress for the new day
      updateButtonState('DAY_ADVANCE')
    })

    return unregister // Cleanup callback when component unmounts
  }, [checkReviewsOnce, updateButtonState])
  
  // Smart focus-based updates: Load progress when needed
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false)
  const lastFocusTime = useRef(0)
  
  // Event listeners for focus-based refresh (replaces window global checks)
  useEffect(() => {
    const handleDataChange = () => {
      if (__DEV__) console.log('📱 Home refresh triggered by dataChanged event')
      refreshHomeData()
    }

    const handleAppOpened = () => {
      if (__DEV__) console.log('📱 Home refresh triggered by appOpened event')
      refreshHomeData()
    }

    // Set up event listeners
    const cleanupData = addEventListener('dataChanged', handleDataChange)
    const cleanupApp = addEventListener('appOpened', handleAppOpened)

    return () => {
      cleanupData()
      cleanupApp()
    }
  }, [addEventListener, refreshHomeData])

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      const timeSinceLastFocus = now - lastFocusTime.current
      
      if (profile) {
        // Initial load
        if (!hasLoadedProgress) {
          if (__DEV__) console.log('📱 Initial focus - loading progress')
          updateButtonState('DAY_INIT', { notebooks: appState.notebooks })
          setHasLoadedProgress(true)
        }
        // No automatic refresh on navigation - use event-driven updates only
        else if (timeSinceLastFocus > 1000) {
          if (__DEV__) console.log('📱 Returning to homepage - using existing local state (event-driven)')
        }
      }
      
      lastFocusTime.current = now
    }, [profile, hasLoadedProgress, updateButtonState])
  )

  // Event-driven updates - no more polling!
  // Progress and review updates will be triggered directly by actions


  const getNotebookStatus = (notebook: NotebookWithStats) => {
    if (appState.notebooks.length === 0) return { type: 'no_notebook', text: 'Create Your First Notebook' }
    
    // Priority 0: Day 201+ Celebration (highest priority)
    const notebookCreated = new Date(notebook.created_at)
    const today = getCurrentDate()
    const daysSinceCreation = Math.floor(
      (today.getTime() - notebookCreated.getTime()) / (24 * 60 * 60 * 1000)
    ) + 1

    if (daysSinceCreation > 200) {
      return { 
        type: 'celebration', 
        text: '🎉 200 Days Complete!', 
        route: `/celebration/${notebook.id}` 
      }
    }
    
    // Get progress for THIS specific notebook
    const notebookProgress = notebookProgressMap.get(notebook.id) || { wordsAdded: 0, goal: notebook.words_per_day || 20, completed: false }
    
    if (__DEV__) {
      console.log(`🎯 Button state check for ${notebook.title}: ${notebookProgress.wordsAdded}/${notebookProgress.goal}, completed: ${notebookProgress.completed}`)
    }
    
    // Check per-notebook review status
    const notebookReviewData = notebookReviews.get(notebook.id)
    
    // Priority 1: Reviews available (per-notebook detection)
    if (notebookReviewData?.hasReviews) {
      return { 
        type: 'review', 
        text: 'Review Today\'s Words', 
        route: `/notebook/${notebook.id}/review${notebookReviewData.pageNumber ? `?page=${notebookReviewData.pageNumber}` : ''}` 
      }
    }
    
    // Priority 2: Words to add today (check THIS notebook's completion status)
    if (!notebookProgress.completed) {
      // Calculate current page number based on THIS notebook's timeline
      const notebookCreated = new Date(notebook.created_at)
      const today = getCurrentDate()
      const daysSinceCreation = Math.floor(
        (today.getTime() - notebookCreated.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1
      
      return { 
        type: 'add_words', 
        text: 'Add Today\'s Words', 
        route: `/notebook/${notebook.id}?focusPage=${daysSinceCreation}&openBubble=true`
      }
    }
    
    return { 
      type: 'done', 
      text: 'You\'re All Done Today! 🎉', 
      route: null
    }
  }

  // Removed unused getPendingReviews function


  const getTotalWordsThisWeek = () => {
    return weekData.reduce((total, day) => total + day.wordsAdded, 0)
  }

  // Helper function to categorize notebooks by level
  const categorizeNotebooks = () => {
    const bronze = appState.notebooks.filter(n => !n.notebook_level || n.notebook_level === 'bronze')
    // Silver and Gold are now handled as badges, not notebooks
    return { bronze }
  }
  
  // Per-notebook badge state - stores badges for each notebook separately
  const [notebookBadgesMap, setNotebookBadgesMap] = useState<Map<string, {
    id: string
    badgeType: 'silver' | 'gold'
    totalWords: number
    reviewableWords: number
    bronzeNotebookTitle: string
  }[]>>(new Map())

  // Per-notebook stats state - stores real total and mastered words for each notebook
  const [notebookStatsMap, setNotebookStatsMap] = useState<Map<string, {
    totalWords: number
    masteredWords: number
  }>>(new Map())

  // Load badges for a specific notebook
  const loadNotebookBadges = async (notebookId: string) => {
    try {
      // Get all words from the notebook to check for Silver/Gold rounds
      const allWords = await supabaseService.getWordsForReview(notebookId)
      
      const badges = []
      
      // Check for Silver words (rounds 5-8)
      const silverWords = allWords.filter(word => (word as any).current_round >= 5 && (word as any).current_round <= 8)
      if (silverWords.length > 0) {
        badges.push({
          id: `silver-${notebookId}`,
          badgeType: 'silver' as const,
          totalWords: silverWords.length,
          reviewableWords: silverWords.filter(word => (word as any).status === 'learning').length,
          bronzeNotebookTitle: 'Silver Rounds'
        })
      }
      
      // Check for Gold words (rounds 9-12)
      const goldWords = allWords.filter(word => (word as any).current_round >= 9 && (word as any).current_round <= 12)
      if (goldWords.length > 0) {
        badges.push({
          id: `gold-${notebookId}`,
          badgeType: 'gold' as const,
          totalWords: goldWords.length,
          reviewableWords: goldWords.filter(word => (word as any).status === 'learning').length,
          bronzeNotebookTitle: 'Gold Rounds'
        })
      }
      
      // Update the map with badges for this notebook
      setNotebookBadgesMap(prev => {
        const newMap = new Map(prev)
        newMap.set(notebookId, badges)
        return newMap
      })
      
    } catch (error) {
      console.error(`Error loading badges for notebook ${notebookId}:`, error)
      // Set empty badges for this notebook on error
      setNotebookBadgesMap(prev => {
        const newMap = new Map(prev)
        newMap.set(notebookId, [])
        return newMap
      })
    }
  }

  // Load real stats (total words and mastered words) for all notebooks
  const loadNotebookStats = useCallback(async (notebooks: NotebookWithStats[]) => {
    if (notebooks.length === 0) {
      setNotebookStatsMap(new Map())
      return
    }

    try {
      console.log(`📊 Loading stats for ${notebooks.length} notebooks in parallel...`)
      
      const statsPromises = notebooks.map(async (notebook) => {
        try {
          // Query total words and mastered words for this specific notebook in parallel
          const [totalWordsResult, masteredWordsResult] = await Promise.all([
            supabase
              .from('words')
              .select('id', { count: 'exact' })
              .eq('notebook_id', notebook.id),
            supabase
              .from('words')
              .select('id', { count: 'exact' })
              .eq('notebook_id', notebook.id)
              .eq('is_mastered', true)
          ])
          
          return {
            notebookId: notebook.id,
            stats: {
              totalWords: totalWordsResult.count || 0,
              masteredWords: masteredWordsResult.count || 0
            }
          }
        } catch (error) {
          console.error(`Error loading stats for notebook ${notebook.id}:`, error)
          return {
            notebookId: notebook.id,
            stats: {
              totalWords: 0,
              masteredWords: 0
            }
          }
        }
      })
      
      const results = await Promise.all(statsPromises)
      const statsMap = new Map()
      results.forEach(({ notebookId, stats }) => {
        statsMap.set(notebookId, stats)
      })
      setNotebookStatsMap(statsMap)
      
      console.log(`✅ Loaded stats for ${results.length} notebooks`)
    } catch (error) {
      console.error('Error loading notebook stats:', error)
    }
  }, [])

  // Load badges for ALL notebooks when notebooks change (with caching to prevent loops)
  const [lastBadgeLoadNotebookIds, setLastBadgeLoadNotebookIds] = useState<string>('')
  
  useEffect(() => {
    const loadAllNotebookBadges = async () => {
      if (appState.notebooks.length === 0) {
        setNotebookBadgesMap(new Map())
        setLastBadgeLoadNotebookIds('')
        return
      }
      
      // Create a stable string to compare notebook IDs
      const currentNotebookIds = appState.notebooks.map(n => n.id).sort().join(',')
      
      // Skip if we already loaded badges for this exact set of notebooks
      if (currentNotebookIds === lastBadgeLoadNotebookIds) {
        return
      }
      
      console.log(`🏅 Loading badges for ${appState.notebooks.length} notebooks...`)
      
      // Load badges for each notebook in parallel
      const badgePromises = appState.notebooks.map(notebook => 
        loadNotebookBadges(notebook.id)
      )
      
      await Promise.all(badgePromises)
      setLastBadgeLoadNotebookIds(currentNotebookIds)
      console.log('🏅 All notebook badges loaded')
    }
    
    loadAllNotebookBadges()
  }, [appState.notebooks, lastBadgeLoadNotebookIds])
  
  
  // DISABLED: Strategic trigger 1 - was causing performance issues
  // useFocusEffect(
  //   useCallback(() => {
  //     if (!hasCheckedThisSession && profile && appState.notebooks.length > 0) {
  //       console.log('📱 Home screen focused - checking reviews for session')
  //       checkAllNotebookReviews()
  //       setHasCheckedThisSession(true)
  //     }
  //   }, [hasCheckedThisSession, profile, appState.notebooks.length, checkAllNotebookReviews])
  // )
  
  // DISABLED: Strategic trigger 2 - was causing performance issues
  // useEffect(() => {
  //   const dayChangeCallback = () => {
  //     console.log('📅 Day changed - checking reviews')
  //     checkAllNotebookReviews()
  //   }
  //   
  //   registerDayChangeCallback(dayChangeCallback)
  // }, [registerDayChangeCallback, checkAllNotebookReviews])
  
  // DISABLED: Manual trigger - was causing performance issues
  const refreshReviewStatus = useCallback(() => {
    console.log('🚫 Manual review status refresh DISABLED for performance')
    // Disabled - was causing excessive database calls
    return
  }, [])
  
  // Removed unused bronzeNotebook variable

  // Handle carousel scroll to update page indicators
  const handleCarouselScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x
    const cardWidth = screenWidth - (SPACING.xl * 2)
    const currentPage = Math.round(scrollPosition / cardWidth)
    setCurrentCarouselPage(currentPage)
  }

  // Get overall status summary for all notebooks
  const getNotebooksStatus = () => {
    if (appState.notebooks.length === 0) {
      return { type: 'empty', message: 'No notebooks yet', count: 0 }
    }

    let reviewsNeeded = 0
    let wordsNeeded = 0
    let allDone = 0

    appState.notebooks.forEach(notebook => {
      const notebookReviewData = notebookReviews.get(notebook.id)
      const notebookProgress = notebookProgressMap.get(notebook.id) || { wordsAdded: 0, goal: notebook.words_per_day || 20, completed: false }
      
      if (notebookReviewData?.hasReviews) {
        reviewsNeeded++
      } else if (!notebookProgress.completed) {
        wordsNeeded++
      } else {
        allDone++
      }
    })

    if (reviewsNeeded > 0) {
      return {
        type: 'reviews',
        count: reviewsNeeded,
        text: `You have ${reviewsNeeded} notebook${reviewsNeeded > 1 ? 's' : ''} for Review`,
        priority: 'high'
      }
    } else if (wordsNeeded > 0) {
      return {
        type: 'words',
        count: wordsNeeded,
        text: `You have ${wordsNeeded} notebook${wordsNeeded > 1 ? 's' : ''} for Word Addition`,
        priority: 'medium'
      }
    } else {
      return {
        type: 'complete',
        count: allDone,
        text: 'All notebooks completed for today! 🎉',
        priority: 'low'
      }
    }
  }

  // Smart notebook sorting: Reviews first, then incomplete, then by last_used_at
  const sortNotebooksByPriority = (notebooks: NotebookWithStats[]) => {
    return [...notebooks].sort((a, b) => {
      const aReviews = notebookReviews.get(a.id)?.hasReviews || false
      const bReviews = notebookReviews.get(b.id)?.hasReviews || false
      const aProgress = notebookProgressMap.get(a.id) || { wordsAdded: 0, goal: a.words_per_day || 20, completed: false }
      const bProgress = notebookProgressMap.get(b.id) || { wordsAdded: 0, goal: b.words_per_day || 20, completed: false }

      // Priority 1: Reviews needed (highest priority)
      if (aReviews && !bReviews) return -1
      if (!aReviews && bReviews) return 1

      // Priority 2: If both or neither have reviews, check word completion
      if (!aProgress.completed && bProgress.completed) return -1
      if (aProgress.completed && !bProgress.completed) return 1

      // Priority 3: Both have same status, sort by last_used_at (most recent first)
      const aLastUsed = new Date(a.last_used_at || a.created_at).getTime()
      const bLastUsed = new Date(b.last_used_at || b.created_at).getTime()
      return bLastUsed - aLastUsed
    })
  }

  // Render status bar showing notebook summary
  const renderStatusBar = () => {
    if (appState.notebooks.length === 0) {
      return null
    }

    const status = getNotebooksStatus()
    
    return (
      <View style={[
        styles.statusBar,
        status.priority === 'high' && styles.statusBarReviews,
        status.priority === 'medium' && styles.statusBarWords,
        status.priority === 'low' && styles.statusBarComplete,
      ]}>
        <View style={styles.statusContent}>
          {/* Icon and count badge */}
          <View style={styles.statusLeft}>
            <Text style={styles.statusIcon}>
              {status.priority === 'high' ? '📚' : 
               status.priority === 'medium' ? '✏️' : '✅'}
            </Text>
            {status.type !== 'complete' && (
              <View style={[
                styles.countBadge,
                status.priority === 'high' && styles.countBadgeReviews,
                status.priority === 'medium' && styles.countBadgeWords,
              ]}>
                <Text style={styles.countBadgeText}>{status.count}</Text>
              </View>
            )}
          </View>
          
          {/* Clean message text */}
          <View style={styles.statusRight}>
            <Text style={styles.statusMainText}>
              {status.type === 'reviews' && `Notebook${status.count > 1 ? 's' : ''} ready for Review`}
              {status.type === 'words' && `Notebook${status.count > 1 ? 's' : ''} ready for Word Addition`}
              {status.type === 'complete' && 'All notebooks completed for today! 🎉'}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  // Component to render notebook carousel with horizontal scrolling
  const renderNotebookCarousel = () => {
    if (appState.notebooks.length === 0) {
      return null // Empty state will be shown below
    }

    // Smart sorting: Reviews first, then incomplete, then by last activity
    const sortedNotebooks = sortNotebooksByPriority(appState.notebooks)

    return (
      <View style={styles.carouselContainer}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={screenWidth - (SPACING.xl * 2)}
          snapToAlignment="center"
          contentContainerStyle={styles.carouselContent}
          onScroll={handleCarouselScroll}
          scrollEventThrottle={16}
        >
          {sortedNotebooks.map((notebook, index) => (
            <View key={notebook.id} style={[styles.carouselCard, { width: screenWidth - (SPACING.xl * 2) }]}>
              {renderNotebookCard(notebook, index)}
            </View>
          ))}
        </ScrollView>
        
        {/* Page indicators */}
        {sortedNotebooks.length > 1 && (
          <View style={styles.pageIndicators}>
            {sortedNotebooks.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pageIndicator,
                  { backgroundColor: index === currentCarouselPage ? colors.primary : colors.gray300 }
                ]}
              />
            ))}
          </View>
        )}
      </View>
    )
  }

  // Component to render individual notebook card (works for any notebook)
  const renderNotebookCard = (notebook: NotebookWithStats, index: number) => {
    // Get badges for this specific notebook
    const notebookBadges = notebookBadgesMap.get(notebook.id) || []
    const silverBadge = notebookBadges.find(badge => badge.badgeType === 'silver')
    const goldBadge = notebookBadges.find(badge => badge.badgeType === 'gold')
    
    // Calculate badge states
    const bronzeWords = stats.totalWords - (silverBadge?.totalWords || 0) - (goldBadge?.totalWords || 0)
    const isSilverUnlocked = silverBadge && silverBadge.totalWords > 0
    const isGoldUnlocked = goldBadge && goldBadge.totalWords > 0

    return (
      <View style={styles.mainNotebookCard}>
        <TouchableOpacity 
          onPress={() => handleNotebookPress(notebook)}
          style={styles.notebookCardContent}
        >
          {/* NEW DESIGN: Top row with badges left-aligned and flag right-aligned */}
          <View style={styles.topRow}>
            {/* Badges - Left aligned */}
            <View style={styles.badgeRowLeft}>
              {/* Bronze Badge - Always unlocked */}
              <View style={styles.badgeContainer}>
                <View style={[styles.badgeCircle, styles.bronzeBadge]}>
                  <Text style={styles.badgeNumber}>{bronzeWords}</Text>
                </View>
              </View>
              
              {/* Silver Badge - Locked/Unlocked */}
              <View style={styles.badgeContainer}>
                <View style={[styles.badgeCircle, isSilverUnlocked ? styles.silverBadge : styles.silverBadgeLocked]}>
                  {isSilverUnlocked ? (
                    <Text style={styles.badgeNumber}>{silverBadge?.totalWords || 0}</Text>
                  ) : (
                    <MaterialIcons name="lock" size={20} color={colors.cardBackground} />
                  )}
                </View>
              </View>
              
              {/* Gold Badge - Locked/Unlocked */}
              <View style={styles.badgeContainer}>
                <View style={[styles.badgeCircle, isGoldUnlocked ? styles.goldBadge : styles.goldBadgeLocked]}>
                  {isGoldUnlocked ? (
                    <Text style={styles.badgeNumber}>{goldBadge?.totalWords || 0}</Text>
                  ) : (
                    <MaterialIcons name="lock" size={20} color={colors.cardBackground} />
                  )}
                </View>
              </View>
            </View>

            {/* Flag - Right aligned */}
            <CountryFlag 
              isoCode={getCountryCodeFromLanguage(notebook.language_code)} 
              size={40} 
              style={styles.notebookFlagTopRight}
            />
          </View>

          {/* NEW DESIGN: Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.notebookTitle} numberOfLines={1}>{notebook.title}</Text>
          </View>

          {/* NEW DESIGN: Stats Row */}
          <View style={styles.statsRow}>
            <Text style={styles.totalWords}>
              {(() => {
                const stats = notebookStatsMap.get(notebook.id)
                return stats 
                  ? `${stats.totalWords} total • ${stats.masteredWords} mastered`
                  : '0 total • 0 mastered'
              })()}
            </Text>
          </View>

          {/* NEW DESIGN: Button at bottom, center-aligned */}
          {(() => {
            const notebookStatus = getNotebookStatus(notebook)
            return (
              <TouchableOpacity 
                style={[
                  styles.practiceButton,
                  // Color states based on button type
                  notebookStatus.type === 'review' && styles.practiceButtonReview,
                  notebookStatus.type === 'add_words' && styles.practiceButtonAddWords,
                  notebookStatus.type === 'done' && styles.practiceButtonDone,
                  notebookStatus.type === 'celebration' && styles.practiceButtonCelebration,
                  notebookStatus.type === 'info' && styles.practiceButtonInfo,
                ]}
                onPress={() => handlePracticeButtonPress(notebookStatus.route)}
                disabled={!notebookStatus.route || isPracticeButtonLoading}
              >
                {isPracticeButtonLoading ? (
                  <LoadingIndicator size={20} color={colors.cardBackground} />
                ) : (
                  <>
                    <Text style={[
                      styles.practiceButtonText,
                      notebookStatus.type === 'done' && styles.practiceButtonTextDone,
                      notebookStatus.type === 'info' && styles.practiceButtonTextInfo
                    ]}>
                      {notebookStatus.text}
                    </Text>
                    {notebookStatus.type === 'review' && notebook.pendingReviews > 0 && (
                      <View style={styles.reviewBadge}>
                        <Text style={styles.reviewBadgeText}>{notebook.pendingReviews}</Text>
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            )
          })()}
        </TouchableOpacity>
      </View>
    )
  }


  // Get real user stats from database
  const [realWordStats, setRealWordStats] = useState({
    totalWords: 0,
    masteredWords: 0
  })

  // Load real word counts from database
  useEffect(() => {
    const loadWordStats = async () => {
      try {
        const [totalCount, masteredCount] = await Promise.all([
          supabaseService.getTotalWordsCount(),
          supabaseService.getMasteredWordsCount()
        ])
        setRealWordStats({
          totalWords: totalCount,
          masteredWords: masteredCount
        })
      } catch (error) {
        console.error('Error loading word stats:', error)
      }
    }
    
    if (profile) {
      loadWordStats()
    }
  }, [profile, appState.notebooks]) // Reload when notebooks change


  const getUserStats = () => {
    const streakDays = profile?.streak_count || 0
    const successRate = realWordStats.totalWords > 0 ? Math.round((realWordStats.masteredWords / realWordStats.totalWords) * 100) : 0
    
    return {
      totalWords: realWordStats.totalWords,
      masteredWords: realWordStats.masteredWords,
      streakDays,
      successRate,
      pendingReviews: hasReviewsToday ? 1 : 0
    }
  }

  const stats = getUserStats()

  // Reload badges when stats or today progress change (after reviews)
  useEffect(() => {
    const { bronze } = categorizeNotebooks()
    if (bronze.length > 0) {
      loadNotebookBadges(bronze[0].id)
    }
  }, [stats.totalWords, stats.masteredWords])

  // Load stats for all notebooks when notebooks change
  useEffect(() => {
    if (appState.notebooks.length > 0) {
      loadNotebookStats(appState.notebooks)
    } else {
      setNotebookStatsMap(new Map())
    }
  }, [appState.notebooks, loadNotebookStats])

  // Trial Countdown Component
  const renderTrialCountdown = () => {
    // Only show during trial period
    if (!subscription.isInTrial) {
      return null
    }

    const daysLeft = subscription.trialDaysRemaining
    const isLastDays = daysLeft <= 3

    return (
      <View style={[styles.trialBanner, isLastDays && styles.trialBannerUrgent]}>
        <View style={styles.trialContent}>
          <Text style={styles.trialTitle}>
            🎉 Free Trial Active
          </Text>
          <Text style={styles.trialSubtitle}>
            {daysLeft === 1 
              ? 'Last day of full access' 
              : `${daysLeft} days of full access remaining`}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.upgradeButton}
          onPress={() => showPaywallModal()}
        >
          <Text style={styles.upgradeButtonText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Daily Progress Widget Component
  const renderDailyProgressWidget = () => {
    // Use real weekly data instead of dummy data
    const dailyProgressData = weekData.map(day => ({
      day: day.day,
      added: day.wordsAdded, // Map from API format to widget format
      completed: day.completed
    }))

    return (
      <View style={styles.dailyProgressWidget}>
        <Text style={styles.dailyProgressTitle}>This Week's Progress</Text>
        <View style={styles.dailyProgressContainer}>
          {dailyProgressData.map((day, index) => (
            <View key={index} style={styles.dailyProgressItem}>
              <Text style={styles.dailyProgressDay}>{day.day}</Text>
              <View style={[
                styles.dailyProgressIndicator,
                { 
                  backgroundColor: day.completed ? colors.primary : colors.gray200,
                  borderWidth: 1,
                  borderColor: colors.border
                }
              ]}>
                <Text style={[
                  styles.dailyProgressValue,
                  { color: day.completed ? colors.cardBackground : colors.textSecondary }
                ]}>
                  {day.added}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  const styles = createStyles(colors, isDark)

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <SharedHeader 
          title="Gold List" 
        />
        
        {/* Trial Countdown Banner */}
        {renderTrialCountdown()}
        
        {/* Daily Progress Widget */}
        {renderDailyProgressWidget()}
        
        {/* Development Reset Button */}
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={handleResetData}
        >
          <Text style={styles.resetButtonText}>🔄 Reset All Data (Dev Only)</Text>
        </TouchableOpacity>

        {/* Development Time Simulation */}
        <DevTimeDisplay />

        {/* Status Bar */}
        {renderStatusBar()}

        {/* Notebook Carousel or Empty State */}
        {appState.notebooks.length > 0 ? (
          renderNotebookCarousel()
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📚</Text>
            <Text style={styles.emptyStateTitle}>Welcome to Gold List!</Text>
            <Text style={styles.emptyStateSubtitle}>
              Create your first vocabulary notebook to start learning with the scientifically-proven Gold List Method.
            </Text>
            <TouchableOpacity 
              style={styles.createFirstNotebookButton}
              onPress={handleCreateNotebook}
              disabled={isCreateNotebookLoading}
            >
              {isCreateNotebookLoading ? (
                <LoadingIndicator size={16} color={colors.cardBackground} />
              ) : (
                <Text style={styles.createFirstNotebookText}>Create Your First Notebook</Text>
              )}
            </TouchableOpacity>
          </View>
        )}



        {/* Quick Stats - Only show if user has notebooks */}
        {appState.notebooks.length > 0 && (
        <View style={styles.quickStats}>
          <View style={styles.statRow}>
            <View style={styles.quickStatCard}>
              <View style={styles.quickStatIconContainer}>
                <Text style={styles.quickStatIcon}>🔥</Text>
              </View>
              <View>
                <Text style={styles.quickStatValue}>{stats.streakDays}</Text>
                <Text style={styles.quickStatLabel}>Day Streak</Text>
              </View>
            </View>
            
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatIcon}>⭐</Text>
              <View>
                <Text style={styles.quickStatValue}>{stats.masteredWords}</Text>
                <Text style={styles.quickStatLabel}>Words Learned</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statRow}>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatIcon}>📊</Text>
              <View>
                <Text style={styles.quickStatValue}>{stats.successRate}%</Text>
                <Text style={styles.quickStatLabel}>Success Rate</Text>
              </View>
            </View>
            
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatIcon}>⏰</Text>
              <View>
                <Text style={styles.quickStatValue}>{stats.pendingReviews}</Text>
                <Text style={styles.quickStatLabel}>Reviews Due</Text>
              </View>
            </View>
          </View>
        </View>
        )}

        {/* Add button spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: 60 + Math.max(insets.bottom, 8) + 20 }]} 
        onPress={handleCreateNotebook}
        disabled={isCreateNotebookLoading}
      >
        {isCreateNotebookLoading ? (
          <LoadingIndicator size={20} color={colors.cardBackground} />
        ) : (
          <Text style={styles.fabIcon}>+</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  mainNotebookCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    // Duolingo-style gamified design with theme-aware borders
    borderWidth: 3,
    borderColor: colors.border,
    borderBottomWidth: 6,
    borderBottomColor: colors.gray300 || colors.border,
    ...SHADOWS.lg,
    shadowColor: colors.shadow || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  // NEW DESIGN: Top row with badges and flag
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  badgeRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  badgeContainer: {
    alignItems: 'center',
  },
  badgeCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderBottomWidth: 3,
  },
  bronzeBadge: {
    backgroundColor: '#CD7F32',
    borderColor: '#B8722C',
    borderBottomColor: '#A0651F',
  },
  silverBadge: {
    backgroundColor: '#C0C0C0',
    borderColor: '#A8A8A8',
    borderBottomColor: '#909090',
  },
  goldBadge: {
    backgroundColor: '#FFD700',
    borderColor: '#E6C200',
    borderBottomColor: '#CCAD00',
  },
  silverBadgeLocked: {
    backgroundColor: '#8A8A8A',
    borderColor: '#707070',
    borderBottomColor: '#585858',
  },
  goldBadgeLocked: {
    backgroundColor: '#B8A000',
    borderColor: '#9E8800',
    borderBottomColor: '#857000',
  },
  badgeText: {
    fontSize: 16,
  },
  badgeNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.cardBackground,
    textAlign: 'center',
  },
  // NEW DESIGN: Flag at top right
  notebookFlagTopRight: {
    borderRadius: 4,
  },
  // NEW DESIGN: Title row
  titleRow: {
    marginBottom: SPACING.md,
  },
  // NEW DESIGN: Stats row  
  statsRow: {
    marginBottom: SPACING.lg,
    alignItems: 'flex-start',
  },
  notebookHeader: {
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
  },
  languageFlags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  flagFrom: {
    fontSize: TYPOGRAPHY.xl,
  },
  flagArrow: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  flagTo: {
    fontSize: TYPOGRAPHY.xl,
  },
  notebookTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
  },
  notebookSubtitle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    marginBottom: SPACING.lg,
  },
  notebookStats: {
    marginBottom: SPACING.xl,
  },
  totalWords: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  practiceButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    // Duolingo-style 3D effect
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#2563EB',
    borderBottomColor: '#1E40AF',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  practiceButtonText: {
    color: colors.cardBackground,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
  },
  // New button color states with 3D borders
  practiceButtonReview: {
    backgroundColor: '#E53E3E', // Red for review
    borderColor: '#C53030',
    borderBottomColor: '#9B2C2C',
    shadowColor: '#E53E3E',
  },
  practiceButtonAddWords: {
    backgroundColor: colors.warning, // Yellow for add words  
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
  },
  practiceButtonDone: {
    backgroundColor: '#38A169', // User's preferred green for done
    borderColor: '#2F855A',
    borderBottomColor: '#276749',
    shadowColor: '#38A169',
    opacity: 0.8,
  },
  practiceButtonCelebration: {
    backgroundColor: '#8B5CF6', // Purple for celebration
    borderColor: '#7C3AED',
    borderBottomColor: '#6D28D9',
    shadowColor: '#8B5CF6',
  },
  practiceButtonTextDone: {
    color: colors.cardBackground,
  },
  reviewBadge: {
    position: 'absolute',
    right: SPACING.lg,
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  reviewBadgeText: {
    color: colors.cardBackground,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
  },
  progressSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.sm,
  },
  progressTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  progressSubtitle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    marginBottom: SPACING.xl,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    height: 100,
    alignItems: 'flex-end',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  barContainer: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    marginBottom: SPACING.sm,
  },
  progressBar: {
    width: '100%',
    borderRadius: RADIUS.sm,
    minHeight: 8,
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  wordCount: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
  },
  progressSummary: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  summaryText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  summaryHighlight: {
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
  },
  goalSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  goalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  goalTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
  },
  goalEmoji: {
    fontSize: TYPOGRAPHY['2xl'],
  },
  goalProgress: {
    marginBottom: SPACING.xl,
  },
  goalProgressBg: {
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: RADIUS.sm,
  },
  goalProgressText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addWordsButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    // Duolingo-style 3D effect
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  addWordsButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
  },
  quickStats: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  quickStatIcon: {
    fontSize: TYPOGRAPHY.xl,
    marginRight: SPACING.md,
  },
  quickStatIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  quickStatLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  bottomSpacing: {
    height: SPACING['4xl'],
  },
  fab: {
    position: 'absolute',
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    // Duolingo-style 3D effect
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  fabIcon: {
    fontSize: TYPOGRAPHY['2xl'],
    color: colors.cardBackground,
    fontWeight: TYPOGRAPHY.bold,
  },
  
  // Empty state styles
  emptyState: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  createFirstNotebookButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    // Duolingo-style 3D effect
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  createFirstNotebookText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
  },

  // Development reset button styles
  resetButton: {
    backgroundColor: colors.error,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  resetButtonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
  },

  // New notebook level styles
  notebooksContainer: {
    gap: SPACING.md,
  },
  secondaryNotebookCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  readOnlyNotebook: {
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  notebookLevelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  readOnlyBadge: {
    backgroundColor: colors.info + '20',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  readOnlyText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.info,
    fontWeight: TYPOGRAPHY.medium,
  },
  secondaryNotebookTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  secondaryStats: {
    marginTop: SPACING.sm,
  },
  secondaryStatsText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  createNotebookButton: {
    marginHorizontal: SPACING.xl,
    backgroundColor: colors.primary + '20',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    // Duolingo-style 3D effect (lighter for secondary button)
    borderWidth: 3,
    borderBottomWidth: 4,
    borderColor: colors.primary + '60',
    borderBottomColor: colors.primary + '80',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  createNotebookText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
  },

  // Notebook carousel styles
  carouselContainer: {
    marginBottom: SPACING.xl,
  },
  carouselContent: {
    paddingHorizontal: SPACING.xl,
  },
  carouselCard: {
    paddingHorizontal: SPACING.sm,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Updated notebook content styles
  notebookCardContent: {
    // No additional styling needed - TouchableOpacity wrapper
  },
  notebookTitleWithFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  notebookFlag: {
    borderRadius: 3,
    // Add a subtle shadow for better visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Additional button styles
  practiceButtonInfo: {
    backgroundColor: colors.info,
    borderColor: '#0284C7',
    borderBottomColor: '#0369A1',
    shadowColor: '#0284C7',
  },
  practiceButtonTextInfo: {
    color: colors.cardBackground,
  },

  // Integrated notebook styles
  bronzeNotebookContent: {
    // No additional styling needed - TouchableOpacity wrapper
  },
  extensionsContainer: {
    marginTop: SPACING.xl,
  },
  extensionsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: SPACING.md,
  },
  extensionsTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  extensionsList: {
    gap: SPACING.sm,
  },
  extensionCard: {
    backgroundColor: colors.gray50,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  extensionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  extensionIcon: {
    fontSize: TYPOGRAPHY.lg,
  },
  extensionInfo: {
    flex: 1,
  },
  extensionName: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  extensionStats: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },

  // Achievement Notebook Cards (Silver/Gold)
  achievementNotebookCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  
  // Silver Achievement Card
  silverNotebookCard: {
    borderWidth: 2,
    borderColor: '#C0C0C0',
    shadowColor: '#C0C0C0',
    shadowOpacity: 0.2,
    elevation: 10,
    backgroundColor: '#F7FAFC',
  },
  silverIcon: {
    textShadowColor: '#C0C0C0',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  silverTitle: {
    color: '#4A5568',
  },
  
  // Gold Achievement Card
  goldNotebookCard: {
    borderWidth: 3,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOpacity: 0.3,
    elevation: 12,
    backgroundColor: '#FFFAF0',
  },
  goldIcon: {
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  goldTitle: {
    color: '#D69E2E',
  },
  
  // Achievement Card Content
  achievementNotebookHeader: {
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
  },
  achievementNotebookContent: {
    gap: SPACING.sm,
  },
  achievementNotebookStats: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  achievementNotebookSubtext: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Duolingo-Style Game Design
  gameNotebookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  notebookIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#58CC02',
    borderWidth: 3,
    borderColor: '#46A302',
    borderBottomWidth: 5,
    borderBottomColor: '#3A8B02',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#46A302',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  notebookEmoji: {
    fontSize: 24,
  },
  notebookHeaderText: {
    flex: 1,
  },
  gameNotebookTitle: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  gameNotebookSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  progressDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  progressDot: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  gameLevelCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    borderBottomWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  bronzeGameCircle: {
    backgroundColor: '#FF9500',
    borderColor: '#E8850C',
    borderBottomColor: '#D1750A',
    shadowColor: '#E8850C',
  },
  silverGameCircle: {
    backgroundColor: '#C0C0C0',
    borderColor: '#A8A8A8',
    borderBottomColor: '#909090',
    shadowColor: '#A8A8A8',
  },
  goldGameCircle: {
    backgroundColor: '#FFD700',
    borderColor: '#E8C547',
    borderBottomColor: '#D1B000',
    shadowColor: '#E8C547',
  },
  levelNumber: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  gameLevelLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  connectionLine: {
    width: 24,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginHorizontal: SPACING.xs,
  },

  // Status Bar Styles
  statusBar: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    ...SHADOWS.md,
  },
  statusBarReviews: {
    borderColor: '#EF4444',
    backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2',
    shadowColor: '#EF4444',
  },
  statusBarWords: {
    borderColor: '#F59E0B',
    backgroundColor: isDark ? '#92400E' : '#FFFBEB',
    shadowColor: '#F59E0B',
  },
  statusBarComplete: {
    borderColor: '#10B981',
    backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
    shadowColor: '#10B981',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statusIcon: {
    fontSize: TYPOGRAPHY.xl,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
  },
  countBadgeReviews: {
    backgroundColor: '#EF4444',
  },
  countBadgeWords: {
    backgroundColor: '#F59E0B',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
  },
  statusRight: {
    flex: 1,
  },
  statusMainText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },
  
  // Number Badge Styles (Prominent circular badges)
  numberBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  numberBadgeReviews: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
    shadowColor: '#EF4444',
  },
  numberBadgeWords: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
    shadowColor: '#F59E0B',
  },
  numberBadgeComplete: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
    shadowColor: '#10B981',
  },
  numberText: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.extrabold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  numberTextReviews: {
    color: '#FFFFFF',
  },
  numberTextWords: {
    color: '#FFFFFF',
  },
  numberTextComplete: {
    color: '#FFFFFF',
  },
  
  
  // Action Badge Styles (Emphasized action words)
  actionBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionBadgeReviews: {
    backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  actionBadgeWords: {
    backgroundColor: isDark ? '#92400E' : '#FEF3C7',
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
  },
  actionBadgeComplete: {
    backgroundColor: isDark ? '#064E3B' : '#D1FAE5',
    borderColor: '#10B981',
    shadowColor: '#10B981',
  },
  actionText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.extrabold,
    letterSpacing: 0.5,
  },
  actionTextReviews: {
    color: isDark ? '#F87171' : '#DC2626',
  },
  actionTextWords: {
    color: isDark ? '#FBBF24' : '#D97706',
  },
  actionTextComplete: {
    color: isDark ? '#34D399' : '#059669',
  },

  // Trial Banner Styles
  trialBanner: {
    backgroundColor: colors.success,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.sm,
  },
  trialBannerUrgent: {
    backgroundColor: colors.warning,
  },
  trialContent: {
    flex: 1,
  },
  trialTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.white,
    marginBottom: SPACING.xs,
  },
  trialSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.white,
    opacity: 0.9,
  },
  upgradeButton: {
    backgroundColor: colors.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  upgradeButtonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.success,
  },

  // Daily Progress Widget Styles
  dailyProgressWidget: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  dailyProgressTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  dailyProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyProgressItem: {
    alignItems: 'center',
    flex: 1,
  },
  dailyProgressDay: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  dailyProgressIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyProgressValue: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
  },

})