import { PageContext } from '@/lib/types/pageContext'
import { supabase } from '@/lib/supabase/client'

export interface GeminiGenerationRequest {
  word: string
  translation: string
  targetLanguage: string
  nativeLanguage: string
  pageContext?: PageContext
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
  avoidPatterns?: string[]
}

export interface GeminiGenerationResponse {
  sentence: string
  sentenceBold: string
  sentenceMeaning: string
  meaningBold: string
  contextUsed: boolean
  generatedAt: string
  error?: string
}

export interface GeneratedSentence {
  sentence: string
  sentenceBold: string
  sentenceMeaning: string
  meaningBold: string
  usedContext: boolean
  generatedAt: string
}

class GeminiService {
  private readonly MAX_RETRIES = 3
  private readonly INITIAL_DELAY = 1000 // 1 second
  private readonly MAX_RECENT_SENTENCES = 5 // Track last 5 sentences per word to avoid repetition
  
  // Track recent sentences per word-translation pair
  private recentSentences = new Map<string, string[]>()
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getWordKey(word: string, translation: string): string {
    return `${word.toLowerCase().trim()}-${translation.toLowerCase().trim()}`
  }

  private addRecentSentence(word: string, translation: string, sentence: string): void {
    const key = this.getWordKey(word, translation)
    const recent = this.recentSentences.get(key) || []
    
    // Add new sentence to the beginning
    recent.unshift(sentence)
    
    // Keep only the most recent sentences
    if (recent.length > this.MAX_RECENT_SENTENCES) {
      recent.splice(this.MAX_RECENT_SENTENCES)
    }
    
    this.recentSentences.set(key, recent)
  }

  private getRecentSentences(word: string, translation: string): string[] {
    const key = this.getWordKey(word, translation)
    return this.recentSentences.get(key) || []
  }

  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= this.MAX_RETRIES) {
        throw error
      }
      
      const delayMs = this.INITIAL_DELAY * Math.pow(2, attempt - 1)
      console.log(`🔄 Retry attempt ${attempt}/${this.MAX_RETRIES} in ${delayMs}ms...`)
      
      await this.delay(delayMs)
      return this.retryWithExponentialBackoff(operation, attempt + 1)
    }
  }

  private createFallbackSentence(word: string, translation?: string): GeneratedSentence {
    const fallbackSentences = [
      {
        sentence: `I learned the word "${word}" today.`,
        sentenceBold: `I learned the word "<b>${word}</b>" today.`,
        meaning: `J'ai appris le mot "${word}" aujourd'hui.`,
        meaningBold: `J'ai appris le mot "<b>${word}</b>" aujourd'hui.`
      },
      {
        sentence: `The word "${word}" is very useful.`,
        sentenceBold: `The word "<b>${word}</b>" is very useful.`,
        meaning: `Le mot "${word}" est très utile.`,
        meaningBold: `Le mot "<b>${word}</b>" est très utile.`
      },
      {
        sentence: `Can you use "${word}" in a sentence?`,
        sentenceBold: `Can you use "<b>${word}</b>" in a sentence?`,
        meaning: `Pouvez-vous utiliser "${word}" dans une phrase ?`,
        meaningBold: `Pouvez-vous utiliser "<b>${word}</b>" dans une phrase ?`
      },
      {
        sentence: `I practice saying "${word}" every day.`,
        sentenceBold: `I practice saying "<b>${word}</b>" every day.`,
        meaning: `Je m'entraîne à dire "${word}" tous les jours.`,
        meaningBold: `Je m'entraîne à dire "<b>${word}</b>" tous les jours.`
      }
    ]

    const randomIndex = Math.floor(Math.random() * fallbackSentences.length)
    const selected = fallbackSentences[randomIndex]
    
    return {
      sentence: selected.sentence,
      sentenceBold: selected.sentenceBold,
      sentenceMeaning: selected.meaning,
      meaningBold: selected.meaningBold,
      usedContext: false,
      generatedAt: new Date().toISOString()
    }
  }

  async generateSentences(request: GeminiGenerationRequest): Promise<GeneratedSentence> {
    console.log(`🤖 GeminiService: Generating sentence for "${request.word}" → "${request.translation}"`)

    // Get recent sentences for this word to avoid repetition
    const recentSentences = this.getRecentSentences(request.word, request.translation)
    const enhancedRequest = {
      ...request,
      avoidPatterns: recentSentences
    }

    if (recentSentences.length > 0) {
      console.log(`🔄 Anti-repetition: Avoiding ${recentSentences.length} recent patterns for "${request.word}"`)
    }

    try {
      const result = await this.retryWithExponentialBackoff(async () => {
        // Call Supabase Edge Function for sentence generation with anti-repetition
        const { data, error } = await supabase.functions.invoke<GeminiGenerationResponse>('generate-sentences', {
          body: enhancedRequest
        })

        if (error) {
          console.error('Edge Function error:', error)
          throw new Error(`Network error: Unable to generate sentence`)
        }

        if (!data) {
          throw new Error('No response from sentence generation service')
        }

        if (data.error) {
          console.warn('Edge Function returned error:', data.error)
          throw new Error(data.error)
        }

        return data
      })

      console.log(`✅ GeminiService: Successfully generated sentence`)

      // Store this sentence to avoid similar patterns in future generations
      this.addRecentSentence(request.word, request.translation, result.sentence)

      const generatedSentence: GeneratedSentence = {
        sentence: result.sentence,
        sentenceBold: result.sentenceBold,
        sentenceMeaning: result.sentenceMeaning,
        meaningBold: result.meaningBold,
        usedContext: result.contextUsed,
        generatedAt: result.generatedAt
      }

      return generatedSentence

    } catch (error) {
      console.error('All retry attempts failed, using fallback sentence:', error)
      
      // Return a creative fallback sentence instead of showing technical errors
      return this.createFallbackSentence(request.word, request.translation)
    }
  }

}

export const geminiService = new GeminiService()