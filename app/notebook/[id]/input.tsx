import { LoadingIndicator } from '@/components/LoadingIndicator'
import { StreakAnimation } from '@/components/StreakAnimation'
import { RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '@/lib/constants/design'
import { useApp } from '@/lib/contexts/AppContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { geminiService } from '@/lib/services/geminiService'
import { supabaseService } from '@/lib/services/supabaseService'
import { translationService } from '@/lib/services/translationService'
import { NotebookWithStats } from '@/lib/types/goldlist'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface WordEntry {
  word: string
  meaning: string
  notes: string
  word_type?: string
  example_sentence?: string
  sentence_bold?: string
  sentence_meaning?: string
  meaning_bold?: string
  ai_generated?: boolean
  // New fields for tracking state
  id?: string          // Database ID for existing words
  isExisting?: boolean // True if word was loaded from database
  isDirty?: boolean    // True if existing word has been modified
  position_in_page?: number // Original position for existing words
}

interface SavedWord {
  id: string
  word: string
  meaning: string
  notes: string
  word_type?: string
  example_sentence?: string
  sentence_bold?: string
  sentence_meaning?: string
  meaning_bold?: string
  ai_generated?: boolean
  // State tracking fields (same as WordEntry)
  isExisting?: boolean 
  isDirty?: boolean
}

export default function WordInputScreen() {
  const router = useRouter()
  const { id, page: pageParam } = useLocalSearchParams<{ id: string; page?: string }>()
  const { colors } = useTheme()
  const { refreshNotebooks, updateNotebookLastUsed } = useApp()
  const { recordUserActivity, profile } = useAuth()
  const { currentSimulatedDay } = useDevTime()
  const [notebook, setNotebook] = useState<NotebookWithStats | null>(null)
  const [mode, setMode] = useState<'focus' | 'fullpage'>('focus')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [words, setWords] = useState<WordEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [existingWordCount, setExistingWordCount] = useState(0)
  const [existingWords, setExistingWords] = useState<any[]>([])
  
  // New state for List Mode redesign
  const [currentWordForm, setCurrentWordForm] = useState<WordEntry>({ 
    word: '', 
    meaning: '', 
    notes: '', 
    word_type: 'unknown',
    example_sentence: '',
    sentence_bold: '',
    sentence_meaning: '',
    meaning_bold: '',
    ai_generated: false
  })
  const [savedWords, setSavedWords] = useState<SavedWord[]>([])
  const [editingWordId, setEditingWordId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  
  // New state for overlay modal
  const [showAddWordModal, setShowAddWordModal] = useState(false)
  
  // Streak animation state
  const [showStreakAnimation, setShowStreakAnimation] = useState(false)
  const [previousStreakCount, setPreviousStreakCount] = useState(0)
  
  // AI sentence generation state - now supports unlimited generation
  const [aiGenerationStates, setAiGenerationStates] = useState<Map<string, boolean>>(new Map()) // Track loading state per word
  
  // Translation state - track loading state per word
  const [translationLoadingStates, setTranslationLoadingStates] = useState<Map<string, boolean>>(new Map())
  
  // Animated progress value for smooth transitions
  const [animatedProgress] = useState(new Animated.Value(0))

  // Validation helpers - Only word and meaning are required
  const isWordValid = useCallback((word: string) => {
    return (word || '').trim().length > 0
  }, [])

  const isMeaningValid = useCallback((meaning: string) => {
    return (meaning || '').trim().length > 0
  }, [])

  const hasRequiredFields = useCallback((wordEntry: WordEntry) => {
    return isWordValid(wordEntry.word) && isMeaningValid(wordEntry.meaning)
  }, [isWordValid, isMeaningValid])

  const getValidationErrors = useCallback((wordEntry: WordEntry) => {
    const errors: string[] = []
    if (!isWordValid(wordEntry.word)) {
      errors.push('Word is required')
    }
    if (!isMeaningValid(wordEntry.meaning)) {
      errors.push('Meaning is required')
    }
    return errors
  }, [isWordValid, isMeaningValid])

  const isWordEntryComplete = useCallback((entry: WordEntry) => {
    return isWordValid(entry.word) && isMeaningValid(entry.meaning)
  }, [isWordValid, isMeaningValid])

  // Focus mode validation
  const isCurrentWordComplete = useMemo(() => {
    if (mode === 'focus' && words[currentIndex]) {
      return isWordEntryComplete(words[currentIndex])
    }
    return false
  }, [mode, words, currentIndex, isWordEntryComplete])

  // Focus mode navigation logic
  const canGoNext = isCurrentWordComplete && (currentIndex < words.length - 1 || words.length < (notebook?.words_per_day || 20))
  const canSave = words.some(w => (w.word || '').trim() && (w.meaning || '').trim())

  // List mode validation
  const isCurrentFormComplete = useMemo(() => {
    return isWordEntryComplete(currentWordForm)
  }, [currentWordForm, isWordEntryComplete])

  // AI Generation Functions
  const getWordKey = useCallback((word: string, meaning: string) => {
    return `${(word?.trim() || '').toLowerCase()}-${(meaning?.trim() || '').toLowerCase()}`
  }, [])

  const generateAISentence = useCallback(async (word: string, meaning: string, wordIndex: number) => {
    if (!word?.trim() || !meaning?.trim()) {
      Alert.alert('Required Fields Missing', 'Please enter both word and meaning before generating a sentence.')
      return
    }

    const key = getWordKey(word, meaning)
    
    // Set loading state
    setAiGenerationStates(prev => new Map(prev.set(key, true)))

    try {
      const request = {
        word: word?.trim() || '',
        translation: meaning?.trim() || '',
        targetLanguage: notebook?.language || 'English',
        nativeLanguage: 'English', // Could be made configurable later
        difficultyLevel: 'intermediate' as const
      }

      console.log(`🤖 Generating unlimited sentence for "${word}" → "${meaning}"`)
      const result = await geminiService.generateSentences(request)
      
      console.log(`🔍 CLIENT DEBUG - AI Generation Result:`, JSON.stringify(result, null, 2))
      
      // Update the specific word in the list with both sentence and meaning
      setWords(prevWords => {
        const newWords = [...prevWords]
        if (newWords[wordIndex]) {
          newWords[wordIndex] = {
            ...newWords[wordIndex],
            example_sentence: result.sentence,
            sentence_bold: result.sentenceBold,
            sentence_meaning: result.sentenceMeaning,
            meaning_bold: result.meaningBold,
            ai_generated: true
          }
          console.log(`🔍 CLIENT DEBUG - Updated word data:`, JSON.stringify(newWords[wordIndex], null, 2))
        }
        return newWords
      })

      console.log(`✅ Generated sentence: "${result.sentence}" with meaning: "${result.sentenceMeaning}"`)
      return result.sentence
    } catch (error) {
      console.error('AI generation error:', error)
      
      // Since geminiService now handles retries and fallbacks gracefully,
      // this catch block should rarely be reached. If it is, the service
      // has already provided a fallback sentence, so we just log the issue.
      
      // Don't show technical errors to users - the service handles fallbacks
      console.log('🔄 Using service fallback sentence due to persistent issues')
    } finally {
      // Clear loading state
      setAiGenerationStates(prev => new Map(prev.set(key, false)))
    }
  }, [notebook?.language, getWordKey])


  const getAiState = useCallback((word: string, meaning: string) => {
    const key = getWordKey(word, meaning)
    return aiGenerationStates.get(key) || false
  }, [getWordKey, aiGenerationStates])

  // Translation Functions
  const translateWord = useCallback(async (word: string, wordIndex: number) => {
    if (!word?.trim()) {
      Alert.alert('No Word to Translate', 'Please enter a word before translating.')
      return
    }

    const key = getWordKey(word, '')
    
    // Set loading state
    setTranslationLoadingStates(prev => new Map(prev.set(key, true)))

    try {
      const request = {
        word: word.trim(),
        sourceLanguage: notebook?.language || 'French',
        targetLanguage: 'English' // Could be made configurable later
      }

      console.log(`🌐 Translating word "${word}" from ${request.sourceLanguage} to ${request.targetLanguage}`)
      const translation = await translationService.translateWord(request)
      
      // Update the specific word's meaning with the translation
      setWords(prevWords => {
        const newWords = [...prevWords]
        if (newWords[wordIndex]) {
          newWords[wordIndex] = {
            ...newWords[wordIndex],
            meaning: translation
          }
        }
        return newWords
      })

      console.log(`✅ Translated "${word}" → "${translation}"`)
      return translation

    } catch (error) {
      console.error('Translation error:', error)
      
      // Show the specific error message from translationService
      if (error instanceof Error) {
        Alert.alert('Translation Error', error.message)
      } else {
        Alert.alert('Translation Failed', 'Failed to translate word. Please try again or enter meaning manually.')
      }
    } finally {
      // Clear loading state
      setTranslationLoadingStates(prev => new Map(prev.set(key, false)))
    }
  }, [notebook?.language, getWordKey])

  const getTranslationState = useCallback((word: string) => {
    const key = getWordKey(word, '')
    return translationLoadingStates.get(key) || false
  }, [getWordKey, translationLoadingStates])

  // Dedicated translation function for List mode modal
  const translateWordInModal = useCallback(async (word: string): Promise<void> => {
    if (!word?.trim()) {
      Alert.alert('No Word to Translate', 'Please enter a word before translating.')
      return
    }

    const key = getWordKey(word, '')
    
    // Set loading state
    setTranslationLoadingStates(prev => new Map(prev.set(key, true)))

    try {
      const request = {
        word: word.trim(),
        sourceLanguage: notebook?.language || 'French',
        targetLanguage: 'English' // Could be made configurable later
      }

      console.log(`🌐 Translating word "${word}" from ${request.sourceLanguage} to ${request.targetLanguage} in modal`)
      const translation = await translationService.translateWord(request)
      
      // Update the current word form's meaning with the translation
      setCurrentWordForm(prev => ({
        ...prev,
        meaning: translation
      }))

      console.log(`✅ Translated "${word}" → "${translation}" in modal`)

    } catch (error) {
      console.error('Translation error in modal:', error)
      
      // Show the specific error message from translationService
      if (error instanceof Error) {
        Alert.alert('Translation Error', error.message)
      } else {
        Alert.alert('Translation Failed', 'Failed to translate word. Please try again or enter meaning manually.')
      }
    } finally {
      // Clear loading state
      setTranslationLoadingStates(prev => new Map(prev.set(key, false)))
    }
  }, [notebook?.language, getWordKey, setCurrentWordForm])
  
  const styles = createStyles(colors)

  useEffect(() => {
    loadNotebook()
  }, [id])

  // Track streak changes for animation
  useEffect(() => {
    if (profile?.streak_count && profile.streak_count > previousStreakCount && previousStreakCount > 0) {
      // Streak increased, show animation
      setShowStreakAnimation(true)
    }
    if (profile?.streak_count !== undefined) {
      setPreviousStreakCount(profile.streak_count)
    }
  }, [profile?.streak_count, previousStreakCount])

  // Animate progress changes smoothly
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress * 100,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [progress, animatedProgress])

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
    const filledFocusWords = words.filter(w => w.word?.trim() && w.meaning?.trim())
    
    // Convert all filled words (existing + new) to saved words format
    const focusWordsAsSaved = filledFocusWords.map((word, index) => ({
      id: word.id || `focus-${index}-${word.word}-${word.meaning}`, // Use real ID for existing words
      word: word.word?.trim() || '',
      meaning: word.meaning?.trim() || '',
      notes: word.notes?.trim() || '',
      word_type: word.word_type || 'unknown',
      example_sentence: word.example_sentence || '',
      sentence_bold: word.sentence_bold || '',
      sentence_meaning: word.sentence_meaning || '',
      meaning_bold: word.meaning_bold || '',
      ai_generated: word.ai_generated || false,
      // Add state tracking for List mode
      isExisting: word.isExisting,
      isDirty: word.isDirty
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
    
    // Create new words array with saved words + empty slots, preserving full state
    const syncedWords = Array.from({ length: maxWords }, (_, index) => {
      if (index < savedWords.length) {
        const savedWord = savedWords[index]
        return {
          word: savedWord.word || '',
          meaning: savedWord.meaning || '',
          notes: savedWord.notes || '',
          word_type: savedWord.word_type || 'unknown',
          example_sentence: savedWord.example_sentence || '',
          sentence_bold: savedWord.sentence_bold || '',
          sentence_meaning: savedWord.sentence_meaning || '',
          meaning_bold: savedWord.meaning_bold || '',
          ai_generated: savedWord.ai_generated || false,
          // Preserve state tracking fields
          id: savedWord.id,
          isExisting: savedWord.isExisting || false,
          isDirty: savedWord.isDirty || false,
          position_in_page: index + 1
        }
      }
      // Empty slot for new words
      return { 
        word: '', 
        meaning: '', 
        notes: '', 
        word_type: 'unknown',
        example_sentence: '',
        sentence_meaning: '',
        ai_generated: false,
        isExisting: false,
        isDirty: false,
        position_in_page: index + 1
      }
    })

    // Only update if there's a meaningful difference (check all relevant fields)
    const currentWordsString = JSON.stringify(words.map(w => ({
      word: w.word, 
      meaning: w.meaning, 
      notes: w.notes,
      id: w.id,
      isExisting: w.isExisting,
      isDirty: w.isDirty
    })))
    const syncedWordsString = JSON.stringify(syncedWords.map(w => ({
      word: w.word, 
      meaning: w.meaning, 
      notes: w.notes,
      id: w.id,
      isExisting: w.isExisting,
      isDirty: w.isDirty
    })))
    
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
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back()
        } else {
          router.push('/(tabs)/')
        }
      }, 100)
    }
  }

  const checkPageStatus = async () => {
    try {
      const pageNumber = pageParam ? parseInt(pageParam) : 1
      
      // Check if this page already has words
      const pages = await supabaseService.getPages(id!)
      const currentPage = pages.find(p => p.page_number === pageNumber)
      
      // Check if page is actually completed (at word limit) before blocking
      const dailyWordLimit = notebook?.words_per_day || 20
      const currentWordCount = currentPage?.words?.length || 0
      
      // Store existing word count and words for position calculation and display
      setExistingWordCount(currentWordCount)
      setExistingWords(currentPage?.words || [])
      
      if (currentWordCount >= dailyWordLimit) {
        // Page has reached word limit - show proper completion message
        Alert.alert(
          'Page Complete!',
          `This page has reached its daily word limit (${currentWordCount}/${dailyWordLimit} words). Come back in 14 days for your first review!`,
          [
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
      
      // Page is available for word input - initialize with existing words if any
      initializeWords(currentPage)
    } catch (error) {
      console.error('Error checking page status:', error)
      setExistingWordCount(0) // Reset to 0 for new pages
      setExistingWords([]) // Reset existing words
      initializeWords() // Fallback to normal initialization
    }
  }

  const initializeWords = (existingPage?: any) => {
    const maxWords = notebook?.words_per_day || 20
    const existingWordsFromDB = existingPage?.words || []
    
    // Create unified array: existing words first, then empty slots
    const initialWords: WordEntry[] = []
    
    // Add existing words as editable entries
    existingWordsFromDB.forEach((dbWord: any, index: number) => {
      initialWords.push({
        word: dbWord.word || '',
        meaning: dbWord.meaning || dbWord.translation || '',
        notes: dbWord.notes || '',
        word_type: dbWord.word_type || 'unknown',
        example_sentence: dbWord.example_sentence || '',
        sentence_bold: dbWord.sentence_bold || '',
        sentence_meaning: dbWord.sentence_meaning || '',
        meaning_bold: dbWord.meaning_bold || '',
        ai_generated: dbWord.ai_generated || false,
        // State tracking fields
        id: dbWord.id,
        isExisting: true,
        isDirty: false,
        position_in_page: dbWord.position_in_page || (index + 1)
      })
    })
    
    // Add empty slots for new words
    const remainingSlots = maxWords - existingWordsFromDB.length
    for (let i = 0; i < remainingSlots; i++) {
      initialWords.push({
        word: '',
        meaning: '',
        notes: '',
        word_type: 'unknown',
        example_sentence: '',
        sentence_meaning: '',
        ai_generated: false,
        // State tracking fields
        isExisting: false,
        isDirty: false,
        position_in_page: existingWordsFromDB.length + i + 1
      })
    }
    
    setWords(initialWords)
    
    // Start from the first empty slot, or first word if none are filled
    if (mode === 'focus') {
      const firstEmptyIndex = initialWords.findIndex(w => !w.word.trim())
      setCurrentIndex(firstEmptyIndex >= 0 ? firstEmptyIndex : 0)
    }
  }

  const updateWord = (index: number, field: keyof WordEntry, value: string) => {
    const newWords = [...words]
    const currentWord = newWords[index]
    
    // Update the field
    newWords[index] = { ...currentWord, [field]: value }
    
    // Mark existing words as dirty when modified
    if (currentWord.isExisting) {
      newWords[index].isDirty = true
    }
    
    setWords(newWords)
  }

  const updateWordWithAISentence = (index: number, sentence: string) => {
    const newWords = [...words]
    const currentWord = newWords[index]
    
    newWords[index] = { 
      ...currentWord, 
      example_sentence: sentence,
      ai_generated: true
    }
    
    // Mark existing words as dirty when AI sentence is added
    if (currentWord.isExisting) {
      newWords[index].isDirty = true
    }
    
    setWords(newWords)
  }

  const addNewWord = () => {
    const maxWords = notebook?.words_per_day || 20
    if (words.length < maxWords) {
      setWords([...words, { 
        word: '', 
        meaning: '', 
        notes: '', 
        word_type: 'unknown',
        example_sentence: '',
        sentence_meaning: '',
        ai_generated: false 
      }])
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
    let wordsToUpdate: any[] = []
    
    if (mode === 'focus') {
      // Process words from unified array
      const validWords = words.filter(w => 
        (w.word || '').trim() && (w.meaning || '').trim()
      )
      
      validWords.forEach((word) => {
        const wordData = {
          word: (word.word || '').trim(),
          translation: (word.meaning || '').trim(),
          meaning: (word.meaning || '').trim(),
          example_sentence: (word.example_sentence || '').trim() || undefined,
          sentence_bold: (word.sentence_bold || '').trim() || undefined,
          sentence_meaning: (word.sentence_meaning || '').trim() || undefined,
          meaning_bold: (word.meaning_bold || '').trim() || undefined,
          notes: (word.notes || '').trim() || undefined,
          word_type: word.word_type || 'unknown',
          position_in_page: word.position_in_page || 1,
        }
        
        if (word.isExisting && word.isDirty) {
          // Existing word that has been modified
          wordsToUpdate.push({
            ...wordData,
            id: word.id
          })
        } else if (!word.isExisting) {
          // New word to insert
          wordsToSave.push(wordData)
        }
        // Skip existing words that haven't been modified (no need to save)
      })
    } else {
      // List mode - process savedWords
      const validWords = savedWords.filter(w => 
        (w.word || '').trim() && (w.meaning || '').trim()
      )
      
      validWords.forEach((word, index) => {
        const wordData = {
          word: (word.word || '').trim(),
          translation: (word.meaning || '').trim(),
          meaning: (word.meaning || '').trim(),
          example_sentence: (word.example_sentence || '').trim() || undefined,
          sentence_bold: (word.sentence_bold || '').trim() || undefined,
          sentence_meaning: (word.sentence_meaning || '').trim() || undefined,
          meaning_bold: (word.meaning_bold || '').trim() || undefined,
          notes: (word.notes || '').trim() || undefined,
          word_type: word.word_type || 'unknown',
          position_in_page: index + 1, // List mode uses sequential positioning
        }
        
        if (word.isExisting && word.isDirty) {
          // Existing word that has been modified
          wordsToUpdate.push({
            ...wordData,
            id: word.id
          })
        } else if (!word.isExisting) {
          // New word to insert
          wordsToSave.push(wordData)
        }
      })
    }
    
    // Check if there's anything to save
    if (wordsToSave.length === 0 && wordsToUpdate.length === 0) {
      Alert.alert('No Changes to Save', 'No new words added or existing words modified.')
      return
    }

    // Prepare data for save page - combine new and updated words
    const allWordsForSave = [
      ...wordsToSave,
      ...wordsToUpdate.map(w => ({ ...w, isUpdate: true })) // Flag updates for the save page
    ]

    // Navigate to save page with smart save data
    router.push({
      pathname: '/word-save',
      params: {
        wordsToSave: JSON.stringify(allWordsForSave),
        notebookTitle: notebook?.title || 'Unknown Notebook',
        notebookId: id!
      }
    })
  }

  // Enhanced progress calculation with unified word state
  const progress = useMemo(() => {
    const target = notebook?.words_per_day || 20
    
    if (mode === 'focus') {
      // In focus mode, count all filled words in unified array
      const filledWords = words.filter(w => 
        (w.word || '').trim() && (w.meaning || '').trim()
      ).length
      return Math.min(filledWords / target, 1)
    } else {
      // In list mode, count saved words (which includes existing + new)
      return Math.min(savedWords.length / target, 1)
    }
  }, [mode, words, savedWords, notebook?.words_per_day])

  const filledWordsCount = useMemo(() => {
    const maxWords = notebook?.words_per_day || 20
    
    if (mode === 'focus') {
      // In focus mode, show filled words from unified array
      const filledWords = words.filter(w => 
        (w.word || '').trim() && (w.meaning || '').trim()
      ).length
      return Math.min(filledWords, maxWords)
    } else {
      // In list mode, show saved words count
      return Math.min(savedWords.length, maxWords)
    }
  }, [mode, words, savedWords, notebook?.words_per_day])

  // New functions for List Mode form-based approach
  const handleSaveCurrentWord = () => {
    const validationErrors = getValidationErrors(currentWordForm)
    if (validationErrors.length > 0) {
      Alert.alert('Required Fields Missing', validationErrors.join('\n'))
      return
    }

    const maxWords = notebook?.words_per_day || 20
    if (savedWords.length >= maxWords && !editingWordId) {
      Alert.alert('Word Limit Reached', `You can only add ${maxWords} words per day according to your notebook settings.`)
      return
    }

    // Check for duplicates in saved words (case-insensitive)
    const currentWordText = (currentWordForm.word || '').trim().toLowerCase()
    const savedWordTexts = savedWords
      .filter(w => !editingWordId || w.id !== editingWordId) // Exclude current editing word
      .map(w => (w.word || '').trim().toLowerCase())
    
    if (savedWordTexts.includes(currentWordText)) {
      Alert.alert('Duplicate Word', `"${currentWordForm.word}" is already in your list. Please enter a different word.`)
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
    setCurrentWordForm({ 
      word: '', 
      meaning: '', 
      notes: '', 
      word_type: 'unknown',
      example_sentence: '',
      sentence_meaning: '',
      ai_generated: false
    })
  }

  const handleEditWord = (wordId: string) => {
    const wordToEdit = savedWords.find(w => w.id === wordId)
    if (wordToEdit) {
      setCurrentWordForm({
        word: wordToEdit.word,
        meaning: wordToEdit.meaning,
        notes: wordToEdit.notes,
        word_type: wordToEdit.word_type || 'unknown',
        example_sentence: wordToEdit.example_sentence || '',
        sentence_meaning: wordToEdit.sentence_meaning || '',
        ai_generated: wordToEdit.ai_generated || false
      })
      setEditingWordId(wordId)
      setShowAddWordModal(true)
    }
  }

  const handleCancelEdit = () => {
    setCurrentWordForm({ 
      word: '', 
      meaning: '', 
      notes: '', 
      word_type: 'unknown',
      example_sentence: '',
      sentence_meaning: '',
      ai_generated: false
    })
    setEditingWordId(null)
    setShowAddWordModal(false)
  }

  const handleSaveAndClose = () => {
    handleSaveCurrentWord()
    // Always close modal after saving
    setShowAddWordModal(false)
    // Clear form for next use
    setCurrentWordForm({ 
      word: '', 
      meaning: '', 
      notes: '', 
      word_type: 'unknown',
      example_sentence: '',
      sentence_meaning: '',
      ai_generated: false
    })
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            setTimeout(() => {
              if (router.canGoBack()) {
                router.back()
              } else {
                router.push('/(tabs)/')
              }
            }, 100)
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
              {loading ? (
                <LoadingIndicator size={16} color={colors.cardBackground} />
              ) : (
                <Text style={styles.headerSaveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Progress Bar - Now below header */}
        <View style={styles.progressSection}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progress * 100}%`
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {filledWordsCount} / {notebook.words_per_day}
            </Text>
          </View>
        </View>


        {/* Content Container - fills available space */}
        <View style={styles.mainContent}>
          {mode === 'focus' ? (
            <FocusMode
              words={words}
              currentIndex={currentIndex}
              onUpdateWord={updateWord}
              onUpdateWordWithAISentence={updateWordWithAISentence}
              styles={styles}
              onGenerateAISentence={generateAISentence}
              getAiState={getAiState}
              onTranslateWord={translateWord}
              getTranslationState={getTranslationState}
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
        </View>

        {/* Navigation - Positioned at bottom */}
        {mode === 'focus' && (
          <View style={styles.bottomNavigation}>
            <TouchableOpacity
              style={[
                styles.navButton, 
                styles.navButtonSecondary,
                currentIndex === 0 && styles.navButtonDisabled
              ]}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            >
              <Text style={[
                styles.navButtonText, 
                styles.navButtonSecondaryText,
                currentIndex === 0 && styles.navButtonTextDisabled
              ]}>
                ← Previous
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.navButton, 
                ((currentIndex >= (notebook?.words_per_day || 20) - 1) ? (!canSave || loading) : (!canGoNext || loading)) && styles.navButtonDisabled
              ]} 
              onPress={(currentIndex >= (notebook?.words_per_day || 20) - 1) ? handleSave : handleNext}
              disabled={(currentIndex >= (notebook?.words_per_day || 20) - 1) ? (!canSave || loading) : (!canGoNext || loading)}
            >
              {loading ? (
                <LoadingIndicator size={16} color={colors.cardBackground} />
              ) : (
                <Text style={[
                  styles.navButtonText, 
                  ((currentIndex >= (notebook?.words_per_day || 20) - 1) ? (!canSave || loading) : (!canGoNext || loading)) && styles.navButtonTextDisabled
                ]}>
                  {(currentIndex >= (notebook?.words_per_day || 20) - 1) ? 'Save' : 'Next →'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
            onTranslateWord={translateWordInModal}
            getTranslationState={getTranslationState}
            onGenerateAISentence={async (word: string, meaning: string) => {
              try {
                const request = {
                  word: word?.trim() || '',
                  translation: meaning?.trim() || '',
                  targetLanguage: notebook?.language || 'English',
                  nativeLanguage: 'English',
                  difficultyLevel: 'intermediate' as const
                }
                const result = await geminiService.generateSentences(request)
                setCurrentWordForm(prev => ({
                  ...prev,
                  example_sentence: result.sentence,
                  sentence_bold: result.sentenceBold,
                  sentence_meaning: result.sentenceMeaning,
                  meaning_bold: result.meaningBold,
                  ai_generated: true
                }))
              } catch (error) {
                console.error('AI generation error in modal:', error)
              }
            }}
            getAiState={getAiState}
          />
        </Modal>

        {/* Streak Animation */}
        <StreakAnimation
          streakCount={profile?.streak_count || 0}
          visible={showStreakAnimation}
          onAnimationComplete={() => setShowStreakAnimation(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

interface WordTypeSelectorProps {
  selectedType: string
  onTypeChange: (type: string) => void
  styles: any
}

function WordTypeSelector({ selectedType, onTypeChange, styles }: WordTypeSelectorProps) {
  const wordTypes = [
    { label: 'Verb', value: 'verb' },
    { label: 'Noun', value: 'noun' },
    { label: 'Adj', value: 'adjective' },
    { label: 'Adv', value: 'adverb' },
    { label: 'Other', value: 'other' },
    { label: '?', value: 'unknown' }
  ]

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.wordTypeContainer}
      contentContainerStyle={styles.wordTypeContent}
    >
      {wordTypes.map((type) => (
        <TouchableOpacity
          key={type.value}
          style={[
            styles.wordTypeButton,
            selectedType === type.value && styles.wordTypeButtonActive
          ]}
          onPress={() => onTypeChange(type.value)}
        >
          <Text style={[
            styles.wordTypeButtonText,
            selectedType === type.value && styles.wordTypeButtonTextActive
          ]}>
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

interface FocusModeProps {
  words: WordEntry[]
  currentIndex: number
  onUpdateWord: (index: number, field: keyof WordEntry, value: string) => void
  onUpdateWordWithAISentence: (index: number, sentence: string) => void
  styles: any
  onGenerateAISentence: (word: string, meaning: string) => Promise<string | undefined>
  getAiState: (word: string, meaning: string) => boolean
  onTranslateWord: (word: string, wordIndex: number) => Promise<string | undefined>
  getTranslationState: (word: string) => boolean
}

function FocusMode({ 
  words, 
  currentIndex, 
  onUpdateWord, 
  onUpdateWordWithAISentence, 
  styles,
  onGenerateAISentence,
  getAiState,
  onTranslateWord,
  getTranslationState
}: FocusModeProps) {
  const { colors } = useTheme()
  const currentWord = words[currentIndex]

  return (
    <View style={styles.focusContainer}>
      {/* Word Status Indicator */}
      {currentWord && (
        <View style={styles.wordStatusContainer}>
          <Text style={styles.wordStatusText}>
            Word {currentIndex + 1} of {words.length}
            {currentWord.isExisting && (
              <Text style={styles.existingIndicator}> • Previously Saved</Text>
            )}
            {currentWord.isExisting && currentWord.isDirty && (
              <Text style={styles.modifiedIndicator}> • Modified</Text>
            )}
          </Text>
        </View>
      )}
      
      <ScrollView style={styles.focusContent} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Word Type</Text>
          <WordTypeSelector
            selectedType={currentWord?.word_type || 'unknown'}
            onTypeChange={(type) => onUpdateWord(currentIndex, 'word_type', type)}
            styles={styles}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Word <Text style={styles.requiredAsterisk}>*</Text></Text>
          <TextInput
            style={styles.inlineInput}
            placeholder="Vocabulary word"
            value={currentWord?.word || ''}
            onChangeText={(value) => onUpdateWord(currentIndex, 'word', value)}
            autoCapitalize="none"
            placeholderTextColor={styles.placeholderText?.color}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Definition <Text style={styles.requiredAsterisk}>*</Text></Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.inlineInput, styles.definitionInput]}
              placeholder="Translation or meaning"
              value={currentWord?.meaning || ''}
              onChangeText={(value) => onUpdateWord(currentIndex, 'meaning', value)}
              placeholderTextColor={styles.placeholderText?.color}
            />
            <TouchableOpacity
              style={[
                styles.translateButton,
                (!currentWord?.word?.trim() || getTranslationState(currentWord?.word || '')) && styles.translateButtonDisabled
              ]}
              onPress={() => onTranslateWord(currentWord?.word || '', currentIndex)}
              disabled={!currentWord?.word?.trim() || getTranslationState(currentWord?.word || '')}
            >
              {getTranslationState(currentWord?.word || '') ? (
                <LoadingIndicator size={16} color={colors.cardBackground} />
              ) : (
                <MaterialIcons name="translate" size={16} color={colors.cardBackground} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Sentence Generation Section */}
        <AISentenceSection
          word={currentWord?.word || ''}
          meaning={currentWord?.meaning || ''}
          currentSentence={currentWord?.example_sentence || ''}
          currentSentenceMeaning={currentWord?.sentence_meaning || ''}
          onGenerateSentence={async () => {
            await onGenerateAISentence(currentWord?.word || '', currentWord?.meaning || '', currentIndex)
            // generateAISentence already updates the word state with both sentence and meaning
          }}
          onManualEdit={(sentence) => onUpdateWord(currentIndex, 'example_sentence', sentence)}
          aiState={getAiState(currentWord?.word || '', currentWord?.meaning || '')}
          styles={styles}
        />
      </ScrollView>
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
                <View style={styles.wordNumberContainer}>
                  <Text style={styles.savedWordNumber}>{index + 1}</Text>
                  {word.isExisting && (
                    <Text style={styles.existingBadge}>Saved</Text>
                  )}
                  {word.isExisting && word.isDirty && (
                    <Text style={styles.modifiedBadge}>Modified</Text>
                  )}
                </View>
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
  onTranslateWord: (word: string) => Promise<void>
  getTranslationState: (word: string) => boolean
  onGenerateAISentence: (word: string, meaning: string) => Promise<void>
  getAiState: (word: string, meaning: string) => boolean
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
  colors,
  onTranslateWord,
  getTranslationState,
  onGenerateAISentence,
  getAiState
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
                <Text style={styles.rowInputLabel}>Word Type</Text>
                <WordTypeSelector
                  selectedType={currentWordForm.word_type || 'unknown'}
                  onTypeChange={(type) => setCurrentWordForm({ ...currentWordForm, word_type: type })}
                  styles={styles}
                />
              </View>

              <View style={styles.rowInputGroup}>
                <Text style={styles.rowInputLabel}>Word <Text style={styles.requiredAsterisk}>*</Text></Text>
                <TextInput
                  style={styles.rowInput}
                  placeholder="Vocabulary word"
                  value={currentWordForm.word}
                  onChangeText={(value) => setCurrentWordForm({ ...currentWordForm, word: value })}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.rowInputGroup}>
                <Text style={styles.rowInputLabel}>Definition <Text style={styles.requiredAsterisk}>*</Text></Text>
                <View style={styles.definitionInputContainer}>
                  <TextInput
                    style={[styles.rowInput, styles.definitionInput]}
                    placeholder="Translation or meaning"
                    value={currentWordForm.meaning}
                    onChangeText={(value) => setCurrentWordForm({ ...currentWordForm, meaning: value })}
                  />
                  <TouchableOpacity
                    style={[
                      styles.translateButton,
                      (!currentWordForm.word?.trim() || getTranslationState(currentWordForm.word || '')) && styles.translateButtonDisabled
                    ]}
                    onPress={() => onTranslateWord(currentWordForm.word || '')}
                    disabled={!currentWordForm.word?.trim() || getTranslationState(currentWordForm.word || '')}
                  >
                    {getTranslationState(currentWordForm.word || '') ? (
                      <LoadingIndicator size={16} color={colors.cardBackground} />
                    ) : (
                      <MaterialIcons name="translate" size={16} color={colors.cardBackground} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* AI Sentence Generation Section */}
              <View style={styles.rowInputGroup}>
                <Text style={styles.rowInputLabel}>Example Sentence (Optional)</Text>
                <TextInput
                  style={[styles.rowInput, styles.sentenceInput]}
                  placeholder="AI-generated or manual example sentence"
                  value={currentWordForm.example_sentence}
                  onChangeText={(value) => setCurrentWordForm({ ...currentWordForm, example_sentence: value })}
                  multiline={true}
                  numberOfLines={2}
                />
                
                {/* Sentence Meaning Display */}
                {currentWordForm.sentence_meaning && (
                  <View style={styles.sentenceMeaningContainer}>
                    <Text style={styles.sentenceMeaningLabel}>Translation:</Text>
                    <Text style={styles.sentenceMeaningText}>{currentWordForm.sentence_meaning}</Text>
                  </View>
                )}
                
                {/* AI Controls */}
                <View style={styles.aiControls}>
                  <TouchableOpacity
                    style={[
                      styles.aiButton,
                      styles.generateButton,
                      ((!currentWordForm.word?.trim() || !currentWordForm.meaning?.trim()) || 
                       getAiState(currentWordForm.word || '', currentWordForm.meaning || '')) && styles.aiButtonDisabled
                    ]}
                    onPress={() => onGenerateAISentence(currentWordForm.word || '', currentWordForm.meaning || '')}
                    disabled={(!currentWordForm.word?.trim() || !currentWordForm.meaning?.trim()) || 
                             getAiState(currentWordForm.word || '', currentWordForm.meaning || '')}
                  >
                    {getAiState(currentWordForm.word || '', currentWordForm.meaning || '') ? (
                      <LoadingIndicator size={16} color={colors.cardBackground} />
                    ) : (
                      <>
                        <Text style={styles.aiButtonIcon}>✨</Text>
                        <Text style={[styles.aiButtonText, ((!currentWordForm.word?.trim() || !currentWordForm.meaning?.trim()) || 
                                     getAiState(currentWordForm.word || '', currentWordForm.meaning || '')) && styles.aiButtonTextDisabled]}>
                          Generate
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>


              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalSaveButton, formLoading && styles.saveWordButtonDisabled]}
                  onPress={onSaveWord}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <LoadingIndicator size={16} color={colors.cardBackground} />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>
                      {editingWordId ? 'Update Word' : 'Save Word'}
                    </Text>
                  )}
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

interface AISentenceSectionProps {
  word: string
  meaning: string
  currentSentence: string
  currentSentenceMeaning: string
  onGenerateSentence: () => Promise<void>
  onManualEdit: (sentence: string) => void
  aiState: boolean
  styles: any
}

function AISentenceSection({
  word,
  meaning,
  currentSentence,
  currentSentenceMeaning,
  onGenerateSentence,
  onManualEdit,
  aiState,
  styles
}: AISentenceSectionProps) {
  const { colors } = useTheme()
  
  const canGenerate = word.trim() && meaning.trim()

  return (
    <View style={styles.aiSentenceSection}>
      <View style={styles.aiSectionHeader}>
        <Text style={styles.aiSectionTitle}>Example Sentence</Text>
      </View>

      {/* Sentence Input/Display */}
      <TextInput
        style={[styles.inlineInput, styles.sentenceInput]}
        placeholder="AI-generated or manual example sentence"
        value={currentSentence}
        onChangeText={onManualEdit}
        multiline
        numberOfLines={2}
        placeholderTextColor={styles.placeholderText?.color}
      />

      {/* Sentence Meaning Display */}
      {currentSentenceMeaning && (
        <View style={styles.sentenceMeaningContainer}>
          <Text style={styles.sentenceMeaningLabel}>Translation:</Text>
          <Text style={styles.sentenceMeaningText}>{currentSentenceMeaning}</Text>
        </View>
      )}

      {/* AI Controls */}
      <View style={styles.aiControls}>
        <TouchableOpacity
          style={[
            styles.aiButton,
            styles.generateButton,
            (!canGenerate || aiState) && styles.aiButtonDisabled
          ]}
          onPress={onGenerateSentence}
          disabled={!canGenerate || aiState}
        >
          {aiState ? (
            <LoadingIndicator size={16} color={colors.cardBackground} />
          ) : (
            <>
              <Text style={styles.aiButtonIcon}>✨</Text>
              <Text style={[styles.aiButtonText, (!canGenerate || aiState) && styles.aiButtonTextDisabled]}>
                Generate
              </Text>
            </>
          )}
        </TouchableOpacity>

      </View>

      {/* Status Messages - removed since we simplified aiState to boolean */}
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
  mainContent: {
    flex: 1,
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  
  // Progress Section - Reduced vertical spacing
  progressSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
    gap: SPACING.sm, // Reduced gap between progress bar and text
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: colors.gray300,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 6,
    minWidth: 2,
  },
  progressText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.semibold,
    marginTop: SPACING.xs, // Small gap after progress bar
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
    // Duolingo-style 3D effect
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
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
  },
  focusHeader: {
    alignItems: 'flex-start',
    paddingVertical: SPACING.md,
  },
  focusTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  focusSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  focusContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg, // Push content down from progress bar
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
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
  // New inline input style with rounded corners
  inlineInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.base,
    backgroundColor: colors.cardBackground,
    color: colors.textPrimary,
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  definitionInput: {
    flex: 1,
  },
  translateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translateButtonDisabled: {
    backgroundColor: colors.gray300,
    opacity: 0.6,
  },
  translateButtonText: {
    fontSize: TYPOGRAPHY.lg,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  inputInvalid: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  // Word Type Selector Styles - Horizontal Menu
  wordTypeContainer: {
    marginVertical: SPACING.sm,
    backgroundColor: colors.gray100,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xs,
  },
  wordTypeContent: {
    paddingHorizontal: SPACING.md,
  },
  wordTypeButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  wordTypeButtonActive: {
    backgroundColor: colors.cardBackground,
    ...SHADOWS.sm,
  },
  wordTypeButtonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textSecondary,
  },
  wordTypeButtonTextActive: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  // Keyboard-aware navigation - simple bottom placement
  keyboardAwareNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  focusNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.lg, // Extra bottom padding for safe area
    gap: SPACING.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    // Duolingo-style 3D effect
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  navButtonDisabled: {
    backgroundColor: colors.gray300,
    borderColor: colors.gray400,
    borderBottomColor: colors.gray500,
    shadowColor: colors.gray400,
    opacity: 0.6,
  },
  navButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
  },
  navButtonTextDisabled: {
    color: colors.gray600,
  },
  navButtonSecondary: {
    backgroundColor: colors.gray400,
    borderColor: colors.gray500,
    borderBottomColor: colors.gray600,
    shadowColor: colors.gray500,
  },
  navButtonSecondaryText: {
    color: colors.cardBackground,
  },

  // Full Page Mode Styles
  fullPageContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg, // Consistent top spacing with focus mode
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
  definitionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
    // Duolingo-style 3D effect
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
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
    // Duolingo-style 3D effect
    borderWidth: 3,
    borderBottomWidth: 4,
    borderColor: '#D97706',
    borderBottomColor: '#B45309',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
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

  // AI Sentence Generation Styles
  aiSentenceSection: {
    marginBottom: SPACING.md,
  },
  aiSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  aiSectionTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  sentenceInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sentenceMeaningContainer: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  sentenceMeaningLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
  },
  sentenceMeaningText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  aiControls: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  generateButton: {
    backgroundColor: colors.primary,
    flex: 1,
    justifyContent: 'center',
  },
  alternativeButton: {
    backgroundColor: colors.secondary || colors.gray400,
    paddingHorizontal: SPACING.lg,
  },
  aiButtonDisabled: {
    backgroundColor: colors.gray300,
    opacity: 0.6,
  },
  aiButtonIcon: {
    fontSize: TYPOGRAPHY.base,
  },
  aiButtonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.cardBackground,
  },
  aiButtonTextDisabled: {
    color: colors.gray600,
  },
  errorContainer: {
    backgroundColor: colors.errorLight || colors.error + '20',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.error,
    textAlign: 'center',
  },
  requiredAsterisk: {
    color: colors.error || '#EF4444',
    fontWeight: 'bold',
  },

  // Word Status Indicator Styles
  wordStatusContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: colors.surfaceVariant || colors.gray100,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  wordStatusText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  existingIndicator: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  modifiedIndicator: {
    color: colors.secondary || colors.warning || '#F59E0B',
    fontWeight: TYPOGRAPHY.semibold,
  },

  // List Mode Badge Styles
  wordNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  existingBadge: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.primary,
    backgroundColor: colors.primaryLight || colors.primary + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  modifiedBadge: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.secondary || colors.warning || '#F59E0B',
    backgroundColor: (colors.secondaryLight || colors.warning + '20') || '#FEF3C7',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
})