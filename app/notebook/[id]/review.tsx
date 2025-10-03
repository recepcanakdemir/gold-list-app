import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { ROUND_COLORS } from '@/lib/types/goldlist'
import { getBadgeInfo } from '@/lib/utils/badgeUtils'
import * as Haptics from 'expo-haptics'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Swiper from 'react-native-deck-swiper'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

// Type aliases for cleaner code
type WordWithReviews = any // Using any for now to avoid type conflicts
type NotebookWithStats = any

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
  const [revealedCards, setRevealedCards] = useState<Map<string, boolean>>(new Map())

  // Swiper ref for deck swiper
  const swiperRef = useRef<Swiper<WordWithReviews>>(null)
  
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
  const originalWordsRef = useRef<WordWithReviews[]>([])
  
  // Note: batchReviewsRef is manually kept in sync with batchReviews state
  
  // Capture original words when they're first loaded
  useEffect(() => {
    if (words.length > 0 && originalWordsRef.current.length === 0) {
      originalWordsRef.current = [...words]
      console.log(`📚 Captured ${words.length} original words for completion screen`)
    }
  }, [words])

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

  // Process pending batch reviews when component unmounts (only on true unmount)
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
  }, []) // Empty dependency - only run on mount/unmount
  
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
        router.push('/(tabs)')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGesture = useCallback((event: any) => {
    const { translationX } = event.nativeEvent
    
    // Pre-calculate all values to avoid repeated computations
    const progress = Math.abs(translationX) / SCREEN_WIDTH
    const rotationValue = (translationX / SCREEN_WIDTH) * 25 // Reduced rotation for smoother feel
    const scaleValue = Math.max(0.95, 1 - progress * 0.05) // Smoother scale with bounds
    const opacityValue = Math.max(0.7, 1 - progress * 0.3) // Smoother opacity with bounds
    
    // Use requestAnimationFrame for smooth 60fps updates
    requestAnimationFrame(() => {
      // Batch current card animations
      currentCardTranslateX.setValue(translationX)
      currentCardRotate.setValue(rotationValue)
      currentCardScale.setValue(scaleValue)
      currentCardOpacity.setValue(opacityValue)
      
      // Batch next card animations - smoother reveal
      const nextScale = 0.95 + (progress * 0.05)
      const nextOpacity = 0.8 + (progress * 0.2)
      const nextY = 10 - (progress * 10)
      
      nextCardScale.setValue(nextScale)
      nextCardOpacity.setValue(nextOpacity)
      nextCardTranslateY.setValue(nextY)
    })
  }, [])

  const handleGestureEnd = (event: any) => {
    const { translationX, velocityX } = event.nativeEvent
    
    // Improved threshold detection - more sensitive to velocity
    const positionThreshold = SWIPE_THRESHOLD
    const velocityThreshold = 1000 // Increased for more intentional swipes
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
        tension: 150, // Increased tension for snappier return
        friction: 10
      }),
      Animated.spring(currentCardRotate, { 
        toValue: 0, 
        useNativeDriver: true,
        tension: 150,
        friction: 10
      }),
      Animated.spring(currentCardScale, { 
        toValue: 1, 
        useNativeDriver: true,
        tension: 150,
        friction: 10
      }),
      Animated.spring(currentCardOpacity, { 
        toValue: 1, 
        useNativeDriver: true,
        tension: 150,
        friction: 10
      }),
      // Reset next card to background position with matching physics
      Animated.spring(nextCardScale, { 
        toValue: 0.95, 
        useNativeDriver: true,
        tension: 150,
        friction: 10
      }),
      Animated.spring(nextCardOpacity, { 
        toValue: 0.8, 
        useNativeDriver: true,
        tension: 150,
        friction: 10
      }),
      Animated.spring(nextCardTranslateY, { 
        toValue: 10, 
        useNativeDriver: true,
        tension: 150,
        friction: 10
      }),
    ]).start()
  }

  // Add swiper handlers for deck swiper
  const handleSwipedLeft = useCallback((cardIndex: number) => {
    console.log(`👈 Card swiped left at index: ${cardIndex}`)
    // Get the current word directly from the swiper ref
    const currentWord = swiperRef.current?.props.cards?.[cardIndex]
    if (currentWord) {
      console.log(`🔍 Found word from swiper: "${currentWord.word}" (ID: ${currentWord.id})`)
      completeCardTransitionWithWord(false, cardIndex, currentWord)
    } else {
      console.error(`❌ No word found in swiper at index ${cardIndex}`)
    }
  }, [])

  const handleSwipedRight = useCallback((cardIndex: number) => {
    console.log(`👉 Card swiped right at index: ${cardIndex}`)
    // Get the current word directly from the swiper ref
    const currentWord = swiperRef.current?.props.cards?.[cardIndex]
    if (currentWord) {
      console.log(`🔍 Found word from swiper: "${currentWord.word}" (ID: ${currentWord.id})`)
      completeCardTransitionWithWord(true, cardIndex, currentWord)
    } else {
      console.error(`❌ No word found in swiper at index ${cardIndex}`)
    }
  }, [])

  const handleSwiped = useCallback((cardIndex: number) => {
    console.log(`📋 Card swiped at index: ${cardIndex} (index tracking handled by completeCardTransition)`)
    // Note: Index updating is handled in completeCardTransition to avoid race conditions
  }, [])

  const handleRevealPress = useCallback(() => {
    // Get the current word from the swiper (not from stale closure)
    const currentWord = swiperRef.current?.props.cards?.[currentIndex]
    if (!currentWord) {
      console.log(`❌ No current word found at index ${currentIndex}`)
      return
    }
    
    console.log(`👁️ [REVEAL] Toggling reveal for word: "${currentWord.word}" (ID: ${currentWord.id})`)
    
    setRevealedCards(prev => {
      const newMap = new Map(prev)
      const currentRevealed = newMap.get(currentWord.id) || false
      const newRevealed = !currentRevealed
      newMap.set(currentWord.id, newRevealed)
      console.log(`👁️ [REVEAL] Word "${currentWord.word}" reveal state: ${currentRevealed} → ${newRevealed}`)
      return newMap
    })
  }, [currentIndex])

  const handleSwipe = async (direction: 'left' | 'right') => {
    const remembered = direction === 'right'
    
    // Haptic feedback
    if (remembered) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }

    // Smooth Tinder-like card transition
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5
    const toRotation = direction === 'right' ? 25 : -25
    
    Animated.parallel([
      // Current card exit animation - faster and smoother like Tinder
      Animated.timing(currentCardTranslateX, {
        toValue: toX,
        duration: 200, // Reduced for snappier feel
        useNativeDriver: true,
      }),
      Animated.timing(currentCardRotate, {
        toValue: toRotation,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(currentCardScale, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(currentCardOpacity, {
        toValue: 0,
        duration: 150, // Fade out quickly
        useNativeDriver: true,
      }),
      
      // Next card becomes current (immediate and smooth reveal)
      Animated.timing(nextCardScale, {
        toValue: 1,
        duration: 150, // Quick reveal
        useNativeDriver: true,
      }),
      Animated.timing(nextCardOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(nextCardTranslateY, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start()

    // Complete transition immediately when animation starts
    await completeCardTransition(remembered)
  }

  const completeCardTransitionWithWord = async (remembered: boolean, cardIndex: number, currentWord: WordWithReviews) => {
    console.log(`🔍 CompleteCardTransitionWithWord - cardIndex: ${cardIndex}, word: "${currentWord.word}"`)
    
    // Get the total number of words from the swiper (not from stale closure)
    const totalWords = swiperRef.current?.props.cards?.length || 0
    console.log(`📊 Total words in swiper: ${totalWords}, current cardIndex: ${cardIndex}`)
    
    try {
      // Process word review - use ref to get current batch state
      const currentBatch = batchReviewsRef.current || []
      const newBatchReviews = [...currentBatch, { wordId: currentWord.id, remembered }]
      setBatchReviews(newBatchReviews)
      batchReviewsRef.current = newBatchReviews
      
      console.log(`📝 Added review for word "${currentWord.word}": ${remembered ? 'remembered' : 'forgotten'}`)
      console.log(`📊 Batch now contains ${newBatchReviews.length} reviews:`, newBatchReviews.map(r => r.wordId))
      
      // Update refs immediately for UI feedback (optimistic update)
      visualStats.current = {
        remembered: visualStats.current.remembered + (remembered ? 1 : 0),
        forgotten: visualStats.current.forgotten + (remembered ? 0 : 1),
        total: visualStats.current.total + 1,
      }
      
      // Check if there are more cards to review
      if (cardIndex < totalWords - 1) {
        console.log(`➡️ Moving to next card: ${cardIndex + 1}/${totalWords}`)
        const nextIndex = cardIndex + 1
        visualCurrentIndex.current = nextIndex
        
        // Batch all React state updates together (single re-render)
        React.startTransition(() => {
          setCurrentIndex(nextIndex)
          setReviewedWords({ ...visualStats.current })
        })
        
        resetAnimationsForNewCard()
      } else {
        // Review session complete - hide all cards first
        console.log(`🏁 Review session complete! Reviewed ${cardIndex + 1}/${totalWords} words`)
        React.startTransition(() => {
          setCurrentIndex(cardIndex + 1)
          setReviewedWords({ ...visualStats.current })
        })
        
        // Small delay to complete card exit animation, then show completion screen
        setTimeout(() => {
          completeReviewSession()
        }, 300)
      }
    } catch (error) {
      console.error('Review processing error:', error)
      Alert.alert('Error', `Failed to process review: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const completeCardTransition = async (remembered: boolean, cardIndex?: number) => {
    // Use cardIndex if provided (from swiper), otherwise use currentIndex
    const wordIndex = cardIndex !== undefined ? cardIndex : currentIndex
    const currentWord = words[wordIndex]
    
    console.log(`🔍 CompleteCardTransition - currentIndex: ${currentIndex}, cardIndex: ${cardIndex}, wordIndex: ${wordIndex}`)
    console.log(`🔍 Current word:`, currentWord?.word || 'undefined')
    console.log(`🔍 Words array length: ${words.length}, first few words:`, words.slice(0, 3).map(w => w.word))
    
    if (!currentWord) {
      console.error(`❌ No word found at index ${wordIndex}`)
      return
    }
    
    try {
      // Process word review
      const newBatchReviews = [...batchReviews, { wordId: currentWord.id, remembered }]
      setBatchReviews(newBatchReviews)
      batchReviewsRef.current = newBatchReviews
      
      console.log(`📝 Added review for word "${currentWord.word}": ${remembered ? 'remembered' : 'forgotten'}`)
      console.log(`📊 Batch now contains ${newBatchReviews.length} reviews:`, newBatchReviews.map(r => r.wordId))
      
      // Update refs immediately for UI feedback (optimistic update)
      visualStats.current = {
        remembered: visualStats.current.remembered + (remembered ? 1 : 0),
        forgotten: visualStats.current.forgotten + (remembered ? 0 : 1),
        total: visualStats.current.total + 1,
      }
      
      if (wordIndex < words.length - 1) {
        const nextIndex = wordIndex + 1
        visualCurrentIndex.current = nextIndex
        
        // Batch all React state updates together (single re-render)
        React.startTransition(() => {
          setCurrentIndex(nextIndex)
          setReviewedWords({ ...visualStats.current })
        })
        
        resetAnimationsForNewCard()
      } else {
        // Review session complete - hide all cards first
        React.startTransition(() => {
          setCurrentIndex(wordIndex + 1)
          setReviewedWords({ ...visualStats.current })
        })
        
        // Small delay to complete card exit animation, then show completion screen
        setTimeout(() => {
          completeReviewSession()
        }, 300)
      }
    } catch (error) {
      console.error('Review processing error:', error)
      Alert.alert('Error', `Failed to process review: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  const resetAnimationsForNewCard = () => {
    // Reset animations immediately without triggering re-renders
    requestAnimationFrame(() => {
      // Force stop any ongoing animations first
      currentCardTranslateX.stopAnimation()
      currentCardRotate.stopAnimation()
      currentCardScale.stopAnimation()
      currentCardOpacity.stopAnimation()
      nextCardScale.stopAnimation()
      nextCardOpacity.stopAnimation()
      nextCardTranslateY.stopAnimation()
      
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

  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const [reviewResults, setReviewResults] = useState<{
    remembered: any[]
    forgotten: any[]
  }>({ remembered: [], forgotten: [] })
  const [showWordsList, setShowWordsList] = useState<'remembered' | 'forgotten' | null>(null)
  
  // Gesture timing for swipe detection
  const gestureStartTime = useRef(0)
  
  // Animation values for completion screen
  const dashboardFadeAnim = useRef(new Animated.Value(0)).current
  const dashboardSlideAnim = useRef(new Animated.Value(30)).current

  const completeReviewSession = async () => {
    console.log(`🏁 CompleteReviewSession called - batchReviews.length: ${batchReviews.length}`)
    console.log(`🏁 batchReviewsRef.current.length: ${batchReviewsRef.current.length}`)
    console.log(`🏁 Current batch contents:`, batchReviews.map(r => `${r.wordId}:${r.remembered ? 'R' : 'F'}`))
    
    // Process batch reviews before showing completion screen
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
        return // Don't show completion screen if batch processing failed
      } finally {
        setIsProcessingBatch(false)
      }
    } else {
      console.log('⚠️ No batch reviews to process - all words may have been processed individually')
    }

    // Collect words by result for the completion screen AFTER batch processing
    const remembered: any[] = []
    const forgotten: any[] = []
    
    // Use the processed reviews (reviewsToProcess) instead of cleared arrays
    const reviewsToUse = reviewsToProcess
    
    // Get words from captured original words array (both words state and swiper may be cleared by this point)
    const swiperWords = originalWordsRef.current
    console.log(`📊 Building review results from ${reviewsToUse.length} reviews and ${swiperWords.length} words`)
    
    reviewsToUse.forEach(review => {
      const word = swiperWords.find(w => w.id === review.wordId)
      if (word) {
        console.log(`📊 Found word "${word.word}" (Round ${word.current_round}) - ${review.remembered ? 'remembered' : 'forgotten'}`)
        if (review.remembered) {
          remembered.push(word)
        } else {
          forgotten.push(word)
        }
      } else {
        console.warn(`⚠️ Word not found for review: ${review.wordId}`)
      }
    })
    
    console.log(`📊 Final review results - Remembered: ${remembered.length}, Forgotten: ${forgotten.length}`)
    
    setReviewResults({ remembered, forgotten })
    
    // Show completion screen with animation
    setShowCompletionScreen(true)
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(dashboardFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(dashboardSlideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Animated values for reveal transitions
  const revealAnimationRef = useRef(new Map<string, Animated.Value>()).current

  const getRevealAnimation = useCallback((wordId: string) => {
    if (!revealAnimationRef.has(wordId)) {
      revealAnimationRef.set(wordId, new Animated.Value(0))
    }
    return revealAnimationRef.get(wordId)!
  }, [revealAnimationRef])

  // Handle reveal animation when revealedCards state changes
  useEffect(() => {
    revealedCards.forEach((isRevealed, wordId) => {
      const animation = getRevealAnimation(wordId)
      Animated.timing(animation, {
        toValue: isRevealed ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start()
    })
  }, [revealedCards, getRevealAnimation])

  // Simple card renderer for deck swiper - Pre-renders both states with animated opacity control
  const renderCard = useCallback((word: WordWithReviews, index: number) => {
    if (!word) return null

    const roundColors = wordColorsMap.get(word.id) || ROUND_COLORS[1]
    const badgeInfo = getBadgeInfo(word.current_round)
    const isRevealed = revealedCards.get(word.id) || false
    const revealAnimation = getRevealAnimation(word.id)
    
    console.log(`🎨 [RENDER] Card "${word.word}" (ID: ${word.id}) - isRevealed: ${isRevealed}`)

    return (
      <View
        style={[
          styles.card,
          styles.currentCard,
          {
            borderColor: roundColors.primary,
            backgroundColor: roundColors.light,
          }
        ]}
      >
        <View style={styles.cardContent}>
          {/* Badge indicator */}
          <View style={[styles.badgeIndicator, {
            backgroundColor: badgeInfo.badgeColor
          }]}>
            <Text style={[styles.badgeText, { color: '#333' }]}>
              {badgeInfo.badgeEmoji}
            </Text>
          </View>
          
          {/* Pre-render both word and meaning with animated opacity control */}
          <View style={styles.cardSide}>
            {/* Word content - Always rendered, controlled by animated opacity */}
            <Animated.View style={[
              styles.cardContentLayer,
              { 
                opacity: revealAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
                transform: [{
                  scale: revealAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.95],
                  })
                }],
              }
            ]}>
              <Text style={[styles.cardWord, { color: '#000000' }]}>{word.word}</Text>
              {word.notes && (
                <Text style={[styles.cardNotes, { color: '#000000' }]}>{word.notes}</Text>
              )}
              <Text style={[styles.tapHint, { color: '#000000' }]}>
                Use reveal button to show meaning
              </Text>
            </Animated.View>
            
            {/* Meaning content - Always rendered, controlled by animated opacity */}
            <Animated.View style={[
              styles.cardContentLayer,
              { 
                opacity: revealAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1],
                }),
                transform: [{
                  scale: revealAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  })
                }],
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }
            ]}>
              <Text style={[styles.cardMeaning, { color: '#000000' }]}>{word.meaning}</Text>
              <Text style={[styles.cardOriginal, { color: '#000000' }]}>{word.word}</Text>
              {word.notes && (
                <Text style={[styles.cardNotes, { color: '#000000' }]}>{word.notes}</Text>
              )}
              <Text style={[styles.swipeHint, { color: '#000000' }]}>Swipe or use buttons below</Text>
            </Animated.View>
          </View>
        </View>
      </View>
    )
  }, [revealedCards, wordColorsMap, styles, getRevealAnimation])
  
  

  const handleButtonPress = (remembered: boolean) => {
    if (remembered) {
      swiperRef.current?.swipeRight()
    } else {
      swiperRef.current?.swipeLeft()
    }
  }

  const resetReviewSession = () => {
    setCurrentIndex(0)
    setRevealedCards(new Map())
    setReviewedWords({ remembered: 0, forgotten: 0, total: 0 })
    setBatchReviews([])
    batchReviewsRef.current = []
    visualCurrentIndex.current = 0
    visualStats.current = { remembered: 0, forgotten: 0, total: 0 }
    setShowCompletionScreen(false)
    resetAnimations()
  }

  const handleCompletionDone = () => {
    setShowCompletionScreen(false)
    
    // Set a flag that reviews were completed for home screen to detect
    if (typeof window !== 'undefined') {
      (window as any).reviewsJustCompleted = true
    }
    
    // Navigate back with a small delay to ensure flag is set
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back()
      } else {
        router.push('/(tabs)')
      }
    }, 50)
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

  // Show word lists if requested
  if (showWordsList) {
    const wordsToShow = showWordsList === 'remembered' ? reviewResults.remembered : reviewResults.forgotten
    const title = showWordsList === 'remembered' ? 'Remembered Words' : 'Words to Practice'
    const subtitle = showWordsList === 'remembered' ? 'Great job! These words are moving forward.' : 'These words need more practice.'
    
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.wordListScreen}>
          <View style={styles.wordListHeader}>
            <TouchableOpacity 
              style={styles.backToStatsButton}
              onPress={() => setShowWordsList(null)}
            >
              <Text style={styles.backToStatsText}>← Back to Stats</Text>
            </TouchableOpacity>
            
            <View style={styles.wordListTitleContainer}>
              <Text style={styles.wordListTitle}>{title}</Text>
              <Text style={styles.wordListSubtitle}>{subtitle}</Text>
            </View>
          </View>

          <ScrollView style={styles.wordsList} showsVerticalScrollIndicator={false}>
            {wordsToShow.map((word, index) => {
              const roundColors = ROUND_COLORS[word.current_round as keyof typeof ROUND_COLORS]
              return (
                <Animated.View 
                  key={word.id} 
                  style={[
                    styles.wordListItem,
                    { 
                      backgroundColor: roundColors.light,
                      borderLeftColor: roundColors.primary,
                    }
                  ]}
                >
                  <View style={styles.wordListItemHeader}>
                    <Text style={styles.wordListItemWord}>{word.word}</Text>
                    <View style={[styles.roundIndicator, { backgroundColor: roundColors.primary }]}>
                      <Text style={styles.roundIndicatorText}>R{word.current_round}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.wordListItemMeaning}>{word.meaning}</Text>
                  
                  {word.notes && (
                    <Text style={styles.wordListItemNotes}>{word.notes}</Text>
                  )}
                </Animated.View>
              )
            })}
          </ScrollView>

          <TouchableOpacity 
            style={styles.doneButton}
            onPress={handleCompletionDone}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Show completion dashboard if reviews are done
  if (showCompletionScreen) {
    const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000 / 60) // minutes
    const finalStats = visualStats.current
    const accuracy = finalStats.total > 0 ? Math.round((finalStats.remembered / finalStats.total) * 100) : 0

    // Calculate round distribution
    console.log(`🎯 Calculating round stats from reviewResults:`)
    console.log(`🎯 Total remembered: ${reviewResults.remembered.length}, Total forgotten: ${reviewResults.forgotten.length}`)
    console.log(`🎯 Remembered words:`, reviewResults.remembered.map(w => `${w.word} (R${w.current_round || 'undefined'})`))
    console.log(`🎯 Forgotten words:`, reviewResults.forgotten.map(w => `${w.word} (R${w.current_round || 'undefined'})`))
    console.log(`🎯 Sample word object:`, reviewResults.remembered[0] || reviewResults.forgotten[0])
    
    const roundStats = [1, 2, 3, 4].map(round => {
      const allWords = reviewResults.remembered.concat(reviewResults.forgotten)
      console.log(`🎯 Round ${round} - Checking ${allWords.length} total words`)
      const roundWords = allWords.filter(w => w.current_round === round)
      console.log(`🎯 Round ${round} - Found ${roundWords.length} words: ${roundWords.map(w => w.word).join(', ')}`)
      const remembered = reviewResults.remembered.filter(w => w.current_round === round).length
      const total = roundWords.length
      const result = {
        round,
        total,
        remembered,
        forgotten: total - remembered,
        accuracy: total > 0 ? Math.round((remembered / total) * 100) : 0,
        colors: ROUND_COLORS[round as keyof typeof ROUND_COLORS]
      }
      console.log(`🎯 Round ${round} stats:`, result)
      return result
    }).filter(r => r.total > 0)
    
    console.log(`🎯 Final roundStats after filtering:`, roundStats)

    return (
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.dashboardScreenCompact,
            {
              opacity: dashboardFadeAnim,
              transform: [{ translateY: dashboardSlideAnim }]
            }
          ]}
        >
          {/* Header */}
          <Animated.View style={styles.dashboardHeaderCompact}>
            <Text style={styles.dashboardTitleCompact}>🎉 Review Complete!</Text>
          </Animated.View>

          {/* Circular Progress Dashboard */}
          <Animated.View style={styles.circularStatsContainer}>
            {/* Overall Progress Circle */}
            <Animated.View 
              style={[
                styles.overallProgressContainer,
                {
                  opacity: dashboardFadeAnim,
                  transform: [{ 
                    scale: dashboardFadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1]
                    })
                  }]
                }
              ]}
            >
              <View style={styles.overallCircleContainerLarge}>
                <Svg width={160} height={160} style={styles.svgCircle}>
                  {/* Background Circle */}
                  <Circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={colors.gray200 || '#E5E7EB'}
                    strokeWidth="16"
                    fill="transparent"
                  />
                  {/* Progress Circle */}
                  <Circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke={colors.primary}
                    strokeWidth="16"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 70}`}
                    strokeDashoffset={`${2 * Math.PI * 70 * (1 - accuracy / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                  />
                </Svg>
                
                <View style={styles.overallProgressContentLarge}>
                  <Text style={styles.overallProgressNumberLarge}>{accuracy}%</Text>
                  <Text style={styles.overallProgressLabelLarge}>Overall Score</Text>
                </View>
              </View>
            </Animated.View>

            {/* Round Progress Circles */}
            <View style={styles.roundProgressContainer}>
              {(() => {
                console.log(`🎯 Rendering round progress circles - roundStats.length: ${roundStats.length}`)
                return roundStats.map((roundStat, index) => {
                  console.log(`🎯 Rendering round ${roundStat.round} with ${roundStat.total} words`)
                  return (
                <Animated.View 
                  key={roundStat.round}
                  style={[
                    styles.roundProgressWrapper,
                    {
                      opacity: dashboardFadeAnim,
                      transform: [{ 
                        scale: dashboardFadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 1]
                        })
                      }]
                    }
                  ]}
                >
                  <View style={styles.roundCircleContainerLarge}>
                    <Svg width={100} height={100} style={styles.svgCircle}>
                      {/* Background Circle */}
                      <Circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke={colors.gray200 || '#E5E7EB'}
                        strokeWidth="12"
                        fill="transparent"
                      />
                      {/* Progress Circle */}
                      <Circle
                        cx="50"
                        cy="50"
                        r="42"
                        stroke={roundStat.colors.primary}
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - roundStat.accuracy / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                    </Svg>
                    
                    <View style={styles.roundProgressContentLarge}>
                      <Text style={[styles.roundProgressNumberLarge, { color: roundStat.colors.primary }]}>
                        {roundStat.accuracy}%
                      </Text>
                      <Text style={styles.roundProgressLabelLarge}>R{roundStat.round}</Text>
                    </View>
                  </View>
                </Animated.View>
                  )
                })
              })()}
            </View>
          </Animated.View>

          {/* Quick Stats */}
          <Animated.View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatNumber}>{finalStats.total}</Text>
              <Text style={styles.quickStatLabel}>Total</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={[styles.quickStatNumber, { color: '#10B981' }]}>{finalStats.remembered}</Text>
              <Text style={styles.quickStatLabel}>Remembered</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={[styles.quickStatNumber, { color: '#F59E0B' }]}>{finalStats.forgotten}</Text>
              <Text style={styles.quickStatLabel}>Practice</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatNumber}>{sessionDuration}m</Text>
              <Text style={styles.quickStatLabel}>Time</Text>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View 
            style={[
              styles.actionButtonsCompact,
              {
                opacity: dashboardFadeAnim,
                transform: [{ 
                  translateY: dashboardFadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0]
                  })
                }]
              }
            ]}
          >
            <TouchableOpacity 
              style={[styles.actionButtonCompact, styles.rememberedWordsButtonCompact]}
              onPress={() => setShowWordsList('remembered')}
            >
              <Text style={styles.actionButtonTextCompact}>✅ Remembered ({finalStats.remembered})</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButtonCompact, styles.practiceWordsButtonCompact]}
              onPress={() => setShowWordsList('forgotten')}
            >
              <Text style={styles.actionButtonTextCompact}>📝 Practice ({finalStats.forgotten})</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButtonCompact, styles.doneButtonCompact]}
              onPress={handleCompletionDone}
            >
              <Text style={[styles.actionButtonTextCompact, styles.doneButtonTextWhiteCompact]}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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
          <Text style={styles.roundBadgeText}>R{currentWord?.current_round || 1}</Text>
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

      {/* Card Deck Stack - Deck Swiper System */}
      <View style={styles.cardContainer}>
        {words.length > 0 ? (
          <Swiper
            ref={swiperRef}
            cards={words}
            renderCard={renderCard}
            onSwipedLeft={handleSwipedLeft}
            onSwipedRight={handleSwipedRight}
            onSwiped={handleSwiped}
            cardIndex={0}
            backgroundColor={'transparent'}
            stackSize={2}
            stackSeparation={15}
            disableTopSwipe={true}
            disableBottomSwipe={true}
            verticalSwipe={false}
            horizontalSwipe={true}
            cardHorizontalMargin={10}
            cardVerticalMargin={0}
            overlayLabels={{
              left: {
                title: '❌ FORGOT',
                style: {
                  label: {
                    backgroundColor: '#ef4444',
                    borderColor: '#ef4444',
                    color: 'white',
                    borderWidth: 1,
                    fontSize: 24,
                    fontWeight: 'bold',
                    borderRadius: 10,
                    textAlign: 'center',
                  },
                  wrapper: {
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'flex-start',
                    marginTop: 20,
                    marginLeft: -20,
                  }
                }
              },
              right: {
                title: '✅ REMEMBERED',
                style: {
                  label: {
                    backgroundColor: '#22c55e',
                    borderColor: '#22c55e',
                    color: 'white',
                    borderWidth: 1,
                    fontSize: 24,
                    fontWeight: 'bold',
                    borderRadius: 10,
                    textAlign: 'center',
                  },
                  wrapper: {
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    marginTop: 20,
                    marginLeft: 20,
                  }
                }
              }
            }}
            animateOverlayLabelsOpacity
            animateCardOpacity
            swipeBackCard
          />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
            <View style={styles.cardContent}>
              <Text style={[styles.cardWord, { color: colors.textPrimary }]}>
                {words.length === 0 ? 'No words available for review' : 'Loading word...'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Swipe right if you remembered • Swipe left if you forgot
        </Text>
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
          onPress={handleRevealPress}
        >
          <Text style={styles.actionButtonIcon}>👁️</Text>
          <Text style={styles.actionButtonText}>
            {(() => {
              const currentWord = swiperRef.current?.props.cards?.[currentIndex]
              return currentWord && revealedCards.get(currentWord.id) ? 'Hide' : 'Reveal'
            })()}
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
    height: SCREEN_HEIGHT - 390,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: SCREEN_WIDTH-20,
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
    // Remove absolute positioning for swiper cards
  },
  currentCard: {
    // Remove absolute positioning for swiper cards  
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
  cardContentLayer: {
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
    marginBottom: 20,
    zIndex: 1000,
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
    zIndex: 1001,
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
  },
  instructionText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // Compact Dashboard Screen Styles
  dashboardScreenCompact: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  dashboardHeaderCompact: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dashboardTitleCompact: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  
  // Main Stats Dashboard
  mainStatsContainer: {
    marginBottom: 30,
  },
  accuracyContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  accuracyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBackground,
    borderWidth: 6,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  accuracyNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  accuracyLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statCardSuccess: {
    borderColor: '#10B981',
    backgroundColor: colors.successLight || '#ECFDF5',
  },
  statCardWarning: {
    borderColor: '#F59E0B',
    backgroundColor: colors.warningLight || '#FEF3C7',
  },
  statCardNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Round Performance
  roundPerformanceContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  roundStatCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roundStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundStatTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundBadgeSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundBadgeSmallText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  roundStatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  roundStatAccuracy: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  roundStatBar: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: 3,
    marginBottom: 8,
  },
  roundStatBarFill: {
    height: '100%',
    borderRadius: 3,
    width: '100%',
    transformOrigin: 'left',
  },
  roundStatDetails: {
    alignItems: 'center',
  },
  roundStatDetail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  
  // Action Buttons
  actionButtonsContainer: {
    gap: 12,
  },
  dashboardActionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rememberedWordsButton: {
    backgroundColor: colors.successLight || '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  practiceWordsButton: {
    backgroundColor: colors.warningLight || '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  doneMainButton: {
    backgroundColor: colors.primary,
  },
  dashboardActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  doneButtonTextWhite: {
    color: '#FFFFFF',
  },
  
  // Word List Screen
  wordListScreen: {
    flex: 1,
  },
  wordListHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backToStatsButton: {
    marginBottom: 16,
  },
  backToStatsText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  wordListTitleContainer: {
    alignItems: 'center',
  },
  wordListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  wordListSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  wordsList: {
    flex: 1,
    padding: 20,
  },
  wordListItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  wordListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  wordListItemWord: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    flex: 1,
  },
  roundIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roundIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  wordListItemMeaning: {
    fontSize: 16,
    color: '#2D3748',
    marginBottom: 4,
  },
  wordListItemNotes: {
    fontSize: 14,
    color: '#4A5568',
    fontStyle: 'italic',
  },
  doneButton: {
    margin: 20,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Circular Progress Layout Styles - Larger Version
  circularStatsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  overallProgressContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  overallCircleContainerLarge: {
    width: 160,
    height: 160,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  svgCircle: {
    position: 'absolute',
  },
  overallProgressContentLarge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overallProgressNumberLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  overallProgressLabelLarge: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Round Progress Circles - Larger Version
  roundProgressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  roundProgressWrapper: {
    alignItems: 'center',
  },
  roundCircleContainerLarge: {
    width: 100,
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundProgressContentLarge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundProgressNumberLarge: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  roundProgressLabelLarge: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginTop: 2,
  },
  roundProgressCountLarge: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  
  // Quick Stats Row
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  
  // Compact Action Buttons
  actionButtonsCompact: {
    gap: 10,
  },
  actionButtonCompact: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rememberedWordsButtonCompact: {
    backgroundColor: colors.successLight || '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  practiceWordsButtonCompact: {
    backgroundColor: colors.warningLight || '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  doneButtonCompact: {
    backgroundColor: colors.primary,
  },
  actionButtonTextCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  doneButtonTextWhiteCompact: {
    color: '#FFFFFF',
  },
  
  // Badge and content layer styles for reveal functionality
  badgeIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
})