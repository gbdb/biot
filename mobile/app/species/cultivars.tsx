/**
 * Liste « Tous les cultivars » — parcourir toutes les variétés avec lien vers l'espèce.
 */
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import React, { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getCultivarsPaginated } from '@/api/client';
import type { CultivarListEntry } from '@/types/api';

const CultivarRow = React.memo(function CultivarRow({
  item,
  onPress,
}: {
  item: CultivarListEntry;
  onPress: (item: CultivarListEntry) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{item.nom}</Text>
        <Text style={styles.cardSubtitle}>
          {item.organisme?.nom_commun ?? ''} — {item.organisme?.nom_latin ?? ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color="#888" />
    </TouchableOpacity>
  );
});

export default function CultivarsScreen() {
  const router = useRouter();
  const [cultivars, setCultivars] = useState<CultivarListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchCultivars = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);
    getCultivarsPaginated({
      search: search.trim() || undefined,
      page: pageNum,
    })
      .then(({ results, hasMore: more }) => {
        if (append) {
          setCultivars((prev) => [...prev, ...results]);
        } else {
          setCultivars(results);
        }
        setHasMore(more);
        setPage(pageNum + 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  }, [search]);

  React.useEffect(() => {
    setPage(1);
    fetchCultivars(1, false);
  }, [search, fetchCultivars]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && cultivars.length > 0) {
      fetchCultivars(page, true);
    }
  }, [loadingMore, hasMore, cultivars.length, page, fetchCultivars]);

  const handlePress = useCallback(
    (item: CultivarListEntry) => {
      if (item.organisme?.id) {
        router.push(`/species/${item.organisme.id}`);
      }
    },
    [router]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tous les cultivars',
          headerBackTitle: 'Retour',
        }}
      />
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un cultivar ou une espèce..."
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

        {loading && cultivars.length === 0 && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#1a3c27" />
          </View>
        )}

        {error && cultivars.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        {!loading && !error && cultivars.length === 0 && (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Aucun cultivar trouvé.</Text>
          </View>
        )}

        {cultivars.length > 0 && (
          <FlatList
            data={cultivars}
            keyExtractor={(item) => `cultivar-${item.id}`}
            renderItem={({ item }) => (
              <CultivarRow item={item} onPress={handlePress} />
            )}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color="#1a3c27" />
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    height: 42,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1a3c27',
  },
  searchClear: {
    marginLeft: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  error: {
    color: '#c00',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  listContent: {
    paddingVertical: 12,
    paddingBottom: 32,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMain: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a3c27',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
