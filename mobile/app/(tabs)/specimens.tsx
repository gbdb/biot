import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getSpecimens, addSpecimenFavorite, removeSpecimenFavorite } from '@/api/client';
import type { SpecimenList, SpecimenStatut } from '@/types/api';
import { SPECIMEN_STATUT_LABELS } from '@/types/api';
import { SpecimenFilterBar, type FilterType } from '@/components/SpecimenFilterBar';
import { ZonePickerModal } from '@/components/ZonePickerModal';
import { SpecialPickerModal, type SpecialFilters } from '@/components/SpecialPickerModal';

type FilterState = {
  type: FilterType;
  zone?: string | null;
  sante?: number;
  statut?: SpecimenStatut;
};

export default function SpecimensScreen() {
  const router = useRouter();
  const [specimens, setSpecimens] = useState<SpecimenList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({ type: 'tous' });
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [specialModalVisible, setSpecialModalVisible] = useState(false);

  const fetchSpecimens = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: Parameters<typeof getSpecimens>[0] = {};
    if (filter.type === 'favoris') {
      params.favoris = true;
    }
    if (filter.type === 'zone' && filter.zone) {
      params.zone = filter.zone;
    }
    if (filter.type === 'special') {
      if (filter.sante != null) params.sante = filter.sante;
      if (filter.statut) params.statut = filter.statut;
    }
    getSpecimens(params)
      .then(setSpecimens)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false));
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      fetchSpecimens();
    }, [fetchSpecimens])
  );

  const handleFilterTous = () => setFilter({ type: 'tous' });
  const handleFilterFavoris = () => setFilter({ type: 'favoris' });
  const handleFilterZones = () => setZoneModalVisible(true);
  const handleFilterSpecial = () => setSpecialModalVisible(true);

  const handleZoneSelect = (zone: string) => {
    setFilter({ type: 'zone', zone });
    setZoneModalVisible(false);
  };

  const handleSpecialApply = (filters: SpecialFilters) => {
    setFilter({
      type: 'special',
      sante: filters.sante,
      statut: filters.statut,
    });
    setSpecialModalVisible(false);
  };

  const handleZoneModalClose = () => setZoneModalVisible(false);
  const handleSpecialModalClose = () => setSpecialModalVisible(false);

  const handleToggleFavori = async (item: SpecimenList) => {
    const wasFavori = item.is_favori ?? false;
    try {
      if (wasFavori) {
        await removeSpecimenFavorite(item.id);
        if (filter.type === 'favoris') {
          setSpecimens((prev) => prev.filter((s) => s.id !== item.id));
        } else {
          setSpecimens((prev) =>
            prev.map((s) => (s.id === item.id ? { ...s, is_favori: false } : s))
          );
        }
      } else {
        await addSpecimenFavorite(item.id);
        setSpecimens((prev) =>
          prev.map((s) => (s.id === item.id ? { ...s, is_favori: true } : s))
        );
      }
    } catch {
      /* ignore */
    }
  };

  const renderHeader = () => (
    <SpecimenFilterBar
      activeFilter={filter.type}
      selectedZone={filter.type === 'zone' ? filter.zone : null}
      onFilterTous={handleFilterTous}
      onFilterFavoris={handleFilterFavoris}
      onFilterZones={handleFilterZones}
      onFilterSpecial={handleFilterSpecial}
    />
  );

  if (loading && specimens.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (error && specimens.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={specimens}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/specimen/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.nom}</Text>
                <Text style={styles.cardSubtitle}>{item.organisme_nom}</Text>
                <Text style={styles.cardStatut}>{SPECIMEN_STATUT_LABELS[item.statut]}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleToggleFavori(item)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.favoriButton}
              >
                <Ionicons
                  name={(item.is_favori ?? false) ? 'star' : 'star-outline'}
                  size={24}
                  color={(item.is_favori ?? false) ? '#f0c040' : '#666'}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />
      {loading && specimens.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1a3c27" />
        </View>
      )}
      <ZonePickerModal
        visible={zoneModalVisible}
        onClose={handleZoneModalClose}
        onSelect={handleZoneSelect}
      />
      <SpecialPickerModal
        visible={specialModalVisible}
        onClose={handleSpecialModalClose}
        onApply={handleSpecialApply}
        initialFilters={{
          sante: filter.type === 'special' ? filter.sante : undefined,
          statut: filter.type === 'special' ? filter.statut : undefined,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
  },
  favoriButton: {
    padding: 4,
    marginLeft: 8,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
