import React, { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { useTheme } from '@/lib/contexts/ThemeContext'

interface StreakAnimationProps {
  streakCount: number
  visible: boolean
  onAnimationComplete?: () => void
}

export function StreakAnimation({ streakCount, visible, onAnimationComplete }: StreakAnimationProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const bounceAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      // Start animation sequence
      Animated.sequence([
        // Initial scale up with rotation
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.2,
            useNativeDriver: true,
            tension: 100,
            friction: 3,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        // Bounce effect
        Animated.spring(bounceAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 4,
        }),
        // Scale back to normal
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        // Hold for a moment
        Animated.delay(1000),
        // Fade out
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Reset animations
        scaleAnim.setValue(0)
        opacityAnim.setValue(0)
        rotateAnim.setValue(0)
        bounceAnim.setValue(0)
        onAnimationComplete?.()
      })
    }
  }, [visible, scaleAnim, opacityAnim, rotateAnim, bounceAnim, onAnimationComplete])

  if (!visible) return null

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const bounce = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  })

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.animationContainer,
          {
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
              { rotate },
              { translateY: bounce },
            ],
          },
        ]}
      >
        {/* Fire emoji with glow effect */}
        <View style={styles.fireContainer}>
          <Text style={styles.fireEmoji}>🔥</Text>
          <View style={styles.glowEffect} />
        </View>
        
        {/* Streak count */}
        <View style={styles.streakBadge}>
          <Text style={styles.streakNumber}>{streakCount}</Text>
          <Text style={styles.streakLabel}>
            {streakCount === 1 ? 'Day Streak!' : 'Days Streak!'}
          </Text>
        </View>
        
        {/* Particle effects */}
        <View style={styles.particlesContainer}>
          {[...Array(6)].map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.particle,
                {
                  transform: [
                    { 
                      rotate: `${index * 60}deg` 
                    },
                  ],
                },
              ]} 
            />
          ))}
        </View>
      </Animated.View>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fireEmoji: {
    fontSize: 60,
    textAlign: 'center',
  },
  glowEffect: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 165, 0, 0.3)',
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  streakBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#D97706',
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
    marginBottom: 2,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  particlesContainer: {
    position: 'absolute',
    width: 120,
    height: 120,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    backgroundColor: '#FFD700',
    borderRadius: 3,
    top: -60,
    left: 57,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
})