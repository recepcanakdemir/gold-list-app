import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { SharedHeader } from '@/components/shared-header'

const { width: screenWidth } = Dimensions.get('window')

export default function DashboardScreen() {
  const router = useRouter()
  const { profile, resetUserStreak } = useAuth()
  const { appState, refreshNotebooks } = useApp()
  const { colors } = useTheme()
  const { currentSimulatedDay } = useDevTime()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week')
  const [currentPage, setCurrentPage] = useState(0)
  const [weeklyData, setWeeklyData] = useState([
    { day: 'Mon', words: 0, completed: false },
    { day: 'Tue', words: 0, completed: false },
    { day: 'Wed', words: 0, completed: false },
    { day: 'Thu', words: 0, completed: false },
    { day: 'Fri', words: 0, completed: false },
    { day: 'Sat', words: 0, completed: false },
    { day: 'Sun', words: 0, completed: false },
  ])
  const [activityData, setActivityData] = useState<number[][]>([])
  const [todayProgress, setTodayProgress] = useState({
    wordsAdded: 0,
    goal: 20,
    completed: false
  })
  const insets = useSafeAreaInsets()

  useEffect(() => {
    refreshNotebooks()
  }, [])

  // Load dashboard data when profile becomes available or simulation day changes
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
      const [weekly, today, dailyProgress] = await Promise.all([
        supabaseService.getWeeklyProgress(),
        supabaseService.getTodayProgress(),
        supabaseService.getDailyProgress(25 * 7) // Get last ~6 months for heatmap
      ])
      
      setWeeklyData(weekly)
      setTodayProgress(today)
      
      // Generate activity heatmap from daily progress data
      const heatmapData = generateRealHeatmap(dailyProgress)
      setActivityData(heatmapData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Keep default empty data if there's an error
    }
  }

  const generateRealHeatmap = (dailyProgress: {
    date: string
    wordsAdded: number
    wordsReviewed: number
    accuracy: number
  }[]) => {
    const rows = 7
    const cols = 25
    const heatmapData = []
    
    // Initialize with empty data
    for (let row = 0; row < rows; row++) {
      const rowData = []
      for (let col = 0; col < cols; col++) {
        rowData.push(0)
      }
      heatmapData.push(rowData)
    }
    
    // Fill with real data if available
    if (dailyProgress && dailyProgress.length > 0) {
      dailyProgress.forEach((day, index) => {
        if (index < rows * cols) {
          const row = index % rows
          const col = Math.floor(index / rows)
          if (col < cols) {
            // Convert words added to intensity (0-4)
            const intensity = Math.min(4, Math.floor(day.wordsAdded / 5)) // 5 words = 1 intensity level
            heatmapData[row][col] = intensity
          }
        }
      })
    }
    
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

  const handleResetStreak = () => {
    Alert.alert(
      'Reset Streak',
      'Reset streak to 0? This is for testing only.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: resetUserStreak
        }
      ]
    )
  }

  // Performance data using real stats
  const getPerformanceData = () => {
    const totalWordsAdded = profile?.total_words_added || 0
    const weeklyTotal = weeklyData.reduce((total, day) => total + day.words, 0)
    
    switch (selectedPeriod) {
      case 'week':
        return {
          current: weeklyTotal,
          target: todayProgress.goal * 7, // Daily goal * 7 days
          comparison: `${weeklyTotal} words this week`,
          trend: weeklyTotal > 0 ? 'up' : 'neutral'
        }
      case 'month':
        return {
          current: Math.min(totalWordsAdded, totalWordsAdded), // Approximate month total
          target: todayProgress.goal * 30, // Daily goal * 30 days
          comparison: `${totalWordsAdded} total words`,
          trend: totalWordsAdded > 0 ? 'up' : 'neutral'
        }
      case 'year':
        return {
          current: totalWordsAdded,
          target: todayProgress.goal * 365, // Daily goal * 365 days
          comparison: `${totalWordsAdded} words overall`,
          trend: totalWordsAdded > 0 ? 'up' : 'neutral'
        }
    }
  }

  const performanceData = getPerformanceData()

  const getActivityColor = (intensity: number) => {
    // GitHub's authentic green color scale (light mode)
    const activityColors = [
      '#ebedf0',   // 0 - no activity (GitHub's exact gray)
      '#9be9a8',   // 1 - few contributions (GitHub's lightest green)
      '#40c463',   // 2 - some contributions (GitHub's light green)
      '#30a14e',   // 3 - many contributions (GitHub's medium green)
      '#216e39',   // 4 - most contributions (GitHub's darkest green)
    ]
    return activityColors[intensity] || activityColors[0]
  }

  // Use real activity data or fallback to empty
  const habitHeatmapData = activityData.length > 0 ? activityData : [
    Array(25).fill(0),
    Array(25).fill(0),
    Array(25).fill(0),
    Array(25).fill(0),
    Array(25).fill(0),
    Array(25).fill(0),
    Array(25).fill(0),
  ]


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
        <SharedHeader title="Dashboard" />

        {/* Performance Overview */}
        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>Your Progress</Text>
            <View style={styles.periodTabs}>
              {(['week', 'month', 'year'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodTab,
                    selectedPeriod === period && styles.periodTabActive
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[
                    styles.periodTabText,
                    selectedPeriod === period && styles.periodTabTextActive
                  ]}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressValue}>{performanceData.current}</Text>
              <Text style={styles.progressTarget}>of {performanceData.target} words</Text>
            </View>
            
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { width: `${(performanceData.current / performanceData.target) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressPercentage}>
                {Math.round((performanceData.current / performanceData.target) * 100)}%
              </Text>
            </View>
            
            <Text style={styles.progressComparison}>
              📈 {performanceData.comparison}
            </Text>
          </View>
        </View>

        {/* Learning Streaks */}
        <View style={styles.streakCard}>
          <Text style={styles.streakTitle}>Learning Streak</Text>
          
          <View style={styles.streakContainer}>
            <View style={styles.currentStreak}>
              <Text style={styles.streakEmoji}>🔥</Text>
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.resetStreakButton}
                  onPress={handleResetStreak}
                >
                  <Text style={styles.resetStreakIcon}>🔄</Text>
                </TouchableOpacity>
              )}
              <View>
                <Text style={styles.streakNumber}>{profile?.streak_count || 0}</Text>
                <Text style={styles.streakLabel}>days</Text>
              </View>
            </View>
            
            <View style={styles.streakDivider} />
            
            <View style={styles.bestStreak}>
              <Text style={styles.streakEmoji}>🏆</Text>
              <View>
                <Text style={styles.streakNumber}>{Math.max(profile?.streak_count || 0, 0)}</Text>
                <Text style={styles.streakLabel}>best</Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.streakMotivation}>
            Keep it up! You&apos;re doing great! 💪
          </Text>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.activityCard}>
          <Text style={styles.activityTitle}>Learning Activity</Text>
          <Text style={styles.activitySubtitle}>Your daily learning pattern over time</Text>
          
          {/* Habit tracker heatmap */}
          <View style={styles.habitHeatmapContainer}>
            <View style={styles.habitGrid}>
              {habitHeatmapData.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.habitRow}>
                  {row.map((intensity, colIndex) => (
                    <View
                      key={colIndex}
                      style={[
                        styles.habitSquare,
                        { backgroundColor: getActivityColor(intensity) }
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.heatmapLegend}>
            <Text style={styles.legendText}>Less</Text>
            <View style={styles.legendSquares}>
              {[0, 1, 2, 3, 4].map((intensity) => (
                <View
                  key={intensity}
                  style={[
                    styles.legendSquare,
                    { backgroundColor: getActivityColor(intensity) }
                  ]}
                />
              ))}
            </View>
            <Text style={styles.legendText}>More</Text>
          </View>
        </View>

        {/* Weekly Activity */}
        <View style={styles.weeklyCard}>
          <Text style={styles.weeklyTitle}>This Week</Text>
          
          <View style={styles.weeklyGrid}>
            {weeklyData.map((dayData, index) => {
              const isActive = dayData.words > 0
              const dayLetter = dayData.day.charAt(0)
              return (
                <View key={index} style={styles.dayContainer}>
                  <View style={[
                    styles.dayCircle,
                    { backgroundColor: isActive ? colors.primary : colors.gray200 }
                  ]}>
                    <Text style={[
                      styles.dayText,
                      { color: isActive ? colors.cardBackground : colors.textSecondary }
                    ]}>
                      {dayLetter}
                    </Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>📚</Text>
                <Text style={styles.metricValue}>{profile?.total_words_added || 0}</Text>
              </View>
              <Text style={styles.metricLabel}>Total Vocabulary</Text>
              <Text style={styles.metricChange}>+{weeklyData.reduce((total, day) => total + day.words, 0)} this week</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>⭐</Text>
                <Text style={styles.metricValue}>{profile?.total_words_mastered || 0}</Text>
              </View>
              <Text style={styles.metricLabel}>Words Mastered</Text>
              <Text style={styles.metricChange}>learning in progress</Text>
            </View>
          </View>
          
          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>🎯</Text>
                <Text style={styles.metricValue}>
                  {profile?.total_words_added && profile?.total_words_added > 0 
                    ? Math.round((profile.total_words_mastered / profile.total_words_added) * 100)
                    : 0}%
                </Text>
              </View>
              <Text style={styles.metricLabel}>Success Rate</Text>
              <Text style={styles.metricChangeGreen}>keep learning!</Text>
            </View>
            
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>⚡</Text>
                <Text style={styles.metricValue}>{todayProgress.wordsAdded}</Text>
              </View>
              <Text style={styles.metricLabel}>Words Today</Text>
              <Text style={styles.metricChange}>of {todayProgress.goal} goal</Text>
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
  progressContainer: {
    alignItems: 'center',
  },
  progressHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  progressValue: {
    fontSize: TYPOGRAPHY['4xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
  },
  progressTarget: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    backgroundColor: colors.gray200,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: RADIUS.sm,
  },
  progressPercentage: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
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
  resetStreakButton: {
    marginLeft: -4,
    marginRight: SPACING.xs,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    opacity: 0.7,
  },
  resetStreakIcon: {
    fontSize: 16,
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
  weeklyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  weeklyTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  metricsContainer: {
    paddingHorizontal: SPACING.xl,
  },
  metricRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  metricIcon: {
    fontSize: TYPOGRAPHY.xl,
    marginRight: SPACING.sm,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  metricChange: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  metricChangeGreen: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.success,
  },
})