import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useApp } from '@/lib/contexts/AppContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

// Language options for notebook creation
const languageOptions = [
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
]

export default function CreateNotebookModal() {
  const router = useRouter()
  const { appState, refreshNotebooks } = useApp()
  const { colors } = useTheme()
  const { subscription, canCreateNotebook, getUpgradeMessage, showPaywallModal } = useSubscription()
  const [title, setTitle] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<{
    code: string
    name: string
    flag: string
  } | null>(null)
  const [wordsPerDay, setWordsPerDay] = useState(10) // Default to free tier limit
  const [loading, setLoading] = useState(false)
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [languageSearch, setLanguageSearch] = useState('')
  const [howItWorksExpanded, setHowItWorksExpanded] = useState(false)
  const [expandedHeight] = useState(new Animated.Value(0))

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a notebook title')
      return
    }

    if (title.length > 30) {
      Alert.alert('Error', 'Notebook title must be 30 characters or less')
      return
    }

    if (!selectedLanguage) {
      Alert.alert('Error', 'Please select a language')
      return
    }

    if (wordsPerDay < 10 || wordsPerDay > 25) {
      Alert.alert('Error', 'Words per day must be between 10 and 25')
      return
    }

    // Check subscription limits (single notebook limit for trial/free users)
    const canCreate = await canCreateNotebook()
    if (!canCreate) {
      Alert.alert(
        'Notebook Limit Reached',
        getUpgradeMessage('notebook_limit'),
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => showPaywallModal() }
        ]
      )
      return
    }

    setLoading(true)
    try {
      await supabaseService.createNotebook({
        title: title.trim(),
        language: selectedLanguage.name,
        language_code: selectedLanguage.code,
        words_per_day: wordsPerDay,
        notebook_level: 'bronze', // All user-created notebooks start as Bronze
      })

      // Refresh the notebooks list in the app state
      await refreshNotebooks()

      Alert.alert(
        'Success!',
        'Your notebook has been created. You can now start adding vocabulary.',
        [{ text: 'OK', onPress: () => {
          if (router.canGoBack()) {
            router.back()
          } else {
            router.push('/(tabs)/')
          }
        } }]
      )
    } catch (error) {
      console.error('Error creating notebook:', error)
      Alert.alert('Error', 'Failed to create notebook. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredLanguages = languageOptions.filter(lang =>
    lang.name.toLowerCase().includes(languageSearch.toLowerCase())
  )

  const wordsPerDayOptions = [10, 15, 20, 25]

  const toggleHowItWorks = () => {
    const toValue = howItWorksExpanded ? 0 : 200
    setHowItWorksExpanded(!howItWorksExpanded)
    
    Animated.timing(expandedHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }

  const styles = createStyles(colors)

  return (
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.headerTitle}>New Notebook</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading}>
          <Text style={[styles.createButton, loading && styles.disabledButton]}>
            {loading ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notebook Title</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g., Spanish Vocabulary, Business English"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={30}
          />
          <View style={styles.titleFooter}>
            <Text style={styles.helpText}>
              Choose a descriptive name for your vocabulary collection
            </Text>
            <Text style={[styles.characterCounter, title.length > 30 && styles.characterCounterError]}>
              {title.length}/30
            </Text>
          </View>
        </View>

        {/* Language Selection with Dropdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Language</Text>
          <Text style={styles.helpText}>What language are you learning?</Text>
          
          <TouchableOpacity
            style={styles.languageDropdown}
            onPress={() => setShowLanguageModal(true)}
          >
            {selectedLanguage ? (
              <View style={styles.selectedLanguage}>
                <Text style={styles.selectedLanguageFlag}>{selectedLanguage.flag}</Text>
                <Text style={styles.selectedLanguageName}>{selectedLanguage.name}</Text>
              </View>
            ) : (
              <Text style={styles.dropdownPlaceholder}>Select a language</Text>
            )}
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Words Per Day Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goal</Text>
          <Text style={styles.helpText}>How many new words you want to add daily</Text>
          
          <View style={styles.optionsGrid}>
            {wordsPerDayOptions.map((option) => {
              const isLocked = !subscription.isActive && option > 10
              const isDisabled = isLocked
              
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    wordsPerDay === option && styles.optionButtonSelected,
                    isLocked && styles.optionButtonLocked
                  ]}
                  onPress={() => {
                    if (isLocked) {
                      showPaywallModal()
                    } else {
                      setWordsPerDay(option)
                    }
                  }}
                  disabled={false} // Allow tapping to show paywall
                >
                  <View style={styles.optionContent}>
                    <Text style={[
                      styles.optionText,
                      wordsPerDay === option && styles.optionTextSelected,
                      isLocked && styles.optionTextLocked
                    ]}>
                      {option}
                    </Text>
                    {isLocked && (
                      <Text style={styles.premiumBadgeSmall}>✨</Text>
                    )}
                  </View>
                  {isLocked && (
                    <Text style={styles.lockedLabel}>Premium</Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
          
          {!subscription.isActive && (
            <Text style={styles.freeUserNote}>
              💡 Free users start with 10 words/day. Upgrade for higher daily goals and unlimited learning.
            </Text>
          )}
        </View>

        {/* Free Plan Limit Info */}
        {!subscription.isActive && (
          <View style={styles.section}>
            <View style={styles.limitIndicator}>
              <Text style={styles.limitText}>
                📋 Free Plan: 1 Bronze notebook per language • 10 words max per page
              </Text>
              <TouchableOpacity onPress={() => showPaywallModal()}>
                <Text style={styles.upgradeHint}>Upgrade for unlimited →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Collapsible How It Works */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.howItWorksHeader} onPress={toggleHowItWorks}>
            <Text style={styles.howItWorksTitle}>📚 Gold List Method - How it works</Text>
            <Text style={[styles.expandIcon, howItWorksExpanded && styles.expandIconRotated]}>
              ▼
            </Text>
          </TouchableOpacity>
          
          <Animated.View style={[styles.howItWorksContent, { height: expandedHeight }]}>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>🥉</Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoTextBold}>Bronze Notebooks:</Text> Start here! Add new vocabulary daily and review after 14 days across 4 rounds.
              </Text>
            </View>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>🥈</Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoTextBold}>Silver Notebooks:</Text> Challenging words that need more attention are automatically moved here.
              </Text>
            </View>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>🥇</Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoTextBold}>Gold Notebooks:</Text> The most difficult words get specialized focus for mastery.
              </Text>
            </View>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>⚡</Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoTextBold}>Natural Learning:</Text> No cramming - just add words daily and let your memory do the work over time.
              </Text>
            </View>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>🎯</Text>
              <Text style={styles.infoText}>
                <Text style={styles.infoTextBold}>High Success Rate:</Text> Most words are remembered permanently after just one 4-round cycle.
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Language</Text>
            <View style={styles.modalSpace} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search languages..."
              placeholderTextColor={colors.textSecondary}
              value={languageSearch}
              onChangeText={setLanguageSearch}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredLanguages}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.languageItem}
                onPress={() => {
                  setSelectedLanguage(item)
                  setShowLanguageModal(false)
                  setLanguageSearch('')
                }}
              >
                <Text style={styles.languageItemFlag}>{item.flag}</Text>
                <Text style={styles.languageItemName}>{item.name}</Text>
                {selectedLanguage?.code === item.code && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            )}
            style={styles.languageList}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  createButton: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
  },
  disabledButton: {
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  section: {
    marginBottom: SPACING['2xl'],
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.base,
    backgroundColor: colors.cardBackground,
    color: colors.textPrimary,
    ...SHADOWS.sm,
  },
  helpText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 20,
    flex: 1,
  },
  titleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: SPACING.sm,
  },
  characterCounter: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  characterCounterError: {
    color: colors.error,
  },
  
  // Language Dropdown
  languageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: colors.cardBackground,
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  selectedLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLanguageFlag: {
    fontSize: TYPOGRAPHY.lg,
    marginRight: SPACING.sm,
  },
  selectedLanguageName: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },
  dropdownPlaceholder: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  dropdownArrow: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  
  // Words Per Day Options
  optionsGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  optionText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  optionButtonLocked: {
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    opacity: 0.7,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextLocked: {
    color: colors.textSecondary,
  },
  premiumBadgeSmall: {
    fontSize: TYPOGRAPHY.xs,
    marginLeft: SPACING.xs,
  },
  lockedLabel: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  freeUserNote: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // Limit Indicator Styles
  limitIndicator: {
    backgroundColor: colors.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.medium,
    flex: 1,
  },
  upgradeHint: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.semibold,
    textDecorationLine: 'underline',
  },
  
  // How It Works Collapsible
  howItWorksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...SHADOWS.sm,
  },
  howItWorksTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  expandIcon: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  howItWorksContent: {
    overflow: 'hidden',
    backgroundColor: colors.cardBackground,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
  },
  infoPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  infoBullet: {
    fontSize: TYPOGRAPHY.base,
    color: colors.primary,
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  infoText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  infoTextBold: {
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  modalSpace: {
    width: 60,
  },
  searchContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.base,
    backgroundColor: colors.cardBackground,
    color: colors.textPrimary,
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  languageItemFlag: {
    fontSize: TYPOGRAPHY.lg,
    marginRight: SPACING.md,
  },
  languageItemName: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textPrimary,
    flex: 1,
  },
  checkmark: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.bold,
  },
})