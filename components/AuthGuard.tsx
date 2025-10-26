import { useEffect, useRef } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, profile } = useAuth()
  const { getUserState, isLoading: subscriptionLoading } = useSubscription()
  const segments = useSegments()
  const router = useRouter()
  const navigationInProgress = useRef(false)

  useEffect(() => {
    if (loading || subscriptionLoading || navigationInProgress.current) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === '(onboarding)'
    const inPaywallModal = segments.includes('paywall')
    const inMainApp = segments[0] === '(tabs)'

    console.log(`🔒 AuthGuard: Route check - segments: ${segments.join('/')}, user: ${user ? 'authenticated' : 'not authenticated'}`)

    // If user is not authenticated
    if (!user) {
      if (!inAuthGroup && !inOnboardingGroup) {
        console.log('🔒 AuthGuard: User not authenticated, redirecting to onboarding')
        navigationInProgress.current = true
        router.replace('/(onboarding)/welcome')
        setTimeout(() => { navigationInProgress.current = false }, 1000)
      }
      return
    }

    // User is authenticated - check onboarding completion
    // IMPORTANT: Don't redirect users who are already in onboarding flow
    if (!profile?.onboarding_completed && !inOnboardingGroup && !inAuthGroup) {
      console.log('🔒 AuthGuard: User authenticated but onboarding not completed, redirecting to onboarding')
      console.log(`🔒 AuthGuard: Debug - inOnboardingGroup: ${inOnboardingGroup}, segments: ${segments.join('/')}`)
      navigationInProgress.current = true
      router.replace('/(onboarding)/learn-science')
      setTimeout(() => { navigationInProgress.current = false }, 1000)
      return
    }

    // Note: Completion screen handles navigation for completed onboarding users
    // AuthGuard only redirects from auth group, not onboarding group
    if (user && profile?.onboarding_completed && inAuthGroup) {
      console.log('🔒 AuthGuard: User authenticated and onboarding completed, redirecting to main app')
      navigationInProgress.current = true
      router.replace('/(tabs)')
      setTimeout(() => { navigationInProgress.current = false }, 1000)
      return
    }

    // Note: Paywall navigation is handled by completion screen for new users
    // AuthGuard no longer redirects pre-trial users to avoid double navigation

    console.log('🔒 AuthGuard: No navigation needed - user in correct location')
  }, [user, loading, subscriptionLoading, segments, getUserState, profile?.onboarding_completed])

  return <>{children}</>
}