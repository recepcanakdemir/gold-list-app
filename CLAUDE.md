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