import React, { useState, useEffect, useRef, useMemo, useCallback, memo, useLayoutEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PanGestureHandler, State } from 'react-native-gesture-handler'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabaseService } from '@/lib/services/supabaseService'
import { ROUND_COLORS } from '@/lib/types/goldlist'

// Type aliases for cleaner code
type WordWithReviews = any // Using any for now to avoid type conflicts
type NotebookWithStats = any
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import * as Haptics from 'expo-haptics'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2 // More responsive - 20% of screen width

export default function ReviewScreen() {
  const router = useRouter()
  const { id, round, page } = useLocalSearchParams<{ id: string; round?: string; page?: string }>()
  const { colors } = useTheme()
  const { getCurrentDate } = useDevTime()
  
  const [notebook, setNotebook] = useState<NotebookWithStats | null>(null)
  const [words, setWords] = useState<WordWithReviews[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showMeaning, setShowMeaning] = useState(false)
  
  const [reviewedWords, setReviewedWords] = useState<{
    remembered: number
    forgotten: number
    total: number
  }>({ remembered: 0, forgotten: 0, total: 0 })
  const [sessionStartTime] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  
  // Batch review collection for performance optimization
  const [batchReviews, setBatchReviews] = useState<Array<{ wordId: string; remembered: boolean }>>([])
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
  const batchReviewsRef = useRef<Array<{ wordId: string; remembered: boolean }>>([])
  
  // Note: batchReviewsRef is manually kept in sync with batchReviews state

  // Animation values for card deck - each card has independent animations
  const currentCardTranslateX = useRef(new Animated.Value(0)).current
  const currentCardRotate = useRef(new Animated.Value(0)).current
  const currentCardScale = useRef(new Animated.Value(1)).current
  const currentCardOpacity = useRef(new Animated.Value(1)).current
  
  const nextCardScale = useRef(new Animated.Value(0.95)).current
  const nextCardOpacity = useRef(new Animated.Value(0.8)).current
  const nextCardTranslateY = useRef(new Animated.Value(10)).current
  
  // Refs for immediate visual state (no re-renders)
  const visualCurrentIndex = useRef(0)
  const visualStats = useRef({ remembered: 0, forgotten: 0, total: 0 })

  // Pre-calculate colors for all words to prevent flash
  const wordColorsMap = useMemo(() => {
    const colorsMap = new Map()
    words.forEach(word => {
      const roundColors = ROUND_COLORS[word.current_round as keyof typeof ROUND_COLORS]
      colorsMap.set(word.id, roundColors)
    })
    return colorsMap
  }, [words])

  // Memoize styles to prevent recreation on every render
  const styles = useMemo(() => createStyles(colors), [colors])

  useEffect(() => {
    loadReviewData()
  }, [id, round, page])

  // Process pending batch reviews when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup function - only process if there are pending reviews from early exit
      if (batchReviewsRef.current.length > 0) {
        console.log(`🧹 Cleanup: Processing ${batchReviewsRef.current.length} pending reviews from early exit...`)
        supabaseService.processBatchWordReviews(batchReviewsRef.current).catch(error => {
          console.error('Failed to process batch reviews on cleanup:', error)
        })
      }
    }
  }, [words]) // Include words in dependency to capture latest word list
  
  // Initialize visual refs
  useEffect(() => {
    visualCurrentIndex.current = currentIndex
    visualStats.current = { ...reviewedWords }
  }, [currentIndex, reviewedWords])
  
  // UseLayoutEffect for flicker-free UI updates
  useLayoutEffect(() => {
    // This ensures DOM updates happen synchronously before paint
    if (visualCurrentIndex.current !== currentIndex) {
      // Sync any remaining state if needed
    }
  }, [currentIndex])
  

  const loadReviewData = async () => {
    try {
      // Check if we're in unified review mode (page parameter is null or 'unified')
      const isUnifiedReview = !page || page === 'unified'
      
      let notebookData, loadedWords
      
      if (isUnifiedReview) {
        // Unified review mode - get all words due for review today
        console.log('📚 Loading unified review session with all words due today')
        const results = await Promise.all([
          supabaseService.getNotebook(id!), // Still need notebook for basic info
          supabaseService.getAllWordsForReviewToday()
        ])
        
        notebookData = results[0]
        loadedWords = results[1]
        
        console.log(`🎯 Unified review loaded: ${loadedWords.length} words from ${new Set(loadedWords.map(w => (w.page as any).page_number)).size} pages`)
      } else {
        // Traditional page-specific review mode
        const options: { round?: number; pageNumber?: number } = {}
        
        // Add filters based on URL parameters
        if (round) options.round = parseInt(round)
        if (page) options.pageNumber = parseInt(page)
        
        const results = await Promise.all([
          supabaseService.getNotebook(id!),
          supabaseService.getWordsForReview(id!)
        ])
        
        notebookData = results[0]
        loadedWords = results[1]
      }
      
      setNotebook(notebookData)
      setWords(loadedWords)
      
      // Check if any words were loaded
      if (loadedWords.length === 0) {
        Alert.alert(
          'No Reviews Due',
          'Great job! You don\'t have any words ready for review.',
          [{ text: 'OK', onPress: () => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.push('/')
            }
          } }]
        )
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load review words')
      if (router.canGoBack()) {
        router.back()
      } else {
        router.push('/(tabs)/')
      }
    } finally {
      setLoading(false)
    }
  }

  // Use ref to throttle gesture updates for better performance
  const lastGestureUpdate = useRef(0)
  
  const handleGesture = useCallback((event: any) => {
    const { translationX } = event.nativeEvent
    
    // Throttle updates to ~60fps for better performance
    const now = Date.now()
    if (now - lastGestureUpdate.current < 16) return // ~60fps throttling
    lastGestureUpdate.current = now
    
    // Pre-calculate all values to avoid repeated computations
    const progress = Math.abs(translationX) / SCREEN_WIDTH
    const rotationValue = (translationX / SCREEN_WIDTH) * 30 // 30 degree max rotation
    const scaleValue = 1 - progress * 0.05 // Very subtle scale (0.95 minimum)
    const opacityValue = 1 - progress * 0.3 // Fade to 0.7 minimum
    
    // Batch current card animations
    currentCardTranslateX.setValue(translationX)
    currentCardRotate.setValue(rotationValue)
    currentCardScale.setValue(scaleValue)
    currentCardOpacity.setValue(opacityValue)
    
    // Batch next card animations
    nextCardScale.setValue(0.95 + (progress * 0.05))
    nextCardOpacity.setValue(0.8 + (progress * 0.2))
    nextCardTranslateY.setValue(10 - (progress * 10))
  }, [])

  const handleGestureEnd = (event: any) => {
    const { translationX, velocityX } = event.nativeEvent
    
    // Improved threshold detection - more sensitive to velocity
    const positionThreshold = SWIPE_THRESHOLD
    const velocityThreshold = 800 // Increased for more intentional swipes
    const progress = Math.abs(translationX) / SCREEN_WIDTH
    
    const shouldSwipe = 
      Math.abs(translationX) > positionThreshold || 
      Math.abs(velocityX) > velocityThreshold ||
      progress > 0.3 // 30% of screen width
    
    if (shouldSwipe) {
      const direction = translationX > 0 ? 'right' : 'left'
      handleSwipe(direction)
    } else {
      // Smooth snap back to center
      resetCardPosition()
    }
  }

  const resetCardPosition = () => {
    Animated.parallel([
      Animated.spring(currentCardTranslateX, { 
        toValue: 0, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      Animated.spring(currentCardRotate, { 
        toValue: 0, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      Animated.spring(currentCardScale, { 
        toValue: 1, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      Animated.spring(currentCardOpacity, { 
        toValue: 1, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      // Reset next card to background position
      Animated.spring(nextCardScale, { 
        toValue: 0.95, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      Animated.spring(nextCardOpacity, { 
        toValue: 0.8, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      Animated.spring(nextCardTranslateY, { 
        toValue: 10, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
    ]).start()
  }

  const handleSwipe = async (direction: 'left' | 'right') => {
    const remembered = direction === 'right'
    
    // Haptic feedback
    if (remembered) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }

    // Smooth card deck transition
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.2 : -SCREEN_WIDTH * 1.2
    const toRotation = direction === 'right' ? 30 : -30
    
    Animated.parallel([
      // Current card exit animation
      Animated.timing(currentCardTranslateX, {
        toValue: toX,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(currentCardRotate, {
        toValue: toRotation,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(currentCardScale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(currentCardOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      
      // Next card becomes current (smooth reveal)
      Animated.timing(nextCardScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(nextCardOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(nextCardTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()

    // Complete transition immediately when animation starts
    // This prevents the "refresh effect" by updating state before the animation delay
    // Make sure this completes synchronously for the critical ref update
    await completeCardTransition(remembered)
  }

  const completeCardTransition = async (remembered: boolean) => {
    const currentWord = words[visualCurrentIndex.current]
    
    try {
      // Add to batch reviews for optimized processing
      const newBatchReviews = [...batchReviews, { wordId: currentWord.id, remembered }]
      setBatchReviews(newBatchReviews)
      batchReviewsRef.current = newBatchReviews
      
      console.log(`📝 Added review for word "${currentWord.word}": ${remembered ? 'remembered' : 'forgotten'}`)
      console.log(`📊 Batch now contains ${newBatchReviews.length} reviews:`, newBatchReviews.map(r => r.wordId))
      
      // Note: Only using batch processing to avoid duplicate processing
      
      // Update refs immediately for UI feedback (optimistic update)
      visualStats.current = {
        remembered: visualStats.current.remembered + (remembered ? 1 : 0),
        forgotten: visualStats.current.forgotten + (remembered ? 0 : 1),
        total: visualStats.current.total + 1,
      }
      
      if (visualCurrentIndex.current < words.length - 1) {
        visualCurrentIndex.current += 1
        
        // Batch all React state updates together (single re-render)
        React.startTransition(() => {
          setCurrentIndex(visualCurrentIndex.current)
          setReviewedWords({ ...visualStats.current })
          setShowMeaning(false)
        })
        
        resetAnimationsForNewCard()
      } else {
        // Review session complete
        React.startTransition(() => {
          setCurrentIndex(visualCurrentIndex.current)
          setReviewedWords({ ...visualStats.current })
        })
        completeReviewSession()
      }
    } catch (error) {
      console.error('Review processing error:', error)
      Alert.alert('Error', `Failed to process review: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  const resetAnimationsForNewCard = () => {
    // Reset animations immediately without triggering re-renders
    requestAnimationFrame(() => {
      // Reset current card to ready state (the next card is now current)
      currentCardTranslateX.setValue(0)
      currentCardRotate.setValue(0)
      currentCardScale.setValue(1)
      currentCardOpacity.setValue(1)
      
      // Reset next card to background position for new next card
      nextCardScale.setValue(0.95)
      nextCardOpacity.setValue(0.8)
      nextCardTranslateY.setValue(10)
    })
  }

  const resetAnimations = () => {
    // Legacy function, redirect to new implementation
    resetAnimationsForNewCard()
  }

  const completeReviewSession = async () => {
    console.log(`🏁 CompleteReviewSession called - batchReviews.length: ${batchReviews.length}`)
    console.log(`🏁 batchReviewsRef.current.length: ${batchReviewsRef.current.length}`)
    console.log(`🏁 Current batch contents:`, batchReviews.map(r => `${r.wordId}:${r.remembered ? 'R' : 'F'}`))
    
    // Process batch reviews before showing completion dialog
    // Use the ref version which should be most up-to-date
    const reviewsToProcess = batchReviewsRef.current.length > 0 ? batchReviewsRef.current : batchReviews
    
    if (reviewsToProcess.length > 0) {
      setIsProcessingBatch(true)
      try {
        console.log(`🚀 Processing batch of ${reviewsToProcess.length} reviews...`)
        console.log(`🚀 Reviews to process:`, reviewsToProcess.map(r => `${r.wordId}:${r.remembered ? 'R' : 'F'}`))
        await supabaseService.processBatchWordReviews(reviewsToProcess)
        console.log('✅ Batch processing completed successfully')
        setBatchReviews([]) // Clear the batch after successful processing
        batchReviewsRef.current = []
      } catch (error) {
        console.error('❌ Batch processing failed:', error)
        Alert.alert('Error', `Failed to save review results: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return // Don't show completion dialog if batch processing failed
      } finally {
        setIsProcessingBatch(false)
      }
    } else {
      console.log('⚠️ No batch reviews to process - all words may have been processed individually')
    }

    const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000 / 60) // minutes
    // Use visualStats.current for accurate counts (state might not be updated yet)
    const finalStats = visualStats.current
    const accuracy = Math.round((finalStats.remembered / finalStats.total) * 100)
    
    Alert.alert(
      'Review Complete! 🎉',
      `Great work! You reviewed ${finalStats.total} words in ${sessionDuration} minutes.\n\nAccuracy: ${accuracy}%\nRemembered: ${finalStats.remembered}\nNeed more practice: ${finalStats.forgotten}`,
      [
        {
          text: 'Review More',
          onPress: () => {
            // Reset for another round
            setCurrentIndex(0)
            setShowMeaning(false)
            setReviewedWords({ remembered: 0, forgotten: 0, total: 0 })
            setBatchReviews([]) // Clear batch reviews for new session
            batchReviewsRef.current = []
            visualCurrentIndex.current = 0
            visualStats.current = { remembered: 0, forgotten: 0, total: 0 }
            resetAnimations()
          }
        },
        {
          text: 'Done',
          onPress: () => {
            // Navigate back with a flag indicating reviews were completed
            if (router.canGoBack()) {
              router.back()
            } else {
              router.push('/')
            }
            
            // Set a flag that reviews were completed for home screen to detect
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                (window as any).reviewsJustCompleted = true
              }
            }, 100)
          },
          style: 'default'
        }
      ]
    )
  }

  const handleCardTap = useCallback(() => {
    setShowMeaning(!showMeaning)
    Haptics.selectionAsync()
  }, [showMeaning])
  
  // Memoized card components to prevent re-renders
  const CurrentCard = memo(({ word, roundColors, showMeaning }: { 
    word: WordWithReviews, 
    roundColors: any, 
    showMeaning: boolean 
  }) => (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={(event) => {
        if (event.nativeEvent.state === State.END) {
          handleGestureEnd(event)
        }
      }}
    >
      <Animated.View
        style={[
          styles.card,
          styles.currentCard,
          {
            borderColor: roundColors.primary,
            backgroundColor: roundColors.light,
            transform: [
              { translateX: currentCardTranslateX },
              { rotate: currentCardRotate.interpolate({
                inputRange: [-30, 30],
                outputRange: ['-30deg', '30deg']
              }) },
              { scale: currentCardScale }
            ],
            opacity: currentCardOpacity,
            zIndex: 2
          }
        ]}
      >
        <TouchableOpacity style={styles.cardContent} onPress={handleCardTap} activeOpacity={0.8}>
          {/* Word side */}
          {!showMeaning && (
            <View style={styles.cardSide}>
              <Text style={[styles.cardWord, { color: '#000000' }]}>{word.word}</Text>
              {word.notes && (
                <Text style={[styles.cardNotes, { color: '#000000' }]}>{word.notes}</Text>
              )}
              <Text style={[styles.tapHint, { color: '#000000' }]}>Tap to reveal meaning</Text>
            </View>
          )}

          {/* Meaning side */}
          {showMeaning && (
            <View style={styles.cardSide}>
              <Text style={[styles.cardMeaning, { color: '#000000' }]}>{word.meaning}</Text>
              <Text style={[styles.cardOriginal, { color: '#000000' }]}>{word.word}</Text>
              {word.notes && (
                <Text style={[styles.cardNotes, { color: '#000000' }]}>{word.notes}</Text>
              )}
              <Text style={[styles.swipeHint, { color: '#000000' }]}>Swipe or use buttons below</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Swipe indicators */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.leftIndicator,
            {
              opacity: currentCardTranslateX.interpolate({
                inputRange: [-SCREEN_WIDTH, -80, 0],
                outputRange: [1, 0.9, 0],
                extrapolate: 'clamp'
              }),
              transform: [{
                scale: currentCardTranslateX.interpolate({
                  inputRange: [-SCREEN_WIDTH, -80, 0],
                  outputRange: [1.2, 1.1, 0.8],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}
        >
          <Text style={[styles.indicatorText, styles.forgotText]}>❌ FORGOT</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.rightIndicator,
            {
              opacity: currentCardTranslateX.interpolate({
                inputRange: [0, 80, SCREEN_WIDTH],
                outputRange: [0, 0.9, 1],
                extrapolate: 'clamp'
              }),
              transform: [{
                scale: currentCardTranslateX.interpolate({
                  inputRange: [0, 80, SCREEN_WIDTH],
                  outputRange: [0.8, 1.1, 1.2],
                  extrapolate: 'clamp'
                })
              }]
            }
          ]}
        >
          <Text style={[styles.indicatorText, styles.rememberedText]}>✅ REMEMBERED</Text>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  ), (prevProps, nextProps) => {
    // Only re-render if word ID, round colors, or showMeaning actually change
    return prevProps.word.id === nextProps.word.id && 
           prevProps.roundColors.primary === nextProps.roundColors.primary &&
           prevProps.showMeaning === nextProps.showMeaning
  })

  const NextCard = memo(({ word, roundColors }: { 
    word: WordWithReviews, 
    roundColors: any 
  }) => (
    <Animated.View
      style={[
        styles.card,
        styles.nextCard,
        {
          borderColor: roundColors.primary,
          backgroundColor: roundColors.light,
          transform: [
            { scale: nextCardScale },
            { translateY: nextCardTranslateY }
          ],
          opacity: nextCardOpacity,
          zIndex: 1
        }
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardSide}>
          <Text style={[styles.cardWord, { color: '#000000' }]}>{word.word}</Text>
          {word.notes && (
            <Text style={[styles.cardNotes, { color: '#000000' }]}>{word.notes}</Text>
          )}
          <Text style={[styles.tapHint, { color: '#000000' }]}>Tap to reveal meaning</Text>
        </View>
      </View>
    </Animated.View>
  ), (prevProps, nextProps) => {
    // Only re-render if word ID or round colors actually change
    return prevProps.word.id === nextProps.word.id && 
           prevProps.roundColors.primary === nextProps.roundColors.primary
  })

  const handleButtonPress = (remembered: boolean) => {
    handleSwipe(remembered ? 'right' : 'left')
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading review...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!notebook || words.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No words to review</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Show batch processing indicator
  if (isProcessingBatch) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Saving your progress...</Text>
          <Text style={[styles.loadingText, { fontSize: 14, marginTop: 8 }]}>
            Processing {batchReviews.length} word reviews
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Use visual state for most current rendering (prevents lag)
  const displayIndex = Math.max(visualCurrentIndex.current, currentIndex)
  const currentWord = words[displayIndex]
  const nextWord = words[displayIndex + 1]
  
  const roundColors = wordColorsMap.get(currentWord?.id) || ROUND_COLORS[1]
  const nextRoundColors = wordColorsMap.get(nextWord?.id) || ROUND_COLORS[1]
  const progress = words.length > 0 ? (displayIndex + 1) / words.length : 0

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          // Show confirmation if there are unreviewed words
          const hasUnreviewedWords = currentIndex < words.length - 1
          
          if (hasUnreviewedWords) {
            Alert.alert(
              'Exit Review?',
              `You have ${words.length - currentIndex - 1} unreviewed words remaining. These will be automatically marked as "not remembered" and moved to the next round.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Exit',
                  style: 'destructive',
                  onPress: () => {
                    if (router.canGoBack()) {
                      router.back()
                    } else {
                      router.push('/')
                    }
                  }
                }
              ]
            )
          } else {
            // No unreviewed words, safe to exit
            if (router.canGoBack()) {
              router.back()
            } else {
              router.push('/')
            }
          }
        }}>
          <Text style={styles.closeButton}>×</Text>
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.notebookTitle}>{notebook.title}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: roundColors.primary }]} />
            </View>
            <Text style={styles.progressText}>
              {currentIndex + 1} of {words.length}
            </Text>
          </View>
        </View>

        <View style={[styles.roundBadge, { backgroundColor: roundColors.primary }]}>
          <Text style={styles.roundBadgeText}>R{currentWord.current_round}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{reviewedWords.remembered}</Text>
          <Text style={styles.statLabel}>Remembered</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{reviewedWords.forgotten}</Text>
          <Text style={styles.statLabel}>Forgotten</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {reviewedWords.total > 0 ? Math.round((reviewedWords.remembered / reviewedWords.total) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
      </View>

      {/* Card Deck Stack */}
      <View style={styles.cardContainer}>
        {/* Next card (background) - Pre-loaded and ready */}
        {nextWord && (
          <NextCard 
            key={`next-${nextWord.id}`}
            word={nextWord} 
            roundColors={nextRoundColors} 
          />
        )}

        {/* Current card (top) - Fully interactive */}
        {currentWord ? (
          <CurrentCard 
            key={`current-${currentWord.id}`}
            word={currentWord} 
            roundColors={roundColors} 
            showMeaning={showMeaning} 
          />
        ) : (
          <View style={[styles.card, styles.currentCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.cardContent}>
              <Text style={[styles.cardWord, { color: colors.textPrimary }]}>
                {words.length === 0 ? 'No words available for review' : 'Loading word...'}
              </Text>
              <Text style={[styles.cardNotes, { color: colors.textSecondary }]}>
                Debug: {words.length} words total, index {displayIndex}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.forgotButton]}
          onPress={() => handleButtonPress(false)}
        >
          <Text style={styles.actionButtonIcon}>❌</Text>
          <Text style={styles.actionButtonText}>Forgot</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.revealButton]}
          onPress={handleCardTap}
        >
          <Text style={styles.actionButtonIcon}>👁️</Text>
          <Text style={styles.actionButtonText}>
            {showMeaning ? 'Hide' : 'Reveal'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.rememberedButton]}
          onPress={() => handleButtonPress(true)}
        >
          <Text style={styles.actionButtonIcon}>✅</Text>
          <Text style={styles.actionButtonText}>Remember</Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Swipe right if you remembered • Swipe left if you forgot
        </Text>
      </View>
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
    fontSize: 16,
    color: colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  closeButton: {
    fontSize: 32,
    color: colors.textPrimary,
    fontWeight: 'bold',
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  notebookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  progressContainer: {
    alignItems: 'center',
    width: 120,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  roundBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: colors.cardBackground, // Default background, will be overridden inline
    borderRadius: 20,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  nextCard: {
    position: 'absolute',
    top: 0,
    left: 20, // Match cardContainer padding
    right: 20,
  },
  currentCard: {
    position: 'absolute',
    top: 0,
    left: 20, // Match cardContainer padding
    right: 20,
  },
  cardContent: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardSide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  cardWord: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  cardMeaning: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  cardOriginal: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  cardNotes: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 20,
    opacity: 0.8,
  },
  tapHint: {
    fontSize: 14,
    textAlign: 'center',
    position: 'absolute',
    bottom: 32,
    opacity: 0.6,
  },
  swipeHint: {
    fontSize: 14,
    textAlign: 'center',
    position: 'absolute',
    bottom: 32,
    opacity: 0.6,
  },
  swipeIndicator: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  leftIndicator: {
    left: 30,
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  rightIndicator: {
    right: 30,
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  forgotText: {
    color: '#dc2626',
  },
  rememberedText: {
    color: '#16a34a',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  forgotButton: {
    backgroundColor: '#fee2e2',
  },
  revealButton: {
    backgroundColor: '#f3f4f6',
  },
  rememberedButton: {
    backgroundColor: '#dcfce7',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
  },
  instructions: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
})