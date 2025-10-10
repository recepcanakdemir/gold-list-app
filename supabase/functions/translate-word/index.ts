const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranslateWordRequest {
  word: string
  sourceLanguage: string
  targetLanguage: string
  pageContext?: {
    title?: string | null
    source?: string | null
    description?: string | null
    theme?: string | null
  }
}

interface TranslateWordResponse {
  translation: string
  translatedAt: string
  error?: string
}

function buildTranslationPrompt(request: TranslateWordRequest): string {
  const { word, sourceLanguage, targetLanguage, pageContext } = request

  let prompt = `Translate the word or phrase "${word}" from ${sourceLanguage} to ${targetLanguage}.

Word/phrase: ${word}
Source language: ${sourceLanguage}
Target language: ${targetLanguage}

TYPO TOLERANCE INSTRUCTIONS:
- If the word appears to be misspelled, try to determine the intended word
- Use common patterns and context to understand typos
- Examples: "jarden" → "jardin" (garden), "voitur" → "voiture" (car)
- Consider keyboard proximity for common typos
- Look for partial matches with known words in the source language
`

  // Add context if available
  if (pageContext && (pageContext.title || pageContext.theme || pageContext.source)) {
    prompt += `\nContext for accurate translation:\n`
    if (pageContext.title) prompt += `- Topic: ${pageContext.title}\n`
    if (pageContext.theme) prompt += `- Theme: ${pageContext.theme}\n`
    if (pageContext.source) prompt += `- Source: ${pageContext.source}\n`
    if (pageContext.description) prompt += `- Description: ${pageContext.description}\n`
    prompt += `Please use this context to help determine the intended word if there are typos.\n`
  }

  prompt += `\nRequirements:
1. SMART INTERPRETATION: If the word seems misspelled, try to understand the intended word
2. If successful: provide the most appropriate translation for the corrected/intended word
3. If completely unrecognizable or truly meaningless: respond with "NO_MEANING"
4. If multiple meanings exist, choose the most contextually appropriate one
5. Return only the translated word/phrase or "NO_MEANING" - nothing else
6. Keep successful translations short (1-4 words maximum)
7. Prioritize common usage and real-world context

Examples of typo handling:
- "jarden" → translate as "garden" (assuming "jardin" was intended)
- "bonjour" → translate as "hello" (correct spelling)
- "xyzabc" → respond "NO_MEANING" (completely unrecognizable)

Translation:`

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
          error: 'Translation service not configured properly',
          translation: '',
          translatedAt: new Date().toISOString()
        } as TranslateWordResponse),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const requestData: TranslateWordRequest = await req.json()
    
    // Validate required fields
    if (!requestData.word || !requestData.sourceLanguage || !requestData.targetLanguage) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: word, sourceLanguage, targetLanguage',
          translation: '',
          translatedAt: new Date().toISOString()
        } as TranslateWordResponse),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`🌐 Translating: "${requestData.word}" (${requestData.sourceLanguage} → ${requestData.targetLanguage})`)

    const prompt = buildTranslationPrompt(requestData)
    console.log(`🎯 Using translation prompt: ${prompt.substring(0, 100)}...`)
    console.log(`🔑 API Key available: ${apiKey ? 'YES' : 'NO'}`)

    // Direct HTTP call to Gemini API (Deno-compatible)
    console.log(`📡 Making request to Gemini API...`)
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
          temperature: 0.3, // Lower temperature for more consistent translations
          topK: 20,
          topP: 0.6,
          maxOutputTokens: 50, // Short responses for single word translations
        }
      })
    })

    console.log(`📞 Response status: ${response.status}`)
    console.log(`📞 Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`)

    if (!response.ok) {
      console.error(`❌ API call failed with status: ${response.status}`)
      const errorData = await response.json().catch(() => ({}))
      console.error(`❌ Error data:`, errorData)
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
    }

    console.log(`📥 Parsing response...`)
    const data = await response.json()
    console.log(`📊 Response data structure:`, JSON.stringify(data, null, 2))
    
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    console.log(`📝 Generated text: "${generatedText}"`)
    
    if (!generatedText) {
      console.error(`❌ No text in response. Full response:`, data)
      throw new Error('No translation generated from Gemini API')
    }

    console.log(`✅ Generated translation: ${generatedText}`)

    // Clean up the response (remove any extra whitespace, quotes, etc.)
    const cleanedText = generatedText.trim().replace(/^["']|["']$/g, '')

    // Check if the AI detected meaningless input
    if (cleanedText === 'NO_MEANING' || cleanedText.includes('NO_MEANING')) {
      return new Response(
        JSON.stringify({ 
          translation: '',
          translatedAt: new Date().toISOString(),
          error: `"${requestData.word}" has no meaning in ${requestData.targetLanguage}`
        } as TranslateWordResponse),
        { 
          status: 200, // Return 200 status for successful "meaningless" detection
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const responseData: TranslateWordResponse = {
      translation: cleanedText,
      translatedAt: new Date().toISOString()
    }

    console.log(`🎉 Successfully translated "${requestData.word}" → "${cleanedText}"`)

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Error translating word:', error)
    console.error('💥 Error type:', typeof error)
    console.error('💥 Error constructor:', error?.constructor?.name)
    
    if (error instanceof Error) {
      console.error('💥 Error message:', error.message)
      console.error('💥 Error stack:', error.stack)
    }
    
    // Return error response with 200 status so client can handle gracefully
    const fallbackResponse: TranslateWordResponse = {
      translation: '',
      translatedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown translation error occurred'
    }
    
    return new Response(
      JSON.stringify(fallbackResponse),
      { 
        status: 200, // Return 200 so client receives the error message instead of FunctionsHttpError
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})