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
import { NotebookWithStats } from '@/lib/types/goldlist'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, FLAG_EMOJIS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { LineChart } from 'react-native-chart-kit'
import { SharedHeader } from '@/components/shared-header'

const { width: screenWidth } = Dimensions.get('window')

export default function HomeScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { appState, refreshNotebooks } = useApp()
  const { colors } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    refreshNotebooks()
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshNotebooks()
    setRefreshing(false)
  }

  const handleCreateNotebook = () => {
    router.push('/modal/create-notebook')
  }

  const handleNotebookPress = (notebook: NotebookWithStats) => {
    router.push(`/notebook/${notebook.id}`)
  }

  const getPendingReviews = () => {
    return appState.notebooks.reduce((total, notebook) => total + notebook.pendingReviews, 0)
  }

  // Mock data for the chart (in real app, get from analytics)
  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      data: [4, 6, 8, 9, 7, 12, 15],
      color: (opacity = 1) => colors.primary,
      strokeWidth: 3,
    }],
  }

  const chartConfig = {
    backgroundColor: colors.cardBackground,
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
      stroke: colors.primary,
      fill: colors.primary,
    },
    fillShadowGradient: colors.primary,
    fillShadowGradientOpacity: 0.1,
  }

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
        <SharedHeader title="Gold List" />

        {/* Main Notebook Card */}
        {appState.notebooks.length > 0 && (
          <TouchableOpacity 
            style={styles.mainNotebookCard}
            onPress={() => handleNotebookPress(appState.notebooks[0])}
          >
            <View style={styles.notebookHeader}>
              <View style={styles.languageFlags}>
                <Text style={styles.flagFrom}>🇺🇸</Text>
                <Text style={styles.flagArrow}>↔</Text>
                <Text style={styles.flagTo}>🇪🇸</Text>
              </View>
            </View>
            
            <Text style={styles.notebookTitle}>English</Text>
            <Text style={styles.notebookSubtitle}>15 words added this week</Text>

            <View style={styles.notebookStats}>
              <Text style={styles.totalWords}>245 total • 180 mastered</Text>
            </View>

            <TouchableOpacity 
              style={styles.practiceButton}
              onPress={() => router.push(`/notebook/${appState.notebooks[0].id}/review`)}
            >
              <Text style={styles.practiceButtonText}>Practice Now</Text>
              {getPendingReviews() > 0 && (
                <View style={styles.reviewBadge}>
                  <Text style={styles.reviewBadgeText}>{getPendingReviews()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Progress Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartTabs}>
            <TouchableOpacity style={[styles.chartTab, styles.chartTabActive]}>
              <Text style={[styles.chartTabText, styles.chartTabTextActive]}>Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chartTab}>
              <Text style={styles.chartTabText}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.chartTab}>
              <Text style={styles.chartTabText}>Monthly</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={screenWidth - SPACING['4xl']}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withDots
              withShadow={false}
              withVerticalLabels
              withHorizontalLabels
              segments={4}
            />
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Words Added</Text>
            <Text style={styles.statValue}>25</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Words Mastered</Text>
            <Text style={styles.statValueGreen}>18</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Success Rate</Text>
            <Text style={styles.statValueBlue}>88%</Text>
          </View>
        </View>

        {/* Add button spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: 60 + Math.max(insets.bottom, 8) + 20 }]} 
        onPress={handleCreateNotebook}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  mainNotebookCard: {
    marginHorizontal: SPACING.xl,
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  notebookHeader: {
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
  },
  languageFlags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  flagFrom: {
    fontSize: TYPOGRAPHY.xl,
  },
  flagArrow: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  flagTo: {
    fontSize: TYPOGRAPHY.xl,
  },
  notebookTitle: {
    fontSize: TYPOGRAPHY['3xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  notebookSubtitle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    marginBottom: SPACING.lg,
  },
  notebookStats: {
    marginBottom: SPACING.xl,
  },
  totalWords: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  practiceButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  practiceButtonText: {
    color: colors.cardBackground,
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
  },
  reviewBadge: {
    position: 'absolute',
    right: SPACING.lg,
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  reviewBadgeText: {
    color: colors.cardBackground,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
  },
  chartSection: {
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  chartTabs: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: RADIUS.xl,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  chartTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.lg,
  },
  chartTabActive: {
    backgroundColor: colors.primary,
  },
  chartTabText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textSecondary,
  },
  chartTabTextActive: {
    color: colors.cardBackground,
  },
  chartContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  chart: {
    borderRadius: RADIUS.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
  },
  statValueGreen: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.success,
  },
  statValueBlue: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: '#3B82F6',
  },
  bottomSpacing: {
    height: SPACING['4xl'],
  },
  fab: {
    position: 'absolute',
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
    zIndex: 1000,
  },
  fabIcon: {
    fontSize: TYPOGRAPHY['2xl'],
    color: colors.cardBackground,
    fontWeight: TYPOGRAPHY.bold,
  },
})