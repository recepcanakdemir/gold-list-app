import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PaywallPage() {
  const router = useRouter()
  const { colors } = useTheme()
  const { profile } = useAuth()
  const { plans, activateSubscription, startFreeTrial, getUserState, canExitPaywall, subscription } = useSubscription()
  const [selectedPlan, setSelectedPlan] = useState('weekly') // Default to weekly since trial is enabled by default
  const [loading, setLoading] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)
  
  const userState = getUserState()
  const isExitable = canExitPaywall()
  
  // Only pre-trial users should see and be able to use free trial
  const canUseTrial = userState === 'pre-trial'
  const [enableFreeTrial, setEnableFreeTrial] = useState(canUseTrial)

  const styles = createStyles(colors)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const success = await activateSubscription(selectedPlan as any)
      if (success) {
        const redirectTarget = profile?.onboarding_completed ? '/(tabs)' : '/(onboarding)/completion'
        Alert.alert(
          'Welcome to Premium!',
          'Your subscription has been activated. You now have unlimited access to all features.',
          [{ text: 'Start Learning', onPress: () => router.replace(redirectTarget) }]
        )
      } else {
        Alert.alert('Error', 'Failed to activate subscription. Please try again.')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      Alert.alert('Error', 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTrial = async () => {
    setTrialLoading(true)
    try {
      const success = await startFreeTrial()
      if (success) {
        const redirectTarget = profile?.onboarding_completed ? '/(tabs)' : '/(onboarding)/completion'
        Alert.alert(
          '🎉 Trial Started!',
          'You now have 14 days of full access to all premium features. Start learning with unlimited vocabulary!',
          [{ text: 'Start Learning', onPress: () => router.replace(redirectTarget) }]
        )
        // Keep trialLoading true until navigation - prevents X button from reappearing
      } else {
        Alert.alert('Error', 'Failed to start trial. Please try again.')
        setTrialLoading(false) // Only reset on failure
      }
    } catch (error) {
      console.error('Trial start error:', error)
      Alert.alert('Error', 'An error occurred. Please try again.')
      setTrialLoading(false) // Only reset on error
    }
  }


  const handleBack = () => {
    // Only allow back navigation if paywall is exitable
    if (isExitable) {
      if (router.canGoBack()) {
        router.back()
      } else {
        router.replace('/(tabs)/dashboard')
      }
    } else {
      // For pre-trial users, show alert explaining they need to start trial
      Alert.alert(
        'Welcome to Gold List!',
        'To get started, please begin your free trial or subscribe to premium.',
        [{ text: 'OK' }]
      )
    }
  }

  const handleRestore = () => {
    // Mock restore functionality
    Alert.alert('Restore Purchases', 'No previous purchases found to restore.')
  }

  const handleTermsPress = () => {
    Linking.openURL('https://goldlistmethod.app/terms')
  }

  const handlePrivacyPress = () => {
    Linking.openURL('https://goldlistmethod.app/privacy')
  }

  const getCurrentPlan = () => plans.find(p => p.id === selectedPlan)

  // Handle toggle changes (only for pre-trial users)
  const handleTrialToggle = (enabled: boolean) => {
    // Only allow toggle changes for pre-trial users
    if (!canUseTrial) return
    
    setEnableFreeTrial(enabled)
    if (enabled) {
      // Auto-select weekly plan when trial is enabled
      setSelectedPlan('weekly')
    }
    // Don't change plan when disabling toggle - let user keep their selection
  }

  // Handle plan selection
  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId)
    // If toggle is enabled and user selects non-weekly plan, disable toggle
    if (enableFreeTrial && planId !== 'weekly') {
      setEnableFreeTrial(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        {/* Compact Header */}
        <View style={styles.header}>
          {isExitable && !trialLoading && !loading && (
            <TouchableOpacity style={styles.closeButton} onPress={handleBack}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <Ionicons name="trophy" size={24} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Gold List Premium</Text>
            <Text style={styles.heroSubtitle}>Unlock unlimited vocabulary learning</Text>
          </View>
        </View>

        {/* Features Grid - Compact 2x3 */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureItem}>
            <Ionicons name="infinite" size={16} color={colors.primary} />
            <Text style={styles.featureText}>Unlimited Notebooks</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="bulb-outline" size={16} color={colors.primary} />
            <Text style={styles.featureText}>AI Examples</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="analytics-outline" size={16} color={colors.primary} />
            <Text style={styles.featureText}>Analytics</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="cloud-outline" size={16} color={colors.primary} />
            <Text style={styles.featureText}>Cloud Sync</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.featureText}>Spaced Repetition</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
            <Text style={styles.featureText}>Progress Tracking</Text>
          </View>
        </View>

        {/* Compact Pricing Plans */}
        <View style={styles.pricingSection}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          
          <View style={styles.plansContainer}>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id
              const isPopular = plan.id === 'monthly'
              
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planCard,
                    isSelected && styles.planCardSelected
                  ]}
                  onPress={() => handlePlanSelection(plan.id)}
                >
                  {isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>POPULAR</Text>
                    </View>
                  )}
                  
                  <View style={styles.planContent}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planDuration}>{plan.duration}</Text>
                    {plan.savings && (
                      <Text style={styles.planSavings}>{plan.savings}</Text>
                    )}
                  </View>
                  
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Auto-renewable Notice */}
        <View style={styles.autoRenewableNotice}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.autoRenewableText}>Auto-renewable until canceled</Text>
        </View>

        {/* Free Trial Toggle - Only show for pre-trial users */}
        {canUseTrial && (
          <View style={styles.trialToggleSection}>
          <TouchableOpacity 
            style={styles.toggleContainer}
            onPress={() => handleTrialToggle(!enableFreeTrial)}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleTitle}>Enable 14-day free trial</Text>
              <Text style={styles.toggleSubtitle}>
                {enableFreeTrial ? 'Selecting weekly plan for trial access' : 'Choose any plan for direct subscription'}
              </Text>
            </View>
            <View style={[styles.toggle, enableFreeTrial && styles.toggleActive]}>
              <View style={[styles.toggleDot, enableFreeTrial && styles.toggleDotActive]} />
            </View>
          </TouchableOpacity>
          
          {/* Trial-specific information when toggle is enabled */}
          {enableFreeTrial && (
            <View style={styles.trialInfo}>
              <View style={styles.trialInfoRow}>
                <Ionicons name="warning-outline" size={14} color={colors.primary} />
                <Text style={styles.trialInfoText}>You can only create 1 notebook in free trial</Text>
              </View>
              <View style={styles.trialInfoRow}>
                <Ionicons name="time-outline" size={14} color={colors.primary} />
                <Text style={styles.trialInfoText}>14 days free then {plans.find(p => p.id === 'weekly')?.price || '$4.99'} per week</Text>
              </View>
            </View>
          )}
          </View>
        )}

        {/* User State Information - Show for non-pre-trial users */}
        {!canUseTrial && (
          <View style={styles.userStateInfo}>
            <View style={styles.userStateContainer}>
              <Ionicons 
                name={
                  userState === 'trial' ? 'time-outline' : 
                  userState === 'post-trial' ? 'checkmark-circle-outline' : 
                  'diamond-outline'
                } 
                size={16} 
                color={colors.primary} 
              />
              <Text style={styles.userStateText}>
                {userState === 'trial' && `Trial Active (${subscription.trialDaysRemaining} days remaining)`}
                {userState === 'post-trial' && 'Trial completed - Upgrade to continue learning'}
                {userState === 'premium' && `Premium Active (${subscription.tier})`}
              </Text>
            </View>
          </View>
        )}

        {/* Compact CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, (loading || trialLoading) && styles.ctaButtonDisabled]}
          onPress={
            (userState === 'pre-trial' && enableFreeTrial) ? 
              handleStartTrial : 
              handlePurchase
          }
          disabled={loading || trialLoading}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + 'DD']}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>
              {loading || trialLoading ? 'Starting...' : 
                (userState === 'pre-trial' && enableFreeTrial) ? 
                  'Start 14-Day Free Trial' : 
                  `Subscribe ${getCurrentPlan()?.name}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Trial Banner only when trial is enabled for pre-trial users */}
        {userState === 'pre-trial' && enableFreeTrial && (
          <Text style={styles.trialNote}>
            Free trial • Cancel anytime • No commitment
          </Text>
        )}

        {/* Compact Footer */}
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={handleRestore}>
              <Text style={styles.restoreText}>Restore</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTermsPress}>
              <Text style={styles.legalLink}>Terms</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePrivacyPress}>
              <Text style={styles.legalLink}>Privacy</Text>
            </TouchableOpacity>
          </View>
        </View>
        
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },

  // Compact Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 6,
    marginBottom: 8,
  },
  heroSection: {
    alignItems: 'center',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Features Grid - 2x3 compact layout
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
    flex: 1,
  },

  // Trial Toggle Section
  trialToggleSection: {
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  trialInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  trialInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trialInfoText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },

  // Auto-renewable Notice
  autoRenewableNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
  },
  autoRenewableText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },

  // Pricing Section
  pricingSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  plansContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  planCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    aspectRatio: 1,
    minHeight: 100,
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  popularBadge: {
    position: 'absolute',
    top: -6,
    left: 8,
    right: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignItems: 'center',
  },
  popularBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  planContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  planDuration: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  planSavings: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B35',
    marginTop: 4,
    textAlign: 'center',
    backgroundColor: '#FF6B35' + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // CTA Button
  ctaButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.7,
  },
  ctaGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  trialNote: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 12,
  },

  // Compact Footer
  footer: {
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  restoreText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  legalLink: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // User State Information Section
  userStateInfo: {
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userStateText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
})
