# Complete AI Sentence Generator Implementation Plan

## Enhanced Requirements Summary

### **New Features:**
1. **Page Context Integration**: Use page title/context/source for contextual sentence generation
2. **Gemini API Integration**: Use Google's Gemini instead of OpenAI
3. **Smart Caching**: Generate 2 sentences, show 1, cache the other for "regenerate"
4. **Page Properties**: Context, Source, Title fields for authentic Gold List Method
5. **Review Hints**: Show page context as hint during review

## Step-by-Step Implementation Plan

### **STEP 1: Database Schema Updates (1 day)**

**Add Page Context Fields:**
```sql
-- Add page context fields to pages table
ALTER TABLE pages ADD COLUMN context_title TEXT;
ALTER TABLE pages ADD COLUMN context_source TEXT;
ALTER TABLE pages ADD COLUMN context_description TEXT;
ALTER TABLE pages ADD COLUMN context_theme TEXT;
```

**Update Database Types:**
```typescript
// Update pages Row interface
pages: {
  Row: {
    // ... existing fields
    context_title: string | null
    context_source: string | null  
    context_description: string | null
    context_theme: string | null
  }
}
```

### **STEP 2: Gemini AI Service Setup (1 day)**

**Create AI Service (`lib/services/geminiService.ts`):**
```typescript
interface GeminiGenerationRequest {
  word: string
  translation: string
  languageCode: string
  pageContext?: {
    title?: string
    source?: string
    description?: string
    theme?: string
  }
  existingSentence?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

interface GeminiGenerationResponse {
  primarySentence: string
  alternateSentence: string
  confidence: number
}

class GeminiService {
  async generateSentencePair(request: GeminiGenerationRequest): Promise<GeminiGenerationResponse>
}
```

**Smart Prompt Engineering:**
```typescript
const buildContextPrompt = (word, translation, pageContext) => {
  const contextInfo = pageContext 
    ? `Context: ${pageContext.title || ''} - ${pageContext.theme || ''}. Source: ${pageContext.source || 'User learning material'}.`
    : 'Context: General vocabulary learning.'
    
  return `Generate exactly 2 natural sentences using "${word}" (means: ${translation}).

${contextInfo}

Requirements:
- Make sentences relevant to the context above
- Intermediate difficulty level
- Practical and memorable
- Different from existing: "${existingSentence || 'none'}"

Return format:
Sentence 1: [your first sentence]
Sentence 2: [your second sentence]`
}
```

**Environment Setup:**
```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
AI_GENERATION_ENABLED=true
```

### **STEP 3: Page Context UI (Word Input Screen) (2 days)**

**Add Page Context Form to Input Screen:**
```tsx
// New component in input screen
const PageContextSection = ({ pageContext, onContextChange }) => (
  <View style={styles.pageContextSection}>
    <Text style={styles.sectionTitle}>📚 Page Context (Optional)</Text>
    
    <TextInput
      placeholder="Page title (e.g., Business English - Meetings)"
      value={pageContext.title}
      onChangeText={(text) => onContextChange({...pageContext, title: text})}
      style={styles.contextInput}
    />
    
    <TextInput
      placeholder="Source (e.g., Advanced Business English Ch.4)"
      value={pageContext.source}
      onChangeText={(text) => onContextChange({...pageContext, source: text})}
      style={styles.contextInput}
    />
    
    <TextInput
      placeholder="Theme/Topic (e.g., workplace communication)"
      value={pageContext.theme}
      onChangeText={(text) => onContextChange({...pageContext, theme: text})}
      style={styles.contextInput}
    />
  </View>
)
```

**Integration into Word Input:**
- Add context section at top of page (collapsible)
- Save context to page when first word is added
- Load existing context when page has words
- Pass context to AI generation

### **STEP 4: Enhanced Word Creation Interface (1 day)**

**Sentence Generation with Context:**
```tsx
const WordCreationForm = ({ word, translation, pageContext }) => {
  const [currentSentence, setCurrentSentence] = useState('')
  const [cachedSentence, setCachedSentence] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  
  const generateSentence = async () => {
    setIsGenerating(true)
    try {
      const response = await geminiService.generateSentencePair({
        word,
        translation,
        languageCode: notebook.language_code,
        pageContext,
        difficulty: 'intermediate'
      })
      
      // Show primary, cache alternate
      setCurrentSentence(response.primarySentence)
      setCachedSentence(response.alternateSentence)
    } catch (error) {
      Alert.alert('Generation failed', 'Please try again or add manually')
    } finally {
      setIsGenerating(false)
    }
  }
  
  return (
    <View>
      <TextInput
        placeholder="Example sentence (optional)"
        value={currentSentence}
        onChangeText={setCurrentSentence}
        multiline
        style={styles.sentenceInput}
      />
      
      <TouchableOpacity onPress={generateSentence} disabled={isGenerating}>
        <Text>🤖 Generate with AI</Text>
      </TouchableOpacity>
    </View>
  )
}
```

### **STEP 5: Review Screen Enhancement (2 days)**

**Review Card with Context Hints:**
```tsx
const ReviewCard = ({ word, pageContext }) => {
  const [showingSentence, setShowingSentence] = useState(false)
  const [currentSentence, setCurrentSentence] = useState(word.example_sentence)
  const [cachedSentence, setCachedSentence] = useState('')
  const [generationsUsed, setGenerationsUsed] = useState(0)
  const [showingPageHint, setShowingPageHint] = useState(false)
  
  return (
    <View style={styles.reviewCard}>
      {/* Main word */}
      <Text style={styles.reviewWord}>{word.word}</Text>
      
      {/* Page context hint */}
      {pageContext && (
        <TouchableOpacity onPress={() => setShowingPageHint(!showingPageHint)}>
          <Text style={styles.hintButton}>💡 Page Context</Text>
        </TouchableOpacity>
      )}
      
      {showingPageHint && pageContext && (
        <View style={styles.pageHintSection}>
          <Text style={styles.pageHintTitle}>{pageContext.title}</Text>
          <Text style={styles.pageHintSource}>Source: {pageContext.source}</Text>
          <Text style={styles.pageHintTheme}>Theme: {pageContext.theme}</Text>
        </View>
      )}
      
      {/* Sentence section */}
      <TouchableOpacity onPress={() => setShowingSentence(!showingSentence)}>
        <Text style={styles.sentenceToggle}>
          {showingSentence ? '👁️ Hide Example' : '👁️ Show Example'}
        </Text>
      </TouchableOpacity>
      
      {showingSentence && currentSentence && (
        <View style={styles.sentenceSection}>
          <Text style={styles.exampleSentence}>{currentSentence}</Text>
          
          {generationsUsed < 2 && (
            <TouchableOpacity onPress={handleGenerateNew}>
              <Text style={styles.regenerateButton}>
                🤖 Generate New ({2-generationsUsed}/2)
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {/* Reveal meaning button */}
      <TouchableOpacity onPress={onReveal} style={styles.revealButton}>
        <Text>Tap to reveal meaning</Text>
      </TouchableOpacity>
    </View>
  )
}
```

**Smart Regeneration Logic:**
```tsx
const handleGenerateNew = async () => {
  if (cachedSentence && generationsUsed === 0) {
    // Use cached sentence from creation phase
    setCurrentSentence(cachedSentence)
    setCachedSentence('')
    setGenerationsUsed(1)
  } else if (generationsUsed === 1) {
    // Generate new pair, use primary
    try {
      const response = await geminiService.generateSentencePair({
        word: word.word,
        translation: word.translation,
        languageCode: notebook.language_code,
        pageContext,
        existingSentence: currentSentence
      })
      setCurrentSentence(response.primarySentence)
      setGenerationsUsed(2)
    } catch (error) {
      Alert.alert('Generation failed', 'Using original sentence')
    }
  }
}
```

### **STEP 6: Context-Aware Generation Logic (1 day)**

**Page Context Analysis:**
```typescript
const analyzePageContext = (pageContext, existingWords) => {
  const contextKeywords = [
    ...(pageContext?.title?.split(' ') || []),
    ...(pageContext?.theme?.split(' ') || []),
    ...existingWords.map(w => w.word)
  ].filter(word => word.length > 3)
  
  return {
    theme: pageContext?.theme || 'general',
    domain: inferDomain(contextKeywords),
    formalityLevel: inferFormality(pageContext?.source),
    existingVocabulary: existingWords.map(w => w.word)
  }
}

const buildSmartPrompt = (word, translation, contextAnalysis) => {
  return `Generate 2 sentences using "${word}" (${translation}).

Context: ${contextAnalysis.theme}
Domain: ${contextAnalysis.domain}
Style: ${contextAnalysis.formalityLevel}
Related words in this lesson: ${contextAnalysis.existingVocabulary.join(', ')}

Make sentences that:
- Fit naturally in this learning context
- Could appear together in the same lesson
- Use appropriate formality level
- Are memorable and practical

Sentence 1:
Sentence 2:`
}
```

### **STEP 7: Data Flow & State Management (1 day)**

**Page Context Persistence:**
```typescript
// Save page context when first word added
const savePageContext = async (pageId, context) => {
  await supabase
    .from('pages')
    .update({
      context_title: context.title,
      context_source: context.source,
      context_theme: context.theme,
      updated_at: new Date().toISOString()
    })
    .eq('id', pageId)
}

// Load page context for sentence generation
const loadPageContext = async (pageId) => {
  const { data } = await supabase
    .from('pages')
    .select('context_title, context_source, context_theme')
    .eq('id', pageId)
    .single()
    
  return data
}
```

**Review State Management:**
```typescript
interface ReviewState {
  currentSentence: string
  cachedSentence: string
  generationsUsed: number
  pageContext: PageContext | null
  showingPageHint: boolean
}

// Save final sentence on swipe
const onSwipeComplete = async (wordId, finalSentence) => {
  await supabase
    .from('words')
    .update({ example_sentence: finalSentence })
    .eq('id', wordId)
}
```

### **STEP 8: Testing & Quality Assurance (1 day)**

**Test Scenarios:**
1. **Page context flows**: Create page → Add context → Generate sentences
2. **Caching behavior**: Generate → Regenerate → Verify no API calls
3. **Context awareness**: Same word in different contexts → Different sentences
4. **Review hints**: Page context display in review
5. **Error handling**: API failures, network issues
6. **Cost monitoring**: API usage tracking

## Implementation Timeline

**Week 1:**
- Day 1: Database schema + types
- Day 2: Gemini service setup
- Day 3: Page context UI
- Day 4: Word creation integration
- Day 5: Review screen enhancement

**Week 2:**
- Day 1: Context-aware generation
- Day 2: Data flow & persistence  
- Day 3: Testing & refinement

## Cost Optimization Strategies

**Gemini API Advantages:**
- **Cheaper than GPT-4**: ~$0.075 per 1M input tokens
- **Fast responses**: ~500ms average
- **Good quality**: Comparable to GPT-3.5 Turbo

**Smart Usage:**
- **2-for-1 generation**: Halves API calls in review
- **Context caching**: Reuse page analysis
- **Rate limiting**: Prevent abuse
- **Fallback gracefully**: Manual entry always works

This implementation gives you a sophisticated AI-powered sentence generation system that respects the Gold List Method's emphasis on context and source material while providing modern AI assistance. The page context feature is particularly authentic to David James' original method where learners would note their source materials.