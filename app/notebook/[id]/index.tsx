import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router'
import { supabaseService } from '@/lib/services/supabaseService'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, FLAG_EMOJIS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { SharedHeader } from '@/components/shared-header'
import { BottomNav } from '@/components/bottom-nav'

const { width: screenWidth } = Dimensions.get('window')

interface PageData {
  id: string
  pageNumber: number
  round: number
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'perfect'
  wordsCount: number
  actualWordsCount: number
  completedWords: number
  type: 'lesson' | 'review' | 'checkpoint' | 'story'
  isUnlocked: boolean
  unlockDate: string | null
  nextReviewDate?: string | null
  daysUntilNextReview?: number
  allWordsMastered?: boolean
}

export default function NotebookDetailsScreen() {
  const router = useRouter()
  const { id, focusPage, openBubble } = useLocalSearchParams<{ 
    id: string, 
    focusPage?: string, 
    openBubble?: string 
  }>()
  const { colors } = useTheme()
  const { getCurrentDate } = useDevTime()
  const [notebook, setNotebook] = useState<any>(null)
  const [pages, setPages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPage, setSelectedPage] = useState<PageData | null>(null)
  const [autoFocusedPageNumber, setAutoFocusedPageNumber] = useState<number | null>(null)
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    loadNotebookData()
  }, [id]) // Only reload when notebook ID changes

  // Auto-focus on page when URL parameters are present
  useEffect(() => {
    if (focusPage && openBubble && !loading && pathData.length > 0) {
      const pageNumber = parseInt(focusPage, 10)
      if (!isNaN(pageNumber)) {
        console.log(`🎯 Auto-focusing on page ${pageNumber} with speech bubble`)
        setAutoFocusedPageNumber(pageNumber)
        focusOnPage(pageNumber)
      }
    }
  }, [focusPage, openBubble, loading, pathData])

  // Refresh data when screen comes into focus (e.g., returning from review)
  useFocusEffect(
    React.useCallback(() => {
      loadNotebookData()
    }, [id])
  )

  const loadNotebookData = async () => {
    if (!id) return
    
    try {
      // Load notebook and all 200 page circles (existing + virtual)
      const [notebookData, pagesData] = await Promise.all([
        supabaseService.getNotebook(id),
        supabaseService.getPages(id) // This now returns 200 pages: real + virtual
      ])
      
      setNotebook(notebookData)
      setPages(pagesData) // Pages already include unlock status and virtual pages
    } catch (error) {
      Alert.alert('Error', 'Failed to load notebook data')
      console.error('Error loading notebook data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to check if page has words ready for review (14+ days old)
  const hasWordsReadyForReview = (page: any): boolean => {
    if (!page.words || page.words.length === 0) return false
    
    const currentDateTime = getCurrentDate()
    const currentDate = new Date(currentDateTime)
    currentDate.setHours(0, 0, 0, 0)
    
    const hasReviews = page.words.some((word: any) => {
      if (word.is_mastered) return false
      
      // Check if word was already reviewed today (prevent same-day re-reviews)
      if (word.last_reviewed) {
        const lastReviewedDate = new Date(word.last_reviewed)
        lastReviewedDate.setHours(0, 0, 0, 0)
        
        // If already reviewed today, word is not available for review
        if (currentDate.getTime() === lastReviewedDate.getTime()) {
          return false
        }
      }
      
      // Check if word has a review_date and if it's due
      if (word.review_date) {
        const reviewDate = new Date(word.review_date)
        reviewDate.setHours(0, 0, 0, 0)
        const isReviewDue = currentDate >= reviewDate
        
        // Debug log for page 1 words (reduced logging)
        if (page.page_number === 1 && Math.random() < 0.1) {
          console.log(`🔍 Review Debug Page 1 - Word: "${word.word}"`)
          console.log(`   Current time: ${currentDateTime.toISOString()}`)
          console.log(`   Review date: ${word.review_date}`)
          console.log(`   Last reviewed: ${word.last_reviewed}`)
          console.log(`   Is review due: ${isReviewDue}`)
          console.log(`   Current round: ${word.current_round}`)
        }
        
        return isReviewDue
      } else {
        // Fallback to creation date logic for words without review_date
        const wordCreated = new Date(word.created_at)
        wordCreated.setHours(0, 0, 0, 0)
        
        const daysSinceCreated = Math.floor(
          (currentDate.getTime() - wordCreated.getTime()) / (24 * 60 * 60 * 1000)
        )
        
        // Debug log for page 1 words (reduced logging)
        if (page.page_number === 1 && Math.random() < 0.1) {
          console.log(`🔍 Review Debug Page 1 - Word: "${word.word}" (fallback)`)
          console.log(`   Current time: ${currentDateTime.toISOString()}`)
          console.log(`   Word created: ${wordCreated.toISOString()}`)
          console.log(`   Last reviewed: ${word.last_reviewed}`)
          console.log(`   Days since created: ${daysSinceCreated}`)
          console.log(`   Ready for review: ${daysSinceCreated > 14}`)
        }
        
        return daysSinceCreated > 14
      }
    })
    
    // Debug for page 1 (reduced logging)
    if (page.page_number === 1 && Math.random() < 0.1) {
      console.log(`📋 Page 1 has reviewable words: ${hasReviews}`)
    }
    
    return hasReviews
  }

  const generatePathData = (): PageData[] => {
    if (!notebook || !pages.length) return []

    const pathData: PageData[] = []

    for (const page of pages) {
      // Debug page 1 specifically (reduced logging)
      if (page.page_number === 1 && Math.random() < 0.1) { // Only log 10% of the time to reduce spam
        console.log(`🔍 Page 1 Debug:`)
        console.log(`   Words array length: ${page.words?.length || 0}`)
        console.log(`   Words:`, page.words?.map((w: any) => ({ word: w.word, created_at: w.created_at, status: w.status })) || [])
      }
      
      const completedWords = page.words?.filter((w: any) => w.is_mastered).length || 0
      const totalWords = page.words?.length || 0
      const hasReviewableWords = hasWordsReadyForReview(page)
      
      // Calculate the highest round of words in this page for color display
      const maxWordRound = page.words?.reduce((max: any, word: any) => {
        return Math.max(max, word.current_round || 1)
      }, 1) || 1
      
      // Debug log for page color changes (reduced logging)
      if (page.page_number === 1 && page.words?.length > 0 && Math.random() < 0.1) {
        console.log(`🎨 Page 1 Color Debug:`)
        console.log(`   Words rounds:`, page.words?.map((w: any) => ({ word: w.word, round: w.current_round })))
        console.log(`   Max word round: ${maxWordRound}`)
        console.log(`   Page will be colored for round: ${maxWordRound}`)
      }
      
      let status: PageData['status'] = 'locked'
      let type: PageData['type'] = 'lesson'

      // Determine status based on unlock status and completion
      if (page.is_unlocked) {
        if (page.is_completed) {
          status = completedWords === totalWords && totalWords > 0 ? 'perfect' : 'completed'
        } else if (totalWords > 0) {
          status = 'in_progress'
        } else {
          status = 'available'
        }
      } else {
        status = 'locked'
      }

      // Check if this page was reviewed today and calculate next review info
      const currentDate = new Date(getCurrentDate())
      currentDate.setHours(0, 0, 0, 0)
      
      const hasWordsReviewedToday = totalWords > 0 && page.words?.some((word: any) => {
        if (!word.last_reviewed) return false
        const lastReviewedDate = new Date(word.last_reviewed)
        lastReviewedDate.setHours(0, 0, 0, 0)
        const wasReviewedToday = currentDate.getTime() === lastReviewedDate.getTime()
        
        // Debug log for page 1 
        if (page.page_number === 1 && wasReviewedToday) {
          console.log(`🔍 Page 1 Review Detection:`)
          console.log(`   Word: "${word.word}" was reviewed today`)
          console.log(`   Current date: ${currentDate.toISOString()}`)
          console.log(`   Last reviewed: ${word.last_reviewed}`)
          console.log(`   Last reviewed date obj: ${lastReviewedDate.toISOString()}`)
        }
        
        return wasReviewedToday
      })

      // Calculate next review information for pages reviewed today
      let nextReviewDate: string | null = null
      let daysUntilNextReview = 0
      let allWordsMastered = false

      if (hasWordsReviewedToday) {
        // Find earliest review date among non-mastered words
        const upcomingReviewDates = page.words
          ?.filter((word: any) => !word.is_mastered && word.review_date)
          .map((word: any) => word.review_date)
          .sort()

        if (upcomingReviewDates && upcomingReviewDates.length > 0) {
          nextReviewDate = upcomingReviewDates[0]
          const nextReviewDateObj = new Date(nextReviewDate)
          nextReviewDateObj.setHours(0, 0, 0, 0)
          daysUntilNextReview = Math.ceil((nextReviewDateObj.getTime() - currentDate.getTime()) / (24 * 60 * 60 * 1000))
        } else {
          // All words are mastered
          allWordsMastered = true
        }
      }

      // Determine type - prioritize reviewed today status over reviewable words
      if (hasWordsReviewedToday) {
        type = 'lesson' // Show as completed lesson for today
        status = 'completed' // Mark as completed to indicate it's been reviewed today
        
        // Debug log for page 1
        if (page.page_number === 1) {
          console.log(`📋 Page 1 Final State: type='lesson', status='completed' (reviewed today)`)
        }
      } else if (hasReviewableWords) {
        type = 'review'
        
        // Debug log for page 1
        if (page.page_number === 1) {
          console.log(`📋 Page 1 Final State: type='review' (has reviewable words)`)
        }
      } else if (page.page_number % 20 === 0) {
        type = 'checkpoint'
      } else if (page.page_number % 10 === 0) {
        type = 'story'
      } else {
        type = 'lesson'
      }

      pathData.push({
        id: page.id,
        pageNumber: page.page_number,
        round: maxWordRound,
        status,
        wordsCount: notebook.words_per_day || 20,
        actualWordsCount: totalWords,
        completedWords,
        type,
        isUnlocked: page.is_unlocked || false,
        unlockDate: page.unlock_date,
        nextReviewDate,
        daysUntilNextReview,
        allWordsMastered
      })
    }

    return pathData.sort((a, b) => a.pageNumber - b.pageNumber)
  }

  const pathData = useMemo(() => generatePathData(), [notebook, pages, getCurrentDate()])

  // Create styles before any early returns
  const styles = createStyles(colors)


  const getPageColor = (page: PageData) => {
    // If locked, always show gray
    if (page.status === 'locked') return colors.gray300
    
    // Use Gold List Method round colors
    switch (page.round) {
      case 1: return '#EF4444' // Red - Round 1
      case 2: return '#10B981' // Green - Round 2  
      case 3: return '#3B82F6' // Blue - Round 3
      case 4: return '#F59E0B' // Yellow - Round 4
      default: return colors.primary // Fallback
    }
  }

  const getPageBorderColor = (page: PageData) => {
    // If locked, always show darker gray
    if (page.status === 'locked') return '#9CA3AF'
    
    // Use darker versions for Duolingo-style borders
    switch (page.round) {
      case 1: return '#DC2626' // Darker Red
      case 2: return '#059669' // Darker Green  
      case 3: return '#2563EB' // Darker Blue
      case 4: return '#D97706' // Darker Yellow
      default: return colors.primaryDark || '#1E40AF' // Fallback
    }
  }

  const getPageBottomBorderColor = (page: PageData) => {
    // If locked, always show darkest gray
    if (page.status === 'locked') return '#6B7280'
    
    // Use darkest versions for bottom border depth
    switch (page.round) {
      case 1: return '#B91C1C' // Darkest Red
      case 2: return '#047857' // Darkest Green  
      case 3: return '#1E40AF' // Darkest Blue
      case 4: return '#B45309' // Darkest Yellow
      default: return colors.primaryDark || '#1E3A8A' // Fallback
    }
  }

  const handlePagePress = (page: PageData) => {
    if (page.status === 'locked') {
      const unlockDate = page.unlockDate ? new Date(page.unlockDate).toLocaleDateString() : 'Unknown'
      Alert.alert('Locked', `This page will unlock on ${unlockDate}. Use the simulation buttons to advance days!`)
      return
    }

    // Check if page was already reviewed today
    if (page.status === 'completed' && page.type === 'lesson') {
      Alert.alert('Already Reviewed', 'This page has been reviewed today. Come back tomorrow for the next review!')
      return
    }

    // Check if this is a virtual page (not created yet)
    if (page.id.startsWith('virtual-')) {
      // Virtual pages should still be selectable if unlocked (for current day)
      const today = getCurrentDate()
      const notebookCreated = notebook ? new Date(notebook.created_at) : today
      const daysSinceCreation = Math.floor(
        (today.getTime() - notebookCreated.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1
      
      if (page.pageNumber > daysSinceCreation) {
        Alert.alert('Not Ready Yet', `This page will be available on day ${page.pageNumber}. Use simulation buttons to advance time!`)
        return
      }
    }

    // Reset auto-focus state when user manually interacts
    setAutoFocusedPageNumber(null)
    
    // Toggle: if same page is already selected, close it; otherwise open new one
    if (selectedPage?.id === page.id) {
      setSelectedPage(null)
    } else {
      setSelectedPage(page)
    }
  }

  const handleActionPress = (page: PageData) => {
    // For Silver/Gold notebooks, only allow review actions
    const notebookLevel = notebook?.notebook_level || 'bronze'
    
    if (notebookLevel === 'silver' || notebookLevel === 'gold') {
      // Silver/Gold notebooks are review-only
      if (page.type === 'review') {
        router.push(`/notebook/${id}/review?page=${page.pageNumber}`)
      } else {
        // Show alert for non-review actions in Silver/Gold
        Alert.alert(
          `${notebookLevel === 'silver' ? 'Silver' : 'Gold'} Notebook`,
          `This is a ${notebookLevel} notebook. You can only review words here. New words come from ${notebookLevel === 'silver' ? 'Bronze' : 'Silver'} notebook failures.`,
          [{ text: 'OK' }]
        )
      }
      setSelectedPage(null)
      return
    }
    
    // Bronze notebook logic (original behavior)
    // Check if this is a virtual page and handle accordingly
    if (page.id.startsWith('virtual-')) {
      // For virtual pages, redirect to input to create the actual page
      router.push(`/notebook/${id}/input?page=${page.pageNumber}`)
    } else {
      // For real pages, check type
      if (page.type === 'review') {
        router.push(`/notebook/${id}/review?page=${page.pageNumber}`)
      } else {
        router.push(`/notebook/${id}/input?page=${page.pageNumber}`)
      }
    }
    setSelectedPage(null)
  }

  const closePage = () => {
    setSelectedPage(null)
    setAutoFocusedPageNumber(null)
  }

  const focusOnPage = (pageNumber: number) => {
    // Find the page in pathData
    const targetPageIndex = pathData.findIndex(page => page.pageNumber === pageNumber)
    if (targetPageIndex === -1) {
      console.warn(`Page ${pageNumber} not found for auto-focus`)
      return
    }

    const targetPage = pathData[targetPageIndex]
    
    // Calculate scroll position using the same logic as getNodePosition
    const targetPosition = getNodePosition(targetPageIndex)
    const scrollY = Math.max(0, targetPosition.y - 200) // Center the page with some top offset
    
    // Auto-scroll to the page
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        y: scrollY,
        animated: true
      })
    }, 100) // Small delay to ensure the view is ready

    // Auto-select the page to show speech bubble
    setTimeout(() => {
      setSelectedPage(targetPage)
      console.log(`🎯 Auto-focused on Page ${pageNumber}`)
    }, 300) // Delay to let scroll animation start first
  }

  // Calculate smooth Duolingo-style curve positions with even spacing
  const getNodePosition = (index: number) => {
    const centerX = screenWidth / 2
    const amplitude = 80 // How far left/right the curve goes
    const wavelength = 6 // How many nodes per full wave (more even distribution)
    const baseSpacing = 130 // Base vertical distance between nodes
    
    // Create a smooth sine wave pattern similar to Duolingo
    const phase = (index * 2 * Math.PI) / wavelength
    const xOffset = Math.sin(phase) * amplitude
    
    // Add secondary wave for more organic feel (reduced to maintain evenness)
    const secondaryPhase = (index * 2 * Math.PI) / (wavelength * 2)
    const secondaryOffset = Math.sin(secondaryPhase) * 10
    
    const finalX = centerX + xOffset + secondaryOffset
    
    // Use consistent vertical spacing instead of multiplication
    const yPosition = 50 + (index * baseSpacing) // Start with 50px offset from top
    
    return {
      x: finalX - 45, // Subtract half circle width for centering (90/2 = 45)
      y: yPosition
    }
  }

  const renderPathNode = (page: PageData, index: number) => {
    const color = getPageColor(page)
    const position = getNodePosition(index)
    const isSelected = selectedPage?.id === page.id

    // Determine if bubble should appear on left or right based on circle position
    const circleCenter = position.x + 45 // Circle center (circle width is 90, so center is at x + 45)
    const isOnLeftSide = circleCenter < screenWidth / 2
    
    return (
      <View key={page.id} style={[
        styles.pathNode, 
        { 
          position: 'absolute',
          left: position.x,
          top: position.y,
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.pageButton,
            { 
              backgroundColor: color,
              borderColor: getPageBorderColor(page),
              borderBottomColor: getPageBottomBorderColor(page),
              shadowColor: getPageBorderColor(page),
            },
            page.status === 'locked' && styles.pageButtonLocked,
            page.type === 'checkpoint' && styles.checkpointButton,
            page.type === 'story' && styles.storyButton,
            isSelected && styles.pageButtonSelected,
          ]}
          onPress={() => handlePagePress(page)}
          disabled={page.status === 'locked'}
        >
          <Text style={styles.pageNumber}>{page.pageNumber}</Text>
          {page.status === 'in_progress' && (
            <View style={styles.progressRing}>
              <View style={[styles.progressFill, { 
                transform: [{ rotate: `${(page.completedWords / page.wordsCount) * 360}deg` }] 
              }]} />
            </View>
          )}
        </TouchableOpacity>

        {/* Speech Bubble Popup */}
        {isSelected && (
          <View style={[
            styles.speechBubble,
            isOnLeftSide ? styles.speechBubbleRight : styles.speechBubbleLeft
          ]}>
            <View style={styles.speechBubbleContent}>
              <Text style={styles.speechBubbleTitle}>
                {page.type === 'checkpoint' ? 'Checkpoint' : 
                 page.type === 'story' ? 'Story' :
                 page.type === 'review' ? 'Review' : 'Lesson'} {page.pageNumber}
              </Text>
              <Text style={styles.speechBubbleDescription}>
                {(() => {
                  const notebookLevel = notebook?.notebook_level || 'bronze'
                  
                  // Silver/Gold notebook messaging
                  if (notebookLevel === 'silver' || notebookLevel === 'gold') {
                    const sourceLevel = notebookLevel === 'silver' ? 'Bronze' : 'Silver'
                    const currentLevel = notebookLevel === 'silver' ? 'Silver' : 'Gold'
                    
                    if (page.type === 'review') {
                      return autoFocusedPageNumber === page.pageNumber ? 
                        `✨ Review all 20 ${currentLevel} words as a page!` :
                        `Page ${page.pageNumber}: ${page.actualWordsCount} ${currentLevel} words ready for review`
                    } else if (page.allWordsMastered) {
                      return `Page ${page.pageNumber}: All 20 words mastered! 🎉`
                    } else if (page.completedWords > 0 || page.actualWordsCount > 0) {
                      const nextReviewInfo = page.daysUntilNextReview ? 
                        ` • Next review in ${page.daysUntilNextReview} day${page.daysUntilNextReview > 1 ? 's' : ''}` : ''
                      return `Page ${page.pageNumber}: ${page.actualWordsCount} ${currentLevel} words${nextReviewInfo}`
                    } else {
                      return `Page ${page.pageNumber}: Waiting for ${sourceLevel} Round 4 failures (need 20 words)`
                    }
                  }
                  
                  // Bronze notebook messaging (original logic)
                  return autoFocusedPageNumber === page.pageNumber ? 
                    // Special messaging for auto-focused pages
                    (page.type === 'review' ? 
                      `✨ Ready to review today's words!` :
                      page.completedWords > 0 || page.actualWordsCount > 0 ?
                      `✨ This page has words - ready for next review!` :
                      `✨ Add today's ${page.wordsCount} words here!`) :
                    // Normal messaging for manually selected pages
                    (page.type === 'review' ? 
                      `Words ready for review today` :
                      page.allWordsMastered ?
                      `All words mastered! 🎉` :
                      page.daysUntilNextReview && page.daysUntilNextReview > 0 ?
                      `Next review in ${page.daysUntilNextReview} day${page.daysUntilNextReview > 1 ? 's' : ''}` :
                      page.status === 'completed' && page.type === 'lesson' ?
                      `Reviewed today! Next review tomorrow` :
                      page.completedWords > 0 || page.actualWordsCount > 0 ?
                      `Page has words - next review coming soon` :
                      `Add ${page.wordsCount} new words`)
                })()}
              </Text>
              {(() => {
                const notebookLevel = notebook?.notebook_level || 'bronze'
                
                // Common conditions
                if (page.allWordsMastered) {
                  return (
                    <View style={[styles.actionButton, { backgroundColor: colors.primary, opacity: 0.7 }]}>
                      <Text style={[styles.actionButtonText, { color: colors.cardBackground }]}>
                        ✅ All Mastered
                      </Text>
                    </View>
                  )
                }
                
                if (page.daysUntilNextReview && page.daysUntilNextReview > 0) {
                  return (
                    <View style={[styles.actionButton, { backgroundColor: colors.gray300 }]}>
                      <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                        Next Review Day {page.daysUntilNextReview > 1 ? page.daysUntilNextReview : 'Tomorrow'}
                      </Text>
                    </View>
                  )
                }
                
                if (page.status === 'completed' && page.type === 'lesson') {
                  return (
                    <View style={[styles.actionButton, { backgroundColor: colors.gray300 }]}>
                      <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                        Already Reviewed
                      </Text>
                    </View>
                  )
                }
                
                // Silver/Gold notebook logic
                if (notebookLevel === 'silver' || notebookLevel === 'gold') {
                  if (page.type === 'review') {
                    return (
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => handleActionPress(page)}
                      >
                        <Text style={styles.actionButtonText}>
                          Review {notebookLevel === 'silver' ? 'Silver' : 'Gold'} Words
                        </Text>
                      </TouchableOpacity>
                    )
                  } else {
                    // Non-review pages in Silver/Gold show disabled state
                    return (
                      <View style={[styles.actionButton, { backgroundColor: colors.gray300 }]}>
                        <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                          {notebookLevel === 'silver' ? 'Silver' : 'Gold'} Review Only
                        </Text>
                      </View>
                    )
                  }
                }
                
                // Bronze notebook logic (original behavior)
                if ((page.completedWords > 0 || page.actualWordsCount > 0) && page.type !== 'review') {
                  return (
                    <View style={[styles.actionButton, { backgroundColor: colors.gray300 }]}>
                      <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                        Page Locked
                      </Text>
                    </View>
                  )
                }
                
                return (
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleActionPress(page)}
                  >
                    <Text style={styles.actionButtonText}>
                      {page.type === 'review' ? 'Review Now' : 'Add Words'}
                    </Text>
                  </TouchableOpacity>
                )
              })()}
            </View>
            <View style={[
              styles.speechBubbleArrow,
              isOnLeftSide ? styles.speechBubbleArrowRight : styles.speechBubbleArrowLeft
            ]} />
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notebook...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!notebook) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Notebook not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Shared Header */}
      <SharedHeader title={notebook.title} showBackButton={true} />
      
      {/* Notebook Language Info and Level Badge */}
      <View style={styles.languageHeader}>
        <Text style={styles.languageFlag}>{FLAG_EMOJIS[notebook.language_code as keyof typeof FLAG_EMOJIS] || '🌍'}</Text>
        <Text style={styles.languageText}>{notebook.language}</Text>
        {(notebook.notebook_level === 'silver' || notebook.notebook_level === 'gold') && (
          <View style={[
            styles.levelBadge,
            { backgroundColor: notebook.notebook_level === 'silver' ? colors.info + '20' : colors.warning + '20' }
          ]}>
            <Text style={[
              styles.levelBadgeText,
              { color: notebook.notebook_level === 'silver' ? colors.info : colors.warning }
            ]}>
              {notebook.notebook_level === 'silver' ? '🥈 SILVER' : '🥇 GOLD'} NOTEBOOK
            </Text>
          </View>
        )}
      </View>


      {/* Page-based Progress Summary for Silver/Gold */}
      {(notebook.notebook_level === 'silver' || notebook.notebook_level === 'gold') && (
        <View style={styles.pageProgressSummary}>
          <Text style={styles.pageProgressTitle}>
            {notebook.notebook_level === 'silver' ? 'Silver' : 'Gold'} Notebook Progress
          </Text>
          <Text style={styles.pageProgressSubtitle}>
            Page-based reviews • 20 words per page
          </Text>
          
          <View style={styles.pageProgressStats}>
            <View style={styles.pageProgressStat}>
              <Text style={styles.pageProgressStatValue}>
                {pathData.filter(p => p.actualWordsCount > 0).length}
              </Text>
              <Text style={styles.pageProgressStatLabel}>Active Pages</Text>
            </View>
            <View style={styles.pageProgressStat}>
              <Text style={styles.pageProgressStatValue}>
                {pathData.filter(p => p.type === 'review').length}
              </Text>
              <Text style={styles.pageProgressStatLabel}>Reviews Due</Text>
            </View>
            <View style={styles.pageProgressStat}>
              <Text style={styles.pageProgressStatValue}>
                {pathData.filter(p => p.allWordsMastered).length}
              </Text>
              <Text style={styles.pageProgressStatLabel}>Completed</Text>
            </View>
          </View>
        </View>
      )}

      {/* Learning Path */}
      <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.pathContainer}>
        <TouchableOpacity 
          style={[styles.pathBackground, { height: pathData.length * 130 + 250 }]}
          activeOpacity={1}
          onPress={closePage}
        >
          {pathData.map((page, index) => renderPathNode(page, index))}
        </TouchableOpacity>
        
        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>


      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.error,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  languageFlag: {
    fontSize: TYPOGRAPHY.base,
  },
  languageText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.semibold,
  },
  scrollView: {
    flex: 1,
  },
  pathContainer: {
    paddingVertical: SPACING.xl,
    paddingBottom: 100, // Padding for bottom nav only
  },
  pathBackground: {
    position: 'relative',
    width: '100%',
    paddingHorizontal: SPACING.xl,
  },
  pathNode: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 90,
  },
  pageButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    // Duolingo-style 3D effect
    borderWidth: 4,
    borderBottomWidth: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  pageButtonLocked: {
    opacity: 0.4,
  },
  checkpointButton: {
    // Remove extra styling, keep same size as regular buttons
  },
  storyButton: {
    // Remove extra styling, keep same size as regular buttons
  },
  pageNumber: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pageButtonSelected: {
    transform: [{ scale: 1.1 }],
    ...SHADOWS.lg,
  },
  progressRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  progressFill: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bottomSpacing: {
    height: SPACING['6xl'],
  },
  
  // Speech Bubble Styles
  speechBubble: {
    position: 'absolute',
    top: -15, // Moved 1.2x lower: -25 + (25 * 0.4) = -15
    width: 160,
    alignItems: 'center',
    zIndex: 1000,
  },
  speechBubbleLeft: {
    right: 80, // Position to the left of circle
  },
  speechBubbleRight: {
    left: 80, // Position to the right of circle
  },
  speechBubbleContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    minWidth: 140,
    maxWidth: 160,
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speechBubbleArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    position: 'absolute',
  },
  speechBubbleArrowLeft: {
    right: -12, // Arrow positioned at edge of bubble pointing toward circle
    top: '50%',
    marginTop: -8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.cardBackground,
  },
  speechBubbleArrowRight: {
    left: -12, // Arrow positioned at edge of bubble pointing toward circle
    top: '50%',
    marginTop: -8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.cardBackground,
  },
  speechBubbleTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  speechBubbleDescription: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    // Duolingo-style 3D effect
    borderWidth: 3,
    borderBottomWidth: 4,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
    textAlign: 'center',
  },

  // Level badge styles
  levelBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginLeft: SPACING.md,
  },
  levelBadgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Page progress summary styles
  pageProgressSummary: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  pageProgressTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  pageProgressSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  pageProgressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pageProgressStat: {
    alignItems: 'center',
  },
  pageProgressStatValue: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  pageProgressStatLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
})