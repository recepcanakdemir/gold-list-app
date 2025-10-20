import { useEffect, useRef } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const { getUserState, isLoading: subscriptionLoading } = useSubscription()
  const segments = useSegments()
  const router = useRouter()
  const navigationInProgress = useRef(false)

  useEffect(() => {
    if (loading || subscriptionLoading || navigationInProgress.current) return

    const inAuthGroup = segments[0] === '(auth)'
    const inPaywallModal = segments.includes('paywall')

    // If user is not authenticated
    if (!user) {
      if (!inAuthGroup) {
        console.log('🔒 AuthGuard: User not authenticated, redirecting to sign in')
        navigationInProgress.current = true
        router.replace('/(auth)/signin')
        setTimeout(() => { navigationInProgress.current = false }, 1000)
      }
      return
    }

    // User is authenticated - check subscription state
    const userState = getUserState()
    console.log(`🔒 AuthGuard: User state: ${userState}, segments: ${segments.join('/')}`)

    // For pre-trial users, force them to paywall (unless they're already there)
    if (userState === 'pre-trial' && !inAuthGroup && !inPaywallModal) {
      console.log('🔒 AuthGuard: Pre-trial user detected, pushing to forced paywall')
      navigationInProgress.current = true
      try {
        router.push('/paywall')
      } catch (error) {
        console.error('🔒 AuthGuard: Error navigating to paywall:', error)
        // Fallback to replace if push fails
        router.replace('/paywall')
      }
      setTimeout(() => { navigationInProgress.current = false }, 1000)
      return
    }

    // User is authenticated and not pre-trial - redirect from auth to main app
    if (user && inAuthGroup) {
      console.log('🔒 AuthGuard: User authenticated, redirecting to main app')
      navigationInProgress.current = true
      try {
        router.replace('/(tabs)')
      } catch (error) {
        console.log('🔒 AuthGuard: Error navigating to tabs, trying dashboard:', error)
        router.replace('/(tabs)/dashboard')
      }
      setTimeout(() => { navigationInProgress.current = false }, 1000)
    }
  }, [user, loading, subscriptionLoading, segments, getUserState])

  return <>{children}</>
}