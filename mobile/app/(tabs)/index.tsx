import { View, Text, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌳 Jardin Biot</Text>
      <Text style={styles.subtitle}>Gestion de forêts comestibles & écosystèmes permacoles</Text>
      <Link href="/(tabs)/scan" style={styles.cta}>
        Scanner un tag NFC
      </Link>
      <Link href="/(tabs)/specimens" style={styles.link}>
        Voir les spécimens
      </Link>
      <Text style={styles.logout} onPress={handleLogout}>
        Se déconnecter
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a3c27',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#4a6741',
    marginBottom: 32,
    textAlign: 'center',
  },
  cta: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: '#1a3c27',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 200,
    textAlign: 'center',
  },
  link: {
    fontSize: 16,
    color: '#1a3c27',
  },
  logout: {
    fontSize: 14,
    color: '#666',
    marginTop: 24,
  },
});
