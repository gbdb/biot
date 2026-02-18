import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getSpecimens } from '@/api/client';
import type { SpecimenList } from '@/types/api';
import { SPECIMEN_STATUT_LABELS } from '@/types/api';

export default function SpecimensScreen() {
  const router = useRouter();
  const [specimens, setSpecimens] = useState<SpecimenList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSpecimens()
      .then(setSpecimens)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
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
      data={specimens}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/specimen/${item.id}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.cardTitle}>{item.nom}</Text>
          <Text style={styles.cardSubtitle}>{item.organisme_nom}</Text>
          <Text style={styles.cardStatut}>{SPECIMEN_STATUT_LABELS[item.statut]}</Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  cardStatut: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  error: {
    color: '#c44',
    fontSize: 16,
  },
});
