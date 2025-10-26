import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps,
  withDelay, 
  withTiming,
  Easing,
  useDerivedValue,
  runOnJS
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '@/lib/constants/design'

// Reusable Circular Progress Component (from dashboard)
// Create animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function CircularProgress({ percentage, color, size, strokeWidth, title, subtitle, animationDelay = 0 }: {
  percentage: number
  color: string
  size: number
  strokeWidth: number
  title: string
  subtitle: string
  animationDelay?: number
}) {
  const { colors } = useTheme()
  const progress = useSharedValue(0)
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.8)
  const [displayPercentage, setDisplayPercentage] = useState(0)
  
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }))

  // Animated props for the progress circle
  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (progress.value / 100) * circumference
    return {
      strokeDashoffset,
    }
  })

  // Update display percentage
  useDerivedValue(() => {
    runOnJS(setDisplayPercentage)(Math.round(progress.value))
  })

  useEffect(() => {
    opacity.value = withDelay(
      animationDelay,
      withTiming(1, { duration: 600 })
    )
    scale.value = withDelay(
      animationDelay,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.1)) })
    )
    progress.value = withDelay(
      animationDelay + 200,
      withTiming(percentage, { duration: 1200, easing: Easing.out(Easing.cubic) })
    )
  }, [])

  return (
    <Animated.View style={[{ alignItems: 'center' }, animatedStyle]}>
      <View style={{ position: 'relative' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            animatedProps={animatedProps}
          />
        </Svg>
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: color
          }}>
            {displayPercentage}%
          </Text>
        </View>
      </View>
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center',
        color: colors.textPrimary
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
        textAlign: 'center'
      }}>
        {subtitle}
      </Text>
    </Animated.View>
  )
}

// Animated Loading Bar
function AnimatedLoadingBar({ 
  percentage, 
  label, 
  color, 
  animationDelay = 0 
}: {
  percentage: number
  label: string
  color: string
  animationDelay?: number
}) {
  const { colors } = useTheme()
  const progress = useSharedValue(0)
  const opacity = useSharedValue(0)
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }))

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }))

  useEffect(() => {
    opacity.value = withDelay(
      animationDelay,
      withTiming(1, { duration: 400 })
    )
    progress.value = withDelay(
      animationDelay + 200,
      withTiming(percentage, { duration: 1000, easing: Easing.out(Easing.cubic) })
    )
  }, [])

  return (
    <Animated.View style={[styles.loadingBarContainer, animatedStyle]}>
      <View style={styles.loadingBarHeader}>
        <Text style={[styles.loadingBarLabel, { color: colors.textPrimary }]}>
          {label}
        </Text>
        <Text style={[styles.loadingBarValue, { color: color }]}>
          {Math.round(progress.value)}%
        </Text>
      </View>
      <View style={[styles.loadingBarTrack, { backgroundColor: colors.border }]}>
        <Animated.View 
          style={[
            styles.loadingBarProgress, 
            { backgroundColor: color },
            progressStyle
          ]} 
        />
      </View>
    </Animated.View>
  )
}

export default function TrackGrowScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const [startAnimation, setStartAnimation] = useState(false)

  const handleContinue = () => {
    router.push('/(onboarding)/science-behind')
  }

  // Start animation immediately when component mounts
  useEffect(() => {
    setStartAnimation(true)
  }, [])

  return (
    <OnboardingScreen
      currentStep={4}
      totalSteps={24}
      headline="Track. Reflect. Grow."
      subtext="Get insights on progress, mastery rate, and long-term retention — all automatically."
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.dashboardPreview}>
        {/* Progress Overview */}
        <View style={[styles.section, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Progress Overview
          </Text>
          
          <View style={styles.circularChartsContainer}>
            {startAnimation && (
              <>
                <CircularProgress
                  percentage={78}
                  color="#10B981"
                  size={120}
                  strokeWidth={8}
                  title="Weekly Goal"
                  subtitle="23/30 words"
                  animationDelay={100}
                />
                
                <CircularProgress
                  percentage={92}
                  color="#FFA400"
                  size={120}
                  strokeWidth={8}
                  title="Mastery Rate"
                  subtitle="184/200 words"
                  animationDelay={300}
                />
              </>
            )}
          </View>
        </View>
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  dashboardPreview: {
    flex: 1,
    paddingVertical: SPACING.lg,
    gap: SPACING.lg,
  },
  section: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  circularChartsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    flexWrap: 'wrap',
    gap: SPACING.lg,
  },
})