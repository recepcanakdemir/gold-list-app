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

// Key principles of Gold List Method
const keyPrinciples = [
  {
    id: 1,
    title: "14-Day Natural Memory",
    description: "Let your brain process naturally",
    emoji: "🧠"
  },
  {
    id: 2,
    title: "No Forced Repetition", 
    description: "Stress-free learning approach",
    emoji: "🚫"
  },
  {
    id: 3,
    title: "Remember = Done Forever",
    description: "Once learned, never asked again",
    emoji: "✅"
  },
  {
    id: 4,
    title: "Natural Learning Process",
    description: "Works with your brain, not against it",
    emoji: "🌱"
  }
]

// Animated Principle Card Component
const AnimatedPrincipleCard = ({ 
  principle, 
  index, 
  startAnimation,
  colors 
}: { 
  principle: any
  index: number
  startAnimation: boolean
  colors: any
}) => {
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.8)
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  useEffect(() => {
    if (startAnimation) {
      opacity.value = withDelay(
        index * 200,
        withTiming(1, { duration: 600 })
      )
      scale.value = withDelay(
        index * 200,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.1)) })
      )
    }
  }, [startAnimation, index])

  return (
    <Animated.View style={[styles.principleCard, { 
      backgroundColor: colors.cardBackground,
      borderColor: colors.border,
    }, animatedStyle]}>
      <Text style={styles.cardEmoji}>{principle.emoji}</Text>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
        {principle.title}
      </Text>
      <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
        {principle.description}
      </Text>
    </Animated.View>
  )
}

export default function Step5FocusScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [startAnimation, setStartAnimation] = useState(false)

  const handleContinue = () => {
    router.push('/(onboarding)/personalization')
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
      currentStep={10}
      totalSteps={24}
      headline="What Gold List Method Focuses On"
      subtext="These core principles make the Gold List Method uniquely effective for long-term vocabulary retention."
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.container}>
        <View style={styles.principlesGrid}>
          {keyPrinciples.map((principle, index) => (
            <AnimatedPrincipleCard
              key={principle.id}
              principle={principle}
              index={index}
              startAnimation={startAnimation}
              colors={colors}
            />
          ))}
        </View>
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  principlesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  principleCard: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  cardEmoji: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.bold,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  cardDescription: {
    fontSize: TYPOGRAPHY.xs,
    textAlign: 'center',
    lineHeight: 16,
  },
})