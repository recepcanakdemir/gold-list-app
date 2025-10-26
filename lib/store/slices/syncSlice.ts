/**
 * Sync Slice - Background Sync Queue Management
 * 
 * Manages background database operations with retry logic and conflict resolution.
 * Ensures data consistency between optimistic updates and database state.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'

interface SyncOperation {
  id: string
  type: 'addWords' | 'completeReview' | 'recordActivity' | 'updateNotebook'
  data: any
  timestamp: number
  retryCount: number
  maxRetries: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface SyncState {
  // Sync queue
  pendingOperations: SyncOperation[]
  processingOperations: SyncOperation[]
  failedOperations: SyncOperation[]
  
  // Sync status
  isOnline: boolean
  isSyncing: boolean
  lastSyncTime: number
  syncErrors: string[]
  
  // Performance metrics
  totalOperations: number
  successfulOperations: number
  failedOperationsCount: number
}

const initialState: SyncState = {
  pendingOperations: [],
  processingOperations: [],
  failedOperations: [],
  isOnline: true,
  isSyncing: false,
  lastSyncTime: 0,
  syncErrors: [],
  totalOperations: 0,
  successfulOperations: 0,
  failedOperationsCount: 0,
}

// Generate unique ID for sync operations
const generateSyncId = () => `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Async thunk for processing sync operations
export const processSyncQueue = createAsyncThunk(
  'sync/processSyncQueue',
  async (_, { getState, dispatch }) => {
    const state = getState() as any
    const pendingOps = state.sync.pendingOperations

    if (pendingOps.length === 0) {
      return { processed: 0, failed: 0 }
    }

    let processed = 0
    let failed = 0

    // Process operations in batches to avoid overwhelming the database
    const batchSize = 3
    for (let i = 0; i < pendingOps.length; i += batchSize) {
      const batch = pendingOps.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (operation: SyncOperation) => {
        try {
          dispatch(markOperationAsProcessing(operation.id))
          
          // Import services here to avoid circular dependencies
          const { supabaseService } = await import('@/lib/services/supabaseService')
          
          // Execute the operation based on type
          switch (operation.type) {
            case 'addWords':
              await supabaseService.addWords(operation.data.pageId, operation.data.words)
              break
              
            case 'completeReview':
              await supabaseService.updateWordReviewResult(
                operation.data.wordId,
                operation.data.result,
                operation.data.round
              )
              break
              
            case 'recordActivity':
              await supabaseService.recordUserActivity()
              break
              
            case 'updateNotebook':
              await supabaseService.updateNotebookStats(
                operation.data.notebookId,
                operation.data.stats
              )
              break
              
            default:
              throw new Error(`Unknown operation type: ${operation.type}`)
          }
          
          dispatch(markOperationAsCompleted(operation.id))
          processed++
          
        } catch (error: any) {
          console.error(`Sync operation failed: ${operation.type}`, error)
          dispatch(markOperationAsFailed({ 
            id: operation.id, 
            error: error.message 
          }))
          failed++
        }
      })
      
      // Wait for batch to complete before processing next batch
      await Promise.allSettled(batchPromises)
      
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < pendingOps.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return { processed, failed }
  }
)

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    // Add operation to sync queue
    addSyncOperation: (state, action: PayloadAction<Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>>) => {
      const operation: SyncOperation = {
        ...action.payload,
        id: generateSyncId(),
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      }
      
      state.pendingOperations.push(operation)
      state.totalOperations++
    },

    // Mark operation as processing
    markOperationAsProcessing: (state, action: PayloadAction<string>) => {
      const operationId = action.payload
      const pendingIndex = state.pendingOperations.findIndex(op => op.id === operationId)
      
      if (pendingIndex >= 0) {
        const operation = state.pendingOperations[pendingIndex]
        operation.status = 'processing'
        state.processingOperations.push(operation)
        state.pendingOperations.splice(pendingIndex, 1)
      }
    },

    // Mark operation as completed
    markOperationAsCompleted: (state, action: PayloadAction<string>) => {
      const operationId = action.payload
      const processingIndex = state.processingOperations.findIndex(op => op.id === operationId)
      
      if (processingIndex >= 0) {
        state.processingOperations.splice(processingIndex, 1)
        state.successfulOperations++
        state.lastSyncTime = Date.now()
      }
    },

    // Mark operation as failed
    markOperationAsFailed: (state, action: PayloadAction<{ id: string; error: string }>) => {
      const { id: operationId, error } = action.payload
      const processingIndex = state.processingOperations.findIndex(op => op.id === operationId)
      
      if (processingIndex >= 0) {
        const operation = state.processingOperations[processingIndex]
        operation.status = 'failed'
        operation.retryCount++
        
        // Move to failed operations or back to pending for retry
        if (operation.retryCount >= operation.maxRetries) {
          state.failedOperations.push(operation)
          state.failedOperationsCount++
          state.syncErrors.push(`${operation.type}: ${error}`)
        } else {
          // Retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, operation.retryCount), 30000)
          setTimeout(() => {
            // This would need to be handled by the calling component
            // For now, just move back to pending
          }, delay)
          
          operation.status = 'pending'
          state.pendingOperations.push(operation)
        }
        
        state.processingOperations.splice(processingIndex, 1)
      }
    },

    // Retry failed operations
    retryFailedOperations: (state) => {
      state.failedOperations.forEach(operation => {
        operation.status = 'pending'
        operation.retryCount = 0
        state.pendingOperations.push(operation)
      })
      state.failedOperations = []
      state.syncErrors = []
    },

    // Clear completed sync errors
    clearSyncErrors: (state) => {
      state.syncErrors = []
    },

    // Update online status
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
      
      // If back online, start processing queue
      if (action.payload && state.pendingOperations.length > 0) {
        // This would trigger processSyncQueue in the component
      }
    },

    // Set syncing status
    setSyncingStatus: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload
    },

    // Clear all sync state (for logout/reset)
    clearSyncState: () => initialState,

    // Remove specific operation from queue (for cancellation)
    removeOperation: (state, action: PayloadAction<string>) => {
      const operationId = action.payload
      
      state.pendingOperations = state.pendingOperations.filter(op => op.id !== operationId)
      state.processingOperations = state.processingOperations.filter(op => op.id !== operationId)
      state.failedOperations = state.failedOperations.filter(op => op.id !== operationId)
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(processSyncQueue.pending, (state) => {
        state.isSyncing = true
      })
      .addCase(processSyncQueue.fulfilled, (state, action) => {
        state.isSyncing = false
        state.lastSyncTime = Date.now()
        
        // Log sync results
        const { processed, failed } = action.payload
        console.log(`✅ Sync completed: ${processed} processed, ${failed} failed`)
      })
      .addCase(processSyncQueue.rejected, (state, action) => {
        state.isSyncing = false
        state.syncErrors.push(`Sync queue processing failed: ${action.error.message}`)
      })
  },
})

export const {
  addSyncOperation,
  markOperationAsProcessing,
  markOperationAsCompleted,
  markOperationAsFailed,
  retryFailedOperations,
  clearSyncErrors,
  setOnlineStatus,
  setSyncingStatus,
  clearSyncState,
  removeOperation,
} = syncSlice.actions

export default syncSlice