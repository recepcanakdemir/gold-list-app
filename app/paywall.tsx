import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { TYPOGRAPHY, SPACING, RADIUS } from '@/lib/constants/design'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

export default function PaywallPage() {
  const router = useRouter()
  const { colors } = useTheme()
  const { plans, activateSubscription, startFreeTrial, getUserState, canExitPaywall } = useSubscription()
  const [selectedPlan, setSelectedPlan] = useState(plans[1]?.id || 'monthly') // Default to monthly
  const [loading, setLoading] = useState(false)
  const [trialLoading, setTrialLoading] = useState(false)

  const userState = getUserState()
  const isExitable = canExitPaywall()

  const styles = createStyles(colors)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const success = await activateSubscription(selectedPlan as any)
      if (success) {
        Alert.alert(
          'Welcome to Premium!',
          'Your subscription has been activated. You now have unlimited access to all features.',
          [{ text: 'Start Learning', onPress: () => router.replace('/(tabs)') }]
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
        Alert.alert(
          '🎉 Trial Started!',
          'You now have 15 days of full access to all premium features. Start learning with unlimited vocabulary!',
          [{ text: 'Start Learning', onPress: () => router.replace('/(tabs)') }]
        )
      } else {
        Alert.alert('Error', 'Failed to start trial. Please try again.')
      }
    } catch (error) {
      console.error('Trial start error:', error)
      Alert.alert('Error', 'An error occurred. Please try again.')
    } finally {
      setTrialLoading(false)
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        {isExitable ? (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonPlaceholder} />
        )}
        <View style={styles.headerSpacer} />
        <TouchableOpacity onPress={handleRestore}>
          <Text style={styles.restoreButton}>Restore</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content - Fixed Layout */}
      <View style={styles.mainContent}>
        {/* Hero Section - App Branding */}
        <View style={styles.heroSection}>
          <Text style={styles.appIcon}>📚</Text>
          <Text style={styles.heroTitle}>Gold List Premium</Text>
          <Text style={styles.heroSubtitle}>Unlock your language learning potential</Text>
        </View>

        {/* Features List - Compact */}
        <View style={styles.featuresSection}>
          {[
            { icon: '📚', title: 'Unlimited Notebooks' },
            { icon: '📄', title: 'Unlimited Pages & Words' },
            { icon: '🤖', title: 'AI Sentence Generation' },
            { icon: '📊', title: 'Advanced Analytics' },
            { icon: '☁️', title: 'Cloud Sync' },
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureTitle}>{feature.title}</Text>
            </View>
          ))}
        </View>

        {/* Subscription Plans - 3 Plans */}
        <View style={styles.plansSection}>
          {plans.map((plan) => {
            const isPopular = plan.id === 'monthly'
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                  isPopular && styles.planCardPopular
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}
                <View style={styles.planContent}>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planTitle, selectedPlan === plan.id && styles.planTitleSelected]}>
                      {plan.name}
                    </Text>
                    <Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceSelected]}>
                      {plan.price}
                    </Text>
                  </View>
                  {plan.savings && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>{plan.savings}</Text>
                    </View>
                  )}
                  <View style={[styles.radioButton, selectedPlan === plan.id && styles.radioButtonSelected]} />
                </View>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* CTA Section - Compact */}
        <View style={styles.ctaSection}>
          {/* Show trial button only for pre-trial users */}
          {userState === 'pre-trial' && (
            <TouchableOpacity
              style={[styles.trialButton, trialLoading && styles.trialButtonDisabled]}
              onPress={handleStartTrial}
              disabled={trialLoading}
            >
              <Text style={styles.trialButtonText}>
                {trialLoading ? 'Starting Trial...' : 'TRY IT FOR FREE'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={loading}
          >
            <Text style={styles.purchaseButtonText}>
              {loading ? 'Processing...' : `Start ${plans.find(p => p.id === selectedPlan)?.name} Plan`}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.disclaimerText}>
            Auto-Renewable. Cancel anytime.
          </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    height: 60,
  },
  backButton: {
    padding: SPACING.xs,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerSpacer: {
    flex: 1,
  },
  restoreButton: {
    fontSize: TYPOGRAPHY.base,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.medium,
  },
  
  // Main Content Layout
  mainContent: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'space-between',
  },
  
  // Hero Section - 15%
  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    flex: 0.15,
    justifyContent: 'center',
  },
  appIcon: {
    fontSize: 48,
    marginBottom: SPACING.xs,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  
  // Features Section - 25%
  featuresSection: {
    flex: 0.25,
    justifyContent: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: SPACING.md,
    width: 24,
  },
  featureTitle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },
  
  // Plans Section - 35%
  plansSection: {
    flex: 0.35,
    justifyContent: 'center',
  },
  planCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight || colors.cardBackground,
  },
  planCardPopular: {
    borderColor: colors.primary,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  popularText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  planTitleSelected: {
    color: colors.primary,
  },
  planPrice: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planPriceSelected: {
    color: colors.primary,
  },
  savingsBadge: {
    backgroundColor: colors.success || colors.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginHorizontal: SPACING.md,
  },
  savingsText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.white,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  
  // CTA Section - 25%
  ctaSection: {
    flex: 0.25,
    justifyContent: 'center',
    paddingBottom: SPACING.lg,
  },
  trialButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  trialButtonDisabled: {
    opacity: 0.6,
  },
  trialButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
  },
  purchaseButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.white,
  },
  disclaimerText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
})
