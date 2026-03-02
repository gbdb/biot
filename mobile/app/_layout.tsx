import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function RootLayoutNav() {
  const { authenticated } = useAuth();
  const segments = useSegments();

  const isOnLogin = segments[0] === 'login';

  if (authenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f0' }}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (!authenticated && !isOnLogin) {
    return <Redirect href="/login" />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a3c27' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="specimen/create"
          options={{ title: 'Nouveau spécimen' }}
        />
        <Stack.Screen
          name="observation/quick"
          options={{ title: 'Observation rapide' }}
        />
        <Stack.Screen
          name="specimen/[id]"
          options={{ title: 'Fiche spécimen' }}
        />
        <Stack.Screen
          name="specimen/edit/[id]"
          options={{ title: 'Modifier le spécimen' }}
        />
        <Stack.Screen
          name="garden/[id]"
          options={{ title: 'Détail jardin' }}
        />
        <Stack.Screen
          name="scan"
          options={{ title: 'Scan NFC' }}
        />
        <Stack.Screen
          name="species/library"
          options={{ title: 'Bibliothèque d\'espèces' }}
        />
        <Stack.Screen
          name="species/create"
          options={{ title: 'Nouvelle espèce' }}
        />
        <Stack.Screen
          name="species/[id]"
          options={{ title: 'Fiche espèce' }}
        />
        <Stack.Screen
          name="species/edit/[id]"
          options={{ title: 'Modifier l\'espèce' }}
        />
        <Stack.Screen name="specimens" options={{ headerShown: false }} />
        <Stack.Screen name="reminders" options={{ title: 'Rappels' }} />
        <Stack.Screen name="settings" options={{ title: 'Paramètres' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web' && !isExpoGo) {
      import('react-native-nfc-manager').then(({ default: NfcManager }) => {
        NfcManager.start().catch(() => {});
      });
    }
  }, []);

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
