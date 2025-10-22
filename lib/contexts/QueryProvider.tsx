import React, { createContext, useContext } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create QueryClient with optimized settings for React Native
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep cached data for 10 minutes when not in use
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times with exponential backoff
      retry: 2,
      // Don't refetch on window focus (mobile apps don't have windows)
      refetchOnWindowFocus: false,
      // Refetch when app comes back from background
      refetchOnReconnect: true,
      // Enable background refetching for fresh data
      refetchInterval: false, // Set per-query when needed
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
})

interface QueryContextType {
  queryClient: QueryClient
}

const QueryContext = createContext<QueryContextType | undefined>(undefined)

export function useQueryClient() {
  const context = useContext(QueryContext)
  if (context === undefined) {
    throw new Error('useQueryClient must be used within a QueryProvider')
  }
  return context.queryClient
}

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryContext.Provider value={{ queryClient }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </QueryContext.Provider>
  )
}

// Export the queryClient for use in non-component code
export { queryClient }