import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { useRouter } from 'expo-router'
import ReAnimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withDelay, 
  withTiming,
  runOnJS 
} from 'react-native-reanimated'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useSurvey } from '@/lib/contexts/SurveyContext'
import { SPACING, TYPOGRAPHY } from '@/lib/constants/design'
import { supabase } from '@/lib/supabase/client'

// AI Analysis Response Interface
interface AnalysisData {
  recommendedDailyWords: number
  yearlyTotal: number
  expectedMastery: number
  successProbability: number
  insights: {
    memoryStrategy: string
    progressionPlan: string
    focusAreas: string[]
    whyThisAmount: string
  }
  projections: {
    month1: number
    month3: number
    month6: number
    fluencyDays: number
  }
  error?: string
}

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
    if (animationStarted) {
      opacity.value = withDelay(
        delay + (index * 50), // 50ms delay between letters (faster)
        withTiming(1, { duration: 150 }, () => {
          if (onComplete) {
            runOnJS(onComplete)()
          }
        })
      )
    }
  }, [animationStarted, opacity, index, delay, letter])

  return (
    <ReAnimated.Text
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
    </ReAnimated.Text>
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
    <ReAnimated.Text
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
    </ReAnimated.Text>
  )
}

export default function LoadingScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { surveyData, setAnalysisData } = useSurvey()
  
  const [isComplete, setIsComplete] = useState(false)
  const [titleAnimationStarted, setTitleAnimationStarted] = useState(false)
  const [subtextAnimationStarted, setSubtextAnimationStarted] = useState(false)
  const progressAnim = useRef(new Animated.Value(0)).current

  const MINIMUM_LOADING_TIME = 3000 // 3 seconds
  
  const titleText = "We're setting up your plan…"
  const subtextText = "Analyzing your input and optimizing your learning schedule."
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

  useEffect(() => {
    startLoadingProcess()
    
    // Start title animation when component mounts
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

  const startLoadingProcess = async () => {
    const startTime = Date.now()

    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    }).start()

    try {
      console.log('🔍 Starting AI analysis...')
      
      // Call AI analysis
      const { data, error: rpcError } = await supabase.functions.invoke('analyze-survey', {
        body: { surveyData }
      })

      if (rpcError) {
        throw new Error(rpcError.message)
      }

      console.log('✅ AI analysis complete:', data)
      setAnalysisData(data)

    } catch (err) {
      console.error('❌ AI analysis failed:', err)
      
      // Fallback data
      const fallbackData: AnalysisData = {
        recommendedDailyWords: 15,
        yearlyTotal: 5475,
        expectedMastery: 3833,
        successProbability: 75,
        insights: {
          memoryStrategy: 'Gold List Method uses natural 14-day intervals to strengthen memory retention.',
          progressionPlan: 'Steady vocabulary growth through consistent daily practice.',
          focusAreas: ['Daily consistency', 'Natural retention', 'Vocabulary building'],
          whyThisAmount: 'Balanced approach suitable for most learning goals and schedules.'
        },
        projections: {
          month1: 450,
          month3: 1350,
          month6: 2700,
          fluencyDays: 365
        },
        error: err instanceof Error ? err.message : 'Analysis service temporarily unavailable'
      }
      setAnalysisData(fallbackData)
    }

    // Ensure minimum loading time
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, MINIMUM_LOADING_TIME - elapsed)
    
    setTimeout(() => {
      setIsComplete(true)
    }, remaining)
  }

  const handleContinue = () => {
    router.push('/(onboarding)/insights')
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <OnboardingScreen
      currentStep={21}
      totalSteps={24}
      headline="" // We'll provide custom animated headline
      subtext=""  // We'll provide custom animated subtext
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showProgress={true}
      showSkip={false}
      showPrimaryButton={isComplete}
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

        {/* Custom Progress Bar */}
        <View style={styles.progressSection}>
          <View style={[styles.progressBackground, { backgroundColor: colors.border || '#E5E5E5' }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressWidth,
                  backgroundColor: colors.primary || '#007AFF',
                },
              ]}
            />
          </View>
        </View>
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  progressSection: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
    marginTop: SPACING.xl * 2,
  },
  progressBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
})