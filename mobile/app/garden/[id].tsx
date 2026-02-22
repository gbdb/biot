import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { getGarden } from '@/api/client';
import type { GardenMinimal } from '@/types/api';

export default function GardenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [garden, setGarden] = useState<GardenMinimal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      setError('ID invalide');
      setLoading(false);
      return;
    }
    getGarden(numId)
      .then(setGarden)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (error || !garden) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error || 'Jardin introuvable'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{garden.nom}</Text>
      {(garden.ville || garden.adresse) && (
        <Text style={styles.subtitle}>
          {[garden.ville, garden.adresse].filter(Boolean).join(' — ')}
        </Text>
      )}
      {garden.latitude != null && garden.longitude != null && (
        <Text style={styles.info}>
          Coordonnées : {garden.latitude.toFixed(4)}, {garden.longitude.toFixed(4)}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  content: {
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a3c27',
  },
  subtitle: {
    fontSize: 16,
    color: '#4a6741',
    marginTop: 8,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginTop: 16,
  },
  error: {
    color: '#c44',
    fontSize: 16,
  },
});
