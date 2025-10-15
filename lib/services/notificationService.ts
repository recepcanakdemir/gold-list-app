import { Platform } from 'react-native'
import { supabaseService } from './supabaseService'

// Mock Notifications API for development without expo-notifications dependency
// When ready to implement real notifications:
// 1. npm install expo-notifications
// 2. Replace this mock with: import * as Notifications from 'expo-notifications'
// 3. Remove mock implementations below

const MockNotifications = {
  setNotificationHandler: (handler: any) => {
    console.log('📱 [MOCK] Notification handler configured')
  },
  requestPermissionsAsync: async () => {
    console.log('📱 [MOCK] Requesting notification permissions')
    return { status: 'granted' as const }
  },
  getPermissionsAsync: async () => {
    console.log('📱 [MOCK] Getting notification permissions')
    return { status: 'granted' as const }
  },
  setNotificationCategoryAsync: async (id: string, actions: any[]) => {
    console.log(`📱 [MOCK] Setting notification category: ${id}`)
  },
  scheduleNotificationAsync: async (notification: any) => {
    const title = notification.content.title
    const body = notification.content.body
    const immediate = !notification.trigger
    console.log(`📱 [MOCK NOTIFICATION] ${title}: ${body}${immediate ? ' (immediate)' : ' (scheduled)'}`)
    return notification.identifier || `mock_${Date.now()}`
  },
  cancelScheduledNotificationAsync: async (id: string) => {
    console.log(`📱 [MOCK] Cancelled notification: ${id}`)
  },
  cancelAllScheduledNotificationsAsync: async () => {
    console.log('📱 [MOCK] Cancelled all scheduled notifications')
  },
  getAllScheduledNotificationsAsync: async () => {
    console.log('📱 [MOCK] Getting all scheduled notifications')
    return []
  }
}

// Use mock instead of real Notifications API
const Notifications = MockNotifications

// All notifications are now mocked - they log to console instead of showing real notifications
const isNativeNotificationsSupported = () => {
  return false // Always return false since we're using mock
}

// Configure mock notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export interface NotificationData {
  type: 'daily_words' | 'progress_reminder' | 'review_ready' | 'streak_protection'
  notebookId?: string
  notebookTitle?: string
  notebookLanguage?: string
  wordsCount?: number
  totalWords?: number
  pageNumber?: number
  streakCount?: number
}

export interface ScheduledNotification {
  id: string
  type: NotificationData['type']
  title: string
  body: string
  data: NotificationData
  scheduledTime: Date
  userId: string
}

class NotificationService {
  private isInitialized = false
  private isDevMode = false
  private currentUserId: string | null = null

  async initialize(userId: string, devMode = false) {
    if (this.isInitialized && this.currentUserId === userId) return

    this.currentUserId = userId
    this.isDevMode = devMode
    
    // Check if native notifications are supported on this platform
    if (!isNativeNotificationsSupported()) {
      console.log('📱 Native notifications disabled on iOS for development. Notification logic will work but notifications will be logged instead of sent.')
      this.isInitialized = true
      return true // Return success so the logic continues
    }

    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync()
      
      if (status !== 'granted') {
        console.log('📱 Notification permissions denied - notifications will be logged instead')
        this.isInitialized = true
        return true // Still return success for development
      }

      // Set up notification categories for better organization
      await this.setupNotificationCategories()
      
      this.isInitialized = true
      console.log('✅ Native notifications initialized successfully')
      return true
    } catch (error) {
      console.log('📱 Notification initialization failed, falling back to logging mode:', error)
      this.isInitialized = true
      return true // Still return success for development
    }
  }

  private async setupNotificationCategories() {
    // Define notification categories for better organization
    await Notifications.setNotificationCategoryAsync('LEARNING_REMINDERS', [
      {
        identifier: 'VIEW_NOTEBOOK',
        buttonTitle: 'Open Notebook',
        options: { opensAppToForeground: true }
      }
    ])
  }

  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync()
    return status === 'granted'
  }

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync()
    return status
  }

  // Schedule daily word addition notifications
  async scheduleDailyWordReminders(notebooks: any[], simulatedDate?: Date) {
    if (!this.isInitialized) return

    const currentDate = simulatedDate || new Date()
    const reminderTime = new Date(currentDate)
    reminderTime.setHours(14, 0, 0, 0) // 2:00 PM

    // Only schedule for today if time hasn't passed (or in dev mode)
    if (!this.isDevMode && reminderTime.getTime() <= currentDate.getTime()) {
      return
    }

    for (const notebook of notebooks) {
      // Check if notebook has an unlocked but empty page for today
      const todayPage = await this.getTodayPage(notebook.id, currentDate)
      
      if (todayPage && todayPage.words_count === 0) {
        const notification: ScheduledNotification = {
          id: `daily_words_${notebook.id}_${this.getDateString(currentDate)}`,
          type: 'daily_words',
          title: `📚 Add ${notebook.words_per_day || 20} words to your ${notebook.language} notebook!`,
          body: `Time to add today's vocabulary words`,
          data: {
            type: 'daily_words',
            notebookId: notebook.id,
            notebookTitle: notebook.title,
            notebookLanguage: notebook.language,
            wordsCount: notebook.words_per_day || 20,
            pageNumber: todayPage.page_number
          },
          scheduledTime: reminderTime,
          userId: this.currentUserId!
        }

        await this.scheduleNotification(notification)
      }
    }
  }

  // Schedule progress reminder notifications
  async scheduleProgressReminders(notebooks: any[], simulatedDate?: Date) {
    if (!this.isInitialized) return

    const currentDate = simulatedDate || new Date()
    const reminderTime = new Date(currentDate)
    reminderTime.setHours(17, 0, 0, 0) // 5:00 PM

    if (!this.isDevMode && reminderTime.getTime() <= currentDate.getTime()) {
      return
    }

    const partialNotebooks = []

    for (const notebook of notebooks) {
      const todayPage = await this.getTodayPage(notebook.id, currentDate)
      
      if (todayPage && todayPage.words_count > 0 && todayPage.words_count < (notebook.words_per_day || 20)) {
        partialNotebooks.push({
          ...notebook,
          currentWords: todayPage.words_count,
          targetWords: notebook.words_per_day || 20,
          remaining: (notebook.words_per_day || 20) - todayPage.words_count
        })
      }
    }

    if (partialNotebooks.length > 0) {
      const notification = this.createProgressNotification(partialNotebooks, currentDate)
      await this.scheduleNotification(notification)
    }
  }

  // Schedule review reminder notifications
  async scheduleReviewReminders(notebooks: any[], simulatedDate?: Date) {
    if (!this.isInitialized) return

    const currentDate = simulatedDate || new Date()
    const reminderTime = new Date(currentDate)
    reminderTime.setHours(19, 0, 0, 0) // 7:00 PM

    if (!this.isDevMode && reminderTime.getTime() <= currentDate.getTime()) {
      return
    }

    const reviewNotebooks = []

    for (const notebook of notebooks) {
      const reviewCount = await this.getReviewWordsCount(notebook.id, currentDate)
      
      if (reviewCount > 0) {
        reviewNotebooks.push({
          ...notebook,
          reviewCount
        })
      }
    }

    if (reviewNotebooks.length > 0) {
      const notification = this.createReviewNotification(reviewNotebooks, currentDate)
      await this.scheduleNotification(notification)
    }
  }

  // Schedule streak protection notifications
  async scheduleStreakProtection(profile: any, simulatedDate?: Date) {
    if (!this.isInitialized) return
    
    if (!profile) {
      console.log('🔔 [MOCK] Streak protection skipped - profile not loaded yet')
      return
    }
    
    if (!profile.streak_count || profile.streak_count === 0) return

    const currentDate = simulatedDate || new Date()
    const reminderTime = new Date(currentDate)
    reminderTime.setHours(21, 0, 0, 0) // 9:00 PM

    if (!this.isDevMode && reminderTime.getTime() <= currentDate.getTime()) {
      return
    }

    // Check if user has been active today
    const hasActivityToday = await this.checkActivityToday(profile.id, currentDate)
    
    if (!hasActivityToday) {
      const notification: ScheduledNotification = {
        id: `streak_protection_${profile.id}_${this.getDateString(currentDate)}`,
        type: 'streak_protection',
        title: `🔥 Don't break your ${profile.streak_count}-day streak!`,
        body: `Keep your learning momentum going`,
        data: {
          type: 'streak_protection',
          streakCount: profile.streak_count
        },
        scheduledTime: reminderTime,
        userId: this.currentUserId!
      }

      await this.scheduleNotification(notification)
    }
  }

  private createProgressNotification(notebooks: any[], currentDate: Date): ScheduledNotification {
    const totalRemaining = notebooks.reduce((sum, nb) => sum + nb.remaining, 0)
    
    let title: string
    let body: string

    if (notebooks.length === 1) {
      const nb = notebooks[0]
      title = `🎯 Almost there! ${nb.remaining} more words to complete your ${nb.language} goal`
      body = `(${nb.currentWords}/${nb.targetWords})`
    } else {
      title = `📚 Finish strong! ${totalRemaining} words remaining across ${notebooks.length} notebooks`
      body = notebooks.map(nb => `${nb.remaining} ${nb.language}`).join(' + ')
    }

    return {
      id: `progress_reminder_${this.getDateString(currentDate)}`,
      type: 'progress_reminder',
      title,
      body,
      data: {
        type: 'progress_reminder',
        totalWords: totalRemaining
      },
      scheduledTime: new Date(currentDate.getTime()),
      userId: this.currentUserId!
    }
  }

  private createReviewNotification(notebooks: any[], currentDate: Date): ScheduledNotification {
    const totalReviews = notebooks.reduce((sum, nb) => sum + nb.reviewCount, 0)
    
    let title: string
    let body: string

    if (notebooks.length === 1) {
      const nb = notebooks[0]
      title = `🔄 ${nb.reviewCount} ${nb.language} words ready for review!`
      body = `Time to review your vocabulary`
    } else {
      title = `📚 Review time! ${totalReviews} words ready across ${notebooks.length} notebooks`
      body = notebooks.map(nb => `${nb.reviewCount} ${nb.language}`).join(' + ')
    }

    return {
      id: `review_reminder_${this.getDateString(currentDate)}`,
      type: 'review_ready',
      title,
      body,
      data: {
        type: 'review_ready',
        totalWords: totalReviews
      },
      scheduledTime: new Date(currentDate.getTime()),
      userId: this.currentUserId!
    }
  }

  private async scheduleNotification(notification: ScheduledNotification) {
    try {
      // Cancel any existing notification with the same ID
      await Notifications.cancelScheduledNotificationAsync(notification.id)

      // Schedule the mock notification (logs to console)
      await Notifications.scheduleNotificationAsync({
        identifier: notification.id,
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          categoryIdentifier: 'LEARNING_REMINDERS'
        },
        trigger: this.isDevMode ? null : { date: notification.scheduledTime }
      })

      console.log(`📱 [MOCK] Scheduled notification: ${notification.title}`, 
        this.isDevMode ? '(DEV MODE - immediate)' : `at ${notification.scheduledTime.toLocaleTimeString()}`)

      // Always store in database for history
      await this.storeNotificationHistory(notification)

    } catch (error) {
      console.error('Failed to schedule notification:', error)
    }
  }

  // Manual trigger for development testing
  async triggerNotificationNow(type: NotificationData['type'], data: any = {}) {
    let title: string
    let body: string

    switch (type) {
      case 'daily_words':
        title = `📚 Add ${data.wordsCount || 20} words to your ${data.notebookLanguage || 'language'} notebook!`
        body = `Time to add today's vocabulary words`
        break
      case 'progress_reminder':
        title = `🎯 Almost there! ${data.remaining || 5} more words to complete your goal`
        body = `(${data.current || 15}/${data.target || 20})`
        break
      case 'review_ready':
        title = `🔄 ${data.reviewCount || 10} words ready for review!`
        body = `Time to review your vocabulary`
        break
      case 'streak_protection':
        title = `🔥 Don't break your ${data.streakCount || 7}-day streak!`
        body = `Keep your learning momentum going`
        break
    }

    await Notifications.scheduleNotificationAsync({
      identifier: `test_${type}_${Date.now()}`,
      content: {
        title,
        body,
        data: { type, ...data }
      },
      trigger: null // Immediate
    })
    console.log(`📱 [MOCK] Sent test notification: ${title}`)
    console.log(`📱 [MOCK] Notification data:`, { type, ...data })
  }

  // Helper methods
  private async getTodayPage(notebookId: string, currentDate: Date) {
    try {
      return await supabaseService.getTodayPage(notebookId, currentDate)
    } catch (error) {
      console.error('Error getting today page:', error)
      return null
    }
  }

  private async getReviewWordsCount(notebookId: string, currentDate: Date): Promise<number> {
    try {
      const words = await supabaseService.getWordsForReview(notebookId, currentDate)
      return words?.length || 0
    } catch (error) {
      console.error('Error getting review words count:', error)
      return 0
    }
  }

  private async checkActivityToday(userId: string, currentDate: Date): Promise<boolean> {
    try {
      // Check if user has added words or done reviews today
      const activity = await supabaseService.getUserActivityToday(userId, currentDate)
      return activity > 0
    } catch (error) {
      console.error('Error checking activity:', error)
      return false
    }
  }

  private async storeNotificationHistory(notification: ScheduledNotification) {
    try {
      await supabaseService.storeNotificationHistory({
        id: notification.id,
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        scheduled_at: notification.scheduledTime.toISOString(),
        sent_at: this.isDevMode ? new Date().toISOString() : null
      })
    } catch (error) {
      console.error('Failed to store notification history:', error)
    }
  }

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  // Public methods for notification management
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync()
    console.log('🚫 [MOCK] Cancelled all scheduled notifications')
  }

  async cancelNotificationsForType(type: NotificationData['type']) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    const typeNotifications = scheduled.filter(n => n.content?.data?.type === type)
    
    for (const notification of typeNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier)
    }
    
    console.log(`🚫 [MOCK] Cancelled ${typeNotifications.length} notifications of type: ${type}`)
  }

  async getScheduledNotifications(): Promise<any[]> {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    console.log('📋 [MOCK] Getting scheduled notifications - returning mock array')
    return scheduled
  }

  // Schedule all notifications for a user
  async scheduleAllNotifications(notebooks: any[], profile: any, simulatedDate?: Date) {
    if (!this.isInitialized) return

    const currentDate = simulatedDate || new Date()
    
    // Cancel existing notifications for today to prevent duplicates
    await this.cancelTodaysNotifications(currentDate)
    
    // Schedule all notification types
    await Promise.all([
      this.scheduleDailyWordReminders(notebooks, currentDate),
      this.scheduleProgressReminders(notebooks, currentDate),
      this.scheduleReviewReminders(notebooks, currentDate),
      this.scheduleStreakProtection(profile, currentDate)
    ])
  }

  private async cancelTodaysNotifications(currentDate: Date) {
    const dateString = this.getDateString(currentDate)
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    
    const todaysNotifications = scheduled.filter(n => 
      n.identifier.includes(dateString)
    )
    
    for (const notification of todaysNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier)
    }
  }
}

export const notificationService = new NotificationService()