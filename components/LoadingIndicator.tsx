import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated } from 'react-native'
import { useTheme } from '@/lib/contexts/ThemeContext'

interface LoadingIndicatorProps {
  size?: number
  color?: string
  thickness?: number
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 20,
  color,
  thickness = 2
}) => {
  const { colors } = useTheme()
  const spinValue = useRef(new Animated.Value(0)).current
  
  const indicatorColor = color || colors.cardBackground

  useEffect(() => {
    const spin = () => {
      spinValue.setValue(0)
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => spin())
    }
    spin()
  }, [spinValue])

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderColor: indicatorColor + '30', // 30% opacity for background
            borderTopColor: indicatorColor, // Full opacity for spinning part
            transform: [{ rotate: spin }],
          },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    // Border creates the circular loading effect
  },
})