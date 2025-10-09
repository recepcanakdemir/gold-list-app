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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useApp } from '@/lib/contexts/AppContext'
import { useTheme } from '@/lib/contexts/ThemeContext'

export default function SettingsModal() {
  const router = useRouter()
  const { signOut, profile } = useAuth()
  const { settings, updateSettings } = useApp()
  const { colors, toggleTheme, isDark } = useTheme()
  
  const [localSettings, setLocalSettings] = useState(settings)

  const handleSaveSettings = async () => {
    try {
      await updateSettings(localSettings)
      Alert.alert('Success', 'Settings saved successfully')
      router.back()
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleSaveSettings}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              <Text style={styles.profileStatus}>
                Gold List Method
              </Text>
            </View>
            <View style={styles.profileStats}>
              <Text style={styles.profileStat}>{profile?.total_words_added || 0} words added</Text>
              <Text style={styles.profileStat}>{profile?.total_words_mastered || 0} mastered</Text>
              <Text style={styles.profileStat}>{profile?.streak_count || 0} day streak</Text>
            </View>
          </View>

        </View>

        {/* Learning Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learning Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Words per day</Text>
              <Text style={styles.settingDescription}>
                Default target for new notebooks
              </Text>
            </View>
            <View style={styles.settingControls}>
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

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Review interval</Text>
              <Text style={styles.settingDescription}>
                Days to wait before first review
              </Text>
            </View>
            <View style={styles.settingControls}>
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

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Notifications</Text>
              <Text style={styles.settingDescription}>
                Daily reminders to add words and review
              </Text>
            </View>
            <Switch
              value={localSettings.enableNotifications}
              onValueChange={(value) => updateLocalSetting('enableNotifications', value)}
              trackColor={{ false: colors.gray200, true: colors.primaryLight }}
              thumbColor={localSettings.enableNotifications ? colors.primary : colors.gray400}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDescription}>
                Vibration for swipes and interactions
              </Text>
            </View>
            <Switch
              value={localSettings.enableHapticFeedback}
              onValueChange={(value) => updateLocalSetting('enableHapticFeedback', value)}
              trackColor={{ false: colors.gray200, true: colors.primaryLight }}
              thumbColor={localSettings.enableHapticFeedback ? colors.primary : colors.gray400}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Switch between light and dark themes
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.gray200, true: colors.primaryLight }}
              thumbColor={isDark ? colors.primary : colors.gray400}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>About Gold List Method</Text>
            <Text style={styles.aboutArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>How to Use</Text>
            <Text style={styles.aboutArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Privacy Policy</Text>
            <Text style={styles.aboutArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Terms of Service</Text>
            <Text style={styles.aboutArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.versionRow}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <TouchableOpacity style={styles.dataRow}>
            <View>
              <Text style={styles.dataLabel}>Export Data</Text>
              <Text style={styles.dataDescription}>
                Download your vocabulary and progress
              </Text>
            </View>
            <Text style={styles.dataArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dataRow}>
            <View>
              <Text style={styles.dataLabel}>Import Data</Text>
              <Text style={styles.dataDescription}>
                Import from another app or backup
              </Text>
            </View>
            <Text style={styles.dataArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Delete Account</Text>
            <Text style={styles.deleteButtonSubtext}>
              This action cannot be undone
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: colors.gray100,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  profileInfo: {
    marginBottom: 12,
  },
  profileEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileStatus: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  profileStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileStat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.cardBackground,
    marginBottom: 4,
  },
  upgradeButtonSubtext: {
    fontSize: 12,
    color: colors.primaryLight,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  aboutLabel: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  aboutArrow: {
    fontSize: 16,
    color: colors.textLight,
  },
  versionRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dataLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  dataDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  dataArrow: {
    fontSize: 16,
    color: colors.textLight,
  },
  signOutButton: {
    backgroundColor: colors.gray200,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  deleteButton: {
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 4,
  },
  deleteButtonSubtext: {
    fontSize: 12,
    color: colors.error,
    opacity: 0.7,
  },
})