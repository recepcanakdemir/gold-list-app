import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { NotebookWithStats } from '@/lib/types/goldlist'
import { getBadgeType, getBadgeInfo } from '@/lib/utils/badgeUtils'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { SharedHeader } from '@/components/shared-header'
import { DevTimeDisplay } from '@/components/DevTimeDisplay'


export default function HomeScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { appState, refreshNotebooks } = useApp()
  const { colors } = useTheme()
  const { registerDayChangeCallback, currentSimulatedDay } = useDevTime()
  const [refreshing, setRefreshing] = useState(false)
  const [weekData, setWeekData] = useState([
    { day: 'Mon', words: 0, completed: false },
    { day: 'Tue', words: 0, completed: false },
    { day: 'Wed', words: 0, completed: false },
    { day: 'Thu', words: 0, completed: false },
    { day: 'Fri', words: 0, completed: false },
    { day: 'Sat', words: 0, completed: false },
    { day: 'Sun', words: 0, completed: false },
  ])
  const [todayProgress, setTodayProgress] = useState({
    wordsAdded: 0,
    goal: 20,
    completed: false
  })
  const insets = useSafeAreaInsets()

  useEffect(() => {
    refreshNotebooks()
  }, [])

  // Load progress data when profile becomes available
  useEffect(() => {
    if (profile) {
      loadProgressData()
    }
  }, [profile]) // Only reload when profile changes

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
    } catch (error) {
      console.error('Error loading progress data:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      refreshNotebooks(),
      loadProgressData(),
      checkReviewsOnce() // Check reviews on manual refresh
    ])
    setRefreshing(false)
  }

  const handleCreateNotebook = () => {
    router.push('/modal/create-notebook')
  }

  const handleNotebookPress = (notebook: NotebookWithStats) => {
    router.push(`/notebook/${notebook.id}`)
  }

  const handleBadgePress = (badge: { id: string; badgeType: 'silver' | 'gold' }) => {
    // Navigate to bronze notebook review (words will be filtered by round in the review screen)
    const { bronze } = categorizeNotebooks()
    if (bronze.length > 0) {
      router.push(`/notebook/${bronze[0].id}/review`)
    }
  }

  const handleResetData = async () => {
    try {
      // await supabaseService.resetUserData() // Method doesn't exist
      await refreshNotebooks()
      await loadProgressData()
    } catch (error) {
      console.error('Error resetting data:', error)
    }
  }

  // Simple review state - defaults to false
  const [hasReviewsToday, setHasReviewsToday] = useState(false)
  const [reviewNotebookId, setReviewNotebookId] = useState<string | undefined>()
  const [reviewPageNumber, setReviewPageNumber] = useState<number | undefined>()

  // Check for reviews only when explicitly needed
  const checkReviewsOnce = async () => {
    // Get stack trace to see where this is being called from
    const stack = new Error().stack
    console.log('🔍 REVIEW CHECK CALLED FROM:', stack?.split('\n')[2]?.trim() || 'unknown')
    
    if (!profile) {
      setHasReviewsToday(false)
      return
    }
    
    try {
      console.log('🔄 Checking for reviews (event-driven)...')
      const reviewData = await supabaseService.hasWordsForReviewToday()
      setHasReviewsToday(reviewData.hasReviews)
      setReviewNotebookId(reviewData.notebookId)
      setReviewPageNumber(reviewData.pageNumber)
      console.log(`📅 Reviews available: ${reviewData.hasReviews}`, reviewData.hasReviews ? `(${reviewData.notebookId})` : '')
    } catch (error) {
      console.error('Error checking reviews:', error)
      setHasReviewsToday(false)
    }
  }

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
      console.log('📅 Day changed - checking for reviews')
      checkReviewsOnce()
    })

    return unregister // Cleanup callback when component unmounts
  }, []) // Empty dependency array since registerDayChangeCallback is now stable

  // Check for completed reviews and added words flags to update status
  useEffect(() => {
    const checkForUpdates = () => {
      if (typeof window !== 'undefined') {
        let shouldUpdate = false
        
        if ((window as any).reviewsJustCompleted) {
          console.log('🎉 Reviews were just completed - updating status')
          delete (window as any).reviewsJustCompleted
          shouldUpdate = true
        }
        
        if ((window as any).wordsJustAdded) {
          console.log('📝 Words were just added - updating progress')
          delete (window as any).wordsJustAdded
          shouldUpdate = true
        }
        
        if (shouldUpdate) {
          // Update both review status and today's progress
          checkReviewsOnce()
          loadProgressData()
        }
      }
    }
    
    // Check periodically for the flags
    const interval = setInterval(checkForUpdates, 500)
    
    return () => clearInterval(interval)
  }, [])

  const getTodayStatus = () => {
    if (appState.notebooks.length === 0) return { type: 'no_notebook', text: 'Create Your First Notebook' }
    
    // Always use Bronze notebook for adding new words
    const bronzeNotebook = appState.notebooks.find(n => !n.notebook_level || n.notebook_level === 'bronze')
    if (!bronzeNotebook) return { type: 'no_notebook', text: 'Create Your First Notebook' }
    
    const currentTodayProgress = todayProgress || { wordsAdded: 0, goal: 20, completed: false }
    
    // Priority 1: Reviews available
    if (hasReviewsToday && reviewNotebookId) {
      return { 
        type: 'review', 
        text: 'Review Today\'s Words', 
        route: `/notebook/${reviewNotebookId}/review${reviewPageNumber ? `?page=${reviewPageNumber}` : ''}` 
      }
    }
    
    // Priority 2: Words to add today
    if (!currentTodayProgress.completed) {
      // Calculate current page number (convert 0-based simulation to 1-based page numbers)
      const currentPageNumber = currentSimulatedDay + 1
      return { 
        type: 'add_words', 
        text: 'Add Today\'s Words', 
        route: `/notebook/${bronzeNotebook.id}?focusPage=${currentPageNumber}&openBubble=true` 
      }
    }
    
    // Priority 3: All done for today
    return { type: 'done', text: 'You\'re All Done Today! 🎉', route: null }
  }

  const getPendingReviews = () => {
    return appState.notebooks.reduce((total, notebook) => total + notebook.pendingReviews, 0)
  }


  const getTotalWordsThisWeek = () => {
    return weekData.reduce((total, day) => total + day.words, 0)
  }

  // Helper function to categorize notebooks by level
  const categorizeNotebooks = () => {
    const bronze = appState.notebooks.filter(n => !n.notebook_level || n.notebook_level === 'bronze')
    // Silver and Gold are now handled as badges, not notebooks
    return { bronze }
  }
  
  // State for badges
  const [notebookBadges, setNotebookBadges] = useState<Array<{
    id: string
    badgeType: 'silver' | 'gold'
    totalWords: number
    reviewableWords: number
    bronzeNotebookTitle: string
  }>>([])

  // Load badges for Bronze notebook
  const loadNotebookBadges = async (bronzeNotebookId: string) => {
    try {
      // Get all words from the bronze notebook to check for Silver/Gold rounds
      // Note: This includes words from all rounds, not just reviewable ones
      const allWords = await supabaseService.getWordsForReview(bronzeNotebookId)
      
      const badges = []
      
      // Check for Silver words (rounds 5-8)
      const silverWords = allWords.filter(word => (word as any).current_round >= 5 && (word as any).current_round <= 8)
      if (silverWords.length > 0) {
        badges.push({
          id: `silver-${bronzeNotebookId}`,
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
          id: `gold-${bronzeNotebookId}`,
          badgeType: 'gold' as const,
          totalWords: goldWords.length,
          reviewableWords: goldWords.filter(word => (word as any).status === 'learning').length,
          bronzeNotebookTitle: 'Gold Rounds'
        })
      }
      
      setNotebookBadges(badges)
    } catch (error) {
      console.error('Error loading notebook badges:', error)
      setNotebookBadges([])
    }
  }

  // Load badges when Bronze notebook is available
  useEffect(() => {
    const { bronze } = categorizeNotebooks()
    if (bronze.length > 0) {
      loadNotebookBadges(bronze[0].id)
    }
  }, [appState.notebooks])
  
  const bronzeNotebook = categorizeNotebooks().bronze[0]

  // Component to render integrated bronze notebook with badges
  const renderIntegratedNotebookCard = (bronzeNotebook: NotebookWithStats) => {
    return (
      <View style={styles.mainNotebookCard}>
        {/* Bronze Notebook Header */}
        <View style={styles.notebookHeader}>
          <View style={styles.notebookLevelIndicator}>
            <Text style={styles.levelIcon}>🥉</Text>
            <View>
              <Text style={[styles.levelTitle, { color: colors.warning }]}>Bronze Notebook</Text>
              <Text style={styles.levelSubtitle}>Primary learning</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={() => handleNotebookPress(bronzeNotebook)}
          style={styles.bronzeNotebookContent}
        >
          <Text style={styles.notebookTitle}>
            {bronzeNotebook.title}
          </Text>

          <Text style={styles.notebookSubtitle}>
            {getTotalWordsThisWeek()} words added this week
          </Text>

          <View style={styles.notebookStats}>
            <Text style={styles.totalWords}>
              {stats.totalWords} total • {stats.masteredWords} mastered
            </Text>
          </View>

          {(() => {
            const todayStatus = getTodayStatus()
            return (
              <TouchableOpacity 
                style={[
                  styles.practiceButton,
                  todayStatus.type === 'done' && styles.practiceButtonDone
                ]}
                onPress={() => {
                  if (todayStatus.route) {
                    router.push(todayStatus.route)
                  }
                }}
                disabled={!todayStatus.route}
              >
                <Text style={[
                  styles.practiceButtonText,
                  todayStatus.type === 'done' && styles.practiceButtonTextDone
                ]}>
                  {todayStatus.text}
                </Text>
                {todayStatus.type === 'review' && stats.pendingReviews > 0 && (
                  <View style={styles.reviewBadge}>
                    <Text style={styles.reviewBadgeText}>{stats.pendingReviews}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })()}
        </TouchableOpacity>

        {/* Badge Extensions (Silver/Gold) */}
        {notebookBadges.length > 0 && (
          <View style={styles.extensionsContainer}>
            <View style={styles.extensionsDivider} />
            <Text style={styles.extensionsTitle}>Achievement Badges</Text>
            
            <View style={styles.extensionsList}>
              {notebookBadges.map(badge => (
                <TouchableOpacity 
                  key={badge.id}
                  style={styles.extensionCard}
                  onPress={() => handleBadgePress(badge)}
                >
                  <View style={styles.extensionHeader}>
                    <Text style={styles.extensionIcon}>
                      {badge.badgeType === 'silver' ? '🥈' : '🥇'}
                    </Text>
                    <View style={styles.extensionInfo}>
                      <Text style={styles.extensionName}>
                        {badge.badgeType === 'silver' ? 'Silver' : 'Gold'} • {bronzeNotebook?.title || 'Bronze Notebook'}
                      </Text>
                      <Text style={styles.extensionStats}>
                        {badge.totalWords} words • {badge.reviewableWords} reviewable
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
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
        <SharedHeader title="Gold List" />
        
        {/* Development Reset Button */}
        <TouchableOpacity 
          style={styles.resetButton}
          onPress={handleResetData}
        >
          <Text style={styles.resetButtonText}>🔄 Reset All Data (Dev Only)</Text>
        </TouchableOpacity>

        {/* Development Time Simulation */}
        <DevTimeDisplay />

        {/* Integrated Notebook Display or Empty State */}
        {appState.notebooks.length > 0 ? (
          <View style={styles.notebooksContainer}>
            {(() => {
              const { bronze } = categorizeNotebooks()
              
              return (
                <>
                  {/* Integrated Bronze + Silver/Gold Display */}
                  {bronze.length > 0 && renderIntegratedNotebookCard(bronze[0])}
                  
                  {/* Create First Notebook Button if no Bronze exists */}
                  {bronze.length === 0 && (
                    <TouchableOpacity 
                      style={styles.createNotebookButton}
                      onPress={handleCreateNotebook}
                    >
                      <Text style={styles.createNotebookText}>+ Create Your First Notebook</Text>
                    </TouchableOpacity>
                  )}
                </>
              )
            })()}
          </View>
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
            >
              <Text style={styles.createFirstNotebookText}>Create Your First Notebook</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weekly Progress - Only show if user has notebooks */}
        {appState.notebooks.length > 0 && (
        <View style={styles.progressSection}>
          <Text style={styles.progressTitle}>This Week&apos;s Progress</Text>
          <Text style={styles.progressSubtitle}>Keep up the great work! 🎉</Text>
          
          <View style={styles.weekContainer}>
            {weekData.map((day, index) => {
              const maxWords = Math.max(...weekData.map(d => d.words))
              const heightPercentage = maxWords > 0 ? (day.words / maxWords) * 100 : 0
              
              return (
                <View key={day.day} style={styles.dayColumn}>
                  <View style={styles.barContainer}>
                    <View 
                      style={[
                        styles.progressBar,
                        {
                          height: `${Math.max(heightPercentage, 8)}%`,
                          backgroundColor: day.completed ? colors.success : colors.gray200,
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.dayLabel}>{day.day}</Text>
                  <Text style={styles.wordCount}>{day.words}</Text>
                </View>
              )
            })}
          </View>

          <View style={styles.progressSummary}>
            <Text style={styles.summaryText}>
              You&apos;ve added <Text style={styles.summaryHighlight}>{getTotalWordsThisWeek()} words</Text> this week
            </Text>
          </View>
        </View>
        )}

        {/* Today's Goal - Only show if user has notebooks */}
        {appState.notebooks.length > 0 && (
        <View style={styles.goalSection}>
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>Today&apos;s Goal</Text>
              <Text style={styles.goalEmoji}>🎯</Text>
            </View>
            
            <View style={styles.goalProgress}>
              <View style={styles.goalProgressBg}>
                <View style={[styles.goalProgressFill, { width: `${Math.min((todayProgress.wordsAdded / todayProgress.goal) * 100, 100)}%` }]} />
              </View>
              <Text style={styles.goalProgressText}>
                {todayProgress.wordsAdded} of {todayProgress.goal} words
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.addWordsButton}
              onPress={() => router.push(`/notebook/${appState.notebooks[0]?.id}/input`)}
            >
              <Text style={styles.addWordsButtonText}>Add Words</Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Quick Stats - Only show if user has notebooks */}
        {appState.notebooks.length > 0 && (
        <View style={styles.quickStats}>
          <View style={styles.statRow}>
            <View style={styles.quickStatCard}>
              <Text style={styles.quickStatIcon}>🔥</Text>
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
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  mainNotebookCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
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
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
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
  },
  practiceButtonText: {
    color: colors.cardBackground,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
  },
  practiceButtonDone: {
    backgroundColor: colors.success,
    opacity: 0.8,
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
    ...SHADOWS.lg,
    zIndex: 1000,
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
  levelIcon: {
    fontSize: TYPOGRAPHY.xl,
  },
  levelTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  levelSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
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
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  createNotebookText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
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
})