import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { supabaseService } from '@/lib/services/supabaseService'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

interface Notification {
  id: string
  type: 'daily_words' | 'progress_reminder' | 'review_ready' | 'streak_protection'
  title: string
  body: string
  sent_at: string
  read_at: string | null
  clicked_at: string | null
  data: any
}

interface NotificationDisplay extends Notification {
  time: string
  isRead: boolean
  icon: string
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { colors } = useTheme()
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const styles = createStyles(colors)

  useEffect(() => {
    loadNotifications()
  }, [user?.id])

  const loadNotifications = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const rawNotifications = await supabaseService.getNotificationHistory(user.id)
      const count = await supabaseService.getUnreadNotificationCount(user.id)
      
      // Transform notifications for display
      const displayNotifications: NotificationDisplay[] = rawNotifications.map(notification => ({
        ...notification,
        time: formatNotificationTime(notification.sent_at),
        isRead: notification.read_at !== null,
        icon: getNotificationIcon(notification.type)
      }))

      setNotifications(displayNotifications)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading notifications:', error)
      Alert.alert('Error', 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const formatNotificationTime = (timestamp: string): string => {
    const now = new Date()
    const sent = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - sent.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return '1 day ago'
    if (diffInDays < 7) return `${diffInDays} days ago`
    
    return sent.toLocaleDateString()
  }

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'daily_words': return '📚'
      case 'progress_reminder': return '🎯'
      case 'review_ready': return '🔄'
      case 'streak_protection': return '🔥'
      default: return '📱'
    }
  }

  const getNotificationColor = (type: string, isRead: boolean) => {
    if (isRead) return colors.gray100
    
    switch (type) {
      case 'daily_words':
        return colors.primaryLight
      case 'progress_reminder':
        return colors.warningLight
      case 'review_ready':
        return colors.successLight
      case 'streak_protection':
        return colors.errorLight
      default:
        return colors.gray100
    }
  }

  const handleNotificationPress = async (notification: NotificationDisplay) => {
    try {
      // Mark as read if not already read
      if (!notification.isRead) {
        await supabaseService.markNotificationRead(notification.id)
        await loadNotifications() // Refresh to show updated state
      }

      // Mark as clicked
      await supabaseService.markNotificationClicked(notification.id)

      // Navigate based on notification type
      const notebookId = notification.data?.notebookId
      if (notebookId) {
        switch (notification.type) {
          case 'daily_words':
          case 'progress_reminder':
            router.push(`/notebook/${notebookId}/input`)
            break
          case 'review_ready':
            router.push(`/notebook/${notebookId}/review`)
            break
          case 'streak_protection':
            router.push(`/notebook/${notebookId}`)
            break
        }
      }
    } catch (error) {
      console.error('Error handling notification press:', error)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return

    try {
      const updatedCount = await supabaseService.markAllNotificationsRead(user.id)
      if (updatedCount > 0) {
        await loadNotifications() // Refresh to show updated state
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      Alert.alert('Error', 'Failed to mark notifications as read')
    }
  }

  const renderNotification = (notification: NotificationDisplay) => (
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
        
        <Text style={styles.notificationMessage}>{notification.body}</Text>
        
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
        
        <TouchableOpacity 
          style={styles.markAllButton}
          onPress={handleMarkAllRead}
          disabled={unreadCount === 0}
        >
          <Text style={[
            styles.markAllText,
            unreadCount === 0 && { opacity: 0.5 }
          ]}>
            Mark All Read {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyMessage}>
              We'll notify you about your learning progress and daily goals.
            </Text>
          </View>
        ) : (
          <>
            {/* Today Section */}
            {notifications.some(n => n.time.includes('hours ago') || n.time === 'Just now') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Today</Text>
                {notifications
                  .filter(n => n.time.includes('hours ago') || n.time === 'Just now')
                  .map(renderNotification)}
              </View>
            )}

            {/* Earlier Section */}
            {notifications.some(n => !n.time.includes('hours ago') && n.time !== 'Just now') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earlier</Text>
                {notifications
                  .filter(n => !n.time.includes('hours ago') && n.time !== 'Just now')
                  .map(renderNotification)}
              </View>
            )}
          </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING['6xl'],
  },
  loadingText: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
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