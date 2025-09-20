import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LIGHT_COLORS, DARK_COLORS } from '../constants/design'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  colors: typeof LIGHT_COLORS
  toggleTheme: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    loadTheme()
  }, [])

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('app_theme')
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme)
      }
    } catch (error) {
      console.error('Error loading theme:', error)
    }
  }

  const toggleTheme = async () => {
    try {
      const newTheme = theme === 'light' ? 'dark' : 'light'
      setTheme(newTheme)
      await AsyncStorage.setItem('app_theme', newTheme)
    } catch (error) {
      console.error('Error saving theme:', error)
    }
  }

  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS
  const isDark = theme === 'dark'

  const value: ThemeContextType = {
    theme,
    colors,
    toggleTheme,
    isDark,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}