import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withDelay, 
  withTiming,
  Easing 
} from 'react-native-reanimated'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '@/lib/constants/design'
import { ROUND_COLORS, NOTEBOOK_LEVEL_COLORS } from '@/lib/types/goldlist'

// Sample words for each round (12 rounds total) - all using same word
const sampleWords = [
  // Bronze Level (Rounds 1-4)
  { round: 1, word: 'Apprendre', level: 'bronze' },
  { round: 2, word: 'Apprendre', level: 'bronze' },
  { round: 3, word: 'Apprendre', level: 'bronze' },
  { round: 4, word: 'Apprendre', level: 'bronze' },
  
  // Silver Level (Rounds 5-8)
  { round: 5, word: 'Apprendre', level: 'silver' },
  { round: 6, word: 'Apprendre', level: 'silver' },
  { round: 7, word: 'Apprendre', level: 'silver' },
  { round: 8, word: 'Apprendre', level: 'silver' },
  
  // Gold Level (Rounds 9-12)
  { round: 9, word: 'Apprendre', level: 'gold' },
  { round: 10, word: 'Apprendre', level: 'gold' },
  { round: 11, word: 'Apprendre', level: 'gold' },
  { round: 12, word: 'Apprendre', level: 'gold' },
]

// Animated Review Card Component
const AnimatedRoundCard = ({ 
  wordData, 
  index, 
  startAnimation,
  colors,
  styles
}: { 
  wordData: any
  index: number
  startAnimation: boolean
  colors: any
  styles: any
}) => {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.8)
  
  const roundColors = ROUND_COLORS[wordData.round as keyof typeof ROUND_COLORS]
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  useEffect(() => {
    if (startAnimation) {
      opacity.value = withDelay(
        index * 150,
        withTiming(1, { duration: 600 })
      )
      scale.value = withDelay(
        index * 150,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.1)) })
      )
    }
  }, [startAnimation, index])

  return (
    <Animated.View style={[animatedStyle, styles.roundCard, { 
      backgroundColor: roundColors.light,
    }]}>
      <View style={styles.cardContent}>
        {/* Round Badge */}
        <View style={[styles.roundBadge, { backgroundColor: roundColors.primary }]}>
          <Text style={styles.roundBadgeText}>R{wordData.round}</Text>
        </View>
        
        {/* Word */}
        <Text style={[styles.wordText, { color: roundColors.dark }]}>
          {wordData.word}
        </Text>
      </View>
    </Animated.View>
  )
}

export default function Step4RoundsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = createStyles(colors)
  const [startAnimation, setStartAnimation] = useState(false)

  const handleContinue = () => {
    router.push('/(onboarding)/step-5-focus')
  }

  // Start animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setStartAnimation(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <OnboardingScreen
      currentStep={9}
      totalSteps={24}
      headline="Step 4 – Progress Through Rounds"
      subtext="Each forgotten word moves to the next round. After 4 rounds of failing, they move to the next level: Bronze → Silver → Gold."
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.container}>
        {/* Bronze Level - Row 1 */}
        <View style={styles.levelSection}>
          <View style={[styles.levelBadge, { backgroundColor: NOTEBOOK_LEVEL_COLORS.bronze.primary }]}>
            <Text style={styles.levelBadgeText}>BRONZE</Text>
          </View>
          <View style={styles.rowContainer}>
            {sampleWords.slice(0, 4).map((wordData, index) => (
              <AnimatedRoundCard
                key={wordData.round}
                wordData={wordData}
                index={index}
                startAnimation={startAnimation}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        </View>

        {/* Silver Level - Row 2 */}
        <View style={styles.levelSection}>
          <View style={[styles.levelBadge, { backgroundColor: NOTEBOOK_LEVEL_COLORS.silver.primary }]}>
            <Text style={styles.levelBadgeText}>SILVER</Text>
          </View>
          <View style={styles.rowContainer}>
            {sampleWords.slice(4, 8).map((wordData, index) => (
              <AnimatedRoundCard
                key={wordData.round}
                wordData={wordData}
                index={index + 4}
                startAnimation={startAnimation}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        </View>

        {/* Gold Level - Row 3 */}
        <View style={styles.levelSection}>
          <View style={[styles.levelBadge, { backgroundColor: NOTEBOOK_LEVEL_COLORS.gold.primary }]}>
            <Text style={styles.levelBadgeText}>GOLD</Text>
          </View>
          <View style={styles.rowContainer}>
            {sampleWords.slice(8, 12).map((wordData, index) => (
              <AnimatedRoundCard
                key={wordData.round}
                wordData={wordData}
                index={index + 8}
                startAnimation={startAnimation}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        </View>
      </View>
    </OnboardingScreen>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
  },
  levelSection: {
    marginBottom: SPACING.md,
  },
  levelBadge: {
    alignSelf: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  levelBadgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundCard: {
    width: '21%', // 4 cards per row with small gap (1.1x smaller)
    aspectRatio: 0.9, // Slightly taller than wide to fit text
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
  },
  cardContent: {
    flex: 1,
    padding: SPACING.xs,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  roundBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    minWidth: 20,
  },
  roundBadgeText: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  wordText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    textAlign: 'center',
    marginTop: 8,
  },
})