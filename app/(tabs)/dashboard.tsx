import { SharedHeader } from '@/components/shared-header'
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/constants/design'
import { useApp } from '@/lib/contexts/AppContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { supabase } from '@/lib/supabase/client'
import { FrontendDailyProgress } from '@/lib/utils/dataTransform'
import { useRouter, useFocusEffect } from 'expo-router'
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useQueryClient } from '@/lib/contexts/QueryProvider'
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  AppState,
  AppStateStatus,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

const { width: screenWidth } = Dimensions.get('window')

// Circular Progress Component
interface CircularProgressProps {
  percentage: number
  color: string
  size: number
  strokeWidth: number
  title: string
  subtitle: string
}

function CircularProgress({ percentage, color, size, strokeWidth, title, subtitle }: CircularProgressProps) {
  const { colors } = useTheme()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ position: 'relative' }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {/* Percentage text in center */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: color
          }}>
            {percentage}%
          </Text>
        </View>
      </View>
      {/* Labels */}
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center',
        color: colors.textPrimary
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
        textAlign: 'center'
      }}>
        {subtitle}
      </Text>
    </View>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const { profile, refreshProfile } = useAuth()
  const { appState, refreshNotebooks, addEventListener, emitEvent } = useApp()
  const { colors } = useTheme()
  const { subscription, showPaywallModal, hasFeature, getUserState } = useSubscription()
  const { currentSimulatedDay, getCurrentDate } = useDevTime()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedChartPeriod, setSelectedChartPeriod] = useState<'week' | 'month'>('week')
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')
  const [currentPage, setCurrentPage] = useState(0)
  // Note: Old manual state management removed - now using React Query + computed values

  // ===== REACT QUERY DATA FETCHING =====
  // These will replace the manual state management above
  
  // Today's progress with DevTime synchronization
  const { 
    data: todayProgressData, 
    isLoading: todayLoading,
    error: todayError,
    refetch: refetchTodayProgress
  } = useQuery({
    queryKey: ['today-progress', profile?.id, getCurrentDate().toISOString().split('T')[0]],
    queryFn: () => supabaseService.getTodayProgress(),
    enabled: !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds for immediate feel
    refetchInterval: 15 * 1000, // Refresh every 15 seconds
  })

  // Weekly progress with DevTime synchronization
  const { 
    data: weeklyProgressData, 
    isLoading: weeklyLoading,
    refetch: refetchWeeklyProgress
  } = useQuery({
    queryKey: ['weekly-progress', profile?.id, getCurrentDate().toISOString().split('T')[0]],
    queryFn: () => supabaseService.getWeeklyProgress(),
    enabled: !!profile?.id,
    staleTime: 60 * 1000, // 1 minute for weekly data
  })

  // Monthly progress
  const { 
    data: monthlyProgressData, 
    isLoading: monthlyLoading,
    refetch: refetchMonthlyProgress
  } = useQuery({
    queryKey: ['monthly-progress', profile?.id, currentSimulatedDay],
    queryFn: () => supabaseService.getMonthlyProgress(),
    enabled: !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds for real-time updates
    refetchInterval: 30 * 1000, // Refresh every 30 seconds for monthly data
  })

  // Daily progress for heatmap (175 days like before)
  const { 
    data: dailyProgressData, 
    isLoading: heatmapLoading,
    refetch: refetchDailyProgress
  } = useQuery({
    queryKey: ['daily-progress', profile?.id, currentSimulatedDay, 175],
    queryFn: () => supabaseService.getDailyProgress(175),
    enabled: !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds for real-time updates
    refetchInterval: 15 * 1000, // Refresh every 15 seconds for real-time feel
  })

  // Total words statistics
  const { 
    data: totalStatsData, 
    isLoading: totalStatsLoading,
    refetch: refetchTotalStats
  } = useQuery({
    queryKey: ['total-stats', profile?.id],
    queryFn: () => supabaseService.getTotalWordsStats(),
    enabled: !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds for stats
    refetchInterval: 30 * 1000, // Refresh every 30 seconds for real-time feel
  })

  // ===== COMPUTED VALUES =====
  // Transform React Query data into UI-ready format
  
  // Use React Query data with fallbacks to prevent NaN issues
  const computedTodayProgress = useMemo(() => {
    return todayProgressData || { wordsAdded: 0, goal: 20, completed: false }
  }, [todayProgressData])

  const computedWeeklyData = useMemo(() => {
    return weeklyProgressData || [
      { day: 'Mon', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Tue', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Wed', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Thu', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Fri', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Sat', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Sun', wordsAdded: 0, wordsRemembered: 0, completed: false },
    ]
  }, [weeklyProgressData])

  const computedMonthlyData = useMemo(() => {
    return monthlyProgressData || [
      { month: 'Apr', wordsAdded: 0, wordsMastered: 0 },
      { month: 'May', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Jun', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Jul', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Aug', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Sep', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Oct', wordsAdded: 0, wordsMastered: 0 },
    ]
  }, [monthlyProgressData])

  const computedTotalStats = useMemo(() => {
    return totalStatsData || { totalAdded: 0, totalMastered: 0 }
  }, [totalStatsData])

  // Heatmap generation function
  const generateRealHeatmap = useCallback((dailyProgress: FrontendDailyProgress[]) => {
    const rows = 7 // Days of week (Sunday = 0, Monday = 1, ..., Saturday = 6)
    const cols = 25 // Weeks to show (~6 months)
    
    console.log(`🗓️ HEATMAP DEBUG: Generating heatmap with ${dailyProgress?.length || 0} days of data`);
    console.log(`🗓️ Daily progress data:`, dailyProgress);
    
    // Initialize with empty data (7 rows × 25 columns)
    const heatmapData = Array.from({ length: rows }, () => Array(cols).fill(0))
    
    // Fill with real data if available
    if (dailyProgress && dailyProgress.length > 0) {
      const currentDate = getCurrentDate()
      
      // Calculate the start of the current week (Sunday)
      const currentWeekStart = new Date(currentDate)
      currentWeekStart.setUTCDate(currentDate.getUTCDate() - currentDate.getUTCDay())
      currentWeekStart.setUTCHours(0, 0, 0, 0)
      
      // Calculate how many weeks have passed since a reference point
      // This creates the "shifting" effect - each week, everything moves left by 1 column
      const epochStart = new Date('2024-01-01T00:00:00.000Z') // Reference point
      const weeksFromEpoch = Math.floor((currentWeekStart.getTime() - epochStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      
      // Process each day's progress
      dailyProgress.forEach((day, index) => {
        // Parse the date from the daily progress
        const dayDate = new Date(day.date + 'T00:00:00.000Z') // Ensure UTC parsing
        
        // Only log days with activity to reduce noise
        if (day.wordsAdded > 0 || day.wordsReviewed > 0) {
          console.log(`🗓️ Processing day ${index}: ${day.date} with ${day.wordsAdded} words, ${day.wordsReviewed} reviews`);
        }
        
        // Calculate which week this day belongs to
        const dayWeekStart = new Date(dayDate)
        dayWeekStart.setUTCDate(dayDate.getUTCDate() - dayDate.getUTCDay())
        dayWeekStart.setUTCHours(0, 0, 0, 0)
        
        const dayWeeksFromEpoch = Math.floor((dayWeekStart.getTime() - epochStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
        
        // Calculate column position with GitHub-style shifting
        // Current week appears in rightmost column (24)
        // Each week shifts everything left by 1 column
        const weeksFromCurrentWeek = weeksFromEpoch - dayWeeksFromEpoch
        const col = cols - 1 - weeksFromCurrentWeek // Rightmost = current week
        
        // Only log positioning for days with activity
        // if (day.wordsAdded > 0) {
        //   console.log(`🗓️   Date: ${dayDate.toISOString()}, Day of week: ${dayDate.getUTCDay()}, Col: ${col}`);
        // }
        
        // Only show days within our 25-week window
        if (col >= 0 && col < cols) {
          const dayOfWeek = dayDate.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          const row = dayOfWeek
          
          if (row >= 0 && row < rows) {
            // Binary: 1 if any words added OR reviewed, 0 if no activity
            const isActive = (day.wordsAdded > 0 || day.wordsReviewed > 0) ? 1 : 0
            heatmapData[row][col] = isActive
            // Only log heatmap updates for active days
            if (isActive) {
              console.log(`🗓️   Setting heatmap[${row}][${col}] = ${isActive} (${day.wordsAdded} words, ${day.wordsReviewed} reviews)`);
            }
          }
        } else {
          // Only log if outside window and has activity
          if (day.wordsAdded > 0 || day.wordsReviewed > 0) {
            console.log(`🗓️   Day outside 25-week window, col: ${col}`);
          }
        }
      })
    } else {
      console.log(`🗓️ No daily progress data available for heatmap`);
    }
    
    console.log('🗓️ Generated GitHub-style shifting heatmap with weekly progression');
    console.log('🗓️ Final heatmap data:', heatmapData);
    return heatmapData
  }, [getCurrentDate])

  // Generate heatmap data from daily progress  
  const computedActivityData = useMemo(() => {
    if (!dailyProgressData) return []
    return generateRealHeatmap(dailyProgressData)
  }, [dailyProgressData, generateRealHeatmap])

  // Combined loading state for pull-to-refresh
  const isAnyLoading = todayLoading || weeklyLoading || monthlyLoading || heatmapLoading || totalStatsLoading

  // Debug logging for React Query data
  // if (__DEV__) {
  //   console.log('🔍 React Query Debug - Today Progress:', todayProgressData)
  //   console.log('🔍 React Query Debug - Weekly Data:', weeklyProgressData)
  //   console.log('🔍 React Query Debug - Total Stats:', totalStatsData)
  //   console.log('🔍 React Query Debug - Loading states:', {
  //     today: todayLoading,
  //     weekly: weeklyLoading,
  //     monthly: monthlyLoading,
  //     heatmap: heatmapLoading,
  //     totalStats: totalStatsLoading
  //   })
  // }

  const insets = useSafeAreaInsets()
  
  // App state tracking for open app detection
  const appStateRef = useRef(AppState.currentState)

  useEffect(() => {
    refreshNotebooks()
  }, [])

  // AppState listener for app open detection
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Only refresh when app comes from background to foreground
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (__DEV__) console.log('📱 Dashboard - App opened from background, emitting app opened event')
        emitEvent('appOpened', {})
      }
      appStateRef.current = nextAppState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription?.remove()
  }, [])

  // Handle profile stats sync when total stats are available
  useEffect(() => {
    if (profile && totalStatsData && !totalStatsLoading) {
      // One-time sync of profile stats to fix any inconsistencies
      if (profile.total_words_added === 0 && profile.total_words_mastered === 0 && totalStatsData.totalAdded > 0) {
        console.log('🔄 Syncing profile stats to fix cached values...')
        supabaseService.syncProfileStats().catch(error => {
          console.warn('Profile sync failed (non-critical):', error)
        })
      }
    }
  }, [profile, totalStatsData, totalStatsLoading])

  // Note: generateRealHeatmap function moved above to fix scope issue

  const onRefresh = async () => {
    setRefreshing(true)
    try {
      // Use React Query refetch for all dashboard data + refresh notebooks
      await Promise.all([
        refreshNotebooks(),
        refetchTodayProgress(),
        refetchWeeklyProgress(), 
        refetchMonthlyProgress(),
        refetchDailyProgress(),
        refetchTotalStats()
      ])
      console.log('✅ Dashboard: Pull-to-refresh completed successfully')
    } catch (error) {
      console.error('❌ Dashboard: Pull-to-refresh error:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Smart focus-based updates: Only refresh when data actually changes
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  
  // REACT QUERY: Event-based cache invalidation
  useEffect(() => {
    const handleDataChange = () => {
      if (__DEV__) console.log('📊 Dashboard: dataChanged - invalidating today + weekly queries')
      queryClient.invalidateQueries({ queryKey: ['today-progress'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-progress'] })
    }

    const handleWordsAdded = (data: { notebookId: string; wordCount: number }) => {
      if (__DEV__) console.log('📊 Dashboard: wordsAdded - invalidating progress + stats queries', data)
      if (__DEV__) console.log('📊 Dashboard: Current cache key components - profile:', profile?.id, 'simulatedDay:', currentSimulatedDay)
      
      // IMMEDIATE CACHE INVALIDATION with forced refetch for critical data
      queryClient.invalidateQueries({ queryKey: ['today-progress'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-progress'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-progress'] })
      queryClient.invalidateQueries({ queryKey: ['total-stats'] })
      queryClient.invalidateQueries({ queryKey: ['daily-progress'] })
      
      // CRITICAL: Also invalidate with exact cache keys to ensure cache invalidation works
      if (profile?.id) {
        queryClient.invalidateQueries({ queryKey: ['monthly-progress', profile.id, currentSimulatedDay] })
        queryClient.invalidateQueries({ queryKey: ['daily-progress', profile.id, currentSimulatedDay, 175] })
      }
      
      // Force immediate refetch of most important data including heatmap and monthly
      queryClient.refetchQueries({ queryKey: ['today-progress'] })
      queryClient.refetchQueries({ queryKey: ['total-stats'] })
      queryClient.refetchQueries({ queryKey: ['daily-progress'] })
      queryClient.refetchQueries({ queryKey: ['monthly-progress'] })
      
      // CRITICAL: Also force refetch with exact cache keys
      if (profile?.id) {
        if (__DEV__) console.log('📊 Dashboard: Force refetching monthly with exact key:', ['monthly-progress', profile.id, currentSimulatedDay])
        queryClient.refetchQueries({ queryKey: ['monthly-progress', profile.id, currentSimulatedDay] })
      }
      
      // Trigger profile refresh for streak updates (recordActivity updates profile)
      setTimeout(() => {
        if (profile?.id) {
          refreshProfile()
        }
      }, 500) // Small delay to allow streak update to complete
    }

    const handleReviewsCompleted = () => {
      if (__DEV__) console.log('📊 Dashboard: reviewsCompleted - invalidating stats + heatmap queries')
      // Reviews affect statistics, progress, and daily heatmap
      queryClient.invalidateQueries({ queryKey: ['total-stats'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-progress'] })
      queryClient.invalidateQueries({ queryKey: ['daily-progress'] })
      
      // Force immediate refetch for heatmap updates
      queryClient.refetchQueries({ queryKey: ['daily-progress'] })
    }

    const handleAppOpened = () => {
      if (__DEV__) console.log('📊 Dashboard: appOpened - invalidating all dashboard queries')
      // Full refresh on app open - invalidate all dashboard data
      queryClient.invalidateQueries({ queryKey: ['today-progress'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-progress'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-progress'] })
      queryClient.invalidateQueries({ queryKey: ['daily-progress'] })
      queryClient.invalidateQueries({ queryKey: ['total-stats'] })
    }

    // Set up event listeners
    const cleanupData = addEventListener('dataChanged', handleDataChange)
    const cleanupWords = addEventListener('wordsAdded', handleWordsAdded)
    const cleanupReviews = addEventListener('reviewsCompleted', handleReviewsCompleted)
    const cleanupApp = addEventListener('appOpened', handleAppOpened)

    return () => {
      cleanupData()
      cleanupWords()
      cleanupReviews()
      cleanupApp()
    }
  }, [addEventListener, queryClient, profile?.id])

  // ===== SUPABASE REALTIME INTEGRATION =====
  // Real-time database change detection for automatic cache invalidation
  useEffect(() => {
    if (!profile?.id) return

    console.log('🔄 Dashboard: Setting up Supabase Realtime subscriptions...')

    // Create realtime channel for dashboard updates
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'words'
        },
        (payload) => {
          console.log('🔄 Realtime: Words table changed', payload.eventType, (payload.new as any)?.id)
          // IMMEDIATE UPDATES: Words changes affect multiple dashboard queries
          queryClient.invalidateQueries({ queryKey: ['today-progress'] })
          queryClient.invalidateQueries({ queryKey: ['weekly-progress'] })
          queryClient.invalidateQueries({ queryKey: ['monthly-progress'] })
          queryClient.invalidateQueries({ queryKey: ['total-stats'] })
          queryClient.invalidateQueries({ queryKey: ['daily-progress'] })
          
          // Force immediate refetch for critical real-time data including heatmap and monthly
          queryClient.refetchQueries({ queryKey: ['today-progress'] })
          queryClient.refetchQueries({ queryKey: ['total-stats'] })
          queryClient.refetchQueries({ queryKey: ['daily-progress'] })
          queryClient.refetchQueries({ queryKey: ['monthly-progress'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pages'
        },
        (payload) => {
          console.log('🔄 Realtime: Pages table changed', payload.eventType, (payload.new as any)?.id)
          // Pages changes mainly affect today and daily progress
          queryClient.invalidateQueries({ queryKey: ['today-progress'] })
          queryClient.invalidateQueries({ queryKey: ['daily-progress'] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reviews'
        },
        (payload) => {
          console.log('🔄 Realtime: Reviews table changed', payload.eventType, (payload.new as any)?.id)
          // Reviews affect weekly progress and total stats
          queryClient.invalidateQueries({ queryKey: ['weekly-progress'] })
          queryClient.invalidateQueries({ queryKey: ['total-stats'] })
        }
      )
      .subscribe((status) => {
        console.log('🔄 Dashboard Realtime subscription status:', status)
      })

    // Cleanup subscription
    return () => {
      console.log('🔄 Dashboard: Cleaning up Realtime subscriptions')
      supabase.removeChannel(channel)
    }
  }, [profile?.id, queryClient])

  useFocusEffect(
    useCallback(() => {
      // Initial load only
      if (profile && !hasInitialLoad) {
        if (__DEV__) console.log('📊 Dashboard initial focus load')
        setHasInitialLoad(true)
        // Initial load is already handled by useEffect with profile dependency
      }
    }, [profile, hasInitialLoad])
  )


  // Gold List Method metrics - realistic dummy data
  const goldListMetrics = {
    currentStreak: 12,
    masteryRate: 73,
    weeklyVelocity: 15,
    reviewAdherence: 85,
    // 7 weeks × 7 days heatmap data (0 = no activity, 4 = high activity)
    heatmapData: [
      [1, 2, 3, 2, 1, 0, 0], // 7 weeks ago
      [2, 3, 4, 3, 2, 1, 0], // 6 weeks ago
      [1, 1, 2, 3, 3, 0, 1], // 5 weeks ago
      [3, 4, 2, 1, 2, 0, 0], // 4 weeks ago
      [2, 3, 3, 4, 3, 1, 1], // 3 weeks ago
      [4, 3, 2, 3, 4, 0, 0], // 2 weeks ago
      [3, 4, 4, 3, 3, 2, 1], // Last week
    ],
    // This week specific data
    thisWeekData: {
      wordsAdded: 45,
      wordsReviewed: 28,
      sessionsCompleted: 5,
      averageSessionTime: 18, // minutes
      dailyProgress: [
        { day: 'Mon', added: 8, reviewed: 5, completed: true },
        { day: 'Tue', added: 10, reviewed: 6, completed: true },
        { day: 'Wed', added: 6, reviewed: 4, completed: true },
        { day: 'Thu', added: 12, reviewed: 7, completed: true },
        { day: 'Fri', added: 9, reviewed: 6, completed: true },
        { day: 'Sat', added: 0, reviewed: 0, completed: false },
        { day: 'Sun', added: 0, reviewed: 0, completed: false },
      ]
    }
  }

  // Circular progress data calculations with proper calendar periods
  const getCircularProgressData = useMemo(() => {
    const currentDate = getCurrentDate()
    // Calculate total daily goal by summing all notebooks' daily targets
    const totalDailyGoal = appState.notebooks.length > 0 
      ? appState.notebooks.reduce((sum, notebook) => sum + (notebook.words_per_day || 0), 0)
      : 10
    
    console.log(`📊 Multi-notebook goal calculation: ${appState.notebooks.length} notebooks, ${totalDailyGoal} words/day total`)
    
    // All-time mastery rate using real-time data (constant, unaffected by week/month toggle)
    const totalWordsAdded = computedTotalStats.totalAdded > 0 ? computedTotalStats.totalAdded : (profile?.total_words_added || 0)
    const totalWordsMastered = computedTotalStats.totalMastered > 0 ? computedTotalStats.totalMastered : (profile?.total_words_mastered || 0)
    const masteryRate = totalWordsAdded > 0 ? Math.round((totalWordsMastered / totalWordsAdded) * 100) : 0
    
    if (selectedChartPeriod === 'week') {
      // Calculate start of current week (Monday)
      const startOfWeek = new Date(currentDate)
      const dayOfWeek = startOfWeek.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert Sunday (0) to 6, others stay same
      startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      
      // console.log(`🔍 WEEK CALCULATION DEBUG:`);
      // console.log(`📅 Current date: ${currentDate.toISOString()}`);
      // console.log(`📅 Start of week: ${startOfWeek.toISOString()}`);
      // console.log(`📊 Weekly data:`, computedWeeklyData);
      // console.log(`📊 Total daily goal: ${totalDailyGoal}`);
      
      // Sum up words added from current week only
      let thisWeekWordsAdded = 0
      
      computedWeeklyData.forEach((dayData, index) => {
        // Calculate the actual date for this day in computedWeeklyData
        const dayDate = new Date(currentDate)
        dayDate.setDate(dayDate.getDate() - (6 - index)) // computedWeeklyData goes from oldest to newest
        dayDate.setHours(0, 0, 0, 0)
        
        // Only log days with activity
        // if (dayData.wordsAdded > 0) {
        //   console.log(`📅 Day ${index} (${dayData.day}): ${dayDate.toISOString()} - ${dayData.wordsAdded} words`);
        //   console.log(`  Is in current week? ${dayDate >= startOfWeek && dayDate <= currentDate}`);
        // }
        
        // Only count if this day is in current week
        if (dayDate >= startOfWeek && dayDate <= currentDate) {
          thisWeekWordsAdded += dayData.wordsAdded
          // Only log when words are actually added
          // if (dayData.wordsAdded > 0) {
          //   console.log(`  ✅ Added ${dayData.wordsAdded} words to week total`);
          // }
        }
      })
      
      const weeklyGoal = totalDailyGoal * 7
      const addedProgress = weeklyGoal > 0 ? Math.min(100, Math.round((thisWeekWordsAdded / weeklyGoal) * 100)) : 0
      
      console.log(`📊 WEEK TOTAL: ${thisWeekWordsAdded}/${weeklyGoal} words (${addedProgress}%)`);
      // console.log(`📊 FINAL WEEK CALCULATION:`);
      // console.log(`  This week words added: ${thisWeekWordsAdded}`);
      // console.log(`  Weekly goal: ${weeklyGoal}`);
      // console.log(`  Progress percentage: ${addedProgress}%`);
      
      const result = {
        wordsAdded: {
          current: thisWeekWordsAdded,
          goal: weeklyGoal,
          percentage: addedProgress
        },
        masteryRate: {
          mastered: totalWordsMastered,
          total: totalWordsAdded,
          percentage: masteryRate
        }
      }
      
      console.log(`🎯 WEEK RESULT:`, result);
      return result
    } else {
      // Calculate start of current month (1st day)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      // Calculate days in current month for accurate goal
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      
      // Sum up words added from current month only
      let thisMonthWordsAdded = 0
      
      // Create month abbreviation mapping for reliable comparison
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const currentMonthAbbr = monthNames[currentDate.getMonth()] // 0-based month index
      
      // console.log(`🔍 MONTH MATCHING DEBUG:`);
      // console.log(`📅 Current date: ${currentDate.toISOString()}`);
      // console.log(`📅 Current month index: ${currentDate.getMonth()}`);
      // console.log(`📅 Expected month abbr: ${currentMonthAbbr}`);
      // console.log(`📊 Available monthly data:`, computedMonthlyData.map(m => ({ month: m.month, words: m.wordsAdded })));
      
      computedMonthlyData.forEach((monthData) => {
        // console.log(`📅 Checking month data: ${monthData.month} vs ${currentMonthAbbr}`);
        if (monthData.month === currentMonthAbbr) {
          thisMonthWordsAdded = monthData.wordsAdded
          console.log(`✅ Found matching month: ${monthData.month} with ${monthData.wordsAdded} words`);
        }
      })
      
      const monthlyGoal = totalDailyGoal * daysInMonth
      const addedProgress = monthlyGoal > 0 ? Math.min(100, Math.round((thisMonthWordsAdded / monthlyGoal) * 100)) : 0
      
      console.log(`📊 MONTH TOTAL: ${thisMonthWordsAdded}/${monthlyGoal} words (${addedProgress}%)`);
      // console.log(`🔍 MONTH CALCULATION DEBUG:`);
      // console.log(`📅 Current month abbr: ${currentDate.toLocaleDateString('en-US', { month: 'short' })}`);
      // console.log(`📊 Monthly data:`, computedMonthlyData);
      // console.log(`📊 This month words added: ${thisMonthWordsAdded}`);
      // console.log(`📊 Monthly goal: ${monthlyGoal}`);
      // console.log(`📊 Progress percentage: ${addedProgress}%`);
      
      const result = {
        wordsAdded: {
          current: thisMonthWordsAdded,
          goal: monthlyGoal,
          percentage: addedProgress
        },
        masteryRate: {
          mastered: totalWordsMastered,
          total: totalWordsAdded,
          percentage: masteryRate
        }
      }
      
      console.log(`🎯 MONTH RESULT:`, result);
      return result
    }
  }, [selectedChartPeriod, computedWeeklyData, computedMonthlyData, appState.notebooks, getCurrentDate, profile, computedTotalStats])

  // Circular chart data based on selected period
  const getCircularData = () => {
    const weeklyTotal = computedWeeklyData.reduce((total, day) => total + day.wordsAdded, 0)
    const monthlyTotal = weeklyTotal * 4 // Approximate monthly data
    
    switch (selectedPeriod) {
      case 'week':
        return {
          value: weeklyTotal,
          label: 'words this week'
        }
      case 'month':
        return {
          value: monthlyTotal,
          label: 'words this month'
        }
    }
  }

  const getActivityColor = (isActive: number) => {
    // Binary color system: theme-aware darker gray (no activity) or yellow (active)
    const activityColors = [
      colors.gray100 || '#ebedf0',   // 0 - no activity (theme-aware darker background)
      colors.primary,                // 1 - active day (main yellow color)
    ]
    return activityColors[isActive] || activityColors[0]
  }

  // Use real activity data or fallback to empty (7 rows × 25 columns)
  const habitHeatmapData = computedActivityData.length > 0 ? computedActivityData : 
    Array.from({ length: 7 }, () => Array(25).fill(0))


  const styles = createStyles(colors)

  // Check user state for dashboard access
  const userState = getUserState()
  
  // Show upgrade message for post-trial users
  if (userState === 'post-trial') {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <SharedHeader 
            title="Dashboard" 
          />
          
          {/* Upgrade Message for Post-Trial Users */}
          <View style={styles.upgradeContainer}>
            <View style={styles.upgradeCard}>
              <Text style={styles.upgradeIcon}>📊</Text>
              <Text style={styles.upgradeTitle}>Dashboard Access</Text>
              <Text style={styles.upgradeSubtitle}>
                Upgrade to Premium to unlock your learning dashboard
              </Text>
              
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>📈</Text>
                  <Text style={styles.benefitText}>Track your learning progress</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>📅</Text>
                  <Text style={styles.benefitText}>View weekly and monthly analytics</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>🎯</Text>
                  <Text style={styles.benefitText}>Monitor vocabulary mastery rates</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitIcon}>🔥</Text>
                  <Text style={styles.benefitText}>See learning streaks and achievements</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={showPaywallModal}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || isAnyLoading} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <SharedHeader 
          title="Dashboard" 
        />

        {/* Section 1: Progress Overview Card */}
        <View style={styles.section1Card}>
          <Text style={styles.sectionTitle}>Progress Overview</Text>
          
          {/* Toggle */}
          <View style={styles.toggleContainer}>
            <View style={styles.periodTabs}>
              {([
                { key: 'week', label: 'Week' },
                { key: 'month', label: 'Month' }
              ] as const).map((period) => (
                <TouchableOpacity
                  key={period.key}
                  style={[
                    styles.periodTab,
                    selectedChartPeriod === period.key && styles.periodTabActive
                  ]}
                  onPress={() => setSelectedChartPeriod(period.key)}
                >
                  <Text style={[
                    styles.periodTabText,
                    selectedChartPeriod === period.key && styles.periodTabTextActive
                  ]}>
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Circular Progress Charts */}
          <View style={styles.circularChartsContainer}>
            <CircularProgress
              percentage={getCircularProgressData.wordsAdded.percentage}
              color="#FFA400"
              size={120}
              strokeWidth={8}
              title="Words Added"
              subtitle={`${getCircularProgressData.wordsAdded.current}/${getCircularProgressData.wordsAdded.goal}`}
            />
            
            <CircularProgress
              percentage={getCircularProgressData.masteryRate.percentage}
              color="#10B981"
              size={120}
              strokeWidth={8}
              title="Mastery Rate"
              subtitle={`${getCircularProgressData.masteryRate.mastered}/${getCircularProgressData.masteryRate.total} mastered`}
            />
          </View>

          {/* Streak and Total Mastered Row */}
          <View style={styles.streakMasteredRow}>
            <View style={styles.streakMasteredItem}>
              <Text style={styles.streakMasteredEmoji}>🔥</Text>
              <Text style={styles.streakMasteredValue}>{profile?.streak_count || 0}</Text>
              <Text style={styles.streakMasteredLabel}>Current Streak</Text>
            </View>
            <View style={styles.streakMasteredItem}>
              <Text style={styles.streakMasteredEmoji}>⭐</Text>
              <Text style={styles.streakMasteredValue}>{computedTotalStats.totalMastered}</Text>
              <Text style={styles.streakMasteredLabel}>Total Mastered</Text>
            </View>
          </View>
        </View>

        {/* Premium Analytics Teaser for Free Users */}
        {!subscription.isActive && (
          <TouchableOpacity 
            style={styles.premiumTeaserCard} 
            onPress={() => showPaywallModal()}
          >
            <View style={styles.premiumTeaserHeader}>
              <Text style={styles.premiumTeaserTitle}>📊 Advanced Analytics</Text>
              <Text style={styles.premiumBadge}>PREMIUM</Text>
            </View>
            <Text style={styles.premiumTeaserDescription}>
              Get detailed insights into your learning patterns, retention rates, and personalized recommendations
            </Text>
            <View style={styles.premiumFeaturesList}>
              <Text style={styles.premiumFeature}>• Learning velocity tracking</Text>
              <Text style={styles.premiumFeature}>• Memory retention analysis</Text>
              <Text style={styles.premiumFeature}>• Personalized review scheduling</Text>
            </View>
            <Text style={styles.premiumCTA}>Tap to unlock →</Text>
          </TouchableOpacity>
        )}

        {/* Section 2: Daily Activity Heatmap */}
        <View style={styles.section2Card}>
          <Text style={styles.sectionTitle}>Daily Activity</Text>
          <Text style={styles.sectionSubtitle}>Your learning pattern over time</Text>
          
          <View style={styles.heatmapContainer}>
            <View style={styles.heatmapGrid}>
              {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
                <View key={dayIndex} style={styles.activityWeek}>
                  {Array.from({ length: 25 }, (_, weekIndex) => (
                    <View
                      key={`${dayIndex}-${weekIndex}`}
                      style={[
                        styles.activityDay,
                        { backgroundColor: getActivityColor(habitHeatmapData[dayIndex]?.[weekIndex] || 0) }
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
            
            <View style={styles.heatmapLegend}>
              <Text style={styles.legendText}>No activity</Text>
              <View style={styles.legendSquares}>
                {[0, 1].map((isActive) => (
                  <View
                    key={isActive}
                    style={[
                      styles.legendSquare,
                      { backgroundColor: getActivityColor(isActive) }
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.legendText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Section 3: Key Statistics */}
        <View style={styles.section3Card}>
          <View style={styles.keyStatsGrid}>
            <View style={styles.keyStatCard}>
              <Text style={styles.keyStatValue}>{computedTotalStats.totalAdded}</Text>
              <Text style={styles.keyStatLabel}>Total Vocabulary</Text>
            </View>
            <View style={styles.keyStatCard}>
              <Text style={styles.keyStatValue}>{computedTotalStats.totalMastered}</Text>
              <Text style={styles.keyStatLabel}>Words Mastered</Text>
            </View>
          </View>
          <View style={styles.keyStatsGrid}>
            <View style={styles.keyStatCard}>
              <Text style={styles.keyStatValue}>
                {computedTotalStats.totalAdded > 0 
                  ? Math.round((computedTotalStats.totalMastered / computedTotalStats.totalAdded) * 100)
                  : 0}%
              </Text>
              <Text style={styles.keyStatLabel}>Success Rate</Text>
            </View>
            <View style={styles.keyStatCard}>
              <Text style={styles.keyStatValue}>{computedTodayProgress.wordsAdded}</Text>
              <Text style={styles.keyStatLabel}>Words Today</Text>
            </View>
          </View>
        </View>


      </ScrollView>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
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
  performanceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  performanceTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: RADIUS.md,
    padding: 2,
  },
  periodTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    minWidth: 32,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: colors.cardBackground,
    ...SHADOWS.sm,
  },
  periodTabText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textSecondary,
  },
  periodTabTextActive: {
    color: colors.textPrimary,
  },
  // Section 1: Circular Statistics
  circularSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  circularContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circularProgressContainer: {
    flex: 1,
    alignItems: 'center',
  },
  circularProgress: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryLight || colors.gray100,
    borderWidth: 8,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularValue: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
  },
  circularLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  sideMetrics: {
    flex: 1,
    gap: SPACING.lg,
    paddingLeft: SPACING.lg,
  },
  sideMetricItem: {
    alignItems: 'center',
  },
  sideMetricEmoji: {
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  sideMetricValue: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
  },
  sideMetricLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
  },
  
  // Section 2: Heatmap (existing styles work)
  heatmapGrid: {
    flexDirection: 'column',
    gap: 2,
    justifyContent: 'center',
  },
  
  // Section 3: Key Metrics
  keyMetricsSection: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  keyMetricsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  keyMetricCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  keyMetricValue: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  keyMetricLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  progressComparison: {
    fontSize: TYPOGRAPHY.base,
    color: colors.success,
    fontWeight: TYPOGRAPHY.medium,
  },
  streakCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  streakTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  currentStreak: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  bestStreak: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.gray200,
    marginHorizontal: SPACING.xl,
  },
  streakEmoji: {
    fontSize: TYPOGRAPHY['2xl'],
    marginRight: SPACING.md,
  },
  streakNumber: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
  },
  streakLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  streakMotivation: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  activityTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  activitySubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.xl,
  },
  habitHeatmapContainer: {
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  habitGrid: {
    gap: 2, // Smaller gap between rows
  },
  habitRow: {
    flexDirection: 'row',
    gap: 2, // Smaller gap between squares in a row
  },
  habitSquare: {
    width: 11.6, // Slightly bigger squares
    height: 11.6, // Slightly bigger squares
    borderRadius: 2, // Slightly bigger border radius
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  legendText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
  },
  legendSquares: {
    flexDirection: 'row',
    gap: 2,
  },
  legendSquare: {
    width: 11.6,
    height: 11.6,
    borderRadius: 2,
  },
  // Section 2 & 3 Styles
  section2Card: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  section3Card: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  keyStatsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  keyStatCard: {
    flex: 1,
    backgroundColor: colors.gray200,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  keyStatValue: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  keyStatLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.xl,
  },
  heatmapContainer: {
    alignItems: 'center',
  },
  toggleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  // Missing heatmap styles
  activityWeek: {
    flexDirection: 'row',
    gap: 2,
  },
  activityDay: {
    width: 11.6,
    height: 11.6,
    borderRadius: 2,
  },
  // Chart Header Styles
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  chartTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  // Streak and Mastered Section Styles
  streakMasteredRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  streakMasteredItem: {
    alignItems: 'center',
  },
  streakMasteredEmoji: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  streakMasteredValue: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  streakMasteredLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Section 1 Card Style
  section1Card: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  // Scaled & Centered Chart Styles
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
    overflow: 'hidden',
    width: '100%',
  },
  circularChartsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Area Chart Styles
  areaChartWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  svgChart: {
    marginBottom: SPACING.sm,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    paddingHorizontal: SPACING.xs,
  },
  xAxisLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
  
  // Premium Teaser Styles
  premiumTeaserCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: colors.primary,
    ...SHADOWS.md,
  },
  premiumTeaserHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  premiumTeaserTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  premiumBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.white,
  },
  premiumTeaserDescription: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  premiumFeaturesList: {
    marginBottom: SPACING.md,
  },
  premiumFeature: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  premiumCTA: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
    textAlign: 'center',
  },
  
  // Upgrade message styles
  upgradeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  upgradeCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.md,
  },
  upgradeIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  upgradeTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  upgradeSubtitle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  benefitsList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  benefitText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    flex: 1,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.white,
  },
})