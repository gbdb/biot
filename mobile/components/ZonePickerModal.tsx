import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { getSpecimenZones } from '@/api/client';

type ZonePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (zone: string) => void;
};

export function ZonePickerModal({ visible, onClose, onSelect }: ZonePickerModalProps) {
  const [zones, setZones] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setError(null);
      getSpecimenZones()
        .then(setZones)
        .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const handleSelect = (zone: string) => {
    onSelect(zone);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choisir une zone</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.content}>
          {loading && (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#1a3c27" />
            </View>
          )}
          {error && (
            <View style={styles.centered}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}
          {!loading && !error && zones.length === 0 && (
            <View style={styles.centered}>
              <Text style={styles.empty}>Aucune zone définie</Text>
              <Text style={styles.emptyHint}>
                Assignez des zones à vos spécimens pour les filtrer.
              </Text>
            </View>
          )}
          {!loading && !error && zones.length > 0 && (
            <FlatList
              data={zones}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.zoneItem}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.zoneText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  closeBtn: { fontSize: 24, color: '#1a3c27', fontWeight: '300' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a3c27' },
  content: { flex: 1 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  list: { padding: 16 },
  zoneItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  zoneText: { fontSize: 16, color: '#1a3c27', fontWeight: '500' },
  error: { color: '#c44', fontSize: 16, textAlign: 'center' },
  empty: { fontSize: 16, color: '#666', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#999', textAlign: 'center' },
});
