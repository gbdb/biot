import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1a3c27',
        tabBarStyle: { backgroundColor: '#f5f5f0' },
        headerStyle: { backgroundColor: '#1a3c27' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarLabel: 'Accueil',
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan NFC',
          tabBarLabel: 'Scan',
        }}
      />
      <Tabs.Screen
        name="specimens"
        options={{
          title: 'Spécimens',
          tabBarLabel: 'Spécimens',
        }}
      />
      <Tabs.Screen
        name="gardens"
        options={{
          title: 'Jardins',
          tabBarLabel: 'Jardins',
        }}
      />
    </Tabs>
  );
}
