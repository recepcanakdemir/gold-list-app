import Purchases, { 
  LOG_LEVEL, 
  PURCHASES_ERROR_CODE,
  CustomerInfo,
  PurchasesOffering as Offering,
  PurchasesPackage as Package,
  PurchasesError
} from 'react-native-purchases'
import { Platform } from 'react-native'
import {
  RevenueCatConfig,
  RevenueCatSubscriptionInfo,
  RevenueCatServiceInterface,
  PurchaseSuccess,
  PurchaseError,
  RevenueCatError,
  RevenueCatErrorCode,
  PRODUCT_IDS,
  ENTITLEMENTS,
  OFFERINGS
} from '../types/revenuecat'

class RevenueCatService implements RevenueCatServiceInterface {
  private isInitialized = false
  private currentCustomerInfo: CustomerInfo | null = null

  async initialize(config: RevenueCatConfig): Promise<void> {
    try {
      // console.log('🛒 Initializing RevenueCat...')
      
      // Set debug logs if enabled
      if (config.enableDebugLogs) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG)
      } else {
        Purchases.setLogLevel(LOG_LEVEL.INFO)
      }

      // Configure with platform-specific API key
      if (Platform.OS === 'ios') {
        if (!config.apiKeyIOS) {
          throw new RevenueCatError(
            RevenueCatErrorCode.INITIALIZATION_FAILED,
            'iOS API key is required'
          )
        }
        // console.log('🛒 Configuring RevenueCat with key:', {
        //   keyPreview: `${config.apiKeyIOS.substring(0, 8)}...${config.apiKeyIOS.slice(-4)}`,
        //   keyLength: config.apiKeyIOS.length,
        //   startsWithAppl: config.apiKeyIOS.startsWith('appl_')
        // })
        await Purchases.configure({ apiKey: config.apiKeyIOS })
      } else if (Platform.OS === 'android' && config.apiKeyAndroid) {
        await Purchases.configure({ apiKey: config.apiKeyAndroid })
      } else {
        throw new RevenueCatError(
          RevenueCatErrorCode.INITIALIZATION_FAILED,
          `Unsupported platform: ${Platform.OS}`
        )
      }

      this.isInitialized = true
      // console.log('✅ RevenueCat initialized successfully')
      
      // Load initial customer info
      await this.getCustomerInfo()
      
    } catch (error) {
      console.error('❌ RevenueCat initialization failed:', error)
      throw new RevenueCatError(
        RevenueCatErrorCode.INITIALIZATION_FAILED,
        'Failed to initialize RevenueCat',
        error
      )
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      this.ensureInitialized()
      
      // console.log('📋 Fetching customer info...')
      const customerInfo = await Purchases.getCustomerInfo()
      this.currentCustomerInfo = customerInfo
      
      // console.log('✅ Customer info loaded:', {
      //   originalAppUserId: customerInfo.originalAppUserId,
      //   hasActiveEntitlements: Object.keys(customerInfo.entitlements.active).length > 0,
      //   activeEntitlements: Object.keys(customerInfo.entitlements.active),
      //   originalPurchaseDate: customerInfo.originalPurchaseDate
      // })
      
      return customerInfo
    } catch (error) {
      console.error('❌ Failed to get customer info:', error)
      throw new RevenueCatError(
        RevenueCatErrorCode.CUSTOMER_INFO_FAILED,
        'Failed to fetch customer info',
        error
      )
    }
  }

  async syncCustomerInfo(): Promise<RevenueCatSubscriptionInfo> {
    try {
      const customerInfo = await this.getCustomerInfo()
      return this.parseCustomerInfo(customerInfo)
    } catch (error) {
      console.error('❌ Failed to sync customer info:', error)
      throw error
    }
  }

  async getOfferings(): Promise<Offering[]> {
    try {
      this.ensureInitialized()
      
      // console.log('🛍️ Fetching offerings...')
      const offerings = await Purchases.getOfferings()
      
      // console.log('✅ Offerings loaded:', {
      //   currentOffering: offerings.current?.identifier,
      //   allOfferings: Object.keys(offerings.all)
      // })
      
      return Object.values(offerings.all)
    } catch (error) {
      console.error('❌ Failed to get offerings:', error)
      throw new RevenueCatError(
        RevenueCatErrorCode.OFFERINGS_FAILED,
        'Failed to fetch offerings',
        error
      )
    }
  }

  async getCurrentOffering(): Promise<Offering | null> {
    try {
      const offerings = await Purchases.getOfferings()
      return offerings.current
    } catch (error) {
      console.error('❌ Failed to get current offering:', error)
      return null
    }
  }

  async purchasePackage(packageToPurchase: Package): Promise<PurchaseSuccess> {
    try {
      this.ensureInitialized()
      
      console.log('💳 Starting purchase...', {
        packageId: packageToPurchase.identifier,
        productId: packageToPurchase.product.identifier,
        price: packageToPurchase.product.priceString
      })

      const { customerInfo, productIdentifier } = await Purchases.purchasePackage(packageToPurchase)
      
      // console.log('✅ Purchase successful:', {
      //   productIdentifier,
      //   hasActiveEntitlements: Object.keys(customerInfo.entitlements.active).length > 0,
      //   activeEntitlements: Object.keys(customerInfo.entitlements.active)
      // })

      this.currentCustomerInfo = customerInfo

      return {
        customerInfo,
        transaction: null, // RevenueCat abstracts transaction details
        productIdentifier
      }
    } catch (error) {
      console.error('❌ Purchase failed:', error)
      
      const purchasesError = error as PurchasesError
      
      if (purchasesError.code === PurchasesErrorCode.PurchaseCancelledError) {
        throw new RevenueCatError(
          RevenueCatErrorCode.PURCHASE_CANCELLED,
          'Purchase was cancelled by user',
          error
        )
      }
      
      throw new RevenueCatError(
        RevenueCatErrorCode.PURCHASE_FAILED,
        'Purchase failed',
        error
      )
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    try {
      this.ensureInitialized()
      
      // console.log('🔄 Restoring purchases...')
      const customerInfo = await Purchases.restorePurchases()
      this.currentCustomerInfo = customerInfo
      
      // console.log('✅ Purchases restored:', {
      //   hasActiveEntitlements: Object.keys(customerInfo.entitlements.active).length > 0,
      //   activeEntitlements: Object.keys(customerInfo.entitlements.active)
      // })
      
      return customerInfo
    } catch (error) {
      console.error('❌ Failed to restore purchases:', error)
      throw new RevenueCatError(
        RevenueCatErrorCode.RESTORE_FAILED,
        'Failed to restore purchases',
        error
      )
    }
  }

  async getSubscriptionInfo(): Promise<RevenueCatSubscriptionInfo> {
    try {
      const customerInfo = await this.getCustomerInfo()
      return this.parseCustomerInfo(customerInfo)
    } catch (error) {
      console.error('❌ Failed to get subscription info:', error)
      throw error
    }
  }

  async getUserState(): Promise<'pre-trial' | 'trial' | 'post-trial' | 'premium'> {
    try {
      const subscriptionInfo = await this.getSubscriptionInfo()
      return subscriptionInfo.userState
    } catch (error) {
      console.error('❌ Failed to get user state:', error)
      return 'pre-trial' // Safe fallback
    }
  }

  async hasActiveSubscription(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo()
      return Object.keys(customerInfo.entitlements.active).length > 0
    } catch (error) {
      console.error('❌ Failed to check active subscription:', error)
      return false
    }
  }

  async isInTrialPeriod(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo()
      const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM_ACCESS]
      
      if (!premiumEntitlement) return false
      
      // Check if any active subscription is in trial period
      for (const [productId, subscription] of Object.entries(customerInfo.activeSubscriptions)) {
        if (subscription.isInIntroductoryPeriod) {
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('❌ Failed to check trial period:', error)
      return false
    }
  }

  async hasUsedTrialBefore(): Promise<boolean> {
    try {
      const customerInfo = await this.getCustomerInfo()
      // If user has original purchase date, they've purchased before
      return customerInfo.originalPurchaseDate !== null
    } catch (error) {
      console.error('❌ Failed to check trial usage:', error)
      return false
    }
  }

  async setUserId(userId: string): Promise<void> {
    try {
      this.ensureInitialized()
      // console.log('👤 Setting RevenueCat user ID:', userId)
      await Purchases.logIn(userId)
      // console.log('✅ User ID set successfully')
    } catch (error) {
      console.error('❌ Failed to set user ID:', error)
      // Don't throw error - this is not critical for basic functionality
    }
  }

  async reset(): Promise<void> {
    try {
      this.ensureInitialized()
      // console.log('🔄 Resetting RevenueCat...')
      await Purchases.logOut()
      this.currentCustomerInfo = null
      // console.log('✅ RevenueCat reset successfully')
    } catch (error) {
      console.error('❌ Failed to reset RevenueCat:', error)
      throw error
    }
  }

  // Private helper methods
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new RevenueCatError(
        RevenueCatErrorCode.INITIALIZATION_FAILED,
        'RevenueCat is not initialized. Call initialize() first.'
      )
    }
  }

  private parseCustomerInfo(customerInfo: CustomerInfo): RevenueCatSubscriptionInfo {
    console.log('📊 Parsing customer info...', {
      originalAppUserId: customerInfo.originalAppUserId,
      originalPurchaseDate: customerInfo.originalPurchaseDate,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
      allEntitlements: Object.keys(customerInfo.entitlements.all),
      activeSubscriptions: Object.keys(customerInfo.activeSubscriptions)
    })

    // Check if user has premium access
    const premiumEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PREMIUM_ACCESS]
    const isActive = !!premiumEntitlement
    
    // Determine subscription tier
    let tier: 'free' | 'weekly' | 'monthly' | 'yearly' = 'free'
    if (isActive) {
      const productId = premiumEntitlement.productIdentifier
      if (productId === PRODUCT_IDS.WEEKLY) tier = 'weekly'
      else if (productId === PRODUCT_IDS.MONTHLY) tier = 'monthly'
      else if (productId === PRODUCT_IDS.YEARLY) tier = 'yearly'
    }

    // Check trial status
    let isInTrial = false
    let trialStartedAt: Date | null = null
    let trialEndsAt: Date | null = null

    if (isActive) {
      for (const [productId, subscription] of Object.entries(customerInfo.activeSubscriptions)) {
        if (subscription.isInIntroductoryPeriod) {
          isInTrial = true
          trialStartedAt = new Date(subscription.originalPurchaseDate)
          // Calculate trial end date (14 days from start)
          trialEndsAt = new Date(trialStartedAt.getTime() + (14 * 24 * 60 * 60 * 1000))
          break
        }
      }
    }

    // Parse dates
    const originalPurchaseDate = customerInfo.originalPurchaseDate ? new Date(customerInfo.originalPurchaseDate) : null
    const latestPurchaseDate = customerInfo.latestExpirationDate ? new Date(customerInfo.latestExpirationDate) : null
    const subscriptionExpiresAt = premiumEntitlement?.expirationDate ? new Date(premiumEntitlement.expirationDate) : null
    const subscriptionStartedAt = premiumEntitlement?.originalPurchaseDate ? new Date(premiumEntitlement.originalPurchaseDate) : null

    // Determine user state based on your 4-state system
    let userState: 'pre-trial' | 'trial' | 'post-trial' | 'premium'
    
    if (isActive && isInTrial) {
      userState = 'trial'
    } else if (isActive && !isInTrial) {
      userState = 'premium'
    } else if (originalPurchaseDate) {
      // User had subscription before but doesn't have active one now
      userState = 'post-trial'
    } else {
      // User never had any subscription
      userState = 'pre-trial'
    }

    const subscriptionInfo: RevenueCatSubscriptionInfo = {
      isActive,
      tier,
      isInTrial,
      trialStartedAt,
      trialEndsAt,
      subscriptionStartedAt,
      subscriptionExpiresAt,
      customerInfo,
      hasEverPurchased: !!originalPurchaseDate,
      activeEntitlements: Object.keys(customerInfo.entitlements.active),
      userState,
      originalPurchaseDate,
      latestPurchaseDate
    }

    console.log('🔍 SUBSCRIPTION STATE:', {
      userState,
      isActive,
      tier,
      hasEverPurchased: subscriptionInfo.hasEverPurchased,
      originalPurchaseDate: originalPurchaseDate ? 'EXISTS' : 'NULL'
    })

    return subscriptionInfo
  }
}

// Export singleton instance
export const revenueCatService = new RevenueCatService()
export default revenueCatService