import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/constants/design'

// Monthly Calendar Component
const MonthlyCalendar = ({ colors }: { colors: any }) => {
  // Sample calendar for demonstration - showing a month with 30 days
  const today = new Date()
  const addDate = 5 // Words added on 5th
  const reviewDate = 19 // Review on 19th (14 days later)
  
  const monthName = today.toLocaleString('default', { month: 'long' })
  const year = today.getFullYear()
  
  // Generate calendar days (simplified - just showing 30 days in 6 rows)
  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1)
  const weeks = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
          {monthName} {year}
        </Text>
      </View>
      
      {/* Weekday headers */}
      <View style={styles.weekdayHeader}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <View key={index} style={styles.weekdayCell}>
            <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => {
              const isAddDate = day === addDate
              const isReviewDate = day === reviewDate
              
              return (
                <View key={dayIndex} style={styles.dayCell}>
                  <View style={[
                    styles.dayContainer,
                    isAddDate && { backgroundColor: colors.primary },
                    isReviewDate && { backgroundColor: '#10B981' }
                  ]}>
                    <Text style={[
                      styles.dayText,
                      { color: (isAddDate || isReviewDate) ? '#fff' : colors.textPrimary }
                    ]}>
                      {day}
                    </Text>
                  </View>
                  {isAddDate && (
                    <Text style={[styles.dayLabel, { color: colors.primary }]}>
                      Added
                    </Text>
                  )}
                  {isReviewDate && (
                    <Text style={[styles.dayLabel, { color: '#10B981' }]}>
                      Review
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        ))}
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Words Added
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            Review Day (14 days later)
          </Text>
        </View>
      </View>
    </View>
  )
}

export default function Step2WaitScreen() {
  const router = useRouter()
  const { colors } = useTheme()

  const handleContinue = () => {
    router.push('/(onboarding)/step-3-review')
  }

  return (
    <OnboardingScreen
      currentStep={7}
      totalSteps={24}
      headline="Step 2 – Wait 14 Days"
      subtext="Let your brain process what you've learned naturally. No reviews until 14 days later."
      primaryButtonText="Continue"
      onPrimaryPress={handleContinue}
      showSkip={true}
    >
      <View style={styles.container}>
        <MonthlyCalendar colors={colors} />
      </View>
    </OnboardingScreen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  
  // Calendar Styles
  calendarContainer: {
    backgroundColor: 'transparent',
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  monthTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
  },
  
  // Weekday Header
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  weekdayText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
  },
  
  // Calendar Grid
  calendarGrid: {
    gap: SPACING.xs,
  },
  weekRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    minHeight: 50,
  },
  dayContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    marginTop: 2,
  },
  
  // Legend
  legend: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: TYPOGRAPHY.sm,
  },
})