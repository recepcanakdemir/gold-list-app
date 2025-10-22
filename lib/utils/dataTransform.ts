/**
 * Data transformation utilities for converting database responses (snake_case) 
 * to frontend-expected format (camelCase)
 */

// Type definitions for database responses (snake_case)
export interface DBTodayProgress {
  words_added: number
  goal: number
  completed: boolean
}

export interface DBWeeklyProgressDay {
  day_name: string
  words_added: number
  words_remembered: number
  completed: boolean
}

export interface DBDailyProgress {
  date: string
  words_added: number
  words_reviewed: number
  words_mastered: number
  total_study_time?: number
}

export interface DBMonthlyProgressMonth {
  month: string
  words_added: number
  words_mastered: number
}

export interface DBTotalStats {
  total_added: number
  total_mastered: number
}

// Type definitions for frontend-expected format (camelCase)
export interface FrontendTodayProgress {
  wordsAdded: number
  goal: number
  completed: boolean
}

export interface FrontendWeeklyProgressDay {
  day: string
  wordsAdded: number
  wordsRemembered: number
  completed: boolean
}

export interface FrontendDailyProgress {
  date: string
  wordsAdded: number
  wordsReviewed: number
  wordsMastered: number
  totalStudyTime?: number
}

export interface FrontendMonthlyProgressMonth {
  month: string
  wordsAdded: number
  wordsMastered: number
}

export interface FrontendTotalStats {
  totalAdded: number
  totalMastered: number
}

/**
 * Transform today's progress from database format to frontend format
 */
export function transformTodayProgress(dbData: DBTodayProgress | null): FrontendTodayProgress {
  if (!dbData) {
    return { wordsAdded: 0, goal: 20, completed: false }
  }
  
  return {
    wordsAdded: dbData.words_added || 0,
    goal: dbData.goal || 20,
    completed: dbData.completed || false
  }
}

/**
 * Transform weekly progress array from database format to frontend format
 */
export function transformWeeklyProgress(dbData: DBWeeklyProgressDay[] | null): FrontendWeeklyProgressDay[] {
  if (!dbData || !Array.isArray(dbData)) {
    // Return default weekly structure with proper day names
    return [
      { day: 'Mon', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Tue', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Wed', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Thu', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Fri', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Sat', wordsAdded: 0, wordsRemembered: 0, completed: false },
      { day: 'Sun', wordsAdded: 0, wordsRemembered: 0, completed: false },
    ]
  }
  
  return dbData.map(dayData => ({
    day: dayData.day_name || 'Mon', // Convert day_name to day
    wordsAdded: dayData.words_added || 0,
    wordsRemembered: dayData.words_remembered || 0,
    completed: dayData.completed || false
  }))
}

/**
 * Transform daily progress array from database format to frontend format
 */
export function transformDailyProgress(dbData: DBDailyProgress[] | null): FrontendDailyProgress[] {
  if (!dbData || !Array.isArray(dbData)) {
    return []
  }
  
  return dbData.map(dayData => ({
    date: dayData.date,
    wordsAdded: dayData.words_added || 0,
    wordsReviewed: dayData.words_reviewed || 0,
    wordsMastered: dayData.words_mastered || 0,
    totalStudyTime: dayData.total_study_time || 0
  }))
}

/**
 * Transform monthly progress array from database format to frontend format
 */
export function transformMonthlyProgress(dbData: DBMonthlyProgressMonth[] | null): FrontendMonthlyProgressMonth[] {
  if (!dbData || !Array.isArray(dbData)) {
    // Return default monthly structure with proper month names
    return [
      { month: 'Apr', wordsAdded: 0, wordsMastered: 0 },
      { month: 'May', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Jun', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Jul', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Aug', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Sep', wordsAdded: 0, wordsMastered: 0 },
      { month: 'Oct', wordsAdded: 0, wordsMastered: 0 },
    ]
  }
  
  return dbData.map(monthData => ({
    month: monthData.month || 'Jan', // Use month field directly from database
    wordsAdded: monthData.words_added || 0,
    wordsMastered: monthData.words_mastered || 0
  }))
}

/**
 * Transform total stats from database format to frontend format
 */
export function transformTotalStats(dbData: DBTotalStats | null): FrontendTotalStats {
  if (!dbData) {
    return { totalAdded: 0, totalMastered: 0 }
  }
  
  return {
    totalAdded: dbData.total_added || 0,
    totalMastered: dbData.total_mastered || 0
  }
}

/**
 * Generic utility to convert snake_case keys to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  )
}

/**
 * Convert an object with snake_case keys to camelCase keys
 */
export function transformObjectKeysToCamel<T = any>(obj: any): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformObjectKeysToCamel(item)) as T
  }
  
  const result: any = {}
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    result[camelKey] = transformObjectKeysToCamel(value)
  }
  
  return result as T
}

/**
 * Debug utility to log data transformation
 */
export function logTransformation(originalData: any, transformedData: any, context: string) {
  if (__DEV__) {
    console.log(`🔄 Data Transformation [${context}]:`)
    console.log('  Original (snake_case):', originalData)
    console.log('  Transformed (camelCase):', transformedData)
  }
}