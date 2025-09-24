import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import { Tables } from '../types/database'
import { profileOperations } from '../supabase/operations'

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

  useEffect(() => {
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
          total_words_added: 0,
          total_words_mastered: 0,
        }
        userProfile = await profileOperations.create(newProfile)
      }
      
      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  // Function to refresh profile data
  async function refreshProfile() {
    if (session?.user?.id) {
      await loadProfile(session.user.id)
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}