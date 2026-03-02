/**
 * Bibliothèque d'espèces — catalogue complet pour parcourir et ajouter au jardin.
 * Ouvert par le bouton + de l'onglet Espèces.
 */
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  getOrganismsPaginated,
  getOrganismsCount,
  addOrganismFavorite,
  removeOrganismFavorite,
  getUserPreferences,
} from '@/api/client';
import type { OrganismMinimal } from '@/types/api';

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'arbre_fruitier', label: '🌳 Arbre fruitier' },
  { value: 'arbre_noix', label: '🌰 Arbre à noix' },
  { value: 'arbre_ornement', label: "🌲 Arbre d'ornement" },
  { value: 'arbre_bois', label: '🪵 Arbre forestier' },
  { value: 'arbuste_fruitier', label: '🫐 Arbuste fruitier' },
  { value: 'arbuste_baies', label: '🫐 Arbuste à baies' },
  { value: 'arbuste', label: '🌿 Arbuste' },
  { value: 'vivace', label: '🌸 Vivace' },
  { value: 'annuelle', label: '🌻 Annuelle' },
  { value: 'bisannuelle', label: '🌷 Bisannuelle' },
  { value: 'herbe_aromatique', label: '🌿 Herbe aromatique' },
  { value: 'legume', label: '🥕 Légume' },
  { value: 'grimpante', label: '🌿 Grimpante' },
  { value: 'couvre_sol', label: '🌱 Couvre-sol' },
  { value: 'champignon_comestible', label: '🍄 Champignon comestible' },
  { value: 'champignon_mycorhize', label: '🍄 Champignon mycorhizien' },
  { value: 'mousse', label: '🟢 Mousse' },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map((o) => [o.value, o.label])
);

const SOLEIL_OPTIONS: { value: string; label: string; icon: string }[] = [
  { value: 'plein_soleil', label: 'Plein soleil', icon: '☀️' },
  { value: 'soleil_partiel', label: 'Soleil partiel', icon: '🌤️' },
  { value: 'mi_ombre', label: 'Mi-ombre', icon: '⛅' },
  { value: 'ombre', label: 'Ombre', icon: '☁️' },
  { value: 'ombre_complete', label: 'Ombre complète', icon: '🌑' },
];

const USDA_ZONES = Array.from({ length: 13 }, (_, i) => i + 1);

const LibraryOrganismRow = React.memo(function LibraryOrganismRow({
  item,
  onPress,
  onAdd,
  onToggleFavori,
}: {
  item: OrganismMinimal;
  onPress: (org: OrganismMinimal) => void;
  onAdd: (org: OrganismMinimal) => void;
  onToggleFavori: (org: OrganismMinimal) => void;
}) {
  return (
    <View style={styles.card}>
      {item.photo_principale_url ? (
        <Image
          source={{ uri: item.photo_principale_url }}
          style={styles.cardThumb}
        />
      ) : null}
      <TouchableOpacity
        style={styles.cardMain}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardText}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{item.nom_commun}</Text>
            <TouchableOpacity
              onPress={() => onToggleFavori(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.favoriBtn}
            >
              <Ionicons
                name={(item.is_favori ?? false) ? 'star' : 'star-outline'}
                size={22}
                color={(item.is_favori ?? false) ? '#f0c040' : '#999'}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSubtitle}>{item.nom_latin}</Text>
          <Text style={styles.cardType}>
            {TYPE_LABELS[item.type_organisme] ?? item.type_organisme}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => onAdd(item)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="add" size={24} color="#1a3c27" />
      </TouchableOpacity>
    </View>
  );
});

export default function SpeciesLibraryScreen() {
  const router = useRouter();
  const [organisms, setOrganisms] = useState<OrganismMinimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [soleilFilter, setSoleilFilter] = useState<string | null>(null);
  const [soleilModalVisible, setSoleilModalVisible] = useState(false);
  const [zoneUsdaFilter, setZoneUsdaFilter] = useState<number | null>(null);
  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [favorisFilter, setFavorisFilter] = useState(false);
  const [fruitsFilter, setFruitsFilter] = useState(false);
  const [noixFilter, setNoixFilter] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [defaultGardenId, setDefaultGardenId] = useState<number | null>(null);

  const fetchOrganisms = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setOrganisms([]);
      }
      setError(null);
      const params = {
        search: search.trim() || undefined,
        type: typeFilter || undefined,
        page: pageNum,
        favoris: favorisFilter || undefined,
        soleil: soleilFilter || undefined,
        zone_usda: zoneUsdaFilter ?? undefined,
        fruits: fruitsFilter || undefined,
        noix: noixFilter || undefined,
      };
      getOrganismsPaginated(params)
        .then(({ results, hasMore: more, count }) => {
          if (append) {
            setOrganisms((prev) => [...prev, ...results]);
          } else {
            setOrganisms(results);
          }
          setHasMore(more);
          setPage(pageNum + 1);
          setHasLoadedOnce(true);
          if (!append) setFilteredCount(count);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
        });
    },
    [
      search,
      typeFilter,
      favorisFilter,
      soleilFilter,
      zoneUsdaFilter,
      fruitsFilter,
      noixFilter,
    ]
  );

  useFocusEffect(
    useCallback(() => {
      getUserPreferences()
        .then((prefs) => setDefaultGardenId(prefs.default_garden_id))
        .catch(() => setDefaultGardenId(null));
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchOrganisms(1, false);
      getOrganismsCount()
        .then(setTotalCount)
        .catch(() => setTotalCount(null));
    }, [
      search,
      typeFilter,
      favorisFilter,
      soleilFilter,
      zoneUsdaFilter,
      fruitsFilter,
      noixFilter,
      fetchOrganisms,
    ])
  );

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && organisms.length > 0) {
      fetchOrganisms(page, true);
    }
  }, [loadingMore, hasMore, organisms.length, page, fetchOrganisms]);

  const handleOrganismPress = useCallback((org: OrganismMinimal) => {
    router.push(`/species/${org.id}`);
  }, [router]);

  const handleAddToGarden = useCallback((org: OrganismMinimal) => {
    const gardenParam = defaultGardenId != null ? `&garden=${defaultGardenId}` : '';
    router.push(`/specimen/create?organisme=${org.id}${gardenParam}`);
  }, [router, defaultGardenId]);

  const handleToggleFavori = useCallback(async (org: OrganismMinimal) => {
    const wasFavori = org.is_favori ?? false;
    try {
      if (wasFavori) {
        await removeOrganismFavorite(org.id);
        setOrganisms((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, is_favori: false } : o))
        );
      } else {
        await addOrganismFavorite(org.id);
        setOrganisms((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, is_favori: true } : o))
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleApplyTypeFilter = (value: string) => {
    setTypeFilter(value);
    setTypeModalVisible(false);
  };

  const handleApplySoleilFilter = (value: string | null) => {
    setSoleilFilter(value);
    setSoleilModalVisible(false);
  };

  const handleApplyZoneFilter = (value: number | null) => {
    setZoneUsdaFilter(value);
    setZoneModalVisible(false);
  };

  const hasActiveFilters =
    typeFilter ||
    soleilFilter ||
    zoneUsdaFilter != null ||
    favorisFilter ||
    fruitsFilter ||
    noixFilter;

  const handleClearAllFilters = () => {
    setTypeFilter('');
    setSoleilFilter(null);
    setZoneUsdaFilter(null);
    setFavorisFilter(false);
    setFruitsFilter(false);
    setNoixFilter(false);
  };

  if (loading && organisms.length === 0 && !hasLoadedOnce) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (error && organisms.length === 0 && !hasLoadedOnce) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.createHint}>
        <TouchableOpacity
          style={styles.createLink}
          onPress={() => router.push('/species/create')}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color="#1a3c27" />
          <Text style={styles.createLinkText}>Espèce introuvable ? Créer une espèce</Text>
        </TouchableOpacity>
      </View>

      {(filteredCount != null || totalCount != null) && (
        <View style={styles.counterRow}>
          <Text style={styles.counterText}>
            {filteredCount != null && totalCount != null
              ? `${filteredCount} / ${totalCount}`
              : filteredCount != null
                ? String(filteredCount)
                : totalCount != null
                  ? String(totalCount)
                  : ''}{' '}
            espèce{((filteredCount ?? totalCount ?? 0) > 1 ? 's' : '')}
          </Text>
        </View>
      )}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une espèce..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#888"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.searchClear}
          >
            <Ionicons name="close-circle" size={24} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
        style={styles.pillsScroll}
      >
        <TouchableOpacity
          style={[styles.pill, favorisFilter && styles.pillActive]}
          onPress={() => setFavorisFilter((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="star"
            size={22}
            color={favorisFilter ? '#fff' : '#1a3c27'}
          />
          <Text style={[styles.pillText, favorisFilter && styles.pillTextActive]}>
            Favoris
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, soleilFilter && styles.pillActive]}
          onPress={() => setSoleilModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="sunny"
            size={22}
            color={soleilFilter ? '#fff' : '#1a3c27'}
          />
          <Text style={[styles.pillText, soleilFilter && styles.pillTextActive]}>
            {soleilFilter
              ? SOLEIL_OPTIONS.find((o) => o.value === soleilFilter)?.label ?? soleilFilter
              : 'Soleil'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, zoneUsdaFilter != null && styles.pillActive]}
          onPress={() => setZoneModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="snow"
            size={22}
            color={zoneUsdaFilter != null ? '#fff' : '#1a3c27'}
          />
          <Text style={[styles.pillText, zoneUsdaFilter != null && styles.pillTextActive]}>
            {zoneUsdaFilter != null ? `Zone ${zoneUsdaFilter}` : 'USDA'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, fruitsFilter && styles.pillActive]}
          onPress={() => setFruitsFilter((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, fruitsFilter && styles.pillTextActive]}>
            🍎 Fruits
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, noixFilter && styles.pillActive]}
          onPress={() => setNoixFilter((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pillText, noixFilter && styles.pillTextActive]}>
            🌰 Noix
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, typeFilter && styles.pillActive]}
          onPress={() => setTypeModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="leaf"
            size={22}
            color={typeFilter ? '#fff' : '#1a3c27'}
          />
          <Text style={[styles.pillText, typeFilter && styles.pillTextActive]}>
            {typeFilter ? (TYPE_LABELS[typeFilter] ?? typeFilter).slice(0, 12) : 'Type'}
          </Text>
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity
            style={styles.pillClear}
            onPress={handleClearAllFilters}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={22} color="#c44" />
            <Text style={styles.pillClearText}>Effacer</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <FlatList
        data={organisms}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={10}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color="#1a3c27" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <LibraryOrganismRow
            item={item}
            onPress={handleOrganismPress}
            onAdd={handleAddToGarden}
            onToggleFavori={handleToggleFavori}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, error && styles.error]}>
            {error
              ? error
              : search || hasActiveFilters
                ? 'Aucune espèce trouvée'
                : 'Chargement...'}
          </Text>
        }
      />
      {loading && organisms.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#1a3c27" />
        </View>
      )}

      {/* Type filter modal */}
      <Modal
        visible={typeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <TouchableOpacity
            style={modalStyles.backdrop}
            activeOpacity={1}
            onPress={() => setTypeModalVisible(false)}
          />
          <View style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Filtrer par type</Text>
              <TouchableOpacity onPress={() => setTypeModalVisible(false)}>
                <Ionicons name="close" size={28} color="#1a3c27" />
              </TouchableOpacity>
            </View>
            <ScrollView style={modalStyles.list} contentContainerStyle={modalStyles.listContent}>
              <TouchableOpacity
                style={[modalStyles.item, !typeFilter && modalStyles.itemActive]}
                onPress={() => handleApplyTypeFilter('')}
              >
                <Text style={[modalStyles.itemText, !typeFilter && modalStyles.itemTextActive]}>
                  Tous les types
                </Text>
              </TouchableOpacity>
              {TYPE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[modalStyles.item, typeFilter === opt.value && modalStyles.itemActive]}
                  onPress={() => handleApplyTypeFilter(opt.value)}
                >
                  <Text
                    style={[
                      modalStyles.itemText,
                      typeFilter === opt.value && modalStyles.itemTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Soleil filter modal */}
      <Modal
        visible={soleilModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSoleilModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <TouchableOpacity
            style={modalStyles.backdrop}
            activeOpacity={1}
            onPress={() => setSoleilModalVisible(false)}
          />
          <View style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Exposition soleil</Text>
              <TouchableOpacity onPress={() => setSoleilModalVisible(false)}>
                <Ionicons name="close" size={28} color="#1a3c27" />
              </TouchableOpacity>
            </View>
            <ScrollView style={modalStyles.list} contentContainerStyle={modalStyles.listContent}>
              <TouchableOpacity
                style={[modalStyles.item, !soleilFilter && modalStyles.itemActive]}
                onPress={() => handleApplySoleilFilter(null)}
              >
                <Text style={[modalStyles.itemText, !soleilFilter && modalStyles.itemTextActive]}>
                  Toutes expositions
                </Text>
              </TouchableOpacity>
              {SOLEIL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[modalStyles.item, soleilFilter === opt.value && modalStyles.itemActive]}
                  onPress={() => handleApplySoleilFilter(opt.value)}
                >
                  <Text
                    style={[
                      modalStyles.itemText,
                      soleilFilter === opt.value && modalStyles.itemTextActive,
                    ]}
                  >
                    {opt.icon} {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* USDA zone filter modal */}
      <Modal
        visible={zoneModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setZoneModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <TouchableOpacity
            style={modalStyles.backdrop}
            activeOpacity={1}
            onPress={() => setZoneModalVisible(false)}
          />
          <View style={modalStyles.content}>
            <View style={modalStyles.header}>
              <Text style={modalStyles.title}>Zone USDA (rusticité)</Text>
              <TouchableOpacity onPress={() => setZoneModalVisible(false)}>
                <Ionicons name="close" size={28} color="#1a3c27" />
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.subtitle}>
              Affiche les espèces rustiques jusqu&apos;à la zone choisie (incl. zones inférieures)
            </Text>
            <ScrollView style={modalStyles.list} contentContainerStyle={modalStyles.listContent}>
              <TouchableOpacity
                style={[modalStyles.item, zoneUsdaFilter == null && modalStyles.itemActive]}
                onPress={() => handleApplyZoneFilter(null)}
              >
                <Text
                  style={[
                    modalStyles.itemText,
                    zoneUsdaFilter == null && modalStyles.itemTextActive,
                  ]}
                >
                  Toutes zones
                </Text>
              </TouchableOpacity>
              {USDA_ZONES.map((z) => (
                <TouchableOpacity
                  key={z}
                  style={[modalStyles.item, zoneUsdaFilter === z && modalStyles.itemActive]}
                  onPress={() => handleApplyZoneFilter(z)}
                >
                  <Text
                    style={[
                      modalStyles.itemText,
                      zoneUsdaFilter === z && modalStyles.itemTextActive,
                    ]}
                  >
                    Zone {z}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  createHint: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  createLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createLinkText: {
    fontSize: 14,
    color: '#1a3c27',
    fontWeight: '500',
  },
  counterRow: {
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    color: '#1a3c27',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchClear: {
    padding: 4,
    justifyContent: 'center',
  },
  pillsScroll: { minHeight: 56 },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pillActive: {
    backgroundColor: '#1a3c27',
    borderColor: '#1a3c27',
  },
  pillText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
  },
  pillTextActive: {
    color: '#fff',
  },
  pillClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#fcc',
  },
  pillClearText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c44',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  cardMain: {
    flex: 1,
  },
  cardText: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#4a6741',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cardType: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  favoriBtn: { padding: 4 },
  addButton: {
    padding: 8,
    marginLeft: 8,
  },
  error: {
    color: '#c44',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
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
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  content: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a3c27',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f5f5f0',
  },
  itemActive: {
    backgroundColor: '#1a3c27',
  },
  itemText: {
    fontSize: 16,
    color: '#1a3c27',
    fontWeight: '500',
  },
  itemTextActive: {
    color: '#fff',
  },
});
