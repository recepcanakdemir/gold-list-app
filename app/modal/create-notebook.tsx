import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  Animated,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { mockDataService, languageOptions } from '@/lib/services/mockData'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

export default function CreateNotebookModal() {
  const router = useRouter()
  const { profile } = useAuth()
  const { appState } = useApp()
  const { colors } = useTheme()
  const [title, setTitle] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<{
    code: string
    name: string
    flag: string
  } | null>(null)
  const [wordsPerDay, setWordsPerDay] = useState(20)
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

    if (!selectedLanguage) {
      Alert.alert('Error', 'Please select a language')
      return
    }

    if (wordsPerDay < 10 || wordsPerDay > 25) {
      Alert.alert('Error', 'Words per day must be between 10 and 25')
      return
    }

    // Check premium limitations
    if (profile?.subscription_status === 'free' && appState.notebooks.length >= 3) {
      Alert.alert(
        'Premium Feature',
        'Free users can create up to 3 notebooks. Upgrade to Premium to create unlimited notebooks and unlock advanced features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => {
              router.back()
              router.push('/modal/paywall')
            }
          }
        ]
      )
      return
    }

    setLoading(true)
    try {
      await mockDataService.createNotebook({
        title: title.trim(),
        language: selectedLanguage.name,
        language_code: selectedLanguage.code,
        words_per_day: wordsPerDay,
      })

      Alert.alert(
        'Success!',
        'Your notebook has been created. You can now start adding vocabulary.',
        [{ text: 'OK', onPress: () => router.back() }]
      )
    } catch (error) {
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
        <TouchableOpacity onPress={() => router.back()}>
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
            maxLength={50}
          />
          <Text style={styles.helpText}>
            Choose a descriptive name for your vocabulary collection
          </Text>
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
          <Text style={styles.sectionTitle}>Daily Goal (Optional)</Text>
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

        {/* Collapsible How It Works */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.howItWorksHeader} onPress={toggleHowItWorks}>
            <Text style={styles.howItWorksTitle}>📚 How it works</Text>
            <Text style={[styles.expandIcon, howItWorksExpanded && styles.expandIconRotated]}>
              ▼
            </Text>
          </TouchableOpacity>
          
          <Animated.View style={[styles.howItWorksContent, { height: expandedHeight }]}>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Add vocabulary daily without pressure to memorize
              </Text>
            </View>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Review words after 2 weeks of natural memory formation
              </Text>
            </View>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Archive remembered words, continue with forgotten ones
              </Text>
            </View>
            <View style={styles.infoPoint}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>
                Most words stick permanently after just one review cycle
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