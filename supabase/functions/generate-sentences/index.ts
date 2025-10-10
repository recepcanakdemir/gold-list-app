const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateSentencesRequest {
  word: string
  translation: string
  targetLanguage: string
  nativeLanguage: string
  pageContext?: {
    title?: string | null
    source?: string | null
    description?: string | null
    theme?: string | null
  }
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
  avoidPatterns?: string[] // Patterns to avoid for anti-repetition
}

interface GenerateSentencesResponse {
  sentence: string
  sentenceBold: string
  sentenceMeaning: string
  meaningBold: string
  contextUsed: boolean
  generatedAt: string
  error?: string
}

function buildPrompt(request: GenerateSentencesRequest): string {
  const { word, translation, targetLanguage, nativeLanguage, pageContext, difficultyLevel = 'intermediate', avoidPatterns = [] } = request

  // Add variety and randomization to prevent similar sentences
  const scenarios = [
    'daily life conversation', 'restaurant setting', 'travel situation', 'workplace interaction',
    'family discussion', 'shopping experience', 'social gathering', 'educational context',
    'casual meeting', 'formal conversation', 'storytelling', 'giving advice'
  ]
  
  const sentenceStyles = [
    'descriptive sentence', 'question format', 'exclamation', 'statement',
    'comparison', 'past tense narrative', 'future planning', 'conditional statement'
  ]
  
  const emotionalTones = [
    'neutral', 'enthusiastic', 'thoughtful', 'curious', 'friendly', 'informative'
  ]

  // Randomly select variety elements using timestamp-based randomization
  const timestamp = Date.now()
  const scenarioIndex = timestamp % scenarios.length
  const styleIndex = Math.floor(timestamp / 1000) % sentenceStyles.length
  const toneIndex = Math.floor(timestamp / 10000) % emotionalTones.length
  
  const selectedScenario = scenarios[scenarioIndex]
  const selectedStyle = sentenceStyles[styleIndex]
  const selectedTone = emotionalTones[toneIndex]

  let prompt = `Generate 1 UNIQUE and CREATIVE example sentence using the word "${word}" (meaning: ${translation}) in ${targetLanguage}.
Then translate that sentence to ${nativeLanguage}.

Word: ${word} (meaning: ${translation})
Target language: ${targetLanguage}
User language: ${nativeLanguage}

VARIETY INSTRUCTIONS - Make this sentence DIFFERENT from typical examples:
- Use scenario: ${selectedScenario}
- Style: ${selectedStyle}
- Emotional tone: ${selectedTone}
- AVOID generic patterns like "I like..." or "This is..."
- Create an INTERESTING and MEMORABLE example
${avoidPatterns.length > 0 ? `
ANTI-REPETITION - DO NOT create sentences similar to these recent examples:
${avoidPatterns.map((pattern, i) => `${i + 1}. ${pattern}`).join('\n')}
Create something COMPLETELY DIFFERENT from these patterns.` : ''}
`

  if (pageContext && (pageContext.title || pageContext.theme || pageContext.source)) {
    prompt += `\nContext for sentence generation:\n`
    if (pageContext.title) prompt += `- Topic: ${pageContext.title}\n`
    if (pageContext.theme) prompt += `- Theme: ${pageContext.theme}\n`
    if (pageContext.source) prompt += `- Source: ${pageContext.source}\n`
    if (pageContext.description) prompt += `- Description: ${pageContext.description}\n`
    prompt += `Combine this context with the scenario (${selectedScenario}) for extra uniqueness. `
  }

  prompt += `\nRequirements:
1. Create a sentence appropriate for ${difficultyLevel} level learners
2. Make the sentence practical yet CREATIVE and VARIED
3. Ensure the word "${word}" is used naturally in context
4. Keep the sentence between 8-15 words
5. Make it culturally appropriate and memorable
6. Use proper grammar and natural ${targetLanguage} sentence structure
7. IMPORTANT: Generate something unexpected and interesting, not generic examples

Response format - GENERATE TWO VERSIONS OF EACH:
SENTENCE: [clean sentence without any formatting using "${word}" in ${targetLanguage}]
SENTENCE_BOLD: [same sentence with target word/phrase marked using <b>word</b>]
MEANING: [clean translation to ${nativeLanguage}]
MEANING_BOLD: [same translation with target word/phrase marked using <b>word</b>]

Word highlighting instructions:
- For single words: "book" → "I like <b>books</b>" (mark actual form used)
- For phrases: "wake up" → "<b>Wake</b> him <b>up</b>" (mark each part of phrasal verb)
- For expressions: mark the exact words that relate to the target word/phrase
- Use <b>word</b> format for highlighting (HTML-style bold tags)
- Keep clean versions completely free of any formatting`

  if (pageContext?.theme) {
    prompt += `\n\nBlend the theme "${pageContext.theme}" with the ${selectedScenario} scenario for maximum creativity.`
  }

  return prompt
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify API key is available
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      console.error('GEMINI_API_KEY not found in environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'AI service not configured properly',
          sentence: '',
          sentenceMeaning: '',
          contextUsed: false,
          generatedAt: new Date().toISOString()
        } as GenerateSentencesResponse),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const requestData: GenerateSentencesRequest = await req.json()
    
    // Validate required fields
    if (!requestData.word || !requestData.translation || !requestData.targetLanguage) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: word, translation, targetLanguage',
          sentence: '',
          sentenceMeaning: '',
          contextUsed: false,
          generatedAt: new Date().toISOString()
        } as GenerateSentencesResponse),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🤖 Generating sentences for word: "${requestData.word}" (${requestData.translation})`)

    const prompt = buildPrompt(requestData)
    console.log(`🎯 Using prompt: ${prompt.substring(0, 100)}...`)

    // Direct HTTP call to Gemini API (Deno-compatible)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9, // Increased for more creative variety
          topK: 50,        // Increased for more diverse word choices
          topP: 0.9,       // Increased for more randomness
          maxOutputTokens: 200,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!generatedText) {
      throw new Error('No text generated from Gemini API')
    }

    console.log(`✅ Generated text: ${generatedText}`)

    // Parse the generated response for dual versions with more robust regex
    const sentenceMatch = generatedText.match(/SENTENCE:\s*(.+?)(?=\n|SENTENCE_BOLD|MEANING|$)/is)
    const sentenceBoldMatch = generatedText.match(/SENTENCE_BOLD:\s*(.+?)(?=\n|MEANING|$)/is)
    const meaningMatch = generatedText.match(/MEANING:\s*(.+?)(?=\n|MEANING_BOLD|$)/is)
    const meaningBoldMatch = generatedText.match(/MEANING_BOLD:\s*(.+?)(?=\n|$)/is)
    
    // Debug logging for regex matches
    console.log(`🔍 PARSING DEBUG:`)
    console.log(`  - sentenceMatch: ${sentenceMatch ? sentenceMatch[1] : 'NULL'}`)
    console.log(`  - sentenceBoldMatch: ${sentenceBoldMatch ? sentenceBoldMatch[1] : 'NULL'}`)
    console.log(`  - meaningMatch: ${meaningMatch ? meaningMatch[1] : 'NULL'}`)
    console.log(`  - meaningBoldMatch: ${meaningBoldMatch ? meaningBoldMatch[1] : 'NULL'}`)
    
    // Extract clean versions and ensure they don't contain any markers
    const sentence = (sentenceMatch?.[1]?.trim() || `${requestData.word} is used in this example sentence.`).replace(/\*\*(.*?)\*\*/g, '$1').replace(/<b>(.*?)<\/b>/g, '$1')
    const sentenceBold = sentenceBoldMatch?.[1]?.trim() || `${requestData.word} is used in this <b>${requestData.word}</b> sentence.`
    const sentenceMeaning = (meaningMatch?.[1]?.trim() || `This is an example using ${requestData.word}.`).replace(/\*\*(.*?)\*\*/g, '$1').replace(/<b>(.*?)<\/b>/g, '$1')
    const meaningBold = meaningBoldMatch?.[1]?.trim() || `This is an example using <b>${requestData.word}</b>.`
    
    console.log(`🧹 Clean sentence: "${sentence}"`)
    console.log(`✨ Bold sentence: "${sentenceBold}"`)
    console.log(`🧹 Clean meaning: "${sentenceMeaning}"`)
    console.log(`✨ Bold meaning: "${meaningBold}"`)

    const contextUsed = Boolean(
      requestData.pageContext && 
      (requestData.pageContext.title || requestData.pageContext.theme)
    )

    const responseData: GenerateSentencesResponse = {
      sentence,
      sentenceBold,
      sentenceMeaning,
      meaningBold,
      contextUsed,
      generatedAt: new Date().toISOString()
    }

    console.log(`🎉 Successfully generated sentence with meaning, context=${contextUsed}`)
    console.log(`📦 FINAL RESPONSE DATA:`, JSON.stringify(responseData, null, 2))

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error generating sentences:', error)
    
    // Return fallback response
    const word = (await req.json().catch(() => ({})))?.word || 'this word'
    const fallbackResponse: GenerateSentencesResponse = {
      sentence: `Here is an example sentence using ${word}.`,
      sentenceBold: `Here is an example sentence using <b>${word}</b>.`,
      sentenceMeaning: `This is an example using ${word}.`,
      meaningBold: `This is an example using <b>${word}</b>.`,
      contextUsed: false,
      generatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
    
    return new Response(
      JSON.stringify(fallbackResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})