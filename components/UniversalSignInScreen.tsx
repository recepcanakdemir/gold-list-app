import React, { useEffect, useRef, useCallback } from 'react'
import { View, StyleSheet, Text, Platform, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/constants/design'
import * as AppleAuthentication from 'expo-apple-authentication'

interface SignInScreenProps {
  stepNumber?: number
  customHeadline?: string
  customSubtext?: string
  showSkip?: boolean
  onSuccess?: () => void
}

export function UniversalSignInScreen({ 
  stepNumber = 25, 
  customHeadline, 
  customSubtext, 
  showSkip = true,
  onSuccess 
}: SignInScreenProps) {
  const router = useRouter()
  const { colors } = useTheme()
  const { user, signInWithApple } = useAuth()
  const styles = createStyles(colors)
  const hasCalledSuccess = useRef(false)
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced success caller to prevent multiple calls
  const callOnSuccess = useCallback(() => {
    if (hasCalledSuccess.current || !onSuccess) {
      console.log('🔐 UniversalSignIn: Success already called or no callback, skipping')
      return
    }
    
    // Clear any existing timeout
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current)
    }
    
    // Set timeout to call success after a brief delay (to allow state to settle)
    successTimeoutRef.current = setTimeout(() => {
      if (!hasCalledSuccess.current && onSuccess) {
        hasCalledSuccess.current = true
        console.log('🔐 UniversalSignIn: Calling onSuccess callback')
        onSuccess()
      }
    }, 100) // Small delay to prevent rapid-fire calls
  }, [onSuccess])

  // Auto-skip if user is already authenticated (for save-journey page)
  useEffect(() => {
    if (user && onSuccess && !hasCalledSuccess.current) {
      console.log('🔐 UniversalSignIn: User authenticated, calling success')
      callOnSuccess()
    }
  }, [user, onSuccess, callOnSuccess])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current)
      }
    }
  }, [])

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple()
      // If onSuccess callback provided (save-journey), it will be called via useEffect
      // Otherwise, let AuthGuard handle the routing
    } catch (error: any) {
      console.error('Apple sign in failed:', error)
    }
  }

  const handleEmailSignIn = () => {
    router.push('/(auth)/signin')
  }

  const handleAlreadyAccount = () => {
    router.push('/(auth)/signin')
  }

  const handleContinue = () => {
    if (user && onSuccess) {
      console.log('🔐 UniversalSignIn: Continue pressed, calling success')
      callOnSuccess()
    } else {
      router.push('/(auth)/signin')
    }
  }

  // Determine content based on context
  const headline = customHeadline || "Sign in or create your account."
  const subtext = customSubtext
  const primaryButtonText = stepNumber === 25 && user ? "Continue" : 
                           stepNumber === 25 ? "Sign In / Continue with Email" :
                           "Continue with Email"
  const primaryAction = stepNumber === 25 ? handleContinue : handleEmailSignIn

  return (
    <OnboardingScreen
      currentStep={stepNumber}
      totalSteps={26}
      headline={headline}
      subtext={subtext}
      primaryButtonText={primaryButtonText}
      onPrimaryPress={primaryAction}
      secondaryButtonText={stepNumber !== 25 ? "Already have an account? Log in" : undefined}
      onSecondaryPress={stepNumber !== 25 ? handleAlreadyAccount : undefined}
      showSkip={showSkip}
      bottomContent={
        (!user || stepNumber !== 25) && Platform.OS === 'ios' && (
          <View style={styles.appleSection}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={RADIUS.lg}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        )
      }
    >
      {/* Sign-in Image */}
      <View style={styles.imageContainer}>
        <Image 
          source={require('@/images/sign_in_image.png')}
          style={styles.signInImage}
          resizeMode="contain"
        />
      </View>
    </OnboardingScreen>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  appleSection: {
    paddingVertical: SPACING.sm,
  },
  appleButton: {
    height: 56,
    marginBottom: SPACING.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: SPACING.lg,
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  signInImage: {
    width: '100%',
    height: 200,
    maxWidth: 300,
  },
})