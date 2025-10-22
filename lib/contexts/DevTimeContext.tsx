import { supabaseService } from '@/lib/services/supabaseService'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

interface DevTimeContextType {
  isSimulationActive: boolean
  currentSimulatedDay: number
  getCurrentDate: () => Date
  startSimulation: () => void
  stopSimulation: () => void
  nextDay: () => void
  previousDay: () => void
  getSimulatedDaysElapsed: () => number
  registerDayChangeCallback: (callback: () => void) => () => void
  clearSimulationState: () => Promise<void>
}

const DevTimeContext = createContext<DevTimeContextType | null>(null)

export function DevTimeProvider({ children }: { children: React.ReactNode }) {
  const [isSimulationActive, setIsSimulationActive] = useState(false)
  const [simulationStartTime, setSimulationStartTime] = useState(new Date())
  const [currentSimulatedDay, setCurrentSimulatedDay] = useState(0)

  // Load simulation state on mount
  useEffect(() => {
    loadSimulationState()
  }, [])

  const loadSimulationState = async () => {
    try {
      const saved = await AsyncStorage.getItem('devTimeSimulation')
      console.log('🔍 LOADED STATE DEBUG:', saved) // One-time debug
      if (saved) {
        const { isActive, startTime, simulatedDay, version } = JSON.parse(saved)
        console.log(`🔍 PARSED STATE: version=${version}, simulatedDay=${simulatedDay}`) // One-time debug
        setIsSimulationActive(isActive)
        setSimulationStartTime(new Date(startTime))
        
        // Fix for Day 16 vs Day 15 issue: subtract 1 from saved state
        // If simulatedDay=15 in storage, we want currentSimulatedDay=14 to display as "Day 15"
        const correctedDay = Math.max(0, (simulatedDay || 1) - 1)
        console.log(`🔄 Correcting simulation day from ${simulatedDay} to ${correctedDay} (Day ${correctedDay + 1} display)`)
        setCurrentSimulatedDay(correctedDay)
        // Save corrected state immediately
        await saveSimulationState(isActive, new Date(startTime), correctedDay)
      }
    } catch (error) {
      console.error('Error loading simulation state:', error)
    }
  }

  const saveSimulationState = async (isActive: boolean, startTime: Date, simulatedDay: number) => {
    try {
      await AsyncStorage.setItem('devTimeSimulation', JSON.stringify({
        isActive,
        startTime: startTime.toISOString(),
        simulatedDay,
        version: 2 // Track format version for future migrations
      }))
    } catch (error) {
      console.error('Error saving simulation state:', error)
    }
  }

  const startSimulation = () => {
    const now = new Date()
    setIsSimulationActive(true)
    setSimulationStartTime(now)
    setCurrentSimulatedDay(0)
    saveSimulationState(true, now, 0)
  }

  const stopSimulation = () => {
    setIsSimulationActive(false)
    saveSimulationState(false, simulationStartTime, currentSimulatedDay)
  }

  const clearSimulationState = async () => {
    try {
      await AsyncStorage.removeItem('devTimeSimulation')
      setIsSimulationActive(false)
      setCurrentSimulatedDay(0)
      setSimulationStartTime(new Date())
      console.log('🧹 Simulation state cleared')
    } catch (error) {
      console.error('Error clearing simulation state:', error)
    }
  }

  const dayChangeCallbacksRef = useRef<Array<() => void>>([])

  const registerDayChangeCallback = useCallback((callback: () => void) => {
    dayChangeCallbacksRef.current = [...dayChangeCallbacksRef.current, callback]
    return () => {
      dayChangeCallbacksRef.current = dayChangeCallbacksRef.current.filter(cb => cb !== callback)
    }
  }, [])

  const nextDay = async () => {
    const oldDay = currentSimulatedDay
    const newDay = currentSimulatedDay + 1
    setCurrentSimulatedDay(newDay)
    saveSimulationState(isSimulationActive, simulationStartTime, newDay)
    
    console.log(`🚀 Day advanced from ${oldDay} to ${newDay}`)
    
    // Auto-create pages for all active notebooks when simulation advances
    try {
      // Get all user's active notebooks
      const notebooks = await supabaseService.getNotebooks()
      
      for (const notebook of notebooks) {
        // Try to get today's page for each notebook - this will auto-create if needed
        await supabaseService.getTodaysPage(notebook.id)
      }
    } catch (error) {
      console.warn('⚠️ Error during auto-page creation:', error)
    }

    // Validate daily streaks when simulation advances 
    try {
      console.log(`🔥 DevTime: Attempting daily streak validation for day ${newDay}`)
      // Use a global window function to avoid circular dependency
      if (typeof window !== 'undefined' && (window as any).validateDailyStreak) {
        console.log(`🔥 DevTime: Global validateDailyStreak function found, calling it`)
        await (window as any).validateDailyStreak(getCurrentDate())
        console.log(`🔥 DevTime: Daily streak validation completed`)
      } else {
        console.warn(`🔥 DevTime: Global validateDailyStreak function NOT found`)
      }
    } catch (error) {
      console.warn('⚠️ Error during streak validation:', error)
    }

    // Notify registered callbacks about day change
    dayChangeCallbacksRef.current.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Error in day change callback:', error)
      }
    })
  }

  const previousDay = async () => {
    const oldDay = currentSimulatedDay
    const newDay = Math.max(0, currentSimulatedDay - 1)
    setCurrentSimulatedDay(newDay)
    saveSimulationState(isSimulationActive, simulationStartTime, newDay)
    
    console.log(`🔙 Day moved back from ${oldDay} to ${newDay}`)
  }


  const getSimulatedDaysElapsed = (): number => {
    return currentSimulatedDay + 1
  }

  const getCurrentDate = (): Date => {
    if (!isSimulationActive) {
      const realDate = new Date()
      console.log(`🕰️ DevTime: Using real date: ${realDate.toISOString()}`)
      return realDate
    }
    
    // Calculate simulation date based on start time and current day
    const simulatedDate = new Date(simulationStartTime)
    simulatedDate.setHours(0, 0, 0, 0)
    
    // For Day 1 words to be reviewed on Day 15, we need:
    // currentSimulatedDay = 0 → Day 1 → simulationStartTime + 0 days
    // currentSimulatedDay = 14 → Day 15 → simulationStartTime + 14 days  
    // So the offset should be currentSimulatedDay
    const dayOffset = currentSimulatedDay
    simulatedDate.setDate(simulatedDate.getDate() + dayOffset)
    
    //console.log(`🕰️ DevTime: Simulation active, day ${currentSimulatedDay}, returning: ${simulatedDate.toISOString()}`)
    
    return simulatedDate
  }

  return (
    <DevTimeContext.Provider value={{
      isSimulationActive,
      currentSimulatedDay,
      getCurrentDate,
      startSimulation,
      stopSimulation,
      nextDay,
      previousDay,
      getSimulatedDaysElapsed,
      registerDayChangeCallback,
      clearSimulationState
    }}>
      {children}
    </DevTimeContext.Provider>
  )
}

export function useDevTime() {
  const context = useContext(DevTimeContext)
  if (!context) {
    throw new Error('useDevTime must be used within DevTimeProvider')
  }
  return context
}