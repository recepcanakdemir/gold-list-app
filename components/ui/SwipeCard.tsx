import React, { useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native'
import { PanGestureHandler, State } from 'react-native-gesture-handler'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25

interface SwipeCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  style?: any
  disabled?: boolean
}

export default function SwipeCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  style,
  disabled = false,
}: SwipeCardProps) {
  const translateX = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(0)).current
  const rotate = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current

  const handleGesture = (event: any) => {
    if (disabled) return

    const { translationX, translationY } = event.nativeEvent
    
    translateX.setValue(translationX)
    translateY.setValue(translationY)
    
    // Rotation based on horizontal movement
    const rotation = translationX / SCREEN_WIDTH * 30
    rotate.setValue(rotation)
    
    // Scale down slightly when dragging
    const scaleValue = 1 - Math.abs(translationX) / SCREEN_WIDTH * 0.1
    scale.setValue(scaleValue)
  }

  const handleGestureEnd = (event: any) => {
    if (disabled) return

    const { translationX, velocityX } = event.nativeEvent
    
    // Determine if swipe threshold is met
    const shouldSwipe = Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 500
    
    if (shouldSwipe) {
      const direction = translationX > 0 ? 'right' : 'left'
      
      // Animate card out
      const toX = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH
      
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: toX,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotate, {
          toValue: direction === 'right' ? 30 : -30,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (direction === 'right' && onSwipeRight) {
          onSwipeRight()
        } else if (direction === 'left' && onSwipeLeft) {
          onSwipeLeft()
        }
      })
    } else {
      // Reset card position
      resetCardPosition()
    }
  }

  const resetCardPosition = () => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
      Animated.spring(rotate, { toValue: 0, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start()
  }

  return (
    <PanGestureHandler
      onGestureEvent={handleGesture}
      onHandlerStateChange={(event: any) => {
        if (event.nativeEvent.state === State.END) {
          handleGestureEnd(event)
        }
      }}
      enabled={!disabled}
    >
      <Animated.View
        style={[
          styles.card,
          style,
          {
            transform: [
              { translateX },
              { translateY },
              { 
                rotate: rotate.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-30deg', '30deg']
                }) 
              },
              { scale }
            ]
          }
        ]}
      >
        {children}
        
        {/* Swipe indicators */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.leftIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [-SCREEN_WIDTH, -50, 0],
                outputRange: [1, 0.8, 0],
                extrapolate: 'clamp'
              })
            }
          ]}
        >
          <Text style={styles.indicatorText}>✗</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.rightIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [0, 50, SCREEN_WIDTH],
                outputRange: [0, 0.8, 1],
                extrapolate: 'clamp'
              })
            }
          ]}
        >
          <Text style={styles.indicatorText}>✓</Text>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  swipeIndicator: {
    position: 'absolute',
    top: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-20deg' }],
  },
  leftIndicator: {
    left: 20,
    backgroundColor: '#fee2e2',
    borderWidth: 3,
    borderColor: '#dc2626',
  },
  rightIndicator: {
    right: 20,
    backgroundColor: '#dcfce7',
    borderWidth: 3,
    borderColor: '#16a34a',
  },
  indicatorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
})