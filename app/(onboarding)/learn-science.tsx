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
import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/constants/design'

// Individual animated card component
const AnimatedCard = ({ 
  index, 
  text, 
  startAnimation, 
  colors 
}: { 
  index: number
  text: string
  startAnimation: boolean
  colors: any
}) => {
  const translateY = useSharedValue(50)
  const opacity = useSharedValue(0)
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  useEffect(() => {
    if (startAnimation) {
      translateY.value = withDelay(
        index * 200, // 200ms delay between cards
        withTiming(0, { 
          duration: 400, 
          easing: Easing.out(Easing.cubic)
        })
      )
      opacity.value = withDelay(
        index * 200,
        withTiming(1, { 
          duration: 400,
          easing: Easing.out(Easing.cubic)
        })
      )
    }
  }, [startAnimation, index])

  // Card background colors array
  const cardColors = [
    '#E0F2FE', // Light blue
    '#ECFDF5', // Light green
    '#FEF3C7', // Light yellow
    '#F3E8FF', // Light purple
    '#FEE2E2', // Light red
  ]

  const borderColors = [
    '#0EA5E9', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EF4444', // Red
  ]

  return (
    <Animated.View style={[animatedStyle, styles.card, { 
      backgroundColor: cardColors[index % cardColors.length],
      borderColor: borderColors[index % borderColors.length],
    }]}>
      <View style={styles.cardNumber}>
        <Text style={[styles.numberText, { color: borderColors[index % borderColors.length] }]}>
          {index + 1}
        </Text>
      </View>
      <Text style={[styles.cardText, { color: colors.textPrimary }]}>
        {text}
      </Text>
    </Animated.View>
  )
}

export default function LearnScienceScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [startAnimation, setStartAnimation] = useState(false)

  const sciencePoints = [
    "Transfer words to long-term memory naturally.",
    "Focus on lasting learning, not quick memorization.",
    "Write words and review them every two weeks.",
    "Forgotten words are automatically added to the next list.",
    "The app reminds, tracks, and makes learning easier."
  ]

  const handleContinue = () => {
    router.push('/(onboarding)/structured-progress')
  }

  // Start animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setStartAnimation(true)
    }, 500) // Small delay before starting

    return () => clearTimeout(timer)
  }, [])

  return (
    <OnboardingScreen
      currentStep={2}
      totalSteps={24}
      headline="Learn with Science."
      subtext="The Gold List Method is backed by cognitive science research. Here's how it works:"
      primaryButtonText="Show me more"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.cardsContainer}>
        {sciencePoints.map((point, index) => (
          <AnimatedCard
            key={index}
            index={index}
            text={point}
            startAnimation={startAnimation}
            colors={colors}
          />
        ))}
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  cardsContainer: {
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  numberText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: 'bold',
  },
  cardText: {
    flex: 1,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    lineHeight: 22,
  },
})