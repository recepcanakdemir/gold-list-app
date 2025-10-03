import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useApp } from '@/lib/contexts/AppContext'
import { ROUND_COLORS, NOTEBOOK_LEVEL_COLORS } from '@/lib/types/goldlist'

export default function GoldListRoundsScreen() {
  const router = useRouter()
  const { updateOnboardingProgress } = useApp()

  const handleNext = async () => {
    await updateOnboardingProgress({ currentStep: 4 })
    router.push('/(onboarding)/tutorial-overview')
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '75%' }]} />
            </View>
            <Text style={styles.progressText}>3 of 4</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🔄</Text>
            <Text style={styles.title}>The 4-Round System</Text>
            <Text style={styles.subtitle}>8 weeks to master any word</Text>
          </View>

          {/* Rounds */}
          <View style={styles.rounds}>
            <Text style={styles.sectionTitle}>Review Rounds</Text>
            
            <View style={styles.round}>
              <View style={[styles.roundHeader, { backgroundColor: ROUND_COLORS[1].light }]}>
                <View style={[styles.roundNumber, { backgroundColor: ROUND_COLORS[1].primary }]}>
                  <Text style={styles.roundNumberText}>1</Text>
                </View>
                <Text style={styles.roundTitle}>First Review</Text>
                <Text style={styles.roundTiming}>After 2 weeks</Text>
              </View>
              <Text style={styles.roundDescription}>
                Your first review! Most words will stick from this round alone.
              </Text>
            </View>

            <View style={styles.round}>
              <View style={[styles.roundHeader, { backgroundColor: ROUND_COLORS[2].light }]}>
                <View style={[styles.roundNumber, { backgroundColor: ROUND_COLORS[2].primary }]}>
                  <Text style={styles.roundNumberText}>2</Text>
                </View>
                <Text style={styles.roundTitle}>Second Chance</Text>
                <Text style={styles.roundTiming}>After 4 weeks</Text>
              </View>
              <Text style={styles.roundDescription}>
                Words that need a little more time get another opportunity.
              </Text>
            </View>

            <View style={styles.round}>
              <View style={[styles.roundHeader, { backgroundColor: ROUND_COLORS[3].light }]}>
                <View style={[styles.roundNumber, { backgroundColor: ROUND_COLORS[3].primary }]}>
                  <Text style={styles.roundNumberText}>3</Text>
                </View>
                <Text style={styles.roundTitle}>Deep Review</Text>
                <Text style={styles.roundTiming}>After 6 weeks</Text>
              </View>
              <Text style={styles.roundDescription}>
                Challenging vocabulary gets focused attention.
              </Text>
            </View>

            <View style={styles.round}>
              <View style={[styles.roundHeader, { backgroundColor: ROUND_COLORS[4].light }]}>
                <View style={[styles.roundNumber, { backgroundColor: ROUND_COLORS[4].primary }]}>
                  <Text style={styles.roundNumberText}>4</Text>
                </View>
                <Text style={styles.roundTitle}>Final Round</Text>
                <Text style={styles.roundTiming}>After 8 weeks</Text>
              </View>
              <Text style={styles.roundDescription}>
                Last chance before moving to the next notebook level.
              </Text>
            </View>
          </View>

          {/* Notebook Levels */}
          <View style={styles.notebooks}>
            <Text style={styles.sectionTitle}>Notebook Hierarchy</Text>
            
            <View style={styles.notebook}>
              <View style={[styles.notebookHeader, { backgroundColor: NOTEBOOK_LEVEL_COLORS.bronze.light }]}>
                <Text style={styles.notebookIcon}>🥉</Text>
                <Text style={styles.notebookTitle}>Bronze Notebook</Text>
              </View>
              <Text style={styles.notebookDescription}>
                Your main learning notebook where all new words begin their journey.
              </Text>
            </View>

            <View style={styles.notebook}>
              <View style={[styles.notebookHeader, { backgroundColor: NOTEBOOK_LEVEL_COLORS.silver.light }]}>
                <Text style={styles.notebookIcon}>🥈</Text>
                <Text style={styles.notebookTitle}>Silver Notebook</Text>
              </View>
              <Text style={styles.notebookDescription}>
                Words that didn&apos;t stick in Bronze get more focused attention here.
              </Text>
            </View>

            <View style={styles.notebook}>
              <View style={[styles.notebookHeader, { backgroundColor: NOTEBOOK_LEVEL_COLORS.gold.light }]}>
                <Text style={styles.notebookIcon}>🥇</Text>
                <Text style={styles.notebookTitle}>Gold Notebook</Text>
              </View>
              <Text style={styles.notebookDescription}>
                The most challenging words get VIP treatment in the Gold level.
              </Text>
            </View>
          </View>

          {/* Success Rate */}
          <View style={styles.successRate}>
            <Text style={styles.successTitle}>📊 Typical Success Rates</Text>
            <View style={styles.stats}>
              <Text style={styles.stat}>• 70-80% stick in Round 1</Text>
              <Text style={styles.stat}>• 15-20% need Round 2</Text>
              <Text style={styles.stat}>• 5-10% reach higher levels</Text>
            </View>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Start Tutorial</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  rounds: {
    marginBottom: 32,
  },
  round: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  roundNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roundNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  roundTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  roundTiming: {
    fontSize: 12,
    color: '#666',
  },
  roundDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },
  notebooks: {
    marginBottom: 32,
  },
  notebook: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  notebookHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  notebookIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notebookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  notebookDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 20,
  },
  successRate: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 12,
  },
  stats: {
    gap: 4,
  },
  stat: {
    fontSize: 14,
    color: '#0369a1',
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
})