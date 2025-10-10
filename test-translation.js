// Simple test script to test translation Edge Function
// Run with: node test-translation.js

const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables or replace with actual values
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url'
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTranslation(word, sourceLanguage = 'French', targetLanguage = 'English') {
  console.log(`\n🧪 Testing translation: "${word}" (${sourceLanguage} → ${targetLanguage})`)
  
  try {
    const { data, error } = await supabase.functions.invoke('translate-word', {
      body: {
        word,
        sourceLanguage,
        targetLanguage
      }
    })
    
    if (error) {
      console.error(`❌ Error:`, error)
      return false
    }
    
    if (data.error) {
      console.error(`❌ Function Error:`, data.error)
      return false
    }
    
    console.log(`✅ Success: "${word}" → "${data.translation}"`)
    return true
  } catch (err) {
    console.error(`💥 Exception:`, err)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting translation tests...')
  
  const testWords = [
    'le chat',      // Previously working
    'beinvenue',    // Previously failing  
    'bonjour',      // Simple word
    'voiture',      // Common word
    'maison',       // Basic word
    'jardin',       // Another common word
    'difficile',    // Longer word
    'ordinateur',   // Complex word
  ]
  
  let successCount = 0
  let totalCount = testWords.length
  
  for (const word of testWords) {
    const success = await testTranslation(word)
    if (success) successCount++
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.log(`\n📊 Test Results: ${successCount}/${totalCount} successful`)
  
  if (successCount < totalCount) {
    console.log('\n⚠️  Some translations failed. Check Supabase Edge Function logs for detailed error information.')
    console.log('Run: npx supabase functions logs translate-word --follow')
  }
}

runTests().catch(console.error)