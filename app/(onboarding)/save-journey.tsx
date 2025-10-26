import React, { useState, useRef } from 'react'
import { useRouter } from 'expo-router'
import { UniversalSignInScreen } from '@/components/UniversalSignInScreen'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'

export default function SaveJourneyScreen() {
  const router = useRouter()
  const { getUserState, isLoading: subscriptionLoading } = useSubscription()
  const [isRouting, setIsRouting] = useState(false)
  const hasNavigated = useRef(false) // Single-use flag
  const lastUserState = useRef<string>('')

  const handleSuccess = async () => {
    // Strict single-use protection
    if (hasNavigated.current || isRouting) {
      console.log('🎯 SaveJourney: Already navigated or routing in progress, ignoring')
      return
    }
    
    hasNavigated.current = true
    setIsRouting(true)
    console.log('🎯 SaveJourney: Sign-in successful, starting navigation flow...')
    
    try {
      // Wait for subscription state to stabilize
      let stableState = ''
      let stableCount = 0
      const requiredStableCount = 3 // State must be same for 3 consecutive checks
      const maxAttempts = 20 // 2 seconds max wait
      
      for (let attempts = 0; attempts < maxAttempts; attempts++) {
        if (!subscriptionLoading) {
          const currentState = getUserState()
          
          if (currentState === stableState) {
            stableCount++
          } else {
            stableState = currentState
            stableCount = 1
          }
          
          console.log(`🎯 SaveJourney: State check ${attempts + 1}: ${currentState} (stable: ${stableCount}/${requiredStableCount})`)
          
          // If state is stable for required count, proceed
          if (stableCount >= requiredStableCount) {
            console.log(`🎯 SaveJourney: State stabilized as: ${stableState}`)
            break
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // Get final state for navigation
      const finalUserState = getUserState()
      lastUserState.current = finalUserState
      console.log(`🎯 SaveJourney: Final state for navigation: ${finalUserState}`)
      
      // Add small delay to ensure all state updates are complete
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Navigate to completion screen to finish onboarding properly
      console.log('🎯 SaveJourney: Authentication successful → Navigating to completion screen')
      router.push('/(onboarding)/completion')
      
    } catch (error) {
      console.error('🎯 SaveJourney: Error during navigation flow:', error)
      // Fallback to completion screen
      console.log('🎯 SaveJourney: Fallback → Navigating to completion screen')
      router.push('/(onboarding)/completion')
    } finally {
      // Don't reset isRouting or hasNavigated - they should stay true to prevent re-entry
      console.log('🎯 SaveJourney: Navigation flow completed')
    }
  }

  return (
    <UniversalSignInScreen
      stepNumber={24}
      customHeadline="Save Your Journey"
      customSubtext={
        isRouting 
          ? "Setting up your personalized experience..." 
          : "Sign in to sync your progress and keep your personalized plan safe."
      }
      showSkip={false}
      onSuccess={handleSuccess}
    />
  )
}