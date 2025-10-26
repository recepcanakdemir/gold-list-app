import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native'
import { useRouter, useSegments } from 'expo-router'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS } from '@/lib/constants/design'
import { getRouteFromSegments, getPreviousStep, getSkipTarget, canSkip as canSkipStep } from '@/lib/utils/onboardingFlow'

interface OnboardingScreenProps {
  currentStep: number
  totalSteps: number
  headline: string
  subtext?: string
  mainText?: string
  children?: React.ReactNode
  bottomContent?: React.ReactNode
  primaryButtonText?: string
  onPrimaryPress?: () => void
  secondaryButtonText?: string
  onSecondaryPress?: () => void
  showProgress?: boolean
  showSkip?: boolean
  showBack?: boolean
  showPrimaryButton?: boolean
}

export function OnboardingScreen({
  currentStep,
  totalSteps,
  headline,
  subtext,
  mainText,
  children,
  bottomContent,
  primaryButtonText,
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  showProgress = true,
  showSkip = false,
  showBack = true,
  showPrimaryButton = true,
}: OnboardingScreenProps) {
  const { colors } = useTheme()
  const router = useRouter()
  const segments = useSegments()
  const styles = createStyles(colors)

  const currentRoute = getRouteFromSegments(segments)
  const canSkipCurrent = canSkipStep(currentRoute)

  const handleBack = () => {
    const previousStep = getPreviousStep(currentRoute)
    if (previousStep) {
      router.push(previousStep.route)
    } else if (router.canGoBack()) {
      // Safety check: if we're at the beginning of onboarding, go to welcome instead of invalid route
      if (currentRoute === '/(onboarding)/learn-science') {
        router.push('/(onboarding)/welcome')
      } else {
        router.back()
      }
    } else {
      // Fallback to welcome screen if no navigation history
      router.push('/(onboarding)/welcome')
    }
  }

  const handleSkip = () => {
    const skipTarget = getSkipTarget(currentRoute)
    router.push(skipTarget)
  }

  const progress = currentStep / totalSteps

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {showBack && (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {currentStep}/{totalSteps}
            </Text>
          </View>
        )}
        
        {(showSkip && canSkipCurrent) && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Title Section */}
      <View style={styles.titleSection}>
        <Text style={styles.headline}>{headline}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children && (
          <ScrollView style={styles.childrenContainer} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        )}
      </View>

      {/* Bottom Section - Subtext and Footer */}
      <View style={styles.bottomSection}>
        {bottomContent && (
          <View style={styles.bottomContentContainer}>
            {bottomContent}
          </View>
        )}
        
        <View style={styles.textContainer}>
          {subtext && <Text style={styles.subtext}>{subtext}</Text>}
          {mainText && <Text style={styles.mainText}>{mainText}</Text>}
        </View>

        <View style={styles.footer}>
          {showPrimaryButton && primaryButtonText && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onPrimaryPress}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
            </TouchableOpacity>
          )}

          {secondaryButtonText && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSecondaryPress}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
            </TouchableOpacity>
          )}
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: SPACING.xl,
  },
  backArrow: {
    fontSize: 24,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  progressBackground: {
    width: '80%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
  },
  skipButton: {
    padding: SPACING.sm,
    position: 'absolute',
    right: SPACING.xl,
  },
  skipText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  titleSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  bottomSection: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['2xl'],
  },
  bottomContentContainer: {
    marginBottom: SPACING.lg,
  },
  textContainer: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  headline: {
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 40,
  },
  subtext: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  mainText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: TYPOGRAPHY.medium,
  },
  childrenContainer: {
    flex: 1,
  },
  footer: {
    paddingTop: SPACING.xl,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    height: 48,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
})