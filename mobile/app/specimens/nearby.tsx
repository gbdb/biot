import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { getSpecimensNearby } from '@/api/client';
import type { SpecimenList } from '@/types/api';

export default function SpecimensNearbyScreen() {
  const router = useRouter();
  const [specimens, setSpecimens] = useState<SpecimenList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNearby = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Autorisez l\'accès à la position pour voir les spécimens à proximité.');
        setSpecimens([]);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const list = await getSpecimensNearby({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        radius: 1000,
        limit: 50,
      });
      setSpecimens(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d\'obtenir les spécimens à proximité.');
      setSpecimens([]);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading && specimens.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
        <Text style={styles.loadingText}>Localisation en cours...</Text>
      </View>
    );
  }

  if (error && specimens.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="location-outline" size={48} color="#999" />
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchNearby}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={specimens}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchNearby} colors={['#1a3c27']} />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucun spécimen avec coordonnées GPS à proximité.</Text>
          <Text style={styles.emptyHint}>
            Ajoutez des coordonnées lors de la création ou via « Revalider les coordonnées GPS » sur
            la fiche spécimen.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/specimen/${item.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.cardRow}>
            {item.photo_principale_url ? (
              <Image
                source={{ uri: item.photo_principale_url }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Text style={styles.cardImagePlaceholderText}>📍</Text>
              </View>
            )}
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.nom}</Text>
              <Text style={styles.cardSubtitle}>{item.organisme_nom}</Text>
              {item.distance_km != null && (
                <Text style={styles.cardDistance}>
                  {item.distance_km < 0.1
                    ? `${Math.round(item.distance_km * 1000)} m`
                    : `${item.distance_km.toFixed(2)} km`}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
  cardImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImagePlaceholderText: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4a6741',
    marginTop: 2,
  },
  cardDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  error: {
    color: '#c44',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#1a3c27',
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
