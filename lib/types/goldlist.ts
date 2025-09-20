import { Tables } from './database'

// Core Gold List Method types
export type Round = 1 | 2 | 3 | 4
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
export interface NotebookWithStats extends Tables<'notebooks'> {
  pendingReviews: number
  todaysTarget: number
  completedToday: boolean
  currentStreak: number
  weeklyProgress: number
}

export interface PageWithWords extends Tables<'pages'> {
  words: WordWithReviews[]
  notebook: Tables<'notebooks'>
}

export interface WordWithReviews extends Tables<'words'> {
  reviews: Tables<'reviews'>[]
  page: Tables<'pages'>
  nextReviewDate: Date | null
  daysSinceCreated: number
  isReadyForReview: boolean
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
  words: Partial<Tables<'words'>>[]
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
  user: Tables<'profiles'> | null
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

// Color themes for rounds
export const ROUND_COLORS = {
  1: { primary: '#DC2626', light: '#FEE2E2', dark: '#991B1B' }, // Red
  2: { primary: '#059669', light: '#D1FAE5', dark: '#047857' }, // Green  
  3: { primary: '#2563EB', light: '#DBEAFE', dark: '#1D4ED8' }, // Blue
  4: { primary: '#D97706', light: '#FEF3C7', dark: '#B45309' }, // Yellow/Orange
} as const

// Notebook level colors
export const NOTEBOOK_LEVEL_COLORS = {
  bronze: { primary: '#CD7F32', light: '#F3E5AB', dark: '#8B4513' },
  silver: { primary: '#C0C0C0', light: '#F5F5F5', dark: '#708090' },
  gold: { primary: '#FFD700', light: '#FFFACD', dark: '#B8860B' },
} as const