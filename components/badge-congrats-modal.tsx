import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

interface BadgeCongratsModalProps {
  visible: boolean
  onClose: () => void
  badgeType: 'silver' | 'gold'
  wordsCount?: number
  notebookTitle?: string
}

export default function BadgeCongratsModal({ 
  visible, 
  onClose, 
  badgeType,
  wordsCount = 0,
  notebookTitle = 'your notebook'
}: BadgeCongratsModalProps) {
  const router = useRouter()
  const { colors } = useTheme()

  const badgeConfig = {
    silver: {
      emoji: '🥈',
      title: 'Silver Badge Unlocked!',
      color: '#C0C0C0',
      description: 'You\'ve just unlocked your Silver badge!',
      explanation: 'Silver badges contain words that need extra attention. These words restart at Round 1 in page-based reviews with 20 words per page.',
      nextLevel: 'Gold'
    },
    gold: {
      emoji: '🥇',
      title: 'Gold Badge Unlocked!',
      color: '#FFD700',
      description: 'Congratulations! You\'ve achieved the ultimate Gold badge!',
      explanation: 'Gold badges represent your most challenging vocabulary. These words get the highest level of focused attention in the Gold List Method.',
      nextLevel: null
    }
  }

  const config = badgeConfig[badgeType]

  const handleViewBadge = () => {
    onClose()
    // Navigate to notebooks list where user can see their new badge
    router.push('/(tabs)/')
  }

  const handleContinueReview = () => {
    onClose()
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <SafeAreaView style={styles.content}>
            {/* Header with badge theme */}
            <View style={[styles.header, { backgroundColor: config.color }]}>
              <Text style={[styles.headerTitle, { color: '#333' }]}>
                {config.emoji} {config.title}
              </Text>
            </View>

            {/* Congratulations Content */}
            <View style={styles.body}>
              <Text style={[styles.congratsTitle, { color: colors.text }]}>
                Outstanding Progress!
              </Text>
              
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {config.description} {wordsCount > 0 && `${wordsCount} challenging word${wordsCount > 1 ? 's have' : ' has'} been moved to your ${badgeType} collection in ${notebookTitle}.`}
              </Text>

              <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                {config.explanation}
              </Text>

              <View style={[styles.badgeFeatures, { backgroundColor: colors.surface || colors.cardBackground }]}>
                <Text style={[styles.featuresTitle, { color: colors.text }]}>
                  {badgeType === 'silver' ? 'Silver Badge Features:' : 'Gold Badge Features:'}
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  • Page-based reviews (20 words at a time)
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  • Fresh 4-round progression cycle
                </Text>
                <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                  • 14-day spaced repetition intervals
                </Text>
                {badgeType === 'silver' && (
                  <Text style={[styles.featureItem, { color: colors.textSecondary }]}>
                    • Can advance to Gold badge if needed
                  </Text>
                )}
              </View>

              <Text style={[styles.goldListNote, { color: colors.accent }]}>
                This is the Gold List Method in action - specialized focus for challenging vocabulary!
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleViewBadge}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  View {badgeType === 'silver' ? 'Silver' : 'Gold'} Badge
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: config.color }]}
                onPress={handleContinueReview}
              >
                <Text style={[styles.buttonText, { color: '#333' }]}>
                  Continue Learning
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    borderRadius: RADIUS.lg,
    maxWidth: 420,
    width: '100%',
    maxHeight: '85%',
    ...SHADOWS.large,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  congratsTitle: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: TYPOGRAPHY.base,
    lineHeight: 24,
    textAlign: 'center',
  },
  explanation: {
    fontSize: TYPOGRAPHY.sm,
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  badgeFeatures: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.sm,
  },
  featuresTitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    marginBottom: SPACING.xs,
  },
  featureItem: {
    fontSize: TYPOGRAPHY.sm,
    lineHeight: 18,
    marginBottom: 2,
  },
  goldListNote: {
    fontSize: TYPOGRAPHY.sm,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.semibold,
    marginTop: SPACING.sm,
  },
  buttonContainer: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
})