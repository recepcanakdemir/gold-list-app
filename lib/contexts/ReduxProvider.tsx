/**
 * Redux Provider - Unified State Management for Instagram-like Responsiveness
 * 
 * Provides Redux store with persistence and optimistic updates to all components.
 * Replaces multiple competing state systems with single source of truth.
 */

import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { View, Text, ActivityIndicator } from 'react-native'
import { store, persistor, useAppDispatch, useAppSelector } from '@/lib/store'
import { processSyncQueue } from '@/lib/store/slices/syncSlice'

interface ReduxProviderProps {
  children: React.ReactNode
}

// Auto-sync component that runs background sync operations
function AutoSync() {
  const dispatch = useAppDispatch()
  const { pendingOperations, isOnline, isSyncing } = useAppSelector(state => state.sync)

  useEffect(() => {
    // Auto-process sync queue when there are pending operations and we're online
    if (pendingOperations.length > 0 && isOnline && !isSyncing) {
      const timer = setTimeout(() => {
        dispatch(processSyncQueue())
      }, 500) // Small delay to batch operations

      return () => clearTimeout(timer)
    }
  }, [dispatch, pendingOperations.length, isOnline, isSyncing])

  // Monitor network status
  useEffect(() => {
    // This would be implemented with NetInfo in a real app
    // For now, assume we're always online
    // NetInfo.addEventListener(state => {
    //   dispatch(setOnlineStatus(state.isConnected))
    // })
  }, [dispatch])

  return null
}

// Simple loading component that doesn't depend on ThemeContext
function SimpleLoading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
      <ActivityIndicator size="large" color="#F59E0B" />
      <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280' }}>Loading...</Text>
    </View>
  )
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  return (
    <Provider store={store}>
      <PersistGate 
        loading={<SimpleLoading />} 
        persistor={persistor}
      >
        <AutoSync />
        {children}
      </PersistGate>
    </Provider>
  )
}