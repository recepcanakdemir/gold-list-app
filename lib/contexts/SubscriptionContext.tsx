import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { useAuth } from './AuthContext'
import { useDevTime } from './DevTimeContext'
import { supabaseService } from '@/lib/services/supabaseService'

// Subscription types and interfaces
export type SubscriptionTier = 'free' | 'trial' | 'weekly' | 'monthly' | 'yearly'

export interface SubscriptionPlan {
  id: SubscriptionTier
  name: string
  price: string
  duration: string
  savings?: string
  features: string[]
  durationDays: number
}

export interface SubscriptionState {
  tier: SubscriptionTier
  isActive: boolean
  expiresAt: Date | null
  activatedAt: Date | null
  // Trial specific fields
  isInTrial: boolean
  trialStartedAt: Date | null
  trialDaysRemaining: number
}

// Four-state user system for paywall management
export type UserState = 'pre-trial' | 'trial' | 'post-trial' | 'premium'

interface SubscriptionContextType {
  subscription: SubscriptionState
  plans: SubscriptionPlan[]
  isLoading: boolean
  
  // Trial management
  startFreeTrial: () => Promise<boolean>
  
  // Subscription management
  activateSubscription: (planId: SubscriptionTier) => Promise<boolean>
  cancelSubscription: () => Promise<boolean>
  restoreSubscription: () => Promise<boolean>
  
  // Feature checks
  canCreateNotebook: () => Promise<boolean>
  canAddWords: () => Promise<boolean>
  hasFeature: (feature: string) => boolean
  
  // User state helpers
  getUserState: () => UserState
  canExitPaywall: () => boolean
  
  // UI helpers
  getUpgradeMessage: (context: string) => string
  showPaywallModal: () => void
  // Deprecated: use showPaywallModal instead
  showPaywall: boolean
  setShowPaywall: (show: boolean) => void
  
  // Debug helpers (development only)
  debugTrialStatus: () => Promise<any>
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

// Subscription plans configuration
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: '$4.99',
    duration: 'per week',
    features: [
      'Unlimited notebooks',
      'Unlimited pages & words',
      'AI sentence generation',
      'Advanced analytics',
      'Cloud sync',
      'Priority support'
    ],
    durationDays: 7
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$9.99',
    duration: 'per month',
    savings: 'Save 50%',
    features: [
      'Everything in Weekly',
      'Extended cloud storage',
      'Advanced customization',
      'Export features'
    ],
    durationDays: 30
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$49.99',
    duration: 'per year',
    savings: 'Save 58%',
    features: [
      'Everything in Monthly',
      'Lifetime updates',
      'Premium themes',
      'Early access features'
    ],
    durationDays: 365
  }
]

// Premium features list
const PREMIUM_FEATURES = [
  'unlimited_notebooks',
  'unlimited_pages',
  'unlimited_words_per_page',
  'ai_sentence_generation',
  'ai_translation',
  'advanced_analytics',
  'detailed_statistics',
  'cloud_sync',
  'export_import',
  'notifications',
  'streak_tracking',
  'achievement_system',
  'premium_themes',
  'priority_support'
]

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { getCurrentDate, currentSimulatedDay } = useDevTime()
  
  const [subscription, setSubscription] = useState<SubscriptionState>({
    tier: 'free',
    isActive: false,
    expiresAt: null,
    activatedAt: null,
    isInTrial: false,
    trialStartedAt: null,
    trialDaysRemaining: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)
  const isUpdatingLocalState = useRef(false)
  const lastStateUpdateTime = useRef<number>(0)
  const lastPaywallNavigationTime = useRef<number>(0)


  // Load subscription state from profile
  useEffect(() => {
    if (profile) {
      loadSubscriptionFromProfile()
    } else {
      setIsLoading(false)
    }
  }, [profile, loadSubscriptionFromProfile])

  // Refresh subscription data when DevTime day changes (for accurate trial countdown)
  useEffect(() => {
    // Check if we're in the middle of a state update
    const timeSinceLastUpdate = Date.now() - lastStateUpdateTime.current
    const isRecentUpdate = timeSinceLastUpdate < 5000 // 5 seconds
    
    if (profile && subscription.isInTrial && !isUpdatingLocalState.current && !isRecentUpdate) {
      console.log(`🔄 DevTime day changed to ${currentSimulatedDay}, refreshing trial status...`)
      loadSubscriptionFromProfile()
    } else if (isUpdatingLocalState.current || isRecentUpdate) {
      console.log(`🔄 DevTime: Skipping refresh - state update in progress (isUpdating: ${isUpdatingLocalState.current}, recent: ${isRecentUpdate})`)
    }
  }, [currentSimulatedDay, profile, subscription.isInTrial, loadSubscriptionFromProfile])

  const loadSubscriptionFromProfile = useCallback(async () => {
    // Don't load from profile if we're actively updating local state
    if (isUpdatingLocalState.current) {
      console.log('🔒 Skipping profile load - state update in progress')
      return
    }
    
    try {
      setIsLoading(true)
      console.log('📄 Loading subscription state from profile...')
      
      const tier = (profile?.subscription_status as SubscriptionTier) || 'free'
      const expiresAt = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null
      const activatedAt = profile?.subscription_activated_at ? new Date(profile.subscription_activated_at) : null
      const trialStartedAt = profile?.trial_started_at ? new Date(profile.trial_started_at) : null
      
      // Check if subscription is still active (considering DevTime)
      const currentDate = getCurrentDate()
      const isPremium = ['weekly', 'monthly', 'yearly'].includes(tier) && (expiresAt === null || expiresAt > currentDate)
      
      // Check trial status using database functions (consistent with DevTime)
      let isInTrial = false
      let trialDaysRemaining = 0
      
      if (trialStartedAt && user?.id) {
        try {
          // Use database functions for consistent trial checking
          console.log(`🔍 === TRIAL STATUS CHECK ===`)
          console.log(`🔍 Trial started: ${trialStartedAt.toLocaleDateString()} ${trialStartedAt.toLocaleTimeString()}`)
          console.log(`🔍 Current (DevTime): ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`)
          console.log(`🔍 DevTime day: ${currentSimulatedDay}`)
          console.log(`🔍 User tier: ${tier}`)
          
          isInTrial = await supabaseService.isInTrialPeriod(user.id, currentDate)
          trialDaysRemaining = await supabaseService.getTrialDaysRemaining(user.id, currentDate)
          
          // Calculate client-side for comparison
          const msElapsed = currentDate.getTime() - trialStartedAt.getTime()
          const daysElapsedClientSide = Math.floor(msElapsed / (1000 * 60 * 60 * 24))
          const daysRemainingClientSide = Math.max(0, 14 - daysElapsedClientSide)
          
          console.log(`🔍 === RESULTS ===`)
          console.log(`🔍 Database: isInTrial=${isInTrial}, daysRemaining=${trialDaysRemaining}`)
          console.log(`🔍 Client calc: daysElapsed=${daysElapsedClientSide}, daysRemaining=${daysRemainingClientSide}`)
          console.log(`🔍 === END CHECK ===`)
        } catch (error) {
          console.error('Error checking trial status from database:', error)
          // Fallback to client-side calculation
          const trialEndDate = new Date(trialStartedAt)
          trialEndDate.setDate(trialEndDate.getDate() + 14)
          isInTrial = trialEndDate > currentDate
          
          if (isInTrial) {
            const msRemaining = trialEndDate.getTime() - currentDate.getTime()
            trialDaysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)))
          }
        }
      }
      
      const isActive = isPremium || isInTrial
      
      setSubscription({
        tier,
        isActive,
        expiresAt,
        activatedAt,
        isInTrial,
        trialStartedAt,
        trialDaysRemaining
      })
      
      // Also save to AsyncStorage for offline access
      await AsyncStorage.setItem('subscription_state', JSON.stringify({
        tier,
        isActive,
        expiresAt: expiresAt?.toISOString(),
        activatedAt: activatedAt?.toISOString()
      }))
      
    } catch (error) {
      console.error('Error loading subscription state:', error)
      
      // Fallback to AsyncStorage
      try {
        const stored = await AsyncStorage.getItem('subscription_state')
        if (stored) {
          const parsed = JSON.parse(stored)
          setSubscription({
            tier: parsed.tier || 'free',
            isActive: parsed.isActive || false,
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
            activatedAt: parsed.activatedAt ? new Date(parsed.activatedAt) : null,
            isInTrial: parsed.isInTrial || false,
            trialStartedAt: parsed.trialStartedAt ? new Date(parsed.trialStartedAt) : null,
            trialDaysRemaining: parsed.trialDaysRemaining || 0
          })
        }
      } catch (storageError) {
        console.error('Error loading from AsyncStorage:', storageError)
      }
    } finally {
      setIsLoading(false)
    }
  }, [profile, getCurrentDate, user?.id])

  // Start free trial (mock implementation)
  const startFreeTrial = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      console.error('No user ID for trial activation')
      return false
    }

    try {
      // Set local state lock to prevent overwrites
      isUpdatingLocalState.current = true
      lastStateUpdateTime.current = Date.now()
      console.log('🔒 State lock activated for trial start')
      
      // Start trial in database using DevTime
      const currentDate = getCurrentDate()
      console.log('🗄️ Starting trial in database...')
      const success = await supabaseService.startFreeTrial(user.id, currentDate)
      
      if (success) {
        
        console.log('🗄️ Database trial start successful, updating local state...')
        
        // Wait a brief moment for database to process
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Update local state
        const newSubscriptionState = {
          tier: 'trial' as SubscriptionTier,
          isActive: true,
          expiresAt: null,
          activatedAt: currentDate,
          isInTrial: true,
          trialStartedAt: currentDate,
          trialDaysRemaining: 14
        }
        
        setSubscription(newSubscriptionState)

        // Save to AsyncStorage
        await AsyncStorage.setItem('subscription_state', JSON.stringify({
          tier: 'trial',
          isActive: true,
          expiresAt: null,
          activatedAt: currentDate.toISOString(),
          isInTrial: true,
          trialStartedAt: currentDate.toISOString(),
          trialDaysRemaining: 14
        }))

        console.log('✅ Free trial started: 14 days - Local state and storage updated')
        
        // Release state lock after a delay to allow state to settle
        setTimeout(() => {
          isUpdatingLocalState.current = false
          console.log('🔓 State lock released after successful trial start')
        }, 4000) // Increased to 4 seconds for better stability
        
        return true
      } else {
        console.error('❌ Database trial start failed')
      }
      
      return false
    } catch (error) {
      console.error('Error starting free trial:', error)
      // Release state lock on error
      setTimeout(() => {
        isUpdatingLocalState.current = false
        console.log('🔓 State lock released after error')
      }, 1000)
      return false
    }
  }, [user?.id, getCurrentDate])

  // Mock subscription activation (for testing without RevenueCat)
  const activateSubscription = useCallback(async (planId: SubscriptionTier): Promise<boolean> => {
    if (!user?.id) {
      console.error('No user ID for subscription activation')
      return false
    }

    try {
      // Set local state lock to prevent overwrites during subscription activation
      isUpdatingLocalState.current = true
      lastStateUpdateTime.current = Date.now()
      console.log('🔒 State lock activated for subscription activation')
      
      const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
      if (!plan) {
        console.error('Invalid plan ID:', planId)
        // Release state lock on error
        setTimeout(() => {
          isUpdatingLocalState.current = false
          console.log('🔓 State lock released after error')
        }, 1000)
        return false
      }

      // Calculate expiry date using DevTime
      const currentDate = getCurrentDate()
      const expiresAt = new Date(currentDate)
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays)

      // Activate subscription in database with DevTime date
      const success = await supabaseService.activateSubscription(user.id, planId, plan.durationDays, currentDate)
      
      if (success) {
        // Update local state (converting from trial to premium)
        setSubscription({
          tier: planId,
          isActive: true,
          expiresAt,
          activatedAt: currentDate,
          isInTrial: false,
          trialStartedAt: subscription.trialStartedAt, // Keep trial history
          trialDaysRemaining: 0
        })

        // Save to AsyncStorage
        await AsyncStorage.setItem('subscription_state', JSON.stringify({
          tier: planId,
          isActive: true,
          expiresAt: expiresAt.toISOString(),
          activatedAt: currentDate.toISOString(),
          isInTrial: false,
          trialStartedAt: subscription.trialStartedAt?.toISOString(),
          trialDaysRemaining: 0
        }))

        console.log(`✅ Subscription activated: ${planId} until ${expiresAt.toISOString()}`)
        
        // Immediate state update - no delay to prevent race conditions
        // The local state is already updated above, just refresh profile data
        loadSubscriptionFromProfile()
        
        // Release state lock after successful activation
        setTimeout(() => {
          isUpdatingLocalState.current = false
          console.log('🔓 State lock released after successful subscription activation')
        }, 2000) // Shorter delay than trial to reduce race conditions
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error activating subscription:', error)
      // Release state lock on error
      setTimeout(() => {
        isUpdatingLocalState.current = false
        console.log('🔓 State lock released after subscription activation error')
      }, 1000)
      return false
    }
  }, [user?.id, getCurrentDate, loadSubscriptionFromProfile])

  // Cancel subscription (mock implementation)
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false

    try {
      // Set to expire immediately with DevTime date
      const currentDate = getCurrentDate()
      const success = await supabaseService.activateSubscription(user.id, 'free', 0, currentDate)
      
      if (success) {
        setSubscription({
          tier: 'free',
          isActive: false,
          expiresAt: null,
          activatedAt: null,
          isInTrial: false,
          trialStartedAt: subscription.trialStartedAt, // Keep trial history
          trialDaysRemaining: 0
        })

        await AsyncStorage.setItem('subscription_state', JSON.stringify({
          tier: 'free',
          isActive: false,
          expiresAt: null,
          activatedAt: null,
          isInTrial: false,
          trialStartedAt: subscription.trialStartedAt?.toISOString(),
          trialDaysRemaining: 0
        }))

        console.log('✅ Subscription cancelled')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      return false
    }
  }, [user?.id])

  // Restore subscription (mock implementation)
  const restoreSubscription = useCallback(async (): Promise<boolean> => {
    // Mock restore functionality
    console.log('🔄 Restore subscription called (mock implementation)')
    return false
  }, [])

  // Feature check functions
  const canCreateNotebook = useCallback(async (): Promise<boolean> => {
    // Premium users have unlimited notebooks
    if (['weekly', 'monthly', 'yearly'].includes(subscription.tier)) return true
    if (!user?.id) return false

    try {
      // Single notebook limit for trial/free users - pass DevTime
      const currentDate = getCurrentDate()
      return await supabaseService.canCreateNotebookTrial(user.id, currentDate)
    } catch (error) {
      console.error('Error checking notebook creation limit:', error)
      return false
    }
  }, [subscription.tier, user?.id, getCurrentDate])

  const canAddWords = useCallback(async (): Promise<boolean> => {
    // Premium users can always add words
    if (['weekly', 'monthly', 'yearly'].includes(subscription.tier)) {
      console.log(`🔍 canAddWords: Premium user (${subscription.tier}) - access granted`)
      return true
    }
    if (!user?.id) {
      console.log(`🔍 canAddWords: No user ID - access denied`)
      return false
    }

    try {
      // Trial users can add words during trial, post-trial users cannot - pass DevTime
      const currentDate = getCurrentDate()
      const userState = getUserState()
      
      console.log(`🔍 canAddWords: Starting comprehensive check...`)
      console.log(`🔍 canAddWords: User State = ${userState}`)
      console.log(`🔍 canAddWords: Local subscription state:`)
      console.log(`   - tier: ${subscription.tier}`)
      console.log(`   - isInTrial: ${subscription.isInTrial}`)
      console.log(`   - isActive: ${subscription.isActive}`)
      console.log(`   - trialStartedAt: ${subscription.trialStartedAt?.toISOString()}`)
      console.log(`   - trialDaysRemaining: ${subscription.trialDaysRemaining}`)
      console.log(`🔍 canAddWords: DevTime currentDate: ${currentDate.toISOString()}`)
      console.log(`🔍 canAddWords: Real date: ${new Date().toISOString()}`)
      
      // Also check if user is actually in trial period using database
      const isInTrialDB = await supabaseService.isInTrialPeriod(user.id, currentDate)
      console.log(`🔍 canAddWords: Database trial check: ${isInTrialDB}`)
      
      const result = await supabaseService.canAddWordsTrial(user.id, currentDate)
      console.log(`🔍 canAddWords: Database canAddWords result: ${result}`)
      console.log(`🔍 canAddWords: Final decision: ${result}`)
      
      return result
    } catch (error) {
      console.error('🔍 canAddWords: Error during check:', error)
      return false
    }
  }, [subscription.tier, subscription.isInTrial, subscription.isActive, subscription.trialStartedAt, subscription.trialDaysRemaining, user?.id, getCurrentDate, getUserState])

  // Debug function for development testing
  const debugTrialStatus = useCallback(async (): Promise<any> => {
    if (!user?.id) return null
    
    try {
      const currentDate = getCurrentDate()
      console.log(`🔍 DEBUG: Starting trial debug for user ${user.id}`)
      
      const debugResult = await supabaseService.debugTrialStatus(user.id, currentDate)
      console.log(`🔍 DEBUG: Complete trial status:`, debugResult)
      
      return debugResult
    } catch (error) {
      console.error('🔍 DEBUG: Error debugging trial status:', error)
      return null
    }
  }, [user?.id, getCurrentDate])

  const hasFeature = useCallback((feature: string): boolean => {
    // Premium users have all features
    if (['weekly', 'monthly', 'yearly'].includes(subscription.tier)) return true
    
    // Trial users have all features except multiple notebooks
    if (subscription.isInTrial) {
      const trialRestrictedFeatures = ['multiple_notebooks']
      return !trialRestrictedFeatures.includes(feature)
    }
    
    // Post-trial/free users only have review features
    const postTrialFeatures = [
      'basic_reviews',
      'basic_statistics',
      'archive_system'
    ]
    
    return postTrialFeatures.includes(feature)
  }, [subscription.tier, subscription.isInTrial])

  // User state helper functions
  const getUserState = useCallback((): UserState => {
    // Premium users (paid subscriptions)
    if (['weekly', 'monthly', 'yearly'].includes(subscription.tier)) return 'premium'
    
    // Trial users (actively in trial period)
    if (subscription.isInTrial) return 'trial'
    
    // Post-trial users (trial ended but not premium)
    if (subscription.trialStartedAt) return 'post-trial'
    
    // Pre-trial users (never started trial)
    return 'pre-trial'
  }, [subscription.tier, subscription.isInTrial, subscription.trialStartedAt])

  const canExitPaywall = useCallback((): boolean => {
    const userState = getUserState()
    
    // Pre-trial users cannot exit paywall (forced trial)
    if (userState === 'pre-trial') return false
    
    // All other states can exit paywall
    return true
  }, [getUserState])

  // UI helper messages
  const getUpgradeMessage = useCallback((context: string): string => {
    // Different messages based on trial status
    if (subscription.isInTrial) {
      const trialMessages = {
        'notebook_limit': 'Upgrade to create multiple notebooks and learn different languages',
        'general': `Upgrade to unlock unlimited learning (${subscription.trialDaysRemaining} days left in trial)`
      }
      return trialMessages[context] || trialMessages['general']
    }
    
    const postTrialMessages = {
      'add_words': 'Your trial has ended. Upgrade to continue adding new vocabulary',
      'notebook_limit': 'Upgrade to create new notebooks and learn new vocabulary',
      'general': 'Upgrade to continue your vocabulary learning journey'
    }
    
    return postTrialMessages[context] || postTrialMessages['general']
  }, [subscription.isInTrial, subscription.trialDaysRemaining])

  // Show paywall modal using router navigation with mount safety and debouncing
  const showPaywallModal = useCallback(() => {
    const now = Date.now()
    const timeSinceLastNavigation = now - lastPaywallNavigationTime.current
    
    // Debounce: prevent multiple paywall navigations within 2 seconds
    if (timeSinceLastNavigation < 2000) {
      console.log(`🚫 Paywall navigation debounced (${timeSinceLastNavigation}ms since last attempt)`)
      return
    }
    
    // Check if navigation is safe to perform
    const checkNavigationReady = () => {
      try {
        // Test navigation readiness by checking router state
        if (!router || typeof router.push !== 'function') {
          return false
        }
        return true
      } catch {
        return false
      }
    }
    
    // Update last navigation time
    lastPaywallNavigationTime.current = now
    console.log(`📱 Navigating to paywall at ${new Date(now).toISOString()}`)
    
    // Add a larger delay to ensure router is fully mounted
    setTimeout(() => {
      if (!checkNavigationReady()) {
        console.warn('Router not ready, skipping paywall navigation')
        lastPaywallNavigationTime.current = 0
        return
      }
      
      try {
        router.push('/paywall')
      } catch (error) {
        console.warn('Navigation failed, router not ready:', error)
        // Reset navigation time on failure to allow retry
        lastPaywallNavigationTime.current = 0
        // Retry after a longer delay with additional safety check
        setTimeout(() => {
          if (!checkNavigationReady()) {
            console.warn('Router still not ready, canceling paywall navigation')
            return
          }
          
          try {
            router.push('/paywall')
            lastPaywallNavigationTime.current = Date.now()
          } catch (retryError) {
            console.error('Navigation failed after retry:', retryError)
            lastPaywallNavigationTime.current = 0
          }
        }, 3000) // Increased delay
      }
    }, 500) // Increased initial delay
  }, [router])

  const contextValue: SubscriptionContextType = {
    subscription,
    plans: SUBSCRIPTION_PLANS,
    isLoading,
    
    startFreeTrial,
    activateSubscription,
    cancelSubscription,
    restoreSubscription,
    
    canCreateNotebook,
    canAddWords,
    hasFeature,
    
    getUserState,
    canExitPaywall,
    
    getUpgradeMessage,
    showPaywallModal,
    showPaywall,
    setShowPaywall,
    
    debugTrialStatus
  }

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider')
  }
  return context
}

// Hook for easy feature checking
export function useFeature(feature: string) {
  const { hasFeature } = useSubscription()
  return hasFeature(feature)
}

// Hook for premium status
export function usePremium() {
  const { subscription } = useSubscription()
  return subscription.isActive
}