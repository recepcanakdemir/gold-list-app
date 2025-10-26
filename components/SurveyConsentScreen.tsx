import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

interface SurveyConsentScreenProps {
  onAccept: () => void
  onSkip: () => void
}

export function SurveyConsentScreen({ onAccept, onSkip }: SurveyConsentScreenProps) {
  const { colors } = useTheme()
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false)
  const styles = createStyles(colors)

  const keyBenefits = [
    'Takes 2 minutes',
    'Improve the app for everyone',
    'Skip anytime, delete anytime'
  ]

  const privacyDetails = [
    'Stored securely and analyzed anonymously',
    'Can be deleted anytime in Settings', 
    'Automatically removed after 2 years',
    'Never shared with third parties',
    'Used only for app improvement'
  ]

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header with Survey Icon */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.surveyEmoji}>📊</Text>
          </View>
          
          <Text style={styles.title}>Quick Survey (Optional)</Text>
          <Text style={styles.subtitle}>
            Help us personalize your learning experience
          </Text>
        </View>

        {/* Key Benefits */}
        <View style={styles.benefitsContainer}>
          {keyBenefits.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <MaterialIcons name="check-circle" size={20} color={colors.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Privacy Details Toggle */}
        <TouchableOpacity 
          style={styles.privacyToggle}
          onPress={() => setShowPrivacyDetails(!showPrivacyDetails)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="info-outline" size={16} color={colors.primary} />
          <Text style={styles.privacyToggleText}>Privacy details</Text>
          <MaterialIcons 
            name={showPrivacyDetails ? "expand-less" : "expand-more"} 
            size={16} 
            color={colors.primary} 
          />
        </TouchableOpacity>

        {/* Expandable Privacy Section */}
        {showPrivacyDetails && (
          <View style={styles.privacyDetailsContainer}>
            <Text style={styles.privacyDetailsTitle}>Your data:</Text>
            {privacyDetails.map((detail, index) => (
              <View key={index} style={styles.privacyDetailRow}>
                <Text style={styles.privacyDetailText}>• {detail}</Text>
              </View>
            ))}
            <Text style={styles.legalNotice}>
              By participating, you consent to data collection as described. 
              You can withdraw consent anytime.
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={onAccept}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue with Survey</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={onSkip}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['3xl'],
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING['2xl'],
  },
  iconContainer: {
    marginBottom: SPACING.lg,
  },
  surveyEmoji: {
    fontSize: 48,
    textAlign: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Benefits
  benefitsContainer: {
    marginBottom: SPACING['2xl'],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  benefitText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    marginLeft: SPACING.md,
    fontWeight: TYPOGRAPHY.medium,
  },

  // Privacy Toggle
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  privacyToggleText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.medium,
  },

  // Privacy Details (Expandable)
  privacyDetailsContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  privacyDetailsTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  privacyDetailRow: {
    marginBottom: SPACING.xs,
  },
  privacyDetailText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  legalNotice: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    marginTop: SPACING.md,
    lineHeight: 16,
    fontStyle: 'italic',
  },

  // Buttons
  buttonContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING['2xl'],
    gap: SPACING.md,
  },
  continueButton: {
    backgroundColor: colors.primary,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  continueButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.white,
  },
  skipButton: {
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textSecondary,
  },
})