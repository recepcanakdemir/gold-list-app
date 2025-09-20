import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithGoogle, signInWithApple } = useAuth()
  const { colors } = useTheme()
  const styles = createStyles(colors)

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password)
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An error occurred')
    }
  }

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple()
    } catch (error: any) {
      Alert.alert('Sign In Failed', error.message || 'An error occurred')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Continue your vocabulary journey with the Gold List Method
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.linkButton}>
                <Text style={styles.linkText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Social Sign In */}
          <View style={styles.socialContainer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
              <Text style={styles.socialButtonText}>🍎 Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
              <Text style={styles.socialButtonText}>🔍 Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['4xl'],
    paddingBottom: SPACING['2xl'],
  },
  header: {
    marginBottom: SPACING['3xl'],
  },
  title: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    marginBottom: SPACING['2xl'],
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    fontSize: TYPOGRAPHY.base,
    backgroundColor: colors.cardBackground,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xs,
    ...SHADOWS.sm,
  },
  disabledButton: {
    backgroundColor: colors.gray400,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  linkText: {
    color: colors.primary,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  socialContainer: {
    marginBottom: SPACING['2xl'],
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
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
  socialButton: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: colors.cardBackground,
    ...SHADOWS.sm,
  },
  socialButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
})