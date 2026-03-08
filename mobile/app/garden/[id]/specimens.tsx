import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getSpecimens } from '@/api/client';
import { SPECIMEN_STATUT_EMOJI } from '@/types/api';
import type { SpecimenList, SpecimenStatut } from '@/types/api';

export default function GardenSpecimensScreen() {
  const { id: gardenId } = useLocalSearchParams<{ id: string }>();
  const [specimens, setSpecimens] = useState<SpecimenList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gardenId) return;
    const numId = parseInt(gardenId, 10);
    if (isNaN(numId)) return;
    getSpecimens({ garden: numId, page_size: 200 })
      .then(setSpecimens)
      .catch(() => setSpecimens([]))
      .finally(() => setLoading(false));
  }, [gardenId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={specimens}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push(`/specimen/${item.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{SPECIMEN_STATUT_EMOJI[item.statut as SpecimenStatut] ?? '🌱'}</Text>
            <View style={styles.textBlock}>
              <Text style={styles.nom}>{item.nom}</Text>
              <Text style={styles.org}>{item.organisme_nom}</Text>
            </View>
            <Text style={styles.badge}>{item.statut}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  emoji: { fontSize: 24, marginRight: 12 },
  textBlock: { flex: 1 },
  nom: { fontSize: 16, fontWeight: '600', color: '#1a3c27' },
  org: { fontSize: 13, color: '#666', marginTop: 2 },
  badge: { fontSize: 11, color: '#888', textTransform: 'capitalize' },
});
