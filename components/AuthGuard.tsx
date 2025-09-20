import { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const { appState } = useApp()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboardingGroup = segments[0] === '(onboarding)'
    const inTabsGroup = segments[0] === '(tabs)'

    // If user is not authenticated
    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/signin')
      }
      return
    }

    // User is authenticated
    if (user) {
      // Check if onboarding is complete
      const onboardingComplete = 
        appState.onboardingProgress.hasCompletedWelcome &&
        appState.onboardingProgress.hasCompletedTutorial

      // If onboarding is not complete, redirect to onboarding
      if (!onboardingComplete && !inOnboardingGroup) {
        router.replace('/(onboarding)/welcome')
        return
      }

      // If onboarding is complete but user is still in onboarding or auth
      if (onboardingComplete && (inOnboardingGroup || inAuthGroup)) {
        router.replace('/(tabs)')
        return
      }
    }
  }, [user, loading, segments, appState.onboardingProgress])

  return <>{children}</>
}