import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  getSpecimens,
  getSpecimensCount,
  addSpecimenFavorite,
  removeSpecimenFavorite,
  getUserPreferences,
} from '@/api/client';
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

const SpecimenRow = React.memo(function SpecimenRow({
  item,
  onPress,
  onToggleFavori,
}: {
  item: SpecimenList;
  onPress: (item: SpecimenList) => void;
  onToggleFavori: (item: SpecimenList) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{item.nom}</Text>
          <Text style={styles.cardSubtitle}>{item.organisme_nom}</Text>
          <Text style={styles.cardStatut}>{SPECIMEN_STATUT_LABELS[item.statut]}</Text>
        </View>
        <TouchableOpacity
          onPress={() => onToggleFavori(item)}
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
  );
});

const THUMB_GAP = 10;

const SpecimenThumbRow = React.memo(function SpecimenThumbRow({
  item,
  onPress,
  onToggleFavori,
  cardWidth,
}: {
  item: SpecimenList;
  onPress: (item: SpecimenList) => void;
  onToggleFavori: (item: SpecimenList) => void;
  cardWidth: number;
}) {
  return (
    <TouchableOpacity
      style={[styles.thumbCard, { width: cardWidth }]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.thumbImageWrap}>
        {item.photo_principale_url ? (
          <Image
            source={{ uri: item.photo_principale_url }}
            style={styles.thumbImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
            <Ionicons name="leaf-outline" size={32} color="#888" />
          </View>
        )}
        <TouchableOpacity
          onPress={() => onToggleFavori(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.thumbFavori}
        >
          <Ionicons
            name={(item.is_favori ?? false) ? 'star' : 'star-outline'}
            size={20}
            color={(item.is_favori ?? false) ? '#f0c040' : 'rgba(255,255,255,0.9)'}
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.thumbTitle} numberOfLines={2}>{item.nom}</Text>
      <Text style={styles.thumbSubtitle} numberOfLines={1}>{item.organisme_nom}</Text>
      <Text style={styles.thumbStatut}>{SPECIMEN_STATUT_LABELS[item.statut]}</Text>
    </TouchableOpacity>
  );
});

type ViewMode = 'list' | 'thumbnail';

export default function SpecimensScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [specimens, setSpecimens] = useState<SpecimenList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterState>({ type: 'tous' });
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [specialModalVisible, setSpecialModalVisible] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [defaultGardenId, setDefaultGardenId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const fetchSpecimens = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: Parameters<typeof getSpecimens>[0] = {};
    if (defaultGardenId != null) params.garden = defaultGardenId;
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
    const countParams = defaultGardenId != null ? { garden: defaultGardenId } : undefined;
    getSpecimensCount(countParams)
      .then(setTotalCount)
      .catch(() => setTotalCount(null));
  }, [filter, defaultGardenId]);

  useFocusEffect(
    useCallback(() => {
      getUserPreferences()
        .then((prefs) => setDefaultGardenId(prefs.default_garden_id))
        .catch(() => setDefaultGardenId(null));
    }, [])
  );

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

  const handleSpecimenPress = useCallback((item: SpecimenList) => {
    router.push(`/specimen/${item.id}`);
  }, [router]);

  const handleToggleFavori = useCallback(async (item: SpecimenList) => {
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
  }, [filter.type]);

  const filteredCount = specimens.length;

  const listPadding = 16;
  const thumbCardWidth = viewMode === 'thumbnail'
    ? Math.floor((screenWidth - listPadding * 2 - THUMB_GAP) / 2)
    : 0;

  const renderHeader = () => (
    <>
      <View style={styles.counterRow}>
        <Text style={styles.counterText}>
          {totalCount != null
            ? `${filteredCount} / ${totalCount}`
            : String(filteredCount)}{' '}
          spécimen{((filteredCount ?? totalCount ?? 0) !== 1 ? 's' : '')}
        </Text>
        <TouchableOpacity
          onPress={() => setViewMode((m) => (m === 'list' ? 'thumbnail' : 'list'))}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.viewModeButton}
        >
          <Ionicons
            name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
            size={24}
            color="#1a3c27"
          />
        </TouchableOpacity>
      </View>
      <SpecimenFilterBar
      activeFilter={filter.type}
      selectedZone={filter.type === 'zone' ? filter.zone : null}
      onFilterTous={handleFilterTous}
      onFilterFavoris={handleFilterFavoris}
      onFilterZones={handleFilterZones}
      onFilterSpecial={handleFilterSpecial}
    />
    </>
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
        numColumns={viewMode === 'thumbnail' ? 2 : 1}
        columnWrapperStyle={viewMode === 'thumbnail' ? styles.thumbRowWrap : undefined}
        key={viewMode}
        contentContainerStyle={[styles.list, viewMode === 'thumbnail' && styles.listThumb]}
        ListHeaderComponent={renderHeader}
        initialNumToRender={viewMode === 'thumbnail' ? 12 : 15}
        maxToRenderPerBatch={15}
        windowSize={10}
        renderItem={({ item }) =>
          viewMode === 'list' ? (
            <SpecimenRow
              item={item}
              onPress={handleSpecimenPress}
              onToggleFavori={handleToggleFavori}
            />
          ) : (
            <SpecimenThumbRow
              item={item}
              onPress={handleSpecimenPress}
              onToggleFavori={handleToggleFavori}
              cardWidth={thumbCardWidth}
            />
          )
        }
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
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#fff',
  },
  counterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  viewModeButton: {
    padding: 4,
  },
  listThumb: {
    paddingHorizontal: 16,
    gap: 10,
  },
  thumbRowWrap: {
    gap: 10,
    marginBottom: 10,
  },
  thumbCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbImageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e8ebe6',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbFavori: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
  },
  thumbTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a3c27',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  thumbSubtitle: {
    fontSize: 12,
    color: '#4a6741',
    paddingHorizontal: 10,
    paddingTop: 2,
  },
  thumbStatut: {
    fontSize: 11,
    color: '#666',
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 4,
  },
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
