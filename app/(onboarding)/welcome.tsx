import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

const { width, height } = Dimensions.get('window')

export default function WelcomeScreen() {
  const router = useRouter()

  const handleContinueWithApple = () => {
    // In real app, implement Apple Sign In
    console.log('Continue with Apple')
  }

  const handleContinueWithGoogle = () => {
    // In real app, implement Google Sign In
    console.log('Continue with Google')
  }

  const handleSignUpWithEmail = () => {
    router.push('/(auth)/signup')
  }

  const handleSignIn = () => {
    router.push('/(auth)/signin')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Gold List</Text>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.headline}>
            Learn new words,{'\n'}
            remember them{'\n'}
            forever
          </Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.authSection}>
          <TouchableOpacity 
            style={styles.appleButton}
            onPress={handleContinueWithApple}
          >
            <Text style={styles.appleIcon}>🍎</Text>
            <Text style={styles.appleButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.googleButton}
            onPress={handleContinueWithGoogle}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.emailButton}
            onPress={handleSignUpWithEmail}
          >
            <Text style={styles.emailIcon}>✉️</Text>
            <Text style={styles.emailButtonText}>Sign up with email</Text>
          </TouchableOpacity>

          <View style={styles.signInSection}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our{' '}
            <Text style={styles.footerLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.footerLink}>Privacy Policy</Text>
            .
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING['2xl'],
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING['6xl'],
    marginBottom: SPACING['6xl'],
  },
  title: {
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.primary,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING['4xl'],
  },
  headline: {
    fontSize: TYPOGRAPHY['4xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY['4xl'] * 1.2,
  },
  authSection: {
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  appleIcon: {
    fontSize: TYPOGRAPHY.lg,
  },
  appleButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.medium,
    color: COLORS.textPrimary,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  googleIcon: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: '#4285F4',
    backgroundColor: 'transparent',
    width: 20,
    height: 20,
    textAlign: 'center',
    borderRadius: 10,
  },
  googleButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.medium,
    color: COLORS.textPrimary,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  emailIcon: {
    fontSize: TYPOGRAPHY.lg,
  },
  emailButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.cardBackground,
  },
  signInSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  signInText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
  },
  signInLink: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.primary,
  },
  footer: {
    paddingBottom: SPACING['2xl'],
  },
  footerText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.sm * 1.4,
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.medium,
  },
})