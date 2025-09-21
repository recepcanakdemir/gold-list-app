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
  const [currentPage, setCurrentPage] = useState(0)
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
    // GitHub's authentic green color scale (light mode)
    const activityColors = [
      '#ebedf0',   // 0 - no activity (GitHub's exact gray)
      '#9be9a8',   // 1 - few contributions (GitHub's lightest green)
      '#40c463',   // 2 - some contributions (GitHub's light green)
      '#30a14e',   // 3 - many contributions (GitHub's medium green)
      '#216e39',   // 4 - most contributions (GitHub's darkest green)
    ]
    return activityColors[intensity] || activityColors[0]
  }

  // Generate habit tracker heatmap like HabitKit (7 rows x 25 columns)
  const generateHabitHeatmap = () => {
    const rows = 7 // 7 rows
    const cols = 25 // Keep 25 columns as requested
    const heatmapData = []
    
    for (let row = 0; row < rows; row++) {
      const rowData = []
      for (let col = 0; col < cols; col++) {
        // Generate random activity (0-4 intensity)
        const intensity = Math.floor(Math.random() * 5)
        rowData.push(intensity)
      }
      heatmapData.push(rowData)
    }
    
    return heatmapData
  }

  const habitHeatmapData = generateHabitHeatmap()

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
          <Text style={styles.activitySubtitle}>Your learning activity over the last year</Text>
          
          {/* Habit tracker heatmap */}
          <View style={styles.habitHeatmapContainer}>
            <View style={styles.habitGrid}>
              {habitHeatmapData.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.habitRow}>
                  {row.map((intensity, colIndex) => (
                    <View
                      key={colIndex}
                      style={[
                        styles.habitSquare,
                        { backgroundColor: getActivityColor(intensity) }
                      ]}
                    />
                  ))}
                </View>
              ))}
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
  habitHeatmapContainer: {
    paddingVertical: SPACING.md,
  },
  habitGrid: {
    gap: 2, // Smaller gap between rows
  },
  habitRow: {
    flexDirection: 'row',
    gap: 2, // Smaller gap between squares in a row
  },
  habitSquare: {
    width: 11.6, // Slightly bigger squares
    height: 11.6, // Slightly bigger squares
    borderRadius: 2, // Slightly bigger border radius
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