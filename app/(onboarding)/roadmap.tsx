import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/constants/design'

export default function RoadmapScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = createStyles(colors)

  const handleContinue = () => {
    router.push('/(onboarding)/completion')
  }

  // Generate a 30-day roadmap with correct Gold List Method logic
  const generateRoadmap = () => {
    const days = []
    for (let i = 1; i <= 30; i++) {
      const activities = []
      
      // Every day: Add new words (Yellow)
      activities.push({ type: 'add', color: '#F59E0B', label: 'Add words' })
      
      // Days 15+: Review Round 1 (words from 14 days ago) (Red)
      if (i >= 15) {
        activities.push({ type: 'review1', color: '#FF6B6B', label: 'Review R1' })
      }
      
      // Days 29+: Review Round 2 (words that failed R1, now 14 days later) (Blue)
      if (i >= 29) {
        activities.push({ type: 'review2', color: '#3B82F6', label: 'Review R2' })
      }
      
      days.push({ day: i, activities })
    }
    return days
  }

  const roadmapDays = generateRoadmap()

  return (
    <OnboardingScreen
      currentStep={23}
      totalSteps={24}
      headline="Your 1-Month Journey"
      subtext="Here's your first month's plan — color-coded by activity."
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={false}
    >
      <View style={styles.container}>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>Add words</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#FF6B6B' }]} />
            <Text style={styles.legendText}>Review R1</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Review R2</Text>
          </View>
        </View>

        {/* Calendar Grid */}
        <ScrollView style={styles.calendarContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.calendarGrid}>
            {roadmapDays.map((day, index) => (
              <View 
                key={index} 
                style={styles.dayCard}
              >
                <Text style={styles.dayNumber}>{day.day}</Text>
                
                {/* Activity Indicators */}
                <View style={styles.activityIndicators}>
                  {day.activities.map((activity, actIndex) => (
                    <View 
                      key={actIndex}
                      style={[styles.activityDot, { backgroundColor: activity.color }]}
                    />
                  ))}
                </View>
                
                {/* Activity Labels */}
                <View style={styles.activityLabels}>
                  {day.activities.map((activity, actIndex) => (
                    <Text 
                      key={actIndex}
                      style={styles.activityText}
                      numberOfLines={1}
                    >
                      {activity.label}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </OnboardingScreen>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: SPACING.lg,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  calendarContainer: {
    flex: 1,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: SPACING.xs,
    paddingBottom: SPACING.xl,
  },
  dayCard: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dayNumber: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
  },
  activityIndicators: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activityLabels: {
    alignItems: 'center',
    gap: 1,
  },
  activityText: {
    fontSize: 6,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.medium,
  },
})