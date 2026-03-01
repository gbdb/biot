import { View, Text, TouchableOpacity } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

function HomeHeaderRight() {
  const { logout } = useAuth();
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 4 }}>
      <TouchableOpacity
        onPress={() => router.push('/settings')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="settings-outline" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => logout()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="log-out-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function SpecimensHeaderRight() {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16, gap: 8 }}>
      <TouchableOpacity
        onPress={() => router.push('/scan')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="scan-outline" size={24} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push('/specimen/create')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={{ fontSize: 24, color: '#fff', fontWeight: '300' }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function SpeciesHeaderRight() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/species/create')}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{ marginRight: 16 }}
    >
      <Text style={{ fontSize: 24, color: '#fff', fontWeight: '300' }}>+</Text>
    </TouchableOpacity>
  );
}

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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
          headerRight: () => <HomeHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="species"
        options={{
          title: 'Espèces',
          tabBarLabel: 'Espèces',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
          headerRight: () => <SpeciesHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="specimens"
        options={{
          title: 'Spécimens',
          tabBarLabel: 'Spécimens',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flower-outline" size={size} color={color} />
          ),
          headerRight: () => <SpecimensHeaderRight />,
        }}
      />
      <Tabs.Screen
        name="gardens"
        options={{
          title: 'Jardins',
          tabBarLabel: 'Jardins',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
