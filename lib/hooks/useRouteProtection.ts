import { useCallback } from 'react'
import { useRouter } from 'expo-router'

/**
 * Simplified hook for safe navigation (hard paywall model)
 * Route protection is now handled at AuthGuard level
 */
export function useRouteProtection() {
  const router = useRouter()

  /**
   * Direct navigation to word addition screens (no protection needed)
   */
  const navigateToAddWords = useCallback((notebookId: string) => {
    router.push(`/notebook/${notebookId}/input`)
    return true
  }, [router])

  /**
   * Safe navigation helper that handles edge cases
   */
  const safeNavigateBack = useCallback((fallbackRoute: string = '/(tabs)/dashboard') => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace(fallbackRoute as any)
    }
  }, [router])

  /**
   * Safe navigation to a specific route with error handling
   */
  const safeNavigate = useCallback((route: string, useReplace: boolean = false) => {
    try {
      if (useReplace) {
        router.replace(route as any)
      } else {
        router.push(route as any)
      }
      return true
    } catch (error) {
      console.error('🛡️ Navigation error:', error)
      router.replace('/(tabs)/dashboard')
      return false
    }
  }, [router])

  return {
    navigateToAddWords,
    safeNavigateBack,
    safeNavigate,
  }
}