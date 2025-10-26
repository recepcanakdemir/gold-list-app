/**
 * Unified Redux Store for Instagram-like Responsiveness
 * 
 * This store replaces multiple competing state management systems with a single,
 * predictable source of truth that prioritizes optimistic updates for instant UI feedback.
 */

import { configureStore } from '@reduxjs/toolkit'
import { persistStore, persistReducer } from 'redux-persist'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { combineReducers } from '@reduxjs/toolkit'

// Import slices
import notebooksSlice from './slices/notebooksSlice'
import streakSlice from './slices/streakSlice'
import progressSlice from './slices/progressSlice'
import syncSlice from './slices/syncSlice'

// Persist configuration for instant app startup
const persistConfig = {
  key: 'goldlist-root',
  storage: AsyncStorage,
  whitelist: ['notebooks', 'streak', 'progress'], // Only persist core data
  blacklist: ['sync'], // Don't persist sync state
}

const rootReducer = combineReducers({
  notebooks: notebooksSlice.reducer,
  streak: streakSlice.reducer,
  progress: progressSlice.reducer,
  sync: syncSlice.reducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Enhanced hooks with type safety
import { useDispatch, useSelector } from 'react-redux'
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector)