import { PageContext } from '@/lib/types/pageContext'

export interface GeminiGenerationRequest {
  word: string
  translation: string
  targetLanguage: string
  nativeLanguage: string
  pageContext?: PageContext
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
}

export interface GeminiGenerationResponse {
  sentences: string[]
  contextUsed: boolean
  generatedAt: string
}

export interface CachedSentences {
  displaySentence: string
  cachedSentence: string
  usedContext: boolean
  generatedAt: string
}

class GeminiService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
  private sentenceCache = new Map<string, string>()

  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY not found in environment variables')
    }
  }

  private createCacheKey(request: GeminiGenerationRequest): string {
    const contextKey = request.pageContext ? 
      `${request.pageContext.title || ''}-${request.pageContext.theme || ''}-${request.pageContext.source || ''}` : 
      'no-context'
    return `${request.word}-${request.translation}-${request.targetLanguage}-${contextKey}`
  }

  private buildPrompt(request: GeminiGenerationRequest): string {
    const { word, translation, targetLanguage, nativeLanguage, pageContext, difficultyLevel = 'intermediate' } = request

    let prompt = `Generate exactly 2 example sentences using the word "${word}" (meaning: ${translation}) in ${targetLanguage}. `

    if (pageContext && (pageContext.title || pageContext.theme || pageContext.source)) {
      prompt += `Context for sentence generation:\n`
      if (pageContext.title) prompt += `- Topic: ${pageContext.title}\n`
      if (pageContext.theme) prompt += `- Theme: ${pageContext.theme}\n`
      if (pageContext.source) prompt += `- Source: ${pageContext.source}\n`
      if (pageContext.description) prompt += `- Description: ${pageContext.description}\n`
      prompt += `Please create sentences that fit this context and theme. `
    }

    prompt += `Requirements:
1. Create sentences appropriate for ${difficultyLevel} level learners
2. Make sentences practical and useful for daily conversation
3. Ensure the word "${word}" is used naturally in context
4. Keep sentences between 8-15 words each
5. Make sentences culturally appropriate and educational
6. Respond with exactly 2 sentences, separated by "|||"
7. Do not include quotation marks around the sentences
8. Use proper grammar and natural ${targetLanguage} sentence structure`

    if (pageContext?.theme) {
      prompt += `\n9. Incorporate the theme "${pageContext.theme}" naturally into the sentences`
    }

    return prompt
  }

  async generateSentences(request: GeminiGenerationRequest): Promise<CachedSentences> {
    try {
      const cacheKey = this.createCacheKey(request)
      
      if (!this.apiKey) {
        throw new Error('Gemini API key not configured')
      }

      const prompt = this.buildPrompt(request)
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
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
            temperature: 0.7,
            topK: 40,
            topP: 0.8,
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

      const sentences = generatedText.split('|||').map((s: string) => s.trim()).filter(Boolean)
      
      if (sentences.length < 2) {
        console.warn('Gemini returned fewer than 2 sentences, duplicating the first one')
        sentences.push(sentences[0] || `${request.word} is used in this example sentence.`)
      }

      const cachedSentences: CachedSentences = {
        displaySentence: sentences[0],
        cachedSentence: sentences[1] || sentences[0],
        usedContext: Boolean(request.pageContext && (request.pageContext.title || request.pageContext.theme)),
        generatedAt: new Date().toISOString()
      }

      this.sentenceCache.set(cacheKey, cachedSentences.cachedSentence)

      return cachedSentences

    } catch (error) {
      console.error('Error generating sentences with Gemini:', error)
      
      const fallbackSentences: CachedSentences = {
        displaySentence: `Here is an example sentence using ${request.word}.`,
        cachedSentence: `This is another way to use ${request.word} in context.`,
        usedContext: false,
        generatedAt: new Date().toISOString()
      }
      
      return fallbackSentences
    }
  }

  getCachedSentence(request: GeminiGenerationRequest): string | null {
    const cacheKey = this.createCacheKey(request)
    return this.sentenceCache.get(cacheKey) || null
  }

  clearCache(): void {
    this.sentenceCache.clear()
  }

  getCacheSize(): number {
    return this.sentenceCache.size
  }
}

export const geminiService = new GeminiService()