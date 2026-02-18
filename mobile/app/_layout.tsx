import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('react-native-nfc-manager').then(({ default: NfcManager }) => {
        NfcManager.start().catch(() => {});
      });
    }
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a3c27' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="specimen/[id]"
          options={{ title: 'Fiche spécimen' }}
        />
      </Stack>
    </>
  );
}
