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

export default function GoldListIntroScreen() {
  const router = useRouter()
  const { updateOnboardingProgress } = useApp()

  const handleNext = async () => {
    await updateOnboardingProgress({ currentStep: 2 })
    router.push('/(onboarding)/goldlist-method')
  }

  const handleSkip = async () => {
    await updateOnboardingProgress({ currentStep: 5 })
    router.push('/(onboarding)/tutorial-overview')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '25%' }]} />
            </View>
            <Text style={styles.progressText}>1 of 4</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🧠</Text>
            <Text style={styles.title}>What is the Gold List Method?</Text>
          </View>

          {/* Content */}
          <View style={styles.body}>
            <Text style={styles.description}>
              The Gold List Method is a scientifically-backed approach to vocabulary learning 
              developed by David James that revolutionizes how we memorize words.
            </Text>

            <View style={styles.comparisonContainer}>
              <View style={styles.comparison}>
                <View style={styles.comparisonHeader}>
                  <Text style={styles.comparisonIcon}>❌</Text>
                  <Text style={styles.comparisonTitle}>Traditional Methods</Text>
                </View>
                <View style={styles.comparisonPoints}>
                  <Text style={styles.comparisonPoint}>• Forced repetition</Text>
                  <Text style={styles.comparisonPoint}>• High stress</Text>
                  <Text style={styles.comparisonPoint}>• Temporary retention</Text>
                  <Text style={styles.comparisonPoint}>• Burnout prone</Text>
                </View>
              </View>

              <View style={styles.comparison}>
                <View style={styles.comparisonHeader}>
                  <Text style={styles.comparisonIcon}>✅</Text>
                  <Text style={styles.comparisonTitle}>Gold List Method</Text>
                </View>
                <View style={styles.comparisonPoints}>
                  <Text style={styles.comparisonPoint}>• Natural memory consolidation</Text>
                  <Text style={styles.comparisonPoint}>• Low stress learning</Text>
                  <Text style={styles.comparisonPoint}>• Permanent retention</Text>
                  <Text style={styles.comparisonPoint}>• Sustainable habits</Text>
                </View>
              </View>
            </View>

            <View style={styles.keyPoint}>
              <Text style={styles.keyPointIcon}>💡</Text>
              <Text style={styles.keyPointText}>
                <Text style={styles.keyPointBold}>Key Insight:</Text> Your brain naturally 
                forgets what&apos;s unimportant and remembers what matters. The Gold List Method 
                works with this process, not against it.
              </Text>
            </View>
          </View>

          {/* Navigation */}
          <View style={styles.navigation}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip Intro</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Learn How It Works</Text>
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
    marginBottom: 40,
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
    lineHeight: 34,
  },
  body: {
    flex: 1,
    marginBottom: 32,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  comparisonContainer: {
    marginBottom: 32,
  },
  comparison: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  comparisonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  comparisonPoints: {
    paddingLeft: 28,
  },
  comparisonPoint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  keyPoint: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  keyPointIcon: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  keyPointBold: {
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
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