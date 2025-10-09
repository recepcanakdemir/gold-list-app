import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useApp } from '@/lib/contexts/AppContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

export default function NotebookMenuModal() {
  const router = useRouter()
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>()
  const { colors } = useTheme()
  const { refreshNotebooks } = useApp()
  const [showEditTitle, setShowEditTitle] = useState(false)
  const [newTitle, setNewTitle] = useState(title || '')
  const [loading, setLoading] = useState(false)

  const styles = createStyles(colors)

  const handleEditTitle = () => {
    setShowEditTitle(true)
  }

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Error', 'Please enter a notebook title')
      return
    }

    if (newTitle.length > 30) {
      Alert.alert('Error', 'Notebook title must be 30 characters or less')
      return
    }

    if (newTitle.trim() === title) {
      setShowEditTitle(false)
      return
    }

    setLoading(true)
    try {
      await supabaseService.updateNotebookTitle(id!, newTitle.trim())
      await refreshNotebooks()
      setShowEditTitle(false)
      router.back()
      Alert.alert('Success', 'Notebook title updated successfully')
    } catch (error) {
      console.error('Error updating notebook title:', error)
      Alert.alert('Error', 'Failed to update notebook title. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteNotebook = () => {
    Alert.alert(
      'Delete Notebook',
      `Are you sure you want to delete "${title}"? This will permanently delete all words and progress. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteNotebook
        }
      ]
    )
  }

  const confirmDeleteNotebook = async () => {
    setLoading(true)
    try {
      await supabaseService.deleteNotebook(id!)
      await refreshNotebooks()
      router.replace('/(tabs)/')
      Alert.alert('Success', 'Notebook deleted successfully')
    } catch (error) {
      console.error('Error deleting notebook:', error)
      Alert.alert('Error', 'Failed to delete notebook. Please try again.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (showEditTitle) {
      setShowEditTitle(false)
      setNewTitle(title || '')
    } else {
      router.back()
    }
  }

  if (showEditTitle) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Title</Text>
          <TouchableOpacity onPress={handleSaveTitle} disabled={loading}>
            <Text style={[styles.saveButton, loading && styles.disabledButton]}>
              {loading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notebook Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter notebook title"
              placeholderTextColor={colors.textSecondary}
              value={newTitle}
              onChangeText={setNewTitle}
              maxLength={30}
              autoFocus
            />
            <View style={styles.titleFooter}>
              <Text style={styles.helpText}>
                Choose a descriptive name for your vocabulary collection
              </Text>
              <Text style={[styles.characterCounter, newTitle.length > 30 && styles.characterCounterError]}>
                {newTitle.length}/30
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notebook Options</Text>
        <View style={styles.headerSpace} />
      </View>

      <View style={styles.menuContent}>
        <TouchableOpacity style={styles.menuItem} onPress={handleEditTitle} disabled={loading}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuIcon}>✏️</Text>
            <Text style={styles.menuText}>Edit Title</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleDeleteNotebook} disabled={loading}>
          <View style={styles.menuItemContent}>
            <Text style={styles.menuIcon}>🗑️</Text>
            <Text style={[styles.menuText, styles.deleteText]}>Delete Notebook</Text>
          </View>
        </TouchableOpacity>
      </View>
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
  saveButton: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
  },
  disabledButton: {
    color: colors.textSecondary,
  },
  headerSpace: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  section: {
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
  titleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: SPACING.sm,
  },
  helpText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  characterCounter: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    fontWeight: TYPOGRAPHY.medium,
  },
  characterCounterError: {
    color: colors.error,
  },
  menuContent: {
    flex: 1,
    paddingTop: SPACING.xl,
  },
  menuItem: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: TYPOGRAPHY.xl,
    marginRight: SPACING.lg,
  },
  menuText: {
    fontSize: TYPOGRAPHY.lg,
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.medium,
  },
  deleteText: {
    color: colors.error,
  },
})