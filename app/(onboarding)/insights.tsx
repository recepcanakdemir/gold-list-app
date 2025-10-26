import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { useSurvey } from '@/lib/contexts/SurveyContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SPACING, TYPOGRAPHY, RADIUS, SHADOWS } from '@/lib/constants/design'

// AI Analysis Response Interface
interface AnalysisData {
  recommendedDailyWords: number
  yearlyTotal: number
  expectedMastery: number
  successProbability: number
  insights: {
    memoryStrategy: string
    progressionPlan: string
    focusAreas: string[]
    whyThisAmount: string
  }
  projections: {
    month1: number
    month3: number
    month6: number
    fluencyDays: number
  }
  error?: string
}

// Styles function moved before components
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  recommendationCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  recommendationTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    marginBottom: SPACING.xs,
  },
  recommendationValue: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    marginBottom: 2,
  },
  recommendationSubtext: {
    fontSize: TYPOGRAPHY.sm,
    textAlign: 'center',
  },
  effectivenessCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  effectivenessTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    marginBottom: SPACING.xs,
  },
  effectivenessValue: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    marginBottom: 2,
  },
  effectivenessSubtext: {
    fontSize: TYPOGRAPHY.sm,
    textAlign: 'center',
  },
  insightsCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.xl,
    ...SHADOWS.md,
  },
  insightsTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    marginBottom: SPACING.xs,
  },
  insightText: {
    fontSize: TYPOGRAPHY.sm,
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
})

export default function InsightsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { analysisData } = useSurvey()
  const styles = createStyles(colors)
  
  // Fallback data in case context data is not available
  const fallbackData: AnalysisData = {
    recommendedDailyWords: 15,
    yearlyTotal: 5475,
    expectedMastery: 3833,
    successProbability: 75,
    insights: {
      memoryStrategy: 'Gold List Method uses natural 14-day intervals to strengthen memory retention.',
      progressionPlan: 'Steady vocabulary growth through consistent daily practice.',
      focusAreas: ['Daily consistency', 'Natural retention', 'Vocabulary building'],
      whyThisAmount: 'Balanced approach suitable for most learning goals and schedules.'
    },
    projections: {
      month1: 450,
      month3: 1350,
      month6: 2700,
      fluencyDays: 365
    }
  }
  
  // Use analysis data from context, fallback to default data
  const displayData = analysisData || fallbackData

  const handleContinue = () => {
    router.push('/(onboarding)/roadmap')
  }

  // Data is now directly used in component render

  return (
    <OnboardingScreen
      currentStep={22}
      totalSteps={24}
      headline="Your Personalized Insights"
      subtext={`AI recommends ${displayData.recommendedDailyWords} words daily for optimal results`}
      primaryButtonText="See My Roadmap"
      onPrimaryPress={handleContinue}
      showSkip={false}
    >
      <View style={styles.container}>
        {/* AI Recommendation */}
        <LinearGradient
          colors={['#3B82F6', '#60A5FA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recommendationCard}
        >
          <Text style={{ fontSize: 20, marginBottom: 2 }}>🤖</Text>
          <Text style={[styles.recommendationTitle, { color: '#FFFFFF' }]}>AI Recommendation</Text>
          <Text style={[styles.recommendationValue, { color: '#FFFFFF' }]}>
            {displayData.recommendedDailyWords} words per day
          </Text>
          <Text style={[styles.recommendationSubtext, { color: '#E0F2FE' }]}>
            Optimized for your goals
          </Text>
        </LinearGradient>

        {/* Gold List Effectiveness */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.effectivenessCard}
        >
          <Text style={{ fontSize: 20, marginBottom: 2 }}>🏆</Text>
          <Text style={[styles.effectivenessTitle, { color: '#FFFFFF' }]}>Gold List Method</Text>
          <Text style={[styles.effectivenessValue, { color: '#FFFFFF' }]}>30% retention rate</Text>
          <Text style={[styles.effectivenessSubtext, { color: '#D1FAE5' }]}>
            14-day memory intervals
          </Text>
        </LinearGradient>

        {/* Key Insights */}
        <LinearGradient
          colors={['#F59E0B', '#FEF3C7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.insightsCard}
        >
          <Text style={{ fontSize: 20, marginBottom: 2 }}>🎯</Text>
          <Text style={[styles.insightsTitle, { color: '#92400E' }]}>Your Strategy</Text>
          <Text style={[styles.insightText, { color: '#92400E' }]}>
            • {displayData.insights.whyThisAmount}
          </Text>
        </LinearGradient>
      </View>
    </OnboardingScreen>
  )
}