import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTheme } from '@/lib/contexts/ThemeContext';

import DashboardScreen from './dashboard';
import HomeScreen from './index';
import SettingsScreen from './settings';

const { width } = Dimensions.get('window');

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const pagerRef = useRef<PagerView>(null);
  const [currentPage, setCurrentPage] = useState(1); // Start with Home (index 1)
  
  const tabs = [
    { key: 'dashboard', title: 'Dashboard', icon: 'chart.bar.fill', component: DashboardScreen },
    { key: 'index', title: 'Home', icon: 'house.fill', component: HomeScreen },
    { key: 'settings', title: 'Settings', icon: 'gearshape.fill', component: SettingsScreen },
  ];

  const handleTabPress = (index: number) => {
    pagerRef.current?.setPage(index);
    setCurrentPage(index);
  };

  const handlePageSelected = (e: any) => {
    setCurrentPage(e.nativeEvent.position);
  };

  const styles = createStyles(colors, insets);

  return (
    <View style={styles.container}>
      <View style={styles.safeContainer}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={1}
          onPageSelected={handlePageSelected}
        >
          {tabs.map((tab, index) => (
            <View key={tab.key} style={styles.page}>
              <tab.component />
            </View>
          ))}
        </PagerView>
      </View>
      
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabButton}
            onPress={() => handleTabPress(index)}
          >
            <IconSymbol
              size={24}
              name={tab.icon}
              color={currentPage === index ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: currentPage === index ? colors.primary : colors.textSecondary }
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeContainer: {
    flex: 1,
    paddingTop: insets.top,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    width: width,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 60 + insets.bottom,
    paddingBottom: Math.max(insets.bottom, 8),
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
