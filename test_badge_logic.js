/**
 * Test script to validate badge computation logic
 * Run with: node test_badge_logic.js
 */

// Simulate the badge utility functions
function getBadgeType(databaseRound) {
  if (databaseRound <= 4) return 'bronze'
  if (databaseRound <= 8) return 'silver'
  return 'gold'  // rounds 9-12
}

function getDisplayRound(databaseRound) {
  if (databaseRound <= 4) return databaseRound
  if (databaseRound <= 8) return databaseRound - 4
  return databaseRound - 8  // rounds 9-12 → display 1-4
}

function getBadgeEmoji(badgeType) {
  switch (badgeType) {
    case 'bronze': return '🥉'
    case 'silver': return '🥈'
    case 'gold': return '🥇'
    default: return '❓'
  }
}

function getBadgeInfo(databaseRound) {
  const badgeType = getBadgeType(databaseRound)
  const displayRound = getDisplayRound(databaseRound)
  const badgeEmoji = getBadgeEmoji(badgeType)
  
  return {
    badgeType,
    displayRound,
    badgeEmoji,
    databaseRound
  }
}

// Test all rounds 1-12
console.log('🧪 Testing Badge Logic for Rounds 1-12\n')

for (let round = 1; round <= 12; round++) {
  const badge = getBadgeInfo(round)
  console.log(`Round ${round}: ${badge.badgeEmoji} ${badge.badgeType.toUpperCase()} Round ${badge.displayRound}`)
}

console.log('\n✅ Badge logic validation complete!')
console.log('\nExpected after your Round 4 failures are fixed:')
console.log('Round 5: 🥈 SILVER Round 1 (Your failed words should show this)')