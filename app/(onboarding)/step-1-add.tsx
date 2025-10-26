import { OnboardingScreen } from '@/components/OnboardingScreen'
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming
} from 'react-native-reanimated'

// Sample word data for animation
const sampleWords = [
  { word: "Aprende", meaning: "To learn" },
  { word: "Libro", meaning: "Book" },
  { word: "Caminar", meaning: "To walk" },
  { word: "Feliz", meaning: "Happy" }
]

// Animated Text Input Component
const AnimatedTextInput = ({ 
  targetText, 
  isActive, 
  placeholder, 
  label, 
  delay = 0,
  colors 
}: {
  targetText: string
  isActive: boolean
  placeholder: string
  label: string
  delay?: number
  colors: any
}) => {
  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(false)
  const charIndex = useSharedValue(0)
  const opacity = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  // Update display text based on character index
  useDerivedValue(() => {
    if (isActive && charIndex.value <= targetText.length) {
      const currentText = targetText.substring(0, Math.floor(charIndex.value))
      runOnJS(setDisplayText)(currentText)
      runOnJS(setShowCursor)(charIndex.value < targetText.length)
    }
  })

  useEffect(() => {
    if (isActive) {
      // Start animation with delay
      opacity.value = withDelay(delay, withTiming(1, { duration: 300 }))
      
      // Start typing animation
      charIndex.value = withDelay(
        delay + 400,
        withTiming(targetText.length, { 
          duration: targetText.length * 120, // 120ms per character
          easing: Easing.linear 
        })
      )
    } else {
      // Reset for next cycle
      opacity.value = withTiming(0.5, { duration: 200 })
      charIndex.value = 0
      runOnJS(setDisplayText)('')
      runOnJS(setShowCursor)(false)
    }
  }, [isActive, targetText, delay])

  return (
    <Animated.View style={[styles.inputGroup, animatedStyle]}>
      <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
        {label} <Text style={styles.requiredAsterisk}>*</Text>
      </Text>
      <View style={[styles.inputContainer, { 
        backgroundColor: colors.cardBackground,
        borderColor: isActive ? colors.primary : colors.border,
        borderWidth: isActive ? 2 : 1,
      }]}>
        <Text style={[styles.inputText, { color: colors.textPrimary }]}>
          {displayText}
          {showCursor && <Text style={[styles.cursor, { color: colors.primary }]}>|</Text>}
        </Text>
        {!displayText && (
          <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
            {placeholder}
          </Text>
        )}
      </View>
    </Animated.View>
  )
}

export default function Step1AddScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [typingState, setTypingState] = useState<'word' | 'meaning' | 'pause' | 'clear'>('word')
  const [cycleStarted, setCycleStarted] = useState(false)

  const currentWord = sampleWords[currentWordIndex]

  const handleContinue = () => {
    router.push('/(onboarding)/step-2-wait')
  }

  // Animation cycle management
  useEffect(() => {
    if (!cycleStarted) {
      setCycleStarted(true)
      return
    }

    const runCycle = () => {
      // Word typing phase (2 seconds)
      setTypingState('word')
      
      setTimeout(() => {
        // Meaning typing phase (2.5 seconds)
        setTypingState('meaning')
        
        setTimeout(() => {
          // Pause phase (1 second)
          setTypingState('pause')
          
          setTimeout(() => {
            // Clear phase (0.3 seconds)
            setTypingState('clear')
            
            setTimeout(() => {
              // Move to next word
              setCurrentWordIndex((prev) => (prev + 1) % sampleWords.length)
            }, 300)
          }, 1000)
        }, 2500)
      }, 2000)
    }

    runCycle()
  }, [currentWordIndex, cycleStarted])

  // Start initial cycle
  useEffect(() => {
    const timer = setTimeout(() => {
      setCycleStarted(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <OnboardingScreen
      currentStep={6}
      totalSteps={24}
      headline="Step 1 – Add Words"
      subtext="Every day, add 10, 15, 20, or 25 words. Just once — no forced repetition."
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.demoContainer}>
        <View style={styles.inputDemo}>
          <AnimatedTextInput
            targetText={currentWord.word}
            isActive={typingState === 'word'}
            placeholder="Vocabulary word"
            label="Word"
            delay={0}
            colors={colors}
          />
          
          <AnimatedTextInput
            targetText={currentWord.meaning}
            isActive={typingState === 'meaning'}
            placeholder="Translation or meaning"
            label="Definition"
            delay={0}
            colors={colors}
          />
        </View>
        
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  demoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  inputDemo: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    marginBottom: SPACING.xs,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  inputContainer: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 56,
    justifyContent: 'center',
    position: 'relative',
    ...SHADOWS.sm,
  },
  inputText: {
    fontSize: TYPOGRAPHY.base,
    lineHeight: 24,
  },
  cursor: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: 'bold',
  },
  placeholderText: {
    fontSize: TYPOGRAPHY.base,
    position: 'absolute',
    left: SPACING.lg,
    pointerEvents: 'none',
  },
  helpText: {
    alignItems: 'center',
    paddingTop: SPACING.lg,
  },
  helpTextContent: {
    fontSize: TYPOGRAPHY.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})