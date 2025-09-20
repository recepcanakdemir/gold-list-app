import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="goldlist-intro" />
      <Stack.Screen name="goldlist-method" />
      <Stack.Screen name="goldlist-rounds" />
      <Stack.Screen name="tutorial-overview" />
      <Stack.Screen name="tutorial-input" />
      <Stack.Screen name="tutorial-review" />
      <Stack.Screen name="tutorial-progress" />
      <Stack.Screen name="customization" />
      <Stack.Screen name="review-request" />
      <Stack.Screen name="paywall" />
    </Stack>
  )
}