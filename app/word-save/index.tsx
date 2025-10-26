import React, { useEffect, useState } from 'react'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Alert } from 'react-native'
import { WordSaveResultsScreen } from '@/components/WordSaveResultsScreen'
import { supabaseService } from '@/lib/services/supabaseService'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { progressManager } from '@/lib/services/progressManager'

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
  
  const { recordUserActivity, profile, refreshProfile } = useAuth()
  const { emitEvent } = useApp()
  const [isLoading, setIsLoading] = useState(true)
  const [hasStartedSave, setHasStartedSave] = useState(false)
  const [previousStreak, setPreviousStreak] = useState<number | undefined>()
  const [finalStreak, setFinalStreak] = useState<number | undefined>()

  const parsedWords: WordToSave[] = React.useMemo(() => {
    try {
      return JSON.parse(wordsToSave || '[]')
    } catch {
      return []
    }
  }, [wordsToSave])

  useEffect(() => {
    // Capture current streak before saving words (only once, when component mounts)
    if (profile?.streak_count !== undefined && previousStreak === undefined) {
      console.log(`🔥 WordSave: Capturing initial streak: ${profile.streak_count}`)
      setPreviousStreak(profile.streak_count)
    }
  }, [profile?.streak_count, previousStreak])

  useEffect(() => {
    // Capture final streak after profile refresh (when loading is false and we have both streaks)
    if (!isLoading && profile?.streak_count !== undefined && previousStreak !== undefined && finalStreak === undefined) {
      console.log(`🔥 WordSave: Capturing final streak: ${profile.streak_count} (was: ${previousStreak})`)
      setFinalStreak(profile.streak_count)
    }
  }, [isLoading, profile?.streak_count, previousStreak, finalStreak])

  // Add debug logging for streak celebration  
  useEffect(() => {
    const currentDisplayStreak = finalStreak !== undefined ? finalStreak : profile?.streak_count
    if (currentDisplayStreak !== undefined && previousStreak !== undefined) {
      console.log(`🔥 WordSave: Streak celebration check - current: ${currentDisplayStreak}, previous: ${previousStreak}, celebration should show: ${currentDisplayStreak > previousStreak}`)
    }
  }, [finalStreak, profile?.streak_count, previousStreak])

  useEffect(() => {
    // Only start save process once
    if (!hasStartedSave && parsedWords.length > 0) {
      setHasStartedSave(true)
      handleSaveWords()
    }
  }, [hasStartedSave, parsedWords])

  const handleSaveWords = async () => {
    try {
      const currentPage = await supabaseService.getTodaysPage(notebookId!)
      if (!currentPage) {
        console.error('Unable to create or access today\'s page')
        setIsLoading(false)
        return
      }

      // ✨ INSTANT OPTIMISTIC UPDATES: Update UI immediately (0ms)
      console.log('🚀 WordSave: Triggering optimistic updates BEFORE database save')
      
      // Trigger optimistic updates through ProgressManager
      const wordCount = parsedWords.length
      const goal = 20 // Default goal, will be updated by events
      progressManager.addWordsOptimistic(notebookId!, wordCount, goal)
      progressManager.incrementStreakOptimistic()
      
      // Emit events IMMEDIATELY for instant UI updates
      emitEvent('wordsAdded', { 
        notebookId: notebookId!, 
        wordCount: parsedWords.length 
      })
      emitEvent('dataChanged', {})
      
      console.log('✅ Optimistic updates triggered - UI should update instantly')

      // BACKGROUND: Save words to database
      const results = await supabaseService.addWords(
        currentPage.id,
        parsedWords
      )

      if (results.success) {
        // Record user activity for streak tracking
        await recordUserActivity()

        // Capture final streak after database update
        // Small delay to ensure database is updated, then refresh profile
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Refresh profile to get updated streak
        await refreshProfile()
        
        console.log(`🔥 WordSave: Refreshed profile, streak should be updated`)

        console.log('✅ Database save and streak update completed successfully')
      } else {
        console.error('Failed to save words:', results.error)
        
        // ✨ ROLLBACK: Revert optimistic updates on failure
        console.log('❌ Rolling back optimistic updates due to database error')
        progressManager.rollbackOptimisticUpdates()
        
        Alert.alert('Error', 'Failed to save words. Please try again.')
      }
      
      setIsLoading(false)
      
    } catch (error) {
      console.error('Error in word save:', error)
      
      // ✨ ROLLBACK: Revert optimistic updates on failure
      console.log('❌ Rolling back optimistic updates due to error')
      progressManager.rollbackOptimisticUpdates()
      
      Alert.alert('Error', 'Failed to save words. Please try again.')
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Navigate back to home page - events have already updated other screens
    router.replace('/(tabs)/')
  }

  return (
    <WordSaveResultsScreen
      isLoading={isLoading}
      wordCount={parsedWords.length}
      notebookTitle={notebookTitle || 'Unknown Notebook'}
      currentStreak={finalStreak !== undefined ? finalStreak : profile?.streak_count}
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