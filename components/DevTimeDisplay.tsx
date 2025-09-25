import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useDevTime } from '@/lib/contexts/DevTimeContext'
import { useTheme } from '@/lib/contexts/ThemeContext'
import { TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/constants/design'

export function DevTimeDisplay() {
  const { colors } = useTheme()
  const { 
    isSimulationActive, 
    currentSimulatedDay,
    getCurrentDate, 
    startSimulation, 
    stopSimulation,
    nextDay,
    previousDay,
    getSimulatedDaysElapsed 
  } = useDevTime()
  
  const [currentTime, setCurrentTime] = useState(getCurrentDate())
  const [isAdvancing, setIsAdvancing] = useState(false)

  useEffect(() => {
    setCurrentTime(getCurrentDate())
  }, [getCurrentDate, currentSimulatedDay])

  const styles = createStyles(colors)

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleNextDay = async () => {
    if (isAdvancing) return
    
    setIsAdvancing(true)
    console.log('⏳ Day advancing... Please wait')
    
    try {
      await nextDay()
      // Add a small delay to let React process the updates
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error('Error advancing day:', error)
    } finally {
      setIsAdvancing(false)
      console.log('✅ Day advance completed')
    }
  }

  const handleBulkAdvance = async (days: number) => {
    if (isAdvancing) return
    
    setIsAdvancing(true)
    console.log(`⏳ Advancing ${days} days... Please wait`)
    
    try {
      for (let i = 0; i < days; i++) {
        await nextDay()
        // Small delay between each day to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      // Final delay to let React process all updates
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Error advancing ${days} days:`, error)
    } finally {
      setIsAdvancing(false)
      console.log(`✅ Successfully advanced ${days} days`)
    }
  }

  const handlePreviousDay = async () => {
    if (isAdvancing) return
    
    setIsAdvancing(true)
    console.log('⏳ Day going back... Please wait')
    
    try {
      await previousDay()
      // Add a small delay to let React process the updates
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error('Error going back day:', error)
    } finally {
      setIsAdvancing(false)
      console.log('✅ Day change completed')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.timeDisplay}>
        <Text style={styles.label}>
          {isSimulationActive ? '⚡ Simulated Time' : '🕐 Real Time'}
        </Text>
        <Text style={styles.date}>{formatDate(currentTime)}</Text>
        <Text style={styles.time}>{formatTime(currentTime)}</Text>
        {isSimulationActive && (
          <Text style={styles.elapsed}>
            {isAdvancing ? '⏳ Loading Day...' : `Day ${currentSimulatedDay} of simulation`}
          </Text>
        )}
      </View>

      {isSimulationActive ? (
        <>
          {/* Day Navigation */}
          <View style={styles.dayNavigation}>
            <TouchableOpacity 
              style={[styles.navButton, { opacity: currentSimulatedDay === 1 || isAdvancing ? 0.3 : 1 }]}
              onPress={() => handlePreviousDay()}
              disabled={currentSimulatedDay === 1 || isAdvancing}
            >
              <Text style={styles.navButtonText}>{isAdvancing ? '⏳ Loading...' : '◀ Previous Day'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, { opacity: isAdvancing ? 0.3 : 1 }]}
              onPress={() => handleNextDay()}
              disabled={isAdvancing}
            >
              <Text style={styles.navButtonText}>{isAdvancing ? '⏳ Loading...' : 'Next Day ▶'}</Text>
            </TouchableOpacity>
          </View>

          {/* Bulk Day Controls */}
          <View style={styles.bulkControls}>
            <Text style={styles.bulkLabel}>Quick Jump:</Text>
            <View style={styles.bulkButtons}>
              <TouchableOpacity 
                style={[styles.bulkButton, { opacity: isAdvancing ? 0.3 : 1 }]}
                onPress={() => handleBulkAdvance(7)}
                disabled={isAdvancing}
              >
                <Text style={styles.bulkButtonText}>{isAdvancing ? '⏳' : '+7 days'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.bulkButton, { opacity: isAdvancing ? 0.3 : 1 }]}
                onPress={() => handleBulkAdvance(14)}
                disabled={isAdvancing}
              >
                <Text style={styles.bulkButtonText}>{isAdvancing ? '⏳' : '+14 days'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stop Button */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.error }]}
            onPress={stopSimulation}
          >
            <Text style={styles.buttonText}>⏹️ Stop Simulation</Text>
          </TouchableOpacity>

          <Text style={styles.info}>
            Navigate days to test review functionality
          </Text>
        </>
      ) : (
        <>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={startSimulation}
          >
            <Text style={styles.buttonText}>▶️ Start Day Simulation</Text>
          </TouchableOpacity>
          
          <Text style={styles.info}>
            Start simulation to navigate between days for testing
          </Text>
        </>
      )}
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 2,
    borderColor: colors.primary + '20', // 20% opacity
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
    marginBottom: SPACING.xs,
  },
  date: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
    marginBottom: SPACING.xs,
  },
  time: {
    fontSize: TYPOGRAPHY.base,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  elapsed: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.primary,
    marginTop: SPACING.xs,
    fontWeight: TYPOGRAPHY.medium,
  },
  button: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  buttonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.cardBackground,
  },
  info: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dayNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  navButton: {
    flex: 1,
    backgroundColor: colors.primary + '20',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  navButtonText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.primary,
  },
  bulkControls: {
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  bulkLabel: {
    fontSize: TYPOGRAPHY.sm,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: TYPOGRAPHY.medium,
  },
  bulkButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  bulkButton: {
    backgroundColor: colors.secondary + '20',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary,
    minWidth: 80,
  },
  bulkButtonText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.medium,
    color: colors.secondary,
  },
})