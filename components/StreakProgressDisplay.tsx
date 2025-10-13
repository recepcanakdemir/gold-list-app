import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING } from '@/lib/constants/design'

interface StreakProgressDisplayProps {
  currentStreak: number
  previousStreak?: number
  showAnimation?: boolean
  compact?: boolean
}

export function StreakProgressDisplay({ 
  currentStreak, 
  previousStreak, 
  showAnimation = true,
  compact = false 
}: StreakProgressDisplayProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors, compact)

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const flameAnim = useRef(new Animated.Value(1)).current

  // Determine if streak increased
  const streakIncreased = previousStreak !== undefined && currentStreak > previousStreak
  const isNewStreak = currentStreak === 1

  // Get streak message
  const getStreakMessage = () => {
    if (currentStreak === 0) return "Start your learning streak!"
    if (isNewStreak) return "🎉 Streak started!"
    if (streakIncreased) return `🔥 Streak increased to ${currentStreak}!`
    return "🔥 Daily streak maintained!"
  }

  // Get streak motivation
  const getStreakMotivation = () => {
    if (currentStreak === 0) return "Add words or review to begin"
    if (currentStreak < 7) return "Keep it going!"
    if (currentStreak < 30) return "You're on fire!"
    if (currentStreak < 100) return "Incredible dedication!"
    return "You're a legend!"
  }

  useEffect(() => {
    if (showAnimation && currentStreak > 0) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start()

      // Flame pulsing animation for streak increase
      if (streakIncreased) {
        const pulseAnimation = () => {
          Animated.sequence([
            Animated.timing(flameAnim, {
              toValue: 1.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(flameAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Repeat pulse 2 more times
            setTimeout(pulseAnimation, 100)
          })
        }
        setTimeout(pulseAnimation, 300)
      }
    } else if (currentStreak > 0) {
      // No animation, just show
      fadeAnim.setValue(1)
      scaleAnim.setValue(1)
    }
  }, [showAnimation, currentStreak, streakIncreased])

  if (currentStreak === 0 && !showAnimation) return null

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={styles.streakContent}>
        <Animated.Text 
          style={[
            styles.flameIcon,
            {
              transform: [{ scale: flameAnim }]
            }
          ]}
        >
          🔥
        </Animated.Text>
        <View style={styles.streakInfo}>
          <Text style={styles.streakCount}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>day{currentStreak === 1 ? '' : 's'}</Text>
        </View>
      </View>
      
      <View style={styles.messageContainer}>
        <Text style={styles.streakMessage}>{getStreakMessage()}</Text>
        {!compact && (
          <Text style={styles.streakMotivation}>{getStreakMotivation()}</Text>
        )}
      </View>
    </Animated.View>
  )
}

const createStyles = (colors: any, compact: boolean) => StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: compact ? SPACING.sm : SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: compact ? SPACING.xs : SPACING.sm,
  },
  
  flameIcon: {
    fontSize: compact ? 24 : 32,
    marginRight: SPACING.sm,
  },
  
  streakInfo: {
    alignItems: 'center',
  },
  
  streakCount: {
    fontSize: compact ? TYPOGRAPHY.xl : TYPOGRAPHY['2xl'],
    fontWeight: '700',
    color: colors.primary,
    lineHeight: compact ? 24 : 28,
  },
  
  streakLabel: {
    fontSize: compact ? TYPOGRAPHY.xs : TYPOGRAPHY.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  
  messageContainer: {
    alignItems: 'center',
  },
  
  streakMessage: {
    fontSize: compact ? TYPOGRAPHY.sm : TYPOGRAPHY.base,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: compact ? 0 : SPACING.xs,
  },
  
  streakMotivation: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})