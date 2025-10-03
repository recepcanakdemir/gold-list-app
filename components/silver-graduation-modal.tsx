import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

interface SilverGraduationModalProps {
  visible: boolean
  onContinue: () => void
  graduationData?: {
    silverNotebookId: string
    migratedWordsCount: number
    bronzeNotebookTitle: string
    silverNotebookTitle: string
  }
}

export default function SilverGraduationModal({
  visible,
  onContinue,
  graduationData
}: SilverGraduationModalProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const medalRotateAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      // Start celebration animations
      Animated.sequence([
        // Scale in the modal
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        // Slide up content
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()

      // Rotate medal animation
      Animated.loop(
        Animated.timing(medalRotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start()

      // Progress bar animation
      setTimeout(() => {
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }).start()
      }, 500)
    } else {
      // Reset animations
      scaleAnim.setValue(0)
      slideAnim.setValue(50)
      medalRotateAnim.setValue(0)
      progressAnim.setValue(0)
    }
  }, [visible])

  const medalRotation = medalRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Animated.View 
            style={[
              styles.contentContainer,
              {
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Celebration Header */}
            <View style={styles.header}>
              <View style={styles.medalContainer}>
                <Animated.Text 
                  style={[
                    styles.bronzeMedal,
                    { transform: [{ rotate: medalRotation }] }
                  ]}
                >
                  🥉
                </Animated.Text>
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrow}>→</Text>
                </View>
                <Animated.Text 
                  style={[
                    styles.silverMedal,
                    { transform: [{ rotate: medalRotation }] }
                  ]}
                >
                  🥈
                </Animated.Text>
              </View>
              
              <Text style={styles.congratsTitle}>Congratulations!</Text>
              <Text style={styles.congratsSubtitle}>
                You&apos;ve unlocked your Silver Notebook!
              </Text>
            </View>

            {/* Progress Visualization */}
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>Learning Progress</Text>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <Animated.View 
                    style={[
                      styles.progressFill,
                      { width: progressWidth }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {graduationData?.migratedWordsCount || 20} challenging words graduated
                </Text>
              </View>
            </View>

            {/* Explanation */}
            <View style={styles.explanationSection}>
              <View style={styles.explanationItem}>
                <Text style={styles.explanationIcon}>📚</Text>
                <View style={styles.explanationContent}>
                  <Text style={styles.explanationTitle}>What is Silver Notebook?</Text>
                  <Text style={styles.explanationText}>
                    Words that need extra attention get moved here for focused learning with fresh 14-day cycles.
                  </Text>
                </View>
              </View>

              <View style={styles.explanationItem}>
                <Text style={styles.explanationIcon}>📄</Text>
                <View style={styles.explanationContent}>
                  <Text style={styles.explanationTitle}>Page-Based Reviews</Text>
                  <Text style={styles.explanationText}>
                    Silver words are reviewed in groups of 20, making learning more efficient and focused.
                  </Text>
                </View>
              </View>

              <View style={styles.explanationItem}>
                <Text style={styles.explanationIcon}>🔄</Text>
                <View style={styles.explanationContent}>
                  <Text style={styles.explanationTitle}>Fresh Start</Text>
                  <Text style={styles.explanationText}>
                    All words restart at Round 1 with new 14-day intervals, giving them another chance to stick.
                  </Text>
                </View>
              </View>
            </View>

            {/* Statistics */}
            <View style={styles.statsSection}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{graduationData?.migratedWordsCount || 20}</Text>
                <Text style={styles.statLabel}>Words Migrated</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>1</Text>
                <Text style={styles.statLabel}>New Page</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>14</Text>
                <Text style={styles.statLabel}>Days Until Review</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={onContinue}
              >
                <Text style={styles.primaryButtonText}>Continue Review</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.9,
  },
  contentContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.lg,
  },
  
  // Header
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  medalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  bronzeMedal: {
    fontSize: 48,
  },
  arrowContainer: {
    marginHorizontal: SPACING.lg,
  },
  arrow: {
    fontSize: TYPOGRAPHY['2xl'],
    color: colors.primary,
    fontWeight: TYPOGRAPHY.bold,
  },
  silverMedal: {
    fontSize: 48,
  },
  congratsTitle: {
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  congratsSubtitle: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Progress Section
  progressSection: {
    marginBottom: SPACING.xl,
  },
  progressTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: RADIUS.sm,
  },
  progressText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Explanation Section
  explanationSection: {
    marginBottom: SPACING.xl,
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  explanationIcon: {
    fontSize: TYPOGRAPHY.xl,
    marginRight: SPACING.md,
    marginTop: SPACING.xs,
  },
  explanationContent: {
    flex: 1,
  },
  explanationTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  explanationText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Statistics Section
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: colors.gray50,
    borderRadius: RADIUS.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Button Container
  buttonContainer: {
    gap: SPACING.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
  },
  secondaryButton: {
    backgroundColor: colors.gray100,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
  },
})