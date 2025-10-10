import { supabase } from '@/lib/supabase/client'

export interface TranslationRequest {
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

export interface TranslationResponse {
  translation: string
  translatedAt: string
  error?: string
}

class TranslationService {
  private readonly MAX_RETRIES = 3
  private readonly INITIAL_DELAY = 1000 // 1 second
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
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
      console.log(`🔄 Translation retry attempt ${attempt}/${this.MAX_RETRIES} in ${delayMs}ms...`)
      
      await this.delay(delayMs)
      return this.retryWithExponentialBackoff(operation, attempt + 1)
    }
  }

  async translateWord(request: TranslationRequest): Promise<string> {
    console.log(`🌐 TranslationService: Translating "${request.word}" from ${request.sourceLanguage} to ${request.targetLanguage}`)

    try {
      const result = await this.retryWithExponentialBackoff(async () => {
        // Call Supabase Edge Function for translation
        const { data, error } = await supabase.functions.invoke<TranslationResponse>('translate-word', {
          body: request
        })

        if (error) {
          console.error('Translation Edge Function error:', error)
          throw new Error('Network error: Unable to translate word')
        }

        if (!data) {
          throw new Error('No response from translation service')
        }

        if (data.error) {
          // Check if AI detected meaningless input
          if (data.error.includes('has no meaning')) {
            throw new Error(`MEANINGLESS_WORD: "${request.word}" doesn't appear to be a valid word. Please check spelling and try again.`)
          }
          throw new Error(data.error)
        }

        return data.translation
      })

      console.log(`✅ TranslationService: Translated "${request.word}" → "${result}"`)
      return result

    } catch (error) {
      console.error('All translation attempts failed:', error)
      
      // Provide user-friendly error messages based on error type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('MEANINGLESS_WORD:')) {
        // AI detected meaningless input - extract the user-friendly message
        const userMessage = errorMessage.replace('MEANINGLESS_WORD: ', '')
        throw new Error(userMessage)
      } else if (errorMessage.includes('check spelling')) {
        // AI couldn't understand the word - likely a typo or meaningless input
        throw new Error(`Could not translate "${request.word}". Please check spelling and try again.`)
      } else if (errorMessage.includes('Network error')) {
        // Network/service issues
        throw new Error(`Translation service is temporarily unavailable. Please try again in a moment.`)
      } else {
        // Generic fallback for any other errors
        throw new Error(`Unable to translate "${request.word}". Please check spelling or try again later.`)
      }
    }
  }
}

export const translationService = new TranslationService()