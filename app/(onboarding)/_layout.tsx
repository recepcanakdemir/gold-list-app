import { Stack } from 'expo-router'

export default function OnboardingLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="learn-science" />
      <Stack.Screen name="structured-progress" />
      <Stack.Screen name="track-grow" />
      <Stack.Screen name="science-behind" />
      <Stack.Screen name="step-1-add" />
      <Stack.Screen name="step-2-wait" />
      <Stack.Screen name="step-3-review" />
      <Stack.Screen name="step-4-rounds" />
      <Stack.Screen name="step-5-focus" />
      <Stack.Screen name="personalization" />
      <Stack.Screen name="survey" />
      <Stack.Screen name="loading" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="roadmap" />
      <Stack.Screen name="save-journey" />
      <Stack.Screen name="completion" />
    </Stack>
  )
}