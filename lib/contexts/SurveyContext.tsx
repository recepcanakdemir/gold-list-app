import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabaseService } from '@/lib/services/supabaseService'
import { useAuth } from './AuthContext'

interface SurveyData {
  hearAboutUs?: string
  language?: string
  level?: string
  challenge?: string
  memory?: string
  goldListExperience?: string
  unknownWordsDaily?: number
  findWordsFrom?: string[]
  learningReason?: string[]
  // Privacy and consent fields
  consentGiven?: boolean
  appVersion?: string
  onboardingCompleted?: boolean
}

interface AnalysisData {
  recommendedDailyWords: number
  yearlyTotal: number
  expectedMastery: number
  successProbability: number
  insights: {
    memoryStrategy: string
    progressionPlan: string
    focusAreas: string[]
    whyThisAmount: string
  }
  projections: {
    month1: number
    month3: number
    month6: number
    fluencyDays: number
  }
  error?: string
}

interface SurveyContextType {
  surveyData: SurveyData
  analysisData: AnalysisData | null
  isLoading: boolean
  hasExistingResponse: boolean
  updateSurveyData: (data: Partial<SurveyData>) => void
  setAnalysisData: (data: AnalysisData) => void
  resetSurvey: () => void
  saveSurveyData: () => Promise<boolean>
  completeSurvey: () => Promise<boolean>
  loadSurveyResponse: () => Promise<void>
  deleteSurveyResponse: () => Promise<boolean>
  giveConsent: () => void
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined)

export function SurveyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [surveyData, setSurveyData] = useState<SurveyData>({})
  const [analysisData, setAnalysisDataState] = useState<AnalysisData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasExistingResponse, setHasExistingResponse] = useState(false)

  // Load existing survey response when user authenticates
  useEffect(() => {
    if (user?.id) {
      loadSurveyResponse()
    }
  }, [user?.id])

  const updateSurveyData = (data: Partial<SurveyData>) => {
    console.log('📝 Updating survey data:', data)
    setSurveyData(prev => {
      const updated = { ...prev, ...data }
      // Auto-save survey data on updates (for incremental saves)
      if (user?.id && Object.keys(data).length > 0) {
        saveSurveyDataToDatabase(updated, false)
      }
      return updated
    })
  }

  const setAnalysisData = (data: AnalysisData) => {
    setAnalysisDataState(data)
  }

  const resetSurvey = () => {
    console.log('🔄 Resetting survey data')
    setSurveyData({})
    setAnalysisDataState(null)
    setHasExistingResponse(false)
  }

  // Internal method to save survey data to database
  const saveSurveyDataToDatabase = async (data: SurveyData, markCompleted: boolean = false): Promise<boolean> => {
    if (!user?.id) {
      console.warn('⚠️ Cannot save survey data: No authenticated user')
      return false
    }

    try {
      setIsLoading(true)
      
      const saveData = {
        ...data,
        appVersion: require('../../package.json').version || '1.0.0',
        onboardingCompleted: markCompleted
      }

      const result = await supabaseService.saveSurveyResponse(saveData)
      
      if (result.success) {
        console.log('✅ Survey data saved successfully')
        setHasExistingResponse(true)
        return true
      } else {
        console.error('❌ Failed to save survey data:', result.error)
        return false
      }
    } catch (error) {
      console.error('❌ Error saving survey data:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Public method to manually save survey data
  const saveSurveyData = async (): Promise<boolean> => {
    console.log('💾 Manual save of survey data')
    return saveSurveyDataToDatabase(surveyData, false)
  }

  // Complete survey and mark as finished
  const completeSurvey = async (): Promise<boolean> => {
    console.log('🏁 Completing survey')
    
    if (!surveyData.consentGiven) {
      console.warn('⚠️ Cannot complete survey: User consent not given')
      return false
    }

    return saveSurveyDataToDatabase(surveyData, true)
  }

  // Load existing survey response from database
  const loadSurveyResponse = async (): Promise<void> => {
    if (!user?.id) {
      return
    }

    try {
      setIsLoading(true)
      console.log('📄 Loading existing survey response')

      const result = await supabaseService.getSurveyResponse()
      
      if (result.success && result.data) {
        const savedData = result.data
        
        // Transform database format to context format
        const loadedSurveyData: SurveyData = {
          hearAboutUs: savedData.hear_about_us,
          language: savedData.target_language,
          level: savedData.current_level,
          challenge: savedData.biggest_challenge,
          memory: savedData.memory_assessment,
          goldListExperience: savedData.goldlist_experience,
          unknownWordsDaily: savedData.unknown_words_daily,
          findWordsFrom: savedData.word_sources,
          learningReason: savedData.learning_reasons,
          consentGiven: savedData.consent_given,
          appVersion: savedData.app_version,
          onboardingCompleted: savedData.onboarding_completed
        }

        setSurveyData(loadedSurveyData)
        setHasExistingResponse(true)
        console.log('✅ Survey response loaded successfully')
      } else {
        console.log('ℹ️ No existing survey response found')
        setHasExistingResponse(false)
      }
    } catch (error) {
      console.error('❌ Error loading survey response:', error)
      setHasExistingResponse(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Delete survey response (GDPR compliance)
  const deleteSurveyResponse = async (): Promise<boolean> => {
    if (!user?.id) {
      return false
    }

    try {
      setIsLoading(true)
      console.log('🗑️ Deleting survey response')

      const result = await supabaseService.deleteSurveyResponse()
      
      if (result.success) {
        resetSurvey()
        console.log('✅ Survey response deleted successfully')
        return true
      } else {
        console.error('❌ Failed to delete survey response:', result.error)
        return false
      }
    } catch (error) {
      console.error('❌ Error deleting survey response:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Give consent for data collection
  const giveConsent = () => {
    console.log('✅ User gave consent for survey data collection')
    updateSurveyData({ consentGiven: true })
  }

  return (
    <SurveyContext.Provider value={{
      surveyData,
      analysisData,
      isLoading,
      hasExistingResponse,
      updateSurveyData,
      setAnalysisData,
      resetSurvey,
      saveSurveyData,
      completeSurvey,
      loadSurveyResponse,
      deleteSurveyResponse,
      giveConsent,
    }}>
      {children}
    </SurveyContext.Provider>
  )
}

export function useSurvey() {
  const context = useContext(SurveyContext)
  if (context === undefined) {
    throw new Error('useSurvey must be used within a SurveyProvider')
  }
  return context
}