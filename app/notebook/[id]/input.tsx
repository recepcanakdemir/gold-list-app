import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabaseService } from '@/lib/services/supabaseService'
import { useApp } from '@/lib/contexts/AppContext'
import { NotebookWithStats } from '@/lib/types/goldlist'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'

interface WordEntry {
  word: string
  meaning: string
  notes: string
}

export default function WordInputScreen() {
  const router = useRouter()
  const { id, page: pageParam } = useLocalSearchParams<{ id: string; page?: string }>()
  const { colors } = useTheme()
  const { refreshNotebooks } = useApp()
  const { currentSimulatedDay } = useDevTime()
  const [notebook, setNotebook] = useState<NotebookWithStats | null>(null)
  const [mode, setMode] = useState<'focus' | 'fullpage'>('focus')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [words, setWords] = useState<WordEntry[]>([])
  const [loading, setLoading] = useState(false)
  const styles = createStyles(colors)

  useEffect(() => {
    loadNotebook()
    checkPageStatus()
  }, [id])

  const loadNotebook = async () => {
    try {
      const notebookData = await supabaseService.getNotebook(id!)
      setNotebook(notebookData)
    } catch (error) {
      Alert.alert('Error', 'Failed to load notebook')
      if (router.canGoBack()) {
        router.back()
      } else {
        router.push('/(tabs)/')
      }
    }
  }

  const checkPageStatus = async () => {
    try {
      const pageNumber = pageParam ? parseInt(pageParam) : 1
      
      // Check if this page already has words
      const pages = await supabaseService.getPages(id!)
      const currentPage = pages.find(p => p.page_number === pageNumber)
      
      if (currentPage && currentPage.words && currentPage.words.length > 0) {
        // Page already has words - redirect to review or show locked message
        Alert.alert(
          'Page Already Has Words',
          'This page already contains words and cannot accept new word additions. Pages can only have words added once, then they move through review rounds.',
          [
            {
              text: 'Go to Reviews',
              onPress: () => {
                router.replace(`/notebook/${id}/review?page=${pageNumber}`)
              }
            },
            {
              text: 'Back to Notebook',
              onPress: () => {
                router.back()
              }
            }
          ]
        )
        return
      }
      
      // Page is available for word input
      initializeWords()
    } catch (error) {
      console.error('Error checking page status:', error)
      initializeWords() // Fallback to normal initialization
    }
  }

  const initializeWords = () => {
    const initialWords: WordEntry[] = Array.from({ length: 20 }, () => ({
      word: '',
      meaning: '',
      notes: '',
    }))
    setWords(initialWords)
  }

  const updateWord = (index: number, field: keyof WordEntry, value: string) => {
    const newWords = [...words]
    newWords[index] = { ...newWords[index], [field]: value }
    setWords(newWords)
  }

  const addNewWord = () => {
    const maxWords = notebook?.words_per_day || 20
    if (words.length < maxWords) {
      setWords([...words, { word: '', meaning: '', notes: '' }])
    } else {
      Alert.alert('Word Limit Reached', `You can only add ${maxWords} words per day according to your notebook settings.`)
    }
  }

  const removeWord = (index: number) => {
    if (words.length > 1) {
      const newWords = words.filter((_, i) => i !== index)
      setWords(newWords)
      if (currentIndex >= newWords.length) {
        setCurrentIndex(Math.max(0, newWords.length - 1))
      }
    }
  }

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      addNewWord()
      setCurrentIndex(words.length)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSave = async () => {
    const filledWords = words.filter(w => w.word.trim() && w.meaning.trim())
    
    if (filledWords.length === 0) {
      Alert.alert('No Words', 'Please add at least one word before saving.')
      return
    }

    setLoading(true)
    try {
      // Get or create today's page
      const currentPage = await supabaseService.getTodaysPage(id!, currentSimulatedDay)
      if (!currentPage) {
        Alert.alert('Error', 'Unable to create or access today\'s page.')
        setLoading(false)
        return
      }

      // Check word limit for the page
      const currentWordsOnPage = currentPage.words?.length || 0
      const maxWordsPerDay = notebook?.words_per_day || 20
      const availableSlots = maxWordsPerDay - currentWordsOnPage

      if (filledWords.length > availableSlots) {
        Alert.alert(
          'Word Limit Exceeded', 
          `This page can only hold ${availableSlots} more words (${currentWordsOnPage}/${maxWordsPerDay} already added). Please remove ${filledWords.length - availableSlots} words.`
        )
        setLoading(false)
        return
      }
      
      // Add words to the current page
      await supabaseService.addWords(
        currentPage.id,
        filledWords.map((word, index) => ({
          word: word.word.trim(),
          translation: word.meaning.trim(),
          meaning: word.meaning.trim(),
          notes: word.notes.trim() || undefined,
          position_in_page: index + 1,
        }))
      )

      // Refresh the app data to update profile stats
      await refreshNotebooks()

      Alert.alert(
        'Success!',
        `Added ${filledWords.length} words to your notebook. They'll be ready for review in 2 weeks.`,
        [
          {
            text: 'Add More Words',
            onPress: () => {
              initializeWords()
              setCurrentIndex(0)
            },
          },
          {
            text: 'Done',
            onPress: () => {
              // Navigate back
              if (router.canGoBack()) {
                router.back()
              } else {
                router.push('/(tabs)/')
              }
              
              // Set flag that words were added for home screen to detect
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  (window as any).wordsJustAdded = true
                }
              }, 100)
            },
            style: 'default',
          },
        ]
      )
    } catch (error) {
      console.error('❌ Error saving words:', error)
      Alert.alert('Error', 'Failed to save words. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getProgress = () => {
    const filledWords = words.filter(w => w.word.trim() && w.meaning.trim()).length
    const target = notebook?.words_per_day || 20
    return Math.min(filledWords / target, 1)
  }

  if (!notebook) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.push('/(tabs)/')
            }
          }}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.notebookTitle}>{notebook.title}</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {words.filter(w => w.word.trim() && w.meaning.trim()).length} / {notebook.words_per_day}
              </Text>
            </View>
          </View>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'focus' && styles.modeButtonActive]}
              onPress={() => setMode('focus')}
            >
              <Text style={[styles.modeButtonText, mode === 'focus' && styles.modeButtonTextActive]}>
                Focus
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'fullpage' && styles.modeButtonActive]}
              onPress={() => setMode('fullpage')}
            >
              <Text style={[styles.modeButtonText, mode === 'fullpage' && styles.modeButtonTextActive]}>
                List
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        {mode === 'focus' ? (
          <FocusMode
            words={words}
            currentIndex={currentIndex}
            onUpdateWord={updateWord}
            onNext={handleNext}
            onPrevious={handlePrevious}
            styles={styles}
          />
        ) : (
          <FullPageMode
            words={words}
            onUpdateWord={updateWord}
            onAddWord={addNewWord}
            onRemoveWord={removeWord}
            maxWords={notebook?.words_per_day || 20}
            styles={styles}
          />
        )}

        {/* Save Button */}
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Words'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

interface FocusModeProps {
  words: WordEntry[]
  currentIndex: number
  onUpdateWord: (index: number, field: keyof WordEntry, value: string) => void
  onNext: () => void
  onPrevious: () => void
  styles: any
}

function FocusMode({ words, currentIndex, onUpdateWord, onNext, onPrevious, styles }: FocusModeProps) {
  const currentWord = words[currentIndex]

  return (
    <View style={styles.focusContainer}>
      <View style={styles.focusHeader}>
        <Text style={styles.focusTitle}>Word {currentIndex + 1}</Text>
        <Text style={styles.focusSubtitle}>
          Enter the word and its meaning
        </Text>
      </View>

      <ScrollView style={styles.focusContent} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Word</Text>
          <TextInput
            style={styles.focusInput}
            placeholder="Enter the new vocabulary word"
            value={currentWord?.word || ''}
            onChangeText={(value) => onUpdateWord(currentIndex, 'word', value)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Meaning</Text>
          <TextInput
            style={styles.focusInput}
            placeholder="Enter the meaning or translation"
            value={currentWord?.meaning || ''}
            onChangeText={(value) => onUpdateWord(currentIndex, 'meaning', value)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.focusInput, styles.notesInput]}
            placeholder="Add context, pronunciation, or memory aids"
            value={currentWord?.notes || ''}
            onChangeText={(value) => onUpdateWord(currentIndex, 'notes', value)}
            multiline
            numberOfLines={3}
          />
        </View>
      </ScrollView>

      <View style={styles.focusNavigation}>
        <TouchableOpacity
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
          onPress={onPrevious}
          disabled={currentIndex === 0}
        >
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
            ← Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={onNext}>
          <Text style={styles.navButtonText}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

interface FullPageModeProps {
  words: WordEntry[]
  onUpdateWord: (index: number, field: keyof WordEntry, value: string) => void
  onAddWord: () => void
  onRemoveWord: (index: number) => void
  maxWords: number
  styles: any
}

function FullPageMode({ words, onUpdateWord, onAddWord, onRemoveWord, maxWords, styles }: FullPageModeProps) {
  return (
    <ScrollView style={styles.fullPageContainer} showsVerticalScrollIndicator={false}>
      {words.map((word, index) => (
        <View key={index} style={styles.wordRow}>
          <View style={styles.wordRowHeader}>
            <Text style={styles.wordRowNumber}>{index + 1}</Text>
            {words.length > 1 && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveWord(index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.wordRowContent}>
            <View style={styles.rowInputGroup}>
              <Text style={styles.rowInputLabel}>Word</Text>
              <TextInput
                style={styles.rowInput}
                placeholder="Vocabulary word"
                value={word.word}
                onChangeText={(value) => onUpdateWord(index, 'word', value)}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.rowInputGroup}>
              <Text style={styles.rowInputLabel}>Meaning</Text>
              <TextInput
                style={styles.rowInput}
                placeholder="Translation or meaning"
                value={word.meaning}
                onChangeText={(value) => onUpdateWord(index, 'meaning', value)}
              />
            </View>

            <View style={styles.rowInputGroup}>
              <Text style={styles.rowInputLabel}>Notes</Text>
              <TextInput
                style={styles.rowInput}
                placeholder="Optional notes"
                value={word.notes}
                onChangeText={(value) => onUpdateWord(index, 'notes', value)}
              />
            </View>
          </View>
        </View>
      ))}

      {words.length < maxWords ? (
        <TouchableOpacity style={styles.addWordButton} onPress={onAddWord}>
          <Text style={styles.addWordButtonText}>+ Add Another Word ({words.length}/{maxWords})</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.addWordButton, styles.addWordButtonDisabled]}>
          <Text style={[styles.addWordButtonText, styles.addWordButtonTextDisabled]}>
            Word Limit Reached ({words.length}/{maxWords})
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    width: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  notebookTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  progressContainer: {
    alignItems: 'center',
    width: 120,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.gray200,
    borderRadius: 2,
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: RADIUS.md,
    padding: 2,
    width: 100,
  },
  modeButton: {
    flex: 1,
    paddingVertical: SPACING.xs,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.cardBackground,
    ...SHADOWS.sm,
  },
  modeButtonText: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  modeButtonTextActive: {
    color: colors.textPrimary,
  },
  
  // Focus Mode Styles
  focusContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  focusHeader: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  focusTitle: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  focusSubtitle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  focusContent: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: SPACING['2xl'],
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  focusInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.base,
    backgroundColor: colors.cardBackground,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  focusNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    gap: SPACING.lg,
  },
  navButton: {
    flex: 1,
    backgroundColor: colors.gray100,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: colors.cardBackground,
  },
  navButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
  },
  navButtonTextDisabled: {
    color: colors.textLight,
  },

  // Full Page Mode Styles
  fullPageContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  wordRow: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
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
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: RADIUS.lg,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.error,
  },
  wordRowContent: {
    gap: SPACING.md,
  },
  rowInputGroup: {
    marginBottom: SPACING.xs,
  },
  rowInputLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  rowInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.sm,
    backgroundColor: colors.cardBackground,
  },
  addWordButton: {
    backgroundColor: colors.gray100,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addWordButtonText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.medium,
  },
  addWordButtonDisabled: {
    backgroundColor: colors.gray200,
    opacity: 0.6,
  },
  addWordButtonTextDisabled: {
    color: colors.textSecondary,
  },

  // Save Button
  saveContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
  },
})