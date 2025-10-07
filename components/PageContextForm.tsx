import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native'
import { PageContext } from '@/lib/types/pageContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'

interface PageContextFormProps {
  context: PageContext
  onContextChange: (context: PageContext) => void
  isExpanded?: boolean
  onToggleExpanded?: () => void
}

export function PageContextForm({ 
  context, 
  onContextChange, 
  isExpanded = false, 
  onToggleExpanded 
}: PageContextFormProps) {
  const { colors } = useTheme()
  const [animatedHeight] = useState(new Animated.Value(isExpanded ? 1 : 0))
  const styles = createStyles(colors)

  React.useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start()
  }, [isExpanded, animatedHeight])

  const hasContext = Boolean(
    context.title?.trim() || 
    context.source?.trim() || 
    context.theme?.trim() || 
    context.description?.trim()
  )

  const updateContext = (field: keyof PageContext, value: string) => {
    onContextChange({
      ...context,
      [field]: value.trim() || null
    })
  }

  return (
    <View style={styles.container}>
      {/* Header - Always visible */}
      <TouchableOpacity 
        style={[styles.header, hasContext && styles.headerWithContext]}
        onPress={onToggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.contextIcon, hasContext && styles.contextIconActive]}>
            <Text style={[styles.contextIconText, hasContext && styles.contextIconTextActive]}>
              📝
            </Text>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, hasContext && styles.headerTitleActive]}>
              Page Context
            </Text>
            <Text style={styles.headerSubtitle}>
              {hasContext 
                ? `Set for AI sentence generation` 
                : 'Add context for better AI sentences'
              }
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {hasContext && (
            <View style={styles.contextBadge}>
              <Text style={styles.contextBadgeText}>✓</Text>
            </View>
          )}
          <Text style={[styles.expandIcon, { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }]}>
            ▼
          </Text>
        </View>
      </TouchableOpacity>

      {/* Expandable Content */}
      <Animated.View 
        style={[
          styles.formContainer,
          {
            maxHeight: animatedHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 400], // Adjust based on content height
            }),
            opacity: animatedHeight,
          }
        ]}
      >
        <View style={styles.formContent}>
          {/* Quick Context Presets */}
          <View style={styles.presetsSection}>
            <Text style={styles.presetsTitle}>Quick Presets:</Text>
            <View style={styles.presetsContainer}>
              {CONTEXT_PRESETS.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.presetButton}
                  onPress={() => onContextChange(preset)}
                >
                  <Text style={styles.presetButtonText}>{preset.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Manual Input Fields */}
          <View style={styles.inputSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Topic/Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Business English - Meetings"
                value={context.title || ''}
                onChangeText={(value) => updateContext('title', value)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Theme</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., workplace communication"
                value={context.theme || ''}
                onChangeText={(value) => updateContext('theme', value)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Source Material</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Advanced Business English Ch.4"
                value={context.source || ''}
                onChangeText={(value) => updateContext('source', value)}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                placeholder="Additional context for AI generation"
                value={context.description || ''}
                onChangeText={(value) => updateContext('description', value)}
                multiline
                numberOfLines={2}
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Clear Button */}
          {hasContext && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => onContextChange({
                title: null,
                source: null,
                description: null,
                theme: null
              })}
            >
              <Text style={styles.clearButtonText}>Clear All Context</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  )
}

const CONTEXT_PRESETS: PageContext[] = [
  {
    title: 'Business English',
    theme: 'workplace communication',
    source: 'Professional vocabulary',
    description: null
  },
  {
    title: 'Travel & Tourism',
    theme: 'travel situations',
    source: 'Travel guide vocabulary',
    description: null
  },
  {
    title: 'Academic Study',
    theme: 'academic writing',
    source: 'University textbook',
    description: null
  },
  {
    title: 'Daily Conversation',
    theme: 'casual conversation',
    source: 'Everyday vocabulary',
    description: null
  }
]

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  
  // Header (always visible)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerWithContext: {
    backgroundColor: colors.primaryLight || colors.gray100,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  contextIconActive: {
    backgroundColor: colors.primary,
  },
  contextIconText: {
    fontSize: 16,
  },
  contextIconTextActive: {
    fontSize: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  headerTitleActive: {
    color: colors.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    lineHeight: TYPOGRAPHY.sm * 1.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  contextBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success || colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextBadgeText: {
    fontSize: 12,
    color: colors.cardBackground,
    fontWeight: TYPOGRAPHY.bold,
  },
  expandIcon: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.bold,
  },

  // Expandable form content
  formContainer: {
    overflow: 'hidden',
  },
  formContent: {
    padding: SPACING.md,
    paddingTop: 0,
  },

  // Quick presets section
  presetsSection: {
    marginBottom: SPACING.lg,
  },
  presetsTitle: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
    marginBottom: SPACING.sm,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  presetButton: {
    backgroundColor: colors.gray100,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetButtonText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },

  // Input fields section
  inputSection: {
    gap: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.xs,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.base,
    backgroundColor: colors.background,
    color: colors.textPrimary,
  },
  descriptionInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Clear button
  clearButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: SPACING.md,
  },
  clearButtonText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.error,
    fontWeight: TYPOGRAPHY.medium,
  },
})