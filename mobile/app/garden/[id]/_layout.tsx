import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function GardenIdLayout() {
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
        name="specimens"
        options={{
          title: 'Spécimens',
          tabBarLabel: 'Spécimens',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jardin',
          tabBarLabel: 'Infos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="terrain"
        options={{
          title: 'Terrain 3D',
          tabBarLabel: '3D',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="layers-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gcp-create"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
