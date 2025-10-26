/**
 * Homepage with Unified Redux Store - Instagram-like Responsiveness
 * 
 * This is a simplified, high-performance version of the homepage that uses
 * the unified Redux store for instant UI updates without competing state systems.
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
import CountryFlag from 'react-native-country-flag'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useInstantUpdates } from '@/lib/hooks/useInstantUpdates'
import { useAppDispatch, useAppSelector } from '@/lib/store'
import { fetchNotebooks } from '@/lib/store/slices/notebooksSlice'
import { fetchStreakData } from '@/lib/store/slices/streakSlice'
import { fetchWeeklyProgress } from '@/lib/store/slices/progressSlice'
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
  const dispatch = useAppDispatch()
  const { profile } = useAuth()
  const { colors, isDark } = useTheme()
  const { getCurrentDate } = useDevTime()
  const { subscription, showPaywallModal } = useSubscription()
  const { protectedNavigateToAddWords } = useRouteProtection()
  
  // ✨ UNIFIED STATE: Single source of truth from Redux store
  const {
    addWords,
    completeReviews,
    getButtonState,
    getNotebookProgress,
    predictedStreak,
    dashboardStats,
    notebooks
  } = useInstantUpdates()
  
  // Redux state (instant access, no loading delays)
  const { 
    notebooks: notebooksState,
    isLoading: notebooksLoading 
  } = useAppSelector(state => state.notebooks)
  
  const { 
    weeklyProgress,
    isLoading: progressLoading 
  } = useAppSelector(state => state.progress)
  
  const [refreshing, setRefreshing] = useState(false)
  const [currentCarouselPage, setCurrentCarouselPage] = useState(0)
  const screenWidth = Dimensions.get('window').width
  const insets = useSafeAreaInsets()

  // ✨ INITIAL LOAD: Fetch data once on mount (background sync)
  useEffect(() => {
    if (profile?.id) {
      // Parallel loading for instant app startup
      Promise.all([
        dispatch(fetchNotebooks()),
        dispatch(fetchStreakData()),
        dispatch(fetchWeeklyProgress())
      ])
    }
  }, [dispatch, profile?.id])

  // ✨ PAYWALL: Show on launch for new users
  useEffect(() => {
    if (profile && subscription) {
      const shouldShowPaywall = !subscription.isActive && 
                                !subscription.isInTrial && 
                                !subscription.trialStartedAt &&
                                subscription.tier === 'free'
      
      if (shouldShowPaywall) {
        setTimeout(() => {
          if (!subscription.isActive && !subscription.isInTrial && subscription.tier === 'free') {
            showPaywallModal()
          }
        }, 1000)
      }
    }
  }, [profile, subscription, showPaywallModal])

  // ✨ REFRESH: Manual refresh (pull-to-refresh)
  const handleRefresh = useCallback(async () => {
    if (!profile?.id) return
    
    setRefreshing(true)
    try {
      await Promise.all([
        dispatch(fetchNotebooks()),
        dispatch(fetchStreakData()),
        dispatch(fetchWeeklyProgress())
      ])
    } finally {
      setRefreshing(false)
    }
  }, [dispatch, profile?.id])

  // ✨ NAVIGATION: Handle button press with instant feedback
  const handleNotebookPress = useCallback(async (notebookId: string) => {
    const buttonState = getButtonState(notebookId)
    
    if (buttonState.type === 'reviews') {
      // Navigate to review screen
      router.push(`/notebook/${notebookId}/review`)
    } else if (buttonState.type === 'words') {
      // Navigate to word input with subscription protection
      await protectedNavigateToAddWords(notebookId)
    } else {
      // Navigate to notebook detail
      router.push(`/notebook/${notebookId}`)
    }
  }, [getButtonState, router, protectedNavigateToAddWords])

  // Notebook carousel component
  const renderNotebookCard = useCallback((notebook: any, index: number) => {
    const buttonState = getButtonState(notebook.id)
    const progress = getNotebookProgress(notebook.id)
    const countryCode = getCountryCodeFromLanguage(notebook.target_language)
    
    const getButtonColor = () => {
      switch (buttonState.priority) {
        case 'high': return '#FF6B6B' // High priority (reviews)
        case 'medium': return colors.primary // Medium priority (words)
        case 'low': return '#4ECDC4' // Low priority (complete)
        default: return colors.primary
      }
    }

    return (
      <View key={notebook.id} style={[styles.notebookCard, { backgroundColor: colors.surface }]}>
        <View style={styles.notebookHeader}>
          <View style={styles.notebookInfo}>
            <View style={styles.languageRow}>
              {countryCode && (
                <CountryFlag isoCode={countryCode} size={20} style={styles.flag} />
              )}
              <Text style={[styles.notebookTitle, { color: colors.text }]}>
                {notebook.title}
              </Text>
            </View>
            <Text style={[styles.notebookType, { color: colors.textSecondary }]}>
              {notebook.notebook_type} • {progress.wordsAdded}/{progress.goal} words today
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: progress.completed ? '#4ECDC4' : colors.primary,
                  width: `${Math.min(100, (progress.wordsAdded / progress.goal) * 100)}%`
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progress.completed ? 'Complete!' : `${progress.goal - progress.wordsAdded} words left`}
          </Text>
        </View>

        {/* Action button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: getButtonColor() }]}
          onPress={() => handleNotebookPress(notebook.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>
            {buttonState.text}
          </Text>
          <MaterialIcons 
            name={buttonState.type === 'reviews' ? 'quiz' : 'add'} 
            size={20} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
    )
  }, [getButtonState, getNotebookProgress, colors, handleNotebookPress])

  // Quick stats component
  const renderQuickStats = useCallback(() => (
    <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.primary }]}>
          {predictedStreak}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Day Streak
        </Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.primary }]}>
          {dashboardStats.wordsThisWeek}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          This Week
        </Text>
      </View>
      
      <View style={styles.statDivider} />
      
      <View style={styles.statItem}>
        <Text style={[styles.statNumber, { color: colors.primary }]}>
          {dashboardStats.totalWords}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Total Words
        </Text>
      </View>
    </View>
  ), [predictedStreak, dashboardStats, colors])

  // Loading state
  if (notebooksLoading && notebooksState.length === 0) {
    return <LoadingIndicator />
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SharedHeader
        title="My Notebooks"
        rightElement={<DevTimeDisplay />}
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
        {/* Quick Stats */}
        {renderQuickStats()}

        {/* Notebooks */}
        <View style={styles.notebooksSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Today's Focus
          </Text>
          
          {notebooksState.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <MaterialIcons name="book" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Notebooks Yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create your first notebook to start learning
              </Text>
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/modal/create-notebook')}
              >
                <Text style={styles.createButtonText}>Create Notebook</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const page = Math.round(event.nativeEvent.contentOffset.x / screenWidth)
                setCurrentCarouselPage(page)
              }}
            >
              {notebooksState.map((notebook, index) => (
                <View key={notebook.id} style={{ width: screenWidth - 32 }}>
                  {renderNotebookCard(notebook, index)}
                </View>
              ))}
            </ScrollView>
          )}
          
          {/* Page indicators */}
          {notebooksState.length > 1 && (
            <View style={styles.pageIndicators}>
              {notebooksState.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pageIndicator,
                    {
                      backgroundColor: index === currentCarouselPage 
                        ? colors.primary 
                        : colors.border
                    }
                  ]}
                />
              ))}
            </View>
          )}
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
  statsContainer: {
    flexDirection: 'row',
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: SPACING.md,
  },
  notebooksSection: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    marginBottom: SPACING.md,
  },
  notebookCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.xs,
    ...SHADOWS.sm,
  },
  notebookHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  notebookInfo: {
    flex: 1,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  flag: {
    marginRight: SPACING.sm,
  },
  notebookTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
  },
  notebookType: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  progressContainer: {
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  actionButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  pageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.base,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  createButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  createButtonText: {
    color: 'white',
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
})