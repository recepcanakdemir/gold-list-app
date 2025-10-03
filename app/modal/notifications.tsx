import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

interface Notification {
  id: string
  type: 'achievement' | 'reminder' | 'social' | 'system'
  title: string
  message: string
  time: string
  isRead: boolean
  icon: string
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'Streak Achievement!',
    message: 'Congratulations! You\'ve maintained a 7-day learning streak.',
    time: '2 hours ago',
    isRead: false,
    icon: '🏆'
  },
  {
    id: '2',
    type: 'reminder',
    title: 'Daily Review Ready',
    message: 'You have 15 words ready for review in Spanish Notebook.',
    time: '4 hours ago',
    isRead: false,
    icon: '📚'
  },
  {
    id: '3',
    type: 'system',
    title: 'App Update Available',
    message: 'New features and improvements are available. Update now!',
    time: '1 day ago',
    isRead: true,
    icon: '🔄'
  },
  {
    id: '4',
    type: 'achievement',
    title: 'Perfect Score!',
    message: 'You scored 100% on your French vocabulary review!',
    time: '2 days ago',
    isRead: true,
    icon: '⭐'
  },
  {
    id: '5',
    type: 'reminder',
    title: 'Time to Practice',
    message: 'Your optimal learning window is now. Ready to continue?',
    time: '3 days ago',
    isRead: true,
    icon: '⏰'
  },
  {
    id: '6',
    type: 'social',
    title: 'Weekly Challenge',
    message: 'Join this week\'s vocabulary challenge with other learners!',
    time: '5 days ago',
    isRead: true,
    icon: '🎯'
  }
]

export default function NotificationsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = createStyles(colors)

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return colors.gray100
    
    switch (type) {
      case 'achievement':
        return colors.successLight
      case 'reminder':
        return colors.primaryLight
      case 'social':
        return colors.warningLight
      case 'system':
        return colors.infoLight
      default:
        return colors.gray100
    }
  }

  const handleNotificationPress = (notification: Notification) => {
    // In a real app, mark as read and navigate to relevant screen
    console.log('Notification pressed:', notification.title)
  }

  const renderNotification = (notification: Notification) => (
    <TouchableOpacity
      key={notification.id}
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadNotification,
        { backgroundColor: getNotificationColor(notification.type, notification.isRead) }
      ]}
      onPress={() => handleNotificationPress(notification)}
    >
      <View style={styles.notificationIcon}>
        <Text style={styles.notificationIconText}>{notification.icon}</Text>
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[
            styles.notificationTitle,
            !notification.isRead && styles.unreadTitle
          ]}>
            {notification.title}
          </Text>
          <Text style={styles.notificationTime}>{notification.time}</Text>
        </View>
        
        <Text style={styles.notificationMessage}>{notification.message}</Text>
        
        {!notification.isRead && (
          <View style={styles.unreadDot} />
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Notifications</Text>
        
        <TouchableOpacity style={styles.markAllButton}>
          <Text style={styles.markAllText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Today Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          {mockNotifications.slice(0, 2).map(renderNotification)}
        </View>

        {/* Earlier Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earlier</Text>
          {mockNotifications.slice(2).map(renderNotification)}
        </View>

        {/* Empty State */}
        {mockNotifications.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyMessage}>
              We&apos;ll notify you about your learning progress and achievements.
            </Text>
          </View>
        )}
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.xl,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
  },
  markAllButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  markAllText: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.primary,
    fontWeight: TYPOGRAPHY.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING['4xl'],
  },
  section: {
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    position: 'relative',
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  notificationIconText: {
    fontSize: TYPOGRAPHY.xl,
  },
  notificationContent: {
    flex: 1,
    position: 'relative',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  notificationTitle: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.textPrimary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  unreadTitle: {
    fontWeight: TYPOGRAPHY.semibold,
  },
  notificationTime: {
    fontSize: TYPOGRAPHY.xs,
    color: colors.textSecondary,
  },
  notificationMessage: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    lineHeight: TYPOGRAPHY.sm * 1.4,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING['6xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
    marginBottom: SPACING.md,
  },
  emptyMessage: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.base * 1.4,
  },
})