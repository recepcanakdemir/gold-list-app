import React, { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import * as Haptics from 'expo-haptics'
import ReactNativeHapticFeedback from 'react-native-haptic-feedback'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withDelay, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY } from '@/lib/constants/design'

// Individual animated letter component for title
const AnimatedTitleLetter = ({ 
  letter, 
  index, 
  animationStarted, 
  colors, 
  delay = 0,
  onComplete
}: { 
  letter: string
  index: number
  animationStarted: boolean
  colors: any
  delay?: number
  onComplete?: () => void
}) => {
  const opacity = useSharedValue(0)
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  useEffect(() => {
    const triggerHaptic = () => {
      if (letter !== ' ') { // Don't vibrate for spaces
        try {
          ReactNativeHapticFeedback.trigger('impactMedium', { enableVibrateFallback: true })
        } catch (err) {
          // Fallback to expo-haptics if ReactNativeHapticFeedback fails
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {})
        }
      }
    }

    if (animationStarted) {
      // Start visual animation with haptic feedback
      opacity.value = withDelay(
        delay + (index * 50), // 50ms delay between letters (faster)
        withTiming(1, { duration: 150 }, () => {
          runOnJS(triggerHaptic)()
          if (onComplete) {
            runOnJS(onComplete)()
          }
        })
      )
    }
  }, [animationStarted, opacity, index, delay, letter])

  return (
    <Animated.Text
      style={[
        animatedStyle,
        {
          fontSize: TYPOGRAPHY['3xl'],
          fontWeight: 'bold' as any,
          color: colors.textPrimary,
          textAlign: 'center',
          lineHeight: 40,
        }
      ]}
    >
      {letter}
    </Animated.Text>
  )
}

// Individual animated letter component for subtext
const AnimatedSubtextLetter = ({ 
  letter, 
  index, 
  animationStarted, 
  colors, 
  delay = 0 
}: { 
  letter: string
  index: number
  animationStarted: boolean
  colors: any
  delay?: number 
}) => {
  const opacity = useSharedValue(0)
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  useEffect(() => {
    if (animationStarted) {
      opacity.value = withDelay(
        delay + (index * 30), // 30ms delay between letters (faster)
        withTiming(1, { duration: 100 })
      )
    }
  }, [animationStarted, opacity, index, delay])

  return (
    <Animated.Text
      style={[
        animatedStyle,
        {
          fontSize: TYPOGRAPHY.base,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
        }
      ]}
    >
      {letter}
    </Animated.Text>
  )
}

export default function PersonalizationScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [titleAnimationStarted, setTitleAnimationStarted] = useState(false)
  const [subtextAnimationStarted, setSubtextAnimationStarted] = useState(false)

  const handleContinue = () => {
    router.push('/(onboarding)/survey')
  }

  const titleText = "Before we start…"
  const subtextText = "Let's personalize your learning journey."
  const titleLetters = titleText.split('')
  const subtextLetters = subtextText.split('')

  // Calculate when title animation completes
  const titleAnimationDuration = titleLetters.length * 50 + 150 // 50ms per letter + 150ms final animation

  const handleTitleComplete = () => {
    // Only trigger on the last letter
    const isLastLetter = true // We'll track this properly
    if (isLastLetter) {
      setTimeout(() => {
        setSubtextAnimationStarted(true)
      }, 300) // Small delay before starting subtext
    }
  }

  // Start title animation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setTitleAnimationStarted(true)
    }, 500) // Small delay before starting

    return () => clearTimeout(timer)
  }, [])

  // Start subtext animation after title completes
  useEffect(() => {
    if (titleAnimationStarted) {
      const timer = setTimeout(() => {
        setSubtextAnimationStarted(true)
      }, titleAnimationDuration + 300) // Wait for title to complete + small delay

      return () => clearTimeout(timer)
    }
  }, [titleAnimationStarted])

  return (
    <OnboardingScreen
      currentStep={11}
      totalSteps={24}
      headline="" // We'll provide custom headline
      subtext="" // We'll provide custom subtext
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={false}
    >
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        {/* Title Animation */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
          {titleLetters.map((letter, index) => (
            <AnimatedTitleLetter
              key={`title-${index}`}
              letter={letter}
              index={index}
              animationStarted={titleAnimationStarted}
              colors={colors}
              delay={0}
              onComplete={index === titleLetters.length - 1 ? handleTitleComplete : undefined}
            />
          ))}
        </View>

        {/* Subtext Animation */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20 }}>
          {subtextLetters.map((letter, index) => (
            <AnimatedSubtextLetter
              key={`subtext-${index}`}
              letter={letter}
              index={index}
              animationStarted={subtextAnimationStarted}
              colors={colors}
              delay={0}
            />
          ))}
        </View>
      </View>
    </OnboardingScreen>
  )
}