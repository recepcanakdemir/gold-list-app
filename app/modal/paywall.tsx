import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useAuth } from '@/lib/contexts/AuthContext'

interface SubscriptionPlan {
  id: string
  name: string
  price: string
  period: string
  originalPrice?: string
  savings?: string
  popular?: boolean
  features: string[]
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: '$4.99',
    period: 'per week',
    features: [
      'Full access to Gold List Method',
      'Create unlimited notebooks',
      'Track your progress',
      'Cloud sync across devices'
    ]
  },
  {
    id: 'annual',
    name: 'Annual',
    price: '$39.99',
    period: 'per year',
    originalPrice: '$259.48',
    savings: 'Save 84%',
    popular: true,
    features: [
      'Everything in Weekly',
      'Best value option',
      '2 months free',
      'Support app development'
    ]
  }
]

const appFeatures = [
  {
    icon: '🎯',
    title: 'Gold List Method',
    description: 'Scientifically proven spaced repetition system for permanent vocabulary retention'
  },
  {
    icon: '📚',
    title: 'Multiple Languages',
    description: 'Learn vocabulary in any language with customizable notebooks'
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    description: 'Monitor your learning journey with detailed analytics and statistics'
  },
  {
    icon: '☁️',
    title: 'Cloud Sync',
    description: 'Access your vocabulary across all devices with automatic backup'
  },
  {
    icon: '🎨',
    title: 'Custom Themes',
    description: 'Personalize your learning experience with beautiful themes'
  },
  {
    icon: '🔄',
    title: 'Offline Mode',
    description: 'Practice and review without internet connection'
  },
  {
    icon: '⚡',
    title: 'Priority Support',
    description: 'Get help faster with dedicated premium support'
  },
  {
    icon: '🚀',
    title: 'Early Access',
    description: 'Be first to try new features and improvements'
  }
]

export default function PaywallModal() {
  const router = useRouter()
  const { source } = useLocalSearchParams<{ source?: string }>()
  const { profile } = useAuth()
  
  const [selectedPlan, setSelectedPlan] = useState(subscriptionPlans[1].id) // Default to annual
  const [loading, setLoading] = useState(false)
  const [trialAvailable, setTrialAvailable] = useState(true)

  useEffect(() => {
    // Check if user has already used free trial
    checkTrialStatus()
  }, [])

  const checkTrialStatus = async () => {
    // In real implementation, check with backend/store
    // For now, simulate based on user creation date
    const accountAge = profile?.created_at ? 
      Date.now() - new Date(profile.created_at).getTime() : 0
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24)
    
    setTrialAvailable(daysSinceCreation < 1) // Trial available for first day
  }

  const handleSubscribe = async (planId: string) => {
    setLoading(true)
    
    try {
      // In real implementation, integrate with:
      // - React Native In-App Purchases (expo-in-app-purchases)
      // - RevenueCat for subscription management
      // - App Store Connect / Google Play Console
      
      // Simulate purchase process
      await simulatePurchase(planId)
      
      Alert.alert(
        'Welcome to Premium! 🎉',
        'Your subscription is now active. Enjoy unlimited access to all features!',
        [
          {
            text: 'Get Started',
            onPress: () => router.back()
          }
        ]
      )
    } catch (error) {
      Alert.alert(
        'Purchase Failed',
        'Something went wrong. Please try again or contact support.',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  const simulatePurchase = async (planId: string): Promise<void> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // In real implementation:
    // 1. Validate purchase with App Store/Google Play
    // 2. Update user subscription in backend
    // 3. Sync with RevenueCat or similar service
    // 4. Update local user profile
    
    console.log(`Simulated purchase for plan: ${planId}`)
  }

  const handleStartTrial = async () => {
    if (!trialAvailable) {
      Alert.alert('Trial Not Available', 'Free trial is only available for new users.')
      return
    }

    setLoading(true)
    
    try {
      // Start 7-day free trial
      await simulatePurchase('trial')
      
      Alert.alert(
        'Trial Started! 🚀',
        'Enjoy 7 days of premium features. You can cancel anytime.',
        [
          {
            text: 'Start Learning',
            onPress: () => router.back()
          }
        ]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to start trial. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    setLoading(true)
    
    try {
      // In real implementation, restore purchases from App Store/Google Play
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      Alert.alert(
        'No Purchases Found',
        'We couldn\'t find any previous purchases for this account.',
        [{ text: 'OK' }]
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases.')
    } finally {
      setLoading(false)
    }
  }

  const getCtaText = () => {
    if (loading) return 'Processing...'
    if (selectedPlan === 'annual') return trialAvailable ? 'Start Free Trial' : 'Subscribe Now'
    return 'Subscribe Now'
  }

  const selectedPlanData = subscriptionPlans.find(plan => plan.id === selectedPlan)

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.closeButton}>×</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upgrade to Premium</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Hero Section */}
          <View style={styles.hero}>
            <Text style={styles.heroIcon}>🏆</Text>
            <Text style={styles.heroTitle}>
              Unlock Your Full{'\n'}Learning Potential
            </Text>
            <Text style={styles.heroSubtitle}>
              Master vocabulary faster with advanced features designed for serious learners
            </Text>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What's Included</Text>
            <View style={styles.featuresGrid}>
              {appFeatures.map((feature, index) => (
                <View key={index} style={styles.featureCard}>
                  <Text style={styles.featureIcon}>{feature.icon}</Text>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Plans Section */}
          <View style={styles.plansSection}>
            <Text style={styles.plansTitle}>Choose Your Plan</Text>
            
            <View style={styles.plans}>
              {subscriptionPlans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    selectedPlan === plan.id && styles.planCardSelected,
                    plan.popular && styles.planCardPopular
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Most Popular</Text>
                    </View>
                  )}
                  
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.savings && (
                      <Text style={styles.planSavings}>{plan.savings}</Text>
                    )}
                  </View>
                  
                  <View style={styles.planPricing}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                    {plan.originalPrice && (
                      <Text style={styles.planOriginalPrice}>{plan.originalPrice}</Text>
                    )}
                  </View>
                  
                  <View style={styles.planFeatures}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.planFeature}>
                        <Text style={styles.planFeatureIcon}>✓</Text>
                        <Text style={styles.planFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <TouchableOpacity
              style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
              onPress={() => selectedPlan === 'annual' && trialAvailable ? handleStartTrial() : handleSubscribe(selectedPlan)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaButtonText}>{getCtaText()}</Text>
                  {selectedPlan === 'annual' && trialAvailable && (
                    <Text style={styles.ctaButtonSubtext}>
                      7 days free, then {selectedPlanData?.price} {selectedPlanData?.period}
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>

            {trialAvailable && selectedPlan !== 'annual' && (
              <TouchableOpacity
                style={styles.trialButton}
                onPress={handleStartTrial}
                disabled={loading}
              >
                <Text style={styles.trialButtonText}>
                  Or start 7-day free trial
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleRestore} disabled={loading}>
              <Text style={styles.footerLink}>Restore Purchases</Text>
            </TouchableOpacity>
            
            <Text style={styles.footerText}>
              Subscriptions auto-renew unless cancelled 24 hours before the current period ends. 
              Manage in App Store settings.
            </Text>
            
            <View style={styles.footerLinks}>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.footerSeparator}>•</Text>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  closeButton: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 'bold',
    width: 40,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresSection: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featureCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  plansSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  plansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  plans: {
    gap: 12,
  },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  planCardPopular: {
    borderColor: '#fbbf24',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: '#fbbf24',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  planSavings: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#059669',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  planPricing: {
    marginBottom: 16,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  planPeriod: {
    fontSize: 14,
    color: '#666',
  },
  planOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  planFeatures: {
    gap: 8,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planFeatureIcon: {
    fontSize: 12,
    color: '#059669',
    marginRight: 8,
    fontWeight: 'bold',
  },
  planFeatureText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  ctaSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  ctaButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  ctaButtonSubtext: {
    fontSize: 12,
    color: '#667eea',
    marginTop: 4,
  },
  trialButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  trialButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginHorizontal: 8,
  },
})