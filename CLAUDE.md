# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gold List Method App** - A React Native vocabulary learning application implementing David James' Gold List Method. The app uses natural memory consolidation and spaced repetition over a 4-round system with 14-day intervals between rounds.

## Gold List Method Core Principles

### 4-Round System (8 weeks total)
- **Round 1 (Red)**: Initial entry - 10-25 words daily (configurable per notebook)
- **Round 2 (Green)**: Review after 14 days, archive remembered words
- **Round 3 (Blue)**: Challenging vocabulary gets more attention  
- **Round 4 (Yellow)**: Final opportunity before notebook progression

### Notebook Hierarchy
- **Bronze**: Primary learning notebook
- **Silver**: Words that failed Bronze notebook's 4 rounds
- **Gold**: Most difficult words that failed Silver notebook

### Critical Timing Logic
- **14-day intervals** are core to the Gold List Method - words become reviewable exactly 14 days after creation/last review
- **Daily page unlocking** - pages unlock sequentially, one per day
- **Remembered words** are marked as mastered and exit the review cycle
- **Forgotten words** advance exactly 1 round as per Gold List Method

## Development Commands

- `npm install` - Install dependencies  
- `npm start` or `npx expo start` - Start the development server
- `npm run ios` - Run on iOS simulator/device (primary platform)
- `npm run lint` - Run ESLint
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser
- `npm run reset-project` - Reset to blank project template

## Application Architecture

### Screen Structure
```
app/
├── (onboarding)/          # Welcome, education, tutorial screens
│   ├── welcome.tsx
│   ├── goldlist-intro.tsx
│   ├── goldlist-method.tsx
│   ├── goldlist-rounds.tsx
│   └── tutorial-overview.tsx
├── (auth)/               # Authentication flow
│   ├── signin.tsx
│   ├── signup.tsx
│   └── forgot-password.tsx
├── (tabs)/               # Main app navigation
│   ├── index.tsx         # Home/Dashboard
│   ├── dashboard.tsx     # Main dashboard
│   └── settings.tsx      # Settings & profile
├── notebook/
│   └── [id]/
│       ├── index.tsx     # Notebook detail (progress map)
│       ├── input.tsx     # Word input screen
│       └── review.tsx    # Tinder-style review interface
└── modal/
    ├── paywall.tsx       # Subscription modal
    ├── create-notebook.tsx
    ├── notifications.tsx
    └── settings.tsx      # App settings
```

### Database Schema (Supabase PostgreSQL)

**Core Tables & Relationships**:
```
profiles (user data, streaks, statistics)
  ↓ 1:many
notebooks (language-specific collections, Bronze/Silver/Gold levels)  
  ↓ 1:many
pages (200 pages per notebook, daily unlocking system)
  ↓ 1:many  
words (vocabulary entries with Gold List Method progression)
  ↓ 1:many
reviews (review session history and performance tracking)
```

**Key Database Functions (RPC)**:
- `create_notebook_with_pages` - Atomic notebook creation with 200 pages
- `get_user_notebooks_with_stats` - Optimized notebook loading with statistics
- `get_words_for_review` - Complex query for reviewable words with 14-day filtering
- Performance optimized with strategic indexing for 5-25x speed improvements

### Key Architecture Patterns

#### State Management
- **Hierarchical Context Providers**: DevTime → Theme → Auth → App
- **React Context**: Preferred over Redux for app complexity level  
- **AsyncStorage**: Settings persistence and offline caching
- **Supabase Real-time**: Live data synchronization

#### User Interface Patterns
- **Tinder-style Review**: PanGestureHandler with 60fps animations
- **Dual Input Modes**: Focus (step-by-step) vs List (batch entry) with cross-sync
- **SVG Progress Circles**: Mathematical accuracy using strokeDasharray/strokeDashoffset
- **Theme System**: Complete dark/light mode with Gold List Method colors (Red/Green/Blue/Yellow)

#### Navigation Architecture  
- **Expo Router**: File-based routing with typed routes
- **AuthGuard**: Route protection based on authentication and onboarding status
- **Modal Presentations**: Input and review screens use modal/fullScreenModal
- **Deep Linking**: Auto-focus navigation (e.g., "Add Today's Words")

### Key Technologies & Configuration

**Core Stack**:
- **Frontend**: React Native with Expo 54.0.9, TypeScript strict mode
- **Backend**: Supabase (PostgreSQL + Auth + Real-time subscriptions)
- **Navigation**: Expo Router with file-based routing and typed routes
- **Animation**: React Native Reanimated, Gesture Handler (Tinder-style swipes)
- **Graphics**: React Native SVG, Victory Native (charts), React Native Skia
- **Platform Support**: iOS (primary), Android, Web

**Development Configuration**:
- **Path Aliases**: `@/*` maps to project root
- **ESLint**: Expo ESLint config with flat format
- **Expo Features**: New Architecture enabled, typed routes, React Compiler

### Critical Business Logic

**Word Processing Flow**:
1. Words added to current day's page (auto-unlocks daily)
2. After 14 days, words become reviewable
3. Review outcome: Remember → Mastered | Forget → Advance 1 round
4. Failed Round 4 words move to higher notebook level (Bronze→Silver→Gold)

**Performance Optimizations**:
- Database indexing for 5-25x query speed improvements
- Parallel processing with Promise.all() for batch operations  
- requestAnimationFrame for 60fps animations
- RPC functions for complex database operations
- Retry logic with exponential backoff for network reliability

### Key Services & File Structure

**Critical Files**:
- `lib/services/supabaseService.ts` - Database operations with retry logic and performance optimizations
- `lib/contexts/AuthContext.tsx` - User authentication and profile management  
- `lib/contexts/AppContext.tsx` - Global app state with notebook and progress data
- `lib/contexts/ThemeContext.tsx` - Dark/light theme system
- `lib/types/database.ts` - Complete TypeScript database schema definitions

**Navigation Structure**:
- `/(onboarding)/` - First-time user education flow
- `/(auth)/` - Authentication screens  
- `/(tabs)/` - Main app with custom PagerView-based bottom navigation
- `notebook/[id]/` - Dynamic notebook routes (detail, input, review)
- `modal/` - Overlay screens (settings, paywall, create-notebook)

## Important Development Reminders

**Core Learning System**:
- **14-day intervals are fundamental** - words become reviewable exactly 14 days after creation/last review
- **Gold List Method progression**: Remember → Mastered | Forget → Advance 1 round
- **Failed Round 4 words** move to higher notebook level (Bronze→Silver→Gold)
- **Testing review flows** requires creative approaches due to real 14-day intervals

**Technical Constraints**:
- **NEVER create files unless absolutely necessary** - always prefer editing existing files
- **SVG Circular Progress**: Use mathematical strokeDasharray/strokeDashoffset for accuracy  
- **Animation Performance**: Prefer requestAnimationFrame over throttled updates for 60fps
- **Theme Integration**: Always use theme-aware colors for proper dark/light mode support
- **Database Operations**: Use parallel processing with Promise.all() for performance

**Architecture Principles**:
- **React Context over Redux** for current app complexity level
- **Supabase RPC functions** for complex database operations
- **File-based routing** with Expo Router and typed routes
- **Retry logic with exponential backoff** for network reliability

## AI Sentence Generator Implementation

### Overview
A comprehensive AI-powered sentence generation system integrated with the Gold List Method, providing contextual example sentences for vocabulary learning. Uses Google Gemini API with smart caching and page context integration.

### Key Features Implemented

#### 1. **Gemini AI Service Integration** (`lib/services/geminiService.ts`)
- **Smart Caching Strategy**: Generates 2 sentences per request, displays 1, caches the other for instant alternatives
- **Context-Aware Prompts**: Uses page context (title, theme, source) for contextually relevant sentence generation
- **Error Handling**: Graceful fallbacks with retry logic and user-friendly error messages
- **Cost Optimization**: Minimizes API calls through intelligent caching and batch processing
- **Configurable Parameters**: Supports different difficulty levels and language pairs

```typescript
// Key interfaces
interface GeminiGenerationRequest {
  word: string
  translation: string
  targetLanguage: string
  nativeLanguage: string
  pageContext?: PageContext
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
}

interface CachedSentences {
  displaySentence: string
  cachedSentence: string
  usedContext: boolean
  generatedAt: string
}
```

#### 2. **Page Context System** (`lib/types/pageContext.ts`)
- **Authentic Gold List Method**: Supports the practice of noting source materials
- **Database Schema Extension**: Added context fields to pages table (title, source, description, theme)
- **Helper Functions**: Context validation, formatting, and display utilities
- **Migration Support**: Database migration script for adding context fields

```sql
-- Database schema additions
ALTER TABLE pages ADD COLUMN context_title TEXT;
ALTER TABLE pages ADD COLUMN context_source TEXT; 
ALTER TABLE pages ADD COLUMN context_description TEXT;
ALTER TABLE pages ADD COLUMN context_theme TEXT;
```

#### 3. **Enhanced Input Screen** (`app/notebook/[id]/input.tsx`)
- **Page Context Form**: Collapsible UI component with quick presets and manual input
- **AI Sentence Generation**: Integrated into both Focus Mode and List Mode
- **Real-time State Management**: Per-word AI generation states with loading indicators
- **Visual Context Indicators**: Shows when page context is being used for generation
- **Smart Form Integration**: Context data saved with page and used for AI generation

**Key Components**:
- `PageContextForm`: Collapsible context input with presets
- `AISentenceSection`: AI generation UI with Generate/Alternative buttons
- Smart state management for AI generation per word-meaning pair

#### 4. **Review Screen Context Hints** (`app/notebook/[id]/review.tsx`)
- **Context Loading**: Automatically loads page context when review session starts
- **Context Hint Button**: Toggle-able UI showing original learning context
- **Memory Aid**: Helps users recall vocabulary using original source context
- **Non-intrusive Design**: Optional hint system that doesn't disrupt review flow

#### 5. **Database Service Extensions** (`lib/services/supabaseService.ts`)
- **Page Context Management**: CRUD operations for page context data
- **Performance Optimized**: Uses existing retry logic and error handling patterns
- **Type Safety**: Full TypeScript integration with database schema

```typescript
// New service methods
async updatePageContext(pageId: string, context: PageContext): Promise<void>
async getPageContext(pageId: string): Promise<PageContext | null>
```

### Technical Implementation Details

#### **State Management Architecture**
- **Hierarchical State**: AI state managed per word-meaning pair using Map structures
- **Cache Management**: Separate caching layer for alternative sentences
- **Real-time Updates**: Immediate UI feedback during AI generation
- **Error Boundaries**: Graceful degradation when AI services fail

#### **UI/UX Design Patterns**
- **Progressive Enhancement**: AI features enhance but don't replace manual input
- **Context Indicators**: Visual cues when AI uses page context for generation
- **Loading States**: Professional loading indicators during AI processing
- **Error Messaging**: User-friendly error messages with retry options

#### **Performance Optimizations**
- **Smart Caching**: 50% reduction in API calls through intelligent sentence caching
- **Parallel Processing**: Context loading doesn't block main review/input flows
- **Debounced Operations**: Prevents excessive API calls during rapid user input
- **Memory Management**: Efficient state cleanup and garbage collection

### Environment Configuration

#### **Required Environment Variables**
```bash
# Gemini AI Configuration
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key

# Get API key from:
# https://makersuite.google.com/app/apikey
```

#### **API Integration**
- **Gemini 1.5 Flash Model**: Optimal balance of speed, cost, and quality
- **Prompt Engineering**: Context-aware prompts that incorporate page themes
- **Rate Limiting**: Built-in safeguards to prevent API quota exhaustion
- **Error Recovery**: Automatic fallbacks to manual input when AI fails

### File Structure Additions

#### **New Files Created**:
```
lib/
├── services/
│   └── geminiService.ts           # AI sentence generation service
├── types/
│   ├── pageContext.ts             # Page context type definitions
│   └── aiGeneration.ts            # AI generation state types
└── components/
    └── PageContextForm.tsx        # Page context input component
```

#### **Enhanced Existing Files**:
```
app/notebook/[id]/
├── input.tsx                      # Added AI generation & page context
└── review.tsx                     # Added context hints

lib/services/
└── supabaseService.ts             # Added page context CRUD operations

lib/types/
└── database.ts                    # Extended with context fields

add_page_context_fields.sql        # Database migration script
.env.example                       # Added Gemini API key configuration
```

### Integration with Gold List Method

#### **Authentic Method Adherence**:
- **Source Material Tracking**: Page context supports noting source books/materials
- **Contextual Learning**: AI generates sentences within the learning theme/domain
- **Memory Enhancement**: Context hints during review aid natural recall
- **Progressive Difficulty**: AI difficulty adapts to notebook level (Bronze/Silver/Gold)

#### **User Workflow Enhancement**:
1. **Input Phase**: Set page context → Add words → Generate contextual sentences
2. **Review Phase**: Access context hints → Remember source material → Better recall
3. **Progression**: Context travels with words through Gold List Method rounds

### Testing & Quality Assurance

#### **Implemented Safeguards**:
- **Fallback Mechanisms**: Manual input always available when AI fails
- **Input Validation**: Comprehensive validation before AI API calls
- **Error Boundaries**: Graceful handling of network/API failures
- **Performance Monitoring**: Console logging for AI generation metrics

#### **Cost Management**:
- **Smart Caching**: 2-for-1 sentence generation reduces API costs by 50%
- **Context Optimization**: Efficient prompt engineering minimizes token usage
- **Rate Limiting**: Built-in controls prevent accidental quota exhaustion
- **Alternative Sentences**: Cached alternatives eliminate duplicate API calls

### Future Enhancement Opportunities

#### **Potential Improvements**:
- **Offline Mode**: Cache generated sentences for offline review
- **Custom Prompts**: User-configurable prompt templates
- **Multi-language Support**: Enhanced prompt engineering for different language pairs
- **Analytics**: Track AI generation success rates and user preferences
- **Voice Integration**: Audio pronunciation of generated sentences

This AI sentence generator implementation significantly enhances the Gold List Method experience while maintaining authentic methodology principles and providing a professional, cost-effective AI integration.