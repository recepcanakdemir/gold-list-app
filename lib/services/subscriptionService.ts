import * as InAppPurchases from 'expo-in-app-purchases'

// Subscription product IDs (should match App Store Connect / Google Play Console)
export const SUBSCRIPTION_PRODUCTS = {
  WEEKLY: 'com.goldlist.weekly',
  ANNUAL: 'com.goldlist.annual',
} as const

export interface SubscriptionProduct {
  productId: string
  price: string
  priceAmountMicros: number
  priceCurrencyCode: string
  subscriptionPeriod: string
  introductoryPrice?: string
  introductoryPricePeriod?: string
  freeTrialPeriod?: string
}

export interface PurchaseResult {
  success: boolean
  transactionId?: string
  receipt?: string
  error?: string
}

export class SubscriptionService {
  private static instance: SubscriptionService
  private isInitialized = false
  private products: SubscriptionProduct[] = []

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService()
    }
    return SubscriptionService.instance
  }

  async initialize(): Promise<boolean> {
    try {
      const isAvailable = await InAppPurchases.isAvailableAsync()
      if (!isAvailable) {
        console.warn('In-app purchases not available')
        return false
      }

      await InAppPurchases.connectAsync()
      this.isInitialized = true
      
      // Load products
      await this.loadProducts()
      
      // Set up purchase listener
      this.setupPurchaseListener()
      
      return true
    } catch (error) {
      console.error('Failed to initialize subscription service:', error)
      return false
    }
  }

  private async loadProducts(): Promise<void> {
    try {
      const productIds = Object.values(SUBSCRIPTION_PRODUCTS)
      const { results } = await InAppPurchases.getProductsAsync(productIds)
      
      this.products = results.map(product => ({
        productId: product.productId,
        price: product.price,
        priceAmountMicros: product.priceAmountMicros,
        priceCurrencyCode: product.priceCurrencyCode,
        subscriptionPeriod: product.subscriptionPeriod || '',
        introductoryPrice: product.introductoryPrice,
        introductoryPricePeriod: product.introductoryPricePeriod,
        freeTrialPeriod: product.freeTrialPeriod,
      }))
      
      console.log('Loaded subscription products:', this.products)
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }

  private setupPurchaseListener(): void {
    InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        results?.forEach(purchase => {
          console.log('Purchase completed:', purchase)
          
          if (purchase.acknowledged === false) {
            // Acknowledge the purchase
            this.acknowledgePurchase(purchase.purchaseToken)
          }
        })
      } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        console.log('Purchase canceled by user')
      } else {
        console.error('Purchase failed:', errorCode)
      }
    })
  }

  async getProducts(): Promise<SubscriptionProduct[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }
    return this.products
  }

  async getProduct(productId: string): Promise<SubscriptionProduct | null> {
    const products = await this.getProducts()
    return products.find(p => p.productId === productId) || null
  }

  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Subscription service not initialized')
      }

      const result = await InAppPurchases.purchaseItemAsync(productId)
      
      if (result.responseCode === InAppPurchases.IAPResponseCode.OK) {
        const purchase = result.results?.[0]
        if (purchase) {
          // Verify purchase with your backend
          const verificationResult = await this.verifyPurchase(purchase)
          
          if (verificationResult.success) {
            return {
              success: true,
              transactionId: purchase.transactionId,
              receipt: purchase.transactionReceipt,
            }
          } else {
            throw new Error('Purchase verification failed')
          }
        }
      }
      
      throw new Error(`Purchase failed with code: ${result.responseCode}`)
    } catch (error) {
      console.error('Purchase error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async restorePurchases(): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        throw new Error('Subscription service not initialized')
      }

      const result = await InAppPurchases.getPurchaseHistoryAsync()
      
      if (result.responseCode === InAppPurchases.IAPResponseCode.OK && result.results) {
        const activePurchases = result.results.filter(purchase => 
          purchase.acknowledged && !purchase.isExpired
        )
        
        if (activePurchases.length > 0) {
          // Restore the most recent active subscription
          const latestPurchase = activePurchases[0]
          
          // Verify with backend
          const verificationResult = await this.verifyPurchase(latestPurchase)
          
          if (verificationResult.success) {
            return {
              success: true,
              transactionId: latestPurchase.transactionId,
              receipt: latestPurchase.transactionReceipt,
            }
          }
        }
      }
      
      return {
        success: false,
        error: 'No active subscriptions found',
      }
    } catch (error) {
      console.error('Restore error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async checkSubscriptionStatus(): Promise<{
    isActive: boolean
    productId?: string
    expirationDate?: Date
  }> {
    try {
      const result = await InAppPurchases.getPurchaseHistoryAsync()
      
      if (result.responseCode === InAppPurchases.IAPResponseCode.OK && result.results) {
        const activePurchases = result.results.filter(purchase => 
          purchase.acknowledged && !purchase.isExpired
        )
        
        if (activePurchases.length > 0) {
          const latestPurchase = activePurchases[0]
          return {
            isActive: true,
            productId: latestPurchase.productId,
            expirationDate: new Date(latestPurchase.expirationDate || 0),
          }
        }
      }
      
      return { isActive: false }
    } catch (error) {
      console.error('Status check error:', error)
      return { isActive: false }
    }
  }

  private async verifyPurchase(purchase: any): Promise<{ success: boolean; error?: string }> {
    try {
      // In a real implementation, send the purchase receipt to your backend
      // for server-side verification with Apple/Google
      
      const response = await fetch('https://your-api.com/verify-purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_TOKEN',
        },
        body: JSON.stringify({
          receipt: purchase.transactionReceipt,
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          platform: purchase.platform,
        }),
      })
      
      const result = await response.json()
      
      if (result.valid) {
        // Update user's subscription status in your database
        await this.updateUserSubscription({
          userId: 'current-user-id', // Get from auth context
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          expirationDate: result.expirationDate,
          isActive: true,
        })
        
        return { success: true }
      } else {
        return { success: false, error: 'Invalid receipt' }
      }
    } catch (error) {
      console.error('Verification error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Verification failed' 
      }
    }
  }

  private async updateUserSubscription(data: {
    userId: string
    productId: string
    transactionId: string
    expirationDate: string
    isActive: boolean
  }): Promise<void> {
    // Update user subscription in your backend/Supabase
    console.log('Updating user subscription:', data)
    
    // Example Supabase update:
    /*
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: data.productId.includes('annual') ? 'annual' : 'weekly',
        subscription_expires_at: data.expirationDate,
        subscription_transaction_id: data.transactionId,
      })
      .eq('id', data.userId)
    
    if (error) throw error
    */
  }

  private async acknowledgePurchase(purchaseToken: string): Promise<void> {
    try {
      await InAppPurchases.finishTransactionAsync(purchaseToken, true)
      console.log('Purchase acknowledged:', purchaseToken)
    } catch (error) {
      console.error('Failed to acknowledge purchase:', error)
    }
  }

  async disconnect(): Promise<void> {
    try {
      await InAppPurchases.disconnectAsync()
      this.isInitialized = false
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }
}

// Export singleton instance
export const subscriptionService = SubscriptionService.getInstance()

// Helper functions for easy use
export const initializeSubscriptions = () => subscriptionService.initialize()
export const getSubscriptionProducts = () => subscriptionService.getProducts()
export const purchaseSubscription = (productId: string) => subscriptionService.purchaseSubscription(productId)
export const restorePurchases = () => subscriptionService.restorePurchases()
export const checkSubscriptionStatus = () => subscriptionService.checkSubscriptionStatus()

// Mock service for development (when real store is not available)
export class MockSubscriptionService {
  private mockProducts: SubscriptionProduct[] = [
    {
      productId: SUBSCRIPTION_PRODUCTS.WEEKLY,
      price: '$4.99',
      priceAmountMicros: 4990000,
      priceCurrencyCode: 'USD',
      subscriptionPeriod: 'P1W',
      freeTrialPeriod: 'P3D', // 3 days
    },
    {
      productId: SUBSCRIPTION_PRODUCTS.ANNUAL,
      price: '$59.99',
      priceAmountMicros: 59990000,
      priceCurrencyCode: 'USD',
      subscriptionPeriod: 'P1Y',
      freeTrialPeriod: 'P7D', // 7 days
      introductoryPrice: '$0.00',
      introductoryPricePeriod: 'P7D',
    },
  ]

  async getProducts(): Promise<SubscriptionProduct[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    return this.mockProducts
  }

  async purchaseSubscription(productId: string): Promise<PurchaseResult> {
    // Simulate purchase process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return {
      success: true,
      transactionId: `mock_${Date.now()}`,
      receipt: `mock_receipt_${productId}`,
    }
  }

  async restorePurchases(): Promise<PurchaseResult> {
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Simulate no previous purchases
    return {
      success: false,
      error: 'No previous purchases found',
    }
  }

  async checkSubscriptionStatus(): Promise<{
    isActive: boolean
    productId?: string
    expirationDate?: Date
  }> {
    // For development, return mock active subscription
    return {
      isActive: false, // Change to true to test premium features
    }
  }
}

// Export mock service for development
export const mockSubscriptionService = new MockSubscriptionService()