# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gold List Method App** - A scientifically-backed vocabulary learning iOS application implementing David James' Gold List Method. The app leverages natural memory consolidation and spaced repetition for permanent vocabulary retention, moving away from traditional flashcard-based forced memorization.

## Gold List Method Core Principles

### 4-Round System (8 weeks total)
- **Round 1 (Red)**: Initial entry - 20-25 words daily
- **Round 2 (Green)**: Review after 14 days, archive remembered words
- **Round 3 (Blue)**: Challenging vocabulary gets more attention  
- **Round 4 (Yellow)**: Final opportunity before notebook progression

### Notebook Hierarchy
- **Bronze**: Primary learning notebook
- **Silver**: Words that failed Bronze notebook's 4 rounds
- **Gold**: Most difficult words that failed Silver notebook

## Common Development Commands

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

### Database Schema (Supabase)
```sql
-- Users table (handled by Supabase Auth)
users: id, email, created_at, subscription_status

-- Notebooks (language-specific collections)
notebooks: id, user_id, title, language, created_at, settings

-- Pages (daily word entry sessions)
pages: id, notebook_id, page_number, date_created, target_round

-- Words (vocabulary entries)
words: id, page_id, word, meaning, notes, image_url, current_round, status

-- Reviews (tracking word progression through rounds)
reviews: id, word_id, round, reviewed_at, remembered, next_review_date
```

### Key Features Implementation

#### Word Input Modes
- **Focus Mode**: Step-by-step entry (1 word per screen)
- **Full Page Mode**: Multiple words on single screen

#### Review System
- Tinder-style card interface with swipe gestures
- Round-specific color theming
- Automatic scheduling based on 14-day intervals

#### Progress Tracking
- GitHub-style activity heatmap
- Weekly/Monthly/Yearly statistics
- Duolingo-inspired progress maps

### Component Organization
```
components/
├── ui/                   # Base UI components (SwipeCard, Collapsible, IconSymbol)
├── AuthGuard.tsx         # Authentication wrapper component
├── shared-header.tsx     # Common header component
├── bottom-nav.tsx        # Bottom navigation
├── haptic-tab.tsx        # Tab with haptic feedback
├── parallax-scroll-view.tsx
├── external-link.tsx
└── hello-wave.tsx        # Welcome animation component
```

### State Management
- React Context for global app state
- Local state for component-specific data
- AsyncStorage for offline capability
- Supabase real-time subscriptions for sync

### Key Technologies
- **Frontend**: React Native with Expo (~54.0.9)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Navigation**: Expo Router with file-based routing and typed routes
- **Gestures**: React Native Gesture Handler (for swipe cards)
- **Charts**: Victory Native and React Native Chart Kit
- **Graphics**: React Native Skia for custom UI
- **Subscriptions**: Expo In-App Purchases
- **Offline**: AsyncStorage + background sync
- **Language**: TypeScript with strict mode enabled

### Development Configuration
- **TypeScript**: Strict mode with path aliases (`@/*` maps to root)
- **ESLint**: Expo ESLint config with flat config format
- **Expo Features**: New Architecture enabled, typed routes, React Compiler
- **Platform Support**: iOS (primary), Android, Web

### Development Priorities
1. Core Gold List Method logic implementation
2. Database schema and data flow
3. Word input and review interfaces
4. Progress tracking and analytics
5. Subscription and monetization
6. Polish and performance optimization

### Design System
- **Round Colors**: Red (R1), Green (R2), Blue (R3), Yellow (R4)
- **Notebook Levels**: Bronze, Silver, Gold visual hierarchy
- **Typography**: System fonts with accessibility support
- **Gestures**: Swipe-based interactions throughout app

## Current Development Status

### ✅ Completed Features

#### Core Infrastructure
- **Project Setup**: React Native with Expo 54.0.9, TypeScript, ESLint
- **Authentication System**: Complete Supabase auth with AuthContext and AuthGuard
- **Database Integration**: Full Supabase PostgreSQL integration with real-time features
- **App Context**: Global state management with AppContext for notebooks and user data
- **Theme System**: Dark/Light theme support with ThemeContext
- **Navigation**: File-based routing with Expo Router, modal presentations

#### Database Implementation
- **User Profiles**: Complete profile system with stats tracking
- **Notebooks**: Full CRUD operations for language-specific notebooks
- **Pages System**: 200 pages per notebook with daily unlocking mechanism
- **Words Management**: Complete word CRUD with Gold List Method progression
- **Review System**: Word review tracking through 4-round system
- **Statistics**: Real-time user stats (total_words_added, total_words_mastered, streak_count)

#### User Interface
- **Onboarding Flow**: Welcome, method explanation, tutorial screens
- **Authentication Screens**: Sign in, sign up, forgot password
- **Homepage**: Main dashboard with real progress data and weekly statistics
- **Dashboard**: Comprehensive analytics with GitHub-style heatmap and metrics
- **Shared Header**: Navigation header with streak counter and notifications
- **Notebook Management**: Create, view, and manage vocabulary notebooks

#### Gold List Method Implementation
- **Page Unlocking**: Daily page unlocks (first page today, subsequent pages unlock daily)
- **Word Addition**: Add up to 20 words per page with translation and notes
- **Review Scheduling**: Words become reviewable after 14 days (real-time intervals)
- **4-Round Progression**: Words progress through Red→Green→Blue→Yellow rounds
- **Mastery Tracking**: Words marked as mastered exit the review cycle
- **Statistics Integration**: Profile stats update when words are added/mastered
- **Auto-Focus Navigation**: "Add Today's Words" automatically scrolls to current page with speech bubble

#### Progress Tracking
- **Real Data Integration**: All progress displays use actual database statistics
- **Weekly Progress**: Real word counts for each day of the current week
- **Today's Goal**: Actual daily progress vs. user's word goal
- **Notebook Stats**: Per-notebook word counts and completion tracking
- **Activity Visualization**: Dashboard shows real learning activity patterns

### 🔧 Current Implementation Details

#### Database Schema
```sql
-- Profiles table
profiles: id, email, subscription_status, streak_count, total_words_added, total_words_mastered

-- Notebooks table  
notebooks: id, user_id, title, language, language_code, words_per_day, created_at

-- Pages table
pages: id, notebook_id, page_number, date_created, target_round, words_count, 
       is_completed, is_unlocked, unlock_date, next_review_date

-- Words table
words: id, notebook_id, page_id, word, translation, meaning, notes, example_sentence,
       position_in_page, current_round, is_mastered, review_date, times_reviewed, 
       status, last_reviewed, created_at

-- Reviews table (optional tracking)
reviews: id, word_id, round, remembered, reviewed_at, next_review_date
```

#### Key Services
- **supabaseService.ts**: Complete database operations with fallback methods
- **AuthContext**: User authentication and profile management
- **AppContext**: Global app state with notebook and progress data
- **ThemeContext**: Theme switching and color management

#### Navigation Structure
- **/(onboarding)**: First-time user education flow
- **/(auth)**: Authentication screens
- **/(tabs)**: Main app with bottom navigation
- **notebook/[id]/**: Notebook-specific screens (detail, input, review)
- **/modal/**: Overlay screens (settings, paywall, etc.)

### 🚧 Known Issues & Technical Debt

#### Authentication & Data Loading
- **Fixed**: Authentication check errors when loading progress data before sign-in
- **Fixed**: SafeAreaView deprecation warnings across the app
- **Fixed**: Navigation GO_BACK errors when no valid navigation stack exists

#### Time Simulation (Attempted & Reverted)
- **Attempted**: Development time simulator for testing 14-day review cycles
- **Reverted**: Complex time simulation approach removed due to complexity
- **Current State**: App uses real-time intervals (14 days between reviews)

#### Data Consistency
- **Issue**: Some displays show "total words" vs "added words" inconsistently
- **Location**: Homepage shows profile.total_words_added, some places may show different counts
- **Status**: Needs clarification on terminology and data source standardization

### 🎯 Immediate Next Steps

#### Testing & Validation
1. **Review Flow Testing**: Need method to test word reviews without waiting 14 days
2. **Data Consistency**: Verify all word counts display the same source data
3. **Edge Case Handling**: Test app behavior with no words, no notebooks, etc.

#### Feature Completion
1. **Review Interface**: Complete the Tinder-style word review experience
2. **Subscription System**: Implement paywall and premium features
3. **Notifications**: Add review reminders and streak notifications
4. **Offline Support**: Handle offline scenarios and data sync

#### Polish & UX
1. **Loading States**: Add proper loading indicators throughout app
2. **Error Handling**: Improve error messages and fallback states
3. **Haptic Feedback**: Add tactile feedback for interactions
4. **Animations**: Smooth transitions and micro-interactions

### 📝 Development Notes

#### Gold List Method Timing
- **Current**: Words become reviewable after exactly 14 days
- **Challenge**: Testing review flows requires waiting real time
- **Consideration**: May need development-only testing approach

#### Database Strategy
- **Approach**: Direct Supabase integration with fallback methods
- **RLS Policies**: Row Level Security implemented for data protection
- **Real-time**: Supabase subscriptions for live data updates
- **Offline**: AsyncStorage for caching and offline functionality

#### Performance Considerations
- **Database Queries**: Optimized queries with proper indexing
- **Image Handling**: Expo Image for optimized image loading
- **State Management**: Efficient context usage to minimize re-renders
- **Navigation**: Proper screen lazy loading and memory management

### 🔧 Recent Major Fixes & Optimizations (2025-09-25)

#### Critical Bug Fixes
1. **Review Timing Issue - FIXED**
   - **Problem**: Words added on Day 1 appeared for review on Day 14 instead of Day 15
   - **Root Cause**: Timezone conversion with `.toISOString()` was shifting dates by 1 day
   - **Solution**: Used local date formatting instead of UTC conversion to prevent timezone shifts
   - **Files**: `lib/services/supabaseService.ts`

2. **Slow Word Review Saving - FIXED** 
   - **Problem**: Review saving took too long with "Processing X word reviews" screens
   - **Root Cause**: Sequential database updates instead of parallel processing
   - **Solution**: Implemented parallel operations with `Promise.all()` and RPC fallback
   - **Performance**: 5-10x faster review saving, especially for larger batches
   - **Files**: `lib/services/supabaseService.ts`

3. **Simulation Day Indexing - FIXED**
   - **Problem**: Simulation was 0-based but users think in 1-based terms
   - **Solution**: Changed simulation to start at Day 1, updated all related calculations
   - **Files**: `lib/contexts/DevTimeContext.tsx`, `lib/services/supabaseService.ts`, `components/DevTimeDisplay.tsx`

#### Performance Optimizations
- **Database Indexes**: Added strategic indexes for 5-25x query performance improvement
- **Retry Logic**: Exponential backoff retry system for connection reliability
- **Parallel Processing**: All database operations now run in parallel
- **RPC Fallback**: Database functions with client-side fallback for maximum speed
- **Files**: `database_performance_indexes.sql`, `PERFORMANCE_OPTIMIZATIONS.md`

#### User Experience Enhancements
- **Auto-Focus Navigation**: "Add Today's Words" automatically scrolls to current day's page
  - Smart URL parameters: `?focusPage=15&openBubble=true`
  - Automatic speech bubble with special messaging: "✨ Add today's 20 words here!"
  - Smooth scroll animations and user feedback
  - **Files**: `app/(tabs)/index.tsx`, `app/notebook/[id]/index.tsx`

#### Gold List Method Logic Corrections
- **Remembered Words**: Now correctly marked as mastered and exit review cycle
- **Forgotten Words**: Advance by exactly 1 round as per Gold List Method
- **Timing**: Consistent 14-day intervals across all calculations
- **Page Management**: Proper page locking and state management

### 💡 Architecture Decisions

#### State Management
- **Choice**: React Context over Redux for simplicity
- **Rationale**: App state is relatively simple, Context provides good DX
- **Trade-off**: May need Redux if state complexity grows significantly

#### Database Design
- **Choice**: Supabase over Firebase
- **Rationale**: PostgreSQL provides better data modeling for Gold List relationships
- **Benefits**: Real-time subscriptions, RLS, SQL flexibility

#### Navigation
- **Choice**: Expo Router over React Navigation
- **Rationale**: File-based routing, better TypeScript support
- **Benefits**: Typed routes, better DX, simpler mental model

## Important Reminders

- **NEVER create files unless absolutely necessary** for achieving goals
- **ALWAYS prefer editing existing files** to creating new ones
- **NEVER proactively create documentation files** unless explicitly requested
- **Gold List Method intervals are 14 days** - this is core to the learning system
- **Testing review flows** requires creative solutions due to real-time constraints
- **All word counts should be consistent** across different app screens