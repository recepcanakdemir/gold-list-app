import { Tables } from './database'

// Helper type aliases
type NotebookRow = Tables<'notebooks'>['Row']
type PageRow = Tables<'pages'>['Row']
type WordRow = Tables<'words'>['Row']
type ReviewRow = Tables<'reviews'>['Row']
type ProfileRow = Tables<'profiles'>['Row']

// Core Gold List Method types
export type Round = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
export type NotebookLevel = 'bronze' | 'silver' | 'gold'
export type WordStatus = 'learning' | 'mastered' | 'failed'
export type SubscriptionStatus = 'free' | 'weekly' | 'annual'

export interface GoldListSettings {
  wordsPerDay: number
  reviewIntervalDays: number
  enableNotifications: boolean
  enableHapticFeedback: boolean
}

// Extended types with relationships
export interface NotebookWithStats extends NotebookRow {
  pendingReviews: number
  todaysTarget: number
  completedToday: boolean
  currentStreak: number
  weeklyProgress: number
}

export interface PageWithWords extends PageRow {
  words: WordWithReviews[]
  notebook: NotebookRow
}

export interface WordWithReviews extends WordRow {
  reviews: ReviewRow[]
  page: PageRow
  nextReviewDate: Date | null
  daysSinceCreated: number
  isReadyForReview: boolean
  // Badge system properties
  badge_type?: 'bronze' | 'silver' | 'gold'
  review_type?: 'word' | 'page'
  notebook_level?: 'bronze' | 'silver' | 'gold'
}

// Progress tracking types
export interface DailyProgress {
  date: string
  wordsAdded: number
  wordsReviewed: number
  wordsRemembered: number
  wordsForgotten: number
  sessionDurationMinutes: number
}

export interface WeeklyStats {
  weekStartDate: string
  totalWordsAdded: number
  totalWordsReviewed: number
  averageAccuracy: number
  streakDays: number
  sessionsCompleted: number
}

export interface MonthlyStats {
  month: string
  year: number
  totalWordsAdded: number
  totalWordsMastered: number
  notebooksActive: number
  averageDailyWords: number
  longestStreak: number
}

// Review session types
export interface ReviewSession {
  id: string
  notebookId: string
  words: WordWithReviews[]
  currentIndex: number
  startTime: Date
  responses: ReviewResponse[]
  isCompleted: boolean
}

export interface ReviewResponse {
  wordId: string
  remembered: boolean
  responseTimeMs: number
  timestamp: Date
}

// Input session types
export interface InputSession {
  notebookId: string
  pageId: string
  words: Partial<Tables<'words'>['Insert']>[]
  targetCount: number
  currentIndex: number
  mode: 'focus' | 'fullpage'
}

// Onboarding types
export interface OnboardingProgress {
  currentStep: number
  totalSteps: number
  hasCompletedWelcome: boolean
  hasCompletedTutorial: boolean
  hasCreatedFirstNotebook: boolean
  hasAddedFirstWords: boolean
  hasCompletedFirstReview: boolean
}

// Analytics types
export interface AnalyticsData {
  totalVocabulary: number
  masteredWords: number
  currentStreak: number
  longestStreak: number
  averageAccuracy: number
  timeSpentLearning: number // in minutes
  notebooksCount: number
  favoriteLearningTime: string // hour of day
  weeklyGoalProgress: number // percentage
}

// App state types
export interface AppState {
  user: ProfileRow | null
  notebooks: NotebookWithStats[]
  currentNotebook: NotebookWithStats | null
  reviewSession: ReviewSession | null
  inputSession: InputSession | null
  onboardingProgress: OnboardingProgress
  settings: GoldListSettings
  isOffline: boolean
  lastSyncTime: Date | null
}

// Navigation types
export interface NotebookStackParams {
  NotebookDetail: { notebookId: string }
  WordInput: { notebookId: string; pageId?: string; mode?: 'focus' | 'fullpage' }
  Review: { notebookId: string; words: string[] }
}

export interface RootStackParams {
  Onboarding: undefined
  Main: undefined
  Paywall: { source: string }
  Settings: undefined
}

// Color themes for rounds - Custom color scheme
export const ROUND_COLORS = {
  // Bronze rounds (1-4) - Warmer, earthy tones
  1: { primary: '#E54747', light: '#F8D7D7', dark: '#C63636' }, // Custom Red
  2: { primary: '#8CAF64', light: '#E8F5D8', dark: '#7A9E5A' }, // Custom Green
  3: { primary: '#009FFD', light: '#CCF2FF', dark: '#0080CC' }, // Custom Blue
  4: { primary: '#FFA400', light: '#FFF4CC', dark: '#E69500' }, // Custom Orange
  
  // Silver rounds (5-8) - Cooler, sophisticated tones
  5: { primary: '#A347E5', light: '#F0E6FC', dark: '#8E3BC7' }, // Custom Purple
  6: { primary: '#D6EFFF', light: '#F0F9FF', dark: '#B8E6FF' }, // Custom Light Blue
  7: { primary: '#FED99B', light: '#FFF8E6', dark: '#FECA66' }, // Custom Light Orange
  8: { primary: '#C9883A', light: '#F2E6D6', dark: '#B07A34' }, // Custom Brown
  
  // Gold rounds (9-12) - Premium, rich tones
  9: { primary: '#01967B', light: '#CCF2ED', dark: '#017A65' },  // Custom Teal
  10: { primary: '#929982', light: '#F0F0ED', dark: '#7A7A70' }, // Custom Gray-Green
  11: { primary: '#710000', light: '#E6CCCC', dark: '#5C0000' }, // Custom Dark Red
  12: { primary: '#FE654F', light: '#FFEEED', dark: '#E55A47' }, // Custom Coral
} as const

// Notebook level colors
export const NOTEBOOK_LEVEL_COLORS = {
  bronze: { primary: '#CD7F32', light: '#F3E5AB', dark: '#8B4513' },
  silver: { primary: '#C0C0C0', light: '#F5F5F5', dark: '#708090' },
  gold: { primary: '#FFD700', light: '#FFFACD', dark: '#B8860B' },
} as const