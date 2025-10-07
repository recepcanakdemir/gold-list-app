/**
 * Page Context Types for AI Sentence Generation
 * Supports the authentic Gold List Method practice of noting source materials
 */

export interface PageContext {
  title?: string | null
  source?: string | null
  description?: string | null
  theme?: string | null
}

export interface PageWithContext {
  id: string
  page_number: number
  context_title?: string | null
  context_source?: string | null
  context_description?: string | null
  context_theme?: string | null
}

export interface ContextAnalysis {
  theme: string
  domain: string
  formalityLevel: 'casual' | 'formal' | 'academic' | 'business'
  existingVocabulary: string[]
  keywords: string[]
}

export const DEFAULT_CONTEXT: PageContext = {
  title: null,
  source: null,
  description: null,
  theme: null
}

// Helper function to extract context from page data
export const extractPageContext = (page: PageWithContext): PageContext => ({
  title: page.context_title,
  source: page.context_source,
  description: page.context_description,
  theme: page.context_theme
})

// Helper function to check if page has meaningful context
export const hasPageContext = (context: PageContext): boolean => {
  return Boolean(
    context.title?.trim() || 
    context.source?.trim() || 
    context.theme?.trim()
  )
}

// Format context for display
export const formatContextForDisplay = (context: PageContext): string => {
  const parts = []
  if (context.title) parts.push(context.title)
  if (context.source) parts.push(`Source: ${context.source}`)
  if (context.theme) parts.push(`Theme: ${context.theme}`)
  return parts.join(' • ')
}