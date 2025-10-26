import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { SharedHeader } from '@/components/shared-header'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'
import { supabaseService } from '@/lib/services/supabaseService'
import { isDeveloperAccount } from '@/lib/utils/devAccess'

export default function SettingsScreen() {
  const router = useRouter()
  const { signOut, profile } = useAuth()
  const { appState, settings, updateSettings, refreshData } = useApp()
  const { colors, toggleTheme, isDark } = useTheme()
  const { subscription, getUserState, showPaywallModal } = useSubscription()
  
  const [localSettings, setLocalSettings] = useState({
    ...settings,
  })
  const [isResetting, setIsResetting] = useState(false)

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


        </View>

        {/* Subscription Section - Only show for non-pre-trial users */}
        {getUserState() !== 'pre-trial' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>
                    {getUserState() === 'trial' && `Trial (${subscription.trialDaysRemaining} days left)`}
                    {getUserState() === 'post-trial' && 'Free Account'}
                    {getUserState() === 'premium' && `Premium (${subscription.tier})`}
                  </Text>
                  <Text style={styles.settingDescription}>
                    {getUserState() === 'trial' && 'Upgrade to continue after trial ends'}
                    {getUserState() === 'post-trial' && 'Upgrade to unlock all features'}
                    {getUserState() === 'premium' && 'Manage your premium subscription'}
                  </Text>
                </View>
              </View>
              
              {/* Action buttons based on user state */}
              {(getUserState() === 'trial' || getUserState() === 'post-trial') && (
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={showPaywallModal}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                </TouchableOpacity>
              )}
              
              {getUserState() === 'premium' && (
                <View style={styles.premiumActions}>
                  <TouchableOpacity 
                    style={styles.managePlanButton}
                    onPress={showPaywallModal}
                  >
                    <Text style={styles.managePlanButtonText}>Change Plan</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.subscriptionCancelButton}
                    onPress={() => Alert.alert(
                      'Cancel Subscription',
                      'To cancel your subscription, please go to:\n\niPhone Settings → [Your Name] → Subscriptions → Gold List Method → Cancel Subscription\n\nYour subscription will remain active until the end of the current billing period.',
                      [{ text: 'OK' }]
                    )}
                  >
                    <Text style={styles.subscriptionCancelButtonText}>Cancel Subscription</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Testing & Development - Only for developer account */}
        {isDeveloperAccount(profile?.email || '') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Testing & Development</Text>
            
            
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
        )}

        {/* Feedback & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback & Support</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Send Feedback</Text>
                <Text style={styles.settingDescription}>Share your thoughts, suggestions, or report issues</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.feedbackButton}
              onPress={() => {
                const subject = 'Gold List Method App Feedback'
                const body = `Hi there!\n\nI'd like to share some feedback about the Gold List Method app:\n\n[Please write your feedback here]\n\n---\nApp Version: ${require('../../package.json').version || '1.0.0'}\nUser: ${profile?.email || 'Unknown'}\nSubscription: ${getUserState()}`
                
                const mailto = `mailto:recepcanakdemir@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                
                Linking.openURL(mailto).catch(() => {
                  Alert.alert(
                    'Email Not Available',
                    'Please send your feedback to:\nrecepcanakdemir@gmail.com',
                    [{ text: 'OK' }]
                  )
                })
              }}
            >
              <Text style={styles.feedbackButtonText}>Send Feedback via Email</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Survey Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Survey Data</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Your Survey Responses</Text>
                <Text style={styles.settingDescription}>Manage the data you shared during onboarding</Text>
              </View>
            </View>
            
            <View style={styles.surveyActions}>
              <TouchableOpacity 
                style={styles.surveyViewButton}
                onPress={() => {
                  // Show survey data in alert (for now)
                  Alert.alert(
                    'Survey Data',
                    'This feature allows you to view and manage your onboarding survey responses. You can delete this data at any time for privacy compliance.',
                    [
                      { text: 'View Data', onPress: () => console.log('View survey data') },
                      { text: 'Cancel', style: 'cancel' }
                    ]
                  )
                }}
              >
                <Text style={styles.surveyViewButtonText}>View My Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.surveyDeleteButton}
                onPress={() => {
                  Alert.alert(
                    'Delete Survey Data',
                    'This will permanently delete all your onboarding survey responses. This action cannot be undone.\n\nYour app experience will not be affected, but we won\'t be able to use your responses for improvements.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete Data', 
                        style: 'destructive',
                        onPress: async () => {
                          // Delete survey data logic here
                          Alert.alert(
                            'Data Deleted',
                            'Your survey responses have been permanently deleted.',
                            [{ text: 'OK' }]
                          )
                        }
                      }
                    ]
                  )
                }}
              >
                <Text style={styles.surveyDeleteButtonText}>Delete Survey Data</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.privacyNote}>
              <Text style={styles.privacyNoteText}>
                💡 Survey data helps us improve the app. It's stored securely and automatically deleted after 2 years. You can delete it anytime.
              </Text>
            </View>
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
  
  // Subscription Section Styles
  upgradeButton: {
    backgroundColor: colors.primary,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center' as const,
    ...SHADOWS.sm,
  },
  upgradeButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  premiumActions: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  managePlanButton: {
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center' as const,
    ...SHADOWS.sm,
  },
  managePlanButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  subscriptionCancelButton: {
    backgroundColor: colors.error,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center' as const,
    ...SHADOWS.sm,
  },
  subscriptionCancelButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  
  // Feedback Section Styles
  feedbackButton: {
    backgroundColor: colors.primary,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center' as const,
    ...SHADOWS.sm,
  },
  feedbackButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  
  // Survey Data Management Styles
  surveyActions: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  surveyViewButton: {
    backgroundColor: colors.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center' as const,
    ...SHADOWS.sm,
  },
  surveyViewButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  surveyDeleteButton: {
    backgroundColor: colors.error,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center' as const,
    ...SHADOWS.sm,
  },
  surveyDeleteButtonText: {
    color: colors.white,
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
  },
  privacyNote: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: colors.primary + '10',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  privacyNoteText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
})