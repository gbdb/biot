import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getRemindersUpcoming } from '@/api/client';
import { ReminderActionModal } from '@/components/ReminderActionModal';
import type { ReminderUpcoming } from '@/api/client';
import { REMINDER_TYPE_LABELS } from '@/types/api';

export default function RemindersScreen() {
  const router = useRouter();
  const [reminders, setReminders] = useState<ReminderUpcoming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<ReminderUpcoming | null>(null);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getRemindersUpcoming();
      setReminders(list);
    } catch {
      setReminders([]);
      setError('Impossible de charger les rappels.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [fetchReminders])
  );

  const renderItem = ({ item }: { item: ReminderUpcoming }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => setSelectedReminder(item)}
      activeOpacity={0.7}
    >
      {item.specimen.photo_url ? (
        <Image source={{ uri: item.specimen.photo_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Ionicons name="leaf-outline" size={28} color="#888" />
        </View>
      )}
      <View style={styles.rowContent}>
        <Text style={styles.specimenName} numberOfLines={1}>{item.specimen.nom}</Text>
        <Text style={styles.typeLabel}>{REMINDER_TYPE_LABELS[item.type_rappel as keyof typeof REMINDER_TYPE_LABELS] ?? item.type_rappel}</Text>
        <Text style={[styles.dateText, item.is_overdue && styles.dateOverdue]}>
          📅 {item.date_rappel}{item.is_overdue ? ' (en retard)' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  if (loading && reminders.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a3c27" />
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={reminders}
        keyExtractor={(r) => String(r.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucun rappel</Text>
            <Text style={styles.emptyHint}>Les rappels de vos spécimens favoris apparaîtront ici.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchReminders} colors={['#1a3c27']} />
        }
      />
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <ReminderActionModal
        visible={selectedReminder != null}
        reminder={selectedReminder}
        onClose={() => setSelectedReminder(null)}
        onAction={fetchReminders}
        onOpenSpecimen={(id) => {
          setSelectedReminder(null);
          router.push(`/specimen/${id}`);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f0' },
  list: { padding: 16, paddingBottom: 40, backgroundColor: '#f5f5f0' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  thumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: '#eee' },
  thumbPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  rowContent: { flex: 1, marginLeft: 12 },
  specimenName: { fontSize: 16, fontWeight: '600', color: '#1a3c27' },
  typeLabel: { fontSize: 14, color: '#4a6741', marginTop: 2 },
  dateText: { fontSize: 13, color: '#666', marginTop: 2 },
  dateOverdue: { color: '#c44', fontWeight: '600' },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyText: { fontSize: 18, color: '#666' },
  emptyHint: { fontSize: 14, color: '#999', marginTop: 8 },
  errorBanner: { padding: 12, backgroundColor: '#ffebee' },
  errorText: { fontSize: 14, color: '#c44', textAlign: 'center' },
});
