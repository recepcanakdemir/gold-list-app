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

export default function GoldListMethodScreen() {
  const router = useRouter()
  const { updateOnboardingProgress } = useApp()

  const handleNext = async () => {
    await updateOnboardingProgress({ currentStep: 3 })
    router.push('/(onboarding)/goldlist-rounds')
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
              <View style={[styles.progressFill, { width: '50%' }]} />
            </View>
            <Text style={styles.progressText}>2 of 4</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>📚</Text>
            <Text style={styles.title}>How It Works</Text>
            <Text style={styles.subtitle}>The simple 3-step process</Text>
          </View>

          {/* Steps */}
          <View style={styles.steps}>
            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>Add Words Daily</Text>
              </View>
              <Text style={styles.stepDescription}>
                Write 20-25 new vocabulary words with their meanings. 
                No review required - just focus on input.
              </Text>
              <View style={styles.stepExample}>
                <Text style={styles.stepExampleTitle}>Example:</Text>
                <Text style={styles.stepExampleText}>
                  &ldquo;Serendipity&rdquo; - The occurrence of events by chance in a happy way
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Wait 2 Weeks</Text>
              </View>
              <Text style={styles.stepDescription}>
                Let your brain naturally process and consolidate the vocabulary. 
                No cramming, no stress - just natural memory formation.
              </Text>
              <View style={styles.stepHighlight}>
                <Text style={styles.stepHighlightIcon}>🧠</Text>
                <Text style={styles.stepHighlightText}>
                  Your subconscious is working during this time!
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Review & Archive</Text>
              </View>
              <Text style={styles.stepDescription}>
                Review your words after 2 weeks. Keep only what you forgot - 
                archive what you remember permanently.
              </Text>
              <View style={styles.stepResult}>
                <View style={styles.resultItem}>
                  <Text style={styles.resultIcon}>✅</Text>
                  <Text style={styles.resultText}>Remembered → Archived forever</Text>
                </View>
                <View style={styles.resultItem}>
                  <Text style={styles.resultIcon}>🔄</Text>
                  <Text style={styles.resultText}>Forgotten → Next round</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Key Insight */}
          <View style={styles.insight}>
            <Text style={styles.insightIcon}>💎</Text>
            <Text style={styles.insightTitle}>The Magic</Text>
            <Text style={styles.insightText}>
              Most words stick after just one cycle! Words that don&apos;t simply need more time.
              No word is truly &ldquo;difficult&rdquo; - just not ready yet.
            </Text>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>See the Rounds</Text>
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
  steps: {
    marginBottom: 32,
  },
  step: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  stepExample: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
  },
  stepExampleTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1565c0',
    marginBottom: 4,
  },
  stepExampleText: {
    fontSize: 12,
    color: '#1565c0',
    fontStyle: 'italic',
  },
  stepHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 12,
  },
  stepHighlightIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  stepHighlightText: {
    fontSize: 12,
    color: '#ef6c00',
    fontWeight: '500',
  },
  stepResult: {
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  resultText: {
    fontSize: 12,
    color: '#666',
  },
  insight: {
    backgroundColor: '#f3e5f5',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 32,
  },
  insightIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7b1fa2',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#7b1fa2',
    textAlign: 'center',
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