# Supabase Functions for Gold List App

This directory contains all the database functions and triggers needed for the Gold List Method vocabulary learning app.

## How to Deploy

### Option 1: Individual Files
Copy and paste each `.sql` file content into the Supabase SQL Editor and execute them one by one.

### Option 2: All at Once
Copy the entire `supabase_config.sql` file from the root directory and execute it in the Supabase SQL Editor.

## Functions Overview

### User Management
- `update_user_profile.sql` - Update user display name and avatar
- `get_user_stats.sql` - Get user statistics and progress
- `update_daily_streak.sql` - Update user's daily learning streak

### Notebook Management  
- `create_notebook.sql` - Create new vocabulary notebook (with premium limits)
- `get_user_notebooks.sql` - Get all user notebooks with statistics
- `get_notebook_stats.sql` - Get detailed statistics for a specific notebook
- `delete_notebook.sql` - Delete notebook and all associated words

### Word Management
- `add_words_to_notebook.sql` - Add multiple words to a notebook
- `get_words_for_review.sql` - Get words ready for review
- `update_word_review_result.sql` - Update word after review (advance round or mark mastered)

### Analytics & Progress
- `get_daily_progress.sql` - Get daily progress data for charts
- `get_learning_insights.sql` - Get learning insights and recommendations

### Subscription Management
- `update_subscription_status.sql` - Update user subscription status
- `check_subscription_limits.sql` - Check if user can create more notebooks

### Trigger Functions
- `handle_new_user.sql` - Create profile when new user signs up
- `update_notebook_stats.sql` - Update notebook statistics when words change
- `update_user_stats.sql` - Update user statistics when words change

### Triggers
- `trigger_on_auth_user_created.sql` - Trigger for new user creation
- `trigger_update_notebook_stats.sql` - Trigger for notebook statistics
- `trigger_update_user_stats.sql` - Trigger for user statistics

## Required Tables

Make sure you have created all the required tables first by running the schema from `supabase_config.sql`:

- `profiles`
- `notebooks` 
- `words`
- `subscription_logs`

## Row Level Security (RLS)

All functions respect Row Level Security policies. Users can only access their own data.

## Usage in App

These functions are called from the app using the Supabase client:

```typescript
const { data, error } = await supabase.rpc('function_name', { 
  parameter_name: value 
})
```

Example:
```typescript
const { data, error } = await supabase.rpc('create_notebook', {
  p_title: 'Spanish Vocabulary',
  p_language: 'Spanish',
  p_language_code: 'es',
  p_words_per_day: 20
})
```