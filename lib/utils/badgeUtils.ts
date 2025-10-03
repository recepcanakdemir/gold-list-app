/**
 * Badge computation utilities for the simplified round-based badge system
 * 
 * Round mapping:
 * - Rounds 1-4: Bronze 🥉 (displayed as rounds 1,2,3,4)
 * - Rounds 5-8: Silver 🥈 (displayed as rounds 1,2,3,4) 
 * - Rounds 9-12: Gold 🥇 (displayed as rounds 1,2,3,4)
 */

export type BadgeType = 'bronze' | 'silver' | 'gold'

export interface BadgeInfo {
  badgeType: BadgeType
  displayRound: number
  badgeEmoji: string
  badgeColor: string
}

/**
 * Computes badge type from database round number
 */
export function getBadgeType(databaseRound: number): BadgeType {
  if (databaseRound <= 4) return 'bronze'
  if (databaseRound <= 8) return 'silver'
  return 'gold'  // rounds 9-12
}

/**
 * Computes display round (1-4) from database round number
 */
export function getDisplayRound(databaseRound: number): number {
  if (databaseRound <= 4) return databaseRound  // Bronze: 1,2,3,4 → 1,2,3,4
  if (databaseRound <= 8) return databaseRound - 4  // Silver: 5,6,7,8 → 1,2,3,4
  return databaseRound - 8  // Gold: 9,10,11,12 → 1,2,3,4
}

/**
 * Gets complete badge information for a word
 */
export function getBadgeInfo(databaseRound: number): BadgeInfo {
  const badgeType = getBadgeType(databaseRound)
  const displayRound = getDisplayRound(databaseRound)
  
  const badgeConfig = {
    bronze: { emoji: '🥉', color: '#CD7F32' },
    silver: { emoji: '🥈', color: '#C0C0C0' },
    gold: { emoji: '🥇', color: '#FFD700' }
  }
  
  const config = badgeConfig[badgeType]
  
  return {
    badgeType,
    displayRound,
    badgeEmoji: config.emoji,
    badgeColor: config.color
  }
}

/**
 * Gets badge emoji for quick display
 */
export function getBadgeEmoji(databaseRound: number): string {
  const badgeType = getBadgeType(databaseRound)
  return badgeType === 'bronze' ? '🥉' : badgeType === 'silver' ? '🥈' : '🥇'
}

/**
 * Gets theme-aware badge color
 */
export function getBadgeColor(databaseRound: number, isDark: boolean = false): string {
  const badgeType = getBadgeType(databaseRound)
  
  if (isDark) {
    return {
      bronze: '#B8860B',  // Darker bronze for dark theme
      silver: '#A8A8A8',  // Darker silver for dark theme  
      gold: '#DAA520'     // Darker gold for dark theme
    }[badgeType]
  }
  
  return {
    bronze: '#CD7F32',
    silver: '#C0C0C0', 
    gold: '#FFD700'
  }[badgeType]
}

/**
 * Checks if a word is at maximum difficulty (Gold Round 4 = Database Round 12)
 */
export function isMaxDifficulty(databaseRound: number): boolean {
  return databaseRound >= 12
}

/**
 * Gets human-readable badge level description
 */
export function getBadgeDescription(databaseRound: number): string {
  const { badgeType, displayRound } = getBadgeInfo(databaseRound)
  const level = badgeType.charAt(0).toUpperCase() + badgeType.slice(1)
  return `${level} Round ${displayRound}`
}

/**
 * Gets next badge type for progression indication
 */
export function getNextBadgeType(databaseRound: number): BadgeType | null {
  const currentBadge = getBadgeType(databaseRound)
  if (currentBadge === 'bronze') return 'silver'
  if (currentBadge === 'silver') return 'gold'
  return null  // Gold is the final level
}

/**
 * Calculates database round from badge type and display round
 * Useful for testing or manual data creation
 */
export function calculateDatabaseRound(badgeType: BadgeType, displayRound: number): number {
  const baseRound = {
    bronze: 0,   // Bronze rounds 1-4 → database 1-4
    silver: 4,   // Silver rounds 1-4 → database 5-8
    gold: 8      // Gold rounds 1-4 → database 9-12
  }[badgeType]
  
  return baseRound + displayRound
}

/**
 * Gets Gold List Method progress percentage (0-100)
 * Based on 12 total rounds across all difficulty levels
 */
export function getProgressPercentage(databaseRound: number): number {
  return Math.min(Math.round((databaseRound / 12) * 100), 100)
}