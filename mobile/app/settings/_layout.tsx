import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a3c27' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Paramètres' }} />
      <Stack.Screen name="profile" options={{ title: 'Modifier mon profil' }} />
      <Stack.Screen name="password" options={{ title: 'Changer le mot de passe' }} />
      <Stack.Screen name="users" options={{ title: 'Utilisateurs — mettre admin' }} />
    </Stack>
  );
}
