import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { mockDataService } from '@/lib/services/mockData'
import { NotebookWithStats, WordWithReviews } from '@/lib/types/goldlist'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS, FLAG_EMOJIS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SharedHeader } from '@/components/shared-header'
import { BottomNav } from '@/components/bottom-nav'

const { width: screenWidth } = Dimensions.get('window')

interface PageData {
  id: string
  pageNumber: number
  round: number
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'perfect'
  wordsCount: number
  completedWords: number
  type: 'lesson' | 'review' | 'checkpoint' | 'story'
}

export default function NotebookDetailsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const [notebook, setNotebook] = useState<NotebookWithStats | null>(null)
  const [words, setWords] = useState<WordWithReviews[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPage, setSelectedPage] = useState<PageData | null>(null)

  useEffect(() => {
    loadNotebookData()
  }, [id])

  const loadNotebookData = async () => {
    if (!id) return
    
    try {
      const notebookData = await mockDataService.getNotebook(id)
      const wordsData = await mockDataService.getWordsForNotebook(id)
      
      setNotebook(notebookData)
      setWords(wordsData)
    } catch (error) {
      Alert.alert('Error', 'Failed to load notebook data')
    } finally {
      setLoading(false)
    }
  }

  const generatePathData = (): PageData[] => {
    if (!notebook || !words.length) return []

    const pages: PageData[] = []
    const wordsPerPage = 20
    const totalPages = Math.ceil(words.length / wordsPerPage) || 5 // Default 5 pages for demo

    for (let i = 0; i < totalPages; i++) {
      const pageWords = words.slice(i * wordsPerPage, (i + 1) * wordsPerPage)
      const completedWords = pageWords.filter(w => w.status === 'mastered').length
      
      let status: PageData['status'] = 'locked'
      let type: PageData['type'] = 'lesson'

      // First page is always available
      if (i === 0) {
        status = completedWords === pageWords.length ? 'perfect' : 
                 completedWords > 0 ? 'in_progress' : 'available'
      } 
      // Unlock pages 2, 4, 5 for demo (page numbers 2, 4, 5 = indices 1, 3, 4)
      else if (i === 1 || i === 3 || i === 4) {
        status = completedWords === pageWords.length ? 'perfect' : 
                 completedWords > 0 ? 'in_progress' : 'available'
      } 
      else {
        const prevPage = pages[i - 1]
        if (prevPage.status === 'completed' || prevPage.status === 'perfect') {
          status = completedWords === pageWords.length ? 'perfect' : 
                   completedWords > 0 ? 'in_progress' : 'available'
        }
      }

      // Every 5th page is a checkpoint
      if ((i + 1) % 5 === 0) {
        type = 'checkpoint'
      }
      // Every 10th page could be a story/special lesson
      else if ((i + 1) % 10 === 0) {
        type = 'story'
      }
      // Review pages for higher rounds
      else if (i > 0 && Math.random() > 0.7) {
        type = 'review'
      }

      pages.push({
        id: `page-${i}`,
        pageNumber: i + 1,
        round: Math.min(Math.floor(i / 5) + 1, 4), // Round 1-4
        status,
        wordsCount: pageWords.length || wordsPerPage,
        completedWords,
        type
      })
    }

    return pages
  }

  const pathData = generatePathData()

  // Create styles before any early returns
  const styles = createStyles(colors)

  const getPageIcon = (page: PageData) => {
    switch (page.type) {
      case 'checkpoint':
        return '🎯'
      case 'story':
        return '📚'
      case 'review':
        return '🔄' // Modern refresh icon for review
      default:
        return page.status === 'perfect' ? '⭐' : 
               page.status === 'completed' ? '✅' : 
               page.status === 'in_progress' ? '🎮' : '📝' // Game controller for progress, pencil for new
    }
  }

  const getPageColor = (page: PageData) => {
    if (page.status === 'locked') return colors.gray300
    if (page.status === 'perfect') return colors.success
    if (page.status === 'completed') return colors.primary
    if (page.status === 'in_progress') return colors.warning
    return colors.primary
  }

  const handlePagePress = (page: PageData) => {
    if (page.status === 'locked') {
      Alert.alert('Locked', 'Complete the previous lessons to unlock this page')
      return
    }

    // Toggle: if same page is already selected, close it; otherwise open new one
    if (selectedPage?.id === page.id) {
      setSelectedPage(null)
    } else {
      setSelectedPage(page)
    }
  }

  const handleActionPress = (page: PageData) => {
    if (page.type === 'review') {
      router.push(`/notebook/${id}/review?round=${page.round}`)
    } else {
      router.push(`/notebook/${id}/input?page=${page.pageNumber}`)
    }
    setSelectedPage(null)
  }

  const closePage = () => {
    setSelectedPage(null)
  }

  // Calculate smooth Duolingo-style curve positions with even spacing
  const getNodePosition = (index: number) => {
    const centerX = screenWidth / 2
    const amplitude = 80 // How far left/right the curve goes
    const wavelength = 6 // How many nodes per full wave (more even distribution)
    const baseSpacing = 130 // Base vertical distance between nodes
    
    // Create a smooth sine wave pattern similar to Duolingo
    const phase = (index * 2 * Math.PI) / wavelength
    const xOffset = Math.sin(phase) * amplitude
    
    // Add secondary wave for more organic feel (reduced to maintain evenness)
    const secondaryPhase = (index * 2 * Math.PI) / (wavelength * 2)
    const secondaryOffset = Math.sin(secondaryPhase) * 10
    
    const finalX = centerX + xOffset + secondaryOffset
    
    // Use consistent vertical spacing instead of multiplication
    const yPosition = 50 + (index * baseSpacing) // Start with 50px offset from top
    
    return {
      x: finalX - 45, // Subtract half circle width for centering (90/2 = 45)
      y: yPosition
    }
  }

  const renderPathNode = (page: PageData, index: number) => {
    const color = getPageColor(page)
    const position = getNodePosition(index)
    const isSelected = selectedPage?.id === page.id

    // Determine if bubble should appear on left or right based on circle position
    const circleCenter = position.x + 45 // Circle center (circle width is 90, so center is at x + 45)
    const isOnLeftSide = circleCenter < screenWidth / 2
    
    return (
      <View key={page.id} style={[
        styles.pathNode, 
        { 
          position: 'absolute',
          left: position.x,
          top: position.y,
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.pageButton,
            { backgroundColor: color },
            page.status === 'locked' && styles.pageButtonLocked,
            page.type === 'checkpoint' && styles.checkpointButton,
            page.type === 'story' && styles.storyButton,
            isSelected && styles.pageButtonSelected,
          ]}
          onPress={() => handlePagePress(page)}
          disabled={page.status === 'locked'}
        >
          <Text style={styles.pageNumber}>{page.pageNumber}</Text>
          {page.status === 'in_progress' && (
            <View style={styles.progressRing}>
              <View style={[styles.progressFill, { 
                transform: [{ rotate: `${(page.completedWords / page.wordsCount) * 360}deg` }] 
              }]} />
            </View>
          )}
        </TouchableOpacity>

        {/* Speech Bubble Popup */}
        {isSelected && (
          <View style={[
            styles.speechBubble,
            isOnLeftSide ? styles.speechBubbleRight : styles.speechBubbleLeft
          ]}>
            <View style={styles.speechBubbleContent}>
              <Text style={styles.speechBubbleTitle}>
                {page.type === 'checkpoint' ? 'Checkpoint' : 
                 page.type === 'story' ? 'Story' :
                 page.type === 'review' ? 'Review' : 'Lesson'} {page.pageNumber}
              </Text>
              <Text style={styles.speechBubbleDescription}>
                {page.type === 'review' ? 
                  `Review words from Round ${page.round}` :
                  `Add ${page.wordsCount} new words`
                }
              </Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleActionPress(page)}
              >
                <Text style={styles.actionButtonText}>
                  {page.type === 'review' ? 'Start Review' : 'Add Words'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[
              styles.speechBubbleArrow,
              isOnLeftSide ? styles.speechBubbleArrowRight : styles.speechBubbleArrowLeft
            ]} />
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notebook...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!notebook) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Notebook not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Shared Header */}
      <SharedHeader title={notebook.title} showBackButton={true} />
      
      {/* Notebook Language Info */}
      <View style={styles.languageHeader}>
        <Text style={styles.languageFlag}>{FLAG_EMOJIS[notebook.language_code] || '🌍'}</Text>
        <Text style={styles.languageText}>{notebook.language}</Text>
      </View>


      {/* Learning Path */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.pathContainer}>
        <TouchableOpacity 
          style={[styles.pathBackground, { height: pathData.length * 130 + 250 }]}
          activeOpacity={1}
          onPress={closePage}
        >
          {pathData.map((page, index) => renderPathNode(page, index))}
        </TouchableOpacity>
        
        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>


      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.error,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  languageFlag: {
    fontSize: TYPOGRAPHY.base,
  },
  languageText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: TYPOGRAPHY.semibold,
  },
  scrollView: {
    flex: 1,
  },
  pathContainer: {
    paddingVertical: SPACING.xl,
    paddingBottom: 100, // Padding for bottom nav only
  },
  pathBackground: {
    position: 'relative',
    width: '100%',
    paddingHorizontal: SPACING.xl,
  },
  pathNode: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 90,
    height: 90,
  },
  pageButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
    position: 'relative',
  },
  pageButtonLocked: {
    opacity: 0.4,
  },
  checkpointButton: {
    // Remove extra styling, keep same size as regular buttons
  },
  storyButton: {
    // Remove extra styling, keep same size as regular buttons
  },
  pageNumber: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pageButtonSelected: {
    transform: [{ scale: 1.1 }],
    ...SHADOWS.lg,
  },
  progressRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  progressFill: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  bottomSpacing: {
    height: SPACING['6xl'],
  },
  
  // Speech Bubble Styles
  speechBubble: {
    position: 'absolute',
    top: -15, // Moved 1.2x lower: -25 + (25 * 0.4) = -15
    width: 160,
    alignItems: 'center',
    zIndex: 1000,
  },
  speechBubbleLeft: {
    right: 80, // Position to the left of circle
  },
  speechBubbleRight: {
    left: 80, // Position to the right of circle
  },
  speechBubbleContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    minWidth: 140,
    maxWidth: 160,
    ...SHADOWS.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speechBubbleArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    position: 'absolute',
  },
  speechBubbleArrowLeft: {
    right: -12, // Arrow positioned at edge of bubble pointing toward circle
    top: '50%',
    marginTop: -8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.cardBackground,
  },
  speechBubbleArrowRight: {
    left: -12, // Arrow positioned at edge of bubble pointing toward circle
    top: '50%',
    marginTop: -8,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.cardBackground,
  },
  speechBubbleTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  speechBubbleDescription: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    ...SHADOWS.sm,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
    textAlign: 'center',
  },
})