import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { useAuth } from './AuthContext'
import { useDevTime } from './DevTimeContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { revenueCatService } from '@/lib/services/revenueCatService'
import { PRODUCT_IDS, ENTITLEMENTS } from '@/lib/types/revenuecat'
import type { CustomerInfo, Package, Offering } from 'react-native-purchases'

// Subscription types and interfaces
export type SubscriptionTier = 'free' | 'weekly' | 'monthly' | 'yearly'

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
}

interface SubscriptionContextType {
  subscription: SubscriptionState
  plans: SubscriptionPlan[]
  isLoading: boolean
  
  // RevenueCat state
  offerings: Offering[]
  currentOffering: Offering | null
  customerInfo: CustomerInfo | null
  
  // Subscription management (RevenueCat)
  purchasePackage: (packageId: string) => Promise<boolean>
  restorePurchases: () => Promise<boolean>
  
  // Removed: All feature checks and UI helpers (hard paywall model)
  
  // RevenueCat helpers
  initializeRevenueCat: () => Promise<boolean>
  syncWithRevenueCat: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

// Subscription plans configuration (mapped to RevenueCat product IDs)
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

// Map subscription tiers to RevenueCat product IDs
const TIER_TO_PRODUCT_ID: Record<SubscriptionTier, string> = {
  'free': '',
  'weekly': PRODUCT_IDS.WEEKLY,
  'monthly': PRODUCT_IDS.MONTHLY,
  'yearly': PRODUCT_IDS.YEARLY
}

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
    activatedAt: null
  })
  const [isLoading, setIsLoading] = useState(true)

  // Persist subscription state to AsyncStorage
  const persistSubscriptionState = useCallback(async (state: SubscriptionState) => {
    try {
      await AsyncStorage.setItem('subscription_state_v2', JSON.stringify({
        tier: state.tier,
        isActive: state.isActive,
        expiresAt: state.expiresAt?.toISOString(),
        activatedAt: state.activatedAt?.toISOString(),
        savedAt: new Date().toISOString()
      }))
      console.log('💾 Subscription state persisted:', {
        tier: state.tier,
        isActive: state.isActive,
        expiresAt: state.expiresAt
      })
    } catch (error) {
      console.error('❌ Failed to persist subscription state:', error)
    }
  }, [])

  // Load subscription state from AsyncStorage
  const loadPersistedSubscriptionState = useCallback(async (): Promise<SubscriptionState | null> => {
    try {
      const stored = await AsyncStorage.getItem('subscription_state_v2')
      if (stored) {
        const parsed = JSON.parse(stored)
        const state: SubscriptionState = {
          tier: parsed.tier || 'free',
          isActive: parsed.isActive || false,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
          activatedAt: parsed.activatedAt ? new Date(parsed.activatedAt) : null
        }
        console.log('📱 Restored subscription state from storage:', {
          tier: state.tier,
          isActive: state.isActive,
          expiresAt: state.expiresAt,
          savedAt: parsed.savedAt
        })
        return state
      }
    } catch (error) {
      console.error('❌ Failed to load persisted subscription state:', error)
    }
    return null
  }, [])

  // Enhanced setSubscription that also persists state
  const updateSubscriptionState = useCallback((newState: SubscriptionState) => {
    console.log('🔄 Updating subscription state:', {
      from: { tier: subscription.tier, isActive: subscription.isActive },
      to: { tier: newState.tier, isActive: newState.isActive }
    })
    setSubscription(newState)
    persistSubscriptionState(newState)
  }, [subscription.tier, subscription.isActive, persistSubscriptionState])

  const [showPaywall, setShowPaywall] = useState(false)
  
  // RevenueCat state
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [currentOffering, setCurrentOffering] = useState<Offering | null>(null)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [revenueCatInitialized, setRevenueCatInitialized] = useState(false)
  
  // Refs for state management
  const isUpdatingLocalState = useRef(false)
  const lastStateUpdateTime = useRef<number>(0)
  const lastPaywallNavigationTime = useRef<number>(0)

  // Initialize RevenueCat
  const initializeRevenueCat = useCallback(async (): Promise<boolean> => {
    if (revenueCatInitialized) {
      console.log('📱 RevenueCat already initialized')
      return true
    }

    try {
      console.log('🚀 Initializing RevenueCat...')
      
      // Get API keys from environment
      const apiKeyIOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
      const enableDebugLogs = process.env.EXPO_PUBLIC_REVENUECAT_DEBUG_LOGS === 'true'
      
      console.log('🔑 RevenueCat environment check:', {
        apiKeyIOS: apiKeyIOS ? 'Found' : 'Missing',
        apiKeyValue: apiKeyIOS ? `${apiKeyIOS.substring(0, 8)}...${apiKeyIOS.slice(-4)}` : 'N/A',
        enableDebugLogs,
        platform: Platform.OS
      })
      
      if (!apiKeyIOS && Platform.OS === 'ios') {
        console.error('❌ RevenueCat iOS API key not found')
        return false
      }

      await revenueCatService.initialize({
        apiKeyIOS,
        enableDebugLogs
      })

      // Set user ID if we have one
      if (user?.id) {
        await revenueCatService.setUserId(user.id)
      }

      // Load offerings
      const allOfferings = await revenueCatService.getOfferings()
      const current = await revenueCatService.getCurrentOffering()
      
      setOfferings(allOfferings)
      setCurrentOffering(current)
      setRevenueCatInitialized(true)
      
      console.log('✅ RevenueCat initialized successfully')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize RevenueCat:', error)
      return false
    }
  }, [revenueCatInitialized, user?.id])

  // Sync with RevenueCat and update local state
  const syncWithRevenueCat = useCallback(async (): Promise<void> => {
    if (!revenueCatInitialized || !user?.id) {
      console.log('⏭️ Skipping RevenueCat sync - not initialized or no user')
      return
    }

    try {
      // console.log('🔄 Syncing with RevenueCat...')
      
      const subscriptionInfo = await revenueCatService.getSubscriptionInfo()
      const customerInfo = subscriptionInfo.customerInfo
      
      if (customerInfo) {
        setCustomerInfo(customerInfo)
        
        // Update local subscription state based on RevenueCat data and persist it
        updateSubscriptionState({
          tier: subscriptionInfo.tier,
          isActive: subscriptionInfo.isActive,
          expiresAt: subscriptionInfo.subscriptionExpiresAt,
          activatedAt: subscriptionInfo.subscriptionStartedAt,
          isInTrial: subscriptionInfo.isInTrial,
          trialStartedAt: subscriptionInfo.trialStartedAt,
          trialDaysRemaining: subscriptionInfo.isInTrial && subscriptionInfo.trialEndsAt ? 
            Math.max(0, Math.ceil((subscriptionInfo.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
        })

        // Sync to database
        if (subscriptionInfo.customerInfo) {
          await supabaseService.syncRevenueCatData({
            userId: user.id,
            customerInfo: subscriptionInfo.customerInfo,
            subscriptionStatus: subscriptionInfo.tier,
            subscriptionExpiresAt: subscriptionInfo.subscriptionExpiresAt,
            subscriptionActivatedAt: subscriptionInfo.subscriptionStartedAt,
            revenueCatCustomerId: subscriptionInfo.customerInfo.originalAppUserId,
            originalPurchaseDate: subscriptionInfo.originalPurchaseDate,
            isInTrial: subscriptionInfo.isInTrial,
            trialStartedAt: subscriptionInfo.trialStartedAt
          })
        }
        
        // console.log('✅ RevenueCat sync completed', {
        //   userState: subscriptionInfo.userState,
        //   isActive: subscriptionInfo.isActive,
        //   tier: subscriptionInfo.tier
        // })
      }
    } catch (error) {
      console.error('❌ Failed to sync with RevenueCat:', error)
    }
  }, [revenueCatInitialized, user?.id])

  // Load persisted subscription state immediately on app startup
  useEffect(() => {
    const loadInitialState = async () => {
      console.log('🚀 SubscriptionContext: Loading initial state...')
      
      // Load persisted state immediately to prevent race conditions
      const persistedState = await loadPersistedSubscriptionState()
      if (persistedState) {
        console.log('⚡ Using persisted subscription state for immediate AuthGuard decisions')
        setSubscription(persistedState)
        setIsLoading(false) // Mark as loaded so AuthGuard can proceed
      } else {
        console.log('📱 No persisted subscription state found, using defaults')
        setIsLoading(false) // Still mark as loaded so AuthGuard can proceed with defaults
      }
    }
    
    loadInitialState()
  }, [loadPersistedSubscriptionState])

  // Initialize RevenueCat when user is available
  useEffect(() => {
    if (user?.id && !revenueCatInitialized) {
      initializeRevenueCat().then(success => {
        if (success) {
          console.log('🔄 RevenueCat initialized, syncing subscription state...')
          syncWithRevenueCat()
        }
      })
    }
  }, [user?.id, initializeRevenueCat, revenueCatInitialized, syncWithRevenueCat])

  // Recovery mechanism: If RevenueCat takes too long, ensure AuthGuard isn't blocked
  useEffect(() => {
    if (user?.id && isLoading) {
      console.log('⏰ Setting up subscription loading timeout...')
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.log('⚠️ Subscription loading timeout - unblocking AuthGuard with current state')
          setIsLoading(false)
        }
      }, 5000) // 5 second timeout

      return () => clearTimeout(timeoutId)
    }
  }, [user?.id, isLoading])

  // Load subscription state from profile and sync with RevenueCat
  useEffect(() => {
    if (profile) {
      loadSubscriptionFromProfile()
      // Also sync with RevenueCat after loading profile
      if (revenueCatInitialized) {
        syncWithRevenueCat()
      }
    } else {
      setIsLoading(false)
    }
  }, [profile, loadSubscriptionFromProfile, revenueCatInitialized, syncWithRevenueCat])

  // Refresh subscription data when DevTime day changes (for accurate trial countdown)
  useEffect(() => {
    // Check if we're in the middle of a state update
    const timeSinceLastUpdate = Date.now() - lastStateUpdateTime.current
    const isRecentUpdate = timeSinceLastUpdate < 5000 // 5 seconds
    
    if (profile && subscription.isInTrial && !isUpdatingLocalState.current && !isRecentUpdate) {
      // console.log(`🔄 DevTime day changed to ${currentSimulatedDay}, refreshing trial status...`)
      loadSubscriptionFromProfile()
    } else if (isUpdatingLocalState.current || isRecentUpdate) {
      // console.log(`🔄 DevTime: Skipping refresh - state update in progress (isUpdating: ${isUpdatingLocalState.current}, recent: ${isRecentUpdate})`)
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
      // console.log('📄 Loading subscription state from profile...')
      
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
      
      updateSubscriptionState({
        tier,
        isActive,
        expiresAt,
        activatedAt,
        isInTrial,
        trialStartedAt,
        trialDaysRemaining
      })
      
    } catch (error) {
      console.error('Error loading subscription state:', error)
      
      // Fallback to AsyncStorage (using the same v2 format)
      try {
        const persistedState = await loadPersistedSubscriptionState()
        if (persistedState) {
          console.log('🔄 Loaded fallback subscription state from AsyncStorage')
          setSubscription(persistedState)
        }
      } catch (storageError) {
        console.error('Error loading from AsyncStorage fallback:', storageError)
      }
    } finally {
      setIsLoading(false)
    }
  }, [profile, getCurrentDate, user?.id])

  // =============================================
  // REVENUECAT PURCHASE METHODS
  // =============================================

  // Start Apple-managed trial (RevenueCat)
  const startAppleTrial = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !revenueCatInitialized) {
      console.error('❌ Cannot start trial: user not found or RevenueCat not initialized')
      return false
    }

    try {
      setIsLoading(true)
      console.log('🍎 Starting Apple trial via RevenueCat...')

      // Check if user can start trial
      const hasUsedTrial = await revenueCatService.hasUsedTrialBefore()
      if (hasUsedTrial) {
        console.error('❌ User has already used trial before')
        return false
      }

      // Get current offering to find the weekly package (with trial)
      const offering = await revenueCatService.getCurrentOffering()
      if (!offering) {
        console.error('❌ No current offering found')
        return false
      }

      // Find weekly package (which should have the trial)
      const weeklyPackage = offering.availablePackages.find(
        pkg => pkg.product.identifier === PRODUCT_IDS.WEEKLY
      )

      if (!weeklyPackage) {
        console.error('❌ Weekly package not found in offering')
        return false
      }

      console.log('💳 Purchasing weekly package with trial...', {
        packageId: weeklyPackage.identifier,
        productId: weeklyPackage.product.identifier,
        price: weeklyPackage.product.priceString
      })

      // Purchase the package (Apple will handle trial period)
      const result = await revenueCatService.purchasePackage(weeklyPackage)
      
      console.log('✅ Apple trial started successfully:', {
        productIdentifier: result.productIdentifier
      })

      // Sync with RevenueCat to update local state
      await syncWithRevenueCat()
      
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('❌ Failed to start Apple trial:', error)
      setIsLoading(false)
      return false
    }
  }, [user?.id, revenueCatInitialized, syncWithRevenueCat])

  // Purchase a subscription package (RevenueCat)
  const purchasePackage = useCallback(async (packageId: string): Promise<boolean> => {
    if (!user?.id || !revenueCatInitialized) {
      console.error('❌ Cannot purchase: user not found or RevenueCat not initialized')
      return false
    }

    try {
      setIsLoading(true)
      console.log('💳 Purchasing package via RevenueCat...', { packageId })

      // Get current offering
      const offering = await revenueCatService.getCurrentOffering()
      if (!offering) {
        console.error('❌ No current offering found')
        return false
      }

      // Find the requested package
      const packageToPurchase = offering.availablePackages.find(
        pkg => pkg.identifier === packageId
      )

      if (!packageToPurchase) {
        console.error('❌ Package not found in offering:', packageId)
        return false
      }

      console.log('💳 Purchasing package...', {
        packageId: packageToPurchase.identifier,
        productId: packageToPurchase.product.identifier,
        price: packageToPurchase.product.priceString
      })

      // Purchase the package
      const result = await revenueCatService.purchasePackage(packageToPurchase)
      
      console.log('✅ Purchase successful:', {
        productIdentifier: result.productIdentifier
      })

      // Sync with RevenueCat to update local state
      await syncWithRevenueCat()
      
      setIsLoading(false)
      return true
    } catch (error) {
      console.error('❌ Purchase failed:', error)
      setIsLoading(false)
      return false
    }
  }, [user?.id, revenueCatInitialized, syncWithRevenueCat])

  // Restore purchases (RevenueCat)
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!revenueCatInitialized) {
      console.error('❌ Cannot restore: RevenueCat not initialized')
      return false
    }

    try {
      setIsLoading(true)
      console.log('🔄 Restoring purchases via RevenueCat...')

      const customerInfo = await revenueCatService.restorePurchases()
      
      console.log('✅ Purchases restored:', {
        hasActiveEntitlements: Object.keys(customerInfo.entitlements.active).length > 0
      })

      // Sync with RevenueCat to update local state
      await syncWithRevenueCat()
      
      setIsLoading(false)
      return Object.keys(customerInfo.entitlements.active).length > 0
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error)
      setIsLoading(false)
      return false
    }
  }, [revenueCatInitialized, syncWithRevenueCat])

  // =============================================
  // LEGACY MOCK METHODS (for backward compatibility)
  // =============================================

  // Start free trial (legacy - now calls Apple trial)
  const startFreeTrial = useCallback(async (): Promise<boolean> => {
    console.log('🔄 Legacy startFreeTrial called - redirecting to Apple trial')
    return await startAppleTrial()
  }, [startAppleTrial])

  // Activate subscription (legacy - now uses RevenueCat)
  const activateSubscription = useCallback(async (planId: SubscriptionTier): Promise<boolean> => {
    console.log('🔄 Legacy activateSubscription called - using RevenueCat purchase')
    
    // Map plan ID to package ID and purchase via RevenueCat
    const productId = TIER_TO_PRODUCT_ID[planId]
    if (!productId) {
      console.error('❌ No product ID found for plan:', planId)
      return false
    }

    // For legacy compatibility, we need to find the package by product ID
    try {
      const offering = await revenueCatService.getCurrentOffering()
      if (!offering) {
        console.error('❌ No current offering found')
        return false
      }

      const packageToPurchase = offering.availablePackages.find(
        pkg => pkg.product.identifier === productId
      )

      if (!packageToPurchase) {
        console.error('❌ Package not found for product ID:', productId)
        return false
      }

      return await purchasePackage(packageToPurchase.identifier)
    } catch (error) {
      console.error('❌ Failed to activate subscription:', error)
      return false
    }
  }, [purchasePackage])

  // Cancel subscription (mock implementation)
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false

    try {
      // Set to expire immediately with DevTime date
      const currentDate = getCurrentDate()
      const success = await supabaseService.activateSubscription(user.id, 'free', 0, currentDate)
      
      if (success) {
        updateSubscriptionState({
          tier: 'free',
          isActive: false,
          expiresAt: null,
          activatedAt: null,
          isInTrial: false,
          trialStartedAt: subscription.trialStartedAt, // Keep trial history
          trialDaysRemaining: 0
        })

        console.log('✅ Subscription cancelled')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      return false
    }
  }, [user?.id])

  // Restore subscription (legacy - now calls RevenueCat)
  const restoreSubscription = useCallback(async (): Promise<boolean> => {
    console.log('🔄 Legacy restoreSubscription called - redirecting to RevenueCat restore')
    return await restorePurchases()
  }, [restorePurchases])

  // Removed: All feature check functions and UI helpers (hard paywall model)

  const contextValue: SubscriptionContextType = {
    subscription,
    plans: SUBSCRIPTION_PLANS,
    isLoading,
    
    // RevenueCat state
    offerings,
    currentOffering,
    customerInfo,
    
    // RevenueCat methods
    purchasePackage,
    restorePurchases,
    initializeRevenueCat,
    syncWithRevenueCat
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

// Hook for premium status (simplified for hard paywall)
export function usePremium() {
  const { subscription } = useSubscription()
  return subscription.isActive
}