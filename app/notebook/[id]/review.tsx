import React, { useState, useEffect, useRef, useMemo } from 'react'
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
import { mockDataService } from '@/lib/services/mockData'
import { WordWithReviews, NotebookWithStats } from '@/lib/types/goldlist'
import { ROUND_COLORS } from '@/lib/types/goldlist'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import * as Haptics from 'expo-haptics'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2 // More responsive - 20% of screen width

export default function ReviewScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  
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

  // Animation values - Tinder-style with directional rotation
  const translateX = useRef(new Animated.Value(0)).current
  const rotate = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current
  const opacity = useRef(new Animated.Value(1)).current

  // Pre-calculate colors for all words to prevent flash
  const wordColorsMap = useMemo(() => {
    const colorsMap = new Map()
    words.forEach(word => {
      const roundColors = ROUND_COLORS[word.current_round as keyof typeof ROUND_COLORS]
      colorsMap.set(word.id, roundColors)
    })
    return colorsMap
  }, [words])

  useEffect(() => {
    loadReviewData()
  }, [id])

  const loadReviewData = async () => {
    try {
      const [notebookData, wordsData] = await Promise.all([
        mockDataService.getNotebook(id!),
        mockDataService.getWordsForReview(id!)
      ])
      
      setNotebook(notebookData)
      setWords(wordsData)
      
      if (wordsData.length === 0) {
        Alert.alert(
          'No Reviews Due',
          'Great job! You don\'t have any words ready for review.',
          [{ text: 'OK', onPress: () => router.back() }]
        )
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load review words')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  const handleGesture = (event: any) => {
    const { translationX } = event.nativeEvent
    
    // Horizontal movement with Tinder-style directional rotation
    translateX.setValue(translationX)
    
    // 30 degree rotation based on swipe direction (like Tinder)
    const maxRotation = 30 // degrees
    const rotationValue = (translationX / SCREEN_WIDTH) * maxRotation
    rotate.setValue(rotationValue)
    
    // Subtle scale effect based on distance from center
    const progress = Math.abs(translationX) / SCREEN_WIDTH
    const scaleValue = 1 - progress * 0.05 // Very subtle scale (0.95 minimum)
    scale.setValue(scaleValue)
    
    // Fade effect based on swipe distance
    const opacityValue = 1 - progress * 0.3 // Fade to 0.7 minimum
    opacity.setValue(opacityValue)
  }

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
      Animated.spring(translateX, { 
        toValue: 0, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      Animated.spring(rotate, { 
        toValue: 0, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      Animated.spring(scale, { 
        toValue: 1, 
        useNativeDriver: true,
        tension: 100,
        friction: 8
      }),
      Animated.spring(opacity, { 
        toValue: 1, 
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

    // Smooth card exit animation with full rotation
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.2 : -SCREEN_WIDTH * 1.2
    const toRotation = direction === 'right' ? 30 : -30 // Full 30 degree lean on exit
    
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: toX,
        duration: 250, // Faster for snappier feel
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: toRotation,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200, // Fade out quickly
        useNativeDriver: true,
      }),
    ]).start(() => {
      processReview(remembered)
    })
  }

  const processReview = async (remembered: boolean) => {
    const currentWord = words[currentIndex]
    
    try {
      await mockDataService.processWordReview(currentWord.id, remembered)
      
      // Update review stats
      setReviewedWords(prev => ({
        remembered: prev.remembered + (remembered ? 1 : 0),
        forgotten: prev.forgotten + (remembered ? 0 : 1),
        total: prev.total + 1,
      }))

      // Move to next word
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setShowMeaning(false)
        resetAnimations()
      } else {
        // Review session complete
        completeReviewSession()
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to process review')
    }
  }

  const resetAnimations = () => {
    translateX.setValue(0)
    rotate.setValue(0)
    scale.setValue(1)
    opacity.setValue(1)
  }

  const completeReviewSession = () => {
    const sessionDuration = Math.round((Date.now() - sessionStartTime) / 1000 / 60) // minutes
    const accuracy = Math.round((reviewedWords.remembered / reviewedWords.total) * 100)
    
    Alert.alert(
      'Review Complete! 🎉',
      `Great work! You reviewed ${reviewedWords.total} words in ${sessionDuration} minutes.\n\nAccuracy: ${accuracy}%\nRemembered: ${reviewedWords.remembered}\nNeed more practice: ${reviewedWords.forgotten}`,
      [
        {
          text: 'Review More',
          onPress: () => {
            // Reset for another round
            setCurrentIndex(0)
            setShowMeaning(false)
            setReviewedWords({ remembered: 0, forgotten: 0, total: 0 })
            resetAnimations()
          }
        },
        {
          text: 'Done',
          onPress: () => router.back(),
          style: 'default'
        }
      ]
    )
  }

  const handleCardTap = () => {
    setShowMeaning(!showMeaning)
    Haptics.selectionAsync()
  }

  const handleButtonPress = (remembered: boolean) => {
    handleSwipe(remembered ? 'right' : 'left')
  }

  // Create basic styles for early returns
  const basicStyles = createStyles(colors)

  if (loading) {
    return (
      <SafeAreaView style={basicStyles.container}>
        <View style={basicStyles.loadingContainer}>
          <Text style={basicStyles.loadingText}>Loading review...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!notebook || words.length === 0) {
    return (
      <SafeAreaView style={basicStyles.container}>
        <View style={basicStyles.loadingContainer}>
          <Text style={basicStyles.loadingText}>No words to review</Text>
        </View>
      </SafeAreaView>
    )
  }

  const currentWord = words[currentIndex]
  const roundColors = wordColorsMap.get(currentWord.id) || ROUND_COLORS[1]
  const styles = createStyles(colors, roundColors)
  const progress = (currentIndex + 1) / words.length

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
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

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {/* Next card preview */}
        {currentIndex < words.length - 1 && (
          <View style={[styles.card, styles.nextCard, { borderColor: roundColors.primary }]}>
            <Text style={styles.cardWord}>{words[currentIndex + 1].word}</Text>
          </View>
        )}

        {/* Current card */}
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
              { borderColor: roundColors.primary },
              {
                transform: [
                  { translateX },
                  { rotate: rotate.interpolate({
                    inputRange: [-30, 30],
                    outputRange: ['-30deg', '30deg']
                  }) },
                  { scale }
                ],
                opacity
              }
            ]}
          >
            <TouchableOpacity style={styles.cardContent} onPress={handleCardTap} activeOpacity={0.8}>
              {/* Word side */}
              {!showMeaning && (
                <View style={styles.cardSide}>
                  <Text style={[styles.cardWord, { color: '#000000' }]}>{currentWord.word}</Text>
                  {currentWord.notes && (
                    <Text style={[styles.cardNotes, { color: '#000000' }]}>{currentWord.notes}</Text>
                  )}
                  <Text style={[styles.tapHint, { color: '#000000' }]}>Tap to reveal meaning</Text>
                </View>
              )}

              {/* Meaning side */}
              {showMeaning && (
                <View style={styles.cardSide}>
                  <Text style={[styles.cardMeaning, { color: '#000000' }]}>{currentWord.meaning}</Text>
                  <Text style={[styles.cardOriginal, { color: '#000000' }]}>{currentWord.word}</Text>
                  {currentWord.notes && (
                    <Text style={[styles.cardNotes, { color: '#000000' }]}>{currentWord.notes}</Text>
                  )}
                  <Text style={[styles.swipeHint, { color: '#000000' }]}>Swipe or use buttons below</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Swipe indicators - Tinder-style */}
            <Animated.View
              style={[
                styles.swipeIndicator,
                styles.leftIndicator,
                {
                  opacity: translateX.interpolate({
                    inputRange: [-SCREEN_WIDTH, -80, 0],
                    outputRange: [1, 0.9, 0],
                    extrapolate: 'clamp'
                  }),
                  transform: [{
                    scale: translateX.interpolate({
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
                  opacity: translateX.interpolate({
                    inputRange: [0, 80, SCREEN_WIDTH],
                    outputRange: [0, 0.9, 1],
                    extrapolate: 'clamp'
                  }),
                  transform: [{
                    scale: translateX.interpolate({
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
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.forgotButton]}
          onPress={() => handleButtonPress(false)}
          disabled={!showMeaning}
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
          disabled={!showMeaning}
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

const createStyles = (colors: any, roundColors?: any) => StyleSheet.create({
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
    backgroundColor: roundColors ? roundColors.light : colors.cardBackground,
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
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
    zIndex: 1,
  },
  currentCard: {
    zIndex: 2,
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