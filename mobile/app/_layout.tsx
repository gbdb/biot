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
          name="specimen/[id]"
          options={{ title: 'Fiche spécimen' }}
        />
        <Stack.Screen
          name="garden/[id]"
          options={{ title: 'Détail jardin' }}
        />
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
