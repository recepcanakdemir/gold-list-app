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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useApp } from '@/lib/contexts/AppContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { isDeveloperAccount } from '@/lib/utils/devAccess'
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
  const { profile } = useAuth()
  const { colors } = useTheme()
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

    // No subscription checks needed (hard paywall model - users here are already subscribed)

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
            {wordsPerDayOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  wordsPerDay === option && styles.optionButtonSelected
                ]}
                onPress={() => setWordsPerDay(option)}
              >
                <Text style={[
                  styles.optionText,
                  wordsPerDay === option && styles.optionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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