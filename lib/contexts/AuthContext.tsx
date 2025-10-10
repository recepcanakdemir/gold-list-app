import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import { Tables } from '../types/database'
import { profileOperations } from '../supabase/operations'
import { supabaseService } from '../services/supabaseService'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Tables<'profiles'>['Row'] | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  refreshProfile: () => Promise<void>
  updateUserStreak: (hasActivity: boolean) => Promise<void>
  getStreakStatus: () => Promise<{streak_count: number, days_missed: number, is_at_risk: boolean} | null>
  recordUserActivity: () => Promise<void>
  validateDailyStreak: (currentDate?: Date) => Promise<void>
  resetUserStreak: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Tables<'profiles'>['Row'] | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Throttling for refreshProfile to prevent infinite loops
  const lastProfileRefreshRef = useRef(0)
  const isRefreshingProfileRef = useRef(false)

  useEffect(() => {
    // Set up global function for DevTime integration (avoids circular dependency)
    if (typeof window !== 'undefined') {
      (window as any).validateDailyStreak = validateDailyStreak
    }
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    try {
      let userProfile = await profileOperations.get(userId)
      
      // Create profile if it doesn't exist
      if (!userProfile) {
        const newProfile = {
          id: userId,
          email: session?.user?.email || '',
          subscription_status: 'free' as const,
          streak_count: 0,
          longest_streak: 0,
          streak_miss_count: 0,
          total_words_added: 0,
          total_words_mastered: 0,
        }
        userProfile = await profileOperations.create(newProfile)
      }
      
      // Validate and update streak on app load
      try {
        // Use a separate call that doesn't depend on session being set yet
        const today = new Date().toISOString().split('T')[0]
        const lastActivity = userProfile.last_activity_date
        
        if (!lastActivity || lastActivity !== today) {
          const hasActivityToday = false // No activity yet today
          await supabaseService.updateStreak(userId, hasActivityToday)
          
          // Refresh profile to get updated streak data
          userProfile = await profileOperations.get(userId) || userProfile
        }
      } catch (error) {
        console.error('Error validating daily streak:', error)
      }
      
      // PERFORMANCE: Only update profile state if data actually changed
      setProfile(prevProfile => {
        // If no previous profile, always set the new one
        if (!prevProfile) {
          if (__DEV__) console.log('🔄 AuthContext: Setting initial profile')
          return userProfile
        }
        
        // Deep equality check to prevent unnecessary updates
        const profileChanged = JSON.stringify(prevProfile) !== JSON.stringify(userProfile)
        if (!profileChanged) {
          if (__DEV__) console.log('🔄 AuthContext: Profile data identical, skipping update (prevents loop!)')
          return prevProfile // Keep the same reference to avoid triggering useEffect
        }
        
        if (__DEV__) console.log('🔄 AuthContext: Profile data changed, updating state')
        return userProfile
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  // Function to refresh profile data with throttling to prevent loops
  async function refreshProfile() {
    if (!session?.user?.id) return
    
    // THROTTLING: Prevent rapid successive calls and infinite loops
    const now = Date.now()
    const timeSinceLastRefresh = now - lastProfileRefreshRef.current
    const THROTTLE_MS = 2000 // Only allow one refresh per 2 seconds
    
    if (isRefreshingProfileRef.current) {
      if (__DEV__) console.log('🔄 AuthContext: Profile refresh already in progress, skipping')
      return
    }
    
    if (timeSinceLastRefresh < THROTTLE_MS) {
      if (__DEV__) console.log(`🔄 AuthContext: Profile refresh throttled, last call was ${timeSinceLastRefresh}ms ago`)
      return
    }
    
    isRefreshingProfileRef.current = true
    lastProfileRefreshRef.current = now
    
    try {
      if (__DEV__) console.log('🔄 AuthContext: Refreshing profile data')
      await loadProfile(session.user.id)
    } finally {
      isRefreshingProfileRef.current = false
    }
  }

  async function signUp(email: string, password: string) {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function signInWithGoogle() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      })
      if (error) throw error
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function signInWithApple() {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
      })
      if (error) throw error
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function updateUserStreak(hasActivity: boolean) {
    if (!session?.user?.id) return
    
    try {
      await supabaseService.updateStreak(session.user.id, hasActivity)
      await refreshProfile()
    } catch (error) {
      console.error('Error updating streak:', error)
    }
  }

  async function getUserStreakStatus() {
    if (!session?.user?.id) return null
    
    try {
      return await supabaseService.getStreakStatus(session.user.id)
    } catch (error) {
      console.error('Error getting streak status:', error)
      return null
    }
  }

  async function recordUserActivity() {
    if (!session?.user?.id) return
    
    try {
      await supabaseService.recordActivity(session.user.id)
      await refreshProfile()
    } catch (error) {
      console.error('Error recording activity:', error)
    }
  }

  async function validateDailyStreak(currentDate?: Date) {
    const today = (currentDate || new Date()).toISOString().split('T')[0]
    console.log(`🔥 AuthContext: validateDailyStreak called for ${today}`)
    
    // Helper function to get available user ID with fallback
    const getAvailableUserId = async (): Promise<string | null> => {
      // Try context session first
      if (session?.user?.id) {
        console.log(`🔥 AuthContext: Using context session ID`)
        return session.user.id
      }
      
      // Fallback to direct Supabase session query
      try {
        const { data: { session: directSession } } = await supabase.auth.getSession()
        if (directSession?.user?.id) {
          console.log(`🔥 AuthContext: Using direct Supabase session ID`)
          return directSession.user.id
        }
      } catch (error) {
        console.log(`🔥 AuthContext: Error getting direct session:`, error)
      }
      
      return null
    }
    
    // Retry logic with exponential backoff
    const maxRetries = 4
    const retryDelays = [0, 100, 200, 500, 1000] // ms
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const userId = await getAvailableUserId()
      
      if (userId) {
        console.log(`🔥 AuthContext: User ID found on attempt ${attempt + 1}: ${userId}`)
        
        try {
          // Get current profile to check last activity
          const userProfile = await profileOperations.get(userId)
          if (!userProfile) {
            console.log(`🔥 AuthContext: No user profile found, skipping validation`)
            return
          }
          
          const lastActivity = userProfile.last_activity_date
          console.log(`🔥 AuthContext: lastActivity = ${lastActivity}, today = ${today}`)
          
          console.log(`🔥 AuthContext: Always calling updateStreak with hasActivity=false for daily validation`)
          // Always validate daily streak regardless of last activity date
          const hasActivityToday = false // No activity yet today
          await supabaseService.updateStreak(userId, hasActivityToday, currentDate)
          console.log(`🔥 AuthContext: updateStreak completed successfully`)
          return // Success - exit retry loop
        } catch (error) {
          console.error('Error validating daily streak:', error)
          return // Don't retry on business logic errors
        }
      }
      
      // If no user ID and not the last attempt, wait and retry
      if (attempt < maxRetries - 1) {
        const delay = retryDelays[attempt + 1]
        console.log(`🔥 AuthContext: No user session on attempt ${attempt + 1}, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    console.log(`🔥 AuthContext: No user session found after ${maxRetries} attempts, skipping validation`)
  }

  async function resetUserStreak() {
    if (!session?.user?.id) return
    
    try {
      await supabaseService.resetStreak(session.user.id)
      await refreshProfile()
    } catch (error) {
      console.error('Error resetting streak:', error)
    }
  }

  const value: AuthContextType = {
    session,
    user: session?.user || null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithApple,
    refreshProfile,
    updateUserStreak,
    getStreakStatus: getUserStreakStatus,
    recordUserActivity,
    validateDailyStreak,
    resetUserStreak,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}