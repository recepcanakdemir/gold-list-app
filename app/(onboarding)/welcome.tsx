import { OnboardingScreen } from '@/components/OnboardingScreen'
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/constants/design'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated'

export default function WelcomeScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { signInWithApple, profile } = useAuth()
  const [isRouting, setIsRouting] = useState(false)
  
  // Animation values
  const logoScale = useSharedValue(0)
  const logoOpacity = useSharedValue(0)
  const contentOpacity = useSharedValue(0)
  const contentTranslateY = useSharedValue(30)

  // Start animations when component mounts
  useEffect(() => {
    // Logo entrance animation with bounce
    logoScale.value = withDelay(
      300,
      withSpring(1, { 
        damping: 8, 
        stiffness: 100,
        mass: 1.2
      })
    )
    
    logoOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 800 })
    )
    
    // Content fade-in and slide-up animation
    contentOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 600 })
    )
    
    contentTranslateY.value = withDelay(
      900,
      withSpring(0, { 
        damping: 12, 
        stiffness: 100,
        mass: 1
      })
    )
  }, [])

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }))

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }))

  // Simplified authentication success handler - React state will handle routing
  const handleAuthSuccess = async () => {
    console.log('🎯 Welcome: Authentication successful, waiting for profile to load...')
    // No complex polling - let useEffect handle routing when profile is ready
  }

  // React state synchronization - handle routing when profile becomes available
  useEffect(() => {
    // Only route if we have a profile and we're not already routing
    if (profile && profile.id && !isRouting) {
      const onboardingCompleted = profile.onboarding_completed
      
      console.log(`🎯 Welcome: Profile loaded via useEffect - onboarding: ${onboardingCompleted}`)
      
      setIsRouting(true)
      
      // Make routing decision based on onboarding completion
      if (onboardingCompleted === true) {
        console.log('🎯 Welcome: User completed onboarding, navigating to main app')
        router.replace('/(tabs)')
      } else if (onboardingCompleted === false) {
        console.log('🎯 Welcome: User needs onboarding, navigating to learn-science')
        router.replace('/(onboarding)/learn-science')
      } else {
        // If onboarding status is undefined/null, default to main app for existing users
        console.log('🎯 Welcome: Onboarding status unclear, defaulting to main app')
        router.replace('/(tabs)')
      }
    }
  }, [profile, isRouting, router])

  // Apple Sign In handler
  const handleAppleSignIn = async () => {
    if (isRouting) {
      console.log('🎯 Welcome: Already processing authentication, ignoring')
      return
    }
    
    try {
      console.log('🎯 Welcome: Starting Apple sign-in')
      await signInWithApple()
      await handleAuthSuccess()
    } catch (error: any) {
      console.error('🎯 Welcome: Apple sign-in failed:', error)
      setIsRouting(false) // Reset routing state on error
    }
  }

  // Email sign in navigation
  const handleEmailSignIn = () => {
    if (isRouting) {
      console.log('🎯 Welcome: Already routing, ignoring email sign-in')
      return
    }
    console.log('🎯 Welcome: Navigating to email sign-in')
    router.push('/(auth)/signin')
  }


  return (
    <OnboardingScreen
      currentStep={1}
      totalSteps={24}
      headline="Welcome to Gold List"
      showBack={false}
      showSkip={false}
      showProgress={false}
      showPrimaryButton={false}
      bottomContent={
        <View style={styles.authSection}>
          {/* Apple Sign In */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={RADIUS.lg}
              style={[styles.appleButton, isRouting && styles.disabledButton]}
              onPress={handleAppleSignIn}
            />
          )}
          
          {/* Email Sign In */}
          <TouchableOpacity 
            style={[styles.emailButton, isRouting && styles.disabledButton]} 
            onPress={handleEmailSignIn}
            disabled={isRouting}
          >
            <Text style={[styles.emailButtonText, { color: isRouting ? colors.textSecondary : colors.primary }]}>
              {isRouting ? "Loading..." : "Sign in with Email"}
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.logoContainer}>
        <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
          <Image 
            source={require('@/images/gold_list_icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        
        <Animated.View style={[styles.contentWrapper, contentAnimatedStyle]}>
          <View style={styles.celebrationSection}>
            <Text style={[styles.celebrationTitle, { color: colors.textPrimary }]}>
              🎉 Master Vocabulary Naturally
            </Text>
            <Text style={[styles.celebrationSubtext, { color: colors.textSecondary }]}>
              
              Transform your language learning with spaced repetition that works with your brain's natural memory.
            </Text>
          </View>
        </Animated.View>
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: SPACING.lg,
  },
  logoWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: SPACING.xl,
  },
  logo: {
    width: 200,
    height: 200,
  },
  contentWrapper: {
    width: '100%',
    paddingHorizontal: SPACING.md,
  },
  celebrationSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.lg,
  },
  celebrationTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  celebrationSubtext: {
    fontSize: TYPOGRAPHY.base,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  achievementBadges: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: SPACING.sm,
  },
  badge: {
    alignItems: 'center',
    flex: 1,
    gap: SPACING.xs,
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  authSection: {
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  appleButton: {
    height: 48,
  },
  emailButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emailButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.sm,
    gap: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
})