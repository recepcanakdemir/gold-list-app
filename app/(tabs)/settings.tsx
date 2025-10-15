import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { SharedHeader } from '@/components/shared-header'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { supabaseService } from '@/lib/services/supabaseService'
import { notificationService } from '@/lib/services/notificationService'

export default function SettingsScreen() {
  const router = useRouter()
  const { signOut, profile } = useAuth()
  const { appState, settings, updateSettings, refreshData } = useApp()
  const { colors, toggleTheme, isDark } = useTheme()
  
  const [localSettings, setLocalSettings] = useState({
    ...settings,
  })
  const [isResetting, setIsResetting] = useState(false)
  const [testingNotifications, setTestingNotifications] = useState(false)

  const handleSaveSettings = async () => {
    try {
      await updateSettings(localSettings)
      Alert.alert('Success', 'Settings saved successfully')
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings')
    }
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/signin')
          }
        }
      ]
    )
  }

  const updateLocalSetting = (key: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleTestNotification = async (type: 'daily_words' | 'progress_reminder' | 'review_ready' | 'streak_protection') => {
    if (testingNotifications) return

    try {
      setTestingNotifications(true)

      // Test data for different notification types
      const testData = {
        daily_words: {
          wordsCount: 20,
          notebookLanguage: 'French'
        },
        progress_reminder: {
          remaining: 8,
          current: 12,
          target: 20
        },
        review_ready: {
          reviewCount: 15
        },
        streak_protection: {
          streakCount: 7
        }
      }

      await notificationService.triggerNotificationNow(type, testData[type])
      
      Alert.alert(
        'Test Notification Sent!',
        `A test ${type.replace('_', ' ')} notification has been sent.`,
        [{ text: 'OK' }]
      )
    } catch (error) {
      console.error('Error sending test notification:', error)
      Alert.alert('Error', 'Failed to send test notification')
    } finally {
      setTestingNotifications(false)
    }
  }

  const handleCheckScheduledNotifications = async () => {
    try {
      const scheduled = await notificationService.getScheduledNotifications()
      
      if (scheduled.length === 0) {
        Alert.alert('No Scheduled Notifications', 'There are currently no notifications scheduled.')
      } else {
        const notificationList = scheduled.map((n, i) => 
          `${i + 1}. ${n.content.title} (${n.trigger ? 'Scheduled' : 'Immediate'})`
        ).join('\n')
        
        Alert.alert(
          `${scheduled.length} Scheduled Notifications`,
          notificationList,
          [{ text: 'OK' }]
        )
      }
    } catch (error) {
      console.error('Error getting scheduled notifications:', error)
      Alert.alert('Error', 'Failed to get scheduled notifications')
    }
  }

  const handleCancelAllNotifications = async () => {
    try {
      await notificationService.cancelAllNotifications()
      Alert.alert('Success', 'All scheduled notifications have been canceled.')
    } catch (error) {
      console.error('Error canceling notifications:', error)
      Alert.alert('Error', 'Failed to cancel notifications')
    }
  }


  const handleResetUserData = async () => {
    Alert.alert(
      'Reset All Data',
      '⚠️ This will permanently delete ALL your data including:\n\n• All notebooks and words\n• Learning progress and statistics\n• Streak counters and activity\n\nThis action cannot be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset All Data',
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true)
            try {
              if (!profile?.id) {
                throw new Error('User not found')
              }
              
              await supabaseService.resetUserData(profile.id)
              await refreshData?.()
              
              Alert.alert(
                'Success',
                'All user data has been reset successfully. The app will refresh to show the clean state.',
                [{ text: 'OK' }]
              )
            } catch (error) {
              console.error('Reset error:', error)
              Alert.alert(
                'Error',
                'Failed to reset user data. Please try again.',
                [{ text: 'OK' }]
              )
            } finally {
              setIsResetting(false)
            }
          }
        }
      ]
    )
  }

  const styles = createStyles(colors)

  return (
    <View style={styles.container}>
      {/* Header */}
      <SharedHeader 
        title="Settings" 
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.email || 'User'}</Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
            </View>
          </View>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Switch between light and dark themes</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                thumbColor={isDark ? colors.primary : colors.gray400}
              />
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Notifications</Text>
                <Text style={styles.settingDescription}>Receive daily learning reminders</Text>
              </View>
              <Switch
                value={localSettings.enableNotifications}
                onValueChange={(value) => updateLocalSetting('enableNotifications', value)}
                trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                thumbColor={localSettings.enableNotifications ? colors.primary : colors.gray400}
              />
            </View>
          </View>

        </View>


        {/* Testing & Development */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Testing & Development</Text>
          
          {/* Notification Testing */}
          {settings.enableNotifications && (
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Notification Testing</Text>
                  <Text style={styles.settingDescription}>Test different notification types in development</Text>
                </View>
              </View>
              
              <View style={styles.testButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.testButton, testingNotifications && styles.testButtonDisabled]}
                  onPress={() => handleTestNotification('daily_words')}
                  disabled={testingNotifications}
                >
                  <Text style={styles.testButtonText}>📚 Daily Words</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.testButton, testingNotifications && styles.testButtonDisabled]}
                  onPress={() => handleTestNotification('progress_reminder')}
                  disabled={testingNotifications}
                >
                  <Text style={styles.testButtonText}>🎯 Progress</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.testButton, testingNotifications && styles.testButtonDisabled]}
                  onPress={() => handleTestNotification('review_ready')}
                  disabled={testingNotifications}
                >
                  <Text style={styles.testButtonText}>🔄 Review</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.testButton, testingNotifications && styles.testButtonDisabled]}
                  onPress={() => handleTestNotification('streak_protection')}
                  disabled={testingNotifications}
                >
                  <Text style={styles.testButtonText}>🔥 Streak</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.testButtonsContainer}>
                <TouchableOpacity 
                  style={styles.infoButton}
                  onPress={handleCheckScheduledNotifications}
                >
                  <Text style={styles.infoButtonText}>View Scheduled</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancelAllNotifications}
                >
                  <Text style={styles.cancelButtonText}>Cancel All</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Reset All Data</Text>
                <Text style={styles.settingDescription}>Delete all notebooks, words, and progress for testing</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.resetButton, isResetting && styles.resetButtonDisabled]} 
              onPress={handleResetUserData}
              disabled={isResetting}
            >
              <Text style={styles.resetButtonText}>
                {isResetting ? 'Resetting...' : 'Reset All Data'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for bottom nav
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  profileCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  profileInfo: {
    alignItems: 'center' as const,
  },
  profileName: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  profileEmail: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  settingCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  settingRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  settingDescription: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
  },
  counter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: SPACING.md,
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  counterButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
  },
  counterValue: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    minWidth: 30,
    textAlign: 'center' as const,
  },
  saveButton: {
    backgroundColor: colors.primary,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center' as const,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.background,
  },
  signOutButton: {
    backgroundColor: colors.error,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center' as const,
    ...SHADOWS.sm,
  },
  signOutButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.background,
  },
  resetButton: {
    backgroundColor: colors.error,
    marginHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center' as const,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  resetButtonDisabled: {
    backgroundColor: colors.gray400,
    opacity: 0.6,
  },
  resetButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.background,
  },
  testButtonsContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  testButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center' as const,
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  infoButton: {
    flex: 1,
    backgroundColor: colors.info,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center' as const,
    marginRight: SPACING.sm,
  },
  infoButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.warning,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
  },
})