import React, { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Alert } from 'react-native'
import { WordSaveResultsScreen } from '@/components/WordSaveResultsScreen'
import { supabaseService } from '@/lib/services/supabaseService'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'

interface WordToSave {
  word: string
  translation: string
  meaning: string
  example_sentence?: string
  sentence_bold?: string
  sentence_meaning?: string
  meaning_bold?: string
  notes?: string
  word_type?: string
  position_in_page: number
}

export default function WordSavePage() {
  const router = useRouter()
  const { wordsToSave, notebookTitle, notebookId } = useLocalSearchParams<{
    wordsToSave: string
    notebookTitle: string
    notebookId: string
  }>()
  
  const { recordUserActivity, profile } = useAuth()
  const { refreshNotebooks, updateNotebookLastUsed } = useApp()
  const [isLoading, setIsLoading] = useState(true)
  const [hasStartedSave, setHasStartedSave] = useState(false)
  const [previousStreak, setPreviousStreak] = useState<number | undefined>()

  const parsedWords: WordToSave[] = React.useMemo(() => {
    try {
      return JSON.parse(wordsToSave || '[]')
    } catch {
      return []
    }
  }, [wordsToSave])

  useEffect(() => {
    // Capture current streak before saving words
    if (profile?.streak_count !== undefined) {
      setPreviousStreak(profile.streak_count)
    }
  }, [profile?.streak_count])

  useEffect(() => {
    // Only start save process once
    if (!hasStartedSave && parsedWords.length > 0) {
      setHasStartedSave(true)
      handleSaveWords()
    }
  }, [hasStartedSave, parsedWords])

  const handleSaveWords = async () => {
    try {
      // Get or create today's page
      const currentPage = await supabaseService.getTodaysPage(notebookId!)
      if (!currentPage) {
        Alert.alert('Error', 'Unable to create or access today\'s page.')
        router.back()
        return
      }

      // Check word limit for the page
      const currentWordsOnPage = currentPage.words?.length || 0
      const maxWordsPerDay = 20 // Default, could be made dynamic
      const availableSlots = maxWordsPerDay - currentWordsOnPage

      if (parsedWords.length > availableSlots) {
        Alert.alert(
          'Word Limit Exceeded', 
          `This page can only hold ${availableSlots} more words (${currentWordsOnPage}/${maxWordsPerDay} already added). Please remove ${parsedWords.length - availableSlots} words.`,
          [{ text: 'OK', onPress: () => router.back() }]
        )
        return
      }
      
      // Add words to the current page
      await supabaseService.addWords(currentPage.id, parsedWords)
      
      // Record streak activity for adding words
      await recordUserActivity()
      
      // Immediately update progress without database refetch
      if (typeof window !== 'undefined' && (window as any).onWordsAdded) {
        (window as any).onWordsAdded(notebookId!, parsedWords.length)
      }

      // Update notebook last used for smart ordering
      updateNotebookLastUsed(notebookId!)
      
      // PERFORMANCE: Skip profile refresh since addWords() already updated profile stats
      await refreshNotebooks(true)

      // Switch to results view
      setIsLoading(false)
    } catch (error) {
      console.error('❌ Error saving words:', error)
      Alert.alert(
        'Error', 
        'Failed to save words. Please try again.',
        [{ text: 'OK', onPress: () => router.back() }]
      )
    }
  }

  const handleClose = () => {
    // Set flag that words were added for home screen to detect
    if (typeof window !== 'undefined') {
      (window as any).wordsJustAdded = true
    }
    
    // Navigate directly to home page using replace for proper navigation
    router.replace('/(tabs)/')
  }

  return (
    <WordSaveResultsScreen
      isLoading={isLoading}
      wordCount={parsedWords.length}
      notebookTitle={notebookTitle || 'Unknown Notebook'}
      currentStreak={profile?.streak_count}
      previousStreak={previousStreak}
      savedWords={parsedWords.map(word => ({
        word: word.word,
        translation: word.translation || word.meaning,
        sentence: word.example_sentence || '',
        sentenceBold: word.sentence_bold || '',
        meaning: word.sentence_meaning || '',
        meaningBold: word.meaning_bold || ''
      }))}
      onClose={handleClose}
    />
  )
}