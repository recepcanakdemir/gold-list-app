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

export default function SettingsScreen() {
  const router = useRouter()
  const { signOut, profile } = useAuth()
  const { settings, updateSettings } = useApp()
  const { colors, toggleTheme, isDark } = useTheme()
  
  const [localSettings, setLocalSettings] = useState(settings)

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

  const styles = createStyles(colors)

  return (
    <View style={styles.container}>
      {/* Header */}
      <SharedHeader title="Settings" />

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

        {/* Learning Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Settings</Text>
          
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Daily Word Goal</Text>
                <Text style={styles.settingDescription}>Number of new words to learn each day</Text>
              </View>
              <View style={styles.counter}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => updateLocalSetting('wordsPerDay', Math.max(5, localSettings.wordsPerDay - 5))}
                >
                  <Text style={styles.counterButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{localSettings.wordsPerDay}</Text>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => updateLocalSetting('wordsPerDay', Math.min(50, localSettings.wordsPerDay + 5))}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Review Interval</Text>
                <Text style={styles.settingDescription}>Days between review sessions</Text>
              </View>
              <View style={styles.counter}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => updateLocalSetting('reviewIntervalDays', Math.max(7, localSettings.reviewIntervalDays - 1))}
                >
                  <Text style={styles.counterButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{localSettings.reviewIntervalDays}</Text>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => updateLocalSetting('reviewIntervalDays', Math.min(30, localSettings.reviewIntervalDays + 1))}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
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

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
                <Text style={styles.settingDescription}>Vibration feedback for interactions</Text>
              </View>
              <Switch
                value={localSettings.enableHapticFeedback}
                onValueChange={(value) => updateLocalSetting('enableHapticFeedback', value)}
                trackColor={{ false: colors.gray200, true: colors.primaryLight }}
                thumbColor={localSettings.enableHapticFeedback ? colors.primary : colors.gray400}
              />
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
})