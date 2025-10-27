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
  ScrollView,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PaywallPage() {
  const router = useRouter()
  const { colors } = useTheme()
  const { profile } = useAuth()
  const { 
    plans, 
    purchasePackage,
    restorePurchases,
    offerings,
    currentOffering,
    subscription 
  } = useSubscription()
  const [selectedPlan, setSelectedPlan] = useState('weekly')
  const [loading, setLoading] = useState(false)
  
  const styles = createStyles(colors)

  const handlePurchase = async () => {
    setLoading(true)
    try {
      // Find the package based on selected plan
      let packageId = selectedPlan
      if (currentOffering) {
        const packages = currentOffering.availablePackages
        const packageMap = {
          'weekly': packages.find(p => p.identifier === '$rc_weekly')?.identifier,
          'monthly': packages.find(p => p.identifier === '$rc_monthly')?.identifier,
          'yearly': packages.find(p => p.identifier === '$rc_annual')?.identifier,
        }
        packageId = packageMap[selectedPlan] || selectedPlan
      }

      const success = await purchasePackage(packageId)
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
    } catch (error: any) {
      console.error('Purchase error:', error)
      
      if (error?.message?.includes('cancelled') || error?.message?.includes('user_cancelled')) {
        console.log('User cancelled purchase')
      } else if (error?.message?.includes('network') || error?.message?.includes('connection')) {
        Alert.alert('Network Error', 'Please check your internet connection and try again.')
      } else {
        Alert.alert('Purchase Failed', 'Unable to complete purchase. Please try again or contact support.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    setLoading(true)
    try {
      const success = await restorePurchases()
      if (success) {
        Alert.alert('Success', 'Your purchases have been restored!')
        router.replace('/(tabs)')
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found for this account.')
      }
    } catch (error) {
      console.error('Restore error:', error)
      Alert.alert('Restore Failed', 'Unable to restore purchases. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  const openPrivacyPolicy = () => {
    Linking.openURL('https://your-privacy-policy-url.com')
  }

  const openTermsOfService = () => {
    Linking.openURL('https://your-terms-url.com')
  }

  const features = [
    'Unlimited notebooks for all languages',
    'AI-powered sentence generation',
    'Advanced learning analytics',
    'Cloud sync across all devices',
    'Unlimited vocabulary words'
  ]

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary + '20', colors.background]}
        style={styles.gradientBackground}
      >
        {/* Decorative Background Elements */}
        <View style={styles.decorativeContainer}>
          <View style={[styles.decorativeElement, styles.decorativeElement1, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="book-outline" size={20} color={colors.primary + '40'} />
          </View>
          <View style={[styles.decorativeElement, styles.decorativeElement2, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="bulb-outline" size={16} color={colors.primary + '30'} />
          </View>
          <View style={[styles.decorativeElement, styles.decorativeElement3, { backgroundColor: colors.primary + '12' }]}>
            <Ionicons name="trophy-outline" size={18} color={colors.primary + '35'} />
          </View>
        </View>

        <View style={styles.content}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Image 
                source={require('@/images/gold_list_icon.png')} 
                style={styles.appIcon}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Gold List Premium
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Unlock unlimited language learning
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={[styles.bulletPoint, { color: colors.primary }]}>•</Text>
                <Text style={[styles.featureText, { color: colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            <View style={styles.plansRow}>
              {plans.filter(plan => plan.id !== 'free').map((plan, index) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planItem,
                    { 
                      backgroundColor: colors.surface,
                      borderColor: selectedPlan === plan.id ? colors.primary : '#000000'
                    },
                    selectedPlan === plan.id && styles.selectedPlan // Selected plan is bigger
                  ]}
                  onPress={() => setSelectedPlan(plan.id)}
                >
                  {index === 1 && (
                    <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.popularText} numberOfLines={1}>POPULAR</Text>
                    </View>
                  )}
                  <Text style={[styles.planDuration, { color: colors.textSecondary }]}>
                    {plan.name}
                  </Text>
                  <Text style={[styles.planPrice, { color: colors.text }]}>
                    {plan.price}
                  </Text>
                  <Text style={[styles.planSubtext, { color: colors.textSecondary }]}>
                    {plan.duration}
                  </Text>
                  {plan.savings && (
                    <Text style={[styles.savingsText, { color: colors.success }]}>
                      {plan.savings}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Primary Action Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handlePurchase}
              disabled={loading}
            >
              <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                {loading ? 'Processing...' : `Start Premium - ${plans.find(p => p.id === selectedPlan)?.price || '$4.99'}`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Legal Links */}
          <View style={styles.legalContainer}>
            <TouchableOpacity onPress={openTermsOfService}>
              <Text style={[styles.legalText, { color: colors.textSecondary }]}>
                Terms of Use
              </Text>
            </TouchableOpacity>
            <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}> • </Text>
            <TouchableOpacity onPress={handleRestore} disabled={loading}>
              <Text style={[styles.legalText, { color: colors.textSecondary }]}>
                Restore Purchase
              </Text>
            </TouchableOpacity>
            <Text style={[styles.legalSeparator, { color: colors.textSecondary }]}> • </Text>
            <TouchableOpacity onPress={openPrivacyPolicy}>
              <Text style={[styles.legalText, { color: colors.textSecondary }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appIcon: {
    width: 70,
    height: 70,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresContainer: {
    marginVertical: 30,
    alignItems: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    lineHeight: 22,
  },
  plansContainer: {
    marginVertical: 20,
  },
  plansRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 8,
  },
  planItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },
  selectedPlan: {
    transform: [{ scale: 1.1 }],
    borderWidth: 3,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    paddingHorizontal: 24,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  planDuration: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  planSubtext: {
    fontSize: 11,
    textAlign: 'center',
  },
  actionContainer: {
    marginVertical: 30,
  },
  primaryButton: {
    paddingVertical: 18,
    borderRadius: 25,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButtonText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  decorativeElement: {
    position: 'absolute',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorativeElement1: {
    width: 50,
    height: 50,
    top: 60,
    right: 30,
  },
  decorativeElement2: {
    width: 40,
    height: 40,
    top: 180,
    left: 20,
  },
  decorativeElement3: {
    width: 45,
    height: 45,
    bottom: 120,
    right: 40,
  },
  legalContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
    flexWrap: 'wrap',
  },
  legalText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 14,
  },
})