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
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/constants/design'

// Simple animated word component
const AnimatedWord = ({ 
  word, 
  index, 
  startAnimation, 
  colors 
}: { 
  word: string
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
    <Animated.View style={[animatedStyle, styles.wordBubble, { 
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary + '40',
    }]}>
      <Text style={[styles.wordText, { color: colors.primary }]}>
        {word}
      </Text>
    </Animated.View>
  )
}

export default function StructuredProgressScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [startAnimation, setStartAnimation] = useState(false)

  const words = ['Hello', 'Bonjour', 'Hola', 'Guten Tag', 'Ciao']

  const handleContinue = () => {
    router.push('/(onboarding)/track-grow')
  }

  // Start animation immediately when component mounts
  useEffect(() => {
    setStartAnimation(true)
  }, [])

  return (
    <OnboardingScreen
      currentStep={3}
      totalSteps={24}
      headline="Structured, but stress-free."
      subtext="Gold List method doesn't force memorization — it lets words sink in naturally, at your own pace."
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.visualizationContainer}>
        <View style={styles.wordsContainer}>
          {words.map((word, index) => (
            <AnimatedWord
              key={word}
              word={word}
              index={index}
              startAnimation={startAnimation}
              colors={colors}
            />
          ))}
        </View>
        
        <View style={styles.brainContainer}>
          <MaterialCommunityIcons 
            name="brain" 
            size={160} 
            color={colors.primary} 
            style={styles.brainIcon}
          />
          <Text style={[styles.brainText, { color: colors.textSecondary }]}>
            Natural Learning
          </Text>
        </View>
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  visualizationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  wordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  wordBubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  wordText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
  },
  brainContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
  },
  brainIcon: {
    marginBottom: SPACING.sm,
  },
  brainText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
})