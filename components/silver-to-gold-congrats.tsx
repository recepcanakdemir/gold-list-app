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

interface SilverToGoldCongratsProps {
  visible: boolean
  onContinue: () => void
  wordsCount?: number
}

export default function SilverToGoldCongrats({
  visible,
  onContinue,
  wordsCount = 1
}: SilverToGoldCongratsProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const medalRotateAnim = useRef(new Animated.Value(0)).current
  const progressAnim = useRef(new Animated.Value(0)).current
  const sparkleAnim = useRef(new Animated.Value(0)).current

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

      // Sparkle animation for gold
      Animated.loop(
        Animated.sequence([
          Animated.timing(sparkleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(sparkleAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
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
      sparkleAnim.setValue(0)
    }
  }, [visible])

  const medalRotation = medalRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const sparkleOpacity = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
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
                    styles.silverMedal,
                    { transform: [{ rotate: medalRotation }] }
                  ]}
                >
                  🥈
                </Animated.Text>
                <View style={styles.arrowContainer}>
                  <Text style={styles.arrow}>→</Text>
                </View>
                <Animated.Text 
                  style={[
                    styles.goldMedal,
                    { 
                      transform: [{ rotate: medalRotation }],
                      opacity: sparkleOpacity
                    }
                  ]}
                >
                  🥇
                </Animated.Text>
              </View>
              
              <Text style={styles.congratsTitle}>Outstanding!</Text>
              <Text style={styles.congratsSubtitle}>
                You&apos;ve reached Gold difficulty - the ultimate challenge!
              </Text>
            </View>

            {/* Progress Visualization */}
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>Mastery Level Unlocked</Text>
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
                  {wordsCount} most challenging {wordsCount === 1 ? 'word' : 'words'} advanced to Gold rounds
                </Text>
              </View>
            </View>

            {/* Explanation */}
            <View style={styles.explanationSection}>
              <View style={styles.explanationItem}>
                <Text style={styles.explanationIcon}>🥇</Text>
                <View style={styles.explanationContent}>
                  <Text style={styles.explanationTitle}>What are Gold Rounds?</Text>
                  <Text style={styles.explanationText}>
                    The most challenging words that persisted through Silver get the ultimate learning treatment in Gold rounds 9-12.
                  </Text>
                </View>
              </View>

              <View style={styles.explanationItem}>
                <Text style={styles.explanationIcon}>💪</Text>
                <View style={styles.explanationContent}>
                  <Text style={styles.explanationTitle}>Maximum Focus</Text>
                  <Text style={styles.explanationText}>
                    These are your vocabulary&apos;s final boss battles - words that truly challenge your memory and deserve intensive attention.
                  </Text>
                </View>
              </View>

              <View style={styles.explanationItem}>
                <Text style={styles.explanationIcon}>🌟</Text>
                <View style={styles.explanationContent}>
                  <Text style={styles.explanationTitle}>Premium Colors</Text>
                  <Text style={styles.explanationText}>
                    Gold rounds feature warm orange, amber, emerald, and rose themes to mark your elite vocabulary journey.
                  </Text>
                </View>
              </View>
            </View>

            {/* Statistics */}
            <View style={styles.statsSection}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{wordsCount}</Text>
                <Text style={styles.statLabel}>Elite Words</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>9</Text>
                <Text style={styles.statLabel}>Gold Round 1</Text>
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
  silverMedal: {
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
  goldMedal: {
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
    backgroundColor: '#FFD700', // Gold color
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
    color: '#FFD700', // Gold color
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
    backgroundColor: '#FFD700', // Gold color
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: '#000', // Black text for gold background
  },
})