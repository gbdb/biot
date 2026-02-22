import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { getGardens } from '@/api/client';
import type { GardenMinimal } from '@/types/api';

export default function GardensScreen() {
  const router = useRouter();
  const [gardens, setGardens] = useState<GardenMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGardens()
      .then(setGardens)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={gardens}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/garden/${item.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>{item.nom}</Text>
          <Text style={styles.cardSubtitle}>
            {[item.ville, item.adresse].filter(Boolean).join(' — ') || '—'}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4a6741',
    marginTop: 4,
  },
  error: {
    color: '#c44',
    fontSize: 16,
  },
});
