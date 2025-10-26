import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS } from '@/lib/constants/design'

interface CalendarDay {
  date: Date
  dayNumber: number
  actions: {
    add?: number
    review?: string
  }
  isToday?: boolean
  weekStart?: boolean
}

interface CalendarPreviewProps {
  dailyWordGoal: number
  startDate?: Date
}

export function CalendarPreview({ dailyWordGoal = 15, startDate = new Date() }: CalendarPreviewProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  // Generate 30 days of calendar data
  const generateCalendarData = (): CalendarDay[] => {
    const days: CalendarDay[] = []
    const start = new Date(startDate)
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      
      const dayNumber = i + 1
      const reviewDay = dayNumber - 14
      
      const day: CalendarDay = {
        date,
        dayNumber,
        actions: {
          add: dailyWordGoal,
          review: reviewDay > 0 ? `Day ${reviewDay}` : undefined
        },
        isToday: i === 0,
        weekStart: dayNumber % 7 === 1 || dayNumber === 1
      }
      
      days.push(day)
    }
    
    return days
  }

  const calendarData = generateCalendarData()

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getWeekTitle = (dayNumber: number) => {
    if (dayNumber <= 7) return "Week 1: Building Foundation"
    if (dayNumber <= 14) return "Week 2: Continuing to Build" 
    if (dayNumber <= 21) return "Week 3: Reviews Begin!"
    return "Week 4: Full Rhythm"
  }

  const renderDay = (day: CalendarDay) => (
    <View key={day.dayNumber} style={styles.dayContainer}>
      {day.weekStart && (
        <Text style={styles.weekTitle}>
          {getWeekTitle(day.dayNumber)}
        </Text>
      )}
      
      <View style={[
        styles.dayCard,
        day.isToday && styles.todayCard
      ]}>
        <View style={styles.dayHeader}>
          <Text style={[
            styles.dayNumber,
            day.isToday && styles.todayText
          ]}>
            Day {day.dayNumber}
          </Text>
          <Text style={styles.dayDate}>
            {formatDate(day.date)}
          </Text>
        </View>
        
        <View style={styles.dayActions}>
          {/* Add Words Action */}
          <View style={styles.actionItem}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionText}>
              Add {day.actions.add} new words
            </Text>
          </View>
          
          {/* Review Action */}
          {day.actions.review && (
            <View style={styles.actionItem}>
              <Text style={styles.actionIcon}>🔄</Text>
              <Text style={styles.actionText}>
                Review {day.actions.review} words
              </Text>
            </View>
          )}
        </View>
        
        {/* Progress Info */}
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Total in notebook: {day.dayNumber * dailyWordGoal} words
          </Text>
        </View>
      </View>
    </View>
  )

  const totalWords = 30 * dailyWordGoal

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalWords}</Text>
          <Text style={styles.statLabel}>Words Added</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>⏱️ 10min</Text>
          <Text style={styles.statLabel}>Daily Commitment</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>🎯 Day 30</Text>
          <Text style={styles.statLabel}>First Masteries</Text>
        </View>
      </View>

      {/* Calendar */}
      <ScrollView 
        style={styles.calendarScroll}
        showsVerticalScrollIndicator={false}
      >
        {calendarData.map(renderDay)}
        
        {/* Success Message */}
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>🎉 After 30 Days</Text>
          <Text style={styles.successText}>
            • {totalWords} words in your learning pipeline{'\n'}
            • Mastery process begun for early words{'\n'}
            • Daily habit established{'\n'}
            • Ready for long-term language success!
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.cardBackground,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  calendarScroll: {
    flex: 1,
  },
  dayContainer: {
    marginBottom: SPACING.lg,
  },
  weekTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  dayCard: {
    backgroundColor: colors.cardBackground,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayCard: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryLight,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  dayNumber: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  todayText: {
    color: colors.primary,
  },
  dayDate: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  dayActions: {
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: TYPOGRAPHY.sm,
    marginRight: SPACING.sm,
    width: 16,
  },
  actionText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  progressInfo: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.sm,
  },
  progressText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  successCard: {
    backgroundColor: colors.successLight,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  successText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    lineHeight: TYPOGRAPHY.base * 1.4,
    textAlign: 'center',
  },
})