import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  runOnJS,
  withSequence
} from 'react-native-reanimated'
import { MaterialIcons } from '@expo/vector-icons'
import CountryFlag from 'react-native-country-flag'
import { OnboardingScreen } from '@/components/OnboardingScreen'
import { SurveyConsentScreen } from '@/components/SurveyConsentScreen'
import { useSurvey } from '@/lib/contexts/SurveyContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/constants/design'
// import Slider from '@react-native-community/slider' // TODO: Add dependency

type SurveyStep = 
  | 'consent'
  | 'hearAboutUs' 
  | 'language' 
  | 'level' 
  | 'challenge' 
  | 'memory' 
  | 'goldListExperience' 
  | 'unknownWordsDaily' 
  | 'findWordsFrom' 
  | 'learningReason'

export default function SurveyScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { updateSurveyData, giveConsent, surveyData } = useSurvey()
  const [currentStep, setCurrentStep] = useState<SurveyStep>('consent')
  const [unknownWordsValue, setUnknownWordsValue] = useState(10)
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showLanguageSearch, setShowLanguageSearch] = useState(false)
  const [languageSearchQuery, setLanguageSearchQuery] = useState('')
  
  // Animation values
  const contentOpacity = useSharedValue(1)
  const contentScale = useSharedValue(1)
  
  const styles = createStyles(colors)

  // Comprehensive language list with country codes for flags
  const allLanguages = [
    { name: 'Spanish', code: 'ES' },
    { name: 'French', code: 'FR' },
    { name: 'German', code: 'DE' },
    { name: 'Italian', code: 'IT' },
    { name: 'Portuguese', code: 'PT' },
    { name: 'English', code: 'GB' },
    { name: 'Mandarin Chinese', code: 'CN' },
    { name: 'Japanese', code: 'JP' },
    { name: 'Korean', code: 'KR' },
    { name: 'Russian', code: 'RU' },
    { name: 'Arabic', code: 'SA' },
    { name: 'Hindi', code: 'IN' },
    { name: 'Dutch', code: 'NL' },
    { name: 'Swedish', code: 'SE' },
    { name: 'Norwegian', code: 'NO' },
    { name: 'Danish', code: 'DK' },
    { name: 'Finnish', code: 'FI' },
    { name: 'Polish', code: 'PL' },
    { name: 'Czech', code: 'CZ' },
    { name: 'Hungarian', code: 'HU' },
    { name: 'Greek', code: 'GR' },
    { name: 'Turkish', code: 'TR' },
    { name: 'Hebrew', code: 'IL' },
    { name: 'Thai', code: 'TH' },
    { name: 'Vietnamese', code: 'VN' },
    { name: 'Indonesian', code: 'ID' },
    { name: 'Malay', code: 'MY' },
    { name: 'Ukrainian', code: 'UA' },
    { name: 'Romanian', code: 'RO' },
    { name: 'Bulgarian', code: 'BG' },
    { name: 'Croatian', code: 'HR' },
    { name: 'Serbian', code: 'RS' },
    { name: 'Slovak', code: 'SK' },
    { name: 'Slovenian', code: 'SI' },
    { name: 'Lithuanian', code: 'LT' },
    { name: 'Latvian', code: 'LV' },
    { name: 'Estonian', code: 'EE' },
  ]

  // Filter languages based on search query
  const filteredLanguages = allLanguages.filter(lang =>
    lang.name.toLowerCase().includes(languageSearchQuery.toLowerCase())
  )

  // Icon mapping for survey options - selective use of colorful icons and emojis
  const optionIcons: { [key: string]: { type: 'emoji' | 'icon'; content: string; color?: string } } = {
    // Hear About Us - real app icons using recognizable symbols
    'App Store': { type: 'emoji', content: '📱' }, // iPhone/App Store
    'YouTube': { type: 'emoji', content: '▶️' }, // Play button - YouTube's signature
    'Instagram': { type: 'emoji', content: '📷' }, // Camera - Instagram's core function
    'TikTok': { type: 'emoji', content: '🎵' }, // Musical note - TikTok's essence
    'Reddit': { type: 'emoji', content: '🤖' }, // Robot/alien mascot representation
    'Friend': { type: 'emoji', content: '👥' },
    
    // Word Sources - meaningful visual representations
    'Books': { type: 'emoji', content: '📚' },
    'Movies': { type: 'emoji', content: '🎬' },
    'Social Media': { type: 'emoji', content: '📱' },
    'Conversations': { type: 'emoji', content: '💬' },
    'Lessons': { type: 'emoji', content: '🎓' },
    
    // Learning Reasons - expressive emojis only
    'Education': { type: 'emoji', content: '🎓' },
    'Socializing': { type: 'emoji', content: '👥' },
    'Finding Love': { type: 'emoji', content: '❤️' },
    'Moving to Another Country': { type: 'emoji', content: '✈️' },
    'Career': { type: 'emoji', content: '💼' },
    'Travel': { type: 'emoji', content: '🌍' },
    
    // Challenges - emojis for all options (Page 17)
    'Remembering words': { type: 'icon', content: 'psychology', color: '#9C27B0' }, // Purple brain
    'Motivation': { type: 'emoji', content: '💪' },
    'Time': { type: 'emoji', content: '⏰' },
    'Consistency': { type: 'emoji', content: '📅' },
    
    // Memory levels - emojis for all options (Page 18)
    'Strong': { type: 'emoji', content: '🧠' },
    'Average': { type: 'emoji', content: '😐' },
    'Needs improvement': { type: 'emoji', content: '💭' },
    
    // Note: Removed icons for generic options like:
    // - Language levels (A1, A2, etc.) - just text is cleaner
    // - Experience levels - text is sufficient for Page 19
    // - Word counts - numbers don't need icons
    // - Generic options like "Other"
  }

  const renderIcon = (option: string, fallbackColor: string) => {
    // Check if this is a language with a flag
    const language = allLanguages.find(lang => lang.name === option)
    if (language) {
      return <CountryFlag isoCode={language.code} size={20} style={styles.flagIcon} />
    }

    const iconData = optionIcons[option]
    if (!iconData) return null

    if (iconData.type === 'emoji') {
      return <Text style={styles.emojiIcon}>{iconData.content}</Text>
    } else {
      // Use the custom color if provided, otherwise use fallback
      const iconColor = iconData.color || fallbackColor
      return <MaterialIcons name={iconData.content as any} size={20} color={iconColor} />
    }
  }

  const questions = {
    hearAboutUs: {
      question: 'Where did you hear about us?',
      options: ['App Store', 'Friend', 'YouTube', 'Instagram', 'TikTok', 'Reddit', 'Other']
    },
    language: {
      question: 'Which language are you learning?',
      options: ['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'English', 'Other']
    },
    level: {
      question: "What's your current level?",
      options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    },
    challenge: {
      question: "What's your biggest challenge?",
      options: ['Remembering words', 'Motivation', 'Time', 'Consistency']
    },
    memory: {
      question: "How's your long-term memory?",
      options: ['Strong', 'Average', 'Needs improvement']
    },
    goldListExperience: {
      question: 'Have you used the Gold List Method before?',
      options: ['Yes, I\'m familiar', 'I\'ve heard of it', 'No, this is new to me']
    }
  }

  const getCurrentStepNumber = () => {
    // Linear progression: survey starts at step 12 and goes to 20 (10 total including consent)
    const steps: SurveyStep[] = [
      'consent', 'hearAboutUs', 'language', 'level', 'challenge', 'memory', 
      'goldListExperience', 'unknownWordsDaily', 'findWordsFrom', 'learningReason'
    ]
    const currentIndex = steps.indexOf(currentStep)
    return currentIndex >= 0 ? 12 + currentIndex : 12
  }

  const handleAnimationComplete = () => {
    try {
      setSelectedOption(null)
      setIsTransitioning(false)
      handleNext()
      // Fade in new content after navigation
      contentOpacity.value = withTiming(1, { duration: 300 })
    } catch (error) {
      console.error('Survey animation error:', error)
      // Fallback: reset state and continue without animation
      setSelectedOption(null)
      setIsTransitioning(false)
      handleNext()
    }
  }

  const handleOptionSelect = (option: string) => {
    if (isTransitioning) return
    
    try {
      setSelectedOption(option)
      setIsTransitioning(true)
      updateSurveyData({ [currentStep]: option })
      
      // Smooth animation sequence: scale up selection, fade out content, advance, fade in
      contentScale.value = withSequence(
        withSpring(0.95, { duration: 200 }),
        withSpring(1, { duration: 200 })
      )
      
      contentOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(handleAnimationComplete)()
        } else {
          // Animation was interrupted, proceed without animation
          runOnJS(() => {
            setSelectedOption(null)
            setIsTransitioning(false)
            handleNext()
          })()
        }
      })
    } catch (error) {
      console.error('Survey option selection error:', error)
      // Fallback: proceed without animation
      setSelectedOption(null)
      setIsTransitioning(false)
      updateSurveyData({ [currentStep]: option })
      handleNext()
    }
  }

  const handleMultiSelect = (option: string, isSource = false) => {
    const currentArray = isSource ? selectedSources : selectedReasons
    const setArray = isSource ? setSelectedSources : setSelectedReasons
    
    if (currentArray.includes(option)) {
      setArray(currentArray.filter(item => item !== option))
    } else {
      setArray([...currentArray, option])
    }
  }

  const handleNext = () => {
    const steps: SurveyStep[] = [
      'consent', 'hearAboutUs', 'language', 'level', 'challenge', 'memory', 
      'goldListExperience', 'unknownWordsDaily', 'findWordsFrom', 'learningReason'
    ]
    const currentIndex = steps.indexOf(currentStep)
    
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
      setSelectedOption(null) // Reset selection for new step
    } else {
      // Final step - save all data and continue
      updateSurveyData({ 
        unknownWordsDaily: unknownWordsValue,
        findWordsFrom: selectedSources,
        learningReason: selectedReasons
      })
      router.push('/(onboarding)/loading')
    }
  }

  const handleConsentAccept = () => {
    console.log('✅ User accepted survey consent')
    giveConsent()
    setCurrentStep('hearAboutUs')
  }

  const handleConsentSkip = () => {
    console.log('⏭️ User skipped survey')
    // Skip directly to loading screen without saving survey data
    router.push('/(onboarding)/loading')
  }

  const handleContinueMultiSelect = () => {
    if (currentStep === 'findWordsFrom') {
      updateSurveyData({ findWordsFrom: selectedSources })
    } else if (currentStep === 'learningReason') {
      updateSurveyData({ learningReason: selectedReasons })
    }
    handleNext()
  }

  const renderCurrentQuestion = () => {
    // Consent screen
    if (currentStep === 'consent') {
      return (
        <SurveyConsentScreen 
          onAccept={handleConsentAccept}
          onSkip={handleConsentSkip}
        />
      )
    }

    // Special handling for language selection with search
    if (currentStep === 'language') {
      const { question, options } = questions.language
      
      return (
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{question}</Text>
          
          {/* Search interface for expanded language list */}
          {showLanguageSearch && (
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search languages..."
                placeholderTextColor={colors.textSecondary}
                value={languageSearchQuery}
                onChangeText={setLanguageSearchQuery}
                autoFocus
              />
              <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
                {filteredLanguages.map((language, index) => {
                  const isSelected = selectedOption === language.name
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.optionButton,
                        styles.searchOptionButton,
                        isSelected && styles.optionButtonSelected
                      ]}
                      onPress={() => handleOptionSelect(language.name)}
                      activeOpacity={0.7}
                      disabled={isTransitioning}
                    >
                      <View style={styles.optionContent}>
                        <CountryFlag isoCode={language.code} size={20} style={styles.flagIcon} />
                        <Text style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected
                        ]}>{language.name}</Text>
                      </View>
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>
              <TouchableOpacity 
                style={styles.backToMainOptions}
                onPress={() => {
                  setShowLanguageSearch(false)
                  setLanguageSearchQuery('')
                }}
              >
                <Text style={styles.backToMainOptionsText}>← Back to main options</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main language options */}
          {!showLanguageSearch && (
            <View style={styles.optionsContainer}>
              {options.map((option, index) => {
                const isSelected = selectedOption === option
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected
                    ]}
                    onPress={() => {
                      if (option === 'Other') {
                        setShowLanguageSearch(true)
                      } else {
                        handleOptionSelect(option)
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={isTransitioning}
                  >
                    <View style={styles.optionContent}>
                      {renderIcon(option, isSelected ? colors.background : colors.textPrimary)}
                      <Text style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected
                      ]}>{option}</Text>
                    </View>
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          )}
        </View>
      )
    }

    if (currentStep in questions) {
      const { question, options } = questions[currentStep as keyof typeof questions]
      
      return (
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{question}</Text>
          <View style={styles.optionsContainer}>
            {options.map((option, index) => {
              const isSelected = selectedOption === option
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected
                  ]}
                  onPress={() => handleOptionSelect(option)}
                  activeOpacity={0.7}
                  disabled={isTransitioning}
                >
                  <View style={styles.optionContent}>
                    {renderIcon(option, isSelected ? colors.background : colors.textPrimary)}
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected
                    ]}>{option}</Text>
                  </View>
                  {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    if (currentStep === 'unknownWordsDaily') {
      const options = ['10 words', '20 words', '30 words', '50 words', '100+ words']
      return (
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>How many words do you encounter that you don&apos;t know daily?</Text>
          <View style={styles.optionsContainer}>
            {options.map((option, index) => {
              const isSelected = selectedOption === option
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    isSelected && styles.optionButtonSelected
                  ]}
                  onPress={() => {
                    if (isTransitioning) return
                    
                    try {
                      setSelectedOption(option)
                      setIsTransitioning(true)
                      const wordCount = option === '100+ words' ? 100 : parseInt(option)
                      setUnknownWordsValue(wordCount)
                      updateSurveyData({ unknownWordsDaily: wordCount })
                      
                      // Same smooth animation as other options
                      contentScale.value = withSequence(
                        withSpring(0.95, { duration: 200 }),
                        withSpring(1, { duration: 200 })
                      )
                      
                      contentOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
                        if (finished) {
                          runOnJS(handleAnimationComplete)()
                        } else {
                          runOnJS(() => {
                            setSelectedOption(null)
                            setIsTransitioning(false)
                            handleNext()
                          })()
                        }
                      })
                    } catch (error) {
                      console.error('Survey words daily error:', error)
                      // Fallback: proceed without animation
                      const wordCount = option === '100+ words' ? 100 : parseInt(option)
                      setUnknownWordsValue(wordCount)
                      updateSurveyData({ unknownWordsDaily: wordCount })
                      setSelectedOption(null)
                      setIsTransitioning(false)
                      handleNext()
                    }
                  }}
                  activeOpacity={0.7}
                  disabled={isTransitioning}
                >
                  <View style={styles.optionContent}>
                    {renderIcon(option, isSelected ? colors.background : colors.textPrimary)}
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected
                    ]}>{option}</Text>
                  </View>
                  {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )
    }

    if (currentStep === 'findWordsFrom') {
      const sources = ['Books', 'YouTube', 'Movies', 'Social Media', 'Conversations', 'Lessons']
      return (
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>Where do you find new words?</Text>
          <View style={styles.optionsContainer}>
            {sources.map((source, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.multiSelectButton,
                  selectedSources.includes(source) && styles.multiSelectButtonSelected
                ]}
                onPress={() => handleMultiSelect(source, true)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  {renderIcon(source, selectedSources.includes(source) ? colors.background : colors.textPrimary)}
                  <Text style={[
                    styles.multiSelectText,
                    selectedSources.includes(source) && styles.multiSelectTextSelected
                  ]}>{source}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )
    }

    if (currentStep === 'learningReason') {
      const reasons = ['Education', 'Socializing', 'Finding Love', 'Moving to Another Country', 'Career', 'Travel']
      return (
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>Why do you want to learn a new language?</Text>
          <View style={styles.optionsContainer}>
            {reasons.map((reason, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.multiSelectButton,
                  selectedReasons.includes(reason) && styles.multiSelectButtonSelected
                ]}
                onPress={() => handleMultiSelect(reason, false)}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  {renderIcon(reason, selectedReasons.includes(reason) ? colors.background : colors.textPrimary)}
                  <Text style={[
                    styles.multiSelectText,
                    selectedReasons.includes(reason) && styles.multiSelectTextSelected
                  ]}>{reason}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )
    }
  }

  const isMultiSelectStep = currentStep === 'findWordsFrom' || currentStep === 'learningReason'

  // Animated styles
  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ scale: contentScale.value }],
    }
  })

  // Special rendering for consent screen (full screen)
  if (currentStep === 'consent') {
    return renderCurrentQuestion()
  }

  return (
    <OnboardingScreen
      currentStep={getCurrentStepNumber()}
      totalSteps={24}
      headline="Tell us about yourself"
      primaryButtonText={isMultiSelectStep ? "Continue" : undefined}
      onPrimaryPress={isMultiSelectStep ? handleContinueMultiSelect : undefined}
      showPrimaryButton={isMultiSelectStep}
      showSkip={false}
    >
      <Animated.View style={[{ flex: 1 }, animatedContentStyle]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderCurrentQuestion()}
        </ScrollView>
      </Animated.View>
    </OnboardingScreen>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  questionContainer: {
    paddingVertical: SPACING.xl,
  },
  questionText: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionButton: {
    backgroundColor: colors.cardBackground,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.background,
  },
  checkmark: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.background,
    marginLeft: SPACING.sm,
  },
  multiSelectButton: {
    backgroundColor: colors.cardBackground,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiSelectButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  multiSelectText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
  },
  multiSelectTextSelected: {
    color: colors.background,
  },
  emojiIcon: {
    fontSize: 20,
    lineHeight: 20,
  },
  flagIcon: {
    borderRadius: 2,
  },
  searchContainer: {
    marginTop: SPACING.lg,
  },
  searchInput: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    marginBottom: SPACING.lg,
  },
  searchResults: {
    maxHeight: 300,
    marginBottom: SPACING.lg,
  },
  searchOptionButton: {
    marginBottom: SPACING.sm,
  },
  backToMainOptions: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  backToMainOptionsText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.medium,
  },
  sliderContainer: {
    paddingHorizontal: SPACING.lg,
  },
  sliderValue: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  sliderLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
})