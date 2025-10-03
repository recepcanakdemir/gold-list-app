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
  Modal,
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

interface SavedWord {
  id: string
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
  
  // New state for List Mode redesign
  const [currentWordForm, setCurrentWordForm] = useState<WordEntry>({ word: '', meaning: '', notes: '' })
  const [savedWords, setSavedWords] = useState<SavedWord[]>([])
  const [editingWordId, setEditingWordId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // New state for overlay modal
  const [showAddWordModal, setShowAddWordModal] = useState(false)
  
  const styles = createStyles(colors)

  useEffect(() => {
    loadNotebook()
  }, [id])

  useEffect(() => {
    if (notebook) {
      checkPageStatus()
    }
  }, [notebook])

  // Sync words between Focus and List modes
  useEffect(() => {
    if (mode === 'focus') {
      syncFocusToListMode()
    } else {
      syncListToFocusMode()
    }
  }, [words, savedWords, mode])

  const syncFocusToListMode = () => {
    const filledFocusWords = words.filter(w => w.word.trim() && w.meaning.trim())
    
    // Convert focus words to saved words format
    const focusWordsAsSaved = filledFocusWords.map((word, index) => ({
      id: `focus-${index}-${word.word}-${word.meaning}`,
      word: word.word.trim(),
      meaning: word.meaning.trim(),
      notes: word.notes.trim()
    }))

    // Only update if there's a meaningful difference
    const currentSavedWordsString = JSON.stringify(savedWords.map(w => ({word: w.word, meaning: w.meaning, notes: w.notes})))
    const focusWordsString = JSON.stringify(focusWordsAsSaved.map(w => ({word: w.word, meaning: w.meaning, notes: w.notes})))
    
    if (currentSavedWordsString !== focusWordsString) {
      setSavedWords(focusWordsAsSaved)
    }
  }

  const syncListToFocusMode = () => {
    if (savedWords.length === 0) return

    const maxWords = notebook?.words_per_day || 20
    
    // Create new words array with saved words + empty slots
    const syncedWords = Array.from({ length: maxWords }, (_, index) => {
      if (index < savedWords.length) {
        const savedWord = savedWords[index]
        return {
          word: savedWord.word,
          meaning: savedWord.meaning,
          notes: savedWord.notes
        }
      }
      return { word: '', meaning: '', notes: '' }
    })

    // Only update if there's a meaningful difference
    const currentWordsString = JSON.stringify(words.map(w => ({word: w.word, meaning: w.meaning, notes: w.notes})))
    const syncedWordsString = JSON.stringify(syncedWords.map(w => ({word: w.word, meaning: w.meaning, notes: w.notes})))
    
    if (currentWordsString !== syncedWordsString) {
      setWords(syncedWords)
    }
  }

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
    const maxWords = notebook?.words_per_day || 20
    const initialWords: WordEntry[] = Array.from({ length: maxWords }, () => ({
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
      const maxWords = notebook?.words_per_day || 20
      if (words.length < maxWords) {
        addNewWord()
        setCurrentIndex(words.length)
      } else {
        Alert.alert('Word Limit Reached', `You can only add ${maxWords} words per day according to your notebook settings.`)
      }
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleSave = async () => {
    let wordsToSave: any[] = []
    
    if (mode === 'focus') {
      const filledWords = words.filter(w => w.word.trim() && w.meaning.trim())
      wordsToSave = filledWords.map((word, index) => ({
        word: word.word.trim(),
        translation: word.meaning.trim(),
        meaning: word.meaning.trim(),
        notes: word.notes.trim() || undefined,
        position_in_page: index + 1,
      }))
    } else {
      // List mode - use savedWords
      wordsToSave = savedWords.map((word, index) => ({
        word: word.word.trim(),
        translation: word.meaning.trim(),
        meaning: word.meaning.trim(),
        notes: word.notes.trim() || undefined,
        position_in_page: index + 1,
      }))
    }
    
    if (wordsToSave.length === 0) {
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

      if (wordsToSave.length > availableSlots) {
        Alert.alert(
          'Word Limit Exceeded', 
          `This page can only hold ${availableSlots} more words (${currentWordsOnPage}/${maxWordsPerDay} already added). Please remove ${wordsToSave.length - availableSlots} words.`
        )
        setLoading(false)
        return
      }
      
      // Add words to the current page
      await supabaseService.addWords(currentPage.id, wordsToSave)

      // Refresh the app data to update profile stats
      await refreshNotebooks()

      Alert.alert(
        'Success!',
        `Added ${wordsToSave.length} words to your notebook. They'll be ready for review in 2 weeks.`,
        [
          {
            text: 'Add More Words',
            onPress: () => {
              if (mode === 'focus') {
                initializeWords()
                setCurrentIndex(0)
              } else {
                setSavedWords([])
                setCurrentWordForm({ word: '', meaning: '', notes: '' })
                setEditingWordId(null)
              }
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
    if (mode === 'focus') {
      const filledWords = words.filter(w => w.word.trim() && w.meaning.trim()).length
      const target = notebook?.words_per_day || 20
      return Math.min(filledWords / target, 1)
    } else {
      const target = notebook?.words_per_day || 20
      return Math.min(savedWords.length / target, 1)
    }
  }

  // New functions for List Mode form-based approach
  const handleSaveCurrentWord = () => {
    if (!currentWordForm.word.trim() || !currentWordForm.meaning.trim()) {
      Alert.alert('Incomplete Word', 'Please enter both word and meaning before saving.')
      return
    }

    const maxWords = notebook?.words_per_day || 20
    if (savedWords.length >= maxWords && !editingWordId) {
      Alert.alert('Word Limit Reached', `You can only add ${maxWords} words per day according to your notebook settings.`)
      return
    }

    if (editingWordId) {
      // Update existing word
      setSavedWords(prev => prev.map(word => 
        word.id === editingWordId 
          ? { ...word, ...currentWordForm }
          : word
      ))
      setEditingWordId(null)
    } else {
      // Add new word
      const newWord: SavedWord = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        ...currentWordForm
      }
      setSavedWords(prev => [...prev, newWord])
    }

    // Clear form
    setCurrentWordForm({ word: '', meaning: '', notes: '' })
  }

  const handleEditWord = (wordId: string) => {
    const wordToEdit = savedWords.find(w => w.id === wordId)
    if (wordToEdit) {
      setCurrentWordForm({
        word: wordToEdit.word,
        meaning: wordToEdit.meaning,
        notes: wordToEdit.notes
      })
      setEditingWordId(wordId)
      setShowAddWordModal(true)
    }
  }

  const handleCancelEdit = () => {
    setCurrentWordForm({ word: '', meaning: '', notes: '' })
    setEditingWordId(null)
    setShowAddWordModal(false)
  }

  const handleSaveAndClose = () => {
    handleSaveCurrentWord()
    // Always close modal after saving
    setShowAddWordModal(false)
    // Clear form for next use
    setCurrentWordForm({ word: '', meaning: '', notes: '' })
    setEditingWordId(null)
  }

  const handleDeleteWord = (wordId: string) => {
    Alert.alert(
      'Delete Word',
      'Are you sure you want to delete this word?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setSavedWords(prev => prev.filter(w => w.id !== wordId))
            if (editingWordId === wordId) {
              handleCancelEdit()
            }
          }
        }
      ]
    )
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.notebookTitle}>{notebook.title}</Text>
          </View>

          <View style={styles.headerRight}>
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
            
            <TouchableOpacity
              style={[styles.headerSaveButton, loading && styles.headerSaveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.headerSaveButtonText}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar - Now below header */}
        <View style={styles.progressSection}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {mode === 'focus' 
                ? words.filter(w => w.word.trim() && w.meaning.trim()).length 
                : savedWords.length
              } / {notebook.words_per_day}
            </Text>
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
            maxWords={notebook?.words_per_day || 20}
            styles={styles}
          />
        ) : (
          <NewListMode
            currentWordForm={currentWordForm}
            setCurrentWordForm={setCurrentWordForm}
            savedWords={savedWords}
            editingWordId={editingWordId}
            maxWords={notebook?.words_per_day || 20}
            onSaveWord={handleSaveCurrentWord}
            onEditWord={handleEditWord}
            onCancelEdit={handleCancelEdit}
            onDeleteWord={handleDeleteWord}
            formLoading={formLoading}
            styles={styles}
          />
        )}

        {/* Floating Add Button - Only in List Mode */}
        {mode === 'fullpage' && (
          <TouchableOpacity
            style={[
              styles.floatingAddButton, 
              savedWords.length >= (notebook?.words_per_day || 20) && styles.floatingAddButtonDisabled
            ]}
            onPress={savedWords.length >= (notebook?.words_per_day || 20) ? undefined : () => setShowAddWordModal(true)}
            disabled={savedWords.length >= (notebook?.words_per_day || 20)}
          >
            <Text style={[
              styles.floatingAddButtonText,
              savedWords.length >= (notebook?.words_per_day || 20) && styles.floatingAddButtonTextDisabled
            ]}>
              {savedWords.length >= (notebook?.words_per_day || 20) ? '✓' : '+'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Add Word Modal */}
        <Modal
          visible={showAddWordModal}
          animationType="fade"
          transparent={true}
        >
          <AddWordModal
            currentWordForm={currentWordForm}
            setCurrentWordForm={setCurrentWordForm}
            savedWords={savedWords}
            editingWordId={editingWordId}
            maxWords={notebook?.words_per_day || 20}
            onSaveWord={handleSaveAndClose}
            onEditWord={handleEditWord}
            onCancelEdit={handleCancelEdit}
            onDeleteWord={handleDeleteWord}
            formLoading={formLoading}
            onClose={() => setShowAddWordModal(false)}
            colors={colors}
          />
        </Modal>
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
  maxWords: number
  styles: any
}

function FocusMode({ words, currentIndex, onUpdateWord, onNext, onPrevious, maxWords, styles }: FocusModeProps) {
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

        <TouchableOpacity 
          style={[styles.navButton, words.length >= maxWords && currentIndex === words.length - 1 && styles.navButtonDisabled]} 
          onPress={onNext}
          disabled={words.length >= maxWords && currentIndex === words.length - 1}
        >
          <Text style={[styles.navButtonText, words.length >= maxWords && currentIndex === words.length - 1 && styles.navButtonTextDisabled]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

interface NewListModeProps {
  currentWordForm: WordEntry
  setCurrentWordForm: (form: WordEntry) => void
  savedWords: SavedWord[]
  editingWordId: string | null
  maxWords: number
  onSaveWord: () => void
  onEditWord: (wordId: string) => void
  onCancelEdit: () => void
  onDeleteWord: (wordId: string) => void
  formLoading: boolean
  styles: any
}

function NewListMode({ 
  currentWordForm, 
  setCurrentWordForm, 
  savedWords, 
  editingWordId, 
  maxWords, 
  onSaveWord, 
  onEditWord, 
  onCancelEdit, 
  onDeleteWord, 
  formLoading, 
  styles 
}: NewListModeProps) {
  return (
    <ScrollView 
      style={styles.fullPageContainer} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollViewContent}
    >
      {/* Saved Words List */}
      {savedWords.length > 0 ? (
        <View style={styles.savedWordsContainer}>
          <View style={styles.savedWordsHeader}>
            <Text style={styles.savedWordsTitle}>
              Your Words ({savedWords.length}/{maxWords})
            </Text>
          </View>

          {savedWords.map((word, index) => (
            <View key={word.id} style={styles.savedWordItem}>
              <View style={styles.savedWordItemHeader}>
                <Text style={styles.savedWordNumber}>{index + 1}</Text>
                <View style={styles.savedWordActions}>
                  <TouchableOpacity
                    style={styles.editWordButton}
                    onPress={() => onEditWord(word.id)}
                  >
                    <Text style={styles.editWordButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteWordButton}
                    onPress={() => onDeleteWord(word.id)}
                  >
                    <Text style={styles.deleteWordButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.savedWordContent}>
                {/* Word Section */}
                <View style={styles.wordSectionContent}>
                  <Text style={styles.wordText}>{word.word}</Text>
                </View>

                {/* Meaning Section */}
                <View style={styles.meaningSectionContent}>
                  <Text style={styles.meaningText}>{word.meaning}</Text>
                </View>

                {/* Notes Section - only if notes exist */}
                {word.notes && (
                  <View style={styles.notesSectionContent}>
                    <Text style={styles.notesText}>{word.notes}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : (
        /* Empty State */
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No words added yet</Text>
          <Text style={styles.emptyStateText}>Tap the + button to add your first vocabulary word</Text>
        </View>
      )}
    </ScrollView>
  )
}

interface AddWordModalProps {
  currentWordForm: WordEntry
  setCurrentWordForm: (form: WordEntry) => void
  savedWords: SavedWord[]
  editingWordId: string | null
  maxWords: number
  onSaveWord: () => void
  onEditWord: (wordId: string) => void
  onCancelEdit: () => void
  onDeleteWord: (wordId: string) => void
  formLoading: boolean
  onClose: () => void
  colors: any
}

function AddWordModal({
  currentWordForm,
  setCurrentWordForm,
  savedWords,
  editingWordId,
  maxWords,
  onSaveWord,
  onEditWord,
  onCancelEdit,
  onDeleteWord,
  formLoading,
  onClose,
  colors
}: AddWordModalProps) {
  const styles = createStyles(colors)

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity 
        style={styles.modalBackground}
        onPress={onClose}
        activeOpacity={1}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalCenterContainer}
      >
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseButton}>×</Text>
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Add New Word</Text>
            
            <View style={styles.modalHeaderSpacer} />
          </View>

          {/* Word Form */}
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.modalWordForm}>
              <View style={styles.rowInputGroup}>
                <Text style={styles.rowInputLabel}>Word</Text>
                <TextInput
                  style={styles.rowInput}
                  placeholder="Vocabulary word"
                  value={currentWordForm.word}
                  onChangeText={(value) => setCurrentWordForm({ ...currentWordForm, word: value })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.rowInputGroup}>
                <Text style={styles.rowInputLabel}>Meaning</Text>
                <TextInput
                  style={styles.rowInput}
                  placeholder="Translation or meaning"
                  value={currentWordForm.meaning}
                  onChangeText={(value) => setCurrentWordForm({ ...currentWordForm, meaning: value })}
                />
              </View>

              <View style={styles.rowInputGroup}>
                <Text style={styles.rowInputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.rowInput}
                  placeholder="Context, pronunciation, memory aids"
                  value={currentWordForm.notes}
                  onChangeText={(value) => setCurrentWordForm({ ...currentWordForm, notes: value })}
                  multiline={true}
                  numberOfLines={2}
                />
              </View>

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalSaveButton, formLoading && styles.saveWordButtonDisabled]}
                  onPress={onSaveWord}
                  disabled={formLoading}
                >
                  <Text style={styles.modalSaveButtonText}>
                    {formLoading ? 'Saving...' : editingWordId ? 'Update Word' : 'Save Word'}
                  </Text>
                </TouchableOpacity>

                {editingWordId && (
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={onCancelEdit}
                  >
                    <Text style={styles.modalCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>

            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
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
  cancelButtonText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    width: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  notebookTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  
  // Progress Section - Now separate from header
  progressSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: 4,
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  
  // Mode Toggle and Header Save Button
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: RADIUS.md,
    padding: 2,
    width: 100,
  },
  headerSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    minWidth: 60,
    alignItems: 'center',
  },
  headerSaveButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  headerSaveButtonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
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
  scrollViewContent: {
    paddingBottom: SPACING['4xl'], // Extra padding for keyboard space
    flexGrow: 1,
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

  // New List Mode Styles
  wordFormContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  wordFormHeader: {
    marginBottom: SPACING.md,
  },
  wordFormTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
    textAlign: 'center',
  },
  wordFormContent: {
    gap: SPACING.md,
  },
  wordFormActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  saveWordButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  saveWordButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  saveWordButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.cardBackground,
  },
  cancelButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonTextStyle: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },

  // Saved Words List Styles - Redesigned with Color Coding
  savedWordsContainer: {
    marginBottom: SPACING.lg,
  },
  savedWordsHeader: {
    marginBottom: SPACING.md,
  },
  savedWordsTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  savedWordItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  // Header with number and actions
  savedWordItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  savedWordNumber: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    backgroundColor: colors.primaryLight || colors.gray100,
    width: 32,
    height: 32,
    textAlign: 'center',
    textAlignVertical: 'center',
    borderRadius: 16,
    lineHeight: 32,
  },
  savedWordActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  editWordButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  editWordButtonText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.cardBackground,
    fontWeight: TYPOGRAPHY.medium,
  },
  deleteWordButton: {
    backgroundColor: colors.error,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    width: 32,
    alignItems: 'center',
  },
  deleteWordButtonText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.cardBackground,
    fontWeight: TYPOGRAPHY.bold,
  },
  
  // Content with color-coded sections
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
  
  // Meaning Section (Modern Green theme) - Clean and readable
  meaningSectionContent: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  meaningText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: '#2D3748',
  },
  
  // Notes Section (Modern Purple theme) - Clean and readable
  notesSectionContent: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  notesText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: '#4A5568',
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['4xl'],
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.base * 1.4,
  },

  // Floating Add Button
  floatingAddButton: {
    position: 'absolute',
    bottom: SPACING['2xl'],
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingAddButtonText: {
    fontSize: 24,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.cardBackground,
  },
  floatingAddButtonDisabled: {
    backgroundColor: colors.gray300 || '#D1D5DB',
    opacity: 0.8,
  },
  floatingAddButtonTextDisabled: {
    color: colors.gray500 || '#6B7280',
  },

  // Modal Styles - Centered Popup
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalCenterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: '90%',
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    width: '100%',
    maxHeight: '100%',
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseButton: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.bold,
    width: 30,
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  modalHeaderSpacer: {
    width: 30,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalWordForm: {
    padding: SPACING.lg,
  },
  modalButtonContainer: {
    marginTop: SPACING.lg,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
  },
  modalCancelButton: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  modalCancelButtonText: {
    fontSize: TYPOGRAPHY.sm,
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