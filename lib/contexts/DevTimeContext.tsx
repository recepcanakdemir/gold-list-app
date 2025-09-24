import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabaseService } from '@/lib/services/supabaseService'

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
      if (saved) {
        const { isActive, startTime, simulatedDay } = JSON.parse(saved)
        setIsSimulationActive(isActive)
        setSimulationStartTime(new Date(startTime))
        setCurrentSimulatedDay(simulatedDay || 0)
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
        simulatedDay
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
        await supabaseService.getTodaysPage(notebook.id, newDay)
      }
    } catch (error) {
      console.warn('⚠️ Error during auto-page creation:', error)
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
    return currentSimulatedDay
  }

  const getCurrentDate = (): Date => {
    if (!isSimulationActive) {
      return new Date()
    }
    
    const simulatedDate = new Date(simulationStartTime)
    simulatedDate.setDate(simulatedDate.getDate() + currentSimulatedDay)
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
      registerDayChangeCallback
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