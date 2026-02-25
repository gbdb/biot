import { Stack } from 'expo-router';

export default function SpecimensLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1a3c27' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="nearby" options={{ title: 'Spécimens à proximité' }} />
    </Stack>
  );
}
