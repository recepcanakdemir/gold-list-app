import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useApp } from '@/lib/contexts/AppContext'

export default function TutorialOverviewScreen() {
  const router = useRouter()
  const { updateOnboardingProgress, markOnboardingComplete } = useApp()

  const handleStartApp = async () => {
    await markOnboardingComplete()
    router.replace('/(tabs)')
  }

  const handleTutorial = async () => {
    await updateOnboardingProgress({ currentStep: 5 })
    router.push('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>4 of 4</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🎯</Text>
          <Text style={styles.title}>Ready to Start!</Text>
          <Text style={styles.subtitle}>
            You now understand the Gold List Method. Would you like a quick app tutorial?
          </Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          <View style={styles.option}>
            <Text style={styles.optionIcon}>🚀</Text>
            <Text style={styles.optionTitle}>Jump Right In</Text>
            <Text style={styles.optionDescription}>
              Start creating your first notebook and adding vocabulary immediately
            </Text>
            <TouchableOpacity style={styles.optionButton} onPress={handleStartApp}>
              <Text style={styles.optionButtonText}>Start Learning</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.option}>
            <Text style={styles.optionIcon}>👋</Text>
            <Text style={styles.optionTitle}>Quick Tutorial</Text>
            <Text style={styles.optionDescription}>
              Take a 2-minute guided tour of the app features and interface
            </Text>
            <TouchableOpacity 
              style={[styles.optionButton, styles.secondaryButton]} 
              onPress={handleTutorial}
            >
              <Text style={[styles.optionButtonText, styles.secondaryButtonText]}>
                Show Me Around
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>What you&apos;ll get:</Text>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>📱</Text>
            <Text style={styles.benefitText}>Clean, intuitive interface</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>📊</Text>
            <Text style={styles.benefitText}>Progress tracking and analytics</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🔄</Text>
            <Text style={styles.benefitText}>Automatic review scheduling</Text>
          </View>
          <View style={styles.benefit}>
            <Text style={styles.benefitIcon}>🌟</Text>
            <Text style={styles.benefitText}>Multiple languages support</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  options: {
    marginBottom: 40,
  },
  option: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  optionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  optionButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#2563eb',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e1e1e1',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#666',
  },
  benefits: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 16,
    textAlign: 'center',
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
  },
  benefitText: {
    fontSize: 14,
    color: '#0369a1',
    flex: 1,
  },
})