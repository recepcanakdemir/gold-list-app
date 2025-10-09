import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { TYPOGRAPHY, SPACING } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'

interface SharedHeaderProps {
  title: string
  showBackButton?: boolean
  showMenuButton?: boolean
  onMenuPress?: () => void
}

export function SharedHeader({ title, showBackButton = false, showMenuButton = false, onMenuPress }: SharedHeaderProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <View style={styles.header}>
      {showBackButton ? (
        <>
          <TouchableOpacity onPress={() => {
            if (router.canGoBack()) {
              router.back()
            } else {
              router.push('/(tabs)/')
            }
          }} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.centerTitle}>
            <Text style={styles.pageTitle}>{title}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.logo}>{title}</Text>
      )}
      
      <View style={styles.headerRight}>
        <View style={styles.streakContainer}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakCount}>{profile?.streak_count || 0}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton} onPress={() => router.push('/modal/notifications')}>
          <View style={styles.notificationIcon}>
            <Text style={styles.notificationIconText}>🔔</Text>
          </View>
        </TouchableOpacity>
        {showMenuButton && (
          <TouchableOpacity style={styles.menuButton} onPress={onMenuPress}>
            <Text style={styles.menuButtonText}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  logo: {
    fontSize: TYPOGRAPHY['2xl'],
    fontWeight: TYPOGRAPHY.bold,
    color: colors.textPrimary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.xl,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  streakIcon: {
    fontSize: TYPOGRAPHY.lg,
  },
  streakCount: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.primary,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIconText: {
    fontSize: TYPOGRAPHY.lg,
  },
  centerTitle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  pageTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: colors.textPrimary,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: TYPOGRAPHY['2xl'],
    color: colors.textPrimary,
    fontWeight: TYPOGRAPHY.bold,
    textAlign: 'center',
    lineHeight: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    marginTop: 4,
  },
})