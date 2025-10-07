export interface AISentenceState {
  isGenerating: boolean
  displaySentence: string | null
  hasCachedSentence: boolean
  usedContext: boolean
  error: string | null
  generatedAt: string | null
}

export interface GenerationConfig {
  useAI: boolean
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  autoGenerate: boolean
}

export const DEFAULT_AI_STATE: AISentenceState = {
  isGenerating: false,
  displaySentence: null,
  hasCachedSentence: false,
  usedContext: false,
  error: null,
  generatedAt: null
}

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  useAI: false,
  difficultyLevel: 'intermediate',
  autoGenerate: false
}