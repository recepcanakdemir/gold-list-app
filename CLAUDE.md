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
├── (auth)/               # Authentication flow
│   ├── signin.tsx
│   ├── signup.tsx
│   ├── forgot-password.tsx
│   └── _layout.tsx       # Auth route group layout
├── (tabs)/               # Main app navigation
│   ├── index.tsx         # Home/Dashboard (redirects to dashboard)
│   ├── dashboard.tsx     # Main dashboard with notebook overview
│   ├── settings.tsx      # Settings, profile, dev tools
│   └── _layout.tsx       # Bottom tab navigation layout
├── notebook/
│   └── [id]/
│       ├── index.tsx     # Notebook detail (progress map)
│       ├── input.tsx     # Word input screen (Focus & List modes)
│       └── review.tsx    # Tinder-style review interface
├── modal/
│   ├── create-notebook.tsx    # Notebook creation modal
│   ├── notifications.tsx      # Notification history modal
│   └── notebook-menu.tsx      # Notebook options menu
├── word-save/
│   └── index.tsx         # Word save results screen
└── _layout.tsx           # Root layout with context providers
```

**Note**: The onboarding screens mentioned in the original documentation are NOT yet implemented. The app currently goes directly from authentication to the main dashboard.

### Database Schema (Supabase PostgreSQL)

**Core Tables & Relationships**:
```
profiles (user data, streaks, statistics, subscription status)
  ↓ 1:many
notebooks (language-specific collections, Bronze/Silver/Gold levels)  
  ↓ 1:many
pages (200 pages per notebook, daily unlocking system, with context fields)
  ↓ 1:many  
words (vocabulary entries with Gold List Method progression, AI features)
  ↓ 1:many
reviews (review session history and performance tracking)

Additional Tables:
- user_notification_settings (notification preferences)
- notification_history (sent notification tracking)
- user_badges (achievement system)
```

**Key Database Functions (RPC)** - 50+ functions total:
- `create_notebook_with_pages` - Atomic notebook creation with 200 pages
- `get_user_notebooks_with_stats` - Optimized notebook loading with statistics  
- `get_words_for_review` - Complex query for reviewable words with 14-day filtering
- `update_daily_streak` - Streak calculation and validation logic
- `add_words_to_notebook` - Batch word insertion with position tracking
- `update_word_review_result` - Handle review outcomes and round progression
- `get_learning_insights` - Advanced analytics and progress calculations
- `check_subscription_limits` - Freemium feature validation
- `update_user_stats` - Real-time statistics updates
- Performance optimized with strategic indexing for 5-25x speed improvements

**Database Schema Features**:
- **Subscription Management**: Built-in support for free/weekly/annual tiers
- **Page Context System**: Source material tracking for authentic Gold List Method
- **AI Integration Fields**: Sentence generation, bold text marking, AI flags
- **Notification System**: User preferences and delivery tracking
- **Achievement System**: Badge tracking for user engagement
- **Performance Optimizations**: Strategic indexes, RPC functions, retry logic

### Key Architecture Patterns

#### State Management
- **Hierarchical Context Providers**: DevTime → Theme → Auth → App
- **React Context**: Preferred over Redux for app complexity level  
- **AsyncStorage**: Settings persistence and offline caching
- **Supabase Real-time**: Live data synchronization

#### DevTime Simulation System (`lib/contexts/DevTimeContext.tsx`)
**Critical for Development**: Since the Gold List Method requires 14-day intervals, a time simulation system enables testing without waiting real weeks.

**Key Features**:
- **Time Manipulation**: Advance days instantly for testing review cycles
- **Page Auto-creation**: Automatically creates pages when simulation advances
- **Streak Validation**: Integrates with daily streak system
- **Persistent State**: Maintains simulation state across app restarts
- **Day Change Callbacks**: Notifies components when simulation day advances

**Usage Patterns**:
```typescript
const { getCurrentDate, nextDay, previousDay, isSimulationActive } = useDevTime()
// getCurrentDate() returns simulated or real date
// nextDay() advances simulation by one day
// Used throughout app for all date-related logic
```

**Integration Points**:
- All date queries use `getCurrentDate()` instead of `new Date()`
- Page unlocking system respects simulated time
- Review availability calculations use simulated dates
- Notification scheduling adapts to simulation mode

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
- **Frontend**: React Native with Expo 54.0.13, TypeScript strict mode
- **Backend**: Supabase (PostgreSQL + Auth + Real-time subscriptions)
- **Navigation**: Expo Router with file-based routing and typed routes
- **Animation**: React Native Reanimated, Gesture Handler (Tinder-style swipes)
- **Graphics**: React Native SVG, Victory Native (charts), React Native Skia
- **Platform Support**: iOS (primary), Android, Web
- **AI Integration**: Google Gemini API for sentence generation
- **State Management**: React Context (DevTime, Theme, Auth, App contexts)

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
- `/(auth)/` - Authentication screens (signin, signup, forgot-password)
- `/(tabs)/` - Main app with custom PagerView-based bottom navigation
- `notebook/[id]/` - Dynamic notebook routes (detail, input, review)
- `modal/` - Overlay screens (create-notebook, notifications, notebook-menu)
- `word-save/` - Word saving result screens

**Component Architecture**:
```
components/
├── ui/                        # Reusable UI components
│   ├── SwipeCard.tsx          # Tinder-style swipe interface
│   ├── collapsible.tsx        # Collapsible sections
│   └── icon-symbol.tsx        # Platform-specific icons
├── AuthGuard.tsx              # Route protection
├── DevTimeConnector.tsx       # DevTime integration helper
├── DevTimeDisplay.tsx         # Development time indicator
├── LoadingIndicator.tsx       # App-wide loading states
├── PageContextForm.tsx        # AI context input form
├── StreakAnimation.tsx        # Animated streak indicators
├── StreakProgressDisplay.tsx  # Streak progress visualization
├── WordSaveResultsScreen.tsx  # Word save feedback
├── shared-header.tsx          # Common header component
├── bottom-nav.tsx             # Custom bottom navigation
└── [various congrats modals]  # Achievement celebrations
```

**Key Service Files**:
```
lib/services/
├── supabaseService.ts         # Database operations (2000+ lines)
├── notificationService.ts     # Notification scheduling (mock impl.)
├── geminiService.ts           # AI sentence generation
├── translationService.ts      # Language utilities
└── mockData.ts               # Development test data

lib/contexts/
├── DevTimeContext.tsx         # Time simulation for testing
├── ThemeContext.tsx          # Dark/light theme management
├── AuthContext.tsx           # User authentication
└── AppContext.tsx            # Global app state

lib/types/
├── database.ts               # Complete DB schema types
├── goldlist.ts              # App-specific types
├── pageContext.ts           # AI context types
└── aiGeneration.ts          # AI generation state types
```

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

## Notification System Implementation

### Overview
A comprehensive notification system designed for the Gold List Method's learning patterns, with smart scheduling and DevTime integration for development testing.

### Current Status: Mock Implementation
**Important**: The notification system is currently implemented with mock notifications (logs to console) to avoid iOS entitlement complexity during development. Real notifications can be enabled later by:
1. Installing `expo-notifications` package
2. Setting up iOS push notification entitlements  
3. Replacing mock implementation in `notificationService.ts`

### Key Features

#### **Notification Types** (`lib/services/notificationService.ts`)
1. **Daily Words** (2:00 PM): Reminds users to add words when pages are unlocked but empty
2. **Progress Reminders** (5:00 PM): Encourages completion when daily goals are partially met
3. **Review Ready** (7:00 PM): Notifies when words become reviewable (14-day cycle)
4. **Streak Protection** (9:00 PM): Prevents streak loss when no activity detected

#### **Smart Scheduling Logic**
- **Time-based**: Industry-standard notification times for maximum engagement
- **Context-aware**: Only sends relevant notifications based on user state
- **DevTime Integration**: Adapts to simulated time for development testing
- **Duplicate Prevention**: Cancels existing notifications before scheduling new ones

#### **Database Integration**
```sql
-- Notification tables
user_notification_settings (preferences per user)
notification_history (delivery tracking)

-- Key functions
get_today_page() - Check if user has empty pages
get_words_for_review() - Find reviewable vocabulary  
check_user_activity() - Detect daily engagement
```

### Technical Implementation

#### **Service Architecture** (`lib/services/notificationService.ts`)
```typescript
class NotificationService {
  // Core methods
  async initialize(userId: string, devMode: boolean)
  async scheduleAllNotifications(notebooks: any[], profile: any, simulatedDate?: Date)
  async scheduleDailyWordReminders(notebooks: any[], simulatedDate?: Date)
  async scheduleProgressReminders(notebooks: any[], simulatedDate?: Date)
  async scheduleReviewReminders(notebooks: any[], simulatedDate?: Date)
  async scheduleStreakProtection(profile: any, simulatedDate?: Date)
  
  // Management methods
  async cancelAllNotifications()
  async getScheduledNotifications()
  async triggerNotificationNow(type: string, data: any) // For testing
}
```

#### **Mock Implementation Features**
- **Console Logging**: All notifications log to console with clear formatting
- **Full Logic Preservation**: Complete scheduling and cancellation logic maintained
- **Testing Controls**: Settings screen provides manual notification testing
- **Database Storage**: Notification history still stored for analytics
- **Platform Detection**: Conditional behavior based on iOS/Android

#### **AppContext Integration** (`lib/contexts/AppContext.tsx`)
```typescript
// Automatic initialization when user authenticates
useEffect(() => {
  if (user?.id && appState.settings.enableNotifications) {
    notificationService.initialize(user.id, isDevMode)
      .then(() => scheduleNotifications())
  }
}, [user?.id, appState.settings.enableNotifications, isDevMode])
```

### Development Tools

#### **Settings Screen Testing** (`app/(tabs)/settings.tsx`)
- **Test Buttons**: Manual triggers for all 4 notification types
- **Scheduled Notifications**: View currently scheduled notifications
- **Cancel All**: Clear all scheduled notifications
- **Mock Data**: Realistic test data for each notification type

#### **DevTime Integration**
- **Simulation Mode**: Notifications respect simulated time
- **Day Advancement**: Automatically schedules notifications when advancing days
- **Testing Efficiency**: Test 14-day review cycles in minutes instead of weeks

### Database Schema Extensions

#### **Notification Tables**
```sql
CREATE TABLE user_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_notifications BOOLEAN DEFAULT true,
  daily_reminder_time TIME DEFAULT '14:00:00',
  progress_reminder_time TIME DEFAULT '17:00:00',
  review_reminder_time TIME DEFAULT '19:00:00',
  streak_protection_time TIME DEFAULT '21:00:00'
);

CREATE TABLE notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Future Implementation Steps

#### **For Real Notifications**:
1. **Install Dependencies**: `npm install expo-notifications`
2. **iOS Setup**: Configure push notification entitlements in Apple Developer Console
3. **Update Service**: Replace mock implementation with real Expo Notifications API
4. **Test on Device**: Notifications require physical devices (not simulators)

#### **Advanced Features** (Future):
- **User Customization**: Configurable notification times
- **Smart Frequency**: Adaptive scheduling based on user behavior  
- **Rich Notifications**: Include progress data, streak counts
- **Deep Linking**: Navigate to specific screens from notifications

### Integration Points

#### **Gold List Method Alignment**:
- **14-day Cycle**: Review notifications respect exact Gold List timing
- **Daily Rhythm**: Supports consistent daily learning habits
- **Progress Motivation**: Encourages completion without being intrusive
- **Streak Maintenance**: Protects learning momentum

#### **DevTime Compatibility**:
- **Simulation Testing**: Full notification testing in accelerated time
- **Development Efficiency**: Validate notification logic without real-time delays
- **Realistic Timing**: Maintains authentic notification scheduling patterns

## Current Implementation Status & Missing Features

### ✅ **Completed Core Features**
- **Gold List Method Implementation**: Complete 4-round system with 14-day intervals
- **Database Architecture**: Full PostgreSQL schema with 50+ RPC functions
- **AI Integration**: Google Gemini sentence generation with context awareness
- **DevTime Simulation**: Time manipulation for efficient testing
- **Notification System**: Complete logic with mock implementation
- **Authentication**: Supabase auth with profile management
- **Theme System**: Complete dark/light mode support
- **Input Modes**: Dual Focus/List modes with AI generation
- **Review System**: Tinder-style swipe interface with animations
- **Progress Tracking**: Real-time statistics and streak management
- **Performance Optimizations**: Database indexing and retry logic

### ❌ **Missing Features (Planned)**
- **Onboarding Screens**: User education about Gold List Method (referenced but not implemented)
- **Subscription System**: RevenueCat integration for freemium model
- **Real Notifications**: iOS/Android push notifications (currently mocked)
- **Paywall Integration**: Subscription upgrade flows
- **Advanced Analytics**: Detailed learning insights and progress reports
- **Export/Import**: Data backup and migration features
- **Offline Mode**: Local storage for limited offline functionality

### ⚠️ **Current Limitations**
- **iOS Notifications**: Disabled due to entitlement complexity during development
- **Freemium Model**: Database has subscription fields but no enforcement yet
- **Onboarding Flow**: Users go directly from auth to dashboard
- **RevenueCat**: Dependencies present but integration not implemented
- **Real-time Sync**: Supabase real-time enabled but not fully utilized

### 🔧 **Development Tools & Debugging**
- **DevTime Controls**: Manual day advancement in Settings screen
- **Notification Testing**: Mock notification triggers in Settings
- **Database Debugging**: Extensive SQL helper files for migrations
- **Performance Monitoring**: Console logging for database operations
- **Error Handling**: Comprehensive retry logic with exponential backoff

### 📊 **Database Management**
- **50+ SQL Files**: Located in `sql_helper/` and `supabase_functions/`
- **Migration History**: Complete database evolution tracking
- **Performance Indexes**: Strategic optimization for 5-25x speed improvements
- **RPC Functions**: Complex operations moved to database level
- **Row Level Security**: Proper data isolation between users

### 🎯 **Architecture Decisions**
- **React Context over Redux**: Suitable for current app complexity
- **File-based Routing**: Expo Router for type-safe navigation
- **Mock-first Development**: Enable rapid testing without external dependencies
- **DevTime Integration**: All date logic abstracted for time manipulation
- **TypeScript Strict Mode**: Complete type safety across entire codebase
- **Performance First**: Parallel processing and optimized database queries

This documentation reflects the current state as of the most recent development session, including the notification system implementation and AI sentence generation features.