import { useCallback } from 'react'
import { useRouter } from 'expo-router'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'

/**
 * Hook for protecting routes that require specific user permissions
 * Handles navigation protection for word addition and other premium features
 */
export function useRouteProtection() {
  const router = useRouter()
  const { canAddWords, getUserState, showPaywallModal } = useSubscription()

  /**
   * Protects navigation to word addition screens
   * For post-trial users: shows paywall instead of navigating
   * For other users: allows navigation if they can add words
   */
  const protectedNavigateToAddWords = useCallback(async (notebookId: string) => {
    const userState = getUserState()
    const canAdd = await canAddWords()

    console.log(`🛡️ Route Protection: Checking word addition access`)
    console.log(`🛡️ User state: ${userState}`)
    console.log(`🛡️ Can add words: ${canAdd}`)

    if (!canAdd) {
      // Post-trial users or users without permission see paywall
      console.log(`🛡️ Access denied - showing paywall`)
      showPaywallModal()
      return false
    }

    // User has permission - proceed with navigation
    console.log(`🛡️ Access granted - navigating to input screen`)
    router.push(`/notebook/${notebookId}/input`)
    return true
  }, [canAddWords, getUserState, showPaywallModal, router])

  /**
   * General route protection for premium features
   * Can be extended for other protected routes
   */
  const protectedNavigate = useCallback(async (
    route: string, 
    permissionCheck: () => Promise<boolean>,
    fallbackAction?: () => void
  ) => {
    const hasPermission = await permissionCheck()
    
    if (!hasPermission) {
      if (fallbackAction) {
        fallbackAction()
      } else {
        showPaywallModal()
      }
      return false
    }

    router.push(route as any)
    return true
  }, [router, showPaywallModal])

  /**
   * Check if user can access a specific feature without navigation
   * Useful for conditional UI rendering
   */
  const checkFeatureAccess = useCallback(async (feature: 'add_words' | 'create_notebook' | 'premium') => {
    const userState = getUserState()
    
    switch (feature) {
      case 'add_words':
        return await canAddWords()
      case 'create_notebook':
        // This would use canCreateNotebook from subscription context
        return userState === 'premium' || userState === 'trial'
      case 'premium':
        return userState === 'premium'
      default:
        return false
    }
  }, [getUserState, canAddWords])

  /**
   * Safe navigation helper that handles edge cases
   * Provides fallback routes when navigation stack is empty
   */
  const safeNavigateBack = useCallback((fallbackRoute: string = '/(tabs)/dashboard') => {
    if (router.canGoBack()) {
      console.log('🛡️ Safe navigation: Going back to previous screen')
      router.back()
    } else {
      console.log(`🛡️ Safe navigation: No previous screen, navigating to ${fallbackRoute}`)
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
      // Fallback to dashboard if navigation fails
      router.replace('/(tabs)/dashboard')
      return false
    }
  }, [router])

  return {
    protectedNavigateToAddWords,
    protectedNavigate,
    checkFeatureAccess,
    getUserState,
    safeNavigateBack,
    safeNavigate,
  }
}