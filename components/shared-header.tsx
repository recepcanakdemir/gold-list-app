import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/lib/contexts/AuthContext'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { useProgressManager } from '@/lib/hooks/useProgressManager'
import { TYPOGRAPHY, SPACING, RADIUS } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'

interface SharedHeaderProps {
  title: string
  showBackButton?: boolean
  showMenuButton?: boolean
  onMenuPress?: () => void
  showSettingsButton?: boolean
}

export function SharedHeader({ 
  title, 
  showBackButton = false, 
  showMenuButton = false, 
  onMenuPress, 
  showSettingsButton = false 
}: SharedHeaderProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const { subscription, showPaywallModal } = useSubscription()
  const { state: progressState } = useProgressManager()
  const { colors } = useTheme()
  const styles = createStyles(colors)

  // Use ProgressManager as primary source, profile as fallback for consistency
  const currentStreak = progressState.streakCount !== undefined ? progressState.streakCount : (profile?.streak_count || 0)

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image 
          source={require('@/images/gold_list_icon.png')} 
          style={styles.appIcon}
          resizeMode="contain"
        />
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
            <Text style={styles.pageTitle}>{title}</Text>
          </>
        ) : (
          <Text style={styles.logo}>{title}</Text>
        )}
      </View>
      
      <View style={styles.headerRight}>
        <View style={styles.streakContainer}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakCount}>{currentStreak}</Text>
        </View>
        {showSettingsButton && (
          <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/(tabs)/settings')}>
            <View style={styles.settingsIcon}>
              <Text style={styles.settingsIconText}>⚙️</Text>
            </View>
          </TouchableOpacity>
        )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  appIcon: {
    width: 28,
    height: 28,
    marginRight: SPACING.sm,
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
    marginRight: SPACING.sm,
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
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIconText: {
    fontSize: TYPOGRAPHY.lg,
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
  
  // Subscription Badge Styles
  subscriptionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
  },
  premiumBadge: {
    backgroundColor: colors.primary,
  },
  freeBadge: {
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subscriptionText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.semibold,
  },
  premiumText: {
    color: colors.white,
  },
  freeText: {
    color: colors.textSecondary,
  },
})