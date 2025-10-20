import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import Svg, { Circle } from 'react-native-svg'
import { supabase } from '@/lib/supabase/client'

interface NotebookStats {
  title: string
  totalWords: number
  masteredWords: number
  wordsPerDay: number
  targetWords: number
}

// Circular Progress Component
interface CircularProgressProps {
  percentage: number
  color: string
  size: number
  strokeWidth: number
  title: string
  subtitle: string
}

function CircularProgress({ percentage, color, size, strokeWidth, title, subtitle }: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ position: 'relative' }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f0f0f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {/* Percentage text in center */}
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
            {percentage}%
          </Text>
        </View>
      </View>
      {/* Labels */}
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        marginTop: 8,
        textAlign: 'center'
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 12,
        color: '#666',
        marginTop: 2,
        textAlign: 'center'
      }}>
        {subtitle}
      </Text>
    </View>
  )
}

export default function CelebrationScreen() {
  const router = useRouter()
  const { notebookId } = useLocalSearchParams<{ notebookId: string }>()
  const { colors } = useTheme()
  const { getCurrentDate } = useDevTime()
  const [stats, setStats] = useState<NotebookStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotebookStats()
  }, [notebookId])

  const loadNotebookStats = async () => {
    if (!notebookId) return

    try {
      setLoading(true)
      
      // Get notebook details
      const notebook = await supabaseService.getNotebook(notebookId)
      if (!notebook) return

      // Calculate days since creation
      const notebookCreated = new Date(notebook.created_at)
      const today = getCurrentDate()
      const daysSinceCreation = Math.floor(
        (today.getTime() - notebookCreated.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1

      // Get all words from this notebook
      const notebooks = await supabaseService.getNotebooks()
      const targetNotebook = notebooks.find(n => n.id === notebookId)
      const totalWords = targetNotebook?.word_count || 0

      // Get mastered words count
      const { data: masteredWordsData, count: masteredCount } = await supabase
        .from('words')
        .select('id', { count: 'exact' })
        .eq('notebook_id', notebookId)
        .eq('is_mastered', true)

      const masteredWords = masteredCount || 0
      const wordsPerDay = notebook.words_per_day || 20
      const targetWords = wordsPerDay * 200 // Maximum possible words in 200 pages

      setStats({
        title: notebook.title,
        totalWords,
        masteredWords,
        wordsPerDay,
        targetWords
      })
    } catch (error) {
      console.error('Error loading notebook stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewNotebook = () => {
    router.push(`/notebook/${notebookId}`)
  }

  const handleBackToDashboard = () => {
    router.push('/(tabs)/')
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading celebration...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!stats) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Unable to load celebration data
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleBackToDashboard}
          >
            <Text style={[styles.buttonText, { color: colors.cardBackground }]}>
              Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const wordsAddedPercentage = Math.round((stats.totalWords / stats.targetWords) * 100)
  const masteryPercentage = stats.totalWords > 0 ? Math.round((stats.masteredWords / stats.totalWords) * 100) : 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary + '20' }]}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Incredible Achievement!
          </Text>
          <Text style={[styles.subtitle, { color: colors.primary }]}>
            200-Day Journey Complete
          </Text>
        </View>

        {/* Brief Description */}
        <View style={[styles.description, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            You've completed 200 days with "{stats.title}" - congratulations on this milestone!
          </Text>
        </View>

        {/* Two Circular Dashboards */}
        <View style={styles.dashboardsContainer}>
          <CircularProgress
            percentage={wordsAddedPercentage}
            color="#F59E0B"
            size={120}
            strokeWidth={8}
            title="Words Added"
            subtitle={`${stats.totalWords} / ${stats.targetWords}`}
          />
          
          <CircularProgress
            percentage={masteryPercentage}
            color="#10B981"
            size={120}
            strokeWidth={8}
            title="Mastery Rate"
            subtitle={`${stats.masteredWords} / ${stats.totalWords}`}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { 
              borderColor: colors.border,
              backgroundColor: colors.cardBackground 
            }]}
            onPress={handleViewNotebook}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
              📖 View Notebook
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleBackToDashboard}
          >
            <Text style={[styles.buttonText, { color: colors.cardBackground }]}>
              🎯 Back to Dashboard
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.base,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  errorText: {
    fontSize: TYPOGRAPHY.base,
    textAlign: 'center',
  },
  header: {
    padding: SPACING.xl,
    alignItems: 'center',
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    textAlign: 'center',
  },
  description: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  descriptionText: {
    fontSize: TYPOGRAPHY.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  dashboardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xl,
  },
  buttonContainer: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...SHADOWS.sm,
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
})