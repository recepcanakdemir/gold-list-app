import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'

// These should be moved to environment variables in production
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Helper functions for common operations
export const auth = supabase.auth
export const storage = supabase.storage

// Export types for easier use
export type { Database } from '../types/database'
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']