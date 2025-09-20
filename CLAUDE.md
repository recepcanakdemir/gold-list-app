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
- `npm run test` - Run tests when implemented

## Application Architecture

### Screen Structure
```
app/
├── (onboarding)/          # Welcome, education, tutorial screens
├── (auth)/               # Authentication flow
├── (tabs)/               # Main app navigation
│   ├── index.tsx         # Home/Dashboard
│   ├── notebooks.tsx     # Notebook management
│   ├── analytics.tsx     # Progress tracking
│   └── profile.tsx       # Settings & profile
├── notebook/
│   ├── [id]/
│   │   ├── index.tsx     # Notebook detail (progress map)
│   │   ├── input.tsx     # Word input screen
│   │   └── review.tsx    # Tinder-style review interface
└── modal/
    ├── paywall.tsx       # Subscription modal
    ├── word-input.tsx    # Full-screen word input
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
├── ui/                   # Base UI components
├── cards/               # Review card components
├── input/               # Word input components
├── charts/              # Analytics visualization
├── onboarding/          # Welcome flow components
└── themed/              # Theme-aware components
```

### State Management
- React Context for global app state
- Local state for component-specific data
- AsyncStorage for offline capability
- Supabase real-time subscriptions for sync

### Key Technologies
- **Frontend**: React Native with Expo (~54.0.9)
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Navigation**: Expo Router with file-based routing
- **Gestures**: React Native Gesture Handler (for swipe cards)
- **Charts**: Victory Native or React Native Chart Kit
- **Subscriptions**: Expo In-App Purchases
- **Offline**: AsyncStorage + background sync

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