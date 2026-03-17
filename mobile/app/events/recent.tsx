import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getRecentEvents } from '@/api/client';
import type { RecentEvent } from '@/types/api';
import { EVENT_TYPE_LABELS } from '@/types/api';

export default function RecentEventsScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      getRecentEvents({ limit: 50 })
        .then(setEvents)
        .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
        .finally(() => setLoading(false));
    }, [])
  );

  const renderItem = ({ item }: { item: RecentEvent }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/specimen/${item.specimen_id}`)}
      activeOpacity={0.7}
    >
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderText}>
            {EVENT_TYPE_LABELS[item.type_event as keyof typeof EVENT_TYPE_LABELS]?.slice(0, 1) ?? ''}
          </Text>
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.specimenName} numberOfLines={2}>
          {item.specimen_nom}
        </Text>
        <Text style={styles.eventType}>
          {EVENT_TYPE_LABELS[item.type_event as keyof typeof EVENT_TYPE_LABELS]} — {item.date}
        </Text>
        {item.titre ? (
          <Text style={styles.titre} numberOfLines={1}>
            {item.titre}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#888" />
    </TouchableOpacity>
  );

  if (loading && events.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  if (error && events.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1a3c27" />
        </TouchableOpacity>
        <Text style={styles.title}>Événements récents</Text>
        <View style={{ width: 40 }} />
      </View>
      {events.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>Aucun événement récent</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => `${item.specimen_id}-${item.event_id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListFooterComponent={loading ? <ActivityIndicator size="small" color="#1a3c27" style={{ padding: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a3c27',
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbPlaceholderText: {
    fontSize: 24,
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  specimenName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a3c27',
  },
  eventType: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  titre: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    fontSize: 16,
    color: '#c44',
  },
  empty: {
    fontSize: 16,
    color: '#888',
  },
});
