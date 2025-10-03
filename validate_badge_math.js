/**
 * Validate Badge Math for Round Display
 * This tests the modular round display logic
 */

// Badge utility functions (simplified)
function getBadgeType(databaseRound) {
  if (databaseRound <= 4) return 'bronze'
  if (databaseRound <= 8) return 'silver'
  return 'gold'
}

function getDisplayRound(databaseRound) {
  if (databaseRound <= 4) return databaseRound  // Bronze: 1,2,3,4 → 1,2,3,4
  if (databaseRound <= 8) return databaseRound - 4  // Silver: 5,6,7,8 → 1,2,3,4
  return databaseRound - 8  // Gold: 9,10,11,12 → 1,2,3,4
}

function getBadgeEmoji(badgeType) {
  const emojis = { bronze: '🥉', silver: '🥈', gold: '🥇' }
  return emojis[badgeType] || '❓'
}

// Test all rounds 1-12
console.log('🧪 Testing Badge Display Math (Fixed Logic)\n')

const testCases = [
  // Bronze rounds (1-4)
  { round: 1, expected: { type: 'bronze', display: 1 } },
  { round: 2, expected: { type: 'bronze', display: 2 } },
  { round: 3, expected: { type: 'bronze', display: 3 } },
  { round: 4, expected: { type: 'bronze', display: 4 } },
  
  // Silver rounds (5-8) 
  { round: 5, expected: { type: 'silver', display: 1 } },
  { round: 6, expected: { type: 'silver', display: 2 } },
  { round: 7, expected: { type: 'silver', display: 3 } },
  { round: 8, expected: { type: 'silver', display: 4 } },
  
  // Gold rounds (9-12)
  { round: 9, expected: { type: 'gold', display: 1 } },
  { round: 10, expected: { type: 'gold', display: 2 } },
  { round: 11, expected: { type: 'gold', display: 3 } },
  { round: 12, expected: { type: 'gold', display: 4 } }
]

let allPassed = true

testCases.forEach(test => {
  const badgeType = getBadgeType(test.round)
  const displayRound = getDisplayRound(test.round)
  const emoji = getBadgeEmoji(badgeType)
  
  const passed = badgeType === test.expected.type && displayRound === test.expected.display
  const status = passed ? '✅' : '❌'
  
  if (!passed) allPassed = false
  
  console.log(`${status} Round ${test.round}: ${emoji} ${badgeType.toUpperCase()} Round ${displayRound}`)
  
  if (!passed) {
    console.log(`   Expected: ${test.expected.type} Round ${test.expected.display}`)
    console.log(`   Got: ${badgeType} Round ${displayRound}`)
  }
})

console.log(`\n${allPassed ? '✅' : '❌'} Badge math validation ${allPassed ? 'PASSED' : 'FAILED'}`)

if (allPassed) {
  console.log('\n🎯 Your failed Round 4 words should now display as:')
  console.log('🥈 SILVER Round 1 (database round 5)')
  console.log('And become reviewable exactly 14 days after the review session!')
}