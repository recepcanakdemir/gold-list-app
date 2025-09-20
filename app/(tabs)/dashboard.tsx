import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { LineChart } from 'react-native-chart-kit'
import { SharedHeader } from '@/components/shared-header'

const { width: screenWidth } = Dimensions.get('window')

export default function DashboardScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { appState, refreshNotebooks } = useApp()
  const { colors } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState<'D' | 'W' | 'M'>('W')
  const insets = useSafeAreaInsets()

  useEffect(() => {
    refreshNotebooks()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshNotebooks()
    setRefreshing(false)
  }

  // Mock data for the chart
  const chartData = {
    labels: selectedPeriod === 'D' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
            selectedPeriod === 'W' ? ['W1', 'W2', 'W3', 'W4'] :
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: selectedPeriod === 'D' ? [12, 18, 15, 22, 19, 25, 20] :
            selectedPeriod === 'W' ? [85, 92, 78, 88] :
            [78, 85, 92, 88, 95, 89],
      color: (opacity = 1) => colors.primary,
      strokeWidth: 3
    }]
  }

  const getActivityColor = (intensity: number) => {
    const activityColors = [
      colors.gray100,     // 0 - no activity
      '#FEF3C7',          // 1 - light
      '#FCD34D',          // 2 - medium
      '#F59E0B',          // 3 - high
      '#D97706',          // 4 - very high
    ]
    return activityColors[intensity] || activityColors[0]
  }

  // Generate activity heatmap data (7 days x 15 weeks = ~3.5 months)
  const generateActivityData = () => {
    const weeks = []
    for (let week = 0; week < 15; week++) {
      const days = []
      for (let day = 0; day < 7; day++) {
        const intensity = Math.floor(Math.random() * 5)
        days.push(intensity)
      }
      weeks.push(days)
    }
    return weeks
  }

  const activityData = generateActivityData()

  const styles = createStyles(colors)

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <SharedHeader title="Dashboard" />

        {/* Performance Overview */}
        <View style={styles.performanceCard}>
          <View style={styles.performanceHeader}>
            <Text style={styles.performanceTitle}>Performance</Text>
            <View style={styles.periodTabs}>
              {(['D', 'W', 'M'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodTab,
                    selectedPeriod === period && styles.periodTabActive
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text style={[
                    styles.periodTabText,
                    selectedPeriod === period && styles.periodTabTextActive
                  ]}>
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={screenWidth - 80}
              height={200}
              chartConfig={{
                backgroundGradientFrom: colors.cardBackground,
                backgroundGradientTo: colors.cardBackground,
                decimalPlaces: 0,
                color: (opacity = 1) => colors.primary,
                labelColor: (opacity = 1) => colors.textSecondary,
                style: {
                  borderRadius: RADIUS.lg,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: colors.primary
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.activityCard}>
          <Text style={styles.activityTitle}>Activity</Text>
          <Text style={styles.activitySubtitle}>Your learning activity over the last 15 weeks</Text>
          
          <View style={styles.heatmapContainer}>
            <View style={styles.weekLabels}>
              {['', '', 'Jan', '', '', 'Feb', '', '', 'Mar', '', '', 'Apr', '', '', ''].map((month, index) => (
                <Text key={index} style={styles.monthLabel}>{month}</Text>
              ))}
            </View>
            
            <View style={styles.heatmapGrid}>
              <View style={styles.dayLabels}>
                {['Mon', '', 'Wed', '', 'Fri', '', ''].map((day, index) => (
                  <Text key={index} style={styles.dayLabel}>{day}</Text>
                ))}
              </View>
              
              <View style={styles.activityGrid}>
                {activityData.map((week, weekIndex) => (
                  <View key={weekIndex} style={styles.weekColumn}>
                    {week.map((intensity, dayIndex) => (
                      <View
                        key={dayIndex}
                        style={[
                          styles.activitySquare,
                          { backgroundColor: getActivityColor(intensity) }
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
            
            <View style={styles.heatmapLegend}>
              <Text style={styles.legendText}>Less</Text>
              <View style={styles.legendSquares}>
                {[0, 1, 2, 3, 4].map((intensity) => (
                  <View
                    key={intensity}
                    style={[
                      styles.legendSquare,
                      { backgroundColor: getActivityColor(intensity) }
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.legendText}>More</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={styles.statValue}>{appState.notebooks.reduce((sum, n) => sum + n.total_words, 0)}</Text>
            <Text style={styles.statLabel}>Total Words</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⭐</Text>
            <Text style={styles.statValue}>{appState.notebooks.reduce((sum, n) => sum + n.mastered_words, 0)}</Text>
            <Text style={styles.statLabel}>Mastered</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>{appState.notebooks.reduce((sum, n) => sum + n.pendingReviews, 0)}</Text>
            <Text style={styles.statLabel}>Reviews Due</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎯</Text>
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  performanceCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  performanceTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: RADIUS.md,
    padding: 2,
  },
  periodTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    minWidth: 32,
    alignItems: 'center',
  },
  periodTabActive: {
    backgroundColor: colors.cardBackground,
    ...SHADOWS.sm,
  },
  periodTabText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textSecondary,
  },
  periodTabTextActive: {
    color: colors.textPrimary,
  },
  chartContainer: {
    alignItems: 'center',
  },
  chart: {
    borderRadius: RADIUS.lg,
  },
  activityCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  activityTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  activitySubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.xl,
  },
  heatmapContainer: {
    alignItems: 'center',
  },
  weekLabels: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
    paddingLeft: 30,
  },
  monthLabel: {
    width: 12,
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heatmapGrid: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  dayLabels: {
    justifyContent: 'space-between',
    paddingRight: SPACING.sm,
    width: 30,
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    height: 12,
    textAlign: 'right',
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 2,
  },
  weekColumn: {
    gap: 2,
  },
  activitySquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
  },
  legendSquares: {
    flexDirection: 'row',
    gap: 2,
  },
  legendSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  statCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    flex: 1,
    minWidth: (screenWidth - SPACING.xl * 2 - SPACING.lg) / 2,
    ...SHADOWS.sm,
  },
  statIcon: {
    fontSize: TYPOGRAPHY['2xl'],
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
})