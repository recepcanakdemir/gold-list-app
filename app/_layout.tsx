import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { AppProvider } from '@/lib/contexts/AppContext';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import AuthGuard from '@/components/AuthGuard';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <AppWithTheme />
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function AppWithTheme() {
  const { isDark } = require('@/lib/contexts/ThemeContext').useTheme();
  
  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="notebook/[id]/index" 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          <Stack.Screen 
            name="notebook/[id]/input" 
            options={{ 
              headerShown: false,
              presentation: 'modal'
            }} 
          />
          <Stack.Screen 
            name="notebook/[id]/review" 
            options={{ 
              title: 'Review',
              headerShown: false,
              presentation: 'fullScreenModal'
            }} 
          />
          <Stack.Screen 
            name="modal/paywall" 
            options={{ 
              title: 'Upgrade',
              presentation: 'modal'
            }} 
          />
          <Stack.Screen 
            name="modal/settings" 
            options={{ 
              title: 'Settings',
              presentation: 'modal'
            }} 
          />
        </Stack>
      </AuthGuard>
      <StatusBar style="auto" />
    </NavigationThemeProvider>
  );
}
