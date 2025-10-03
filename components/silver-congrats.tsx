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

interface SilverCongratsModalProps {
  visible: boolean
  onClose: () => void
  wordsCount?: number
}

export default function SilverCongratsModal({ 
  visible, 
  onClose, 
  wordsCount = 0 
}: SilverCongratsModalProps) {
  const router = useRouter()
  const { colors } = useTheme()

  const handleViewSilverNotebook = () => {
    onClose()
    // Navigate to notebooks list where user can see their new Silver notebook
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
            {/* Header with Silver theme */}
            <View style={[styles.header, { backgroundColor: colors.silver || '#C0C0C0' }]}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                🥈 Silver List Unlocked!
              </Text>
            </View>

            {/* Congratulations Content */}
            <View style={styles.body}>
              <Text style={[styles.congratsTitle, { color: colors.text }]}>
                Congratulations!
              </Text>
              
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                You&apos;ve just unlocked your Silver notebook! {wordsCount > 0 && `${wordsCount} challenging word${wordsCount > 1 ? 's have' : ' has'} been moved to your Silver list.`}
              </Text>

              <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                Silver notebooks contain words that need extra attention. These words will restart at Round 1 with a fresh 14-day learning cycle.
              </Text>

              <Text style={[styles.goldListNote, { color: colors.accent }]}>
                This is part of the Gold List Method - your most challenging vocabulary gets specialized focus!
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleViewSilverNotebook}
              >
                <Text style={[styles.buttonText, { color: colors.text }]}>
                  View Silver Notebook
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: colors.accent }]}
                onPress={handleContinueReview}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  Continue Review
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContainer: {
    borderRadius: RADIUS.lg,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
    ...SHADOWS.medium,
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