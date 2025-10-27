import { useEffect, useRef } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, profile } = useAuth()
  const { subscription, isLoading: subscriptionLoading } = useSubscription()
  const segments = useSegments()
  const router = useRouter()
  const navigationInProgress = useRef(false)

  useEffect(() => {
    if (loading || subscriptionLoading || navigationInProgress.current) {
      return
    }

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === '(onboarding)'
    const inPaywallModal = segments.includes('paywall')

    // If user is not authenticated, redirect to onboarding
    if (!user) {
      if (!inAuthGroup && !inOnboardingGroup) {
        navigationInProgress.current = true
        router.replace('/(onboarding)/welcome')
        setTimeout(() => { navigationInProgress.current = false }, 1000)
      }
      return
    }

    // User is authenticated - check onboarding completion
    if (!profile?.onboarding_completed && !inOnboardingGroup && !inAuthGroup) {
      navigationInProgress.current = true
      router.replace('/(onboarding)/learn-science')
      setTimeout(() => { navigationInProgress.current = false }, 1000)
      return
    }

    // User completed onboarding - check subscription ONLY ONCE at entry point
    if (user && profile?.onboarding_completed && inAuthGroup) {
      // Check subscription only when coming from auth group
      if (subscription.isActive) {
        // Subscribed user goes to main app
        navigationInProgress.current = true
        router.replace('/(tabs)')
        setTimeout(() => { navigationInProgress.current = false }, 1000)
      } else {
        // Non-subscribed user goes to paywall
        navigationInProgress.current = true
        router.replace('/paywall')
        setTimeout(() => { navigationInProgress.current = false }, 1000)
      }
      return
    }

    // Allow subscribed users to exit paywall to main app (from settings upgrade)
    if (user && profile?.onboarding_completed && subscription.isActive && inPaywallModal) {
      navigationInProgress.current = true
      router.replace('/(tabs)')
      setTimeout(() => { navigationInProgress.current = false }, 1000)
      return
    }
  }, [user, loading, subscriptionLoading, segments, subscription.isActive, profile?.onboarding_completed])

  return <>{children}</>
}