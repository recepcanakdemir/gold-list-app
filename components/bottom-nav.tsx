import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { IconSymbol } from '@/components/ui/icon-symbol'
import { TYPOGRAPHY, SPACING } from '@/lib/constants/design'
import { useTheme } from '@/lib/contexts/ThemeContext'

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const { colors } = useTheme()
  const styles = createStyles(colors)

  const tabs = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'chart.bar.fill',
      action: 'navigate',
    },
    {
      name: 'Home',
      path: '/',
      icon: 'house.fill',
      action: 'navigate',
    },
    {
      name: 'Profile',
      path: '/modal/settings',
      icon: 'person.fill',
      action: 'modal',
    },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/' || pathname === ''
    }
    // Modal paths are never "active" since they overlay
    if (path.startsWith('/modal/')) {
      return false
    }
    return pathname.startsWith(path)
  }

  const handleTabPress = (tab: any) => {
    if (tab.action === 'modal') {
      router.push(tab.path)
    } else {
      router.push(tab.path)
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map((tab) => {
        const active = isActive(tab.path)
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => handleTabPress(tab)}
          >
            <IconSymbol
              size={24}
              name={tab.icon as any}
              color={active ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                active ? styles.tabTextActive : styles.tabTextInactive
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },
})