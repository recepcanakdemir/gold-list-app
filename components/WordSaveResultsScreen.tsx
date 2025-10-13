import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { LoadingIndicator } from '@/components/LoadingIndicator'
import { StreakProgressDisplay } from '@/components/StreakProgressDisplay'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

interface SavedWord {
  word: string
  translation: string
  sentence: string
  sentenceBold: string
  meaning: string
  meaningBold: string
}

interface WordSaveResultsScreenProps {
  isLoading: boolean
  wordCount: number
  savedWords: SavedWord[]
  notebookTitle: string
  currentStreak?: number
  previousStreak?: number
  onClose: () => void
}

export function WordSaveResultsScreen({ 
  isLoading,
  wordCount,
  savedWords, 
  notebookTitle,
  currentStreak,
  previousStreak,
  onClose 
}: WordSaveResultsScreenProps) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  // Calculate next review date (14 days from today)
  const getNextReviewDate = () => {
    const reviewDate = new Date()
    reviewDate.setDate(reviewDate.getDate() + 14)
    return reviewDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const renderBoldText = (text: string) => {
    if (!text) return null
    
    const parts = text.split(/(<b>.*?<\/b>)/g)
    return (
      <Text style={styles.sentenceText}>
        {parts.map((part, index) => {
          if (part.startsWith('<b>') && part.endsWith('</b>')) {
            const boldText = part.replace(/<\/?b>/g, '')
            return (
              <Text key={index} style={styles.boldText}>
                {boldText}
              </Text>
            )
          }
          return part
        })}
      </Text>
    )
  }

  // Show simple loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContent}>
          <LoadingIndicator size={32} color={colors.primary} />
          <Text style={styles.loadingText}>
            Saving {wordCount} word{wordCount === 1 ? '' : 's'} to "{notebookTitle}"...
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Show results
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.successIcon}>
            <MaterialIcons name="check-circle" size={32} color={colors.success || colors.primary} />
          </View>
          <Text style={styles.title}>Words Saved Successfully!</Text>
          <Text style={styles.subtitle}>
            {savedWords.length} word{savedWords.length === 1 ? '' : 's'} added to "{notebookTitle}"
          </Text>
          <Text style={styles.reviewDate}>
            Next review: {getNextReviewDate()}
          </Text>
          
          {/* Streak Progress Display */}
          {currentStreak !== undefined && (
            <StreakProgressDisplay
              currentStreak={currentStreak}
              previousStreak={previousStreak}
              showAnimation={true}
              compact={true}
            />
          )}
        </View>
      </View>

      {/* Saved Words List */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {savedWords.map((word, index) => (
          <View key={index} style={styles.wordCard}>
            {/* Word Header with Number */}
            <View style={styles.wordRowHeader}>
              <Text style={styles.wordRowNumber}>{index + 1}.</Text>
              <View style={styles.wordHeaderSpacer} />
            </View>
            
            <View style={styles.savedWordContent}>
              {/* Word Section - Blue Theme */}
              <View style={styles.wordSectionContent}>
                <Text style={styles.wordText}>{word.word}</Text>
              </View>
              
              {/* Translation Section - Green Theme */}
              <View style={styles.translationSectionContent}>
                <Text style={styles.translationText}>{word.translation}</Text>
              </View>
              
              {/* Example Sentence Section - Orange Theme */}
              {(word.sentenceBold || word.sentence) && (
                <View style={styles.sentenceSectionContent}>
                  {word.sentenceBold ? renderBoldText(word.sentenceBold) : (
                    <Text style={styles.sentenceText}>{word.sentence}</Text>
                  )}
                </View>
              )}
              
              {/* Sentence Meaning Section - Purple Theme */}
              {(word.meaningBold || word.meaning) && (
                <View style={styles.meaningSectionContent}>
                  {word.meaningBold ? renderBoldText(word.meaningBold) : (
                    <Text style={styles.meaningText}>{word.meaning}</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.doneButton} 
          onPress={onClose}
        >
          <MaterialIcons name="done" size={20} color={colors.cardBackground} />
          <Text style={styles.doneButtonText}>
            Done
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Loading state styles
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: colors.text,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.body * 1.4,
  },
  header: {
    backgroundColor: colors.cardBackground,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...SHADOWS.sm,
  },
  headerContent: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: colors.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  reviewDate: {
    ...TYPOGRAPHY.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING['4xl'], // Extra padding to prevent action button overlap
  },
  wordCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  
  // Word row header with number
  wordRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  wordRowNumber: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
  },
  wordHeaderSpacer: {
    flex: 1,
  },
  savedWordContent: {
    gap: SPACING.sm,
  },
  
  // Word Section (Modern Blue theme) - Clean and readable
  wordSectionContent: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#D6EAFF',
  },
  wordText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: '#2D3748',
  },
  
  // Translation Section (Modern Green theme) - Clean and readable
  translationSectionContent: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  translationText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: '#2D3748',
  },
  
  // Example Sentence Section (Modern Orange theme) - Clean and readable
  sentenceSectionContent: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  
  // Sentence Meaning Section (Modern Purple theme) - Clean and readable  
  meaningSectionContent: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  meaningText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: '#2D3748',
  },
  sentenceText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: '#2D3748',
    lineHeight: TYPOGRAPHY.base * 1.4,
  },
  boldText: {
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
  },
  actionButtons: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  doneButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: colors.cardBackground,
  },
})