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
import { useApp } from '@/lib/contexts/AppContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { NotebookWithStats } from '@/lib/types/goldlist'
// Removed unused badge imports
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { SharedHeader } from '@/components/shared-header'
import { DevTimeDisplay } from '@/components/DevTimeDisplay'
import { LoadingIndicator } from '@/components/LoadingIndicator'
import { getCountryCodeFromLanguage } from '@/lib/utils/flagUtils'


export default function HomeScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { appState, refreshNotebooks, updateNotebookLastUsed } = useApp()
  const { colors } = useTheme()
  const { registerDayChangeCallback, currentSimulatedDay } = useDevTime()
  const [refreshing, setRefreshing] = useState(false)
  const screenWidth = Dimensions.get('window').width
  const [currentCarouselPage, setCurrentCarouselPage] = useState(0)
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

  // Reset carousel page when notebooks change
  useEffect(() => {
    setCurrentCarouselPage(0)
  }, [appState.notebooks.length])

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
    if (notebookIdMatch) {
      updateNotebookLastUsed(notebookIdMatch[1])
    }
    
    setIsAddWordsButtonLoading(true)
    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      router.push(route)
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

  // Simple review state - defaults to false
  const [hasReviewsToday, setHasReviewsToday] = useState(false)
  const [reviewNotebookId, setReviewNotebookId] = useState<string | undefined>()
  const [reviewPageNumber, setReviewPageNumber] = useState<number | undefined>()
  
  // PERFORMANCE FIX: Removed per-notebook review state that was causing excessive DB calls
  // Using simple global review detection instead
  
  // Loading states for async operations
  const [isPracticeButtonLoading, setIsPracticeButtonLoading] = useState(false)
  const [isAddWordsButtonLoading, setIsAddWordsButtonLoading] = useState(false)
  const [isCreateNotebookLoading, setIsCreateNotebookLoading] = useState(false)

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


  const getNotebookStatus = (notebook: NotebookWithStats) => {
    if (appState.notebooks.length === 0) return { type: 'no_notebook', text: 'Create Your First Notebook' }
    
    const currentTodayProgress = todayProgress || { wordsAdded: 0, goal: 20, completed: false }
    
    // PERFORMANCE FIX: Use global review detection instead of per-notebook
    // Per-notebook checking was causing severe performance issues
    
    // Priority 1: Reviews available (global detection)
    if (hasReviewsToday && reviewNotebookId === notebook.id) {
      return { 
        type: 'review', 
        text: 'Review Today\'s Words', 
        route: `/notebook/${notebook.id}/review${reviewPageNumber ? `?page=${reviewPageNumber}` : ''}` 
      }
    }
    
    // Priority 2: Words to add today (only for Bronze notebooks)
    if ((!notebook.notebook_level || notebook.notebook_level === 'bronze') && !currentTodayProgress.completed) {
      // Calculate current page number (convert 0-based simulation to 1-based page numbers)
      const currentPageNumber = currentSimulatedDay + 1
      return { 
        type: 'add_words', 
        text: 'Add Today\'s Words', 
        route: `/notebook/${notebook.id}?focusPage=${currentPageNumber}&openBubble=true` 
      }
    }
    
    // Priority 3: All done for today or read-only notebook
    if (notebook.notebook_level === 'silver' || notebook.notebook_level === 'gold') {
      return {
        type: 'info',
        text: `${notebook.notebook_level.charAt(0).toUpperCase() + notebook.notebook_level.slice(1)} Level`,
        route: `/notebook/${notebook.id}`
      }
    }
    
    return { type: 'done', text: 'You\'re All Done Today! 🎉', route: null }
  }

  // Removed unused getPendingReviews function


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
  const [notebookBadges, setNotebookBadges] = useState<{
    id: string
    badgeType: 'silver' | 'gold'
    totalWords: number
    reviewableWords: number
    bronzeNotebookTitle: string
  }[]>([])

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
  
  // PERFORMANCE FIX: Temporarily disabled per-notebook review checking
  // This was causing hundreds of database calls and severe performance issues
  const checkAllNotebookReviews = useCallback(async () => {
    console.log('🚫 Per-notebook review checking DISABLED for performance')
    // Disabled - was causing excessive database calls
    return
  }, [])
  
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

  // Component to render notebook carousel with horizontal scrolling
  const renderNotebookCarousel = () => {
    if (appState.notebooks.length === 0) {
      return null // Empty state will be shown below
    }

    // Sort notebooks by last_used_at (most recent first) - already sorted by service
    const sortedNotebooks = appState.notebooks

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
    // Get badge counts for dynamic styling (only for Bronze notebooks)
    const silverBadge = notebook.notebook_level === 'bronze' ? notebookBadges.find(badge => badge.badgeType === 'silver') : undefined
    const goldBadge = notebook.notebook_level === 'bronze' ? notebookBadges.find(badge => badge.badgeType === 'gold') : undefined
    
    // Modern unified card styling
    const getCardStyle = () => {
      return styles.mainNotebookCard
    }

    return (
      <View style={getCardStyle()}>
        <TouchableOpacity 
          onPress={() => handleNotebookPress(notebook)}
          style={styles.notebookCardContent}
        >
          {/* Notebook Header with Icon and Flag */}
          <View style={styles.gameNotebookHeader}>
            <View style={[
              styles.notebookIcon,
              notebook.notebook_level === 'silver' && styles.silverNotebookIcon,
              notebook.notebook_level === 'gold' && styles.goldNotebookIcon
            ]}>
              <Text style={styles.notebookEmoji}>
                {notebook.notebook_level === 'bronze' ? '📚' : 
                 notebook.notebook_level === 'silver' ? '🥈' : '🥇'}
              </Text>
            </View>
            <View style={styles.notebookHeaderText}>
              <View style={styles.notebookTitleWithFlag}>
                <CountryFlag 
                  isoCode={getCountryCodeFromLanguage(notebook.language_code)} 
                  size={20} 
                  style={styles.notebookFlag}
                />
                <Text style={styles.gameNotebookTitle}>{notebook.title}</Text>
              </View>
              <Text style={styles.gameNotebookSubtitle}>
                {index === 0 ? `${getTotalWordsThisWeek()} words this week` : `${notebook.totalWords || 0} total words`}
              </Text>
            </View>
          </View>

          {/* Progress Dots - Game Style (only for Bronze notebooks) */}
          {notebook.notebook_level === 'bronze' && (
            <View style={styles.progressDotsContainer}>
              {/* Bronze Dot */}
              <View style={styles.progressDot}>
                <View style={[styles.gameLevelCircle, styles.bronzeGameCircle]}>
                  <Text style={styles.levelNumber}>{stats.totalWords - (silverBadge?.totalWords || 0) - (goldBadge?.totalWords || 0)}</Text>
                </View>
                <Text style={styles.gameLevelLabel}>Bronze</Text>
              </View>

              {/* Connection Line */}
              {silverBadge && silverBadge.totalWords > 0 && (
                <>
                  <View style={styles.connectionLine} />
                  <View style={styles.progressDot}>
                    <View style={[styles.gameLevelCircle, styles.silverGameCircle]}>
                      <Text style={styles.levelNumber}>{silverBadge.totalWords}</Text>
                    </View>
                    <Text style={styles.gameLevelLabel}>Silver</Text>
                  </View>
                </>
              )}

              {/* Gold Connection */}
              {goldBadge && goldBadge.totalWords > 0 && (
                <>
                  <View style={styles.connectionLine} />
                  <View style={styles.progressDot}>
                    <View style={[styles.gameLevelCircle, styles.goldGameCircle]}>
                      <Text style={styles.levelNumber}>{goldBadge.totalWords}</Text>
                    </View>
                    <Text style={styles.gameLevelLabel}>Gold</Text>
                  </View>
                </>
              )}
            </View>
          )}

          <View style={styles.notebookStats}>
            <Text style={styles.totalWords}>
              {notebook.totalWords || 0} total • {notebook.masteredWords || 0} mastered
            </Text>
          </View>

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
              onPress={() => handleAddWordsPress(`/notebook/${appState.notebooks[0]?.id}/input`)}
              disabled={isAddWordsButtonLoading}
            >
              {isAddWordsButtonLoading ? (
                <LoadingIndicator size={16} color={colors.cardBackground} />
              ) : (
                <Text style={styles.addWordsButtonText}>Add Words</Text>
              )}
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
    backgroundColor: colors.primary, // Orange for review
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
  },
  practiceButtonAddWords: {
    backgroundColor: colors.warning, // Yellow for add words  
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
  },
  practiceButtonDone: {
    backgroundColor: colors.success, // Green for done
    borderColor: '#059669',
    borderBottomColor: '#047857',
    shadowColor: '#059669',
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
  silverNotebookIcon: {
    backgroundColor: '#C0C0C0',
    borderColor: '#A8A8A8',
    borderBottomColor: '#909090',
  },
  goldNotebookIcon: {
    backgroundColor: '#FFD700',
    borderColor: '#E8C547',
    borderBottomColor: '#D1B000',
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

})