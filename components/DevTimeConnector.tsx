import { useEffect } from 'react'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { setTimeProvider } from '@/lib/services/supabaseService'

export function DevTimeConnector() {
  const { getCurrentDate } = useDevTime()

  useEffect(() => {
    // Connect the DevTime context to the supabaseService
    setTimeProvider(getCurrentDate)
  }, [getCurrentDate])

  return null // This component doesn't render anything
}