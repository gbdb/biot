import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getGardens, getUserPreferences, updateUserPreferences } from '@/api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const [gardens, setGardens] = useState<{ id: number; nom: string }[]>([]);
  const [defaultGardenId, setDefaultGardenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gardenList, prefs] = await Promise.all([
        getGardens(),
        getUserPreferences(),
      ]);
      setGardens(gardenList);
      setDefaultGardenId(prefs.default_garden_id);
    } catch {
      setGardens([]);
      setDefaultGardenId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
  }, [load]));

  const setDefault = async (gardenId: number | null) => {
    setSaving(true);
    try {
      await updateUserPreferences({ default_garden_id: gardenId });
      setDefaultGardenId(gardenId);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Paramètres</Text>
      <Text style={styles.sectionTitle}>Jardin par défaut</Text>
      <Text style={styles.hint}>
        Ce jardin sera utilisé pour les repères de saison et les paramètres liés au jardin.
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color="#1a3c27" style={styles.loader} />
      ) : (
        <View style={styles.list}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setDefault(null)}
            disabled={saving}
          >
            <Ionicons
              name={defaultGardenId === null ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color="#1a3c27"
            />
            <Text style={styles.rowLabel}>Aucun</Text>
          </TouchableOpacity>
          {gardens.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.row}
              onPress={() => setDefault(g.id)}
              disabled={saving}
            >
              <Ionicons
                name={defaultGardenId === g.id ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color="#1a3c27"
              />
              <Text style={styles.rowLabel}>{g.nom}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f5f5f0' },
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a3c27', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 8 },
  hint: { fontSize: 14, color: '#666', marginBottom: 16 },
  loader: { marginVertical: 20 },
  list: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e8e8e8' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  rowLabel: { fontSize: 16, color: '#333' },
});
