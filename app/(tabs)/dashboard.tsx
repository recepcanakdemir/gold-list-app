import { SharedHeader } from '@/components/shared-header'
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/constants/design'
import { useApp } from '@/lib/contexts/AppContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { DailyProgress } from '@/lib/types/goldlist'
import { useRouter, useFocusEffect } from 'expo-router'
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
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
            stroke="#f0f0f0"
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
        textAlign: 'center'
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 12,
        color: '#666',
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
  const { profile } = useAuth()
  const { appState, refreshNotebooks } = useApp()
  const { colors } = useTheme()
  const { currentSimulatedDay, getCurrentDate } = useDevTime()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedChartPeriod, setSelectedChartPeriod] = useState<'week' | 'month'>('week')
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')
  const [currentPage, setCurrentPage] = useState(0)
  const [weeklyData, setWeeklyData] = useState([
    { day: 'Mon', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Tue', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Wed', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Thu', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Fri', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Sat', wordsAdded: 0, wordsRemembered: 0, completed: false },
    { day: 'Sun', wordsAdded: 0, wordsRemembered: 0, completed: false },
  ])
  const [monthlyData, setMonthlyData] = useState<{ month: string; wordsAdded: number; wordsMastered: number }[]>([
    { month: 'Apr', wordsAdded: 0, wordsMastered: 0 },
    { month: 'May', wordsAdded: 0, wordsMastered: 0 },
    { month: 'Jun', wordsAdded: 0, wordsMastered: 0 },
    { month: 'Jul', wordsAdded: 0, wordsMastered: 0 },
    { month: 'Aug', wordsAdded: 0, wordsMastered: 0 },
    { month: 'Sep', wordsAdded: 0, wordsMastered: 0 },
    { month: 'Oct', wordsAdded: 0, wordsMastered: 0 },
  ])
  const [activityData, setActivityData] = useState<number[][]>([])
  const [todayProgress, setTodayProgress] = useState({
    wordsAdded: 0,
    goal: 20,
    completed: false
  })
  const [totalWordsStats, setTotalWordsStats] = useState({
    totalAdded: 0,
    totalMastered: 0
  })
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
        if (__DEV__) console.log('📱 Dashboard - App opened from background, setting refresh flag')
        if (typeof window !== 'undefined') {
          (window as any).appJustOpened = true
        }
      }
      appStateRef.current = nextAppState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription?.remove()
  }, [])

  // Load dashboard data only on initial profile load or simulation day changes
  useEffect(() => {
    if (profile) {
      loadDashboardData()
    }
  }, [profile, currentSimulatedDay]) // Reload when simulation day changes

  const loadDashboardData = async () => {
    // Only load dashboard data if user is authenticated
    if (!profile) {
      return
    }
    
    try {
      console.log(`🔍 Dashboard Debug: Loading data with simulation day ${currentSimulatedDay}`)
      
      const [weekly, today, dailyProgress, monthly, totalStats] = await Promise.all([
        supabaseService.getWeeklyProgress(),
        supabaseService.getTodayProgress(),
        supabaseService.getDailyProgress(25 * 7), // Get last ~6 months for heatmap
        supabaseService.getMonthlyProgress(), // Get last 7 months for chart
        supabaseService.getTotalWordsStats() // Get real-time total words stats
      ])
      
      console.log(`🔍 Dashboard Debug: Weekly data received:`, weekly)
      console.log(`🔍 Dashboard Debug: Today progress:`, today)
      console.log(`🔍 Dashboard Debug: Total words stats:`, totalStats)
      
      setWeeklyData(weekly)
      setTodayProgress(today)
      setMonthlyData(monthly)
      setTotalWordsStats(totalStats)
      
      // Generate activity heatmap from daily progress data
      const heatmapData = generateRealHeatmap(dailyProgress)
      setActivityData(heatmapData)
      
      // One-time sync of profile stats to fix any inconsistencies
      try {
        if (profile?.total_words_added === 0 && profile?.total_words_mastered === 0 && totalStats.totalAdded > 0) {
          console.log('🔄 Syncing profile stats to fix cached values...')
          await supabaseService.syncProfileStats()
        }
      } catch (syncError) {
        console.warn('Profile sync failed (non-critical):', syncError)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Keep default empty data if there's an error
    }
  }

  const generateRealHeatmap = (dailyProgress: DailyProgress[]) => {
    const rows = 7 // Days of week (Sunday = 0, Monday = 1, ..., Saturday = 6)
    const cols = 25 // Weeks to show (~6 months)
    
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
      dailyProgress.forEach((day) => {
        // Parse the date from the daily progress
        const dayDate = new Date(day.date + 'T00:00:00.000Z') // Ensure UTC parsing
        
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
        
        // Only show days within our 25-week window
        if (col >= 0 && col < cols) {
          const dayOfWeek = dayDate.getUTCDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
          const row = dayOfWeek
          
          if (row >= 0 && row < rows) {
            // Binary: 1 if any words added, 0 if no activity
            const isActive = day.wordsAdded > 0 ? 1 : 0
            heatmapData[row][col] = isActive
          }
        }
      })
    }
    
    console.log('🗓️ Generated GitHub-style shifting heatmap with weekly progression')
    return heatmapData
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      refreshNotebooks(),
      loadDashboardData()
    ])
    setRefreshing(false)
  }

  // Smart focus-based updates: Only refresh when data actually changes
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  
  useFocusEffect(
    useCallback(() => {
      // Check for data change flags first
      if (typeof window !== 'undefined') {
        const wordsJustAdded = (window as any).wordsJustAdded
        const reviewsJustCompleted = (window as any).reviewsJustCompleted
        const appJustOpened = (window as any).appJustOpened
        
        if (wordsJustAdded || reviewsJustCompleted || appJustOpened) {
          if (__DEV__) console.log('📊 Dashboard refresh triggered by data change')
          
          // Clear flags safely
          try {
            if ((window as any).wordsJustAdded !== undefined) {
              delete (window as any).wordsJustAdded
            }
            if ((window as any).reviewsJustCompleted !== undefined) {
              delete (window as any).reviewsJustCompleted
            }
            if ((window as any).appJustOpened !== undefined) {
              delete (window as any).appJustOpened
            }
          } catch (e) {
            // Fallback if delete fails
            (window as any).wordsJustAdded = undefined
            (window as any).reviewsJustCompleted = undefined
            (window as any).appJustOpened = undefined
          }
          
          // Trigger refresh
          loadDashboardData()
          return // Skip normal focus logic
        }
      }
      
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
    const totalWordsAdded = totalWordsStats.totalAdded > 0 ? totalWordsStats.totalAdded : (profile?.total_words_added || 0)
    const totalWordsMastered = totalWordsStats.totalMastered > 0 ? totalWordsStats.totalMastered : (profile?.total_words_mastered || 0)
    const masteryRate = totalWordsAdded > 0 ? Math.round((totalWordsMastered / totalWordsAdded) * 100) : 0
    
    if (selectedChartPeriod === 'week') {
      // Calculate start of current week (Monday)
      const startOfWeek = new Date(currentDate)
      const dayOfWeek = startOfWeek.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert Sunday (0) to 6, others stay same
      startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday)
      startOfWeek.setHours(0, 0, 0, 0)
      
      // Sum up words added from current week only
      let thisWeekWordsAdded = 0
      
      weeklyData.forEach((dayData, index) => {
        // Calculate the actual date for this day in weeklyData
        const dayDate = new Date(currentDate)
        dayDate.setDate(dayDate.getDate() - (6 - index)) // weeklyData goes from oldest to newest
        dayDate.setHours(0, 0, 0, 0)
        
        // Only count if this day is in current week
        if (dayDate >= startOfWeek && dayDate <= currentDate) {
          thisWeekWordsAdded += dayData.wordsAdded
        }
      })
      
      const weeklyGoal = totalDailyGoal * 7
      const addedProgress = weeklyGoal > 0 ? Math.min(100, Math.round((thisWeekWordsAdded / weeklyGoal) * 100)) : 0
      
      return {
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
    } else {
      // Calculate start of current month (1st day)
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      startOfMonth.setHours(0, 0, 0, 0)
      
      // Calculate days in current month for accurate goal
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
      
      // Sum up words added from current month only
      let thisMonthWordsAdded = 0
      
      monthlyData.forEach((monthData) => {
        // Check if this month entry corresponds to current month
        // monthlyData uses month abbreviations like 'Jan', 'Feb', etc.
        const currentMonthAbbr = currentDate.toLocaleDateString('en-US', { month: 'short' })
        if (monthData.month === currentMonthAbbr) {
          thisMonthWordsAdded = monthData.wordsAdded
        }
      })
      
      const monthlyGoal = totalDailyGoal * daysInMonth
      const addedProgress = monthlyGoal > 0 ? Math.min(100, Math.round((thisMonthWordsAdded / monthlyGoal) * 100)) : 0
      
      return {
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
    }
  }, [selectedChartPeriod, weeklyData, monthlyData, appState.notebooks, getCurrentDate, profile, totalWordsStats])

  // Circular chart data based on selected period
  const getCircularData = () => {
    const weeklyTotal = weeklyData.reduce((total, day) => total + day.wordsAdded, 0)
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
    // Binary color system: gray (no activity) or green (active)
    const activityColors = [
      '#ebedf0',   // 0 - no activity (GitHub's gray)
      '#40c463',   // 1 - active day (GitHub's green)
    ]
    return activityColors[isActive] || activityColors[0]
  }

  // Use real activity data or fallback to empty (7 rows × 25 columns)
  const habitHeatmapData = activityData.length > 0 ? activityData : 
    Array.from({ length: 7 }, () => Array(25).fill(0))


  const styles = createStyles(colors)

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
              color="#EF4444"
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
              <Text style={styles.streakMasteredValue}>{totalWordsStats.totalMastered}</Text>
              <Text style={styles.streakMasteredLabel}>Total Mastered</Text>
            </View>
          </View>
        </View>

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
              <Text style={styles.keyStatValue}>{totalWordsStats.totalAdded}</Text>
              <Text style={styles.keyStatLabel}>Total Vocabulary</Text>
            </View>
            <View style={styles.keyStatCard}>
              <Text style={styles.keyStatValue}>{totalWordsStats.totalMastered}</Text>
              <Text style={styles.keyStatLabel}>Words Mastered</Text>
            </View>
          </View>
          <View style={styles.keyStatsGrid}>
            <View style={styles.keyStatCard}>
              <Text style={styles.keyStatValue}>
                {totalWordsStats.totalAdded > 0 
                  ? Math.round((totalWordsStats.totalMastered / totalWordsStats.totalAdded) * 100)
                  : 0}%
              </Text>
              <Text style={styles.keyStatLabel}>Success Rate</Text>
            </View>
            <View style={styles.keyStatCard}>
              <Text style={styles.keyStatValue}>{todayProgress.wordsAdded}</Text>
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
    backgroundColor: colors.gray50 || colors.gray100,
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
})