import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '@/lib/constants/design'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

// Round colors matching the real app
const ROUND_COLORS = {
  1: { primary: '#DC2626', light: '#FEE2E2', dark: '#B91C1C' }, // Red
  2: { primary: '#059669', light: '#D1FAE5', dark: '#047857' }, // Green  
  3: { primary: '#2563EB', light: '#DBEAFE', dark: '#1D4ED8' }, // Blue
  4: { primary: '#D97706', light: '#FED7AA', dark: '#B45309' }, // Orange/Yellow
}

// Sample words for demonstration
const sampleWords = [
  {
    id: '1',
    word: 'Biblioteca',
    meaning: 'Library',
    current_round: 2,
    example_sentence: 'La <b>biblioteca</b> está cerrada.',
    sentence_meaning: 'The <b>library</b> is closed.',
    word_type: 'noun'
  },
  {
    id: '2',
    word: 'Schnell',
    meaning: 'Fast, quickly',
    current_round: 3,
    example_sentence: 'Das Auto fährt sehr <b>schnell</b>.',
    sentence_meaning: 'The car drives very <b>fast</b>.',
    word_type: 'adverb'
  }
]

// Helper function to render bold text
const renderBoldText = (text: string, baseStyle: any) => {
  if (!text) return null
  
  const parts = text.split(/(<b>.*?<\/b>)/g)
  
  return (
    <Text style={baseStyle}>
      {parts.map((part, index) => {
        if (part.startsWith('<b>') && part.endsWith('</b>')) {
          const boldText = part.slice(3, -4)
          return (
            <Text key={index} style={{ fontWeight: 'bold' }}>
              {boldText}
            </Text>
          )
        } else {
          return part
        }
      })}
    </Text>
  )
}

// Static Review Card Component
const StaticReviewCard = ({ 
  word, 
  swipeDirection,
  colors
}: {
  word: any
  swipeDirection: 'left' | 'right'
  colors: any
}) => {
  const roundColors = ROUND_COLORS[word.current_round as keyof typeof ROUND_COLORS] || ROUND_COLORS[1]
  
  // Static transforms for slight swipe effect
  const swipeTransform = {
    translateX: swipeDirection === 'left' ? -30 : 30,
    rotateZ: swipeDirection === 'left' ? -8 : 8
  }

  return (
    <View style={[styles.card, {
      backgroundColor: roundColors.light,
      transform: [
        { translateX: swipeTransform.translateX },
        { rotateZ: `${swipeTransform.rotateZ}deg` }
      ]
    }]}>
      <View style={styles.cardContent}>
        {/* Round Badge */}
        <View style={styles.roundBadge}>
          <View style={[styles.roundIndicator, { backgroundColor: roundColors.primary }]}>
            <Text style={styles.roundText}>R{word.current_round}</Text>
          </View>
        </View>

        {/* Card Content - Always showing meaning (revealed state) */}
        <View style={styles.cardSide}>
          {word.example_sentence && (
            <View style={styles.exampleContainer}>
              <Text style={styles.cardExampleSentence}>
                "{renderBoldText(word.example_sentence, styles.cardExampleSentence)}"
              </Text>
            </View>
          )}
          {word.sentence_meaning && (
            <View style={styles.sentenceMeaningContainer}>
              <Text style={styles.cardSentenceMeaning}>
                {renderBoldText(word.sentence_meaning, styles.cardSentenceMeaning)}
              </Text>
            </View>
          )}
          <Text style={styles.cardMeaning}>{word.meaning}</Text>
          <Text style={styles.cardOriginal}>{word.word}</Text>
          {word.word_type && word.word_type !== 'unknown' && (
            <Text style={styles.wordType}>
              ({word.word_type === 'adjective' ? 'adj' : 
                word.word_type === 'adverb' ? 'adv' : 
                word.word_type})
            </Text>
          )}
        </View>

        {/* Swipe Overlay - Always visible */}
        <View style={[
          styles.swipeOverlay,
          { backgroundColor: swipeDirection === 'right' ? '#10B981' : '#EF4444' }
        ]}>
          <Text style={styles.swipeOverlayText}>
            {swipeDirection === 'right' ? '✅ Remembered' : '❌ Forgot'}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default function Step3ReviewScreen() {
  const router = useRouter()
  const { colors } = useTheme()

  const handleContinue = () => {
    router.push('/(onboarding)/step-4-rounds')
  }

  return (
    <OnboardingScreen
      currentStep={8}
      totalSteps={24}
      headline="Step 3 – Review and Filter"
      mainText="Magic Starts"
      subtext="After 14 days, review your list. Keep forgotten words, archive remembered ones."
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.demoContainer}>
        <View style={styles.cardStackContainer}>
          {/* Bottom card - Remembered (swiped right) */}
          <View style={[styles.cardInStack, styles.bottomCard]}>
            <StaticReviewCard
              word={sampleWords[1]}
              swipeDirection="right"
              colors={colors}
            />
          </View>
          
          {/* Top card - Forgot (swiped left) */}
          <View style={[styles.cardInStack, styles.topCard]}>
            <StaticReviewCard
              word={sampleWords[0]}
              swipeDirection="left"
              colors={colors}
            />
          </View>
        </View>
        
        <View style={styles.instructions}>
          <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
            Swipe left if you forget, swipe right if you remembered
          </Text>
        </View>
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  demoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardStackContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    height: (SCREEN_HEIGHT * 0.35) / 1.4 + 40, // Card height + offset space
  },
  cardInStack: {
    position: 'absolute',
  },
  bottomCard: {
    zIndex: 1,
    transform: [
      { scale: 0.95 },
      { translateY: 10 },
      { translateX: 5 }
    ],
    opacity: 0.8,
  },
  topCard: {
    zIndex: 2,
    transform: [{ scale: 1 }],
  },
  card: {
    width: (SCREEN_WIDTH * 0.4) / 1.4,
    height: (SCREEN_HEIGHT * 0.35) / 1.4,
    borderRadius: 12,
    ...SHADOWS.lg,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.md,
    position: 'relative',
  },
  roundBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 10,
  },
  roundIndicator: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  roundText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: TYPOGRAPHY.bold,
  },
  cardSide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exampleContainer: {
    marginBottom: SPACING.sm,
  },
  cardExampleSentence: {
    fontSize: TYPOGRAPHY.xs,
    color: '#000000',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  sentenceMeaningContainer: {
    marginBottom: SPACING.sm,
  },
  cardSentenceMeaning: {
    fontSize: TYPOGRAPHY.xs,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 16,
  },
  cardMeaning: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: '#000000',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  cardOriginal: {
    fontSize: TYPOGRAPHY.sm,
    color: '#000000',
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: SPACING.xs,
  },
  wordType: {
    fontSize: TYPOGRAPHY.xs,
    color: '#000000',
    textAlign: 'center',
    opacity: 0.6,
  },
  swipeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
  },
  swipeOverlayText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: '#fff',
  },
  instructions: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  instructionText: {
    fontSize: TYPOGRAPHY.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})