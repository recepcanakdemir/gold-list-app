import { useEffect } from 'react'
import { useRouter, useSegments } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'

    // If user is not authenticated
    if (!user) {
      if (!inAuthGroup) {
        router.replace('/(auth)/signin')
      }
      return
    }

    // User is authenticated - redirect to main app
    if (user && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [user, loading, segments])

  return <>{children}</>
}