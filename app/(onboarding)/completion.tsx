import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withDelay
} from 'react-native-reanimated'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { SPACING, TYPOGRAPHY } from '@/lib/constants/design'

export default function CompletionScreen() {
  const router = useRouter()
  const { completeOnboarding } = useAuth()
  const { getUserState } = useSubscription()
  const [isCompleting, setIsCompleting] = useState(false)
  
  // Animation values
  const scale = useSharedValue(0)
  const rotation = useSharedValue(0)
  const opacity = useSharedValue(0)

  // Start celebration animation when component mounts
  useEffect(() => {
    // Scale up with bounce
    scale.value = withDelay(
      300,
      withSpring(1, { 
        damping: 8, 
        stiffness: 100,
        mass: 1.2
      })
    )
    
    // Fade in
    opacity.value = withDelay(
      300,
      withSpring(1, { duration: 800 })
    )
    
    // Gentle continuous rotation
    rotation.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withSpring(5, { duration: 1000 }),
          withSpring(-5, { duration: 1000 })
        ),
        -1,
        true
      )
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
    opacity: opacity.value,
  }))

  const handleStartLearning = async () => {
    if (isCompleting) return // Prevent multiple clicks
    
    setIsCompleting(true)
    try {
      console.log('🎯 CompletionScreen: Starting onboarding completion process')
      
      // Use AuthContext's completeOnboarding method which updates database AND refreshes profile
      await completeOnboarding()
      
      console.log('🎯 CompletionScreen: Onboarding completed, checking subscription status')
      
      // Small delay to ensure profile propagation before navigation
      setTimeout(() => {
        const userState = getUserState()
        console.log(`🎯 CompletionScreen: User state: ${userState}`)
        
        if (userState === 'pre-trial') {
          console.log('🎯 CompletionScreen: Pre-trial user, showing paywall')
          router.replace('/paywall')
        } else {
          console.log('🎯 CompletionScreen: User has subscription, going to main app')
          router.replace('/(tabs)')
        }
      }, 100)
      
    } catch (error) {
      console.error('🎯 CompletionScreen: Error completing onboarding:', error)
      setIsCompleting(false)
      // Still try to navigate in case of error - check subscription state
      const userState = getUserState()
      if (userState === 'pre-trial') {
        router.replace('/paywall')
      } else {
        router.replace('/(tabs)')
      }
    }
  }

  return (
    <OnboardingScreen
      currentStep={24}
      totalSteps={24}
      headline="You're All Set!"
      subtext="Welcome to your personalized Gold List journey. Let's start your first page."
      primaryButtonText={isCompleting ? "Starting..." : "Start Learning"}
      onPrimaryPress={handleStartLearning}
      showProgress={false}
      showSkip={false}
      showBack={false}
    >
      {/* Big Celebration Icon */}
      <View style={styles.celebrationContainer}>
        <Animated.Text style={[styles.celebrationIcon, animatedStyle]}>
          🎉
        </Animated.Text>
        <Text style={styles.celebrationText}>Congratulations!</Text>
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['3xl'],
  },
  celebrationIcon: {
    fontSize: 120,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  celebrationText: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: '600',
    textAlign: 'center',
    color: '#F59E0B', // Gold color to match theme
  },
})