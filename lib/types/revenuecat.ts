import type { 
  CustomerInfo, 
  MakePurchaseResult as PurchaseResult,
  PurchasesPackage as Package,
  PurchasesOffering as Offering 
} from 'react-native-purchases'

// Re-export RevenueCat types for convenience
export type { CustomerInfo, Package, Offering, PurchaseResult }

// RevenueCat configuration types
export interface RevenueCatConfig {
  apiKeyIOS: string
  apiKeyAndroid?: string
  enableDebugLogs?: boolean
}

// Product identifiers matching App Store Connect
export const PRODUCT_IDS = {
  WEEKLY: 'goldlist_premium_weekly_499',
  MONTHLY: 'goldlist_premium_monthly_999', 
  YEARLY: 'goldlist_premium_yearly_4999'
} as const

// Entitlement identifiers matching RevenueCat dashboard
export const ENTITLEMENTS = {
  PREMIUM_ACCESS: 'premium_access'
} as const

// Offering identifiers
export const OFFERINGS = {
  DEFAULT: 'default'
} as const

// Enhanced subscription state with RevenueCat data
export interface RevenueCatSubscriptionInfo {
  // Core subscription data
  isActive: boolean
  tier: 'free' | 'weekly' | 'monthly' | 'yearly'
  
  // Trial information
  isInTrial: boolean
  trialStartedAt: Date | null
  trialEndsAt: Date | null
  
  // Subscription information
  subscriptionStartedAt: Date | null
  subscriptionExpiresAt: Date | null
  
  // RevenueCat specific
  customerInfo: CustomerInfo | null
  hasEverPurchased: boolean
  activeEntitlements: string[]
  
  // User state for app logic
  userState: 'pre-trial' | 'trial' | 'post-trial' | 'premium'
  
  // Purchase history
  originalPurchaseDate: Date | null
  latestPurchaseDate: Date | null
}

// Purchase flow types
export interface PurchaseOptions {
  packageId: string
  offeringId?: string
}

export interface PurchaseError {
  code: string
  message: string
  userCancelled: boolean
  underlyingError?: any
}

export interface PurchaseSuccess {
  customerInfo: CustomerInfo
  transaction: any
  productIdentifier: string
}

// RevenueCat service methods interface
export interface RevenueCatServiceInterface {
  // Initialization
  initialize(config: RevenueCatConfig): Promise<void>
  
  // Customer info
  getCustomerInfo(): Promise<CustomerInfo>
  syncCustomerInfo(): Promise<RevenueCatSubscriptionInfo>
  
  // Offerings and packages
  getOfferings(): Promise<Offering[]>
  getCurrentOffering(): Promise<Offering | null>
  
  // Purchase flows
  purchasePackage(packageToPurchase: Package): Promise<PurchaseSuccess>
  restorePurchases(): Promise<CustomerInfo>
  
  // Subscription state helpers
  getSubscriptionInfo(): Promise<RevenueCatSubscriptionInfo>
  getUserState(): Promise<'pre-trial' | 'trial' | 'post-trial' | 'premium'>
  
  // Feature access
  hasActiveSubscription(): Promise<boolean>
  isInTrialPeriod(): Promise<boolean>
  hasUsedTrialBefore(): Promise<boolean>
  
  // Utility
  setUserId(userId: string): Promise<void>
  reset(): Promise<void>
}

// Database sync types
export interface RevenueCatSyncData {
  userId: string
  customerInfo: CustomerInfo
  subscriptionStatus: 'free' | 'weekly' | 'monthly' | 'yearly'
  subscriptionExpiresAt: Date | null
  subscriptionActivatedAt: Date | null
  revenueCatCustomerId: string
  originalPurchaseDate: Date | null
  isInTrial: boolean
  trialStartedAt: Date | null
}

// Webhook payload types (for future webhook implementation)
export interface RevenueCatWebhookEvent {
  api_version: string
  event: {
    type: string
    id: string
    timestamp: string
    app_user_id: string
    aliases: string[]
    original_app_user_id: string
    product_id: string
    period_type: string
    purchased_at_ms: number
    expiration_at_ms: number | null
    environment: 'SANDBOX' | 'PRODUCTION'
    is_family_share: boolean
    country_code: string
    app_id: string
    entitlement_id: string | null
    entitlement_ids: string[]
    presented_offering_id: string | null
    transaction_id: string
    original_transaction_id: string
    is_trial_period: boolean
    price: number
    currency: string
    subscriber_attributes: Record<string, any>
    store: 'APP_STORE' | 'PLAY_STORE'
  }
}

// Error types for better error handling
export enum RevenueCatErrorCode {
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  CUSTOMER_INFO_FAILED = 'CUSTOMER_INFO_FAILED',
  PURCHASE_CANCELLED = 'PURCHASE_CANCELLED',
  PURCHASE_FAILED = 'PURCHASE_FAILED',
  RESTORE_FAILED = 'RESTORE_FAILED',
  OFFERINGS_FAILED = 'OFFERINGS_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class RevenueCatError extends Error {
  constructor(
    public code: RevenueCatErrorCode,
    message: string,
    public originalError?: any
  ) {
    super(message)
    this.name = 'RevenueCatError'
  }
}