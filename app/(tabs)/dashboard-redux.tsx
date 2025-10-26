/**
 * Dashboard with Unified Redux Store - Instagram-like Responsiveness
 * 
 * This is a simplified, high-performance version of the dashboard that uses
 * the unified Redux store for instant UI updates without React Query complexity.
 */

import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useInstantUpdates } from '@/lib/hooks/useInstantUpdates'
import { useAppDispatch, useAppSelector } from '@/lib/store'
import { 
  fetchDashboardStats, 
  fetchWeeklyProgress, 
  fetchHeatmapData 
} from '@/lib/store/slices/progressSlice'
import { fetchNotebooks } from '@/lib/store/slices/notebooksSlice'
import { fetchStreakData } from '@/lib/store/slices/streakSlice'
import { SharedHeader } from '@/components/shared-header'
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { LoadingIndicator } from '@/components/LoadingIndicator'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
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
    <View style={styles.circularProgressContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
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
      
      <View style={styles.circularProgressTextContainer}>
        <Text style={[styles.circularProgressTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.circularProgressSubtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  )
}

// Weekly Progress Component
function WeeklyProgressChart() {
  const { colors } = useTheme()
  const { weeklyProgress } = useAppSelector(state => state.progress)

  const maxWords = Math.max(...weeklyProgress.map(day => day.wordsAdded), 1)

  return (
    <View style={[styles.weeklyChart, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        This Week
      </Text>
      
      <View style={styles.chartContainer}>
        {weeklyProgress.map((day, index) => {
          const height = (day.wordsAdded / maxWords) * 80
          
          return (
            <View key={index} style={styles.dayColumn}>
              <View style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: height || 2,
                      backgroundColor: day.goalsCompleted 
                        ? colors.primary 
                        : colors.border
                    }
                  ]}
                />
              </View>
              <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                {day.date.slice(-2)}
              </Text>
              <Text style={[styles.wordsLabel, { color: colors.text }]}>
                {day.wordsAdded}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  const { profile } = useAuth()
  const { colors } = useTheme()
  const { getCurrentDate } = useDevTime()
  const { subscription } = useSubscription()
  const insets = useSafeAreaInsets()
  
  // ✨ UNIFIED STATE: Single source of truth from Redux store
  const {
    dashboardStats,
    predictedStreak,
    notebooks
  } = useInstantUpdates()
  
  // Redux state (instant access, no loading delays)
  const { 
    weeklyProgress,
    heatmapData,
    todayWordsAdded,
    todayGoalCompleted,
    isLoading: progressLoading 
  } = useAppSelector(state => state.progress)
  
  const { 
    notebooks: notebooksState,
    isLoading: notebooksLoading 
  } = useAppSelector(state => state.notebooks)

  const [refreshing, setRefreshing] = useState(false)

  // ✨ INITIAL LOAD: Fetch data once on mount (background sync)
  useEffect(() => {
    if (profile?.id) {
      // Parallel loading for instant app startup
      Promise.all([
        dispatch(fetchDashboardStats()),
        dispatch(fetchWeeklyProgress()),
        dispatch(fetchHeatmapData()),
        dispatch(fetchNotebooks()),
        dispatch(fetchStreakData())
      ])
    }
  }, [dispatch, profile?.id])

  // ✨ REFRESH: Manual refresh (pull-to-refresh)
  const handleRefresh = useCallback(async () => {
    if (!profile?.id) return
    
    setRefreshing(true)
    try {
      await Promise.all([
        dispatch(fetchDashboardStats()),
        dispatch(fetchWeeklyProgress()),
        dispatch(fetchHeatmapData()),
        dispatch(fetchNotebooks()),
        dispatch(fetchStreakData())
      ])
    } finally {
      setRefreshing(false)
    }
  }, [dispatch, profile?.id])

  // Calculate progress percentages
  const todayPercentage = todayWordsAdded >= 20 ? 100 : (todayWordsAdded / 20) * 100
  const weeklyPercentage = dashboardStats.weeklyGoal > 0 
    ? (dashboardStats.wordsThisWeek / dashboardStats.weeklyGoal) * 100 
    : 0
  const streakPercentage = Math.min(100, (predictedStreak / 30) * 100) // 30 day streak = 100%

  // Loading state
  if (progressLoading && weeklyProgress.length === 0) {
    return <LoadingIndicator />
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SharedHeader
        title="Progress Dashboard"
        safeAreaTop={insets.top}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Progress Circles */}
        <View style={styles.progressSection}>
          <View style={styles.progressGrid}>
            <CircularProgress
              percentage={todayPercentage}
              color={todayGoalCompleted ? '#4ECDC4' : colors.primary}
              size={120}
              strokeWidth={8}
              title={`${todayWordsAdded}/20`}
              subtitle="Today"
            />
            
            <CircularProgress
              percentage={weeklyPercentage}
              color={colors.primary}
              size={120}
              strokeWidth={8}
              title={`${dashboardStats.wordsThisWeek}`}
              subtitle="This Week"
            />
            
            <CircularProgress
              percentage={streakPercentage}
              color="#FF6B6B"
              size={120}
              strokeWidth={8}
              title={`${predictedStreak}`}
              subtitle="Day Streak"
            />
          </View>
        </View>

        {/* Weekly Progress Chart */}
        <WeeklyProgressChart />

        {/* Quick Stats */}
        <View style={[styles.statsGrid, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Stats
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="library-books" size={24} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {dashboardStats.totalWords}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Total Words
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="trending-up" size={24} color="#4ECDC4" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {Math.round(dashboardStats.completionRate)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Completion Rate
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <MaterialIcons name="book" size={24} color="#FF6B6B" />
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {notebooksState.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                Active Notebooks
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.actionsSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/')}
          >
            <MaterialIcons name="add" size={24} color="white" />
            <Text style={styles.actionButtonText}>Add Today's Words</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
            onPress={() => router.push('/(tabs)/')}
          >
            <MaterialIcons name="quiz" size={24} color="white" />
            <Text style={styles.actionButtonText}>Review Words</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  progressSection: {
    padding: SPACING.lg,
  },
  progressGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circularProgressTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
  },
  circularProgressSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  weeklyChart: {
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    marginBottom: SPACING.md,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  bar: {
    width: 20,
    borderRadius: 10,
    minHeight: 2,
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.medium,
    marginBottom: SPACING.xs,
  },
  wordsLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
  },
  statsGrid: {
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statNumber: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    textAlign: 'center',
  },
  actionsSection: {
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
})