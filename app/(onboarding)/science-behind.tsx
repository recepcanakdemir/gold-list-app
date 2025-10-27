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

// Individual animated roadmap step component
const AnimatedRoadmapStep = ({ 
  stepNumber, 
  text, 
  isLast,
  startAnimation, 
  colors,
  delay 
}: { 
  stepNumber: number
  text: string
  isLast: boolean
  startAnimation: boolean
  colors: any
  delay: number
}) => {
  const translateY = useSharedValue(50)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.8)
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }))

  useEffect(() => {
    if (startAnimation) {
      translateY.value = withDelay(
        delay,
        withTiming(0, { 
          duration: 600, 
          easing: Easing.out(Easing.cubic)
        })
      )
      opacity.value = withDelay(
        delay,
        withTiming(1, { 
          duration: 600,
          easing: Easing.out(Easing.cubic)
        })
      )
      scale.value = withDelay(
        delay,
        withTiming(1, { 
          duration: 600,
          easing: Easing.out(Easing.back(1.1))
        })
      )
    }
  }, [startAnimation, delay])

  // Alternating colors for step circles
  const stepColors = [
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#06B6D4', // Cyan
  ]
  
  const stepColor = stepColors[(stepNumber - 1) % stepColors.length]

  return (
    <Animated.View style={[styles.roadmapStep, animatedStyle]}>
      <View style={styles.stepContainer}>
        {/* Step Circle */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepCircle, { backgroundColor: stepColor }]}>
            <Text style={styles.stepNumber}>{stepNumber}</Text>
          </View>
          {/* Connecting Line */}
          {!isLast && (
            <View style={[styles.connectingLine, { backgroundColor: colors.border }]} />
          )}
        </View>
        
        {/* Step Content */}
        <View style={[styles.stepContent, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.stepText, { color: colors.textPrimary }]}>
            {text}
          </Text>
        </View>
      </View>
    </Animated.View>
  )
}

export default function ScienceBehindScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [startAnimation, setStartAnimation] = useState(false)

  const sciencePrinciples = [
    "Research on spaced repetition suggests timed reviews help strengthen memory.",
    "Studies indicate that handwriting can improve processing and retention.",
    "Reducing immediate pressure may help with natural learning processes.",
    "Active recall through review is a well-established learning technique."
  ]

  const handleContinue = () => {
    router.push('/(onboarding)/step-1-add')
  }

  // Start animation immediately when component mounts
  useEffect(() => {
    setStartAnimation(true)
  }, [])

  return (
    <OnboardingScreen
      currentStep={5}
      totalSteps={24}
      headline="The Science Behind It."
      primaryButtonText="Tell me how it works"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.roadmapContainer}>
        {sciencePrinciples.map((principle, index) => (
          <AnimatedRoadmapStep
            key={index}
            stepNumber={index + 1}
            text={principle}
            isLast={index === sciencePrinciples.length - 1}
            startAnimation={startAnimation}
            colors={colors}
            delay={index * 150} // Staggered animation with 150ms between steps
          />
        ))}
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  roadmapContainer: {
    flex: 1,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  roadmapStep: {
    marginBottom: SPACING.lg,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: SPACING.md,
    minHeight: 100, // Ensure space for connecting line
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  stepNumber: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: '#FFFFFF',
  },
  connectingLine: {
    width: 2,
    flex: 1,
    marginTop: SPACING.sm,
    minHeight: 60,
  },
  stepContent: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    marginTop: SPACING.xs,
  },
  stepText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    lineHeight: 24,
  },
})