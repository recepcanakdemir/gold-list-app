import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { AppProvider } from '@/lib/contexts/AppContext';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import { DevTimeProvider } from '@/lib/contexts/DevTimeContext';
import { DevTimeConnector } from '@/components/DevTimeConnector';
import AuthGuard from '@/components/AuthGuard';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DevTimeProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppProvider>
              <AppWithTheme />
            </AppProvider>
          </AuthProvider>
        </ThemeProvider>
      </DevTimeProvider>
    </GestureHandlerRootView>
  );
}

function AppWithTheme() {
  const { isDark } = require('@/lib/contexts/ThemeContext').useTheme();
  
  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <DevTimeConnector />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
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
              presentation: 'card'
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
            name="word-save/index" 
            options={{ 
              headerShown: false,
              presentation: 'card'
            }} 
          />
          <Stack.Screen 
            name="modal/notebook-menu" 
            options={{ 
              title: 'Notebook Options',
              presentation: 'modal'
            }} 
          />
        </Stack>
      </AuthGuard>
      <StatusBar style="auto" />
    </NavigationThemeProvider>
  );
}
